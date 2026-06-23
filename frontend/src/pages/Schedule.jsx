import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, User,
  Briefcase, Plus, X,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { interviewsAPI } from '../services/api';
import Navbar              from '../components/Navbar';
import InterviewScheduler  from '../components/InterviewScheduler';
import toast               from 'react-hot-toast';
import './Schedule.css';

// ─── STATUS CONFIG ────────────────────────────────────────────────
const STATUS_CONFIG = {
  scheduled:  { label: 'Scheduled',  color: 'var(--info)',    Icon: Clock        },
  completed:  { label: 'Completed',  color: 'var(--success)', Icon: CheckCircle  },
  cancelled:  { label: 'Cancelled',  color: 'var(--danger)',  Icon: XCircle      },
  no_show:    { label: 'No Show',    color: 'var(--warning)', Icon: AlertCircle  },
};

// ─── INTERVIEW CARD ───────────────────────────────────────────────
function InterviewCard({ interview, onCancel, onStatusChange }) {

  const {
    id,
    candidate_name,
    job_title,
    interviewer_name,
    scheduled_at,
    status,
    notes,
  } = interview;

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  const { Icon, color, label } = cfg;

  // ── FORMAT DATE AND TIME ─────────────────────────────────────
  const dt = new Date(scheduled_at);
  const dateStr = dt.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
  const timeStr = dt.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  // ── CHECK IF PAST ────────────────────────────────────────────
  const isPast = dt < new Date();

  // ── CANCEL INTERVIEW ─────────────────────────────────────────
  const handleCancel = async () => {
    if (!window.confirm('Cancel this interview?')) return;
    try {
      await interviewsAPI.cancel(id);
      toast.success('Interview cancelled');
      onCancel(id);
    } catch {
      // # Error handled by interceptor
    }
  };

  // ── UPDATE STATUS ────────────────────────────────────────────
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      await interviewsAPI.update(id, { status: newStatus });
      toast.success('Status updated');
      onStatusChange(id, newStatus);
    } catch {
      // # Error handled by interceptor
    }
  };

  return (
    <div
      className={`interview-card ${isPast && status === 'scheduled' ? 'interview-card--past' : ''}`}
      style={{ '--interview-color': color }}
    >

      {/* ── LEFT COLOUR BAR ─────────────────────────────────── */}
      <div className="interview-card__bar" />

      {/* ── BODY ────────────────────────────────────────────── */}
      <div className="interview-card__body">

        {/* ── TOP ROW ───────────────────────────────────────── */}
        <div className="interview-card__top">

          {/* # Date + Time */}
          <div className="interview-card__datetime">
            <div className="interview-card__date">
              <Calendar size={14} />
              <span>{dateStr}</span>
            </div>
            <div className="interview-card__time">
              <Clock size={14} />
              <span>{timeStr}</span>
            </div>
          </div>

          {/* # Status badge + dropdown to change status */}
          <div className="interview-card__status-wrap">
            <span
              className="interview-card__status"
              style={{ color, background: `${color}18` }}
            >
              <Icon size={13} />
              {label}
            </span>
            {/* # Status change dropdown */}
            <select
              className="interview-card__status-select"
              value={status}
              onChange={handleStatusChange}
            >
              {Object.entries(STATUS_CONFIG).map(([val, c]) => (
                <option key={val} value={val}>{c.label}</option>
              ))}
            </select>
          </div>

        </div>

        {/* ── CANDIDATE + JOB INFO ──────────────────────────── */}
        <div className="interview-card__info">
          <div className="interview-card__person">
            <User size={15} color="var(--primary)" />
            <span className="interview-card__name">{candidate_name}</span>
          </div>
          <div className="interview-card__person">
            <Briefcase size={15} color="var(--text-muted)" />
            <span className="interview-card__role">{job_title}</span>
          </div>
        </div>

        {/* # Interviewer */}
        {interviewer_name && (
          <p className="interview-card__interviewer">
            Interviewer: <strong>{interviewer_name}</strong>
          </p>
        )}

        {/* # Notes */}
        {notes && (
          <p className="interview-card__notes">{notes}</p>
        )}

        {/* # Cancel button — only for upcoming scheduled interviews */}
        {status === 'scheduled' && !isPast && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--danger)', marginTop: 4 }}
            onClick={handleCancel}
          >
            <X size={14} /> Cancel Interview
          </button>
        )}

      </div>
    </div>
  );
}

// ─── MAIN SCHEDULE PAGE ───────────────────────────────────────────
function Schedule() {

  const [interviews,   setInterviews]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate,   setFilterDate]   = useState('');    // # 'today' | 'week' | ''
  const [showScheduler,setShowScheduler]= useState(false);

  // ── FETCH INTERVIEWS ─────────────────────────────────────────
  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await interviewsAPI.getAll();
      // # Sort by date — soonest first
      data.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
      setInterviews(data);
    } catch {
      // # Error handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInterviews(); }, [fetchInterviews]);

  // ── FILTERED INTERVIEWS ──────────────────────────────────────
  const filtered = interviews.filter(iv => {

    // # Search by candidate name or job title
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        iv.candidate_name?.toLowerCase().includes(q) ||
        iv.job_title?.toLowerCase().includes(q) ||
        iv.interviewer_name?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // # Status filter
    if (filterStatus && iv.status !== filterStatus) return false;

    // # Date filter
    if (filterDate) {
      const ivDate = new Date(iv.scheduled_at);
      const now    = new Date();

      if (filterDate === 'today') {
        // # Check if same calendar day
        const sameDay =
          ivDate.getDate()     === now.getDate()     &&
          ivDate.getMonth()    === now.getMonth()    &&
          ivDate.getFullYear() === now.getFullYear();
        if (!sameDay) return false;
      }

      if (filterDate === 'week') {
        // # Check if within next 7 days
        const weekLater = new Date(now);
        weekLater.setDate(now.getDate() + 7);
        if (ivDate < now || ivDate > weekLater) return false;
      }
    }

    return true;
  });

  // ── AFTER SCHEDULING NEW INTERVIEW ──────────────────────────
  const handleScheduled = (newInterview) => {
    setInterviews(prev => {
      const updated = [newInterview, ...prev];
      // # Re-sort by date
      return updated.sort(
        (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
      );
    });
    setShowScheduler(false);
  };

  // ── AFTER CANCEL ─────────────────────────────────────────────
  const handleCancel = (id) => {
    setInterviews(prev =>
      prev.map(iv => iv.id === id ? { ...iv, status: 'cancelled' } : iv)
    );
  };

  // ── AFTER STATUS CHANGE ──────────────────────────────────────
  const handleStatusChange = (id, newStatus) => {
    setInterviews(prev =>
      prev.map(iv => iv.id === id ? { ...iv, status: newStatus } : iv)
    );
  };

  // ── GROUP BY DATE ─────────────────────────────────────────────
  // # Group interviews under date headings like "Today", "Tomorrow", "20 Jun"
  const grouped = filtered.reduce((acc, iv) => {
    const ivDate = new Date(iv.scheduled_at);
    const now    = new Date();

    let heading;
    const sameDay =
      ivDate.getDate()     === now.getDate()     &&
      ivDate.getMonth()    === now.getMonth()    &&
      ivDate.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const nextDay =
      ivDate.getDate()     === tomorrow.getDate()     &&
      ivDate.getMonth()    === tomorrow.getMonth()    &&
      ivDate.getFullYear() === tomorrow.getFullYear();

    if (sameDay)   heading = 'Today';
    else if (nextDay) heading = 'Tomorrow';
    else heading = ivDate.toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short'
    });

    if (!acc[heading]) acc[heading] = [];
    acc[heading].push(iv);
    return acc;
  }, {});

  // # Count today's interviews for summary
  const todayCount = (grouped['Today'] ?? []).length;

  return (
    <div>
      {/* ── TOP SEARCH + SCHEDULE BUTTON ─────────────────────── */}
      <Navbar
        placeholder="Search by candidate, job or interviewer..."
        onSearch={setSearchQuery}
        onAddClick={() => setShowScheduler(prev => !prev)}
        addLabel="Schedule Interview"
      />

      <div className="page-wrapper">

        {/* ── PAGE HEADER ────────────────────────────────────── */}
        <div className="page-header">
          <h1 className="page-title">Interview Schedule</h1>
          <p className="page-subtitle">
            {todayCount > 0
              ? `${todayCount} interview${todayCount > 1 ? 's' : ''} today`
              : 'No interviews scheduled for today'}
          </p>
        </div>

        {/* ── SCHEDULE PANEL ──────────────────────────────────── */}
        {showScheduler && (
          <div className="card" style={{ marginBottom: 20 }}>
            <InterviewScheduler
              onSuccess={handleScheduled}
              onClose={() => setShowScheduler(false)}
            />
          </div>
        )}

        {/* ── FILTERS ROW ─────────────────────────────────────── */}
        <div className="schedule__filters">

          {/* # Status filter */}
          <select
            className="input"
            style={{ maxWidth: 180 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([val, c]) => (
              <option key={val} value={val}>{c.label}</option>
            ))}
          </select>

          {/* # Quick date filters */}
          <div className="schedule__date-filters">
            {['', 'today', 'week'].map(opt => (
              <button
                key={opt}
                className={`btn btn-sm ${filterDate === opt ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilterDate(opt)}
              >
                {opt === ''      ? 'All Time'   : ''}
                {opt === 'today' ? 'Today'      : ''}
                {opt === 'week'  ? 'This Week'  : ''}
              </button>
            ))}
          </div>

        </div>

        {/* ── LOADING ─────────────────────────────────────────── */}
        {loading && (
          <div className="flex-center" style={{ padding: 60 }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        )}

        {/* ── EMPTY ───────────────────────────────────────────── */}
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <Calendar size={48} />
            <p>
              {interviews.length === 0
                ? 'No interviews scheduled yet. Click "Schedule Interview" to book one.'
                : 'No interviews match your filters.'}
            </p>
          </div>
        )}

        {/* ── GROUPED INTERVIEW LIST ───────────────────────────── */}
        {!loading && Object.entries(grouped).map(([dateHeading, ivList]) => (
          <div key={dateHeading} className="schedule__group">

            {/* # Date heading */}
            <div className="schedule__date-heading">
              <span>{dateHeading}</span>
              <span className="schedule__date-count">{ivList.length}</span>
            </div>

            {/* # Interview cards for this date */}
            <div className="schedule__cards">
              {ivList.map(iv => (
                <InterviewCard
                  key={iv.id}
                  interview={iv}
                  onCancel={handleCancel}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>

          </div>
        ))}

      </div>
    </div>
  );
}

export default Schedule;