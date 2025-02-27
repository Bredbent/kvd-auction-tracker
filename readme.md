# KVD Auction Tracker

A microservice application that tracks and analyzes closed auctions from KVD.se. The service automatically scrapes auction data and stores it in a PostgreSQL database, making it accessible through a REST API.

## Features

- Automated hourly/daily scraping of closed car auctions
- PostgreSQL database for persistent storage
- Redis for caching
- REST API with comprehensive endpoints for data access
- Repository pattern for clean separation of concerns
- Docker containerization for easy deployment
- Data extraction includes:
  - Car brand and model
  - Sale price
  - Mileage
  - Year
  - Sale date
  - Auction ID and URL

## Tech Stack

- Python 3.11
- FastAPI
- SQLAlchemy (async)
- Pydantic for data validation
- Selenium/ChromeDriver
- PostgreSQL
- Redis
- Docker & Docker Compose

## Project Structure
```
kvd-auction-tracker/
├── src/               # Source code
│   ├── api/           # FastAPI application
│   ├── models/        # Database models
│   ├── repositories/  # Data repositories
│   ├── scraper/       # Auction scraper service
│   ├── services/      # Business logic services
│   └── utils/         # Shared utilities and config
├── tests/             # Test suite
│   ├── unit/          # Unit tests
│   └── integration/   # Integration tests
├── docker/            # Docker-related files
├── logs/              # Log files
├── config/            # Configuration files
├── docker-compose.yml # Docker composition
└── requirements.txt   # Python dependencies
```

## Setup

### Prerequisites
- Docker
- Docker Compose

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Bredbent/kvd-auction-tracker.git
cd kvd-auction-tracker
```

2. Create environment file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Build and start services:
```bash
docker-compose up --build
```

## Usage

### API Endpoints

- `GET /api/v1/cars` - List all cars
- `GET /api/v1/cars/{car_id}` - Get a specific car by ID
- `GET /api/v1/makes` - List all car makes/brands
- `GET /api/v1/makes/{make}/models` - List models for a specific make
- `GET /api/v1/models/{make}/{model}/auctions` - List auctions for a specific model
- `GET /api/v1/models/{make}/{model}/statistics` - Get statistics for a specific model
- `POST /api/v1/search` - Search auctions by make or model
- `DELETE /api/v1/cars` - Delete all cars (admin only)

### Scraper Service

The scraper runs automatically on an hourly basis. It:
- Scrapes closed auction data from KVD.se
- Extracts and processes relevant information
- Stores data in PostgreSQL database
- Maintains a CSV backup for data integrity

Available scraper modes:
- **Hourly mode** (default): Runs at the start of each hour
- **Daily mode**: Runs once per day
- **Midnight mode**: Runs at midnight
- **One-time mode**: Runs once and exits

## Development

### Local Development Setup

1. Create a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
pip install -e .  # Install package in development mode
```

3. Run services:
```bash
# Run database initialization
python -m src.utils.init_db

# Run the scraper once
python -m src.scraper.scraper_service once

# Run the API server
uvicorn src.api.main:app --reload
```

### Docker Development

Build and run specific services:
```bash
# Run only scraper (scheduled mode)
docker-compose up --build scraper

# Run a one-time scrape
docker-compose --profile utils up --build scraper-once 

# Run only API
docker-compose up --build api
```

## Configuration

Key configuration options in `.env`:
```
# Database
POSTGRES_USER=kvd_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=kvd_auctions

# Redis
REDIS_PASSWORD=your_redis_password

# API
SECRET_KEY=your_secret_key
BACKEND_CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## Logs

Logs are stored in the `logs/` directory:
- `scraper_YYYYMMDD.log` - Daily scraper logs
- `scraper_service_YYYYMMDD.log` - Scraper service logs
- Application logs available through Docker logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

[MIT License](LICENSE)
