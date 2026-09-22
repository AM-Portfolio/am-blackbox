# AM Blackbox

AM Blackbox is an **Autonomous Infrastructure Observability & Incident Intelligence** engine. It acts as a "black box" flight recorder and automated doctor for your production infrastructure. 

Instead of humans sifting through logs and dashboards during an outage, AM Blackbox automatically detects problems, gathers all the evidence, diagnoses the root cause, and can even automatically recover the system (like restarting a pod) before alerting you on Zoho Cliq.

---

## 🏗️ How It Works (The Architecture)

Here is how the pieces connect together:

1. **Grafana Alloy (The Agent):** Runs on your servers, gathering raw telemetry (CPU, memory, logs) and ships it to Grafana Cloud.
2. **Grafana Cloud (The Warehouse):** Stores all the raw metrics and logs. When an anomaly is detected (like high CPU), it fires a webhook to AM Blackbox.
3. **AM Blackbox (The Brain):** The Node.js (Bun) server that processes the webhook. It has several engines:
   - **Incident Engine:** Converts the alert into a structured Incident ticket.
   - **Evidence Engine:** Reaches back out to Grafana Cloud and Kubernetes to grab the exact logs and metrics from the time of the crash.
   - **Pattern Engine:** Checks if this exact crash signature has happened before.
   - **Diagnosis Engine:** Uses deterministic rules to figure out *why* it crashed (e.g., "Memory Exhaustion").
   - **Policy & Recovery Engine:** Checks if it's allowed to fix the problem automatically. If yes, it talks to Kubernetes to restart the pod/deployment and verifies if the fix worked.
4. **Zoho Cliq (The Communicator):** Sends a rich notification card to your team summarizing the incident, the evidence, and what action was taken.
5. **PostgreSQL (The Memory):** Stores the structured incidents, problem patterns, and audit logs. It does *not* store massive raw logs (that stays in Grafana).
6. **MCP Server (The AI Interface):** Exposes all of Blackbox's intelligence so AI Agents can investigate incidents directly.

---

## 🐳 What is Running (The Pods)

AM Blackbox is designed to be fully portable. Local Docker Compose (Phase 1) runs three services:

1. **`am_blackbox_postgres` (PostgreSQL 15):** incidents, evidence metadata, patterns.
2. **`am_blackbox` (Bun API on :3000):** webhooks + engines (`GRAFANA_DISABLED` for local).
3. **`am_blackbox_web` (Django on :8000):** operator UI to verify the core flow.

---

## 📂 Folder Structure Guide

Here is a map of the folders we created and what they do. You can view this to get the entire idea of the codebase at one go!

### Core Application (`src/`)
- `src/server/` - The Express HTTP server and webhook listeners.
- `src/incidents/` - Logic for detecting and creating incidents from raw alerts.
- `src/evidence/` - Reaches out to external APIs (Loki/Prometheus) to gather proof.
- `src/patterns/` - Matches current crashes against historical data.
- `src/diagnosis/` - Evaluates the gathered evidence to conclude a root cause.
- `src/recovery/` - Executes typed, safe infrastructure actions (like `restartPod`).
- `src/policies/` - Security gates that decide if an automated action is allowed (e.g., Staging vs. Production rules).
- `src/mcp/` - The Model Context Protocol server that allows AI agents to read the data.
- `src/notifications/` - Zoho Cliq integration.
- `src/integrations/` - API clients for external systems (Grafana, Kubernetes, Zoho, Oracle Cloud).
- `src/database/` - Postgres connection pool and SQL migrations.

### Cloud & Infrastructure
- `web/` - Django operator UI (incidents, OOM offenders, VPS state).
- `alloy/` - Grafana Alloy host + Kubernetes DaemonSet configs (prod Contabo + Kind nonprod → one Grafana Cloud).
- `oracle/` - Oracle Cloud VPS deploy pack — later.
- `secrets/` - Local OCI API keys (gitignored). See `secrets/README.md`.
- `scripts/` - Day-2 ops scripts; `scripts/alloy/install.sh` for dual-env host Alloy.
- `scripts/oracle/check-account.js` - OCI Free Tier / Ampere capacity status (`npm run oracle:status`).

### Testing
- `test/` - Unit tests for the core engines (runs via `bun test`).

---

## Phase 1 — Local Docker + Django UI (core flow)

No Grafana and no Oracle required. Verify: manual webhook → incident in DB → visible in UI.

```bash
docker compose up --build
```

Services:
- API: http://localhost:3000/health
- UI: http://localhost:8000
- Postgres: internal only (`postgres:5432` on the compose network)

### Core-flow verify checklist

```bash
# 1. Health
curl -s http://localhost:3000/health

# 2. Fire a manual alert (creates incident + stub evidence)
curl -s -X POST http://localhost:3000/webhooks/manual \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"HighCPU\",\"severity\":\"critical\",\"environment\":\"local\",\"service\":\"demo-api\",\"pod\":\"demo-api-0\",\"node\":\"node-a\",\"description\":\"Phase 1 core-flow test\"}"

# 3. Open UI → list → click incident → confirm events + stub evidence
#    http://localhost:8000
#    http://localhost:8000/health/
```

Pass criteria: incident appears in the Django list with events and `stub`/`manual` evidence; no Grafana credentials needed.

---

## Dual-env logs + VPS root cause (OOM / out-of-state)

**Goal:** Know why Contabo/Kind is dead, which pods OOMKilled, and when the VPS is out of state — using **one Grafana Cloud**.

```text
Contabo host Alloy (environment=production) ──┐
Kind host Alloy (environment=nonprod)         ├──► Grafana Cloud (Loki + Prom)
K8s DaemonSet Alloy (prod + nonprod pods)   ──┘         │
                                                         ▼
                                              Blackbox diagnosis → Django UI
```

### 1. Host Alloy (Contabo prod + Kind host)

Export Grafana Cloud credentials (same as `oracle/.env.template`), then:

```bash
# Contabo prod
sudo AM_ENVIRONMENT=production bash scripts/alloy/install.sh

# Kind nonprod host
sudo AM_ENVIRONMENT=nonprod bash scripts/alloy/install.sh
```

Shared config: [`alloy/config.alloy`](alloy/config.alloy). Every series/log gets `environment=production|nonprod`.

### 2. Cluster Alloy (pod logs + kube events)

```bash
# Kind nonprod
kubectl --kubeconfig ../VPS/kubeconfigs/nonprod.yaml apply -f alloy/nonprod/k8s-alloy.daemonset.yaml
# (create monitoring ns + grafana-cloud secret first — see comments in the YAML)

# Contabo prod cluster
kubectl --kubeconfig ../VPS/kubeconfigs/prod.yaml apply -f alloy/production/k8s-alloy.daemonset.yaml
```

### 3. Blackbox (Grafana enabled)

Set `GRAFANA_DISABLED=false` and Grafana URL/token/datasource UIDs on the Blackbox service. Alerts must include label `environment=production|nonprod`.

Diagnosis cause codes:

| Code | Meaning |
|------|---------|
| `vps_unreachable` | Metrics/Alloy silent or kube API down — VPS likely dead |
| `oom_cascade` | Multiple OOMKilled pods + host/node memory pressure |
| `oom_killed` | Single pod OOMKilled |
| `host_memory_exhaustion` | MemoryPressure / NotReady / low MemAvailable |

### 4. Verify in UI

1. Grafana Explore: filter `environment="production"` and `environment="nonprod"`.
2. Fire webhook with `environment=production` (or wait for a real alert).
3. Open http://localhost:8000 — badges **OOM** / **VPS dead** / **VPS pressure**.
4. Incident detail → **OOM offenders** table + **VPS state**.
5. http://localhost:8000/health/ → VPS health summary (`GET /api/vps-health`).

---

## Oracle Cloud (next step)

After local core flow works, use OCI API keys to inspect Free Tier / Ampere capacity (`npm run oracle:status`). See [secrets/README.md](secrets/README.md). Deploy to Oracle VM later via `oracle/deployment/`.

---

## 🚀 Oracle / remote deploy (later)

This system is built to run instantly without complex setup. If you are a team member looking to deploy this to production (e.g., Oracle Cloud), follow these exact steps:

### 1. Provision & Clone
SSH into your Oracle Cloud VM (or any Linux server) and clone this repository:
```bash
git clone https://github.com/AM-Portfolio/am-blackbox.git
cd am-blackbox
```

### 2. Configure Environment Variables
We have prepared a template for you. Copy the template and add your secret API token:
```bash
cp oracle/.env.template oracle/.env
```
Open `oracle/.env` and replace `YOUR_GRAFANA_API_TOKEN` with your actual Grafana Cloud API Token. (The Prometheus and Loki URLs/Usernames are already pre-filled for you!)

### 3. Deploy the Control Plane
Run the setup and deployment scripts. This will automatically install Docker, build the Bun application, spin up the PostgreSQL database, and run all SQL migrations automatically.
```bash
sudo bash oracle/deployment/setup.sh
sudo bash oracle/deployment/deploy.sh
```

### 4. Connect Your Host Servers
To actually start shipping logs and metrics *to* the Blackbox, you need to install the Grafana Alloy agent on your production web servers.
SSH into your web servers and run:
```bash
sudo bash scripts/alloy/install.sh
```
This will automatically connect your servers to the Grafana endpoints we configured in step 2. You will instantly start seeing logs and metrics in your Grafana Dashboard!
