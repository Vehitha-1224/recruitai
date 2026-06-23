import React, { useState, useEffect } from 'react';
import { interviewsAPI, candidatesAPI, jobsAPI } from '../services/api';
import { Calendar, Clock, User, Briefcase, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import './InterviewScheduler.css';

// ─── PROPS ────────────────────────────────────────────────────────
// # prefillCandidate → auto-select a candidate (from Candidates page)
// # onSuccess        → called after interview is booked
// # onClose          → called when modal is closed
function InterviewScheduler({ prefillCandidate = null, onSuccess, onClose }) {

  // ── FORM STATE ───────────────────────────────────────────────
  const [form, setForm] = useState({
    candidate_id:      prefillCandidate?.id || '',
    job_id:            prefillCandidate?.job_id || '',
    scheduled_date:    '',            // # Date part: YYYY-MM-DD
    scheduled_time:    '',            // # Time part: HH:MM
    interviewer_name:  '',
    notes:             '',
  });

  // ── DATA LISTS ───────────────────────────────────────────────
  const [candidates, setCandidates] = useState([]);
  const [jobs,       setJobs]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── FETCH CANDIDATES AND JOBS ON MOUNT ───────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // # Fetch both in parallel for speed
        const [cands, jobsList] = await Promise.all([
          candidatesAPI.getAll({ status: 'screening,interview' }),
          jobsAPI.getAll(),
        ]);
        setCandidates(cands);
        setJobs(jobsList);
      } catch {
        // # Error handled by interceptor
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);  // # Empty array = run once when component mounts

  // ── HANDLE FORM FIELD CHANGES ────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // ── VALIDATE FORM ────────────────────────────────────────────
  const validate = () => {
    if (!form.candidate_id)     { toast.error('Select a candidate');    return false; }
    if (!form.job_id)           { toast.error('Select a job');          return false; }
    if (!form.scheduled_date)   { toast.error('Select a date');         return false; }
    if (!form.scheduled_time)   { toast.error('Select a time');         return false; }
    if (!form.interviewer_name) { toast.error('Enter interviewer name'); return false; }

    // # Cannot book interview in the past
    const selected = new Date(`${form.scheduled_date}T${form.scheduled_time}`);
    if (selected < new Date()) {
      toast.error('Cannot schedule interview in the past');
      return false;
    }
    return true;
  };

  // ── SUBMIT FORM ──────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      // # Combine date and time into one ISO string for backend
      const scheduled_at = new Date(
        `${form.scheduled_date}T${form.scheduled_time}`
      ).toISOString();

      const result = await interviewsAPI.create({
        candidate_id:     Number(form.candidate_id),
        job_id:           Number(form.job_id),
        scheduled_at,
        interviewer_name: form.interviewer_name,
        notes:            form.notes,
      });

      toast.success('Interview scheduled successfully!');
      if (onSuccess) onSuccess(result);
      if (onClose)   onClose();

    } catch {
      // # Error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  // ── MIN DATE (today) for date picker ─────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="scheduler">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="scheduler__header">
        <div className="scheduler__header-title">
          <Calendar size={20} color="var(--primary)" />
          <h3>Schedule Interview</h3>
        </div>
        {onClose && (
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: 40 }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="scheduler__form">

          {/* ── CANDIDATE SELECT ──────────────────────────── */}
          <div className="form-group">
            <label className="label">
              <User size={13} /> Candidate
            </label>
            <select
              name="candidate_id"
              className="input"
              value={form.candidate_id}
              onChange={handleChange}
              disabled={!!prefillCandidate}  // # Lock if pre-filled
            >
              <option value="">Select candidate...</option>
              {candidates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.ai_score}% match
                </option>
              ))}
            </select>
          </div>

          {/* ── JOB SELECT ────────────────────────────────── */}
          <div className="form-group">
            <label className="label">
              <Briefcase size={13} /> Position
            </label>
            <select
              name="job_id"
              className="input"
              value={form.job_id}
              onChange={handleChange}
            >
              <option value="">Select job...</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>

          {/* ── DATE + TIME ───────────────────────────────── */}
          <div className="scheduler__datetime">
            <div className="form-group">
              <label className="label">
                <Calendar size={13} /> Date
              </label>
              <input
                type="date"
                name="scheduled_date"
                className="input"
                value={form.scheduled_date}
                min={todayStr}            // # Disable past dates
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="label">
                <Clock size={13} /> Time
              </label>
              <input
                type="time"
                name="scheduled_time"
                className="input"
                value={form.scheduled_time}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* ── INTERVIEWER NAME ──────────────────────────── */}
          <div className="form-group">
            <label className="label">Interviewer Name</label>
            <input
              type="text"
              name="interviewer_name"
              className="input"
              placeholder="e.g. Priya Sharma"
              value={form.interviewer_name}
              onChange={handleChange}
            />
          </div>

          {/* ── NOTES ─────────────────────────────────────── */}
          <div className="form-group">
            <label className="label">Notes (optional)</label>
            <textarea
              name="notes"
              className="input"
              placeholder="Any special instructions..."
              value={form.notes}
              onChange={handleChange}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* ── SUBMIT BUTTON ─────────────────────────────── */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <><div className="spinner" /> Scheduling...</>
            ) : (
              <><Check size={16} /> Confirm Interview</>
            )}
          </button>

        </div>
      )}
    </div>
  );
}

export default InterviewScheduler;