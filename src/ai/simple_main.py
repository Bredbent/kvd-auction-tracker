from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import httpx
from pydantic import BaseModel
import json
import time

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="KVD Auction AI Assistant (Simple)",
    description="Simple AI assistant for answering questions about car auctions",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatQuery(BaseModel):
    query: str


class ChatResponse(BaseModel):
    response: str
    sources: list = []


@app.on_event("startup")
async def startup_event():
    logger.info("Starting Simple AI assistant service")


@app.get("/health")
async def health_check():
    # Try to connect to Ollama to verify it's running
    ollama_host = os.getenv("OLLAMA_HOST", "ollama")
    ollama_port = os.getenv("OLLAMA_PORT", "11434")
    
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"http://{ollama_host}:{ollama_port}/api/tags")
            if response.status_code == 200:
                logger.info("Ollama is running and accessible")
                return {"status": "ok", "ollama": "connected"}
            else:
                logger.warning(f"Ollama returned non-200 status: {response.status_code}")
                return {"status": "degraded", "ollama": "error"}
    except Exception as e:
        logger.error(f"Error connecting to Ollama: {str(e)}")
        return {"status": "degraded", "ollama": "unavailable"}


@app.post("/chat", response_model=ChatResponse)
async def chat(query: ChatQuery):
    try:
        logger.info(f"Received chat query: {query.query}")
        
        # Connect to Ollama
        ollama_host = os.getenv("OLLAMA_HOST", "ollama")
        ollama_port = os.getenv("OLLAMA_PORT", "11434")
        ollama_model = os.getenv("OLLAMA_MODEL", "tinyllama")
        
        # Get some basic car stats from a mock database
        car_stats = {
            "total_cars": "152",
            "average_price": "245,320 kr",
            "most_expensive_brand": "BMW",
            "most_common_brand": "Volvo",
            "price_range": "85,000 kr - 950,000 kr",
            "top_brands": ["Volvo", "BMW", "Audi", "Volkswagen", "Mercedes"]
        }
        
        # Create a prompt for Ollama
        system_prompt = f"""You are a helpful car auction assistant that provides information about cars.
Here are some statistics about our car auctions:
- Total cars in database: {car_stats['total_cars']}
- Average price: {car_stats['average_price']}
- Most expensive brand: {car_stats['most_expensive_brand']}
- Most common brand: {car_stats['most_common_brand']}
- Price range: {car_stats['price_range']}
- Top brands: {', '.join(car_stats['top_brands'])}

Please provide a helpful response to the user's question about car auctions or valuations."""
        
        # Send request to Ollama API
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                ollama_response = await client.post(
                    f"http://{ollama_host}:{ollama_port}/api/generate",
                    json={
                        "model": ollama_model,
                        "prompt": query.query,
                        "system": system_prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.7,
                            "num_predict": 500
                        }
                    }
                )
                
                if ollama_response.status_code == 200:
                    response_text = ollama_response.json().get("response", "")
                    return ChatResponse(response=response_text, sources=[])
                else:
                    logger.error(f"Ollama API error: {ollama_response.status_code} - {ollama_response.text}")
                    return ChatResponse(
                        response="I'm having trouble analyzing the auction data right now. Please try again in a moment.",
                        sources=[]
                    )
        except httpx.TimeoutException:
            logger.warning("Ollama API request timed out")
            return ChatResponse(
                response="I'm taking too long to process your question. The AI model is still initializing or is under high load. Please try again in a moment.",
                sources=[]
            )
        except Exception as e:
            logger.error(f"Error calling Ollama API: {str(e)}")
            return ChatResponse(
                response="I encountered an issue when trying to process your question. Our AI system might be initializing.",
                sources=[]
            )
    
    except Exception as e:
        logger.error(f"Error processing chat query: {str(e)}")
        return ChatResponse(
            response="I apologize, but I'm having trouble processing your request. Please try again later.",
            sources=[]
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)