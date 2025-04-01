#!/bin/bash
set -e

# Set the model to download
MODEL=${OLLAMA_MODEL:-"llama3"}

echo "Initializing Ollama with model: $MODEL"

# Wait for Ollama to be ready
max_retries=30
retry_interval=10
retries=0

echo "Waiting for Ollama service to be ready..."
until curl -s -f http://ollama:11434/api/tags > /dev/null || [ $retries -eq $max_retries ]; do
    retries=$((retries+1))
    echo "Waiting for Ollama service (attempt $retries/$max_retries)..."
    sleep $retry_interval
done

if [ $retries -eq $max_retries ]; then
    echo "Error: Ollama service not available after $max_retries attempts"
    exit 1
fi

echo "Ollama service is ready."

# Check if the model is already pulled
if curl -s http://ollama:11434/api/tags | grep -q "$MODEL"; then
    echo "Model '$MODEL' is already available in Ollama."
else
    echo "Pulling model '$MODEL'..."
    curl -X POST http://ollama:11434/api/pull -d "{\"name\":\"$MODEL\"}"
    echo "Model '$MODEL' pulled successfully."
fi

echo "Model initialization completed."