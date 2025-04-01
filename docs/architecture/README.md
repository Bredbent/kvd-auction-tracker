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
