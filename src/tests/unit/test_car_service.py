"""Unit tests for the car service module."""
import pytest
from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.services.car_service import CarService
from src.models.car import Car
from src.api.schemas import CarCreate, CarUpdate


@pytest.mark.asyncio
class TestCarService:
    """Test cases for CarService class."""

    async def test_get_car(self):
        """Test retrieving a single car by ID."""
        # Arrange
        session = AsyncMock()
        car_id = 1
        mock_car = Car(id=car_id, kvd_id="test-car-1", brand="TestBrand", model="TestModel", 
                    year=2020, price=100000, mileage=10000, 
                    sale_date=date(2025, 1, 1), url="https://example.com/test-car-1")
        
        session.execute.return_value = AsyncMock()
        session.execute.return_value.scalar_one_or_none = AsyncMock(return_value=mock_car)

        service = CarService()
        
        # Act
        result = await service.get_car(session, car_id)
        
        # Assert
        assert result == mock_car
        session.execute.assert_called_once()

    async def test_get_car_not_found(self):
        """Test retrieving a non-existent car returns None."""
        # Arrange
        session = AsyncMock()
        car_id = 999  # Non-existent ID
        
        # Configure the execute method to return None
        session.execute.return_value.scalar_one_or_none.return_value = None
        service = CarService()
        
        # Act
        result = await service.get_car(session, car_id)
        
        # Assert
        assert result is None
        session.execute.assert_called_once()

    async def test_get_cars(self):
        """Test retrieving multiple cars with pagination."""
        # Arrange
        session = AsyncMock()
        mock_cars = [
            Car(id=1, kvd_id="test-car-1", brand="Brand1", model="Model1", 
                year=2020, price=100000, mileage=10000, 
                sale_date=date(2025, 1, 1), url="https://example.com/1"),
            Car(id=2, kvd_id="test-car-2", brand="Brand2", model="Model2", 
                year=2021, price=150000, mileage=5000, 
                sale_date=date(2025, 1, 2), url="https://example.com/2")
        ]

        session.execute.return_value = AsyncMock()
        session.execute.return_value.scalars = AsyncMock()
        session.execute.return_value.scalars.return_value.all = AsyncMock(return_value=mock_cars)

        # Total count for pagination
        session.execute.return_value.scalar = AsyncMock(return_value=len(mock_cars))

        service = CarService()
        
        # Act
        result, total = await service.get_cars(session, skip=0, limit=10)
        
        # Assert
        assert result == mock_cars
        assert total == len(mock_cars)
        assert session.execute.call_count == 2  # One for results, one for count

    async def test_create_car(self):
        """Test creating a new car."""
        # Arrange
        session = AsyncMock()
        car_data = CarCreate(
            kvd_id="new-car-1",
            brand="NewBrand",
            model="NewModel",
            year=2022,
            price=200000,
            mileage=0,
            sale_date=date(2025, 1, 10),
            url="https://example.com/new-car-1"
        )
        
        service = CarService()
        
        # Act
        result = await service.create_car(session, car_data)
        
        # Assert
        assert result.kvd_id == car_data.kvd_id
        assert result.brand == car_data.brand
        assert result.model == car_data.model
        assert result.year == car_data.year
        assert result.price == car_data.price
        assert result.mileage == car_data.mileage
        assert result.sale_date == car_data.sale_date
        assert result.url == car_data.url
        
        session.add.assert_called_once()
        session.commit.assert_called_once()
        session.refresh.assert_called_once()

    async def test_update_car(self):
        """Test updating an existing car."""
        # Arrange
        session = AsyncMock()
        car_id = 1
        mock_car = Car(
            id=car_id,
            kvd_id="test-car-1",
            brand="OldBrand",
            model="OldModel",
            year=2020,
            price=100000,
            mileage=10000,
            sale_date=date(2025, 1, 1),
            url="https://example.com/test-car-1"
        )
        
        # Configure the execute method to return our mock car
        session.execute.return_value = AsyncMock()
        session.execute.return_value.scalar_one_or_none = AsyncMock(return_value=mock_car)

        
        update_data = CarUpdate(
            brand="NewBrand",
            price=120000
        )
        
        service = CarService()
        
        # Act
        result = await service.update_car(session, car_id, update_data)
        
        # Assert
        assert result.id == car_id
        assert result.brand == update_data.brand  # Updated field
        assert result.model == mock_car.model  # Unchanged field
        assert result.price == update_data.price  # Updated field
        
        session.execute.assert_called_once()
        session.commit.assert_called_once()

    async def test_delete_car(self):
        """Test deleting a car."""
        # Arrange
        session = AsyncMock()
        car_id = 1
        mock_car = Car(
            id=car_id,
            kvd_id="test-car-1",
            brand="TestBrand",
            model="TestModel",
            year=2020,
            price=100000,
            mileage=10000,
            sale_date=date(2025, 1, 1),
            url="https://example.com/test-car-1"
        )
        
        # Configure the execute method to return our mock car
        session.execute.return_value.scalar_one_or_none.return_value = mock_car
        
        service = CarService()
        
        # Act
        result = await service.delete_car(session, car_id)
        
        # Assert
        assert result is True
        session.execute.assert_called_once()
        session.delete.assert_called_once_with(mock_car)
        session.commit.assert_called_once()

    async def test_delete_car_not_found(self):
        """Test attempting to delete a non-existent car."""
        # Arrange
        session = AsyncMock()
        car_id = 999  # Non-existent ID
        
        # Configure the execute method to return None
        session.execute.return_value.scalar_one_or_none.return_value = None
        
        service = CarService()
        
        # Act
        result = await service.delete_car(session, car_id)
        
        # Assert
        assert result is False
        session.execute.assert_called_once()
        session.delete.assert_not_called()
        session.commit.assert_not_called()

    async def test_check_if_car_exists(self):
        """Test checking if a car exists by KVD ID."""
        # Arrange
        session = AsyncMock()
        kvd_id = "test-car-1"
        
        # Test case 1: Car exists
        session.execute.return_value.scalar.return_value = 1
        service = CarService()
        
        # Act
        result = await service.check_if_car_exists(session, kvd_id)
        
        # Assert
        assert result is True
        session.execute.assert_called_once()
        
        # Test case 2: Car does not exist
        session.reset_mock()
        session.execute.return_value.scalar.return_value = 0
        
        # Act
        result = await service.check_if_car_exists(session, kvd_id)
        
        # Assert
        assert result is False
        session.execute.assert_called_once()