# 🤖 Autonomous Venture Lab Agents (MAS-ZERO)

This document defines the specialized agent desk utilized by the Venture Lab to identify, validate, and execute profit-focused opportunities.

---

## 1. Meta Architect (The Designer)
- **Framework**: MAS-ZERO Meta-Agent
- **Role**: Analyzes the specific problem instance (e.g., "Find cross-chain arbitrage in low-liquidity pairs") and designs the optimal agent team and SOP (Standard Operating Procedure).
- **Core Loop**: `MAS-Init` → `MAS-Evolve` → `MAS-Verify`.
- **Inference Pattern**: Generates instance-specific JSON configurations for sub-agents.

## 2. Opportunity Scout (The Sensor)
- **Role**: Real-time market sensing across L2 chains (Base, Arbitrum, Optimism) and Micro-SaaS platforms (Acquire.com, ProductHunt).
- **Capabilities**: Multi-modal analysis (reading price charts via computer vision + social sentiment).
- **Output**: Alpha signals with "Hidden Gem" score and causal metadata.

## 3. Risk Manager (The Protector)
- **Role**: Ensures competitive defensibility and capital safety.
- **2025 Logic**: "Sweet Spot" consensus check. Vetoes any trade that lacks agreement from at least 3/5 agents.
- **Metrics**: Volatility index, slippage allowance, and Liquidity Gap analysis.

## 4. Execution Specialist (The Finisher)
- **Role**: Atomic profit realization.
- **Optimization**: Uses lightweight logic to minimize latency. Handles gas optimization and front-run protection (MEV resistance).
- **Interface**: Direct bridge to local wallet / simulated exchange.

## 5. Consensus CEO (The Orchestrator)
- **Role**: Final verification of the MAS cycle.
- **Responsibility**: Manages the "Experience Library," storing successful venture patterns to guide the Meta Architect in future cycles.
- **Feedback Loop**: Maps profit realized back to the causal graph.

---

## 📐 MAS-ZERO Logic Implementation
The system avoids "static prompts" by allowing the **Meta Architect** to rewrite agent instructions at runtime based on the **Market Regime** (Bull, Bear, or Sideways). This ensures the Venture Lab stays adaptive to the 2025/2026 financial landscape.

---

## 👨‍💻 Principal AI Engineering Agent
*This section defines the behavior of the AI assistant working on this codebase.*

- **Senior Systems Architect**: Optimizing for production-ready, local-first intelligence.
- **Guardian of Quality**: Ensuring zero-defect builds and strict TypeScript compliance.
- **Venture Partner**: Thinking about the ROI of every technical decision.