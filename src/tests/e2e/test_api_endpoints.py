"""End-to-end tests for the API endpoints."""
import pytest
from datetime import date, datetime
import json

from src.api.schemas import CarCreate


@pytest.mark.asyncio
class TestAPIEndpoints:
    """E2E tests for API endpoints."""
    
    async def test_health_check(self, test_client):
        """Test the health check endpoint."""
        response = test_client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
    
    async def test_create_and_get_car(self, test_client):
        """Test creating a car and retrieving it by ID."""
        # Create car via API
        car_data = {
            "kvd_id": "e2e-test-car-1",
            "brand": "E2EBrand",
            "model": "E2EModel",
            "year": 2023,
            "price": 250000,
            "mileage": 1000,
            "sale_date": "2025-02-01",
            "url": "https://example.com/e2e-test-1"
        }
        
        create_response = test_client.post(
            "/api/cars/",
            json=car_data
        )
        
        assert create_response.status_code == 201
        created_car = create_response.json()
        assert created_car["kvd_id"] == car_data["kvd_id"]
        assert created_car["brand"] == car_data["brand"]
        assert created_car["model"] == car_data["model"]
        
        # Get car by ID
        car_id = created_car["id"]
        get_response = test_client.get(f"/api/cars/{car_id}")
        
        assert get_response.status_code == 200
        retrieved_car = get_response.json()
        assert retrieved_car["id"] == car_id
        assert retrieved_car["kvd_id"] == car_data["kvd_id"]
        assert retrieved_car["brand"] == car_data["brand"]
        assert retrieved_car["price"] == car_data["price"]
    
    async def test_list_cars_with_pagination(self, test_client, sample_cars):
        """Test listing cars with pagination."""
        # Test default pagination (no parameters)
        response = test_client.get("/api/cars/")
        assert response.status_code == 200
        result = response.json()
        
        assert "items" in result
        assert "total" in result
        assert "page" in result
        assert "size" in result
        assert "pages" in result
        
        # Test with custom pagination
        response = test_client.get("/api/cars/?skip=1&limit=2")
        assert response.status_code == 200
        result = response.json()
        
        assert len(result["items"]) <= 2  # Should have at most 2 items
        assert result["page"] == 1  # 0-based indexing but +1 for display
        assert result["size"] == 2
    
    async def test_update_car(self, test_client):
        """Test updating a car."""
        # First create a car
        car_data = {
            "kvd_id": "e2e-test-car-update",
            "brand": "OldBrand",
            "model": "OldModel",
            "year": 2022,
            "price": 200000,
            "mileage": 5000,
            "sale_date": "2025-02-05",
            "url": "https://example.com/e2e-update"
        }
        
        create_response = test_client.post("/api/cars/", json=car_data)
        assert create_response.status_code == 201
        created_car = create_response.json()
        car_id = created_car["id"]
        
        # Update the car
        update_data = {
            "brand": "UpdatedBrand",
            "price": 220000
        }
        
        update_response = test_client.patch(f"/api/cars/{car_id}", json=update_data)
        assert update_response.status_code == 200
        updated_car = update_response.json()
        
        # Verify updates were applied
        assert updated_car["id"] == car_id
        assert updated_car["brand"] == update_data["brand"]
        assert updated_car["price"] == update_data["price"]
        assert updated_car["model"] == car_data["model"]  # Unchanged
        
        # Verify by getting the car again
        get_response = test_client.get(f"/api/cars/{car_id}")
        assert get_response.status_code == 200
        retrieved_car = get_response.json()
        assert retrieved_car["brand"] == update_data["brand"]
    
    async def test_delete_car(self, test_client):
        """Test deleting a car."""
        # First create a car
        car_data = {
            "kvd_id": "e2e-test-car-delete",
            "brand": "DeleteBrand",
            "model": "DeleteModel",
            "year": 2022,
            "price": 180000,
            "mileage": 8000,
            "sale_date": "2025-02-10",
            "url": "https://example.com/e2e-delete"
        }
        
        create_response = test_client.post("/api/cars/", json=car_data)
        assert create_response.status_code == 201
        created_car = create_response.json()
        car_id = created_car["id"]
        
        # Delete the car
        delete_response = test_client.delete(f"/api/cars/{car_id}")
        assert delete_response.status_code == 204
        
        # Verify car is deleted
        get_response = test_client.get(f"/api/cars/{car_id}")
        assert get_response.status_code == 404
    
    async def test_search_cars(self, test_client):
        """Test searching cars by query."""
        # Create test cars with searchable terms
        search_cars = [
            {
                "kvd_id": "search-volvo-xc90",
                "brand": "Volvo",
                "model": "XC90",
                "year": 2020,
                "price": 300000,
                "mileage": 15000,
                "sale_date": "2025-02-15",
                "url": "https://example.com/search-volvo"
            },
            {
                "kvd_id": "search-bmw-x5",
                "brand": "BMW",
                "model": "X5",
                "year": 2021,
                "price": 350000,
                "mileage": 10000,
                "sale_date": "2025-02-16",
                "url": "https://example.com/search-bmw"
            }
        ]
        
        for car_data in search_cars:
            response = test_client.post("/api/cars/", json=car_data)
            assert response.status_code == 201
        
        # Search for Volvo
        search_response = test_client.post("/api/cars/search", json={"query": "Volvo"})
        assert search_response.status_code == 200
        search_results = search_response.json()
        
        # Verify results
        assert "items" in search_results
        assert len(search_results["items"]) > 0
        volvo_found = False
        for car in search_results["items"]:
            if car["brand"] == "Volvo":
                volvo_found = True
                break
        assert volvo_found is True
    
    async def test_statistics(self, test_client, sample_cars):
        """Test getting car statistics."""
        response = test_client.get("/api/stats")
        assert response.status_code == 200
        stats = response.json()
        
        # Verify the response has all the expected fields
        assert "count" in stats
        assert "avg_price" in stats
        assert "min_price" in stats
        assert "max_price" in stats
        assert "avg_mileage" in stats
        assert "total_value" in stats
        assert "price_trend" in stats
        
        # Basic validation of values
        assert stats["count"] > 0
        assert stats["avg_price"] > 0
        assert stats["min_price"] > 0
        assert stats["max_price"] >= stats["min_price"]
        assert stats["total_value"] > 0