#!/bin/bash
# migrate.sh - Runs database migrations

set -e

echo "Starting database migrations..."
docker compose exec blackbox bun run src/database/migrations.js
echo "Migrations complete."
