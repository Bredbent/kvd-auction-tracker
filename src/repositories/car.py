from typing import List, Optional, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from src.models.car import Car
from src.repositories.base import BaseRepository


class CarRepository(BaseRepository[Car]):
    def __init__(self):
        super().__init__(Car)
    
    async def get_by_kvd_id(self, db: AsyncSession, kvd_id: str) -> Optional[Car]:
        return await self.get_by_field(db, "kvd_id", kvd_id)
    
    async def get_by_brand_and_model(
        self, db: AsyncSession, brand: str, model: str, skip: int = 0, limit: int = 100
    ) -> List[Car]:
        result = await db.execute(
            select(Car)
            .filter(Car.brand == brand, Car.model == model)
            .order_by(desc(Car.sale_date))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    async def get_all_brands(self, db: AsyncSession) -> List[str]:
        result = await db.execute(
            select(Car.brand).distinct().order_by(Car.brand)
        )
        return result.scalars().all()
    
    async def get_models_by_brand(self, db: AsyncSession, brand: str) -> List[str]:
        result = await db.execute(
            select(Car.model).distinct().filter(Car.brand == brand).order_by(Car.model)
        )
        return result.scalars().all()
    
    async def get_statistics(self, db: AsyncSession, brand: str, model: str) -> Dict[str, Any]:
        result = await db.execute(
            select(
                func.count(Car.id).label("count"),
                func.avg(Car.price).label("avg_price"),
                func.min(Car.price).label("min_price"),
                func.max(Car.price).label("max_price"),
                func.avg(Car.mileage).label("avg_mileage"),
                func.sum(Car.price).label("total_value"),
            )
            .filter(Car.brand == brand, Car.model == model)
        )
        stats = result.mappings().first()
        
        # TODO: Implement price trend calculation
        # This would typically involve time series analysis
        price_trend = 0.0
        
        if stats:
            return {
                "count": stats["count"] or 0,
                "avg_price": float(stats["avg_price"] or 0),
                "min_price": stats["min_price"] or 0,
                "max_price": stats["max_price"] or 0,
                "avg_mileage": float(stats["avg_mileage"] or 0),
                "total_value": stats["total_value"] or 0,
                "price_trend": price_trend,
            }
        return {
            "count": 0,
            "avg_price": 0.0,
            "min_price": 0,
            "max_price": 0,
            "avg_mileage": 0.0,
            "total_value": 0,
            "price_trend": 0.0,
        }
    
    async def search(
        self, db: AsyncSession, search_term: str, skip: int = 0, limit: int = 100
    ) -> List[Car]:
        search_pattern = f"%{search_term}%"
        result = await db.execute(
            select(Car)
            .filter((Car.brand.ilike(search_pattern)) | (Car.model.ilike(search_pattern)))
            .order_by(desc(Car.sale_date))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    async def get_filtered(
        self, db: AsyncSession, skip: int = 0, limit: int = 100,
        brand: Optional[str] = None, model: Optional[str] = None,
        year: Optional[int] = None, min_price: Optional[int] = None,
        max_price: Optional[int] = None, min_mileage: Optional[int] = None,
        max_mileage: Optional[int] = None
    ) -> List[Car]:
        query = select(Car)
        
        # Apply filters if provided
        if brand:
            query = query.filter(Car.brand == brand)
        if model:
            query = query.filter(Car.model == model)
        if year:
            query = query.filter(Car.year == year)
        if min_price is not None:
            query = query.filter(Car.price >= min_price)
        if max_price is not None:
            query = query.filter(Car.price <= max_price)
        if min_mileage is not None:
            query = query.filter(Car.mileage >= min_mileage)
        if max_mileage is not None:
            query = query.filter(Car.mileage <= max_mileage)
        
        # Apply order by, offset and limit
        query = query.order_by(desc(Car.sale_date)).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def delete_all(self, db: AsyncSession) -> int:
        result = await db.execute(select(func.count(Car.id)))
        count = result.scalar() or 0
        
        await db.execute(Car.__table__.delete())
        await db.commit()
        
        return count