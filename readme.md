# KVD Auction Explorer

A full-stack application that tracks, analyzes, and visualizes closed auctions from KVD.se. The system combines automated data scraping, a FastAPI backend, and a React frontend with interactive data visualization and AI-powered analysis.

## Features

### Backend
- Automated hourly/daily scraping of closed car auctions
- PostgreSQL database for persistent storage
- Redis for caching
- REST API with comprehensive endpoints for data access
- Repository pattern for clean separation of concerns
- Docker containerization for easy deployment
- AI chat endpoint for car valuations (with placeholder for Llama LLM integration)
- Data extraction includes:
  - Car brand and model
  - Sale price
  - Mileage
  - Year
  - Sale date
  - Auction ID and URL

### Frontend
- Multi-panel scatter plot visualization of car prices vs. mileage by year
- Interactive filters for brands, years, price range, and mileage
- Comprehensive data table with sorting, filtering, and pagination
- AI chat assistant for answering questions about car valuations and market trends
- Responsive design for desktop, tablet, and mobile devices

## Tech Stack

### Backend
- Python 3.11
- FastAPI
- SQLAlchemy (async)
- Pydantic for data validation
- Selenium/ChromeDriver
- PostgreSQL
- Redis
- Docker & Docker Compose

### Frontend
- React 18
- TypeScript
- Material UI component library
- Plotly.js for data visualization
- React Query for data fetching and caching
- Axios for API communication

## Project Structure
```
kvd-auction-tracker/
├── src/               # Backend source code
│   ├── api/           # FastAPI application
│   ├── models/        # Database models
│   ├── repositories/  # Data repositories
│   ├── scraper/       # Auction scraper service
│   ├── services/      # Business logic services
│   ├── tests/         # Test suite
│   │   ├── unit/      # Unit tests
│   │   ├── integration/ # Integration tests
│   │   └── e2e/       # End-to-end tests
│   └── utils/         # Shared utilities and config
├── frontend/          # Frontend application
│   ├── src/           # React source code
│   │   ├── components/# React components
│   │   ├── context/   # React context providers
│   │   ├── hooks/     # Custom React hooks
│   │   ├── pages/     # Page components
│   │   ├── services/  # API services
│   │   └── types/     # TypeScript type definitions
│   ├── public/        # Static assets
│   └── package.json   # NPM package configuration
├── docker/            # Docker-related files
├── logs/              # Log files
├── config/            # Configuration files
├── test-results/      # Test results and reports
│   ├── allure-results/ # Allure test results
│   ├── allure-report/  # Generated Allure report
│   └── coverage/      # Coverage reports
├── docker-compose.yml # Docker composition
├── docker-compose.test.yml # Test composition
├── Dockerfile.api     # Backend API Docker build
├── Dockerfile.scraper # Scraper Docker build
├── Dockerfile.frontend # Frontend Docker build
├── pytest.ini        # Pytest configuration
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
# Database settings (required)
POSTGRES_USER=kvd_user                  # PostgreSQL username
POSTGRES_PASSWORD=your_secure_password  # PostgreSQL password
POSTGRES_DB=kvd_auctions                # PostgreSQL database name

# Redis settings (required)
REDIS_PASSWORD=your_redis_password      # Redis password

# API settings (required)
SECRET_KEY=your_secret_key              # Secret key for API security
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:80"]

# Backup settings (optional, but recommended)
NAS_BACKUP_PATH=/path/to/your/backup    # Path to your backup location
BACKUP_SCHEDULE=0 0 * * *               # Cron schedule for backups (default: daily at midnight)
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
pip install -r requirements-test.txt  # Install test dependencies
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

### Running Tests

#### Local Testing

1. Make sure your virtual environment is activated and test dependencies are installed.
2. Set up the test database:

```bash
export TEST_DATABASE_URL="postgresql+asyncpg://kvd_user:devpassword123@localhost:5432/kvd_test"
```

3. Run the tests using the test script:

```bash
# Make script executable
chmod +x run_tests.sh

# Run all tests
./run_tests.sh

# Run only unit tests
./run_tests.sh unit

# Run only integration tests
./run_tests.sh integration

# Run only e2e tests
./run_tests.sh e2e
```

4. View the test reports:
   - HTML report: `test-results/report.html`
   - Coverage report: `test-results/coverage/index.html`
   - Allure report: `test-results/allure-report/index.html` (requires Allure installation)

#### Docker Testing

Run tests in Docker containers:

```bash
# Build and run tests
docker-compose -f docker-compose.test.yml up --build

# Clean up after tests
docker-compose -f docker-compose.test.yml down
```

Test reports will be available in the `test-results` directory.

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
