# Nonprod (Kind) Alloy

## Host agent (Kind machine)

```bash
export GRAFANA_API_TOKEN=...
export GRAFANA_PROMETHEUS_URL=...
export GRAFANA_PROMETHEUS_USERNAME=...
export GRAFANA_LOKI_URL=...
export GRAFANA_LOKI_USERNAME=...

sudo AM_ENVIRONMENT=nonprod bash scripts/alloy/install.sh
```

Uses shared [`../config.alloy`](../config.alloy).

## Pod logs + kube events (DaemonSet)

```bash
kubectl --kubeconfig ../../../VPS/kubeconfigs/nonprod.yaml create namespace monitoring --dry-run=client -o yaml \
  | kubectl --kubeconfig ../../../VPS/kubeconfigs/nonprod.yaml apply -f -

kubectl --kubeconfig ../../../VPS/kubeconfigs/nonprod.yaml -n monitoring create secret generic grafana-cloud \
  --from-literal=token="$GRAFANA_API_TOKEN" \
  --from-literal=loki-user="$GRAFANA_LOKI_USERNAME" \
  --from-literal=loki-url="$GRAFANA_LOKI_URL" \
  --dry-run=client -o yaml \
  | kubectl --kubeconfig ../../../VPS/kubeconfigs/nonprod.yaml apply -f -

kubectl --kubeconfig ../../../VPS/kubeconfigs/nonprod.yaml apply -f k8s-alloy.daemonset.yaml
```

All lines labeled `environment=nonprod` for Blackbox evidence filtering.
