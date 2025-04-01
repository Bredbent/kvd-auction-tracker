from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import httpx
import re
from pydantic import BaseModel
import json
import time
import sqlalchemy
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure httpx to log requests and responses
logging.getLogger("httpx").setLevel(logging.INFO)

app = FastAPI(
    title="KVD Auction AI Assistant",
    description="AI assistant for answering questions about car auctions using database data",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatQuery(BaseModel):
    query: str


class ChatResponse(BaseModel):
    response: str
    sources: list = []


# Database connection
def get_db_engine():
    """Create a database engine."""
    postgres_user = os.getenv("POSTGRES_USER", "kvd_user")
    postgres_password = os.getenv("POSTGRES_PASSWORD", "change_me_in_production")
    postgres_host = os.getenv("POSTGRES_HOST", "postgres")
    postgres_port = os.getenv("POSTGRES_PORT", "5432")
    postgres_db = os.getenv("POSTGRES_DB", "kvd_auctions")
    
    database_url = f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_db}"
    
    try:
        engine = create_engine(database_url)
        logger.info(f"Connected to database at {postgres_host}:{postgres_port}/{postgres_db}")
        return engine
    except Exception as e:
        logger.error(f"Error connecting to database: {str(e)}")
        return None


@app.on_event("startup")
async def startup_event():
    logger.info("Starting AI assistant service")
    app.state.db_engine = get_db_engine()


@app.get("/health")
async def health_check():
    """Check if the AI service is healthy and can connect to dependencies."""
    status = {"status": "ok"}
    
    # Check database connection
    if hasattr(app.state, "db_engine"):
        try:
            with app.state.db_engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                if result.scalar() == 1:
                    status["database"] = "connected"
                else:
                    status["database"] = "error"
                    status["status"] = "degraded"
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            status["database"] = "error"
            status["status"] = "degraded"
    else:
        status["database"] = "not_initialized"
        status["status"] = "degraded"
    
    # Try to connect to Ollama to verify it's running
    ollama_host = os.getenv("OLLAMA_HOST", "ollama")
    ollama_port = os.getenv("OLLAMA_PORT", "11434")
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"http://{ollama_host}:{ollama_port}/api/tags")
            if response.status_code == 200:
                logger.info("Ollama is running and accessible")
                status["ollama"] = "connected"
            else:
                logger.warning(f"Ollama returned non-200 status: {response.status_code}")
                status["ollama"] = "error"
                status["status"] = "degraded"
    except Exception as e:
        logger.error(f"Error connecting to Ollama: {str(e)}")
        status["ollama"] = "unavailable"
        status["status"] = "degraded"
    
    return status


def get_database_schema():
    """Extract the database schema for the LLM."""
    if not hasattr(app.state, "db_engine"):
        return "Database not initialized"
    
    try:
        inspector = inspect(app.state.db_engine)
        tables = inspector.get_table_names()
        
        schema_info = []
        for table in tables:
            columns = inspector.get_columns(table)
            column_info = [f"{col['name']} ({col['type']})" for col in columns]
            schema_info.append(f"Table: {table}\nColumns: {', '.join(column_info)}")
        
        return "\n\n".join(schema_info)
    except Exception as e:
        logger.error(f"Error getting database schema: {str(e)}")
        return f"Error getting schema: {str(e)}"


def get_basic_stats():
    """Get basic statistics about the cars in the database."""
    if not hasattr(app.state, "db_engine"):
        return "Database not initialized"
    
    try:
        with app.state.db_engine.connect() as conn:
            # Get car count
            result = conn.execute(text("SELECT COUNT(*) FROM cars"))
            total_cars = result.scalar()
            
            # Get brand count
            result = conn.execute(text("SELECT COUNT(DISTINCT brand) FROM cars"))
            brand_count = result.scalar()
            
            # Get average price
            result = conn.execute(text("SELECT AVG(price) FROM cars WHERE price IS NOT NULL"))
            avg_price = result.scalar()
            
            # Get sample of brands
            result = conn.execute(text("""
                SELECT brand, COUNT(*) as count 
                FROM cars 
                GROUP BY brand 
                ORDER BY count DESC 
                LIMIT 5
            """))
            top_brands = [f"{row[0]} ({row[1]} cars)" for row in result.fetchall()]
            
            stats = f"""
            Database Statistics:
            - Total cars: {total_cars}
            - Unique brands: {brand_count}
            - Average price: {int(avg_price):,} kr
            - Top brands: {', '.join(top_brands)}
            """
            
            return stats
    except Exception as e:
        logger.error(f"Error getting basic stats: {str(e)}")
        return f"Error getting stats: {str(e)}"


def extract_sql_query(response_text):
    """Extract the SQL query from the LLM response text with improved handling."""
    # Common patterns for SQL blocks
    sql_patterns = [
        # Look for code blocks with SQL or without language specification
        r"```sql\s*(.*?)\s*```",
        r"```\s*(SELECT.*?;)\s*```",
        
        # Look for complete SELECT statements
        r"(SELECT\s+.*?;)",
        
        # Try to find SELECT statements without semicolon
        r"(SELECT\s+.*?\s+FROM\s+.*?\s+WHERE\s+.*?(?:GROUP BY|ORDER BY|LIMIT|$))"
    ]
    
    # Try each pattern until we find a match
    for pattern in sql_patterns:
        matches = re.search(pattern, response_text, re.IGNORECASE | re.DOTALL)
        if matches:
            # Return just the SQL statement
            sql = matches.group(1) if '```' in pattern else matches.group(1)
            
            # Make sure it ends with a semicolon
            if not sql.strip().endswith(';'):
                sql = sql.strip() + ';'
                
            return sql.strip()
    
    # If no clear SQL syntax is found, try a more aggressive approach
    # Find the first occurrence of SELECT and extract from there
    select_match = re.search(r'(SELECT\s+.*)', response_text, re.IGNORECASE | re.DOTALL)
    if select_match:
        sql_fragment = select_match.group(1)
        
        # Try to find a reasonable endpoint (semicolon, double newline, or 'this query', etc.)
        end_markers = [';', '\n\n', 'this query', 'the query', 'will give', 'returns']
        for marker in end_markers:
            end_pos = sql_fragment.lower().find(marker)
            if end_pos > 10:  # Make sure we have a reasonable amount of SQL
                sql = sql_fragment[:end_pos]
                if marker == ';':
                    sql += ';'  # Include the semicolon
                else:
                    sql = sql.strip() + ';'  # Add a semicolon if not ending with one
                return sql.strip()
        
        # If no endpoint found, just return the first few lines
        lines = sql_fragment.split('\n')
        sql = '\n'.join(lines[:min(10, len(lines))])
        if not sql.strip().endswith(';'):
            sql = sql.strip() + ';'
        return sql.strip()
    
    # Return empty string if no SQL found
    return ""


def execute_sql_query(sql_query):
    """Execute an SQL query and return the results as a formatted string."""
    if not hasattr(app.state, "db_engine"):
        return "Database not initialized"
    
    try:
        # Validate query to prevent harmful SQL
        sql_lower = sql_query.lower()
        if any(word in sql_lower for word in ["insert", "update", "delete", "drop", "alter", "truncate"]):
            return "Error: Only SELECT queries are allowed."
        
        # Execute the query
        with app.state.db_engine.connect() as conn:
            result = conn.execute(text(sql_query))
            
            # Get column names
            columns = result.keys()
            
            # Format the results
            rows = result.fetchall()
            if not rows:
                return "Query executed successfully but returned no results."
            
            # Convert to list of dictionaries for easier handling
            result_dicts = [dict(zip(columns, row)) for row in rows]
            
            # Format the results as text table
            result_text = []
            result_text.append(f"Query returned {len(rows)} rows.")
            result_text.append("")
            
            # Only show up to 10 rows to avoid overwhelming responses
            display_rows = result_dicts[:10]
            
            # Format as a simple text table
            # Get max width for each column for proper alignment
            widths = {col: max(len(str(row.get(col, ''))) for row in display_rows + [{col: col}]) for col in columns}
            
            # Header
            header = " | ".join(f"{col:<{widths[col]}}" for col in columns)
            result_text.append(header)
            result_text.append("-" * len(header))
            
            # Rows
            for row in display_rows:
                result_text.append(" | ".join(f"{str(row.get(col, '')):<{widths[col]}}" for col in columns))
            
            # Add a note if we truncated the results
            if len(rows) > 10:
                result_text.append(f"\n(Showing 10 of {len(rows)} rows)")
            
            return "\n".join(result_text)
            
    except SQLAlchemyError as e:
        logger.error(f"SQL error: {str(e)}")
        return f"Error executing SQL: {str(e)}"
    except Exception as e:
        logger.error(f"Error executing query: {str(e)}")
        return f"Error: {str(e)}"


@app.post("/chat", response_model=ChatResponse)
async def chat(query: ChatQuery):
    """Process a chat query using SQL generation and LLM."""
    try:
        user_query = query.query
        logger.info(f"Received chat query: {user_query}")
        
        # Get database schema and stats for context
        db_schema = get_database_schema()
        basic_stats = get_basic_stats()
        
        # Step 1: Use the LLM to generate an appropriate SQL query
        ollama_host = os.getenv("OLLAMA_HOST", "ollama")
        ollama_port = os.getenv("OLLAMA_PORT", "11434")
        ollama_model = os.getenv("OLLAMA_MODEL", "tinyllama")
        
        # Create system prompt for SQL generation
        sql_system_prompt = f"""You are an expert SQL query generator for our car auction database. Given a user's question, you will generate a PostgreSQL SQL query to answer it accurately.

Database Schema:
{db_schema}

Important notes about our data:
1. Brand names should be searched with ILIKE to handle case variations (e.g., 'Tesla', 'TESLA', 'tesla')
2. Never add date restrictions unless the user specifically asks about a time period
3. Model names must be matched exactly, using ILIKE for case insensitivity
4. For Tesla Model Y, use "model ILIKE '%Model Y%'" - the Y is a model name, not just a letter
5. For specific models with numbers/letters, use exact patterns in ILIKE (e.g., 'XC90', not '%XC%')
6. Always filter out NULL values for numerical calculations
7. The database has real auction data - don't make assumptions about what years might exist

Best practices:
1. Only use tables and columns that exist in the schema
2. Only write SELECT queries - no INSERT, UPDATE, DELETE, etc.
3. If asked about makes/brands, use the 'brand' column with ILIKE (e.g., brand ILIKE '%tesla%')
4. If asked about models, use the 'model' column with ILIKE (e.g., model ILIKE '%Model Y%')
5. If asked about prices, use the 'price' column (use AVG, MIN, MAX as needed)
6. For price calculations, always add "WHERE price IS NOT NULL"
7. Use meaningful aliases for readability (e.g., AVG(price) AS avg_price)
8. Use ILIKE for text fields to ensure case-insensitive matching

Write ONLY the SQL query, with no backticks, no explanations, and no preamble. Start directly with SELECT and end with a semicolon.
"""
        
        # Set up request payload for SQL generation
        sql_request_payload = {
            "model": ollama_model,
            "prompt": f"Generate a SQL query to answer the question: {user_query}",
            "system": sql_system_prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,  # Low temperature for deterministic SQL generation
                "num_predict": 200
            }
        }
        
        logger.info("Generating SQL query with LLM")
        sql_query = ""
        
        # Request SQL query from LLM
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                sql_response = await client.post(
                    f"http://{ollama_host}:{ollama_port}/api/generate",
                    json=sql_request_payload,
                    timeout=30.0
                )
                
                if sql_response.status_code == 200:
                    sql_result = sql_response.json()
                    full_response = sql_result.get("response", "").strip()
                    
                    # Extract just the SQL query from the response
                    sql_query = extract_sql_query(full_response)
                    
                    logger.info(f"Generated SQL query: {sql_query}")
                else:
                    logger.error(f"Error generating SQL: {sql_response.status_code} - {sql_response.text}")
                    sql_query = ""
        except Exception as e:
            logger.error(f"Error during SQL generation: {str(e)}")
            sql_query = ""
        
        # Step 2: Execute the SQL query if we have one
        sql_results = ""
        if sql_query:
            try:
                sql_results = execute_sql_query(sql_query)
                logger.info(f"SQL execution result length: {len(sql_results)}")
            except Exception as e:
                logger.error(f"Error executing SQL: {str(e)}")
                sql_results = f"Error executing SQL: {str(e)}"
        
        # Step 3: Generate the final response using the SQL results
        final_system_prompt = f"""You are a helpful car auction assistant for KVD Auctions. You provide accurate information based on real auction data.

{basic_stats}

The user asked: "{user_query}"

SQL Query Used: {sql_query}

SQL Results:
{sql_results}

Guidelines for your response:
1. Answer DIRECTLY based on the SQL results - include SPECIFIC NUMBERS from the data
2. NEVER mention SQL, queries, or databases in your response
3. Start with "Based on our auction data..." followed by the direct answer
4. If the SQL returned numerical results, always include the exact numbers
5. If the SQL returned "no results", say we don't have sufficient data about that specific vehicle in our database
6. Format numbers with thousands separators and include "kr" for prices (e.g., "425,000 kr")
7. Be concise and to the point - don't add unnecessary explanations

IMPORTANT: You must ALWAYS include the ACTUAL NUMERICAL VALUES from the SQL results if they exist. Never replace numbers with placeholders like "X" or "approximately X".

Use a conversational but professional tone, as if you already knew this information without having to look it up.
"""
        
        # Set up request payload for final response
        final_request_payload = {
            "model": ollama_model,
            "prompt": user_query,
            "system": final_system_prompt,
            "stream": False,
            "options": {
                "temperature": 0.5,  # Higher temperature for natural response
                "num_predict": 300
            }
        }
        
        logger.info("Generating final response with LLM")
        
        # Request final response from LLM
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                final_response = await client.post(
                    f"http://{ollama_host}:{ollama_port}/api/generate",
                    json=final_request_payload,
                    timeout=60.0
                )
                
                if final_response.status_code == 200:
                    response_json = final_response.json()
                    response_text = response_json.get("response", "")
                    
                    if not response_text.strip():
                        logger.warning("Empty response received from Ollama")
                        return ChatResponse(
                            response="I apologize, but I received an empty response from our AI system. Please try again in a moment.",
                            sources=[]
                        )
                    
                    # Check if the response contains terms like "SQL" or "query" and filter if needed
                    if "sql" in response_text.lower() or "query" in response_text.lower():
                        logger.warning("Response contains SQL references, attempting to clean...")
                        
                        # Try to extract just the answer part
                        cleaner_response = re.sub(r'(?i).*the (?:sql|query).*?\n', '', response_text)
                        
                        # If cleaning removed too much, use original but warn about it
                        if len(cleaner_response.strip()) < 20:  # arbitrary threshold
                            logger.warning("Cleaning removed too much content, using original")
                        else:
                            response_text = cleaner_response
                    
                    # Check for and replace any placeholder values
                    if re.search(r'X+\s*kr', response_text):
                        logger.warning("Response contains placeholder X values, will return generic response")
                        response_text = "Based on our auction data, I don't have enough information to provide a specific answer to your question. Please try asking about a different vehicle or provide more details."
                    
                    logger.info(f"Generated final response (first 100 chars): {response_text[:100]}...")
                    
                    # Create a source attribution with the SQL query used
                    sources = [{"sql_query": sql_query}] if sql_query else []
                    
                    return ChatResponse(response=response_text, sources=sources)
                else:
                    logger.error(f"Error in final response: {final_response.status_code}")
                    return ChatResponse(
                        response="I'm having trouble analyzing the auction data right now. Please try again in a moment.",
                        sources=[]
                    )
        except httpx.TimeoutException:
            logger.warning("Final response timed out")
            return ChatResponse(
                response="I apologize for the delay. Our AI system is taking longer than expected to process your question. Please try again in a moment.",
                sources=[]
            )
        except Exception as e:
            logger.error(f"Error generating final response: {str(e)}")
            return ChatResponse(
                response="I encountered an issue when processing your question. Please try again later.",
                sources=[]
            )
    
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return ChatResponse(
            response="I apologize, but something went wrong. Please try again later.",
            sources=[]
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)