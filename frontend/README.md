# KVD Auction Explorer Frontend

This is the frontend for the KVD Auction Explorer application, which provides data visualization and AI-assisted analysis of used car auction data.

## Features

- Multi-panel scatter plot visualization of car prices vs. mileage by year
- Interactive filters for brands, years, price range, and mileage
- Comprehensive data table with sorting, filtering, and pagination
- AI chat assistant for answering questions about car valuations and market trends
- Responsive design for desktop, tablet, and mobile devices

## Tech Stack

- React 18
- TypeScript
- Material UI for component library
- Plotly.js for data visualization
- React Query for data fetching and caching
- Axios for API calls

## Project Structure

```
frontend/
├── src/               # Source code
│   ├── components/    # React components
│   ├── context/       # React context providers
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Page components
│   ├── services/      # API services
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   └── App.tsx        # Main application component
├── public/            # Static assets
└── package.json       # NPM package configuration
```

## Setup and Development

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Building for Production

Build the application for production:
```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Docker

The frontend can be built and run using Docker:

```bash
docker build -t kvd-auction-explorer-frontend -f Dockerfile.frontend .
docker run -p 80:80 kvd-auction-explorer-frontend
```

Or using docker-compose:

```bash
docker-compose up frontend
```

## API Integration

The frontend communicates with the backend API. In development mode, API requests are proxied to the backend using the `proxy` setting in `package.json`. In production, the Nginx configuration handles proxying requests to the API service.

## AI Chat Integration

The AI chat feature uses the backend API to send queries to a Llama LLM. In the current implementation, the chat uses predefined responses. In a production environment, this would be connected to a local Llama model that has access to the auction database.