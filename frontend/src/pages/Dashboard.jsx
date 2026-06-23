import React, { useState, useEffect } from 'react';

// # Recharts — for drawing charts inside the browser
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

// # Icons
import {
  Briefcase, Users, Calendar,
  TrendingUp, Clock, CheckCircle,
  AlertCircle, ArrowUpRight
} from 'lucide-react';

// # Our API functions
import { dashboardAPI } from '../services/api';

import './Dashboard.css';

// ─── STAT CARD COMPONENT ──────────────────────────────────────────
// # Small reusable card showing one number with icon
// # Used 4 times at the top of dashboard
function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="stat-card" style={{ '--stat-color': color }}>
      <div className="stat-card__icon">
        <Icon size={22} color={color} />
      </div>
      <div className="stat-card__body">
        <p className="stat-card__label">{label}</p>
        <p className="stat-card__value">{value ?? '--'}</p>
        {sub && (
          <p className="stat-card__sub">
            {trend === 'up' && <ArrowUpRight size={12} color="var(--success)" />}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── ACTIVITY ITEM COMPONENT ──────────────────────────────────────
// # One row in the recent activity feed
function ActivityItem({ type, message, time }) {
  // # Pick icon and colour based on activity type
  const config = {
    success:  { Icon: CheckCircle, color: 'var(--success)' },
    warning:  { Icon: AlertCircle, color: 'var(--warning)' },
    info:     { Icon: Clock,       color: 'var(--info)'    },
  }[type] || { Icon: Clock, color: 'var(--text-muted)' };

  const { Icon, color } = config;

  return (
    <div className="activity-item">
      <div className="activity-item__icon" style={{ color }}>
        <Icon size={16} />
      </div>
      <div className="activity-item__body">
        <p className="activity-item__msg">{message}</p>
        <p className="activity-item__time">{time}</p>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD PAGE ──────────────────────────────────────────
function Dashboard() {

  // # All dashboard data lives here
  const [stats,    setStats]    = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // ── FETCH DATA ON PAGE LOAD ────────────────────────────────
  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        // # Fetch stats and activity at the same time — faster
        const [statsData, activityData] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getRecentActivity(),
        ]);
        setStats(statsData);
        setActivity(activityData);
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []); // # Run once on mount

  // ── LOADING STATE ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="dashboard-loader">
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // ── ERROR STATE ────────────────────────────────────────────
  if (error) {
    return (
      <div className="dashboard-error">
        <AlertCircle size={32} color="var(--danger)" />
        <p>{error}</p>
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page-wrapper">

      {/* ── PAGE HEADER ──────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welcome back! Here is what is happening today.
        </p>
      </div>

      {/* ── STAT CARDS ROW ───────────────────────────────────── */}
      <div className="dashboard__stats">
        <StatCard
          icon={Briefcase}
          label="Open Jobs"
          value={stats?.open_jobs}
          sub={`${stats?.new_jobs_this_week ?? 0} new this week`}
          color="var(--primary)"
          trend="up"
        />
        <StatCard
          icon={Users}
          label="Total Candidates"
          value={stats?.total_candidates}
          sub={`${stats?.new_candidates_today ?? 0} today`}
          color="var(--info)"
          trend="up"
        />
        <StatCard
          icon={Calendar}
          label="Interviews Today"
          value={stats?.interviews_today}
          sub="Scheduled"
          color="var(--warning)"
        />
        <StatCard
          icon={TrendingUp}
          label="Hired This Month"
          value={stats?.hired_this_month}
          sub={`${stats?.offer_acceptance_rate ?? 0}% offer acceptance`}
          color="var(--success)"
          trend="up"
        />
      </div>

      {/* ── CHARTS ROW ───────────────────────────────────────── */}
      <div className="dashboard__charts">

        {/* ── APPLICATIONS OVER TIME CHART ─────────────────── */}
        <div className="card dashboard__chart-card">
          <h2 className="dashboard__chart-title">Applications Over Time</h2>
          <p className="dashboard__chart-sub">Last 7 days</p>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats?.applications_trend ?? []}>
              <defs>
                {/* # Gradient fill under the line */}
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#areaGrad)"   // # Use our gradient
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── CANDIDATES BY STAGE BAR CHART ────────────────── */}
        <div className="card dashboard__chart-card">
          <h2 className="dashboard__chart-title">Pipeline Overview</h2>
          <p className="dashboard__chart-sub">Candidates per stage</p>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.pipeline_counts ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="stage"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="count"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}  // # Rounded top corners
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ── BOTTOM ROW — Top Candidates + Recent Activity ────── */}
      <div className="dashboard__bottom">

        {/* ── TOP CANDIDATES ───────────────────────────────── */}
        <div className="card">
          <h2 className="dashboard__section-title">Top Candidates</h2>

          {(stats?.top_candidates ?? []).length === 0 ? (
            <div className="empty-state">
              <Users size={32} />
              <p>No candidates yet</p>
            </div>
          ) : (
            <div className="dashboard__top-candidates">
              {(stats?.top_candidates ?? []).map((c, i) => (
                <div key={c.id} className="dashboard__candidate-row">

                  {/* # Rank number */}
                  <span className="dashboard__rank">#{i + 1}</span>

                  {/* # Avatar */}
                  <div className="dashboard__cand-avatar">
                    {c.name?.charAt(0)?.toUpperCase()}
                  </div>

                  {/* # Name + Job */}
                  <div className="dashboard__cand-info">
                    <p className="dashboard__cand-name">{c.name}</p>
                    <p className="dashboard__cand-job">{c.job_title}</p>
                  </div>

                  {/* # Score badge */}
                  <span
                    className="dashboard__score-badge"
                    style={{
                      color: c.ai_score >= 80
                        ? 'var(--success)'
                        : c.ai_score >= 60
                          ? 'var(--warning)'
                          : 'var(--danger)'
                    }}
                  >
                    {c.ai_score}%
                  </span>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RECENT ACTIVITY FEED ─────────────────────────── */}
        <div className="card">
          <h2 className="dashboard__section-title">Recent Activity</h2>

          {activity.length === 0 ? (
            <div className="empty-state">
              <Clock size={32} />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="dashboard__activity">
              {activity.map((item, i) => (
                <ActivityItem
                  key={i}
                  type={item.type}
                  message={item.message}
                  time={item.time}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Dashboard;