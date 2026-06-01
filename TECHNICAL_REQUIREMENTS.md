# OpsQuest — Technical Requirements & Manual Setup Guide

## Overview

OpsQuest is a full-stack Next.js 16 + React 19 application with a dark sci-fi UI for IT operations management.

---

## Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 16, React 19, TypeScript    |
| Styling     | Tailwind CSS v4                     |
| Charts      | Recharts 3                          |
| Icons       | Lucide React                        |
| Animations  | Framer Motion                       |
| Database    | Supabase (PostgreSQL)               |
| Auth        | Supabase Auth                       |
| Deployment  | Vercel (recommended)                |
| AI (opt.)   | OpenAI API / Ollama (local)         |

---

## ⚠️ Things That Need to Be Done Manually

### 1. Supabase Setup (REQUIRED for live data)

> Currently the app runs on mock data. To connect a real database:

**Steps:**
1. Go to [supabase.com](https://supabase.com) → Sign up / Log in
2. Click **New Project** → Choose organization, give it a name (e.g. `opsquest`), set a strong database password, choose a region closest to you
3. Wait for the project to be provisioned (~2 minutes)
4. Go to **Settings → API**
5. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`
6. Go to **SQL Editor** in Supabase
7. Open `supabase-schema.sql` from this project
8. Paste the entire SQL file and click **Run**
9. This creates all tables, indexes, RLS policies, and triggers
10. Copy `.env.local.example` → `.env.local` and fill in your Supabase values

---

### 2. Supabase Authentication Setup (REQUIRED for login)

1. In Supabase → **Authentication → Providers**
2. Enable **Email** provider (already on by default)
3. Optional: Enable **Google** or **Microsoft (Azure AD)** OAuth:
   - For Google: Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
   - For Microsoft: Register app in [Azure Portal](https://portal.azure.com) → Microsoft Entra ID → App Registrations
4. Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`
5. In Supabase → **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (dev) or your Vercel domain (prod)
   - Redirect URLs: add your domain

---

### 3. OpenAI API Key (OPTIONAL — Enhanced AI Solver)

> Without this, the Problem Solver uses keyword matching only (still works well).

1. Go to [platform.openai.com](https://platform.openai.com) → API Keys → Create new key
2. Add to `.env.local` as `OPENAI_API_KEY`
3. Recommended model: `gpt-4o-mini` (fast + cheap for this use case)
4. Set a usage limit in OpenAI dashboard to avoid surprise bills

**Alternatively — Free Local AI (Ollama):**
1. Install [Ollama](https://ollama.ai)
2. Run `ollama pull llama3.2`
3. Update the solver API route to hit `http://localhost:11434/api/chat`

---

### 4. Vercel Deployment (RECOMMENDED)

1. Push code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial OpsQuest build"
   git remote add origin https://github.com/your-org/opsquest.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Select your repository
4. In **Environment Variables**, add all variables from `.env.local`
5. Click **Deploy**
6. Update Supabase → Authentication → Site URL to your Vercel domain

---

### 5. Running Locally

```bash
# From the opsquest/ directory:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

For production build:
```bash
npm run build
npm run start
```

---

### 6. System Monitoring Integration (For Real Infrastructure Data)

To replace mock node data with real infrastructure metrics:

#### Option A — Agent-Based (Recommended)
1. Install **Telegraf** or **Node Exporter** on each server
2. Configure them to POST metrics to `/api/metrics` endpoint (to be built)
3. Store metrics in `node_metrics` Supabase table

#### Option B — Azure Monitor Integration
1. Create an Azure Monitor workspace
2. Use Azure Monitor REST API to pull VM metrics
3. Set up a cron job (or Vercel CRON) to poll and store in Supabase every 5 minutes

#### Option C — SNMP Polling
1. Enable SNMP on network devices
2. Use an SNMP poller (LibreNMS, PRTG) and webhook to OpsQuest API

---

## 📁 Project File Structure

```
opsquest/
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← Root layout with Sidebar
│   │   ├── page.tsx                ← Command Center Dashboard
│   │   ├── solver/page.tsx         ← Problem Solver Console
│   │   ├── tickets/page.tsx        ← Ticket War Room
│   │   ├── admin/page.tsx          ← Knowledge Lab
│   │   ├── predictor/page.tsx      ← Issue Predictor
│   │   ├── gamification/page.tsx   ← XP & Leaderboard
│   │   ├── docs/
│   │   │   ├── page.tsx            ← Docs Hub
│   │   │   ├── ms365/page.tsx      ← M365 Admin Guide
│   │   │   ├── azure/page.tsx      ← Azure Guide
│   │   │   ├── sap/page.tsx        ← SAP S/4HANA Guide
│   │   │   └── devops/page.tsx     ← DevOps Guide
│   │   └── api/
│   │       ├── solutions/route.ts  ← GET search, POST new
│   │       ├── tickets/route.ts    ← GET list, POST create
│   │       └── predict/route.ts    ← GET predictions
│   ├── components/
│   │   ├── layout/Sidebar.tsx
│   │   ├── layout/TopBar.tsx
│   │   ├── dashboard/ (StatsGrid, NetworkNodes, AlertsPanel, RecentTickets)
│   │   ├── solver/ProblemSolverConsole.tsx
│   │   ├── tickets/TicketWarRoom.tsx
│   │   ├── admin/AdminKnowledgeLab.tsx
│   │   ├── predictor/IssuePredictor.tsx
│   │   ├── gamification/GamificationHub.tsx
│   │   └── docs/DocSection.tsx
│   ├── lib/
│   │   ├── mock-data.ts            ← Sample data (replace with Supabase)
│   │   ├── solver-engine.ts        ← Keyword-matching NLP engine
│   │   └── supabase.ts             ← Supabase client
│   └── types/index.ts              ← TypeScript type definitions
├── supabase-schema.sql             ← Database schema (run in Supabase)
├── .env.local.example              ← Environment variable template
└── TECHNICAL_REQUIREMENTS.md      ← This file
```

---

## 🔐 Credentials Checklist

| Credential | Where to Get | Where to Put | Required? |
|---|---|---|---|
| Supabase Project URL | supabase.com → Settings → API | `.env.local` | For live DB |
| Supabase Anon Key | supabase.com → Settings → API | `.env.local` | For live DB |
| Supabase Service Role Key | supabase.com → Settings → API | `.env.local` (server only) | For admin ops |
| OpenAI API Key | platform.openai.com | `.env.local` | Optional (AI Solver) |
| Vercel Token | vercel.com (CI/CD) | GitHub Secrets | For auto-deploy |
| Google OAuth (optional) | Google Cloud Console | Supabase Auth settings | Optional login |
| Microsoft OAuth (optional) | Azure App Registration | Supabase Auth settings | Optional login |

---

## 🚀 Next Development Steps

1. **Replace mock data** with Supabase queries in each page
2. **Add real auth** — wrap pages with Supabase session check
3. **Build ticket form** — full create-ticket flow with system info capture
4. **Add real monitoring** — integrate with Azure Monitor or agent-based collectors
5. **Enhance Problem Solver** — add OpenAI for natural language understanding
6. **Add email notifications** — Supabase webhooks → Resend/SendGrid for ticket updates
7. **Add MS Teams bot** — for alert notifications directly in Teams channels

---

## 🧰 Development Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```
