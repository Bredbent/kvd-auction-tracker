# KVD Auction Tracker

A microservice application that tracks and analyzes closed auctions from KVD.se. The service automatically scrapes auction data daily and stores it in a PostgreSQL database, making it accessible through a REST API.

## Features

- Automated daily scraping of closed car auctions
- PostgreSQL database for persistent storage
- REST API endpoints for data access
- Data extraction includes:
  - Car brand and model
  - Sale price
  - Mileage
  - Sale date
  - Auction ID and URL

## Tech Stack

- Python 3.11
- FastAPI
- SQLAlchemy
- Selenium/ChromeDriver
- PostgreSQL
- Docker

## Project Structure
```
kvd-auction-tracker/
├── api/                # FastAPI application
├── scraper/           # Auction scraper service
├── shared/            # Shared configurations and models
├── logs/              # Log files
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

- `GET /api/v1/makes` - List all car makes
- `GET /api/v1/makes/{make_id}/models` - List models for a specific make
- `GET /api/v1/models/{model_id}/auctions` - List auctions for a specific model
- `GET /api/v1/models/{model_id}/statistics` - Get statistics for a specific model
- `GET /api/v1/search` - Search auctions by make or model

### Scraper Service

The scraper runs automatically once per day at midnight. It:
- Scrapes closed auction data from KVD.se
- Extracts relevant information
- Stores data in PostgreSQL database
- Maintains a CSV backup

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
```

3. Run the local scraper:
```bash
python scraper/kvd_scraper_local.py
```

### Docker Development

Build and run specific services:
```bash
docker-compose up --build scraper  # Run only scraper
docker-compose up --build api      # Run only API
```

## Configuration

Key configuration options in `.env`:
```
POSTGRES_USER=kvd_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=kvd_auctions
```

## Logs

Logs are stored in the `logs/` directory:
- `scraper_YYYYMMDD.log` - Daily scraper logs
- Application logs available through Docker logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

[MIT License](LICENSE)
