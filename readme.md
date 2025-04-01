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

## Quick Start

### Prerequisites
- Docker
- Docker Compose

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/kvd-auction-tracker.git
cd kvd-auction-tracker
```

2. Set up the environment:
```bash
# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Run the setup script
./scripts/setup_docker.sh
```

3. Access the application:
- Frontend: http://localhost:80
- API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Development

See the [Development Guide](docs/development/README.md) for detailed instructions on setting up a development environment.

## Documentation

- [API Documentation](docs/api/README.md)
- [Architecture Overview](docs/architecture/README.md)
- [Development Guide](docs/development/README.md)

## Project Structure
```
kvd-auction-tracker/
├── src/               # Backend source code
│   ├── api/           # FastAPI application
│   ├── models/        # Database models
│   ├── repositories/  # Data repositories
│   ├── scraper/       # Auction scraper service
│   ├── services/      # Business logic services
│   └── utils/         # Shared utilities
├── frontend/          # Frontend application
├── config/            # Configuration files
├── docker/            # Docker-related files
├── docs/              # Documentation
├── scripts/           # Utility scripts
└── tests/             # Test configurations
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

[MIT License](LICENSE)
