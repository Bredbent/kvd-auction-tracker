from pydantic import BaseModel
from datetime import date
from typing import Optional, Dict, Any

class CarResponse(BaseModel):
    brand: str
    model: str
    price: Optional[int]
    mileage: Optional[int]
    year: int
    sale_date: date
    kvd_id: str
    url: str
    
    class Config:
        from_attributes = True

class Statistics(BaseModel):
    count: int
    avg_price: float
    min_price: int
    max_price: int
    avg_mileage: Optional[float]
    total_value: int
    price_trend: float