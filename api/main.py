from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import date, timedelta
import uvicorn
from shared.database import get_db, Make, Model, Auction
from shared.config import settings
from api.schemas import AuctionResponse, ModelResponse, MakeResponse, Statistics

app = FastAPI(title=settings.PROJECT_NAME)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/makes", response_model=List[MakeResponse])
async def get_makes(db: AsyncSession = Depends(get_db)):
    """Get all car makes"""
    result = await db.execute(select(Make))
    makes = result.scalars().all()
    return makes

@app.get("/api/v1/makes/{make_id}/models", response_model=List[ModelResponse])
async def get_models(make_id: int, db: AsyncSession = Depends(get_db)):
    """Get all models for a specific make"""
    result = await db.execute(select(Model).where(Model.make_id == make_id))
    models = result.scalars().all()
    if not models:
        raise HTTPException(status_code=404, detail="Make not found")
    return models

@app.get("/api/v1/models/{model_id}/auctions", response_model=List[AuctionResponse])
async def get_model_auctions(
    model_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get auctions for a specific model with optional date filtering"""
    query = select(Auction).where(Auction.model_id == model_id)
    
    if start_date:
        query = query.where(Auction.sale_date >= start_date)
    if end_date:
        query = query.where(Auction.sale_date <= end_date)
    
    result = await db.execute(query)
    auctions = result.scalars().all()
    return auctions

@app.get("/api/v1/models/{model_id}/statistics", response_model=Statistics)
async def get_model_statistics(
    model_id: int,
    period: int = Query(90, description="Period in days for statistics calculation"),
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for a specific model"""
    start_date = date.today() - timedelta(days=period)
    
    # Get auctions for the period
    query = select(Auction).where(
        Auction.model_id == model_id,
        Auction.sale_date >= start_date
    )
    result = await db.execute(query)
    auctions = result.scalars().all()
    
    if not auctions:
        raise HTTPException(status_code=404, detail="No auctions found for this period")
    
    # Calculate statistics
    prices = [a.price for a in auctions]
    mileages = [a.mileage for a in auctions if a.mileage is not None]
    
    return Statistics(
        count=len(auctions),
        avg_price=sum(prices) / len(prices),
        min_price=min(prices),
        max_price=max(prices),
        avg_mileage=sum(mileages) / len(mileages) if mileages else None,
        total_value=sum(prices),
        price_trend=calculate_price_trend(auctions)
    )

@app.get("/api/v1/search")
async def search_auctions(
    query: str,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Search auctions by make or model"""
    search = f"%{query.lower()}%"
    result = await db.execute(
        select(Auction, Model, Make)
        .join(Model, Auction.model_id == Model.id)
        .join(Make, Model.make_id == Make.id)
        .where(
            (func.lower(Make.name).like(search)) |
            (func.lower(Model.name).like(search))
        )
        .limit(limit)
    )
    return result.all()

def calculate_price_trend(auctions: List[Auction]) -> float:
    """Calculate price trend using linear regression"""
    if len(auctions) < 2:
        return 0.0
    
    from scipy import stats
    dates = [(a.sale_date - auctions[0].sale_date).days for a in auctions]
    prices = [a.price for a in auctions]
    
    slope, _, _, _, _ = stats.linregress(dates, prices)
    return slope

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
