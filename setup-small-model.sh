#!/bin/bash
set -e

# This script sets up the environment to use a smaller, more resource-efficient model

echo "Setting up a smaller AI model for systems with limited resources..."

# Create or update .env file with smaller model config
if [ -f .env ]; then
    # Update existing .env file
    grep -v "OLLAMA_MODEL" .env > .env.tmp
    echo "OLLAMA_MODEL=tinyllama" >> .env.tmp
    mv .env.tmp .env
    echo "Updated .env file to use tinyllama model"
else
    # Create new .env file from example
    if [ -f .env.example ]; then
        cp .env.example .env
        sed -i 's/OLLAMA_MODEL=llama3/OLLAMA_MODEL=tinyllama/g' .env
        echo "Created .env file from example with tinyllama model"
    else
        echo "OLLAMA_MODEL=tinyllama" > .env
        echo "Created new .env file with tinyllama model"
    fi
fi

# Optional: Create a version of docker-compose with reduced resource requirements
cp docker-compose.yml docker-compose.small.yml

# Remove GPU requirements for limited resource environments
sed -i '/deploy:/,/capabilities: \[gpu\]/d' docker-compose.small.yml

echo "Created docker-compose.small.yml with reduced resource requirements"

# Create a script to start with the small configuration
cat > start-small.sh << 'EOF'
#!/bin/bash
set -e

echo "Starting KVD Auction Explorer with small model configuration..."
docker-compose -f docker-compose.small.yml up -d

echo "System is starting up. You can view logs with:"
echo "docker-compose -f docker-compose.small.yml logs -f"
EOF

chmod +x start-small.sh

echo "Setup complete. To start the system with the small model configuration, run:"
echo "./start-small.sh"