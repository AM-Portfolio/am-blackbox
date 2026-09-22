#!/bin/bash
# install.sh - Installs Grafana Alloy

set -e

echo "Installing Grafana Alloy..."
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://apt.grafana.com/gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/grafana.gpg
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt-get update
sudo apt --fix-broken install -y
sudo apt-get install -y alloy

echo "Installing AM Blackbox configuration..."
sudo cp ../../alloy/production/config.alloy /etc/alloy/config.alloy
sudo systemctl restart alloy
sudo systemctl enable alloy

echo "Alloy installation complete!"
