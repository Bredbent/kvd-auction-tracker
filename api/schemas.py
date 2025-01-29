from pydantic import BaseModel
from datetime import date
from typing import Optional, Dict, Any

class MakeResponse(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True

class ModelResponse(BaseModel):
    id: int
    make_id: int
    name: str
    
    class Config:
        from_attributes = True

class AuctionResponse(BaseModel):
    id: int
    kvd_id: str
    model_id: int
    year: int
    mileage: Optional[int]
    price: int
    fuel_type: Optional[str]
    transmission: Optional[str]
    sale_date: date
    raw_data: Optional[Dict[str, Any]]
    
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
