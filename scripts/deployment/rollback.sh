#!/bin/bash
# rollback.sh - Rolls back AM Blackbox to a previous image

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <image_tag>"
  echo "Example: $0 v1.0.3"
  exit 1
fi

TAG=$1

echo "Rolling back AM Blackbox to version $TAG..."
sed -i "s/image: am-blackbox:.*/image: am-blackbox:$TAG/g" oracle/docker-compose.yml

docker compose -f oracle/docker-compose.yml up -d
echo "Rollback initiated. Check system-check.sh for health."
