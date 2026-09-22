# AM Blackbox — Antigravity Autonomous Implementation Specification

## 0. Purpose

You are implementing **AM Blackbox**, an infrastructure observability, incident intelligence, investigation, and later controlled-remediation platform for the AM portfolio-management ecosystem.

The project is intentionally designed like an aircraft black box:

- telemetry is collected continuously from production and pre-production VPSs;
- telemetry survives a VPS crash because it is sent to an external Grafana Cloud instance;
- incidents are converted into structured records;
- evidence before/during/after an incident is correlated;
- recurring incidents can be detected from historical records;
- an MCP interface will allow an AI/client to investigate incidents without manually opening Grafana;
- Zoho Cliq will receive incident notifications and, later, controlled recovery actions;
- recovery actions must pass through AM Blackbox policy/audit controls;
- AI-assisted diagnosis comes before autonomous remediation.

Do not turn this into a generic monitoring dashboard project. The core product is **incident evidence + historical correlation + controlled operations**.

---

# 1. Non-negotiable engineering principles

1. **Do not ask the user for implementation guidance unless a genuinely blocking ambiguity exists.**
2. Make reasonable engineering decisions from this specification and document them.
3. Keep the project runnable at every stage.
4. Prefer small, composable modules over a giant file.
5. Keep raw telemetry out of PostgreSQL.
6. Grafana Cloud is the raw telemetry/query backend.
7. PostgreSQL stores structured incidents, evidence references, patterns, recovery actions, and audit history.
8. AM Blackbox is the control plane between external alerts/users and infrastructure actions.
9. Never let Zoho Cliq directly execute Kubernetes or VPS operations.
10. MCP must be read-only initially, even if recovery tooling is scaffolded.
11. Never expose arbitrary `kubectl`, shell, or VPS restart commands through an API.
12. Never commit secrets.
13. All infrastructure integrations must be replaceable through adapter/client modules.
14. The application must be Docker-portable.
15. Host-level telemetry collection must not depend exclusively on Kubernetes.
16. Use **suspected cause** and **confirmed cause** as separate concepts.
17. Do not claim a root cause merely because two events occurred close together.
18. Production recovery must eventually require explicit policy validation and stronger approval than pre-production.
19. Prefer Kubernetes-native safe actions such as rollout restart/rollback over arbitrary container manipulation.
20. Do not build premature AI/ML logic. First make telemetry, incidents, evidence, and history reliable.

---

# 2. Technology decisions

Use:

- JavaScript
- ES Modules
- Bun runtime/package manager
- Express.js
- PostgreSQL
- Docker
- Docker Compose
- Grafana Cloud
- Grafana Alloy
- Kubernetes API
- Zoho Cliq integration
- MCP-compatible server/tool layer

Do NOT use Java/Spring Boot for AM Blackbox.

Python is intentionally not required for the first implementation. It may be introduced later for AI/ML-specific components if there is a concrete need.

Use environment variables for configuration.

The project should use `"type": "module"`.

---

# 3. Repository structure

Implement the following repository structure. Keep the logical modules in one application initially. Do NOT create one container per folder/module.

```text
am-blackbox/
│
├── README.md
├── LICENSE
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .gitignore
├── .env.example
├── package.json
├── bun.lock
│
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   ├── incident-lifecycle.md
│   ├── recovery-policies.md
│   ├── security.md
│   └── troubleshooting.md
│
├── src/
│   ├── server/
│   │   ├── index.js
│   │   ├── app.js
│   │   └── routes.js
│   │
│   ├── config/
│   │   ├── index.js
│   │   ├── database.js
│   │   ├── grafana.js
│   │   ├── kubernetes.js
│   │   ├── zoho.js
│   │   └── oracle.js
│   │
│   ├── health/
│   │   ├── health.service.js
│   │   ├── vps.health.js
│   │   ├── kubernetes.health.js
│   │   └── dependencies.health.js
│   │
│   ├── watchdog/
│   │   ├── watchdog.service.js
│   │   ├── heartbeat.service.js
│   │   └── health-check.service.js
│   │
│   ├── incidents/
│   │   ├── incident.service.js
│   │   ├── incident.detector.js
│   │   ├── incident.correlator.js
│   │   ├── incident.timeline.js
│   │   └── incident.repository.js
│   │
│   ├── evidence/
│   │   ├── evidence.service.js
│   │   ├── metrics.service.js
│   │   ├── logs.service.js
│   │   ├── traces.service.js
│   │   ├── kubernetes-events.service.js
│   │   └── evidence-correlator.js
│   │
│   ├── patterns/
│   │   ├── pattern.service.js
│   │   ├── pattern.detector.js
│   │   ├── pattern.matcher.js
│   │   └── pattern.repository.js
│   │
│   ├── diagnosis/
│   │   ├── diagnosis.service.js
│   │   ├── diagnosis.engine.js
│   │   └── diagnosis.repository.js
│   │
│   ├── mcp/
│   │   ├── server.js
│   │   ├── tools/
│   │   │   ├── incidents.tool.js
│   │   │   ├── metrics.tool.js
│   │   │   ├── logs.tool.js
│   │   │   ├── traces.tool.js
│   │   │   ├── kubernetes.tool.js
│   │   │   ├── diagnosis.tool.js
│   │   │   ├── patterns.tool.js
│   │   │   └── recovery.tool.js
│   │   └── resources/
│   │       ├── incident.resource.js
│   │       ├── service.resource.js
│   │       └── infrastructure.resource.js
│   │
│   ├── recovery/
│   │   ├── recovery.service.js
│   │   ├── recovery.executor.js
│   │   ├── recovery.validator.js
│   │   ├── recovery.audit.js
│   │   ├── actions/
│   │   │   ├── restart-pod.action.js
│   │   │   ├── restart-deployment.action.js
│   │   │   ├── scale-zero.action.js
│   │   │   ├── rollback.action.js
│   │   │   └── restart-vps.action.js
│   │   └── providers/
│   │       ├── kubernetes.provider.js
│   │       └── vps.provider.js
│   │
│   ├── policies/
│   │   ├── policy.service.js
│   │   ├── policy.engine.js
│   │   └── policies.js
│   │
│   ├── notifications/
│   │   ├── notification.service.js
│   │   ├── zoho-cliq.service.js
│   │   └── templates/
│   │       ├── incident-alert.template.js
│   │       ├── recovery-alert.template.js
│   │       └── resolution-alert.template.js
│   │
│   ├── integrations/
│   │   ├── grafana/
│   │   │   ├── grafana.client.js
│   │   │   ├── grafana.alerts.js
│   │   │   ├── grafana.metrics.js
│   │   │   ├── grafana.logs.js
│   │   │   └── grafana.traces.js
│   │   ├── kubernetes/
│   │   │   ├── kubernetes.client.js
│   │   │   ├── pods.js
│   │   │   ├── deployments.js
│   │   │   ├── nodes.js
│   │   │   └── events.js
│   │   └── zoho/
│   │       └── cliq.client.js
│   │
│   ├── database/
│   │   ├── client.js
│   │   ├── migrations.js
│   │   └── repositories/
│   │       ├── incident.repository.js
│   │       ├── pattern.repository.js
│   │       └── audit.repository.js
│   │
│   └── utils/
│       ├── logger.js
│       ├── errors.js
│       ├── retry.js
│       ├── time.js
│       └── validation.js
│
├── database/
│   ├── migrations/
│   │   ├── 001_create_incidents.sql
│   │   ├── 002_create_incident_events.sql
│   │   ├── 003_create_problem_patterns.sql
│   │   ├── 004_create_evidence.sql
│   │   ├── 005_create_recovery_actions.sql
│   │   └── 006_create_action_audit.sql
│   ├── seeds/
│   │   └── .gitkeep
│   └── README.md
│
├── alloy/
│   ├── production/
│   │   ├── config.alloy
│   │   └── README.md
│   └── preproduction/
│       ├── config.alloy
│       └── README.md
│
├── grafana/
│   ├── dashboards/
│   │   ├── infrastructure.json
│   │   ├── kubernetes.json
│   │   ├── services.json
│   │   ├── incidents.json
│   │   └── README.md
│   ├── alerts/
│   │   ├── infrastructure/
│   │   │   ├── cpu.yaml
│   │   │   ├── memory.yaml
│   │   │   ├── disk.yaml
│   │   │   ├── network.yaml
│   │   │   └── node.yaml
│   │   ├── kubernetes/
│   │   │   ├── oom.yaml
│   │   │   ├── crashloop.yaml
│   │   │   ├── pod-restart.yaml
│   │   │   ├── node-pressure.yaml
│   │   │   └── node-not-ready.yaml
│   │   └── services/
│   │       ├── service-down.yaml
│   │       └── high-error-rate.yaml
│   └── README.md
│
├── oracle/
│   ├── docker-compose.yml
│   ├── README.md
│   ├── deployment/
│   │   ├── setup.sh
│   │   ├── deploy.sh
│   │   └── update.sh
│   └── config/
│       └── .gitkeep
│
├── scripts/
│   ├── alloy/
│   │   ├── install.sh
│   │   ├── uninstall.sh
│   │   └── update.sh
│   ├── deployment/
│   │   ├── deploy.sh
│   │   ├── update.sh
│   │   └── rollback.sh
│   ├── database/
│   │   ├── migrate.sh
│   │   ├── backup.sh
│   │   └── restore.sh
│   └── health/
│       └── system-check.sh
│
└── tests/
    ├── unit/
    │   ├── health/
    │   ├── incidents/
    │   ├── diagnosis/
    │   ├── patterns/
    │   └── recovery/
    ├── integration/
    │   ├── grafana/
    │   ├── kubernetes/
    │   ├── database/
    │   └── notifications/
    └── mcp/
        └── tools/
```

---

# 4. Important architecture clarification

The folder structure is a logical architecture, not a requirement to create many services or containers.

Initially:

```text
One AM Blackbox application
        |
        +-- health
        +-- watchdog
        +-- incidents
        +-- evidence
        +-- patterns
        +-- diagnosis
        +-- MCP
        +-- recovery
        +-- policies
        +-- notifications
        +-- integrations
        +-- database
```

Docker should package the control-plane application as a whole.

PostgreSQL is a separate container/service.

Grafana Cloud is external.

Grafana Alloy is installed on the monitored VPS hosts and should not depend exclusively on the Kubernetes cluster being healthy.

---

# 5. File-by-file responsibility

## Root files

### README.md
Explain:
- what AM Blackbox is;
- why it exists;
- architecture;
- major components;
- local development;
- deployment overview;
- security model;
- future roadmap.

Do not turn README into an implementation dump.

### LICENSE
Use the project's selected license. If no license has been explicitly selected, leave a clearly documented placeholder rather than inventing licensing terms.

### Dockerfile
Build the AM Blackbox application image.

Requirements:
- use an appropriate Bun base image;
- install production dependencies;
- copy application source;
- expose the configured HTTP port;
- start the server;
- do not bake secrets into the image.

### docker-compose.yml
Local development stack.

Initially include:
- `blackbox`
- `postgres`

Use health checks where useful.

Do not include Grafana Cloud as a local container.

### .dockerignore
Exclude:
- `.git`
- `node_modules`
- local env files/secrets
- logs
- test artifacts
- editor files
- temporary files.

### .gitignore
Exclude:
- `.env`
- local secrets
- logs
- `node_modules`
- build artifacts
- OS/editor files
- database dumps unless explicitly intended.

### .env.example
Document every required configuration variable with safe placeholder values.

Include categories for:
- application;
- PostgreSQL;
- Grafana;
- Kubernetes;
- Zoho;
- environment/provider;
- security/authentication;
- logging.

Never place real credentials here.

### package.json
Define:
- package metadata;
- `"type": "module"`;
- runtime dependencies;
- development dependencies;
- scripts for dev/start/test/lint if used.

Keep dependencies minimal.

### bun.lock
Generated by Bun. Keep synchronized with `package.json`. Do not manually invent lockfile contents.

---

# 6. Documentation files

### docs/architecture.md
Document:
- overall architecture;
- data flows;
- Grafana Cloud role;
- Alloy role;
- PostgreSQL role;
- Oracle control-plane role;
- MCP role;
- Zoho role;
- recovery flow;
- future AI flow.

### docs/deployment.md
Document:
- local deployment;
- VPS telemetry deployment;
- Oracle deployment;
- environment variables;
- update/rollback process.

### docs/incident-lifecycle.md
Define:

```text
Signal
→ Detection
→ Incident creation
→ Evidence collection
→ Correlation
→ Diagnosis
→ Notification
→ Optional recovery
→ Verification
→ Resolution
→ Historical pattern analysis
```

Define incident states and transitions.

### docs/recovery-policies.md
Define safe recovery rules.

Example policy concepts:
- pre-production may permit automated restart for selected failures;
- production restart requires policy validation;
- destructive/high-impact actions require stronger approval;
- repeated automatic retries must have limits;
- every action must be auditable.

### docs/security.md
Document:
- secrets;
- authentication;
- authorization;
- least privilege;
- action tokens;
- MCP exposure;
- Kubernetes credentials;
- provider credentials;
- audit logging;
- network exposure.

### docs/troubleshooting.md
Document common operational failures and how AM Blackbox itself is diagnosed.

---

# 7. Server layer

### src/server/index.js
Application entrypoint.

Responsibilities:
- load configuration;
- initialize dependencies;
- create/start Express application;
- handle graceful shutdown;
- start required background processes only when configured.

Do not put business logic here.

### src/server/app.js
Create and configure the Express app:
- middleware;
- request IDs;
- structured logging;
- error handling;
- health endpoints;
- routes.

### src/server/routes.js
Register HTTP routes.

At minimum design routes for:
- health;
- readiness;
- incidents;
- alerts/webhooks;
- investigation;
- recovery/action endpoints where appropriate.

Do not expose arbitrary infrastructure commands.

---

# 8. Configuration

### src/config/index.js
Central configuration loader and validation.

Fail fast for required production configuration.

### src/config/database.js
PostgreSQL connection configuration.

### src/config/grafana.js
Grafana Cloud URL, credentials/tokens, datasource configuration.

### src/config/kubernetes.js
Kubernetes API configuration and credential loading.

Support in-cluster and external access conceptually, but do not make unsafe assumptions.

### src/config/zoho.js
Zoho Cliq configuration.

### src/config/oracle.js
Cloud/provider configuration used by provider adapters. Keep provider-specific values isolated so another VPS/cloud provider can later be added.

---

# 9. Health and watchdog

### src/health/health.service.js
Aggregate health of AM Blackbox and its dependencies.

### src/health/vps.health.js
Represent/check host-level health signals available to the control plane.

### src/health/kubernetes.health.js
Check Kubernetes API/cluster health.

### src/health/dependencies.health.js
Check PostgreSQL, Grafana integration, Kubernetes, Zoho where applicable.

### src/watchdog/watchdog.service.js
Independent watchdog orchestration.

The watchdog should detect:
- heartbeat loss;
- service health degradation;
- dependency failure;
- monitoring/control-plane issues.

### src/watchdog/heartbeat.service.js
Maintain/validate heartbeats from monitored environments.

### src/watchdog/health-check.service.js
Perform periodic checks.

Do not implement an infinite blocking loop. Use controlled intervals/timers and graceful shutdown.

---

# 10. Incident module

### src/incidents/incident.service.js
Main incident lifecycle service.

Responsibilities:
- create;
- update;
- resolve;
- reopen where justified;
- fetch;
- list;
- attach evidence;
- attach timeline;
- attach diagnosis.

### src/incidents/incident.detector.js
Convert incoming signals/alerts into candidate incidents.

Do not assume every alert equals a unique incident. Deduplicate and correlate.

### src/incidents/incident.correlator.js
Correlate signals from:
- infrastructure;
- Kubernetes;
- application;
- logs;
- metrics;
- traces;
- events.

Correlation must be time-aware.

### src/incidents/incident.timeline.js
Build chronological incident timelines.

### src/incidents/incident.repository.js
Persistence abstraction for incident records.

Avoid putting raw SQL throughout business services.

---

# 11. Evidence module

### src/evidence/evidence.service.js
Orchestrate evidence retrieval.

### src/evidence/metrics.service.js
Query relevant Grafana metrics.

Examples:
- CPU;
- memory;
- swap;
- disk usage;
- disk I/O;
- iowait;
- load;
- network;
- pressure;
- container/pod resources.

### src/evidence/logs.service.js
Retrieve relevant logs from Grafana Cloud.

Include:
- system;
- kubelet;
- container runtime where available;
- application logs.

### src/evidence/traces.service.js
Retrieve traces when tracing is configured.

### src/evidence/kubernetes-events.service.js
Retrieve Kubernetes events around an incident.

### src/evidence/evidence-correlator.js
Combine evidence into a coherent incident evidence set.

Evidence should reference source/time ranges rather than copying huge telemetry payloads into PostgreSQL.

---

# 12. Pattern/history module

### src/patterns/pattern.service.js
Manage recurring problem patterns.

### src/patterns/pattern.detector.js
Identify repeated incident signatures.

Examples:
- same service + OOM;
- same node + memory pressure;
- same deployment + crash loop;
- same disk exhaustion pattern.

### src/patterns/pattern.matcher.js
Find historical incidents similar to a current incident.

### src/patterns/pattern.repository.js
Persist/retrieve recurring problem records.

The goal is to answer:

> "Have we seen this before, and what happened then?"

---

# 13. Diagnosis module

### src/diagnosis/diagnosis.service.js
Orchestrate diagnosis.

### src/diagnosis/diagnosis.engine.js
Perform deterministic evidence-based diagnosis first.

Output should contain:
- incident classification;
- suspected causes;
- supporting evidence;
- contradictory evidence;
- confidence;
- affected components;
- recommended investigation/recovery actions;
- whether the cause is confirmed or only suspected.

Do not implement an LLM dependency initially.

### src/diagnosis/diagnosis.repository.js
Persist diagnosis results.

Important example:

```text
Suspected cause:
portfolio-service memory exhaustion

Evidence:
- memory rose continuously for 18 minutes
- swap increased
- pod was OOMKilled
- restart count increased
- node memory pressure followed

Confidence:
high

Confirmed:
false
```

Never claim certainty solely from temporal correlation.

---

# 14. MCP

### src/mcp/server.js
Expose AM Blackbox investigation capabilities through MCP.

Initially READ ONLY.

### MCP tools

#### incidents.tool.js
Provide:
- get incident;
- list recent incidents;
- search incidents;
- incident timeline.

#### metrics.tool.js
Retrieve metric evidence.

#### logs.tool.js
Retrieve log evidence.

#### traces.tool.js
Retrieve traces.

#### kubernetes.tool.js
Retrieve:
- pod state;
- deployment state;
- node state;
- Kubernetes events;
- restart counts;
- OOM events.

#### diagnosis.tool.js
Expose diagnosis and evidence summaries.

#### patterns.tool.js
Expose recurring incident history and similar incidents.

#### recovery.tool.js
Initially expose recovery information/status only.

Do not execute mutation actions through MCP until the recovery security model is implemented.

### MCP resources

Resources should provide structured read-only representations of:
- incidents;
- services;
- infrastructure.

---

# 15. Recovery

Recovery is future-facing but must be structurally clean now.

### src/recovery/recovery.service.js
High-level recovery orchestration.

### src/recovery/recovery.executor.js
Execute an approved action.

### src/recovery/recovery.validator.js
Validate:
- target;
- environment;
- incident state;
- action;
- authorization;
- policy;
- duplicate execution;
- safety conditions.

### src/recovery/recovery.audit.js
Create immutable-style audit records for every action attempt/result.

### Action files

#### restart-pod.action.js
Restart a single Kubernetes pod through the Kubernetes provider.

#### restart-deployment.action.js
Perform a controlled rollout restart.

#### scale-zero.action.js
Scale a deployment to zero only when explicitly permitted by policy.

#### rollback.action.js
Rollback to an approved known deployment revision.

#### restart-vps.action.js
Request a VPS restart through a provider adapter.

Never expose arbitrary shell commands.

### Provider files

#### kubernetes.provider.js
Abstract Kubernetes operations.

#### vps.provider.js
Abstract cloud/VPS operations.

Do not hard-code Oracle API calls directly inside action files.

---

# 16. Policies

### policy.service.js
Policy orchestration.

### policy.engine.js
Evaluate whether an action is permitted.

Inputs should include:
- environment;
- incident severity;
- action;
- target;
- current state;
- previous action attempts;
- cooldown;
- approval requirements.

### policies.js
Central policy definitions.

Keep policies explicit and readable.

---

# 17. Notifications

### notification.service.js
Generic notification abstraction.

### zoho-cliq.service.js
Send incident/recovery/resolution notifications to Zoho Cliq.

### templates

#### incident-alert.template.js
Produce structured incident message containing:
- severity;
- environment;
- service;
- pod/node;
- problem;
- restart count;
- important evidence;
- incident ID;
- suspected cause;
- previous similar incidents;
- available actions.

#### recovery-alert.template.js
Report recovery action:
- action;
- target;
- requested by;
- validation;
- result;
- timestamp;
- incident ID.

#### resolution-alert.template.js
Report:
- incident resolved;
- duration;
- root/suspected cause;
- recovery action;
- verification.

Zoho should be a notification/action surface, not the infrastructure control plane.

---

# 18. Integrations

## Grafana

### grafana.client.js
Common HTTP/API client.

Handle:
- authentication;
- retries;
- timeouts;
- errors;
- request correlation.

### grafana.alerts.js
Handle incoming/queried alert information.

### grafana.metrics.js
Metric query abstraction.

### grafana.logs.js
Log query abstraction.

### grafana.traces.js
Trace query abstraction.

Keep Grafana-specific query syntax isolated here.

## Kubernetes

### kubernetes.client.js
Shared Kubernetes API client.

### pods.js
Pod operations/read queries.

### deployments.js
Deployment state and rollout operations.

### nodes.js
Node state/resources/conditions.

### events.js
Kubernetes event queries.

## Zoho

### cliq.client.js
Low-level Zoho Cliq API client.

Keep message formatting in notifications/templates, not in the low-level client.

---

# 19. Database

### src/database/client.js
Create/manage PostgreSQL connection pool.

### src/database/migrations.js
Run migrations in deterministic order.

### src/database/repositories/
Generic persistence layer.

IMPORTANT:
There is intentional overlap in the initial folder structure between domain repositories and database repositories. Avoid implementing duplicate persistence logic.

Use ONE actual persistence implementation per entity. If necessary, make the domain repository delegate to the database repository rather than maintaining two separate SQL implementations.

---

# 20. Database schema

Create schemas that support:

## incidents
Suggested fields:
- id
- environment
- severity
- status
- incident_type
- title
- description
- detected_at
- started_at
- resolved_at
- duration
- affected_service
- affected_pod
- affected_node
- suspected_cause
- confirmed_cause
- diagnosis_confidence
- created_at
- updated_at

## incident_events
Chronological events linked to incidents:
- id
- incident_id
- timestamp
- source
- event_type
- component
- summary
- metadata JSONB

## problem_patterns
Recurring problems:
- id
- pattern_key
- title
- category
- occurrence_count
- first_seen_at
- last_seen_at
- representative_incident_id
- metadata JSONB

## evidence
References to telemetry:
- id
- incident_id
- evidence_type
- source
- query/reference
- start_time
- end_time
- summary
- metadata JSONB

Do not dump entire logs/metric datasets into this table.

## recovery_actions
Record requested/executed actions:
- id
- incident_id
- action_type
- target
- environment
- status
- requested_by
- requested_at
- started_at
- completed_at
- result
- error
- metadata JSONB

## action_audit
Security/audit record:
- id
- incident_id
- recovery_action_id
- actor
- action
- target
- authorization_result
- policy_result
- timestamp
- request_metadata JSONB
- result_metadata JSONB

Add useful indexes for incident time, environment, status, service, pattern key, and incident relationships.

Use JSONB only where flexibility is useful; keep important query fields relational.

---

# 21. Database migrations

### 001_create_incidents.sql
Create incidents table.

### 002_create_incident_events.sql
Create incident events.

### 003_create_problem_patterns.sql
Create recurring pattern table.

### 004_create_evidence.sql
Create evidence references.

### 005_create_recovery_actions.sql
Create recovery actions.

### 006_create_action_audit.sql
Create audit records.

Migrations must be idempotent where practical and safely ordered.

---

# 22. Grafana Alloy

Alloy runs on monitored VPS hosts.

The production and pre-production configurations should eventually collect:

## Host metrics
- CPU
- memory
- swap
- disk
- filesystem/inodes
- disk I/O
- network
- load
- process/resource pressure where available

## Kubernetes telemetry
- node state
- pod/container resources
- restarts
- OOMKilled events
- CrashLoopBackOff
- node pressure
- node readiness

## Logs
- system logs
- kubelet logs
- container runtime logs
- Kubernetes events where available
- application logs

Do not depend only on a Kubernetes-hosted collector for host crash diagnosis.

Alloy configurations should use environment-specific labels such as:
- environment=production
- environment=preproduction

Also identify:
- host/node;
- cluster;
- service;
- namespace;
- pod where applicable.

Do not hard-code credentials into `.alloy` files. Use secure environment/secret injection.

---

# 23. Grafana dashboards

## infrastructure.json
Show:
- VPS health;
- CPU;
- memory;
- swap;
- disk;
- I/O;
- network;
- pressure;
- uptime.

## kubernetes.json
Show:
- nodes;
- pods;
- restarts;
- OOMKilled;
- CrashLoopBackOff;
- resource usage;
- node readiness/pressure.

## services.json
Show:
- service availability;
- error rate;
- latency if available;
- restarts;
- resource usage.

## incidents.json
Show:
- active incidents;
- recent incidents;
- severity;
- duration;
- affected service;
- incident rate;
- recurring patterns.

Dashboards are useful for humans but AM Blackbox must not depend on a local Grafana server for historical evidence.

---

# 24. Grafana alerts

Create alert definitions for:

## Infrastructure
- high CPU;
- high memory;
- high swap;
- disk nearing capacity;
- disk/inode exhaustion;
- network anomalies;
- node health.

## Kubernetes
- OOMKilled;
- CrashLoopBackOff;
- excessive pod restarts;
- node memory pressure;
- node disk pressure;
- node not ready.

## Services
- service unavailable;
- high error rate.

Avoid noisy alerts. Prefer alerts that represent actionable conditions.

Alert thresholds should be configurable and documented rather than buried in application code.

---

# 25. Oracle deployment

Oracle is the independent control plane.

Initially it should host:

```text
AM Blackbox
PostgreSQL
```

Later it may host:
- MCP;
- incident engine;
- recovery engine;
- AI investigator.

Use Docker Compose.

### oracle/docker-compose.yml
Production-like control-plane deployment.

### oracle/deployment/setup.sh
Prepare the Oracle VM.

### oracle/deployment/deploy.sh
Deploy/update the control plane.

### oracle/deployment/update.sh
Safe update flow.

### oracle/config/.gitkeep
Placeholder for non-secret configuration structure.

Never commit Oracle API credentials.

Do not assume the monitored VPS provider is Oracle. Use provider adapters.

---

# 26. Scripts

## Alloy
Install/uninstall/update host-level Alloy.

## Deployment
Deploy/update/rollback AM Blackbox.

## Database
Migrate/backup/restore PostgreSQL.

## Health
Run local system/control-plane health checks.

Scripts must:
- fail on errors;
- avoid destructive defaults;
- print useful diagnostics;
- never echo secrets.

---

# 27. Testing strategy

## Unit tests
Cover:
- health logic;
- incident detection;
- incident correlation;
- diagnosis rules;
- pattern matching;
- recovery validation;
- policy evaluation.

## Integration tests
Cover:
- Grafana client;
- Kubernetes client;
- PostgreSQL repositories;
- notifications.

Use mocks/fakes for external systems.

Do not require production credentials for tests.

## MCP tests
Verify:
- tools are discoverable;
- schemas are valid;
- read-only tools return structured results;
- dangerous actions are not executable without policy.

---

# 28. Incident model

Use a lifecycle similar to:

```text
OPEN
  ↓
INVESTIGATING
  ↓
DIAGNOSED
  ↓
RECOVERING (optional)
  ↓
VERIFYING
  ↓
RESOLVED
```

Possible side paths:
- OPEN → RESOLVED
- INVESTIGATING → RESOLVED
- RECOVERING → INVESTIGATING if recovery failed
- RESOLVED → REOPENED if the same incident returns within an appropriate window

Do not overcomplicate state management initially.

---

# 29. Example black-box investigation

For an incident like:

```text
portfolio-service becomes unavailable
```

The system should be able to reconstruct:

```text
portfolio-service memory increased
        ↓
node memory increased
        ↓
swap increased
        ↓
memory pressure increased
        ↓
pod was OOMKilled
        ↓
pod restarted
        ↓
restart count increased
        ↓
node became unstable
        ↓
Kubernetes API became unhealthy
        ↓
VPS became unreachable
```

But the diagnosis engine must distinguish:

```text
Observed:
- OOMKilled

Strongly supported:
- memory exhaustion contributed to pod termination

Possible:
- memory pressure contributed to node instability

Not automatically proven:
- memory exhaustion caused the entire VPS outage
```

This distinction is mandatory.

Other possible root-cause categories include:
- disk full;
- inode exhaustion;
- PID exhaustion;
- file descriptor exhaustion;
- CPU saturation;
- CPU steal;
- disk I/O saturation;
- network failure;
- kubelet failure;
- container runtime failure;
- runaway process;
- connection/resource leak;
- provider/hypervisor/network failure.

Provider-level failures may not be diagnosable from guest OS telemetry alone.

---

# 30. Recovery security model

Never implement this:

```text
POST /restart
{
  "command": "kubectl ..."
}
```

Never allow arbitrary shell commands.

Correct architecture:

```text
Zoho / MCP / API
       ↓
AM Blackbox
       ↓
identify incident
       ↓
validate target
       ↓
validate environment
       ↓
evaluate policy
       ↓
check authorization
       ↓
create audit record
       ↓
execute typed action
       ↓
verify result
       ↓
notify
```

For interactive actions, use short-lived, single-use, incident-bound action tokens.

An action should be rejected if:
- token is invalid;
- token is expired;
- incident no longer matches;
- target changed;
- policy denies action;
- action already executed;
- authorization is insufficient.

---

# 31. AI roadmap

Do not start with AI.

Phase 1:
- deterministic telemetry;
- incident lifecycle;
- evidence collection;
- historical incidents.

Phase 2:
- pattern matching;
- deterministic diagnosis;
- MCP investigation.

Phase 3:
- AI-assisted investigation:
  - summarize incident;
  - inspect evidence;
  - compare historical incidents;
  - suggest likely causes;
  - suggest safe actions.

Phase 4:
- controlled remediation:
  - policy validation;
  - approval;
  - execution;
  - verification;
  - audit.

Never let an LLM directly execute arbitrary infrastructure commands.

---

# 32. Implementation order

Implement in this exact sequence unless a dependency requires a minor adjustment.

### Step 1
Bootstrap:
- package.json;
- Bun setup;
- Express server;
- config;
- logger;
- error handling.

### Step 2
Docker:
- Dockerfile;
- docker-compose;
- PostgreSQL;
- application health/readiness.

### Step 3
Database:
- client;
- migration runner;
- incidents;
- events;
- evidence;
- patterns;
- recovery/audit schema.

### Step 4
Health/watchdog:
- health endpoints;
- dependency checks;
- heartbeat model.

### Step 5
Grafana integration:
- client;
- alert ingestion;
- metric query abstraction;
- log query abstraction.

### Step 6
Kubernetes integration:
- read-only client;
- pods;
- deployments;
- nodes;
- events.

### Step 7
Incident engine:
- detection;
- correlation;
- timeline;
- persistence.

### Step 8
Evidence engine:
- metrics;
- logs;
- Kubernetes events;
- traces;
- evidence correlation.

### Step 9
Pattern/history engine.

### Step 10
Deterministic diagnosis engine.

### Step 11
MCP read-only tools/resources.

### Step 12
Zoho notifications.

### Step 13
Recovery policies and typed recovery actions.

### Step 14
Oracle deployment.

### Step 15
Controlled pre-production failure tests.

### Step 16
Production rollout.

### Step 17
AI-assisted investigation.

Do not skip directly to recovery or AI before the evidence pipeline is trustworthy.

---

# 33. Development behavior for Antigravity

When implementing:

1. Inspect the current repository before changing anything.
2. Preserve existing correct files.
3. Do not rewrite unrelated project files.
4. Follow the architecture in this specification.
5. If a dependency is needed, use the smallest stable dependency that solves the problem.
6. Prefer standard APIs over unnecessary frameworks.
7. Add meaningful error handling.
8. Add structured logs.
9. Add tests for non-trivial logic.
10. Keep secrets out of source control.
11. Use `.env.example` for configuration documentation.
12. Keep functions small and named by intent.
13. Avoid circular dependencies.
14. Avoid global mutable state.
15. Use dependency injection or explicit client/service construction where practical.
16. Keep external API code inside integrations.
17. Keep business logic outside integrations.
18. Keep database logic inside repositories.
19. Keep HTTP concerns inside server/routes.
20. Keep policy decisions inside the policy module.
21. Keep recovery execution inside typed actions/providers.
22. Never silently swallow errors.
23. Never fabricate telemetry.
24. Never fabricate incident evidence.
25. Never report an action as successful before verification.
26. Never call an incident root cause "confirmed" unless the evidence rules actually justify confirmation.
27. Prefer UTC internally and ISO-8601 timestamps.
28. Include correlation/request IDs in logs.
29. Make shutdown graceful.
30. Keep the application portable between local Docker, Oracle VM, and other VPS/cloud environments.

---

# 34. Coding conventions

Use:

```js
import express from "express";
```

not CommonJS `require()`.

Use async/await.

Use named functions where that improves readability.

Prefer:

```text
Service
  → Integration Client
  → Repository
```

rather than:

```text
Route
  → raw SQL
  → raw fetch()
  → Kubernetes API
```

Business modules should not know HTTP implementation details.

External integration modules should normalize provider-specific responses into internal domain structures.

---

# 35. Observability of AM Blackbox itself

AM Blackbox must monitor itself.

At minimum expose:
- application health;
- readiness;
- process uptime;
- request counts;
- request latency;
- error counts;
- PostgreSQL connectivity;
- Grafana connectivity;
- Kubernetes connectivity;
- notification connectivity.

Do not build an elaborate self-monitoring subsystem initially. Start with clean health/readiness endpoints and structured logs.

---

# 36. Environment model

Support at least:

```text
production
preproduction
local
```

Every incident and telemetry reference should identify its environment.

Do not mix production and pre-production incident histories without an explicit environment field.

---

# 37. Data retention philosophy

Grafana Cloud owns raw telemetry retention.

PostgreSQL owns compact historical intelligence.

Do NOT delete incident summaries merely because raw telemetry has expired.

An incident should remain useful even after its original raw telemetry is no longer available.

Example:

```text
Incident:
INC-0042

Service:
portfolio-service

Date:
2026-09-22

Cause:
suspected memory exhaustion

Peak memory:
4.8 GB

OOMKilled:
yes

Restart count:
17

Duration:
11m 42s

Recovery:
rollout restart

Similar incidents:
3
```

This compact history is one of the most valuable parts of AM Blackbox.

---

# 38. Final acceptance criteria

The implementation is considered structurally correct when:

- `bun install` works;
- the app starts;
- `/health` works;
- `/ready` works;
- PostgreSQL connects;
- migrations can run;
- Docker Compose starts the local stack;
- configuration is environment-driven;
- no secrets are committed;
- tests can run without production infrastructure;
- Grafana/Kubernetes integrations are isolated behind clients;
- incidents can be represented and persisted;
- evidence references can be stored;
- historical patterns can be represented;
- MCP is read-only initially;
- recovery actions are typed and policy-gated;
- audit records exist;
- the application can later be deployed on Oracle using Docker Compose;
- documentation reflects the actual implementation.

---

# 39. Important instruction about the current phase

The repository may contain many files from the target architecture, but implementation should be incremental.

Do not attempt to make every future feature production-ready in the first commit.

First make the foundation reliable:

```text
Bun
→ Express
→ Config
→ Logging
→ PostgreSQL
→ Health
→ Docker
```

Then build upward.

The target architecture describes where the project is going; it does not mean every advanced capability must be implemented simultaneously.

---

# 40. Expected autonomous behavior

You are authorized to make normal implementation decisions without asking the user.

If you encounter a choice such as:
- package A vs package B;
- exact internal function name;
- folder helper placement;
- SQL index naming;
- logging field naming;

choose the cleanest conventional solution and continue.

Ask for user input only when the decision changes an external business requirement, credential, destructive production behavior, legal requirement, or an architecture decision that cannot be inferred from this specification.

At the end of each implementation phase:
- run tests;
- run lint/type/static checks if configured;
- run the application;
- verify health endpoints;
- report what was implemented and what remains.

Do not wait for the user to tell you how to implement each file.
