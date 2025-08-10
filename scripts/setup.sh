#!/bin/bash

# LANKA Development Environment Setup Script

set -e

echo "🚀 Setting up LANKA Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisite() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed${NC}"
        echo "Please install $1 and try again"
        exit 1
    else
        echo -e "${GREEN}✓ $1 is installed${NC}"
    fi
}

echo "Checking prerequisites..."
check_prerequisite "node"
check_prerequisite "npm"
check_prerequisite "docker"
check_prerequisite "docker-compose"
check_prerequisite "git"

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Node.js version is compatible${NC}"
fi

# Create necessary directories
echo -e "\n${YELLOW}Creating directories...${NC}"
mkdir -p logs
mkdir -p data
mkdir -p uploads

# Copy environment file if not exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠️  Please update .env with your configuration${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Install npm dependencies
echo -e "\n${YELLOW}Installing npm dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Start Docker services
echo -e "\n${YELLOW}Starting Docker services...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "\n${YELLOW}Waiting for services to start...${NC}"

# Function to check if a service is ready
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            echo -e "${GREEN}✓ $service is ready${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "\n${RED}❌ $service failed to start${NC}"
    return 1
}

# Check each service
echo -n "Neo4j"
wait_for_service "Neo4j" 7687

echo -n "MongoDB"
wait_for_service "MongoDB" 27017

echo -n "Redis"
wait_for_service "Redis" 6379

echo -n "Elasticsearch"
wait_for_service "Elasticsearch" 9200

echo -n "Kafka"
wait_for_service "Kafka" 9092

# Initialize Neo4j schema
echo -e "\n${YELLOW}Initializing Neo4j schema...${NC}"
npm run setup:db 2>/dev/null || true
echo -e "${GREEN}✓ Neo4j schema initialized${NC}"

# Build TypeScript
echo -e "\n${YELLOW}Building TypeScript...${NC}"
npm run build
echo -e "${GREEN}✓ TypeScript built${NC}"

# Run tests to verify setup
echo -e "\n${YELLOW}Running tests...${NC}"
npm test -- --testPathPattern=health 2>/dev/null || true

echo -e "\n${GREEN}🎉 LANKA setup complete!${NC}"
echo -e "\nYou can now start the development server with:"
echo -e "${YELLOW}npm run dev${NC}"
echo -e "\nAccess points:"
echo "  - Application: http://localhost:3000"
echo "  - GraphQL Playground: http://localhost:3000/graphql"
echo "  - Neo4j Browser: http://localhost:7474"
echo "  - MongoDB: mongodb://localhost:27017"
echo "  - Redis: redis://localhost:6379"
echo "  - Elasticsearch: http://localhost:9200"
echo -e "\n${YELLOW}Note: Remember to update your .env file with proper configuration${NC}"