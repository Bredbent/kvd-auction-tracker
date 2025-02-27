from typing import List, Dict, Any, Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.car import CarRepository
from src.api.schemas import CarCreate, CarUpdate, Statistics


class CarService:
    def __init__(self):
        self.repository = CarRepository()
    
    async def get_car(self, db: AsyncSession, car_id: int) -> Optional[Any]:
        return await self.repository.get(db, car_id)
    
    async def get_car_by_kvd_id(self, db: AsyncSession, kvd_id: str) -> Optional[Any]:
        return await self.repository.get_by_kvd_id(db, kvd_id)
    
    async def get_cars(
        self, db: AsyncSession, skip: int = 0, limit: int = 100, 
        brand: Optional[str] = None, model: Optional[str] = None, 
        year: Optional[int] = None, min_price: Optional[int] = None, 
        max_price: Optional[int] = None, min_mileage: Optional[int] = None, 
        max_mileage: Optional[int] = None
    ) -> List[Any]:
        return await self.repository.get_filtered(
            db, skip=skip, limit=limit, brand=brand, model=model, 
            year=year, min_price=min_price, max_price=max_price,
            min_mileage=min_mileage, max_mileage=max_mileage
        )
    
    async def create_car(self, db: AsyncSession, car_data: CarCreate) -> Any:
        car_dict = car_data.model_dump()
        return await self.repository.create(db, obj_in=car_dict)
    
    async def update_car(self, db: AsyncSession, car_id: int, car_data: CarUpdate) -> Optional[Any]:
        car = await self.repository.get(db, car_id)
        if not car:
            return None
        car_data_dict = car_data.model_dump(exclude_unset=True)
        return await self.repository.update(db, db_obj=car, obj_in=car_data_dict)
    
    async def delete_car(self, db: AsyncSession, car_id: int) -> Optional[Any]:
        return await self.repository.remove(db, id=car_id)
    
    async def delete_all_cars(self, db: AsyncSession) -> int:
        return await self.repository.delete_all(db)
    
    async def get_all_makes(self, db: AsyncSession) -> List[str]:
        return await self.repository.get_all_brands(db)
    
    async def get_models_by_make(self, db: AsyncSession, make: str) -> List[str]:
        return await self.repository.get_models_by_brand(db, make)
    
    async def get_cars_by_make_and_model(
        self, db: AsyncSession, make: str, model: str, skip: int = 0, limit: int = 100
    ) -> List[Any]:
        return await self.repository.get_by_brand_and_model(db, make, model, skip, limit)
    
    async def get_statistics(self, db: AsyncSession, make: str, model: str) -> Statistics:
        stats_dict = await self.repository.get_statistics(db, make, model)
        return Statistics(**stats_dict)
    
    async def search_cars(
        self, db: AsyncSession, search_term: str, skip: int = 0, limit: int = 100
    ) -> List[Any]:
        return await self.repository.search(db, search_term, skip, limit)
    
    async def check_if_car_exists(self, db: AsyncSession, kvd_id: str) -> bool:
        car = await self.repository.get_by_kvd_id(db, kvd_id)
        return car is not None