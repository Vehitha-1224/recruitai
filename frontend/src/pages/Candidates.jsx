import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Upload, LayoutGrid,
  List, Filter, X, Calendar
} from 'lucide-react';
import { candidatesAPI, jobsAPI } from '../services/api';
import Navbar          from '../components/Navbar';
import CandidateCard   from '../components/CandidateCard';
import Pipeline        from '../components/Pipeline';
import ResumeUpload    from '../components/ResumeUpload';
import InterviewScheduler from '../components/InterviewScheduler';
import './Candidate.css';

// ─── VIEW MODES ───────────────────────────────────────────────────
// # 'grid' = card grid view, 'pipeline' = kanban view
const VIEW_GRID     = 'grid';
const VIEW_PIPELINE = 'pipeline';

function Candidates() {

  // ── STATE ────────────────────────────────────────────────────
  const [candidates,     setCandidates]     = useState([]);
  const [jobs,           setJobs]           = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [viewMode,       setViewMode]       = useState(VIEW_GRID);

  // # Filter controls
  const [filterStatus,   setFilterStatus]   = useState('');   // # '' = all
  const [filterJob,      setFilterJob]      = useState('');
  const [filterMinScore, setFilterMinScore] = useState('');
  const [showFilters,    setShowFilters]    = useState(false);

  // # Panel controls
  const [showUpload,     setShowUpload]     = useState(false);
  const [showScheduler,  setShowScheduler]  = useState(false);
  const [scheduleFor,    setScheduleFor]    = useState(null); // # Pre-fill candidate

  // ── FETCH DATA ───────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cands, jobsList] = await Promise.all([
        candidatesAPI.getAll(),
        jobsAPI.getAll(),
      ]);
      setCandidates(cands);
      setJobs(jobsList);
    } catch {
      // # Error handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── FILTERED CANDIDATES ──────────────────────────────────────
  // # Applies all active filters to the candidates list
  const filtered = candidates.filter(c => {

    // # Search filter — name or email
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        (c.skills ?? []).some(s => s.toLowerCase().includes(q));
      if (!match) return false;
    }

    // # Status filter
    if (filterStatus && c.status !== filterStatus) return false;

    // # Job filter
    if (filterJob && String(c.job_id) !== filterJob) return false;

    // # Minimum score filter
    if (filterMinScore && c.ai_score < Number(filterMinScore)) return false;

    return true;
  });

  // ── RESET ALL FILTERS ────────────────────────────────────────
  const resetFilters = () => {
    setFilterStatus('');
    setFilterJob('');
    setFilterMinScore('');
    setSearchQuery('');
  };

  // # Count active filters for badge
  const activeFilterCount = [filterStatus, filterJob, filterMinScore]
    .filter(Boolean).length;

  // ── AFTER RESUME UPLOAD ──────────────────────────────────────
  const handleUploadSuccess = (newCandidate) => {
    // # Add new candidate to the top of list
    setCandidates(prev => [newCandidate, ...prev]);
  };

  // ── AFTER STATUS CHANGE ──────────────────────────────────────
  const handleStatusChange = (id, newStatus) => {
    setCandidates(prev =>
      prev.map(c => c.id === id ? { ...c, status: newStatus } : c)
    );
  };

  // ── AFTER DELETE ─────────────────────────────────────────────
  const handleDelete = (id) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  // ── SCHEDULE INTERVIEW FOR CANDIDATE ─────────────────────────
  const handleSchedule = (candidate) => {
    setScheduleFor(candidate);
    setShowScheduler(true);
  };

  return (
    <div>

      {/* ── TOP SEARCH + UPLOAD BAR ──────────────────────────── */}
      <Navbar
        placeholder="Search by name, email or skill..."
        onSearch={setSearchQuery}
        onAddClick={() => setShowUpload(prev => !prev)}
        addLabel="Upload Resume"
      />

      <div className="page-wrapper">

        {/* ── PAGE HEADER ────────────────────────────────────── */}
        <div className="candidates__header">
          <div>
            <h1 className="page-title">Candidates</h1>
            <p className="page-subtitle">
              {filtered.length} of {candidates.length} candidates
            </p>
          </div>

          {/* # View mode toggle + filter button */}
          <div className="candidates__controls">

            {/* # Filter button with active count badge */}
            <button
              className={`btn btn-outline btn-sm ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(prev => !prev)}
            >
              <Filter size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="candidates__filter-badge">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* # Grid / Pipeline toggle */}
            <div className="candidates__view-toggle">
              <button
                className={`candidates__view-btn ${viewMode === VIEW_GRID ? 'active' : ''}`}
                onClick={() => setViewMode(VIEW_GRID)}
                title="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                className={`candidates__view-btn ${viewMode === VIEW_PIPELINE ? 'active' : ''}`}
                onClick={() => setViewMode(VIEW_PIPELINE)}
                title="Pipeline view"
              >
                <List size={16} />
              </button>
            </div>

          </div>
        </div>

        {/* ── RESUME UPLOAD PANEL ─────────────────────────────── */}
        {showUpload && (
          <div className="card" style={{ marginBottom: 20 }}>
            <ResumeUpload
              jobId={filterJob || (jobs[0]?.id ?? null)}
              onSuccess={handleUploadSuccess}
              onClose={() => setShowUpload(false)}
            />
          </div>
        )}

        {/* ── FILTER PANEL ────────────────────────────────────── */}
        {showFilters && (
          <div className="card candidates__filters">

            {/* # Status filter */}
            <div className="form-group">
              <label className="label">Status</label>
              <select
                className="input"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="applied">Applied</option>
                <option value="screening">Screening</option>
                <option value="interview">Interview</option>
                <option value="offered">Offered</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* # Job filter */}
            <div className="form-group">
              <label className="label">Job Position</label>
              <select
                className="input"
                value={filterJob}
                onChange={e => setFilterJob(e.target.value)}
              >
                <option value="">All Jobs</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>

            {/* # Min score filter */}
            <div className="form-group">
              <label className="label">Min AI Score</label>
              <select
                className="input"
                value={filterMinScore}
                onChange={e => setFilterMinScore(e.target.value)}
              >
                <option value="">Any Score</option>
                <option value="80">80% and above</option>
                <option value="70">70% and above</option>
                <option value="60">60% and above</option>
                <option value="50">50% and above</option>
              </select>
            </div>

            {/* # Reset filters */}
            <button className="btn btn-ghost btn-sm" onClick={resetFilters}>
              <X size={14} /> Reset
            </button>

          </div>
        )}

        {/* ── INTERVIEW SCHEDULER PANEL ───────────────────────── */}
        {showScheduler && (
          <div className="card" style={{ marginBottom: 20 }}>
            <InterviewScheduler
              prefillCandidate={scheduleFor}
              onSuccess={() => {}}
              onClose={() => { setShowScheduler(false); setScheduleFor(null); }}
            />
          </div>
        )}

        {/* ── LOADING ─────────────────────────────────────────── */}
        {loading && (
          <div className="flex-center" style={{ padding: 60 }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        )}

        {/* ── EMPTY ───────────────────────────────────────────── */}
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <Users size={48} />
            <p>
              {candidates.length === 0
                ? 'No candidates yet. Upload resumes to get started.'
                : 'No candidates match your current filters.'}
            </p>
            {activeFilterCount > 0 && (
              <button className="btn btn-outline btn-sm" onClick={resetFilters}>
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* ── GRID VIEW ───────────────────────────────────────── */}
        {!loading && filtered.length > 0 && viewMode === VIEW_GRID && (
          <div className="candidates__grid">
            {filtered.map(candidate => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onView={(c) => handleSchedule(c)}
              />
            ))}
          </div>
        )}

        {/* ── PIPELINE VIEW ───────────────────────────────────── */}
        {!loading && filtered.length > 0 && viewMode === VIEW_PIPELINE && (
          <Pipeline
            candidates={filtered}
            onUpdate={handleStatusChange}
          />
        )}

      </div>
    </div>
  );
}

export default Candidates;