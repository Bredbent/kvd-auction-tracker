"""
Configuration for pytest test suite.
This module contains fixtures and configuration for all test types.
"""
import asyncio
import os
from datetime import datetime, date
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from src.utils.database import Base, get_db
from src.api.main import app
from src.models.car import Car


# Constants
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://kvd_user:devpassword123@localhost:5432/kvd_test")


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def db_engine():
    """Create a test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine):
    """Create a test database session."""
    session_factory = sessionmaker(
        db_engine, 
        class_=AsyncSession, 
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )
    
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
def test_client(db_session):
    """Create a FastAPI test client with a test database session."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def sample_cars(db_session):
    """Create sample car data for tests."""
    cars = [
        Car(
            kvd_id="test-car-1",
            brand="TestBrand1",
            model="TestModel1",
            year=2020,
            price=100000,
            mileage=10000,
            sale_date=date(2025, 1, 1),
            url="https://example.com/test-car-1",
            created_at=datetime.now()
        ),
        Car(
            kvd_id="test-car-2",
            brand="TestBrand2",
            model="TestModel2",
            year=2021,
            price=150000,
            mileage=5000,
            sale_date=date(2025, 1, 2),
            url="https://example.com/test-car-2",
            created_at=datetime.now()
        ),
        Car(
            kvd_id="test-car-3",
            brand="TestBrand1",
            model="TestModel3",
            year=2019,
            price=80000,
            mileage=15000,
            sale_date=date(2025, 1, 3),
            url="https://example.com/test-car-3",
            created_at=datetime.now()
        )
    ]
    
    for car in cars:
        db_session.add(car)
    
    await db_session.commit()
    
    yield cars
    
    for car in cars:
        await db_session.delete(car)
    
    await db_session.commit()