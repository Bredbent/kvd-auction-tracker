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
