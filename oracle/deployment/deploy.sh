#!/bin/bash
# deploy.sh - Deploys AM Blackbox to Oracle Cloud VM

set -e

if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one with DB_PASSWORD, GRAFANA_API_TOKEN, etc."
  exit 1
fi

echo "Deploying AM Blackbox..."
docker compose pull
docker compose up -d

echo "Deployment successful."
docker compose ps
