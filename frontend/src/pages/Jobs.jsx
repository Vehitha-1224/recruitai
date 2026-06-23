import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Briefcase, Edit2,
  Trash2, X, Check, Users,
  Calendar, Tag
} from 'lucide-react';
import { jobsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import './Jobs.css';

// ─── EMPTY FORM TEMPLATE ──────────────────────────────────────────
// # Default values when creating a new job
const EMPTY_FORM = {
  title:            '',
  description:      '',
  skills_required:  '',   // # Comma-separated string → split to array on save
  salary_min:       '',
  salary_max:       '',
  location:         '',
  job_type:         'full-time',
};

// ─── JOB FORM MODAL ───────────────────────────────────────────────
// # Modal popup for creating or editing a job
function JobFormModal({ job, onClose, onSaved }) {

  // # Pre-fill form if editing, otherwise use empty template
  const [form, setForm] = useState(
    job
      ? {
          ...job,
          // # Convert array back to comma string for the input
          skills_required: (job.skills_required ?? []).join(', '),
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  // ── HANDLE INPUT CHANGES ─────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // ── VALIDATE ─────────────────────────────────────────────────
  const validate = () => {
    if (!form.title.trim())       { toast.error('Job title is required');       return false; }
    if (!form.description.trim()) { toast.error('Job description is required'); return false; }
    if (!form.skills_required.trim()) { toast.error('Skills are required');     return false; }
    return true;
  };

  // ── SAVE JOB ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    // # Convert skills string "React, Node, SQL" → ["React","Node","SQL"]
    const payload = {
      ...form,
      skills_required: form.skills_required
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),           // # Remove empty strings
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
    };

    try {
      let saved;
      if (job) {
        // # Editing existing job
        saved = await jobsAPI.update(job.id, payload);
        toast.success('Job updated successfully');
      } else {
        // # Creating new job
        saved = await jobsAPI.create(payload);
        toast.success('Job posted successfully');
      }
      onSaved(saved, !!job);  // # Pass saved job + isEdit flag
    } catch {
      // # Error handled by interceptor
    } finally {
      setSaving(false);
    }
  };

  return (
    // # Dark overlay behind modal
    <div className="modal-overlay" onClick={onClose}>
      {/* # Stop click from closing when clicking inside modal */}
      <div className="modal" onClick={e => e.stopPropagation()}>

        {/* ── MODAL HEADER ──────────────────────────────────── */}
        <div className="modal__header">
          <h2>{job ? 'Edit Job' : 'Post New Job'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* ── MODAL BODY ────────────────────────────────────── */}
        <div className="modal__body">

          {/* # Job Title */}
          <div className="form-group">
            <label className="label">Job Title *</label>
            <input
              name="title"
              className="input"
              placeholder="e.g. Senior React Developer"
              value={form.title}
              onChange={handleChange}
            />
          </div>

          {/* # Description */}
          <div className="form-group">
            <label className="label">Job Description *</label>
            <textarea
              name="description"
              className="input"
              placeholder="Describe the role, responsibilities, and requirements..."
              value={form.description}
              onChange={handleChange}
              rows={4}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* # Skills */}
          <div className="form-group">
            <label className="label">Required Skills * (comma separated)</label>
            <input
              name="skills_required"
              className="input"
              placeholder="e.g. React, TypeScript, Node.js, PostgreSQL"
              value={form.skills_required}
              onChange={handleChange}
            />
          </div>

          {/* # Salary Range */}
          <div className="jobs__salary-row">
            <div className="form-group">
              <label className="label">Min Salary (₹)</label>
              <input
                type="number"
                name="salary_min"
                className="input"
                placeholder="e.g. 600000"
                value={form.salary_min}
                onChange={handleChange}
                min={0}
              />
            </div>
            <div className="form-group">
              <label className="label">Max Salary (₹)</label>
              <input
                type="number"
                name="salary_max"
                className="input"
                placeholder="e.g. 1200000"
                value={form.salary_max}
                onChange={handleChange}
                min={0}
              />
            </div>
          </div>

          {/* # Location + Job Type */}
          <div className="jobs__salary-row">
            <div className="form-group">
              <label className="label">Location</label>
              <input
                name="location"
                className="input"
                placeholder="e.g. Bangalore / Remote"
                value={form.location}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="label">Job Type</label>
              <select
                name="job_type"
                className="input"
                value={form.job_type}
                onChange={handleChange}
              >
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
          </div>

        </div>

        {/* ── MODAL FOOTER ──────────────────────────────────── */}
        <div className="modal__footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <><div className="spinner" /> Saving...</>
            ) : (
              <><Check size={16} /> {job ? 'Update Job' : 'Post Job'}</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── JOB CARD ─────────────────────────────────────────────────────
// # Displays one job posting
function JobCard({ job, onEdit, onDelete }) {

  // ── DELETE ───────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    try {
      await jobsAPI.delete(job.id);
      toast.success('Job deleted');
      onDelete(job.id);
    } catch {
      // # Error handled by interceptor
    }
  };

  // ── FORMAT SALARY ────────────────────────────────────────────
  const formatSalary = (min, max) => {
    if (!min && !max) return null;
    const fmt = (n) => `₹${(n / 100000).toFixed(1)}L`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min)        return `From ${fmt(min)}`;
    return `Up to ${fmt(max)}`;
  };

  const salary = formatSalary(job.salary_min, job.salary_max);

  // ── FORMAT DATE ──────────────────────────────────────────────
  const postedDate = job.created_at
    ? new Date(job.created_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      })
    : 'N/A';

  return (
    <div className="job-card">

      {/* ── TOP ROW ───────────────────────────────────────── */}
      <div className="job-card__top">
        <div className="job-card__icon">
          <Briefcase size={20} color="var(--primary)" />
        </div>
        <div className="job-card__header-info">
          <h3 className="job-card__title">{job.title}</h3>
          <div className="job-card__meta">
            {job.location && (
              <span className="job-card__meta-item">
                📍 {job.location}
              </span>
            )}
            <span className="job-card__meta-item job-card__type">
              {job.job_type}
            </span>
          </div>
        </div>

        {/* # Edit + Delete buttons */}
        <div className="job-card__actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onEdit(job)}
            title="Edit job"
          >
            <Edit2 size={15} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDelete}
            title="Delete job"
            style={{ color: 'var(--danger)' }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* ── DESCRIPTION ───────────────────────────────────── */}
      <p className="job-card__description">{job.description}</p>

      {/* ── SKILLS ────────────────────────────────────────── */}
      {(job.skills_required ?? []).length > 0 && (
        <div className="job-card__skills">
          <Tag size={12} color="var(--text-muted)" />
          {job.skills_required.map((skill, i) => (
            <span key={i} className="job-card__skill">{skill}</span>
          ))}
        </div>
      )}

      {/* ── FOOTER ────────────────────────────────────────── */}
      <div className="job-card__footer">
        {salary && (
          <span className="job-card__salary">{salary}</span>
        )}
        <span className="job-card__stat">
          <Users size={13} /> {job.candidate_count ?? 0} applicants
        </span>
        <span className="job-card__stat">
          <Calendar size={13} /> {postedDate}
        </span>
      </div>

    </div>
  );
}

// ─── MAIN JOBS PAGE ───────────────────────────────────────────────
function Jobs() {
  const [jobs,        setJobs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [editingJob,  setEditingJob]  = useState(null);  // # Job being edited

  // ── FETCH JOBS ───────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jobsAPI.getAll();
      setJobs(data);
    } catch {
      // # Error handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // ── FILTERED JOBS ────────────────────────────────────────────
  // # Filter jobs by search query in real time
  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (job.skills_required ?? []).some(s =>
      s.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // ── OPEN CREATE MODAL ────────────────────────────────────────
  const handleAddClick = () => {
    setEditingJob(null);     // # No job = create mode
    setShowModal(true);
  };

  // ── OPEN EDIT MODAL ──────────────────────────────────────────
  const handleEdit = (job) => {
    setEditingJob(job);      // # Pass job = edit mode
    setShowModal(true);
  };

  // ── AFTER SAVE ───────────────────────────────────────────────
  const handleSaved = (savedJob, isEdit) => {
    if (isEdit) {
      // # Replace old job with updated version
      setJobs(prev => prev.map(j => j.id === savedJob.id ? savedJob : j));
    } else {
      // # Add new job to the top of the list
      setJobs(prev => [savedJob, ...prev]);
    }
    setShowModal(false);
  };

  // ── AFTER DELETE ─────────────────────────────────────────────
  const handleDelete = (jobId) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
  };

  return (
    <div>
      {/* ── TOP SEARCH + ADD BAR ─────────────────────────────── */}
      <Navbar
        placeholder="Search jobs by title or skill..."
        onSearch={setSearchQuery}
        onAddClick={handleAddClick}
        addLabel="Post Job"
      />

      <div className="page-wrapper">

        {/* ── PAGE HEADER ────────────────────────────────────── */}
        <div className="page-header flex-between">
          <div>
            <h1 className="page-title">Job Postings</h1>
            <p className="page-subtitle">
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>

        {/* ── LOADING STATE ──────────────────────────────────── */}
        {loading && (
          <div className="flex-center" style={{ padding: 60 }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        )}

        {/* ── EMPTY STATE ────────────────────────────────────── */}
        {!loading && filteredJobs.length === 0 && (
          <div className="empty-state">
            <Briefcase size={48} />
            <p>
              {searchQuery
                ? 'No jobs match your search'
                : 'No jobs posted yet. Click "Post Job" to create one.'}
            </p>
          </div>
        )}

        {/* ── JOB CARDS GRID ─────────────────────────────────── */}
        {!loading && (
          <div className="jobs__grid">
            {filteredJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

      </div>

      {/* ── JOB FORM MODAL ─────────────────────────────────────── */}
      {showModal && (
        <JobFormModal
          job={editingJob}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

    </div>
  );
}

export default Jobs;