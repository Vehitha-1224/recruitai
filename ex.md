Perfect! Here is your complete deployment guide — free, beginner friendly, for public users. 🚀

---

# 🗺️ The Deployment Plan

```
YOUR PROJECT
     │
     ├── Frontend (React)   → Vercel        (Free)
     ├── Backend (FastAPI)  → Render        (Free)
     └── Database           → Neon          (Free PostgreSQL)
```

---

# Why These 3 Platforms?

| Platform | What It Hosts | Why We Chose It |
|---|---|---|
| **Neon** | PostgreSQL Database | Free, no credit card, built for beginners |
| **Render** | FastAPI Backend | Free Python hosting, easy setup |
| **Vercel** | React Frontend | Best free React hosting in the world |

---

# 📄 File 47 — `README.md`
### Location: `recruitment-platform/README.md`

```markdown
# RecruitAI — AI Powered Recruitment Platform

Smart hiring platform with AI-based resume screening and candidate ranking.

## Tech Stack
- Frontend: React.js
- Backend: FastAPI (Python)
- Database: PostgreSQL (Neon)
- AI: spaCy NLP

## Local Development

### 1. Database (Neon)
Create free account at https://neon.tech

### 2. Backend
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload --port 8000

### 3. Frontend
cd frontend
npm install
npm start
```

---

# PHASE 1 — Database Setup with Neon 🗄️

## Step 1 — Create Neon Account

1. Go to 👉 **https://neon.tech**
2. Click **"Sign Up Free"**
3. Sign up with your **GitHub account** (easiest)
4. Click **"Create Project"**
5. Give it a name: `recruitai`
6. Region: Choose **closest to India** (Singapore or Mumbai)
7. Click **"Create Project"**

---

## Step 2 — Get Your Database URL

After creating the project, Neon shows you a page with connection details.

1. Click **"Connection string"**
2. You will see something like this:
```
postgresql://username:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```
3. **Copy this entire string** — you need it in the next steps

---

## Step 3 — Create Tables

1. In Neon dashboard, click **"SQL Editor"** on the left
2. Paste this SQL and click **Run:**

```sql
CREATE TABLE IF NOT EXISTS jobs (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(255)    NOT NULL,
    description     TEXT            NOT NULL,
    skills_required TEXT[]          NOT NULL DEFAULT '{}',
    salary_min      INTEGER,
    salary_max      INTEGER,
    location        VARCHAR(255),
    job_type        VARCHAR(50)     NOT NULL DEFAULT 'full-time',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(255)    NOT NULL,
    email            VARCHAR(255)    NOT NULL,
    resume_path      VARCHAR(500)    NOT NULL,
    ai_score         FLOAT,
    status           VARCHAR(50)     NOT NULL DEFAULT 'applied',
    skills           TEXT[]          NOT NULL DEFAULT '{}',
    experience_years FLOAT,
    education        VARCHAR(500),
    resume_text      TEXT,
    job_id           INTEGER         NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (email, job_id)
);

CREATE TABLE IF NOT EXISTS interviews (
    id               SERIAL PRIMARY KEY,
    candidate_id     INTEGER         NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id           INTEGER         NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    scheduled_at     TIMESTAMPTZ     NOT NULL,
    interviewer_name VARCHAR(255)    NOT NULL,
    status           VARCHAR(50)     NOT NULL DEFAULT 'scheduled',
    notes            TEXT,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_job_id    ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status    ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_ai_score  ON candidates(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON interviews(scheduled_at);
```

You should see **"Success"** — database is ready! ✅

---

# PHASE 2 — Backend Deployment on Render ⚙️

## Step 1 — Push Code to GitHub First

```bash
# # Run these commands in your project root folder
cd recruitment-platform

git init
git add .
git commit -m "Initial commit — RecruitAI"
```

1. Go to 👉 **https://github.com**
2. Click **"New repository"**
3. Name it: `recruitai`
4. Click **"Create repository"**
5. GitHub shows you commands — run them:

```bash
git remote add origin https://github.com/YOURUSERNAME/recruitai.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Deploy Backend on Render

1. Go to 👉 **https://render.com**
2. Click **"Sign Up"** → use GitHub account
3. Click **"New +"** → **"Web Service"**
4. Click **"Connect a repository"**
5. Select your `recruitai` repo
6. Fill in these settings:

```
Name:          recruitai-backend
Branch:        main
Root Directory: backend
Runtime:       Python 3
Build Command: pip install -r requirements.txt && python -m spacy download en_core_web_sm
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

---

## Step 3 — Add Environment Variables on Render

On Render, scroll down to **"Environment Variables"** and add these one by one:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string from Phase 1 |
| `DEBUG` | `False` |
| `UPLOAD_DIR` | `uploads` |
| `MAX_FILE_SIZE_MB` | `5` |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` (update after Vercel deploy) |

Click **"Create Web Service"** — Render builds and deploys automatically.

After deploy, Render gives you a URL like:
```
https://recruitai-backend.onrender.com
```

**Copy this URL** — you need it for frontend.

---

## Step 4 — Add `render.yaml` File

### Location: `recruitment-platform/backend/render.yaml`

```yaml
services:
  - type: web
    name: recruitai-backend
    runtime: python
    rootDir: backend
    buildCommand: |
      pip install -r requirements.txt
      python -m spacy download en_core_web_sm
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DEBUG
        value: "False"
      - key: UPLOAD_DIR
        value: uploads
      - key: MAX_FILE_SIZE_MB
        value: "5"
```

---

# PHASE 3 — Frontend Deployment on Vercel 🎨

## Step 1 — Add Environment File

### Location: `recruitment-platform/frontend/.env.production`

```env
# # This is the Render backend URL you got in Phase 2
REACT_APP_API_URL=https://recruitai-backend.onrender.com
```

---

## Step 2 — Deploy on Vercel

1. Go to 👉 **https://vercel.com**
2. Click **"Sign Up"** → use GitHub account
3. Click **"Add New Project"**
4. Select your `recruitai` repo
5. Fill in these settings:

```
Framework Preset: Create React App
Root Directory:   frontend
Build Command:    npm run build
Output Directory: build
```

6. Click **"Environment Variables"** and add:

| Key | Value |
|---|---|
| `REACT_APP_API_URL` | `https://recruitai-backend.onrender.com` |

7. Click **"Deploy"**

Vercel gives you a URL like:
```
https://recruitai.vercel.app
```

---

## Step 3 — Update Backend CORS

Go back to **Render → Environment Variables** and update:

```
ALLOWED_ORIGINS = https://recruitai.vercel.app
```

Click **"Save"** — Render redeploys automatically.

---

# 📄 File 48 — `.gitignore`
### Location: `recruitment-platform/.gitignore`

```gitignore
# ── PYTHON ────────────────────────────────────────────────────────
__pycache__/
*.py[cod]
*.pyo
.env
venv/
env/
.venv/

# ── UPLOADS ───────────────────────────────────────────────────────
# # Never commit uploaded resumes to GitHub
backend/uploads/

# ── NODE ──────────────────────────────────────────────────────────
node_modules/
frontend/build/
.env.local
.env.production.local

# ── OS FILES ──────────────────────────────────────────────────────
.DS_Store
Thumbs.db

# ── IDE ───────────────────────────────────────────────────────────
.vscode/settings.json
.idea/
```

---

# The Complete Flow After Deployment

```
User visits https://recruitai.vercel.app
           ↓
React app loads from Vercel
           ↓
HR uploads a resume
           ↓
React sends PDF to https://recruitai-backend.onrender.com
           ↓
FastAPI receives it, parses PDF, scores with AI
           ↓
Saves candidate to Neon PostgreSQL
           ↓
Returns scored candidate to React
           ↓
HR sees candidate with AI score on screen
```

---

# ⚠️ Important Free Tier Limits

| Platform | Free Limit | What Happens When Exceeded |
|---|---|---|
| **Neon** | 0.5 GB storage, 1 project | Just upgrade plan — cheap |
| **Render** | Server sleeps after 15 mins inactivity | First request is slow (30 sec wakeup) |
| **Vercel** | 100 GB bandwidth/month | More than enough for personal project |

---

# 🚨 One Important Thing About Render Free Tier

Render free tier **sleeps your backend** after 15 minutes of no requests.

First visit after sleep = **30 second loading time**.

**Fix this for free:**

1. Go to 👉 **https://cron-job.org**
2. Create free account
3. Create a new cron job:
   - URL: `https://recruitai-backend.onrender.com/health`
   - Schedule: Every 14 minutes
4. This pings your backend every 14 minutes → keeps it awake

---

# Complete Deployment Checklist ✅

```
PHASE 1 — Database
□ Created Neon account
□ Created recruitai project
□ Copied connection string
□ Ran SQL to create tables

PHASE 2 — Backend
□ Pushed code to GitHub
□ Created Render account
□ Connected GitHub repo
□ Set build and start commands
□ Added all environment variables
□ Backend URL noted

PHASE 3 — Frontend
□ Created .env.production with backend URL
□ Created Vercel account
□ Connected GitHub repo
□ Added REACT_APP_API_URL variable
□ Frontend URL noted
□ Updated ALLOWED_ORIGINS in Render

AFTER DEPLOYMENT
□ Visit frontend URL — app loads
□ Visit backend URL/health — shows healthy
□ Visit backend URL/docs — shows API docs
□ Create a test job posting
□ Upload a test resume
□ Set up cron-job.org to keep backend awake
```

---

# Summary

| What | Platform | URL Format |
|---|---|---|
| Database | Neon | `postgresql://...@neon.tech/neondb` |
| Backend | Render | `https://recruitai-backend.onrender.com` |
| Frontend | Vercel | `https://recruitai.vercel.app` |
| API Docs | Render | `https://recruitai-backend.onrender.com/docs` |

**Your entire app is free, public, and live on the internet! 🌍**

---

Follow the 3 phases in order and your app will be live. If you get stuck at any specific step, tell me exactly where and I will help you fix it! 💪