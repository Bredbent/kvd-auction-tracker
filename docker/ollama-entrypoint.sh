#!/bin/sh
set -e

# Set the model to download
MODEL=${OLLAMA_MODEL:-"llama3"}

echo "Starting Ollama server..."
ollama serve &
SERVER_PID=$!

# Wait for Ollama to be ready
echo "Waiting for Ollama service to start..."
until curl -s --retry 30 --retry-delay 1 --retry-connrefused http://localhost:11434/api/tags > /dev/null
do
  echo "Waiting for Ollama API to become available..."
  sleep 2
done

echo "Ollama is running. Checking for model: $MODEL"

# Check if model exists, pull if not
if ! ollama list | grep -q "$MODEL"; then
  echo "Pulling model: $MODEL..."
  ollama pull $MODEL
  echo "Model pulled successfully."
else
  echo "Model $MODEL already exists."
fi

# Keep the server running
echo "Ollama is ready with model: $MODEL"
wait $SERVER_PID