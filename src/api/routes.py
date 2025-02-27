from fastapi import APIRouter, HTTPException, Query, Path, status, Body
from datetime import date, timedelta, datetime
from typing import List, Optional, Dict, Any
from src.api.dependencies import DBSession, CarServiceDep
from src.api.schemas import (
    CarResponse, CarCreate, CarUpdate, CarListResponse,
    Statistics, MakeResponse, ModelResponse, SearchParams, ErrorResponse
)

router = APIRouter()

@router.get("/cars", status_code=status.HTTP_200_OK)
async def get_cars(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),  # Removed upper limit
    db: DBSession = None,
    car_service: CarServiceDep = None,
):
    """Get all cars with pagination"""
    cars = await car_service.get_cars(db, skip=skip, limit=limit)
    
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
    
    # For now, we'll implement a simple demo response
    # In production, this would connect to a local Llama model
    response = await generate_ai_response(user_query, db, car_service)
    
    return {"response": response}

async def generate_ai_response(query: str, db: DBSession, car_service: CarServiceDep) -> str:
    """
    Generate a response based on the user's query.
    
    This is a placeholder function. In production, this would:
    1. Call a local Llama LLM service
    2. Pass the user query and context from the database
    3. Return the generated response
    
    For now, we'll use some predefined responses based on query patterns.
    """
    query = query.lower()
    
    # Simple pattern matching for demo purposes
    if "what is" in query and ("worth" in query or "value" in query):
        # Car valuation query
        return "Based on our auction data, the value depends on the car's condition, mileage, and year. " + \
               "For a precise valuation, I'd need more specific details about the car model, year, and mileage. " + \
               "Generally, recent models with lower mileage command higher prices."
    
    elif "average price" in query:
        # Try to extract brand/model information
        stats = await car_service.get_statistics(db)
        return f"The average price across all our auction data is {stats.avg_price:.2f} SEK. " + \
               f"This is based on {stats.count} auctions recorded in our database."
    
    elif "highest resale value" in query:
        return "Based on our auction data, luxury brands like BMW, Mercedes, and Volvo tend to maintain higher resale values. " + \
               "However, the actual value depends on factors like model year, mileage, and condition."
    
    elif "mileage" in query and "price" in query:
        return "Generally, cars with lower mileage fetch higher prices at auction. " + \
               "Our data shows a clear correlation between mileage and price across most brands. " + \
               "For every additional 10,000 mil, you might expect a 5-15% reduction in price, depending on the model."
    
    elif "trend" in query or "market" in query:
        stats = await car_service.get_statistics(db)
        trend_description = "rising" if stats.price_trend > 0 else "falling"
        return f"The current market trend shows prices are {trend_description}. " + \
               f"Based on our recent auction data, the price trend coefficient is {stats.price_trend:.2f}."
    
    else:
        # Default response
        return "I'm your car valuation assistant powered by auction data. " + \
               "You can ask me about car values, price trends, or how factors like mileage affect resale value. " + \
               "For specific valuations, please provide details about the car's make, model, year, and mileage."