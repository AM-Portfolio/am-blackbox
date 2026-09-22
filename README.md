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

AM Blackbox is designed to be fully portable. We have bundled it using Docker Compose so it runs perfectly on your local machine and on the Oracle Cloud VPS.

When you run `docker compose up -d`, it spins up exactly two containers (pods):

1. **`am_blackbox_postgres` (PostgreSQL 15):** The dedicated database that stores all incidents, evidence metadata, and problem signatures. 
2. **`am_blackbox` (The Node/Bun Server):** The actual application running on the blazing-fast Bun runtime. It exposes the API on port 3000, runs the automated background workers, and hosts the MCP server.

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
- `src/integrations/` - API clients for external systems (Grafana, Kubernetes, Zoho).
- `src/database/` - Postgres connection pool and SQL migrations.

### Cloud & Infrastructure
- `alloy/` - Configuration files for Grafana Alloy (the host agent).
- `oracle/` - The Docker Compose and deployment scripts specifically tailored for the Oracle Cloud production VPS.
- `scripts/` - Day-2 Operational bash scripts for backups, database migrations, rollbacks, and health checks.

### Testing
- `test/` - Unit tests for the core engines (runs via `bun test`).

---

## 🚀 How It Was Set Up (Quickstart)

This system is built to run instantly without complex setup.

1. **Environment Variables:** We created a `.env` file containing your `GRAFANA_API_TOKEN`, Postgres passwords, and MCP credentials.
2. **Docker Compose:** We ran `docker compose up --build -d`.
3. **Database Migrations:** Upon booting, the Bun server automatically ran the SQL files inside `src/database/migrations/` to construct the necessary tables for incidents and evidence.
4. **Mock Testing:** We simulated a Grafana webhook pointing to `http://localhost:3000/webhooks/grafana`, which successfully triggered the entire pipeline end-to-end.

To deploy this to production, you will simply provision an Oracle VM and run the scripts located inside `oracle/deployment/`.
