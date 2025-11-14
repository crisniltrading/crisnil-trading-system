#!/bin/bash

# CRIS-SYSTEM Backend Server Startup Script (Unix/Linux/Mac)
# This script starts the backend server with proper environment setup

echo "========================================"
echo "  CRIS-SYSTEM Backend Server Manager"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Backend directory not found: $BACKEND_DIR${NC}"
    exit 1
fi

cd "$BACKEND_DIR"
echo -e "${BLUE}📁 Working directory: $(pwd)${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found. Are you in the correct directory?${NC}"
    exit 1
fi

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}⚠️  .env file not found. Copying from .env.example${NC}"
        cp .env.example .env
    else
        echo -e "${YELLOW}⚠️  No .env file found. Server will use default settings.${NC}"
    fi
fi

# Set environment to development if not specified
export NODE_ENV=${NODE_ENV:-development}

echo -e "${GREEN}🚀 Starting server in $NODE_ENV mode...${NC}"
echo -e "${BLUE}💡 Press Ctrl+C to stop the server${NC}"
echo ""

# Function to handle cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down server...${NC}"
    exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Start the server with restart on crash
while true; do
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] Starting/Restarting server...${NC}"
    node server.js
    echo ""
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] Server stopped. Restarting in 5 seconds...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit or wait for auto-restart${NC}"
    sleep 5
done
