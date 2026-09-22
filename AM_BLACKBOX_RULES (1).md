# AM Blackbox — Antigravity Autonomous Engineering Rules

## Purpose

These are the non-negotiable rules for implementing AM Blackbox autonomously.

The objective is to prevent hallucinated architecture, fake integrations, unsafe infrastructure actions, duplicated logic, and premature complexity.

---

# 1. Source of truth

The AM Blackbox Master Specification and Implementation Plan are authoritative.

Do not invent:
- additional infrastructure;
- additional services;
- arbitrary cloud providers;
- fake APIs;
- undocumented credentials;
- fake telemetry;
- fake database records;
- unsupported Grafana endpoints;
- unsupported Kubernetes behavior.

If an external API detail is unknown, isolate it behind an adapter and document the required configuration.

---

# 2. Never fake functionality

Never create code that pretends an operation succeeded.

Bad:

```js
return {
  success: true,
  message: "Pod restarted"
};
```

when no restart happened.

Correct:

```text
request
→ actual provider call
→ provider response
→ verification
→ result
```

If an integration is not configured, return a clear unavailable/not-configured state.

---

# 3. No arbitrary command execution

Never implement:

```text
exec(userInput)
shell(userInput)
kubectl(userProvidedString)
ssh(userProvidedString)
```

Never expose arbitrary shell commands through:
- REST;
- MCP;
- Zoho;
- webhooks;
- database fields.

All infrastructure actions must be typed operations.

---

# 4. Recovery safety

Recovery must always pass through:

```text
authentication
→ authorization
→ incident validation
→ target validation
→ policy validation
→ audit
→ typed action
→ verification
```

No shortcut.

---

# 5. MCP safety

MCP is read-only until the recovery security model is complete.

MCP must not become a direct Kubernetes shell.

Read-only MCP can:
- inspect;
- query;
- compare;
- diagnose;
- explain.

Mutation must go through AM Blackbox recovery.

---

# 6. Incident truthfulness

Use these concepts correctly:

### Observed
Something directly measured.

### Suspected
Evidence strongly indicates a cause but it is not proven.

### Confirmed
The evidence and verification justify the conclusion.

Never turn:

```text
A happened before B
```

into:

```text
A caused B
```

without supporting evidence.

---

# 7. Evidence preservation

PostgreSQL is NOT the telemetry warehouse.

Store compact evidence references:

```text
source
query
time range
summary
metadata
```

Do not dump:
- entire log files;
- millions of metric points;
- full traces;
- huge Kubernetes payloads

into PostgreSQL.

---

# 8. Repository discipline

Before modifying a file:

1. Read it.
2. Understand its current purpose.
3. Preserve working behavior.
4. Make the smallest appropriate change.

Do not rewrite unrelated code.

---

# 9. No duplicate business logic

The project contains several architectural layers.

Keep them distinct:

```text
HTTP route
 ↓
service
 ↓
integration/repository
```

Do not duplicate:
- SQL queries;
- Grafana query construction;
- Kubernetes client logic;
- policy evaluation;
- recovery execution.

There must be one authoritative implementation for each responsibility.

---

# 10. External integration isolation

External systems:

```text
Grafana
Kubernetes
Zoho
Cloud/VPS
PostgreSQL
```

must be accessed through dedicated clients/adapters.

Business logic should not directly call arbitrary `fetch()` requests throughout the codebase.

---

# 11. Configuration

Never hard-code:

- passwords;
- API tokens;
- webhook secrets;
- Kubernetes credentials;
- Grafana credentials;
- cloud credentials;
- production URLs when environment-specific.

Use environment variables/configuration.

Document them in `.env.example`.

---

# 12. Secrets

Never commit:

```text
.env
private keys
tokens
passwords
API secrets
Kubeconfig credentials
cloud credentials
webhook secrets
```

Never print secrets to logs.

---

# 13. Logging

Use structured logs.

Useful fields:

```text
timestamp
level
service
environment
requestId
incidentId
actionId
target
event
duration
error
```

Never log:
- passwords;
- tokens;
- private keys;
- authorization headers.

---

# 14. Error handling

Errors must be:
- explicit;
- structured;
- logged appropriately;
- returned safely.

Do not silently swallow errors.

Do not return internal stack traces to external users in production.

---

# 15. Time

Use UTC internally.

Use ISO-8601 timestamps.

Do not compare timestamps using formatted human strings.

Incident correlation must be time-window based.

---

# 16. Retries

Retries must be:
- bounded;
- configurable;
- appropriate to the operation.

Do not retry destructive operations blindly.

Use exponential backoff where appropriate.

---

# 17. Idempotency

Incident creation and recovery requests should be safe against duplicate delivery.

Assume:
- Grafana webhooks may be repeated;
- notification requests may retry;
- network calls may timeout after the remote action actually happened.

Design for duplicate events.

---

# 18. Database

Use PostgreSQL transactions where multiple related writes must succeed together.

Add indexes based on real query patterns.

Use foreign keys for important relationships.

Use JSONB only for flexible metadata.

Do not put business-critical fields only inside JSONB.

---

# 19. Database migrations

Never manually mutate production schema outside migrations unless explicitly required by a documented emergency procedure.

Migrations must be ordered.

Avoid destructive migrations by default.

---

# 20. Kubernetes

Prefer read-only access initially.

Required investigation information includes:
- pod state;
- restart count;
- container termination reason;
- OOMKilled;
- CrashLoopBackOff;
- node readiness;
- node pressure;
- Kubernetes events.

Do not assume every Kubernetes failure is a pod failure.

---

# 21. VPS failure model

The system must distinguish:

```text
application failure
pod failure
node/Kubernetes failure
host OS failure
provider/network failure
```

Do not attribute a VPS outage to a microservice solely because that service had a warning shortly beforehand.

---

# 22. Grafana

Keep Grafana-specific logic isolated.

Do not scatter PromQL/LogQL strings throughout unrelated business modules.

Query builders should be reusable.

If a datasource/query depends on an environment-specific identifier, configure it rather than hard-code it.

---

# 23. Alloy

Alloy must remain capable of collecting host-level telemetry even when Kubernetes is unhealthy.

Do not make host crash forensics dependent on a Kubernetes pod collector.

---

# 24. Notifications

Notifications should summarize evidence.

They must not claim:
- confirmed root cause when only suspected;
- successful recovery before verification;
- infrastructure state that was not actually queried.

---

# 25. Zoho

Zoho is an interaction/notification surface.

It is NOT the infrastructure control plane.

Correct:

```text
Zoho
 ↓
AM Blackbox
 ↓
Policy
 ↓
Recovery
```

Incorrect:

```text
Zoho
 ↓
kubectl
```

---

# 26. Recovery actions

Use typed actions:

```text
restart pod
restart deployment
scale deployment
rollback
restart VPS
```

Each action must have:
- validation;
- policy;
- authorization;
- audit;
- execution;
- verification.

---

# 27. Production safety

Do not automatically enable production remediation.

Pre-production can be used for controlled experiments.

Production recovery should initially be:
- visible;
- auditable;
- manually approved where appropriate.

Automation should become more permissive only after successful testing.

---

# 28. Testing

Do not only test happy paths.

Test:
- network timeout;
- Grafana unavailable;
- Kubernetes unavailable;
- PostgreSQL unavailable;
- duplicate alert;
- duplicate recovery request;
- expired action token;
- invalid target;
- policy denial;
- action timeout;
- verification failure.

---

# 29. External API uncertainty

If an external API cannot be verified:

Do:

```text
interface
adapter
configuration
mock
clear TODO
```

Do not invent endpoint names or response fields.

---

# 30. Dependency discipline

Before adding a dependency, ask:

- Is it actually needed?
- Can the standard library solve it?
- Is the package mature?
- Does it work with Bun?
- Does it increase maintenance significantly?

Keep dependencies minimal.

---

# 31. Code quality

Prefer:

- small functions;
- clear names;
- explicit inputs/outputs;
- async/await;
- early validation;
- centralized errors;
- dependency injection where useful.

Avoid:
- giant classes;
- hidden global state;
- magic strings;
- deeply nested conditionals;
- circular dependencies.

---

# 32. File responsibility

Each file should have one primary reason to change.

Examples:

```text
grafana.client.js
→ communication with Grafana

metrics.service.js
→ evidence-level metric orchestration

incident.service.js
→ incident lifecycle

policy.engine.js
→ action authorization rules

restart-pod.action.js
→ typed pod restart

audit.repository.js
→ audit persistence
```

---

# 33. Documentation

When behavior changes, update the relevant documentation.

Do not document future behavior as if it already works.

Use explicit labels:

```text
Implemented
Planned
Requires external configuration
Not yet enabled
```

---

# 34. Autonomous operation

Do not ask the user:

> Which function name should I use?

> Which file should contain this helper?

> Should I use async/await?

> Should this be a service?

Make conventional engineering decisions.

Ask only when the answer materially affects:
- production safety;
- external credentials;
- destructive behavior;
- business requirements;
- legal/compliance requirements;
- irreversible architecture.

---

# 35. Phase discipline

Do not jump ahead.

If Phase 2 is active, do not build the complete AI system.

Finish the current foundation, verify it, then proceed.

The target structure is a roadmap, not an instruction to create speculative implementations.

---

# 36. Completion reporting

After each phase, record:

```text
Phase:
Status:
Implemented:
Files changed:
Tests:
Verification:
Known limitations:
Next phase:
```

Keep the report factual and concise.

---

# 37. Stop conditions

Stop and ask the user only if:

1. A real secret/credential is required.
2. A production-destructive action requires authorization.
3. A business requirement cannot be inferred.
4. Two requirements directly conflict.
5. The existing repository contains an intentional architecture that directly conflicts with the specification and cannot safely be reconciled.

Otherwise continue autonomously.

---

# 38. Final anti-hallucination rule

Never fill missing information with invented facts.

If something is unknown:

```text
unknown
```

is better than a fabricated implementation.

Use:

```text
TODO: requires external configuration
```

or:

```text
Not configured
```

where appropriate.

The system must be honest about what it knows, what it measured, what it inferred, and what it could not verify.
