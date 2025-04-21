#!/bin/bash

echo "Setting up Consul MCP Server demo environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker and Docker Compose first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
DEMO_DIR="$SCRIPT_DIR/../demo"

if [ ! -d "$DEMO_DIR" ]; then
    echo "Demo directory not found. Creating it..."
    mkdir -p "$DEMO_DIR"
fi

cd "$DEMO_DIR" || exit 1

echo "Starting Consul and demo services..."
docker-compose up -d

echo "Waiting for Consul to be ready..."
timeout=30
elapsed=0
while ! curl -s http://localhost:8500/v1/status/leader > /dev/null; do
    sleep 1
    elapsed=$((elapsed+1))
    if [ "$elapsed" -ge "$timeout" ]; then
        echo "Timed out waiting for Consul to start"
        exit 1
    fi
done

echo "Consul is ready!"
echo ""
echo "You can access the Consul UI at: http://localhost:8500"
echo "You can access the Frontend service at: http://localhost:9090"
echo ""
echo "To start the MCP server, run:"
echo "npm start"
echo ""
echo "To clean up the demo environment when you're done, run:"
echo "cd $DEMO_DIR && docker-compose down"
echo ""
echo "Example prompts for Claude:"
echo "1. 'Show me all services registered in Consul'"
echo "2. 'Which services have failing health checks?'"
echo "3. 'Create a diagram of my service mesh connections'"
echo "4. 'Analyze which services are having connectivity issues'"
echo "5. 'What's the overall health of my microservices architecture?'"