from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, JSON
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
from shared.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=True)
Base = declarative_base()

class Car(Base):
    __tablename__ = "cars"

    id = Column(Integer, primary_key=True)
    kvd_id = Column(String(100), unique=True, nullable=False)
    brand = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    year = Column(Integer,nullable=False)
    price = Column(Integer)
    mileage = Column(Integer, nullable=False)
    sale_date = Column(Date, nullable=False)
    url = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    raw_data = Column(JSON)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db() -> AsyncSession:
    async with AsyncSession(engine) as session:
        yield session