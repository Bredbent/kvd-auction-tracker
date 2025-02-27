from fastapi import APIRouter, HTTPException, Query, Path, status
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
    limit: int = Query(100, ge=1, le=100),
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