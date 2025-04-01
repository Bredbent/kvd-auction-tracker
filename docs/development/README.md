# Development Guide

## Prerequisites

- Python 3.11+
- Node.js 16+
- Docker and Docker Compose

## Local Development Setup

### Backend

1. Create a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
pip install -r requirements-test.txt
pip install -e .  # Install package in development mode
```

3. Run services:
```bash
# Run database initialization
python -m src.utils.init_db

# Run the API server
uvicorn src.api.main:app --reload
```

### Frontend

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm start
```

## Docker Development

Build and run specific services:
```bash
# Run only scraper (scheduled mode)
docker-compose up --build scraper

# Run a one-time scrape
docker-compose --profile utils up --build scraper-once 

# Run only API
docker-compose up --build api
```

## Testing

### Running Tests

```bash
# Run all tests
./scripts/run_tests.sh

# Run only unit tests
./scripts/run_tests.sh unit

# Run only integration tests
./scripts/run_tests.sh integration

# Run only e2e tests
./scripts/run_tests.sh e2e
```

### Test Structure

- **Unit Tests**: Test individual components in isolation
  - Located in `src/tests/unit/`
  - Mock external dependencies

- **Integration Tests**: Test interactions between components
  - Located in `src/tests/integration/`
  - Use test database

- **End-to-End Tests**: Test complete workflows
  - Located in `src/tests/e2e/`
  - Simulate user interactions

## Code Style and Linting

The project follows PEP 8 style guidelines for Python code and uses ESLint for JavaScript code.

### Python Code Formatting

```bash
# Format Python code
black src/ tests/

# Check code style
flake8 src/ tests/
```

### JavaScript/TypeScript Code Formatting

```bash
# Format JavaScript/TypeScript code
cd frontend
npm run lint
npm run format
```

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run tests to ensure nothing breaks
4. Create a pull request
5. Wait for code review and approval
6. Merge to `main`

## Environment Variables

See `.env.example` for a list of all environment variables used by the application.
