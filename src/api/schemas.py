from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, Dict, Any, List


class CarBase(BaseModel):
    brand: str
    model: str
    year: int = 0
    mileage: int = 0
    sale_date: date
    kvd_id: str
    url: str


class CarCreate(CarBase):
    price: Optional[int] = None
    raw_data: Optional[Dict[str, Any]] = None


class CarUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    price: Optional[int] = None
    mileage: Optional[int] = None
    sale_date: Optional[date] = None
    url: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


class CarResponse(CarBase):
    id: int
    price: Optional[int] = None
    created_at: Optional[datetime] = None
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "brand": "Volvo",
                    "model": "XC60",
                    "year": 2018,
                    "mileage": 48000,
                    "sale_date": "2025-01-15",
                    "kvd_id": "ABC123",
                    "url": "https://example.com",
                    "price": 25000,
                    "created_at": "2025-01-15T10:00:00"
                }
            ]
        }
    }
    
    def __init__(self, **data):
        super().__init__(**data)
        # Ensure created_at is a datetime or None
        if hasattr(self, "created_at") and self.created_at and not isinstance(self.created_at, datetime):
            try:
                self.created_at = datetime.fromisoformat(str(self.created_at))
            except (ValueError, TypeError):
                self.created_at = None


class CarListResponse(BaseModel):
    items: List[CarResponse]
    total: int
    page: int
    size: int
    pages: int


class Statistics(BaseModel):
    count: int
    avg_price: float
    min_price: int
    max_price: int
    avg_mileage: Optional[float]
    total_value: int
    price_trend: float


class MakeResponse(BaseModel):
    name: str
    model_count: int
    
    model_config = {
        'protected_namespaces': ()
    }


class ModelResponse(BaseModel):
    name: str
    auction_count: int


class SearchParams(BaseModel):
    query: str = Field(..., min_length=2)
    skip: int = 0
    limit: int = 20


class ErrorResponse(BaseModel):
    detail: str