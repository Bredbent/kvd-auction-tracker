#!/bin/bash
set -e

# Print colored status messages
function echo_status() {
  echo -e "\e[1;34m>> $1\e[0m"
}

function echo_success() {
  echo -e "\e[1;32m✓ $1\e[0m"
}

function echo_warning() {
  echo -e "\e[1;33m⚠ $1\e[0m"
}

function echo_error() {
  echo -e "\e[1;31m✗ $1\e[0m"
  exit 1
}

# Check if we're in the root directory of the repo
if [ ! -f "docker-compose.yml" ] || [ ! -d "src" ] || [ ! -d "frontend" ]; then
  echo_error "Please run this script from the root directory of the repository"
fi

echo_status "Starting repository reorganization..."
echo_warning "This script will reorganize your repository. Make sure you have a backup or commit your changes before proceeding."
echo "Press Enter to continue or Ctrl+C to abort..."
read

# Create new directory structure
echo_status "Creating new directory structure..."

mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE
mkdir -p docs/api
mkdir -p docs/architecture
mkdir -p docs/development
mkdir -p scripts
mkdir -p config
mkdir -p tests

echo_success "Created directory structure"

# Move Docker files to docker directory
echo_status "Organizing Docker files..."

if [ ! -d "docker" ]; then
  mkdir -p docker
fi

# Move Dockerfiles to docker directory but create symlinks for backward compatibility
for dockerfile in $(find . -maxdepth 1 -name "Dockerfile*" -type f); do
  filename=$(basename "$dockerfile")
  if [ ! -f "docker/$filename" ]; then
    echo "Moving $filename to docker/"
    mv "$dockerfile" "docker/$filename"
    ln -sf "docker/$filename" "$filename"
    echo "Created symlink for backward compatibility"
  fi
done

# Ensure entrypoint script exists in docker directory
if [ -f "docker/entrypoint.sh" ]; then
  echo "Ensuring docker/entrypoint.sh is executable"
  chmod +x docker/entrypoint.sh
fi

echo_success "Organized Docker files"

# Set up configuration
echo_status "Setting up configuration files..."

# Create config directory if it doesn't exist
if [ ! -d "config" ]; then
  mkdir -p config
fi

# Create settings templates for different environments
if [ ! -f "config/settings.dev.py" ]; then
  cat > config/settings.dev.py << 'EOF'
"""Development environment settings."""
import os
from src.utils.config import Settings

class DevSettings(Settings):
    """Development-specific settings."""
    # Database
    POSTGRES_USER: str = "kvd_user"
    POSTGRES_PASSWORD: str = "devpassword123"
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "kvd_auctions"
    
    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = "devredis123"
    
    # API
    SECRET_KEY: str = "dev_secret_key"
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:80"]

settings = DevSettings()
EOF
fi

if [ ! -f "config/settings.test.py" ]; then
  cat > config/settings.test.py << 'EOF'
"""Test environment settings."""
import os
from src.utils.config import Settings

class TestSettings(Settings):
    """Test-specific settings."""
    # Database
    POSTGRES_USER: str = "kvd_user"
    POSTGRES_PASSWORD: str = "devpassword123"
    POSTGRES_HOST: str = "postgres-test"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "kvd_test"
    
    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = "testredis123"
    
    # API
    SECRET_KEY: str = "test_secret_key"
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000"]

settings = TestSettings()
EOF
fi

if [ ! -f "config/settings.prod.py" ]; then
  cat > config/settings.prod.py << 'EOF'
"""Production environment settings."""
import os
from src.utils.config import Settings

class ProdSettings(Settings):
    """Production-specific settings."""
    # All values should be loaded from environment variables in production
    class Config:
        env_file = ".env"

settings = ProdSettings()
EOF
fi

# Move existing configuration files if present
if [ -f "src/utils/config.py" ]; then
  # Keep original in place but make a reference copy in config directory
  cp src/utils/config.py config/config_base.py
  echo_success "Created reference copy of config.py in config directory"
fi

# Create .env.example file with all required environment variables
if [ ! -f ".env.example" ]; then
  cat > .env.example << 'EOF'
# Database settings
POSTGRES_USER=kvd_user
POSTGRES_PASSWORD=change_me_in_production
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=kvd_auctions

# Redis settings
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=change_me_in_production

# API settings
SECRET_KEY=change_me_in_production
API_V1_STR=/api/v1
PROJECT_NAME=KVD Auction Tracker

# CORS settings
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:80"]

# Security
ACCESS_TOKEN_EXPIRE_MINUTES=11520

# Scraper settings
SCRAPER_SCHEDULE=0 0 * * *
SCRAPER_RATE_LIMIT=1

# Backup settings
NAS_BACKUP_PATH=/path/to/your/backup
BACKUP_SCHEDULE=0 0 * * *
EOF
fi

echo_success "Set up configuration files"

# Create utility scripts
echo_status "Creating utility scripts..."

# Create 'scripts' directory if it doesn't exist
if [ ! -d "scripts" ]; then
  mkdir -p scripts
fi

# Move existing scripts to the scripts directory
for script in setup_backup.sh setup-daily-backup.sh run_tests.sh backup.sh; do
  if [ -f "$script" ]; then
    echo "Moving $script to scripts directory"
    mv "$script" "scripts/$script"
    chmod +x "scripts/$script"
  fi
done

# Create new utility scripts

# Development environment setup script
cat > scripts/setup_dev.sh << 'EOF'
#!/bin/bash
set -e

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-test.txt
pip install -e .

# Create logs directory if it doesn't exist
mkdir -p logs

echo "Development environment set up successfully!"
echo "To activate the virtual environment, run: source venv/bin/activate"
EOF
chmod +x scripts/setup_dev.sh

# Docker environment setup script
cat > scripts/setup_docker.sh << 'EOF'
#!/bin/bash
set -e

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please edit the .env file with your configuration"
fi

# Create necessary directories
mkdir -p logs
mkdir -p backup

# Build and start the services
docker compose build
docker compose up -d

echo "Docker environment set up successfully!"
echo "Services are now running in the background"
EOF
chmod +x scripts/setup_docker.sh

echo_success "Created utility scripts"

# Set up documentation
echo_status "Setting up documentation..."

# Move existing documentation if present
if [ -f "frontend/README.md" ]; then
  mkdir -p docs/frontend
  mv frontend/README.md docs/frontend/README.md
  # Create symlink for backward compatibility
  ln -sf ../docs/frontend/README.md frontend/README.md
  echo_success "Moved frontend README to docs/frontend/"
fi

# Create main README file
if [ ! -f "docs/README.md" ]; then
  cat > docs/README.md << 'EOF'
# KVD Auction Explorer Documentation

## Table of Contents

- [API Documentation](./api/README.md)
- [Architecture Overview](./architecture/README.md)
- [Development Guide](./development/README.md)

## Quick Start

See the main [README.md](../README.md) in the project root for quick start instructions.
EOF
fi

# Create API documentation
if [ ! -f "docs/api/README.md" ]; then
  cat > docs/api/README.md << 'EOF'
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
EOF
fi

# Create architecture documentation
if [ ! -f "docs/architecture/README.md" ]; then
  cat > docs/architecture/README.md << 'EOF'
# Architecture Overview

## Components

The KVD Auction Explorer consists of several main components:

1. **Backend API (FastAPI)** - Provides data access and business logic
2. **Frontend (React)** - User interface for visualization and interaction
3. **Scraper Service** - Collects auction data on a schedule
4. **Database (PostgreSQL)** - Stores auction data
5. **Cache (Redis)** - Improves performance for frequently accessed data
6. **Backup Service** - Ensures data persistence

## Architecture Diagram

```
┌─────────────┐     ┌─────────────┐
│   Frontend  │◄────┤    API      │
│   (React)   │     │  (FastAPI)  │
└─────────────┘     └──────┬──────┘
                          ▲│
                          ││
                    ┌─────▼──────┐
                    │  Database  │
                    │(PostgreSQL)│
                    └─────┬──────┘
                          ▲│
                          ││
┌─────────────┐     ┌─────▼──────┐     ┌─────────────┐
│   Backup    │◄────┤  Scraper   │────►│    Cache    │
│   Service   │     │  Service   │     │   (Redis)   │
└─────────────┘     └─────┬──────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │   KVD.se    │
                    │ (Data Source)│
                    └─────────────┘
```

## Data Flow

1. The **Scraper Service** collects data from KVD.se on a scheduled basis
2. Scraped data is stored in the **PostgreSQL Database**
3. The **API** retrieves data from the database, with frequently accessed data cached in **Redis**
4. The **Frontend** requests data from the API and visualizes it for the user
5. The **Backup Service** creates regular backups of the database

## Code Organization

The codebase follows a modular structure:

- **src/** - Backend code
  - **api/** - API endpoints and schemas
  - **models/** - Database models
  - **repositories/** - Data access layer
  - **scraper/** - Web scraping functionality
  - **services/** - Business logic
  - **utils/** - Shared utilities

- **frontend/** - Frontend code
  - **src/components/** - React components
  - **src/context/** - React context providers
  - **src/hooks/** - Custom React hooks
  - **src/pages/** - Page components
  - **src/services/** - API services
EOF
fi

# Create development documentation
if [ ! -f "docs/development/README.md" ]; then
  cat > docs/development/README.md << 'EOF'
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
EOF
fi

# Update the main README.md with better structure
if [ -f "readme.md" ]; then
  mv readme.md README.md
fi

echo_status "Updating main README.md..."
cat > README.md << 'EOF'
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
EOF

echo_success "Updated main README.md"

# Setup linting and code formatting
echo_status "Setting up linting and code formatting..."

# Create .editorconfig
cat > .editorconfig << 'EOF'
# EditorConfig is awesome: https://EditorConfig.org

# top-most EditorConfig file
root = true

# Unix-style newlines with a newline ending every file
[*]
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
charset = utf-8

# 4 space indentation for Python files
[*.py]
indent_style = space
indent_size = 4

# 2 space indentation for JavaScript/TypeScript files
[*.{js,jsx,ts,tsx,json}]
indent_style = space
indent_size = 2

# 2 space indentation for HTML/CSS files
[*.{html,css,scss}]
indent_style = space
indent_size = 2

# 2 space indentation for YAML files
[*.{yml,yaml}]
indent_style = space
indent_size = 2

# 4 space indentation for Markdown files
[*.md]
indent_style = space
indent_size = 4
trim_trailing_whitespace = false
EOF

# Create .gitignore if not exists
if [ ! -f ".gitignore" ]; then
  cp .gitignore .gitignore.bak || true
  cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
test-results/

# Virtual Environment
venv/
ENV/
.env
.venv/
env/
env.bak/
venv.bak/

# IDE
.idea/
.vscode/
*.swp
*.swo
*.sublime-workspace
*.sublime-project

# Project specific
logs/
*.log
data/
.DS_Store
.coverage
htmlcov/
.pytest_cache/

# Docker
.docker/
docker-compose.override.yml

# Database
*.sqlite
*.db

# OS specific
Thumbs.db
.DS_Store
.directory
desktop.ini

# Jupyter Notebooks
.ipynb_checkpoints

# Frontend
node_modules/
npm-debug.log
yarn-debug.log
yarn-error.log
frontend/build/
frontend/coverage/
EOF
fi

# Create CI workflow for GitHub Actions
if [ ! -f ".github/workflows/ci.yml" ]; then
  mkdir -p .github/workflows
  cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: kvd_user
          POSTGRES_PASSWORD: devpassword123
          POSTGRES_DB: kvd_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python 3.11
      uses: actions/setup-python@v4
      with:
        python-version: 3.11
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install -r requirements-test.txt
        pip install -e .
    - name: Run tests
      env:
        TEST_DATABASE_URL: postgresql+asyncpg://kvd_user:devpassword123@localhost:5432/kvd_test
      run: |
        pytest src/tests/unit -v
        pytest src/tests/integration -v

  test-frontend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 18
    - name: Install dependencies
      run: |
        cd frontend
        npm install
    - name: Run tests
      run: |
        cd frontend
        npm test

  lint:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python 3.11
      uses: actions/setup-python@v4
      with:
        python-version: 3.11
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install flake8 black
    - name: Lint with flake8
      run: |
        flake8 src --count --select=E9,F63,F7,F82 --show-source --statistics
    - name: Check formatting with black
      run: |
        black --check src

  build:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend, lint]
    steps:
    - uses: actions/checkout@v3
    - name: Build Docker images
      run: |
        docker-compose build
EOF
fi

# Create pull request template
mkdir -p .github/PULL_REQUEST_TEMPLATE
cat > .github/PULL_REQUEST_TEMPLATE/pull_request_template.md << 'EOF'
## Description
<!-- Describe the changes you've made -->

## Related Issue
<!-- Link to the related issue -->

## Type of Change
<!-- Mark the relevant option -->
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Other (please describe):

## Checklist
<!-- Mark the tasks you've completed -->
- [ ] I have updated the documentation accordingly
- [ ] I have added tests to cover my changes
- [ ] All new and existing tests passed
- [ ] My code follows the code style of this project
- [ ] I have checked for potential security issues
EOF

echo_success "Set up linting and code formatting"

# Create issue templates
mkdir -p .github/ISSUE_TEMPLATE
cat > .github/ISSUE_TEMPLATE/bug_report.md << 'EOF'
---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

## Describe the bug
<!-- A clear and concise description of what the bug is -->

## To Reproduce
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected behavior
<!-- A clear and concise description of what you expected to happen -->

## Screenshots
<!-- If applicable, add screenshots to help explain your problem -->

## Environment
- OS: [e.g. Ubuntu 22.04]
- Browser: [e.g. Chrome 112]
- Version: [e.g. v0.2.0]

## Additional context
<!-- Add any other context about the problem here -->
EOF

cat > .github/ISSUE_TEMPLATE/feature_request.md << 'EOF'
---
name: Feature request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Is your feature request related to a problem? Please describe.
<!-- A clear and concise description of what the problem is. Ex. I'm always frustrated when [...] -->

## Describe the solution you'd like
<!-- A clear and concise description of what you want to happen -->

## Describe alternatives you've considered
<!-- A clear and concise description of any alternative solutions or features you've considered -->

## Additional context
<!-- Add any other context or screenshots about the feature request here -->
EOF

echo_success "Created issue templates"

# Create a CONTRIBUTING.md file
cat > CONTRIBUTING.md << 'EOF'
# Contributing to KVD Auction Explorer

Thank you for considering contributing to KVD Auction Explorer! This document outlines the process for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct. Please be respectful and considerate of others.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Set up the development environment as described in the [Development Guide](docs/development/README.md)
4. Create a new branch for your changes

## Making Changes

1. Make sure to follow the coding style guidelines
2. Add tests for your changes
3. Run the test suite to ensure nothing breaks
4. Update documentation as necessary

## Pull Request Process

1. Push your changes to your fork
2. Submit a pull request to the main repository
3. Ensure the PR description clearly describes the changes and their purpose
4. Link any related issues
5. The PR will be reviewed by maintainers
6. Address any requested changes
7. Once approved, your changes will be merged

## Reporting Issues

When reporting issues, please include:

1. A clear and concise description of the issue
2. Steps to reproduce the behavior
3. Expected vs. actual behavior
4. Screenshots if applicable
5. Environment details (OS, browser, version)

## Feature Requests

When suggesting a feature:

1. Describe the problem you're trying to solve
2. Explain why this feature would be valuable
3. Outline how it might work
4. Indicate if you're willing to implement it yourself

Thank you for contributing!
EOF

echo_success "Created CONTRIBUTING.md"

# Create a CHANGELOG.md file
cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Repository reorganization for improved structure
- Enhanced documentation
- CI/CD pipeline with GitHub Actions
- Code style enforcement with EditorConfig
- Contribution guidelines
- Issue and PR templates

### Changed
- Improved configuration management
- Updated README with better organization
- Standardized project structure

## [0.2.0] - 2025-03-15

### Added
- Frontend visualization with multi-panel charts
- Interactive filters for data exploration
- AI-powered chat interface for queries
- Comprehensive data table with sorting and filtering

### Changed
- Enhanced scraper reliability
- Improved API performance with Redis caching
- Updated documentation

### Fixed
- Various bug fixes and performance improvements

## [0.1.0] - 2025-02-01

### Added
- Initial release
- Basic scraper functionality
- PostgreSQL database integration
- Simple API for data access
- Docker containerization
EOF

echo_success "Created CHANGELOG.md"

# Organizing test files
echo_status "Organizing test files..."

if [ -d "src/tests" ]; then
  # Create separate test directory structure while keeping original files in place
  mkdir -p tests/unit tests/integration tests/e2e
  
  # Create symlinks from new structure to original files
  if [ -d "src/tests/unit" ]; then
    ln -sf ../../src/tests/unit tests/unit/src
    echo_success "Created test symlinks for unit tests"
  fi
  
  if [ -d "src/tests/integration" ]; then
    ln -sf ../../src/tests/integration tests/integration/src
    echo_success "Created test symlinks for integration tests"
  fi
  
  if [ -d "src/tests/e2e" ]; then
    ln -sf ../../src/tests/e2e tests/e2e/src
    echo_success "Created test symlinks for e2e tests"
  fi
  
  # Copy conftest.py to new test root
  if [ -f "src/tests/conftest.py" ]; then
    cp src/tests/conftest.py tests/conftest.py
    echo_success "Copied conftest.py to new test root"
  fi
  
  echo_success "Organized test files"
fi

# Final success message
echo_status "Repository reorganization complete!"
echo "The script has reorganized your repository structure. Here's what was done:"
echo "1. Created a standardized directory structure"
echo "2. Organized Docker files"
echo "3. Set up configuration templates"
echo "4. Created utility scripts"
echo "5. Added comprehensive documentation"
echo "6. Set up linting and code style enforcement"
echo "7. Added CI/CD workflow configuration"
echo "8. Created issue and PR templates"
echo "9. Added contribution guidelines"
echo "10. Created a changelog"

echo_warning "You should review the changes to make sure everything looks good before committing."
echo_warning "You may need to update some imports if files were moved to new locations."

echo_success "Done! Your repository is now more professionally organized."