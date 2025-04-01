from fastapi import APIRouter, HTTPException, Query, Path, status, Body
from datetime import date, timedelta, datetime
from typing import List, Optional, Dict, Any
from src.api.dependencies import DBSession, CarServiceDep
from src.api.schemas import (
    CarResponse, CarCreate, CarUpdate, CarListResponse,
    Statistics, MakeResponse, ModelResponse, SearchParams, ErrorResponse
)
import httpx
import os
import logging

# Get a logger for this module
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/cars", status_code=status.HTTP_200_OK)
async def get_cars(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),  # Removed upper limit
    brand: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    min_price: Optional[int] = Query(None),
    max_price: Optional[int] = Query(None),
    min_mileage: Optional[int] = Query(None),
    max_mileage: Optional[int] = Query(None),
    db: DBSession = None,
    car_service: CarServiceDep = None,
):
    """Get all cars with pagination and optional filtering"""
    # If brand is specified, don't apply the limit to get all records for that brand
    if brand:
        limit = 9999  # Set a very high limit to effectively get all records
    
    cars = await car_service.get_cars(db, skip=skip, limit=limit, 
                                     brand=brand, model=model, year=year, 
                                     min_price=min_price, max_price=max_price,
                                     min_mileage=min_mileage, max_mileage=max_mileage)
    
    # Manually convert SQLAlchemy models to dictionaries
    result = []
    for car in cars:
        car_dict = {
            "id": car.id,
            "brand": car.brand,
            "model": car.model,
            "year": car.year,
            "mileage": car.mileage,
            "sale_date": car.sale_date.isoformat() if car.sale_date else None,
            "kvd_id": car.kvd_id,
            "url": car.url,
            "price": car.price,
            "created_at": car.created_at.isoformat() if car.created_at else None
        }
        result.append(car_dict)
    
    return result

@router.get("/cars/{car_id}", response_model=CarResponse, status_code=status.HTTP_200_OK)
async def get_car(
    car_id: int = Path(..., ge=1),
    db: DBSession = None,
    car_service: CarServiceDep = None,
):
    """Get a specific car by ID"""
    car = await car_service.get_car(db, car_id)
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found"
        )
    return car

@router.get("/makes", response_model=List[MakeResponse], status_code=status.HTTP_200_OK)
async def get_makes(
    db: DBSession = None,
    car_service: CarServiceDep = None,
):
    """Get all car makes/brands"""
    makes = await car_service.get_all_makes(db)
    result = []
    for make in makes:
        models = await car_service.get_models_by_make(db, make)
        result.append(MakeResponse(name=make, model_count=len(models)))
    return result

@router.get("/makes/{make}/models", response_model=List[ModelResponse], status_code=status.HTTP_200_OK)
async def get_models_by_make(
    make: str = Path(..., min_length=1),
    db: DBSession = None,
    car_service: CarServiceDep = None,
):
    """Get all models for a specific make/brand"""
    models = await car_service.get_models_by_make(db, make)
    result = []
    for model in models:
        cars = await car_service.get_cars_by_make_and_model(db, make, model, 0, 0)
        result.append(ModelResponse(name=model, auction_count=len(cars)))
    return result

@router.get("/models/{make}/{model}/auctions", response_model=List[CarResponse], status_code=status.HTTP_200_OK)
async def get_auctions_by_model(
    make: str = Path(..., min_length=1),
    model: str = Path(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: DBSession = None,
    car_service: CarServiceDep = None,
):
    """Get all auctions for a specific make/model"""
    cars = await car_service.get_cars_by_make_and_model(db, make, model, skip, limit)
    return cars

@router.get("/models/{make}/{model}/statistics", response_model=Statistics, status_code=status.HTTP_200_OK)
async def get_model_statistics(
    make: str = Path(..., min_length=1),
    model: str = Path(..., min_length=1),
    period: int = Query(90, ge=1, le=365, description="Period in days for statistics calculation"),
    db: DBSession = None,
    car_service: CarServiceDep = None,
):
    """Get statistics for a specific make/model"""
    stats = await car_service.get_statistics(db, make, model)
    return stats

@router.post("/search", response_model=List[CarResponse], status_code=status.HTTP_200_OK)
async def search_cars(
    search_params: SearchParams,
    db: DBSession = None,
    car_service: CarServiceDep = None,
):
    """Search cars by make or model"""
    cars = await car_service.search_cars(
        db, search_params.query, skip=search_params.skip, limit=search_params.limit
    )
    return cars

@router.delete("/cars", status_code=status.HTTP_200_OK)
async def delete_all_cars(
    db: DBSession = None,
    car_service: CarServiceDep = None,
):
    """Delete all cars from the database"""
    count = await car_service.delete_all_cars(db)
    return {"message": f"Successfully deleted {count} cars"}

# AI Chat endpoint
@router.post("/chat", status_code=status.HTTP_200_OK)
async def chat_query(
    query: Dict[str, str] = Body(...),
    db: DBSession = None,
    car_service: CarServiceDep = None,
):
    """Process a chat query with the AI assistant"""
    # Extract the user's query
    user_query = query.get("query", "")
    if not user_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query cannot be empty"
        )
    
    # Fallback response if AI service is unavailable
    fallback_response = {
        "response": "I'm your car auction assistant, but I'm currently running in fallback mode. "
                   "Basic auction data is still available in the charts and tables. "
                   "Please try asking me questions again in a few minutes."
    }
    
    try:
        # Connect to the AI assistant service
        ai_host = os.getenv("AI_ASSISTANT_HOST", "ai-assistant")
        ai_port = os.getenv("AI_ASSISTANT_PORT", "8001")
        ai_url = f"http://{ai_host}:{ai_port}/chat"
        
        # Try connecting to AI service
        async with httpx.AsyncClient(timeout=3.0) as client:
            try:
                # First check if the service is healthy
                health_response = await client.get(f"http://{ai_host}:{ai_port}/health")
                if health_response.status_code != 200:
                    logger.error(f"AI service health check failed: {health_response.status_code}")
                    return fallback_response
                
                # If healthy, send the actual query
                response = await client.post(
                    ai_url,
                    json={"query": user_query},
                    timeout=5.0
                )
                
                if response.status_code != 200:
                    logger.error(f"AI service returned error: {response.status_code}")
                    return fallback_response
                
                # Return the AI response
                return response.json()
            
            except httpx.TimeoutException:
                logger.error("AI service request timed out")
                return fallback_response
                
    except Exception as e:
        logger.error(f"Error connecting to AI service: {str(e)}")
        return await generate_ai_response(user_query, db, car_service)

# Fallback function for generating responses when the AI service is unavailable
async def generate_ai_response(query: str, db: DBSession, car_service: Any) -> Dict[str, str]:
    """
    Generate a response based on the user's query.
    
    This is a fallback function used when the AI service is unavailable.
    """
    query = query.lower()
    
    # Simple pattern matching for demo purposes
    if "what is" in query and ("worth" in query or "value" in query):
        # Car valuation query
        response = "Based on our auction data, the value depends on the car's condition, mileage, and year. " + \
                  "For a precise valuation, I'd need more specific details about the car model, year, and mileage. " + \
                  "Generally, recent models with lower mileage command higher prices."
    
    elif "average price" in query:
        response = "The AI service is currently unavailable. Please try again later for detailed price analysis."
    
    elif "highest resale value" in query:
        response = "The AI service is currently unavailable. Please try again later for resale value analysis."
    
    elif "mileage" in query and "price" in query:
        response = "The AI service is currently unavailable. Please try again later for mileage-price correlation analysis."
    
    elif "trend" in query or "market" in query:
        response = "The AI service is currently unavailable. Please try again later for market trend analysis."
    
    else:
        # Default response
        response = "I'm your car valuation assistant, but I'm currently running in fallback mode with limited capabilities. " + \
                  "Please try again later when our AI service is available for more detailed answers about car values, " + \
                  "price trends, or other auction data analysis."
    
    return {"response": response}