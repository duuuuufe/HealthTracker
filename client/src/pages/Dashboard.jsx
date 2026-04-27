import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import BrandLink from '../components/BrandLink';
import '../styles/Dashboard.css';

const FEATURES = [
  {
    icon: '📅',
    title: 'Appointments',
    desc: 'Schedule and manage doctor visits — set date, time, location, and provider.',
    path: '/appointments',
    color: '#0d9488',
  },
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
    title: 'Nutrition & Notes',
    desc: 'Log daily meals and calories, save recipes, track diet plans, articles, and personal notes.',
    path: '/notes',
    color: '#16a34a',
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
    desc: 'Add or update doctors, medicines, and system records.',
    path: '/data',
    color: '#64748b',
  },
];

const DEFAULT_ORDER = FEATURES.map((f) => f.path);
const FEATURE_BY_PATH = Object.fromEntries(FEATURES.map((f) => [f.path, f]));

function reconcile(savedOrder) {
  const seen = new Set();
  const ordered = [];
  if (Array.isArray(savedOrder)) {
    for (const path of savedOrder) {
      if (FEATURE_BY_PATH[path] && !seen.has(path)) {
        ordered.push(path);
        seen.add(path);
      }
    }
  }
  for (const path of DEFAULT_ORDER) {
    if (!seen.has(path)) ordered.push(path);
  }
  return ordered;
}

export default function Dashboard() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState(() => reconcile(profile?.moduleOrder));
  const [editing, setEditing] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data();
      setOrder(reconcile(data?.moduleOrder));
    });
  }, [user]);

  const modules = useMemo(() => order.map((path) => FEATURE_BY_PATH[path]).filter(Boolean), [order]);

  const persist = async (next) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { moduleOrder: next });
    } catch (err) {
      console.error('Failed to save module order:', err);
    }
  };

  const handleDragStart = (idx) => (e) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    // Some browsers require data to actually start a drag
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (idx) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== hoverIndex) setHoverIndex(idx);
  };

  const handleDragLeave = () => {
    setHoverIndex(null);
  };

  const handleDrop = (idx) => (e) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) {
      setDragIndex(null);
      setHoverIndex(null);
      return;
    }
    const next = [...order];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(idx, 0, moved);
    setOrder(next);
    setDragIndex(null);
    setHoverIndex(null);
    persist(next);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setHoverIndex(null);
  };

  const moveBy = (idx, delta) => {
    const target = idx + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
    persist(next);
  };

  const resetOrder = () => {
    setOrder(DEFAULT_ORDER);
    persist(DEFAULT_ORDER);
  };

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
        <BrandLink />
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
          <div className="dash-grid-header">
            <h2 className="dash-section-title">Your Health Modules</h2>
            <div className="dash-grid-actions">
              {editing && (
                <button className="dash-btn-reset" onClick={resetOrder} type="button">
                  Reset order
                </button>
              )}
              <button
                className={`dash-btn-customize${editing ? ' active' : ''}`}
                onClick={() => setEditing((v) => !v)}
                type="button"
              >
                {editing ? 'Done' : '✥ Customize'}
              </button>
            </div>
          </div>

          {editing && (
            <p className="dash-edit-hint">
              Drag a card to a new spot, or use the arrows to nudge it. Changes save automatically.
            </p>
          )}

          <div className={`dash-grid${editing ? ' dash-grid-editing' : ''}`}>
            {modules.map((f, idx) => {
              const isDragging = dragIndex === idx;
              const isHover = hoverIndex === idx && dragIndex !== null && dragIndex !== idx;
              const cardClass =
                `dash-card${isDragging ? ' dash-card-dragging' : ''}${isHover ? ' dash-card-hover-drop' : ''}`;
              const cardStyle = { '--card-color': f.color };

              if (editing) {
                return (
                  <div
                    key={f.path}
                    className={cardClass}
                    style={cardStyle}
                    draggable
                    onDragStart={handleDragStart(idx)}
                    onDragOver={handleDragOver(idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="dash-card-handle" aria-hidden="true">⋮⋮</span>
                    <div className="dash-card-icon">{f.icon}</div>
                    <div className="dash-card-body">
                      <h3>{f.title}</h3>
                      <p>{f.desc}</p>
                    </div>
                    <div className="dash-card-nudge" onMouseDown={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="dash-nudge-btn"
                        onClick={() => moveBy(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="dash-nudge-btn"
                        onClick={() => moveBy(idx, 1)}
                        disabled={idx === modules.length - 1}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <Link to={f.path} key={f.path} className="dash-card" style={cardStyle}>
                  <div className="dash-card-icon">{f.icon}</div>
                  <div className="dash-card-body">
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </div>
                  <div className="dash-card-arrow">&#8594;</div>
                </Link>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
