"""Integration tests for the car repository with a real test database."""
import pytest
from datetime import date

from src.repositories.car import CarRepository
from src.models.car import Car
from src.api.schemas import CarCreate, CarUpdate


@pytest.mark.asyncio
class TestCarRepository:
    """Integration tests for CarRepository with real database interactions."""

    async def test_create_and_get_car(self, db_session):
        """Test creating a car and retrieving it."""
        # Arrange
        repository = CarRepository()
        car_data = CarCreate(
            kvd_id="test-integration-1",
            brand="IntegrationBrand",
            model="IntegrationModel",
            year=2022,
            price=200000,
            mileage=0,
            sale_date=date(2025, 1, 15),
            url="https://example.com/integration-1"
        )
        
        # Act - Create car
        created_car = await repository.create(db_session, car_data)
        
        # Get the car by ID
        retrieved_car = await repository.get(db_session, created_car.id)
        
        # Assert
        assert retrieved_car is not None
        assert retrieved_car.id == created_car.id
        assert retrieved_car.kvd_id == car_data.kvd_id
        assert retrieved_car.brand == car_data.brand
        assert retrieved_car.model == car_data.model
        assert retrieved_car.year == car_data.year
        assert retrieved_car.price == car_data.price
        assert retrieved_car.mileage == car_data.mileage
        assert retrieved_car.sale_date == car_data.sale_date
        assert retrieved_car.url == car_data.url

    async def test_update_car(self, db_session):
        """Test updating a car's information."""
        # Arrange
        repository = CarRepository()
        car_data = CarCreate(
            kvd_id="test-integration-2",
            brand="OldBrand",
            model="OldModel",
            year=2021,
            price=180000,
            mileage=5000,
            sale_date=date(2025, 1, 16),
            url="https://example.com/integration-2"
        )
        
        # Create initial car
        created_car = await repository.create(db_session, car_data)
        
        # Update data
        update_data = CarUpdate(
            brand="NewBrand",
            price=190000,
            mileage=8000
        )
        
        # Act
        updated_car = await repository.update(db_session, created_car.id, update_data)
        
        # Assert
        assert updated_car is not None
        assert updated_car.id == created_car.id
        assert updated_car.kvd_id == car_data.kvd_id  # Unchanged
        assert updated_car.brand == update_data.brand  # Changed
        assert updated_car.model == car_data.model  # Unchanged
        assert updated_car.price == update_data.price  # Changed
        assert updated_car.mileage == update_data.mileage  # Changed

    async def test_delete_car(self, db_session):
        """Test deleting a car from the database."""
        # Arrange
        repository = CarRepository()
        car_data = CarCreate(
            kvd_id="test-integration-3",
            brand="DeleteBrand",
            model="DeleteModel",
            year=2023,
            price=220000,
            mileage=100,
            sale_date=date(2025, 1, 17),
            url="https://example.com/integration-3"
        )
        
        # Create initial car
        created_car = await repository.create(db_session, car_data)
        
        # Verify it exists
        car_exists = await repository.exists(db_session, created_car.id)
        assert car_exists is True
        
        # Act - Delete the car
        delete_result = await repository.delete(db_session, created_car.id)
        
        # Assert
        assert delete_result is True
        
        # Verify it no longer exists
        car_exists = await repository.exists(db_session, created_car.id)
        assert car_exists is False
        
        # Try to get the deleted car
        deleted_car = await repository.get(db_session, created_car.id)
        assert deleted_car is None

    async def test_get_multiple_cars(self, db_session):
        """Test retrieving multiple cars with filters and pagination."""
        # Arrange
        repository = CarRepository()
        
        # Create test cars with different brands
        test_cars = [
            CarCreate(
                kvd_id=f"test-multi-{i}",
                brand="TestBrand" if i % 2 == 0 else "OtherBrand",
                model=f"Model{i}",
                year=2020 + i,
                price=100000 + i * 10000,
                mileage=i * 1000,
                sale_date=date(2025, 1, 20 + i),
                url=f"https://example.com/multi-{i}"
            ) for i in range(5)
        ]
        
        created_cars = []
        for car_data in test_cars:
            car = await repository.create(db_session, car_data)
            created_cars.append(car)
            
        # Act - Get all cars
        all_cars, total = await repository.get_multi(db_session)
        
        # Assert
        assert len(all_cars) >= len(created_cars)  # May include cars from other tests
        assert total >= len(created_cars)
        
        # Act - Get cars with pagination
        paginated_cars, paginated_total = await repository.get_multi(
            db_session, skip=1, limit=2
        )
        
        # Assert
        assert len(paginated_cars) == 2
        assert paginated_total >= len(created_cars)
        
        # Act - Get cars with brand filter
        filtered_cars, filtered_total = await repository.get_multi(
            db_session, brand="TestBrand"
        )
        
        # Assert - At least our test cars with TestBrand should be included
        test_brand_count = sum(1 for car in test_cars if car.brand == "TestBrand")
        assert len(filtered_cars) >= test_brand_count
        assert filtered_total >= test_brand_count
        for car in filtered_cars:
            assert car.brand == "TestBrand"