#!/bin/bash
echo "Fixing analytics and logging..."

curl -s -X PUT http://localhost:8500/v1/agent/service/deregister/analytics-1
curl -s -X PUT http://localhost:8500/v1/agent/service/deregister/logging-1

sleep 2

curl -s -X PUT http://localhost:8500/v1/agent/service/register -d '{
  "Name": "analytics",
  "ID": "analytics-1",
  "Port": 9090,
  "Address": "service-analytics",
  "Check": {
    "HTTP": "http://service-analytics:9090/health",
    "Interval": "10s"
  }
}' http://localhost:8500

curl -s -X PUT http://localhost:8500/v1/agent/service/register -d '{
  "Name": "logging",
  "ID": "logging-1",
  "Port": 9090,
  "Address": "service-logging",
  "Check": {
    "HTTP": "http://service-logging:9090/health",
    "Interval": "10s"
  }
}' http://localhost:8500

echo "✅ Services fixed"