-- # This file documents the database structure
-- # SQLAlchemy creates tables automatically from models
-- # But you can also run this manually in PostgreSQL

-- # Create database (run this in psql separately)
-- CREATE DATABASE recruitai;

-- ── JOBS TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
    id              SERIAL PRIMARY KEY,               -- # Auto-increment ID
    title           VARCHAR(255)    NOT NULL,
    description     TEXT            NOT NULL,
    skills_required TEXT[]          NOT NULL DEFAULT '{}',  -- # Array
    salary_min      INTEGER,
    salary_max      INTEGER,
    location        VARCHAR(255),
    job_type        VARCHAR(50)     NOT NULL DEFAULT 'full-time',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── CANDIDATES TABLE ──────────────────────────────────────────────
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
    -- # Prevent same person applying to same job twice
    UNIQUE (email, job_id)
);

-- ── INTERVIEWS TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interviews (
    id               SERIAL PRIMARY KEY,
    candidate_id     INTEGER         NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id           INTEGER         NOT NULL REFERENCES jobs(id)       ON DELETE CASCADE,
    scheduled_at     TIMESTAMPTZ     NOT NULL,
    interviewer_name VARCHAR(255)    NOT NULL,
    status           VARCHAR(50)     NOT NULL DEFAULT 'scheduled',
    notes            TEXT,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── INDEXES FOR PERFORMANCE ───────────────────────────────────────
-- # These make queries faster — especially filters and sorts
CREATE INDEX IF NOT EXISTS idx_candidates_job_id   ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status   ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_ai_score ON candidates(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON interviews(scheduled_at);