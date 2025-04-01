# KVD Auction AI Assistant

This document describes the AI assistant integration for the KVD Auction Explorer application. The AI assistant provides users with natural language interactions to query the auction database and get insights about car values, trends, and market information.

## Architecture

The AI assistant consists of these main components:

1. **Ollama** - A lightweight container for running open-source LLMs locally
2. **AI Assistant Service** - A FastAPI service that connects the LLM to the database 
3. **API Proxy** - The main API service forwards chat requests to the AI service
4. **Frontend Chat Interface** - The existing Auction Assistant component in the frontend

```
Frontend → API → AI Assistant Service → Ollama LLM
                      ↓
                   Database
```

## Models

The system supports various open-source models through Ollama:

- **llama3** (default) - Meta's Llama 3 model (8B parameters, ~4GB VRAM required)
- **mistral** - Mistral AI's model (7B parameters, ~4GB VRAM required)
- **tinyllama** - A smaller model for limited resources (~1GB VRAM)

You can configure which model to use by setting the `OLLAMA_MODEL` environment variable.

## Hardware Requirements

Depending on the model you choose, the hardware requirements vary:

- **llama3/mistral**: Recommended 8GB+ VRAM GPU, 16GB+ RAM
- **tinyllama**: Recommended 2GB+ VRAM GPU, 8GB+ RAM
- **CPU-only mode**: Possible but will be significantly slower

## Setup

### Standard Setup (with GPU)

1. Ensure you have Docker and Docker Compose installed
2. Make sure your system has a compatible NVIDIA GPU with the latest drivers
3. Install NVIDIA Container Toolkit: `sudo apt-get install -y nvidia-container-toolkit`
4. Configure Docker to use the NVIDIA runtime: `sudo nvidia-container-runtime-hook -config-json-string '{"gpus":[{"capabilities":["compute","utility"]}]}'`
5. Create or update your `.env` file with appropriate settings
6. Run `docker-compose up -d`

### Setup for Limited Resources

For systems with limited resources or no GPU:

1. Run the setup script: `./setup-small-model.sh`
2. Start the system: `./start-small.sh`

## Usage

The AI assistant is integrated into the "Auction Assistant" chat interface in the frontend. Users can ask questions about car values, market trends, and auction statistics in natural language.

Example queries:

- "What's the average price of a Volvo XC60 from 2018?"
- "How does mileage affect the price of BMW X5 models?"
- "What are the most expensive car brands in the database?"
- "Show me the price trend for Audi A4 over the last few years"
- "Which car models hold their value best based on the auction data?"

## Customization

### Adding More Models

To add more models:

1. Update the `.env` file with your desired model: `OLLAMA_MODEL=yourmodel`
2. Restart the services: `docker-compose down && docker-compose up -d`

### Tuning Performance

For better performance, you can adjust these parameters:

1. In `src/ai/llm_service.py`, modify the Ollama parameters such as:
   - `temperature` - Controls randomness (lower = more deterministic)
   - `top_p` - Controls diversity (lower = more focused)
   - `top_k` - Controls vocabulary diversity

### Adding Features

To extend the AI capabilities:

1. Enhance the database queries in `src/ai/llm_service.py`
2. Add more domain-specific knowledge to the prompt templates
3. Implement more specialized functions for specific car-related questions

## Troubleshooting

### Common Issues

1. **AI service is unavailable**:
   - Check logs: `docker-compose logs ai-assistant`
   - Ensure Ollama is running: `docker-compose logs ollama`
   - Verify the model was downloaded successfully: `docker-compose logs model-init`

2. **Slow responses**:
   - CPU-only mode will be much slower than GPU mode
   - Try a smaller model by setting `OLLAMA_MODEL=tinyllama`
   - Increase the timeout in the API proxy

3. **Out of memory errors**:
   - Use a smaller model
   - Increase your swap space
   - Reduce other services running on the machine

### Logs

Check the AI service logs:

```bash
docker-compose logs -f ai-assistant
```

Check the Ollama model server logs:

```bash
docker-compose logs -f ollama
```

## Architecture Details

### AI Assistant Service

The AI Assistant service is a FastAPI application that:

1. Receives natural language queries from users
2. Uses LangChain to convert user questions to SQL queries when appropriate
3. Executes the SQL against the PostgreSQL database
4. Formats the results and sends them to the LLM for natural language response generation
5. Returns the response to the user

### Database Integration

The AI service connects to the PostgreSQL database using SQLAlchemy to fetch:

1. Schema information
2. Statistics about the car auction data
3. Execute dynamic SQL queries based on user questions

This allows the AI to provide real-time insights based on the current database state without requiring pre-training on the specific data.

## Security Considerations

The AI assistant:

- Runs entirely within your own infrastructure
- Does not send any data to external services
- Has access only to the data in your PostgreSQL database
- Uses parameterized queries to prevent SQL injection

However, as with any AI system, you should monitor for:

- Potential over-generation of sensitive information
- Resource usage
- Appropriate user access controls

## License

The AI integration uses open-source components, each with their own licenses:

- Ollama: MIT License
- LangChain: MIT License
- FastAPI: MIT License
- Open-source LLM models: Various licenses (check the specific model documentation)