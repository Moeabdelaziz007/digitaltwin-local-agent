<p align="center">
  <img src="public/assets/docs/meta-icon.png" width="120" alt="MAS-ZERO AHP Logo" />
</p>

<p align="center">
  <a href="#-quickstart">Quickstart</a> · <a href="docs/architecture.md">Docs</a> · <a href="https://github.com/Moeabdelaziz007/digitaltwin-local-agent">GitHub</a> · <a href="#-credits">Credits</a>
</p>

<p align="center">
  <b>🚀 Status: Operational Alpha (v1.1.0)</b><br/>
  <b>MIT License · ★ 2 · Active Development</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AHP-Active-brightgreen" alt="AHP" />
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Local--First-Sovereign-blue" alt="Local First" />
  <img src="https://img.shields.io/badge/Revenue-6_Rivers-gold" alt="Revenue" />
</p>

***

# 🤖 MAS-ZERO: The Autonomous Holding Protocol
### *Open-Source Orchestration for Zero-Human Venture Portfolios*
### *أوركسترا مفتوحة المصدر لإدارة محافظ المشاريع ذاتية التشغيل*

**If OpenClaw is an employee, MAS-ZERO is the Holding.**  
**إذا كان OpenClaw هو الموظف، فإن MAS-ZERO هو الشركة القابضة.**

MAS-ZERO is a modern Local-First AI venture engine built with Next.js 15, Go sidecars, PocketBase, LiveKit, Clerk, and local LLMs. It orchestrates specialized agents, enforces budgets, and evolves through genetic algorithms.

MAS-ZERO هو محرك مشاريع ذكي محلي الأولوية مبني بـ Next.js 15، Sidecar بلغة Go، PocketBase، LiveKit، Clerk، ونماذج محلية. يدير وكلاء متخصصين، يطبق حدود الميزانية، ويتطور عبر الخوارزميات الجينية.

---

## ⚡ Step-by-Step Logic | آلية العمل

| Step | Action | English | العربية |
| :--- | :--- | :--- | :--- |
| **01** | **Define** | Identify a market gap via the **Validation Vortex**. | تحديد فرصة في السوق عبر "دوامة التحقق". |
| **02** | **Hire** | Deploy Specialized ISkills (Sniper, Marketer, Builder). | نشر مهارات متخصصة (القناص، المسوق، المطور). |
| **03** | **Evolve** | Use **Evolutionary Memory** to refine strategy over time. | استخدام "الذاكرة التطورية" لتحسين الإستراتيجية ذاتياً. |
| **04** | **Run** | **Autonomous Kill Chain** manages approvals and budget. | "سلسلة القتل المستقلة" تدير الموافقات والميزانية. |

---

## 🏗️ Architecture | المعمارية التقنية

```mermaid
graph TD
    subgraph UI_Layer [Sovereign Control Plane]
        A[Venture Lab UI] --> B[Next.js 15 App Router]
        C[Profit Dashboard] --> B
    end

    subgraph Orchestration [Autonomous Venture Engine - AVE]
        B --> D[Unified ISkill Registry]
        D --> E[Quantum Mirror Simulation]
        E --> F[The Autonomous Kill Chain]
    end

    subgraph Learning_Layer [Self-Improvement Meta-Loop]
        F --> G[Evolutionary Memory]
        G --> H[Prompt DNA Crossover]
        H --> D
    end

    subgraph Agency_Pool [Hardened ISkill Suite]
        F --> I[Market Sniper]
        F --> J[Validation Vortex]
        F --> K[Content Multiplier]
        F --> L[Vercel Deployer]
    end

    subgraph Integrity [Governance & Memory]
        F --> M[Ticket System / Audit]
        M --> N[PocketBase Ledger]
        F --> O[Budget Cannibalism]
    end

    subgraph Intelligence [Local Intelligence]
        I & J & K & L --> P[Ollama / Gemma 2]
        K --> Q[PTY Bridge / CLI Control]
    end
```

---

## ✨ Features | المميزات الذكية

- **🔌 Unified ISkill Interface**: Standardized 6-stage lifecycle for all agents.  
  **🔌 واجهة ISkill الموحدة**: دورة حياة من 6 مراحل لجميع الوكلاء.
- **🛡️ The Autonomous Kill Chain**: Self-governing board that kills bad tasks and auto-approves profit.  
  **🛡️ سلسلة القتل المستقلة**: مجلس إدارة ذاتي يقتل المهام الفاشلة ويعتمد المربحة.
- **🌪️ Validation Vortex**: 5-day automated funnel to kill bad ideas fast.  
  **🌪️ دوامة التحقق**: مسار آلي من 5 أيام لقتل الأفكار السيئة بسرعة.
- **🧬 Evolutionary Memory**: Genetic algorithms for prompt optimization and strategy evolution.  
  **🧬 الذاكرة التطورية**: خوارزميات جينية لتحسين التعليمات وتطور الإستراتيجية.
- **💰 Budget Cannibalism**: Automated capital redirection from failing skills to winners.  
  **💰 افتراس الميزانية**: إعادة توجيه الميزانية آلياً من الوكلاء الفاشلين للناجحين.
- **⚡ Vercel Official Skill**: Automated zero-human deployment and scaling.  
  **⚡ مهارة Vercel الرسمية**: نشر وتوسع آلي بدون تدخل بشري.
- **🧪 Quantum Mirror**: Multi-persona simulations for risk/ROI assessment.  
  **🧪 المحاكاة الكمية**: محاكاة لتقييم المخاطر والعوائد قبل التنفيذ.

---

## 📁 Project Structure | هيكل المشروع

- `src/` — Next.js app, API routes, skill registry, conversation engine, and orchestration logic.  
  `src/` — تطبيق Next.js، مسارات API، سجل المهارات، محرك المحادثة، ومنطق التنسيق.
- `sidecar/` — Go sidecar runtime for speech, desktop observation, and local execution.  
  `sidecar/` — منفذ Go لتنفيذ الصوت، المراقبة، والتشغيل المحلي.
- `pb_schema.json` — PocketBase schema and access rules for private user storage.  
  `pb_schema.json` — مخطط قواعد الوصول الخاصة بـ PocketBase.
- `docs/` — architecture, security, roadmap, contributing, and Browserbase guides.  
  `docs/` — وثائق المعمارية، الأمن، خريطة الطريق، المساهمة، ودليل Browserbase.
- `scripts/` — env checks, contract generation, smoke tests, and quality gates.  
  `scripts/` — فحوصات البيئة، توليد العقود، اختبارات التنفس، وبوابات الجودة.
- `public/` — offline page, manifest, and documentation assets.  
  `public/` — صفحة عدم الاتصال، تعريف التطبيق، وأصول التوثيق.
- `plugins/` — developer workbench and plugin integration points.  
  `plugins/` — بيئة تطوير إضافية ونقاط تكامل المكونات الإضافية.
- `README_CONTRIBUTORS.md` — contributor guide for sidecar and native dependency setup.  
  `README_CONTRIBUTORS.md` — دليل المساهمين لإعداد Sidecar والاعتماديات.
- `.github/agents/deep-docs-review.agent.md` — workspace custom agent definition.  
  `.github/agents/deep-docs-review.agent.md` — تعريف وكيل مخصص للمستودع.
- `/home/codespace/.vscode-remote/data/User/prompts/deep-docs-review.agent.md` — user-level agent prompt file for local Copilot testing.  
  ملف وكيل المستوى الشخصي للاختبار المحلي في Copilot.

---

## 📚 Docs Snapshot | لمحة عن الوثائق

- `docs/architecture.md` — Local-first architecture, sidecar swarm, and security model.  
  `docs/architecture.md` — المعمارية المحلية، مجموعة Sidecar، ونموذج الأمن.
- `docs/SECURITY.md` — privacy-first controls, PII handling, and data storage guidance.  
  `docs/SECURITY.md` — التحكم في الخصوصية، التعامل مع المعلومات الحساسة، وإرشادات التخزين.
- `docs/CONTRIBUTING.md` — contribution flow, Clerk auth webhooks, and code review process.  
  `docs/CONTRIBUTING.md` — سير المساهمة، Webhook للتحقق من Clerk، وعملية المراجعة.
- `docs/roadmap.md` — milestone plan, sidecar execution phases, and future expansion.  
  `docs/roadmap.md` — خطة المعالم، مراحل Sidecar، والتوسع المستقبلي.
- `BROWSERBASE_GUIDE.md` — Browserbase proxy setup and session lifecycle.  
  `BROWSERBASE_GUIDE.md` — إعداد بروكسي Browserbase ودورة حياة الجلسات.
- `README_CONTRIBUTORS.md` — native sidecar build notes, FFmpeg, Whisper, and model setup.  
  `README_CONTRIBUTORS.md` — ملاحظات بناء Sidecar، FFmpeg، Whisper، وإعداد النماذج.

---

## 🚀 Quickstart | ابدأ هنا

### English
```bash
# 1. Clone the Sovereign Engine
git clone https://github.com/Moeabdelaziz007/digitaltwin-local-agent.git
cd digitaltwin-local-agent

# 2. Install & setup
npm install
cp .env.example .env.local

# 3. Pull local Ollama brain
ollama pull gemma2:9b

# 4. Launch the holding engine
npm run dev
```

### العربية
```bash
# 1. انسخ المشروع
git clone https://github.com/Moeabdelaziz007/digitaltwin-local-agent.git
cd digitaltwin-local-agent

# 2. ثبّت الحزم وجهز المتغيرات
npm install
cp .env.example .env.local

# 3. حمّل نموذج Ollama محليًا
ollama pull gemma2:9b

# 4. شغّل المشروع
npm run dev
```

---

## 🧪 Testing & Maintenance | الاختبار والصيانة

- `npm run typecheck` — TypeScript validation.  
  `npm run typecheck` — التحقق من أنواع TypeScript.
- `npm run lint` — lint and code quality checks.  
  `npm run lint` — فحوصات جودة الكود.
- `npm run verify` — environment and quality gate validation.  
  `npm run verify` — التحقق من البيئة وجودة المشروع.
- `npm test` — run Vitest test suite.  
  `npm test` — تشغيل مجموعة اختبارات Vitest.

---

## 👤 Credits | صاحب المشروع

<table width="100%">
  <tr>
    <td align="center" width="100%">
      <a href="https://github.com/Moeabdelaziz007">
        <img src="https://github.com/Moeabdelaziz007.png" width="150" style="border-radius: 50%; border: 3px solid #00ff00;" alt="Moe Abdelaziz" />
        <br />
        <sub><b>Moe Abdelaziz (@Moeabdelaziz007)</b></sub>
      </a>
      <br />
      <b>Principal System Architect & AI Pioneer</b><br />
      <i>"Building the future of autonomous value creation."</i><br />
      <a href="https://github.com/Moeabdelaziz007">Follow on GitHub</a>
    </td>
  </tr>
</table>

---

## 🗺️ Roadmap | خريطة الطريق

- [x] Autonomous Venture Engine (AVE) Core  
  ✅ المحرك الأساسي للمشاريع الذاتية.
- [x] The 6 Revenue Rivers (Alpha)  
  ✅ ستة مجالات دخل أولية.
- [x] Immutable Ticket System  
  ✅ نظام تذاكر غير قابل للتعديل.
- [ ] **MAXIMIZER MODE** (Self-scaling budgets)  
  ❗ وضع تحسين الميزانية الذاتي.
- [ ] **Clipmart** (One-click company templates)  
  ❗ قوالب شركات بنقرة واحدة.
- [ ] **Desktop Bridge** (Screen-aware proactive help)  
  ❗ جسر سطح المكتب للمساعدة الاستباقية.

---

<p align="center">
  <i>Engineered for Profit. Optimized for Sovereignty.</i><br />
  <b>2026 Venture Lab :: MAS-ZERO v1.1.0</b>
</p>
