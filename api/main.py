# api/main.py
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import List, Optional
from datetime import date, timedelta
import uvicorn
from shared.database import get_db, Car  # Changed to import Car instead
from shared.config import settings
from api.schemas import CarResponse, Statistics  # We'll update schemas too
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.PROJECT_NAME)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/cars", response_model=List[CarResponse])
async def get_cars(db: AsyncSession = Depends(get_db)):
    """Get all cars"""
    try:
        result = await db.execute(select(Car))
        cars = result.scalars().all()
        logger.info(f"Retrieved {len(cars)} cars")  # Add logging
        return cars
    except Exception as e:
        logger.error(f"Error fetching cars: {str(e)}")  # Add error logging
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/cars/{brand}", response_model=List[CarResponse])
async def get_cars_by_brand(brand: str, db: AsyncSession = Depends(get_db)):
    """Get all cars for a specific brand"""
    result = await db.execute(select(Car).where(Car.brand == brand))
    cars = result.scalars().all()
    if not cars:
        raise HTTPException(status_code=404, detail="Brand not found")
    return cars

@app.get("/api/v1/statistics/{brand}/{model}", response_model=Statistics)
async def get_model_statistics(
    brand: str,
    model: str,
    period: int = Query(90, description="Period in days for statistics calculation"),
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for a specific brand/model"""
    start_date = date.today() - timedelta(days=period)
    
    query = select(Car).where(
        Car.brand == brand,
        Car.model == model,
        Car.sale_date >= start_date
    )
    result = await db.execute(query)
    cars = result.scalars().all()
    
    if not cars:
        raise HTTPException(status_code=404, detail="No cars found for this period")
    
    prices = [c.price for c in cars if c.price is not None]
    mileages = [c.mileage for c in cars if c.mileage is not None]
    
    return Statistics(
        count=len(cars),
        avg_price=sum(prices) / len(prices) if prices else 0,
        min_price=min(prices) if prices else 0,
        max_price=max(prices) if prices else 0,
        avg_mileage=sum(mileages) / len(mileages) if mileages else None,
        total_value=sum(prices) if prices else 0,
        price_trend=calculate_price_trend(cars)
    )

@app.get("/api/v1/search")
async def search_cars(
    query: str,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Search cars by brand or model"""
    search = f"%{query.lower()}%"
    result = await db.execute(
        select(Car).where(
            (func.lower(Car.brand).like(search)) |
            (func.lower(Car.model).like(search))
        ).limit(limit)
    )
    return result.scalars().all()

def calculate_price_trend(cars: List[Car]) -> float:
    """Calculate price trend using linear regression"""
    if len(cars) < 2:
        return 0.0
    
    from scipy import stats
    dates = [(c.sale_date - cars[0].sale_date).days for c in cars]
    prices = [c.price for c in cars]
    
    slope, _, _, _, _ = stats.linregress(dates, prices)
    return slope

@app.delete("/api/v1/cars", response_model=dict)
async def delete_all_cars(db: AsyncSession = Depends(get_db)):
    """Delete all cars from the database."""
    try:
        # Execute delete statement
        await db.execute(delete(Car))
        await db.commit()

        logger.warning("All cars have been deleted from the database.")
        return {"message": "All cars deleted successfully."}

    except Exception as e:
        logger.error(f"Error deleting cars: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete cars")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)