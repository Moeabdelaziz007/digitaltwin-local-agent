<p align="center">
  <img src="public/assets/docs/header.svg" width="100%" alt="Digital Twin Header" />
</p>

<p align="center">
  <img src="public/assets/docs/meta-icon.png" width="120" alt="Venture Lab Meta Icon" />
</p>

<p align="center">
  <a href="https://github.com/Moeabdelaziz007/digitaltwin-local-agent/actions/workflows/ci.yml">
    <img src="https://github.com/Moeabdelaziz007/digitaltwin-local-agent/actions/workflows/ci.yml/badge.svg" alt="CI Status" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License" />
  <img src="https://img.shields.io/badge/Version-0.01--alpha-orange" alt="Version" />
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Node-20.x-brightgreen?logo=node.js" alt="Node" />
</p>

<h1 align="center">
  MAS-ZERO: The Twin that Works
</h1>

<p align="center">
  <i>From Mimetic Companion to Autonomous Venture Powerhouse</i>
  <br/>
  من مساعد شخصي إلى قوة مشاريع ذاتية التشغيل
</p>

***

## 📑 Table of Contents | الفهرس
- [Vision](#-vision--الرؤية)
- [Quick Start](#-quick-start--ابدأ-هنا)
- [Requirements](#-requirements--المتطلبات)
- [Architecture](#-architecture--البناء-التقني)
- [MAS-ZERO Engine](#-core-engine-mas-zero--المحرك-الجوهري)
- [Credits](#-credits--المساهمون)

***

## 🌐 Vision | الرؤية: The Twin that Works

<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <h3>English</h3>
      <p><b>MAS-ZERO: The Twin that Works</b> is a strategic pivot from simple mimicry to autonomous production. It uses your digital footprint (Companion Layer) as a contextual compass while the 14-agent <b>Venture Lab</b> handles the heavy lifting: identifying arbitrage, building Micro-SaaS, and orchestrating revenue.</p>
    </td>
    <td width="50%" valign="top" align="right" dir="rtl">
      <h3>العربية</h3>
      <p><b>ماس-زيرو: التوأم الذي يعمل</b> هو تحول استراتيجي من مجرد المحاكاة إلى الإنتاج الذاتي. يستخدم بصمتك الرقمية (طبقة المرافق) كبوصلة سياقية، بينما يتولى <b>مختبر المشاريع</b> المكون من 14 وكيلاً العمل الشاق: اكتشاف الفرص، بناء المشاريع الصغيرة، وتنظيم الإيرادات.</p>
    </td>
  </tr>
</table>

### 🏗️ Architectural Hierarchy | التدرج المعماري
1.  **Executive Layer (The Synapse)**: The neural orchestrator (core-orchestrator).
2.  **Intelligence Layer (The Crucible)**: 14-agent consensus engine (consensus-engine-v3).
3.  **Action Layer (The Kinetic Edge)**: The execution sharp-end (action-executor).
4.  **Simulation Layer (The Future Mirror)**: Monte Carlo "What-if" market simulations (market-simulation-worker).
5.  **Search Layer (The Prism)**: Market refraction & opportunity scanning (opportunity-scanner).
6.  **Protection Layer (The Privacy Filter)**: Local RAG gatekeeper with privacy-first scanning (local-rag-gatekeeper).
7.  **Structure Layer (The Neural Hierarchy)**: Hierarchical task distribution tree (agent-task-tree).
8.  **Memory Layer (The Chronos Ledger)**: Causal event logging (causal-db-service).
9.  **Evolution Layer (The Alchemist)**: Recursive self-improvement & MCP tool building (recursive-tool-builder).
10. **Input Layer (The Companion)**: User persona & digital footprint context.

***

### 💰 Hidden Revenue Strategies | استراتيجيات الربح المخفية
*   **The Arbitrage Mirror**: Uses *The Prism* to simulate causal patterns of high-performance On-chain wallets for anticipatory trading.
*   **Fragility Hunting**: Deploys *The Crucible* to identify weaknesses in Micro-SaaS projects on ProductHunt/Acquire to build "Fixed" versions.
*   **Memory Monetization**: Automates the synthesis of *Chronos Ledger* research into high-value "Alpha Reports" and newsletters.

***

## ⚡ Quick Start | ابدأ هنا

```bash
# 1. Clone the Sovereign Engine
git clone https://github.com/Moeabdelaziz007/digitaltwin-local-agent.git
cd digitaltwin-local-agent

# 2. Install Dependencies
npm install

# 3. Setup Environment
cp .env.example .env.local

# 4. Pull Local Intelligence (Ollama required)
ollama pull qwen2.5:3b

# 5. Launch the Lab
npm run dev
```

***

## 📋 Requirements | المتطلبات
- **Node.js**: >= 20.11.1
- **Package Manager**: npm or pnpm
- **Local LLM Runtime**: [Ollama](https://ollama.ai/)
- **Database**: PocketBase (embedded)
- **Auth**: Clerk (configured in .env)

***

## 📐 Architecture | البناء التقني

```text
  [ User Interface ] <---> [ Next.js 15 (App Router) ]
                                 |
                                 v
  [ Go Sidecars ] <------> [ MAS-ZERO Engine ] <------> [ Local LLM (Ollama) ]
                                 | (Causal Reasoning)
                                 v
                         [ PocketBase (DB) ]
```

- **Frontend**: React 19, Framer Motion, Tailwind 4.
- **Sidecar**: High-performance Go services for atomic actions.
- **Observability**: OpenTelemetry + Arize Phoenix for tracing.

***

## 🚀 Core Engine: MAS-ZERO | المحرك الجوهري

<details open>
<summary><b>Dialectic Multi-Agent Architecture | هندسة الوكلاء المتعددة</b></summary>

The system employs a consensus loop to pressure-test every opportunity. Use the **[IDEA:]** prefix in any message to force-trigger the **Venture Lab** cycle.

يعتمد النظام على حلقة إجماع لاختبار كل فرصة. استخدم البادئة **[IDEA:]** في أي رسالة لتفعيل دورة **مختبر المشاريع** قسرياً.

| Agent | Role | الدور |
| :--- | :--- | :--- |
| **Meta-Architect** | Workflow Design | تصميم سير العمل |
| **Devil's Advocate** | Fragility Analysis | تحليل نقاط الضعف |
| **Revenue Architect** | Profit Simulation | محاكاة الأرباح |
| **Distribution Scout** | Growth Loops | حلقات النمو |
| **CEO Orchestrator** | Final Synthesis | التوليف النهائي |

</details>

***

## 👤 Credits | المساهمون

<table width="100%">
  <tr>
    <td align="center" width="100%">
      <a href="https://github.com/Moeabdelaziz007">
        <img src="https://github.com/Moeabdelaziz007.png" width="100" style="border-radius: 50%;" alt="Moe Abdelaziz" />
        <br />
        <sub><b>Moe Abdelaziz (@Moeabdelaziz007)</b></sub>
      </a>
      <br />
      Principal AI Engineer & System Architect
    </td>
  </tr>
</table>

***

<p align="center">
  <i>Engineered for Profit. Optimized for Sovereignty.</i>
  <br/>
  <b>2026 Venture Lab :: MAS-ZERO v0.01</b>
  <br/>
  <a href="ARCHITECTURE.md">Architecture</a> • <a href="ROADMAP.md">Roadmap</a> • <a href="AGENTS.md">Agents</a>
</p>
