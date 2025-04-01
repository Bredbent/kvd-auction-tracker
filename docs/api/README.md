# API Documentation

## Base URL

All API endpoints are prefixed with `/api/v1`.

## Authentication

Currently, the API does not require authentication.

## Endpoints

### Cars

- `GET /cars` - List all cars
- `GET /cars/{car_id}` - Get a specific car by ID
- `POST /cars` - Create a new car
- `PATCH /cars/{car_id}` - Update a car
- `DELETE /cars/{car_id}` - Delete a car

### Makes and Models

- `GET /makes` - List all makes/brands
- `GET /makes/{make}/models` - List models for a specific make
- `GET /models/{make}/{model}/auctions` - List auctions for a specific model
- `GET /models/{make}/{model}/statistics` - Get statistics for a specific model

### Search

- `POST /search` - Search auctions by make or model

### Chat

- `POST /chat` - Process a chat query with the AI assistant

## Data Models

See the [schemas.py](../../src/api/schemas.py) file for detailed data models.
