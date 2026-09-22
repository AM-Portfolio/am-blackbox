#!/bin/bash
# install.sh — Install Grafana Alloy on Contabo prod or Kind nonprod host.
# Usage:
#   sudo AM_ENVIRONMENT=production bash scripts/alloy/install.sh
#   sudo AM_ENVIRONMENT=nonprod bash scripts/alloy/install.sh
#
# Optional: source a secrets file first, or export:
#   GRAFANA_API_TOKEN, GRAFANA_PROMETHEUS_URL, GRAFANA_PROMETHEUS_USERNAME,
#   GRAFANA_LOKI_URL, GRAFANA_LOKI_USERNAME

set -euo pipefail

AM_ENVIRONMENT="${AM_ENVIRONMENT:-}"
if [[ -z "$AM_ENVIRONMENT" ]]; then
  echo "Error: AM_ENVIRONMENT must be set to 'production' or 'nonprod'"
  exit 1
fi
if [[ "$AM_ENVIRONMENT" != "production" && "$AM_ENVIRONMENT" != "nonprod" ]]; then
  echo "Error: AM_ENVIRONMENT must be 'production' or 'nonprod' (got: $AM_ENVIRONMENT)"
  exit 1
fi

for v in GRAFANA_API_TOKEN GRAFANA_PROMETHEUS_URL GRAFANA_PROMETHEUS_USERNAME GRAFANA_LOKI_URL GRAFANA_LOKI_USERNAME; do
  if [[ -z "${!v:-}" ]]; then
    echo "Error: $v is not set. Export Grafana Cloud credentials before installing."
    exit 1
  fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_SRC="$REPO_ROOT/alloy/config.alloy"

if [[ ! -f "$CONFIG_SRC" ]]; then
  echo "Error: config not found at $CONFIG_SRC"
  exit 1
fi

echo "Installing Grafana Alloy for AM_ENVIRONMENT=$AM_ENVIRONMENT ..."

if ! command -v alloy >/dev/null 2>&1; then
  curl -fsSL https://apt.grafana.com/gpg.key | gpg --dearmor -o /etc/apt/keyrings/grafana.gpg
  echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" \
    | tee /etc/apt/sources.list.d/grafana.list
  apt-get update
  apt-get install -y alloy
fi

mkdir -p /etc/alloy

cp "$CONFIG_SRC" /etc/alloy/config.alloy

cat >/etc/alloy/env <<EOF
AM_ENVIRONMENT=${AM_ENVIRONMENT}
HOSTNAME=$(hostname -f 2>/dev/null || hostname)
GRAFANA_API_TOKEN=${GRAFANA_API_TOKEN}
GRAFANA_PROMETHEUS_URL=${GRAFANA_PROMETHEUS_URL}
GRAFANA_PROMETHEUS_USERNAME=${GRAFANA_PROMETHEUS_USERNAME}
GRAFANA_LOKI_URL=${GRAFANA_LOKI_URL}
GRAFANA_LOKI_USERNAME=${GRAFANA_LOKI_USERNAME}
EOF
chmod 600 /etc/alloy/env

mkdir -p /etc/systemd/system/alloy.service.d
cat >/etc/systemd/system/alloy.service.d/am-blackbox.conf <<'EOF'
[Service]
EnvironmentFile=/etc/alloy/env
EOF

systemctl daemon-reload
systemctl enable alloy
systemctl restart alloy

echo "Alloy installed. Check: systemctl status alloy"
echo "In Grafana Explore, filter logs/metrics with environment=${AM_ENVIRONMENT}"
