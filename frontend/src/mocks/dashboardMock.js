const stats = {
  open_jobs: 5,
  new_jobs_this_week: 2,
  total_candidates: 24,
  new_candidates_today: 3,
  interviews_today: 2,
  hired_this_month: 4,
  offer_acceptance_rate: 78,
  applications_trend: [
    { date: '2026-06-14', count: 5 },
    { date: '2026-06-15', count: 7 },
    { date: '2026-06-16', count: 3 },
    { date: '2026-06-17', count: 8 },
    { date: '2026-06-18', count: 6 },
    { date: '2026-06-19', count: 9 },
    { date: '2026-06-20', count: 4 }
  ],
  pipeline_counts: [
    { stage: 'applied', count: 10 },
    { stage: 'screening', count: 6 },
    { stage: 'interview', count: 4 },
    { stage: 'offered', count: 2 },
    { stage: 'hired', count: 2 }
  ],
  top_candidates: [
    { id: 1, name: 'Alice Johnson', job_title: 'Frontend Engineer', ai_score: 92 },
    { id: 2, name: 'Bob Smith', job_title: 'Data Scientist', ai_score: 88 },
    { id: 3, name: 'Cara Lee', job_title: 'Backend Engineer', ai_score: 81 }
  ]
};

const activity = [
  { type: 'info', message: 'New resume uploaded: Alice Johnson', time: '2h ago' },
  { type: 'success', message: 'Interview scheduled for Bob Smith', time: '1d ago' },
  { type: 'warning', message: 'Job posting expired: UX Designer', time: '3d ago' }
];

export default { stats, activity };
