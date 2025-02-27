from typing import Generator, Annotated
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.car_service import CarService


async def get_car_service(db: AsyncSession = Depends(get_db)) -> CarService:
    return CarService()


CarServiceDep = Annotated[CarService, Depends(get_car_service)]
DBSession = Annotated[AsyncSession, Depends(get_db)]