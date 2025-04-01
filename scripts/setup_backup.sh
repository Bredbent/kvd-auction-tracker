services:
  # Database
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-kvd_user}
      - POSTGRES_PASSWORD=devpassword123
      - POSTGRES_DB=${POSTGRES_DB:-kvd_auctions}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    platform: linux/arm64
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-kvd_user} -d ${POSTGRES_DB:-kvd_auctions}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - kvd_network

  # Redis for caching
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --requirepass ${REDIS_PASSWORD:-devredis123}
    networks:
      - kvd_network

  # Database initialization
  init-db:
    build:
      context: .
      dockerfile: Dockerfile.scraper
    command: python -m src.utils.init_db
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-kvd_user}
      - POSTGRES_PASSWORD=devpassword123
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=${POSTGRES_DB:-kvd_auctions}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - kvd_network

  # Scraper service - runs immediately and then hourly
  scraper:
    build:
      context: .
      dockerfile: Dockerfile.scraper
    command: python -m src.scraper.scraper_service immediate
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-kvd_user}
      - POSTGRES_PASSWORD=devpassword123
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=${POSTGRES_DB:-kvd_auctions}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD:-devredis123}
    volumes:
      - ./logs:/app/logs
      - ./src/scraper:/app/src/scraper
    depends_on:
      init-db:
        condition: service_completed_successfully
    networks:
      - kvd_network

  # One-time scraper - runs once and exits
  scraper-once:
    build:
      context: .
      dockerfile: Dockerfile.scraper
    command: python -m src.scraper.scraper_service once
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-kvd_user}
      - POSTGRES_PASSWORD=devpassword123
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=${POSTGRES_DB:-kvd_auctions}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD:-devredis123}
    volumes:
      - ./logs:/app/logs
    depends_on:
      init-db:
        condition: service_completed_successfully
    networks:
      - kvd_network
    profiles:
      - utils

  # API service
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "8000:8000"
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-kvd_user}
      - POSTGRES_PASSWORD=devpassword123
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=${POSTGRES_DB:-kvd_auctions}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD:-devredis123}
      - SECRET_KEY=${SECRET_KEY:-change_me_in_production}
      - BACKEND_CORS_ORIGINS=${BACKEND_CORS_ORIGINS:-["http://localhost:3000","http://localhost:80"]}
    depends_on:
      - postgres
      - redis
    networks:
      - kvd_network
      
  # Frontend service
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - api
    networks:
      - kvd_network

volumes:
  postgres_data:
  redis_data:

networks:
  kvd_network:
    driver: bridge
  