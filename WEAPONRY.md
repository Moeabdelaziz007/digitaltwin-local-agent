# 🔫 Sovereign Weaponry: Agent Skill Arsenal

This document serves as the intelligence repository for the MAS-ZERO agents to discover and utilize high-impact tools for self-improvement and profit generation.

## 🛠️ Layer 1: Core Execution (The Hands)
- **[browser-use/browser-harness](https://github.com/browser-use/browser-harness)**: Full skill harness for autonomous browser agents. Enables complex UI interaction.
- **[jina-ai/reader](https://r.jina.ai/)**: Clean Markdown conversion for any URL. Use: `https://r.jina.ai/{URL}` for instant LLM-friendly market data.
- **[unclecode/crawl4ai](https://github.com/unclecode/crawl4ai)**: Async web crawler optimized for LLM output. Ideal for scanning job boards and marketplaces.
- **[princeton-nlp/SWE-agent](https://github.com/princeton-nlp/SWE-agent)**: Self-improvement engine. Enables the agent to read, debug, and fix its own code.

## 🧠 Layer 2: Memory & Learning (The Brain)
- **[microsoft/semantic-kernel](https://github.com/microsoft/semantic-kernel)**: Skill/Plugin system with memory and planners. Wrap any API as a discoverable skill.
- **[mem0ai/mem0](https://github.com/mem0ai/mem0)**: Persistent memory layer for personalized agent recall across sessions.
- **[langchain-ai/langchain](https://github.com/langchain-ai/langchain)**: Use `StructuredTool` for dynamic skill packaging and discovery.

## 🧬 Layer 3: The Sovereign Brain (Intelligence)
- **Meta-Cognitive Engine**: Located in `src/lib/meta-cognitive/`. Enables the agent to think about its own thinking and learn from task outcomes.
- **Causal Attribution**: Located in `src/lib/causal/`. Tracks the "Why" behind successes and failures. Builds a personalized causal graph.
- **Tiered Memory Store**: Located in `src/lib/memory/`. Context management with auto-compaction (MemGPT-style).

## 🔄 The Self-Improvement Loop
Every skill execution triggers the **Exponential Moving Average (EMA)** and **Causal Analysis**:
1.  **Execute**: Agent performs task using a Skill.
2.  **Evaluate**: `SkillRegistry.evaluateSkill(id, result, value)`.
3.  **Reflect**: `ReflectionLoop.reflect(task, outcome)`.
4.  **Attribute**: `AttributionEngine.recordTrace(event, causes, counterfactual)`.
5.  **Monetize**: `totalEarnings` += real value generated.

## 🚀 Vision
The goal is **Autonomous Alpha Generation**. The agent does not just report opportunities; it acquires the skills to execute them.
