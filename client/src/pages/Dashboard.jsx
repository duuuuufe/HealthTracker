import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';

const FEATURES = [
  {
    icon: '👤',
    title: 'Profile',
    desc: 'View and update your personal info, doctor details, and account settings.',
    path: '/profile',
    color: '#2563eb',
  },
  {
    icon: '💓',
    title: 'Vital Signs',
    desc: 'Log and track blood pressure, glucose, cholesterol, heart rate, and more.',
    path: '/vitals',
    color: '#ef4444',
  },
  {
    icon: '💊',
    title: 'Medication',
    desc: 'Manage your medications, dosage schedules, and receive timely reminders.',
    path: '/medication',
    color: '#8b5cf6',
  },
  {
    icon: '🥗',
    title: 'Diet & Nutrition',
    desc: 'Track daily food intake, calorie counts, and monitor your weight progress.',
    path: '/diet',
    color: '#16a34a',
  },
  {
    icon: '📝',
    title: 'Notes',
    desc: 'Store recipes, health articles, diet descriptions, and personal notes.',
    path: '/notes',
    color: '#f59e0b',
  },
  {
    icon: '🔍',
    title: 'Search',
    desc: 'Find doctor appointments, past medications, vitals, and records instantly.',
    path: '/search',
    color: '#0ea5e9',
  },
  {
    icon: '🚨',
    title: 'Monitoring',
    desc: 'Get alerts for missed medications and dangerous drug interaction warnings.',
    path: '/monitoring',
    color: '#dc2626',
  },
  {
    icon: '📡',
    title: 'Communication',
    desc: 'Manage email, phone, and SMS contact info for you and your care team.',
    path: '/communication',
    color: '#0891b2',
  },
  {
    icon: '🗄️',
    title: 'Data Maintenance',
    desc: 'Add or update doctors, medicines, and system records — no coding required.',
    path: '/data',
    color: '#64748b',
  },
];

export default function Dashboard() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    navigate('/');
    await logout();
  };

  const firstName = profile?.firstName || user?.displayName || 'there';
  const initials  = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : (user?.displayName?.[0] ?? 'U').toUpperCase();

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="dashboard">

      {/* ── Top Nav ── */}
      <header className="dash-nav">
        <Link to="/" className="dash-logo">&#10084; HealthSimplify</Link>
        <div className="dash-nav-right">
          <span className="dash-date">{today}</span>
          <div className="dash-avatar">{initials}</div>
          <button className="dash-logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      <main className="dash-main">

        {/* ── Welcome Banner ── */}
        <section className="dash-welcome">
          <div className="dash-welcome-text">
            <h1>Welcome back, <span className="accent">{firstName}</span> 👋</h1>
            <p>Here is your health overview. Select a module below to get started.</p>
          </div>
          <div className="dash-welcome-stats">
            <div className="dash-stat">
              <span className="dash-stat-icon">📅</span>
              <div>
                <span className="dash-stat-label">Next Appointment</span>
                <span className="dash-stat-value">
                  {profile?.nextVisit
                    ? new Date(profile.nextVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Not scheduled'}
                </span>
              </div>
            </div>
            <div className="dash-stat">
              <span className="dash-stat-icon">🩺</span>
              <div>
                <span className="dash-stat-label">Doctor</span>
                <span className="dash-stat-value">{profile?.doctorName || 'Not set'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature Grid ── */}
        <section className="dash-grid-section">
          <h2 className="dash-section-title">Your Health Modules</h2>
          <div className="dash-grid">
            {FEATURES.map((f) => (
              <Link to={f.path} key={f.title} className="dash-card" style={{ '--card-color': f.color }}>
                <div className="dash-card-icon">{f.icon}</div>
                <div className="dash-card-body">
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
                <div className="dash-card-arrow">&#8594;</div>
              </Link>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
