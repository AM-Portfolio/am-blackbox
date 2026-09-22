#!/bin/bash
# system-check.sh - Quick health check for AM Blackbox services

echo "--- AM Blackbox System Check ---"

echo "1. Checking Docker Containers:"
docker ps --filter "name=am_blackbox" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "2. Checking Application Health Endpoint:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "Failed")
if [ "$HTTP_STATUS" = "200" ]; then
  echo "Health API: OK (200)"
else
  echo "Health API: ERROR ($HTTP_STATUS)"
fi
echo ""

echo "3. Checking Database Connectivity:"
if docker exec am_blackbox_postgres pg_isready -U blackbox_user -d am_blackbox > /dev/null 2>&1; then
  echo "PostgreSQL: OK (Accepting connections)"
else
  echo "PostgreSQL: ERROR (Not accepting connections)"
fi
echo ""

echo "System Check Complete."
