# AM Blackbox — Antigravity Autonomous Implementation Plan

## Mission

Implement the complete **AM Blackbox** project described in `AM_Blackbox_Antigravity_Implementation_Spec.md`.

This file is the execution plan. The Master Spec is the architectural source of truth.

The implementation must be incremental, testable, and autonomous.

Do not wait for the user to explain how to implement ordinary engineering details.

---

# 1. Source-of-truth hierarchy

When making decisions, use this priority:

1. Existing working project code, if it is intentionally already implemented.
2. `AM_Blackbox_Antigravity_Implementation_Spec.md`
3. This implementation plan.
4. `AM_BLACKBOX_RULES.md`
5. Conventional engineering judgment.

Never invent an architecture that conflicts with the Master Spec.

If a future feature is not yet implemented, create only the necessary interface/scaffold when the current phase requires it.

---

# 2. Global execution rules

For every phase:

1. Inspect the current repository.
2. Identify what already exists.
3. Implement only the current phase.
4. Do not rewrite unrelated files.
5. Run formatting/lint/static checks where configured.
6. Run tests.
7. Start the application where possible.
8. Verify health/readiness.
9. Fix failures before moving forward.
10. Update documentation if implementation differs from the plan.
11. Keep secrets out of Git.
12. Keep external integrations behind adapters.
13. Never fabricate external API responses.
14. Never mark infrastructure actions successful without verification.
15. Never expose arbitrary shell commands.
16. Never implement production-destructive automation without policy validation.

After a phase is complete, continue to the next phase automatically unless genuinely blocked.

---

# 3. Phase 0 — Repository inspection and bootstrap

## Goal

Establish the repository without destroying anything that already exists.

### Tasks

- Inspect repository tree.
- Inspect existing `package.json`.
- Inspect existing Git configuration.
- Inspect existing source files.
- Detect whether Bun is already configured.
- Detect whether Docker is already configured.
- Detect whether PostgreSQL configuration exists.
- Detect existing tests/lint/format configuration.

### Deliverables

Target root files:

```text
README.md
LICENSE
Dockerfile
docker-compose.yml
.dockerignore
.gitignore
.env.example
package.json
bun.lock
```

Do not overwrite an existing meaningful file blindly.

### Completion criteria

- Bun project works.
- Dependencies install.
- `package.json` is valid.
- Application entrypoint exists.

---

# 4. Phase 1 — Application foundation

## Goal

Create a reliable minimal Express application.

Implement:

```text
src/server/index.js
src/server/app.js
src/server/routes.js

src/config/index.js
src/config/database.js
src/config/grafana.js
src/config/kubernetes.js
src/config/zoho.js
src/config/oracle.js

src/utils/logger.js
src/utils/errors.js
src/utils/retry.js
src/utils/time.js
src/utils/validation.js
```

### Requirements

- ES modules.
- Express.
- Environment-driven configuration.
- Structured logging.
- Central error handling.
- Graceful shutdown.
- Request correlation ID.
- UTC/ISO timestamps.
- No secrets in source.

### Endpoints

At minimum:

```text
GET /health
GET /ready
```

Health must indicate application health.

Readiness must check required dependencies when configured.

---

# 5. Phase 2 — Docker + PostgreSQL

## Goal

Make the project runnable locally with one command.

Implement:

```text
Dockerfile
docker-compose.yml

src/database/client.js
src/database/migrations.js

database/migrations/
```

### Compose

Local stack:

```text
blackbox
postgres
```

Do not run Grafana locally unless explicitly required.

### PostgreSQL

Implement connection pooling.

Implement migration execution.

Add:

```text
001_create_incidents.sql
002_create_incident_events.sql
003_create_problem_patterns.sql
004_create_evidence.sql
005_create_recovery_actions.sql
006_create_action_audit.sql
```

### Completion criteria

This must work:

```text
docker compose up
```

Then:

```text
GET /health
GET /ready
```

PostgreSQL must be reachable.

---

# 6. Phase 3 — Health and watchdog

## Goal

AM Blackbox can observe its own dependencies and represent monitored-system health.

Implement:

```text
src/health/
src/watchdog/
```

### Health checks

Support:

- application;
- PostgreSQL;
- Grafana;
- Kubernetes;
- notification dependency when configured.

Do not make optional integrations fail local development.

### Watchdog

Implement:
- heartbeat model;
- periodic checks;
- heartbeat loss detection;
- graceful timer shutdown.

Do not create uncontrolled background loops.

---

# 7. Phase 4 — Grafana integration

## Goal

Create the telemetry integration layer.

Implement:

```text
src/integrations/grafana/grafana.client.js
src/integrations/grafana/grafana.alerts.js
src/integrations/grafana/grafana.metrics.js
src/integrations/grafana/grafana.logs.js
src/integrations/grafana/grafana.traces.js

src/evidence/metrics.service.js
src/evidence/logs.service.js
src/evidence/traces.service.js
```

### Client requirements

- authentication;
- timeout;
- retry;
- structured errors;
- correlation ID;
- normalized response handling.

### Important

Do not hard-code a single Grafana query everywhere.

Keep query construction isolated and reusable.

---

# 8. Phase 5 — Kubernetes read-only integration

## Goal

Allow AM Blackbox to investigate Kubernetes without mutating it.

Implement:

```text
src/integrations/kubernetes/kubernetes.client.js
src/integrations/kubernetes/pods.js
src/integrations/kubernetes/deployments.js
src/integrations/kubernetes/nodes.js
src/integrations/kubernetes/events.js

src/health/kubernetes.health.js
src/evidence/kubernetes-events.service.js
```

### Read-only capabilities

Support retrieval of:

- pod state;
- restart counts;
- container termination reason;
- OOMKilled;
- CrashLoopBackOff;
- deployment state;
- node conditions;
- node pressure;
- node readiness;
- Kubernetes events.

No restart/rollback/scale operations yet.

---

# 9. Phase 6 — Incident engine

## Goal

Convert raw alerts/signals into structured incidents.

Implement:

```text
src/incidents/incident.service.js
src/incidents/incident.detector.js
src/incidents/incident.correlator.js
src/incidents/incident.timeline.js
```

Implement persistence using one authoritative repository implementation.

The initial repository structure contains repository files in two places. Do NOT create duplicate SQL implementations.

### Incident creation

An incident should contain:

- environment;
- severity;
- type;
- title;
- status;
- timestamps;
- affected service;
- pod;
- node;
- suspected cause;
- confirmed cause;
- diagnosis confidence.

### Detection

Multiple alerts belonging to the same underlying failure should be correlated instead of creating dozens of duplicate incidents.

---

# 10. Phase 7 — Evidence engine

## Goal

For each incident, reconstruct what happened around it.

Implement:

```text
src/evidence/evidence.service.js
src/evidence/evidence-correlator.js
```

Collect/query:

- CPU;
- memory;
- swap;
- disk;
- disk I/O;
- iowait;
- network;
- load;
- pressure;
- pod resources;
- restarts;
- OOM events;
- Kubernetes events;
- system logs;
- kubelet logs;
- container runtime logs;
- application logs;
- traces when available.

### Time window

Support configurable windows such as:

```text
before incident
during incident
after incident
```

Do not store massive telemetry payloads in PostgreSQL.

Store:

- source;
- query/reference;
- time range;
- compact summary;
- metadata.

---

# 11. Phase 8 — Pattern/history engine

## Goal

Answer:

> Have we seen this before?

Implement:

```text
src/patterns/pattern.service.js
src/patterns/pattern.detector.js
src/patterns/pattern.matcher.js
```

Support patterns such as:

```text
service + OOM
service + CrashLoopBackOff
node + memory pressure
node + disk pressure
deployment + repeated restarts
```

Pattern matching must consider:

- environment;
- service;
- incident type;
- affected component;
- evidence signature;
- time.

Store occurrence counts and first/last seen times.

---

# 12. Phase 9 — Deterministic diagnosis

## Goal

Produce evidence-based diagnosis without AI.

Implement:

```text
src/diagnosis/diagnosis.service.js
src/diagnosis/diagnosis.engine.js
```

### Diagnosis output

Must include:

```text
classification
suspected causes
supporting evidence
contradictory evidence
confidence
affected components
recommended investigation
recommended safe action
confirmed/suspected state
```

### Example

```text
Suspected cause:
memory exhaustion

Evidence:
- memory increased
- swap increased
- pod OOMKilled
- restart count increased

Confidence:
high

Confirmed:
false
```

Never convert correlation into certainty automatically.

---

# 13. Phase 10 — MCP read-only investigation

## Goal

Allow an MCP client to investigate AM Blackbox.

Implement:

```text
src/mcp/server.js

src/mcp/tools/incidents.tool.js
src/mcp/tools/metrics.tool.js
src/mcp/tools/logs.tool.js
src/mcp/tools/traces.tool.js
src/mcp/tools/kubernetes.tool.js
src/mcp/tools/diagnosis.tool.js
src/mcp/tools/patterns.tool.js
src/mcp/tools/recovery.tool.js

src/mcp/resources/incident.resource.js
src/mcp/resources/service.resource.js
src/mcp/resources/infrastructure.resource.js
```

### Read-only tools

At minimum support concepts equivalent to:

```text
get_incident
list_recent_incidents
search_incidents
get_incident_timeline

get_metrics
get_logs
get_traces

get_pod_health
get_node_health
get_kubernetes_events
get_oom_events

get_diagnosis
find_similar_incidents
get_recurring_problems
```

Recovery tool must initially be informational only.

No mutation through MCP yet.

---

# 14. Phase 11 — Zoho Cliq notifications

## Goal

Send useful incident messages.

Implement:

```text
src/integrations/zoho/cliq.client.js

src/notifications/notification.service.js
src/notifications/zoho-cliq.service.js

src/notifications/templates/
```

### Incident notification

Include:

- severity;
- environment;
- service;
- pod;
- node;
- problem;
- important evidence;
- incident ID;
- suspected cause;
- similar incidents;
- available actions.

Do not let Zoho directly call Kubernetes.

All action buttons must eventually point to AM Blackbox.

---

# 15. Phase 12 — Recovery framework

## Goal

Create safe, typed, policy-controlled recovery.

Implement:

```text
src/recovery/recovery.service.js
src/recovery/recovery.executor.js
src/recovery/recovery.validator.js
src/recovery/recovery.audit.js

src/recovery/actions/restart-pod.action.js
src/recovery/actions/restart-deployment.action.js
src/recovery/actions/scale-zero.action.js
src/recovery/actions/rollback.action.js
src/recovery/actions/restart-vps.action.js

src/recovery/providers/kubernetes.provider.js
src/recovery/providers/vps.provider.js
```

### Critical security rule

Never execute arbitrary command strings.

Only typed actions are allowed.

Example:

```text
restartPod(target)
restartDeployment(target)
scaleZero(target)
rollback(target, revision)
restartVps(target)
```

---

# 16. Phase 13 — Policy engine

Implement:

```text
src/policies/policy.service.js
src/policies/policy.engine.js
src/policies/policies.js
```

Policy checks:

- environment;
- action;
- target;
- severity;
- incident status;
- cooldown;
- previous attempts;
- authorization;
- approval requirement.

Production should be more restrictive than pre-production.

Every action attempt must be auditable.

---

# 17. Phase 14 — Secure interactive actions

## Goal

Support Zoho/MCP/API action requests safely.

Flow:

```text
User
 ↓
Zoho/MCP/API
 ↓
AM Blackbox
 ↓
validate incident
 ↓
validate target
 ↓
validate token/authorization
 ↓
evaluate policy
 ↓
audit
 ↓
execute typed action
 ↓
verify
 ↓
audit result
 ↓
notify
```

Use:

- short-lived tokens;
- single-use tokens;
- incident-bound tokens;
- target-bound tokens.

Reject:
- expired token;
- reused token;
- wrong incident;
- wrong target;
- policy denial;
- insufficient authorization.

---

# 18. Phase 15 — Verification after recovery

A recovery action is not successful merely because the API call returned success.

After an action:

1. observe target;
2. wait appropriate stabilization period;
3. query Kubernetes/VPS state;
4. verify incident symptoms;
5. mark:
   - successful;
   - failed;
   - partially recovered;
   - still investigating.

Example:

```text
rollout restart
 ↓
deployment available
 ↓
pod healthy
 ↓
restart count stable
 ↓
error rate normal
 ↓
incident resolved
```

If symptoms remain, reopen/continue the incident.

---

# 19. Phase 16 — Alloy configuration

Create:

```text
alloy/production/config.alloy
alloy/production/README.md

alloy/preproduction/config.alloy
alloy/preproduction/README.md
```

Alloy must collect host-level telemetry independently of Kubernetes.

Include appropriate collection for:

- CPU;
- memory;
- swap;
- filesystem;
- inode;
- disk I/O;
- network;
- system logs;
- Kubernetes/application logs;
- Kubernetes metrics/events where available.

Attach labels:

```text
environment
host
cluster
namespace
service
pod
```

Never put secrets directly in committed Alloy configuration.

---

# 20. Phase 17 — Grafana dashboards and alerts

Implement dashboard/alert artifacts after telemetry labels and queries are known.

Dashboards:

```text
infrastructure
kubernetes
services
incidents
```

Alerts:

```text
Infrastructure:
CPU
memory
disk
network
node

Kubernetes:
OOM
CrashLoop
pod restart
node pressure
node not ready

Services:
service down
high error rate
```

Do not create fake datasource IDs or unverifiable Grafana configuration.

Where exact Grafana Cloud identifiers are environment-specific, use documented placeholders/configuration.

---

# 21. Phase 18 — Oracle control plane

Create:

```text
oracle/docker-compose.yml
oracle/README.md

oracle/deployment/setup.sh
oracle/deployment/deploy.sh
oracle/deployment/update.sh
```

Oracle should run:

```text
AM Blackbox
PostgreSQL
```

Initially.

Keep cloud-provider operations behind adapters.

Do not assume Oracle is the provider of the monitored production VPS.

---

# 22. Phase 19 — Operational scripts

Implement:

```text
scripts/alloy/install.sh
scripts/alloy/uninstall.sh
scripts/alloy/update.sh

scripts/deployment/deploy.sh
scripts/deployment/update.sh
scripts/deployment/rollback.sh

scripts/database/migrate.sh
scripts/database/backup.sh
scripts/database/restore.sh

scripts/health/system-check.sh
```

Scripts must:

- fail safely;
- validate prerequisites;
- avoid destructive defaults;
- never echo secrets;
- return useful exit codes.

---

# 23. Phase 20 — Tests

Implement tests continuously, not only at the end.

## Unit

Test:

```text
health
incident detection
incident correlation
incident lifecycle
pattern matching
diagnosis
policy validation
recovery validation
```

## Integration

Test:

```text
Grafana
Kubernetes
PostgreSQL
Zoho
```

Use mocks/fakes where credentials or external infrastructure are unavailable.

## MCP

Test:

- tool registration;
- tool schemas;
- read-only behavior;
- structured responses;
- recovery denial when policy/security is not satisfied.

---

# 24. Phase 21 — Documentation synchronization

Keep these accurate:

```text
README.md
docs/architecture.md
docs/deployment.md
docs/incident-lifecycle.md
docs/recovery-policies.md
docs/security.md
docs/troubleshooting.md
```

Documentation must describe the actual implemented behavior, not imagined future behavior.

Clearly label future features.

---

# 25. Phase 22 — End-to-end local verification

Before declaring the project complete:

### Infrastructure

```text
docker compose up
```

Verify:
- application starts;
- PostgreSQL starts;
- health passes;
- readiness passes.

### Database

Verify:
- migrations execute;
- records can be created/read;
- indexes exist.

### Incident

Simulate:
- alert;
- incident creation;
- evidence association;
- timeline;
- diagnosis;
- persistence;
- resolution.

### Recovery

In a mocked/pre-production environment:

```text
incident
→ recovery request
→ policy
→ validation
→ action
→ verification
→ audit
→ notification
```

Do not test destructive production actions automatically.

---

# 26. Phase 23 — Pre-production black-box test

Before production deployment, create controlled failures in pre-production.

Test examples:

### Memory
Trigger controlled memory pressure/OOM.

Expected evidence:

```text
memory increase
→ swap/pressure
→ OOMKilled
→ restart
→ Kubernetes event
→ incident
→ evidence
→ diagnosis
```

### Crash loop

Expected:

```text
pod failure
→ restart count
→ CrashLoopBackOff
→ incident
```

### Disk

Expected:

```text
disk/inode pressure
→ node condition
→ service degradation
→ incident
```

### Node failure

Expected:

```text
node not ready
→ service impact
→ incident
```

The goal is to prove that the black box reconstructs the timeline.

---

# 27. Phase 24 — Production rollout

Production rollout must be conservative.

Order:

```text
Grafana Cloud
 ↓
Alloy
 ↓
telemetry validation
 ↓
alerts
 ↓
AM Blackbox
 ↓
incident ingestion
 ↓
MCP read-only
 ↓
Zoho notifications
 ↓
recovery framework
```

Do not enable autonomous production remediation immediately.

---

# 28. Phase 25 — AI investigation layer

Only after the deterministic system is reliable.

AI may:

- summarize incidents;
- inspect evidence;
- compare similar incidents;
- explain timelines;
- suggest causes;
- suggest safe actions.

AI must not:

- execute arbitrary commands;
- bypass policies;
- bypass authorization;
- invent evidence;
- mark uncertain causes as confirmed;
- directly restart infrastructure without the recovery control plane.

---

# 29. Final implementation order summary

Follow this sequence:

```text
0  Repository inspection
1  Bun + Express + config
2  Docker + PostgreSQL
3  Health + watchdog
4  Grafana integration
5  Kubernetes read-only integration
6  Incident engine
7  Evidence engine
8  Pattern/history engine
9  Deterministic diagnosis
10 MCP read-only
11 Zoho notifications
12 Recovery framework
13 Policy engine
14 Secure interactive actions
15 Recovery verification
16 Alloy
17 Grafana dashboards/alerts
18 Oracle
19 Operational scripts
20 Tests
21 Documentation
22 Local E2E
23 Pre-production failure testing
24 Production rollout
25 AI investigation
```

---

# 30. Definition of done

Do not call AM Blackbox complete merely because files exist.

The system must demonstrate:

```text
Telemetry
   ↓
Alert
   ↓
Incident
   ↓
Evidence
   ↓
Timeline
   ↓
Historical comparison
   ↓
Diagnosis
   ↓
Notification
   ↓
Optional policy-controlled recovery
   ↓
Verification
   ↓
Audit
   ↓
Historical record
```

And an MCP client should eventually be able to answer questions such as:

```text
What incidents happened today?

Why did portfolio-service go down?

What happened immediately before it?

Was it OOMKilled?

Which pod/node was affected?

Have we seen this before?

What were the previous recovery actions?

Is the incident resolved?

What recovery action is permitted?
```

The answer must be based on actual stored/queryable evidence.

---

# 31. Autonomous execution instruction

Continue through the phases without waiting for the user after each phase.

If a normal implementation detail is unspecified, choose a conventional solution.

Only stop and request user input when blocked by something that cannot safely be inferred, such as:

- real credentials;
- external account configuration;
- production authorization;
- destructive production operation;
- a business requirement with multiple materially different interpretations.

When credentials are required:
- create configuration placeholders;
- document exactly what credential is required;
- continue implementing everything that does not require the credential.

Do not stop the entire project merely because an external integration cannot be tested live.

At every phase, leave the repository in a runnable state.
