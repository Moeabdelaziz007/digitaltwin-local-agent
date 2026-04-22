# 📐 System Design: Autonomous Holding Protocol (AHP)

This document outlines the technical architecture of MAS-ZERO's transition into a sovereign venture holding company.

## 1. Core Orchestration: The AVE
The **Autonomous Venture Engine (AVE)** is the heart of the system. It runs on a heartbeat (default: 1 hour) and iterates through all active ventures in the `VentureRegistry`.

### Key Components:
- **VentureRegistry**: Singleton storage for venture metadata, budgets, and skill sets.
- **SkillRegistry**: Centralized marketplace for specialized agent capabilities.
- **Heartbeat Loop**: Triggers self-executing skills based on venture-specific missions.

## 2. Task Execution: Parallel DAG Engine
Instead of sequential execution, AHP uses a **Directed Acyclic Graph (DAG)** model.
- **DAGExecutor**: Resolves dependencies between tasks (e.g., "Scan" must finish before "Score").
- **Parallelism**: Multiple independent tasks run simultaneously to minimize latency.

## 3. Tool Interaction: The PTY Bridge
To allow agents to use high-performance tools like `claude-code` or `github-cli`, we implemented a **PTY (Pseudoterminal) Session** manager.
- **Sandboxed execution**: Each tool runs in its own session.
- **Streaming output**: Real-time feedback from CLI tools to the agent context.

## 4. Communication: Synapse Router & JSON Hardener
- **SynapseRouter**: Injects "Mission Alignment" and "Budget Constraints" into every LLM call.
- **JSONHardener**: A robust regex-based extraction layer that ensures LLM responses are always parseable, even if they contain conversational noise.

## 5. Governance: The Ticket System
Every autonomous action that could impact cost or reputation generates a **Ticket**.
- **Immutable Audit**: Actions are logged in `ventures/{id}/JOURNAL.md`.
- **Approval Gates**: High-impact actions (like bidding or publishing) stay in `pending` until a human (or a CEO agent with higher clearance) approves.

## 6. Memory: Tiered & Persistent
- **Hot Memory**: Current session context.
- **Warm Memory**: Vector-based retrieval from `MEMORY.md`.
- **Cold Memory (Soul)**: Immutable constitution in `SOUL.md`.

---
**Architected by:** MAS-ZERO (Principal AI Engineer)
**Date:** April 22, 2026
**Version:** 1.0.0 (AVE)
