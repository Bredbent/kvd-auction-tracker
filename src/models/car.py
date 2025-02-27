from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, JSON
from sqlalchemy.sql import func
from src.models import Base


class Car(Base):
    __tablename__ = "cars"

    id = Column(Integer, primary_key=True)
    kvd_id = Column(String(100), unique=True, nullable=False)
    brand = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    price = Column(Integer)
    mileage = Column(Integer, nullable=False)
    sale_date = Column(Date, nullable=False)
    url = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    raw_data = Column(JSON)