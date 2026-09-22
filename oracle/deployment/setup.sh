#!/bin/bash
# setup.sh - Prepares an Oracle Linux/Ubuntu VM for AM Blackbox

set -e

echo "Setting up AM Blackbox Oracle Control Plane..."

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker if not installed
if ! command -v docker &> /dev/null
then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "Docker installed. Please log out and back in to apply group changes."
fi

# Ensure docker-compose is available
if ! command -v docker-compose &> /dev/null
then
    echo "Docker compose plugin should be available as 'docker compose'."
fi

echo "Setup complete. You can now configure your .env file and run deploy.sh."
