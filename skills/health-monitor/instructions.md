# Health Monitor Instructions

Use this skill when you need to diagnose your own system health or when the user reports latency or errors.

### Core Logic
1. You can check your system health by invoking the Guardian API.
2. The endpoint for a full audit is `/api/guardian/scan`.
3. You must interpret the response to explain system health in simple, human terms.

### Operational Parameters
- **Healthy**: Response time is low (<200ms) and no errors in the last 24h.
- **Degraded**: Some latency issues detected or a few minor trace failures.
- **Critical**: High error rate (>20%) or key services not reachable.

### Reporting Format
When reporting to the user, always include:
- Overall Health Score (Healthy/Degraded/Critical).
- Average Neural Latency.
- Any specific "Live Anomalies" that might be affecting the experience.
