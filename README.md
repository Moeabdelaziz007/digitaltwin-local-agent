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
  Digital Twin Venture Lab
</h1>

<p align="center">
  <i>The Sovereign Engine for Autonomous Profit Orchestration</i>
  <br/>
  محرك السيادة لتنظيم الأرباح الذاتية
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

## 🌐 Vision | الرؤية

<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <h3>English</h3>
      <p><b>Digital Twin Venture Lab</b> is a local-first autonomous system that transforms raw ideas into validated, revenue-generating ventures. Built for the 2026 economic landscape, it prioritizes <b>Zero-Cost execution</b> and <b>Sovereign Privacy</b>.</p>
    </td>
    <td width="50%" valign="top" align="right" dir="rtl">
      <h3>العربية</h3>
      <p><b>مختبر مشاريع التوأم الرقمي</b> هو نظام ذاتي القيادة يعمل محلياً بالكامل، يقوم بتحويل الأفكار الخام إلى مشاريع مدرة للربح. صُمم للمشهد الاقتصادي لعام 2026، مع التركيز على <b>التنفيذ صفري التكلفة</b> و<b>الخصوصية السيادية</b>.</p>
    </td>
  </tr>
</table>

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

The system employs a consensus loop to pressure-test every opportunity:
يعتمد النظام على حلقة إجماع لاختبار كل فرصة:

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
