import os
import logging
from typing import Optional, List, Dict, Any
import httpx
from langchain_core.prompts import PromptTemplate
from langchain import hub
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_community.llms import Ollama
from langchain.chains import LLMChain
from langchain_core.messages import HumanMessage, AIMessage
from langchain.callbacks.manager import CallbackManager
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler

from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from src.utils.config import settings

# Set up logging
logger = logging.getLogger(__name__)

class DatabaseService:
    """Service for interacting with the database."""
    
    def __init__(self):
        """Initialize the database service."""
        self.engine = create_engine(
            f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@"
            f"{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
        )
        self.async_engine = create_async_engine(settings.DATABASE_URL)
    
    def execute_query(self, query: str) -> List[Dict[str, Any]]:
        """Execute a SQL query and return the results."""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(query))
                return [dict(row._mapping) for row in result]
        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            return []
    
    def get_database_schema(self) -> str:
        """Get the database schema for the cars table."""
        try:
            query = """
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'cars'
            ORDER BY ordinal_position;
            """
            with self.engine.connect() as conn:
                result = conn.execute(text(query))
                columns = [f"{row.column_name} ({row.data_type})" for row in result]
                return "Table: cars\nColumns: " + ", ".join(columns)
        except Exception as e:
            logger.error(f"Error getting database schema: {str(e)}")
            return "Error getting database schema"
    
    def get_car_brands(self) -> List[str]:
        """Get a list of all car brands in the database."""
        try:
            query = "SELECT DISTINCT brand FROM cars ORDER BY brand;"
            with self.engine.connect() as conn:
                result = conn.execute(text(query))
                return [row.brand for row in result]
        except Exception as e:
            logger.error(f"Error getting car brands: {str(e)}")
            return []
    
    def get_car_statistics(self) -> Dict[str, Any]:
        """Get basic statistics about the cars in the database."""
        try:
            query = """
            SELECT 
                COUNT(*) as total_cars,
                AVG(price) as avg_price,
                MIN(price) as min_price,
                MAX(price) as max_price,
                AVG(mileage) as avg_mileage,
                MIN(mileage) as min_mileage,
                MAX(mileage) as max_mileage,
                COUNT(DISTINCT brand) as brand_count,
                MIN(year) as earliest_year,
                MAX(year) as latest_year
            FROM cars WHERE price IS NOT NULL;
            """
            with self.engine.connect() as conn:
                result = conn.execute(text(query))
                stats = dict(result.fetchone()._mapping)
                # Format the numeric values
                stats['avg_price'] = f"{stats['avg_price']:,.2f}" if stats['avg_price'] else None
                stats['min_price'] = f"{stats['min_price']:,}" if stats['min_price'] else None
                stats['max_price'] = f"{stats['max_price']:,}" if stats['max_price'] else None
                stats['avg_mileage'] = f"{stats['avg_mileage']:,.2f}" if stats['avg_mileage'] else None
                return stats
        except Exception as e:
            logger.error(f"Error getting car statistics: {str(e)}")
            return {}


class LLMService:
    """Service for interacting with the LLM."""
    
    def __init__(self):
        """Initialize the LLM service."""
        self.ollama_host = os.getenv("OLLAMA_HOST", "ollama")
        self.ollama_port = os.getenv("OLLAMA_PORT", "11434")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "tinyllama")
        self.db_service = DatabaseService()
        
        # Initialize Ollama LLM with retry
        self._init_llm()
    
    def _init_llm(self, max_retries=3):
        """Initialize the Ollama LLM with retry logic."""
        retry_count = 0
        while retry_count < max_retries:
            try:
                self.llm = Ollama(
                    base_url=f"http://{self.ollama_host}:{self.ollama_port}",
                    model=self.ollama_model,
                    callback_manager=CallbackManager([StreamingStdOutCallbackHandler()]),
                    temperature=0.7
                )
                # Simple test to verify connection
                logger.info(f"Initialized LLM with model: {self.ollama_model}")
                return
            except Exception as e:
                retry_count += 1
                logger.warning(f"Failed to initialize LLM (attempt {retry_count}/{max_retries}): {e}")
                if retry_count >= max_retries:
                    logger.error(f"Failed to initialize LLM after {max_retries} attempts")
                    # Initialize with a dummy LLM that returns error messages
                    self.llm = None
                    return
    
    async def process_query(self, query: str) -> str:
        """Process a user query and return a response from the LLM."""
        try:
            # Check if LLM is initialized
            if self.llm is None:
                return "I'm sorry, I'm having trouble connecting to the language model. Please try again in a moment."
            
            # Get database context information
            schema = self.db_service.get_database_schema()
            stats = self.db_service.get_car_statistics()
            brands = self.db_service.get_car_brands()
            
            # Create a context for the LLM with database information
            context = {
                "schema": schema,
                "statistics": "\n".join([f"{k}: {v}" for k, v in stats.items()]),
                "brands": ", ".join(brands[:20]) + (", and more..." if len(brands) > 20 else ""),
                "query": query
            }
            
            # If the query appears to need specific data, try to execute a SQL query
            if any(keyword in query.lower() for keyword in 
                  ["how many", "average", "most common", "cheapest", "expensive", 
                   "price", "mileage", "compare", "trend", "statistics", "stats"]):
                
                # Let the LLM generate a SQL query based on the user question
                sql_prompt = PromptTemplate.from_template(
                    """You are a helpful assistant that converts user questions about car auctions into SQL queries.
                    
                    Database schema:
                    {schema}
                    
                    The user question is: {query}
                    
                    Write a single SQL query that would answer this question. Only return the SQL query and nothing else.
                    Keep the query simple and make sure it works with PostgreSQL syntax.
                    
                    SQL query:"""
                )
                
                # Generate the SQL query
                sql_chain = LLMChain(llm=self.llm, prompt=sql_prompt)
                sql_query = await sql_chain.arun(
                    schema=schema,
                    query=query
                )
                
                # Clean up the SQL query (remove quotes, etc.)
                sql_query = sql_query.strip().strip('`').strip()
                if sql_query.startswith('sql'):
                    sql_query = sql_query[3:].strip()
                
                logger.info(f"Generated SQL query: {sql_query}")
                
                # Execute the SQL query
                try:
                    sql_result = self.db_service.execute_query(sql_query)
                    sql_result_str = str(sql_result)
                    
                    # If the result is too long, summarize it
                    if len(sql_result) > 10:
                        sql_result_str = f"Found {len(sql_result)} results. Here are the first 10: " + str(sql_result[:10])
                    
                    # Add the SQL results to the context
                    context["sql_result"] = sql_result_str
                except Exception as e:
                    logger.error(f"Error executing generated SQL: {str(e)}")
                    context["sql_result"] = f"Error executing SQL: {str(e)}"
            
            # Create the final prompt for the LLM
            final_prompt = PromptTemplate.from_template(
                """You are an expert car auction assistant helping users with information about the KVD Auction database.
                You have access to a database of car auctions with the following schema:
                
                {schema}
                
                Here are some statistics about the database:
                {statistics}
                
                The car brands in the database include: {brands}
                
                User question: {query}
                
                {% if sql_result %}
                I've run a SQL query to help answer this question, and here are the results:
                {sql_result}
                {% endif %}
                
                Please provide a helpful and concise response to the user's question using the available data.
                If you don't have enough information to answer the question fully, explain what information is missing.
                Your response should be friendly and use everyday language, not technical database terms.
                
                Response:"""
            )
            
            # Generate the final response
            response_chain = LLMChain(llm=self.llm, prompt=final_prompt)
            response = await response_chain.arun(**context)
            
            return response.strip()
        
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            return f"I'm sorry, I encountered an error while processing your question: {str(e)}"


# Dependency for FastAPI
async def get_llm_service():
    """Get the LLM service as a dependency."""
    service = LLMService()
    return service