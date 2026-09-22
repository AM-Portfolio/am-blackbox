#!/bin/bash
# install.sh - Installs Grafana Alloy

set -e

echo "Installing Grafana Alloy..."
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://apt.grafana.com/gpg.key | sudo gpg --dearmor --batch --yes -o /etc/apt/keyrings/grafana.gpg
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt-get update
sudo apt --fix-broken install -y
sudo apt-get install -y alloy

echo "Installing AM Blackbox configuration..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
sudo cp "$SCRIPT_DIR/../../alloy/production/config.alloy" /etc/alloy/config.alloy

echo "Configuring environment variables..."
if [ -f "$SCRIPT_DIR/../../.env" ]; then
    # Extract just the Grafana variables and append them to the Alloy default file
    grep GRAFANA "$SCRIPT_DIR/../../.env" | sudo tee -a /etc/default/alloy
fi

sudo systemctl restart alloy
sudo systemctl enable alloy

echo "Alloy installation complete!"
