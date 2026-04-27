import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLink from '../components/BrandLink';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import '../styles/Search.css';

const CATEGORIES = [
  { key: 'all',          label: 'All',           icon: '🔎' },
  { key: 'medication',   label: 'Medications',   icon: '💊' },
  { key: 'appointment',  label: 'Appointments',  icon: '📅' },
  { key: 'vital',        label: 'Vitals',        icon: '💓' },
  { key: 'note',         label: 'Notes',         icon: '📝' },
  { key: 'contact',      label: 'Contacts',      icon: '📇' },
];

const TYPE_META = {
  medication:  { icon: '💊', label: 'Medication',  route: (r) => `/medication`,           color: '#8b5cf6' },
  appointment: { icon: '📅', label: 'Appointment', route: (r) => `/appointments`,         color: '#0d9488' },
  vital:       { icon: '💓', label: 'Vital Sign',  route: (r) => `/vitals-summary`,       color: '#ef4444' },
  note:        { icon: '📝', label: 'Note',        route: (r) => `/notes/${r.id}`,        color: '#f59e0b' },
  contact:     { icon: '📇', label: 'Contact',     route: (r) => `/communication`,        color: '#0891b2' },
};

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d.includes('T') ? d : d + 'T00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return d; }
};

const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m ?? 0).padStart(2, '0')} ${ampm}`;
};

const tokenize = (q) =>
  q.toLowerCase().trim().split(/\s+/).filter(Boolean);

// Score = sum of token hits, weighted by field
const FIELD_WEIGHTS = { title: 5, name: 5, type: 3, role: 3, body: 1 };

function scoreRecord(record, tokens) {
  if (tokens.length === 0) return 0;
  let total = 0;
  const matches = new Set();
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const text = (record._search?.[field] || '').toLowerCase();
    if (!text) continue;
    for (const tok of tokens) {
      if (text.includes(tok)) {
        total += weight;
        matches.add(tok);
      }
    }
  }
  // every token must hit somewhere
  if (matches.size < tokens.length) return 0;
  return total;
}

// Build searchable text bundles for each record type
function buildSearchable(type, r) {
  switch (type) {
    case 'medication':
      return {
        title: r.name || '',
        type: r.form || '',
        body: [r.frequency, r.prescriber, r.notes, r.dosageUnit, r.dosage].filter(Boolean).join(' '),
      };
    case 'appointment':
      return {
        title: r.provider || '',
        type: r.type || '',
        body: [r.location, r.notes, r.date, r.time].filter(Boolean).join(' '),
      };
    case 'vital': {
      const vals = [
        r.bloodPressure && `blood pressure ${r.bloodPressure}`,
        r.heartRate && `heart rate ${r.heartRate}`,
        r.cholesterol && `cholesterol ${r.cholesterol}`,
        r.temperature && `temperature ${r.temperature}`,
        r.weight && `weight ${r.weight}`,
        r.oxygenSat && `oxygen ${r.oxygenSat}`,
      ].filter(Boolean);
      return {
        title: vals[0] || 'Vital reading',
        type: 'vitals',
        body: [r.date, ...vals].join(' '),
      };
    }
    case 'note':
      return {
        title: r.title || '',
        type: r.category || '',
        body: [r.body, r.dietType, ...(r.ingredients || []), r.instructions].filter(Boolean).join(' '),
      };
    case 'contact':
      return {
        name: r.name || '',
        role: r.role || '',
        body: [r.specialty, r.organization, r.phone, r.sms, r.email, r.address, r.notes]
          .filter(Boolean).join(' '),
      };
    default:
      return {};
  }
}

function highlight(text, tokens) {
  if (!text || tokens.length === 0) return text;
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = String(text).split(re);
  return parts.map((p, i) =>
    re.test(p) ? <mark key={i} className="srch-mark">{p}</mark> : <span key={i}>{p}</span>
  );
}

export default function Search() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');

  const [meds, setMeds]                 = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [vitals, setVitals]             = useState([]);
  const [notes, setNotes]               = useState([]);
  const [contacts, setContacts]         = useState([]);
  const [loading, setLoading]           = useState(true);

  // ── Live listeners for every searchable collection ──
  useEffect(() => {
    if (!user) return;
    let pending = 5;
    const done = () => { if (--pending === 0) setLoading(false); };

    const subs = [
      onSnapshot(
        query(collection(db, 'users', user.uid, 'medications'), orderBy('startDate', 'desc')),
        (snap) => { setMeds(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); done(); },
        () => done()
      ),
      onSnapshot(
        query(collection(db, 'users', user.uid, 'appointments'), orderBy('date', 'desc')),
        (snap) => { setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); done(); },
        () => done()
      ),
      onSnapshot(
        query(collection(db, 'vitals'), where('userId', '==', user.uid), orderBy('date', 'desc')),
        (snap) => { setVitals(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); done(); },
        () => done()
      ),
      onSnapshot(
        query(collection(db, 'users', user.uid, 'notes'), orderBy('updatedAt', 'desc')),
        (snap) => { setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); done(); },
        () => done()
      ),
      onSnapshot(
        query(collection(db, 'users', user.uid, 'contacts'), orderBy('name', 'asc')),
        (snap) => { setContacts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); done(); },
        () => done()
      ),
    ];
    return () => subs.forEach((u) => u());
  }, [user]);

  // ── Index every record once with its searchable text ──
  const indexed = useMemo(() => {
    const all = [
      ...meds.map((r)         => ({ ...r, _type: 'medication',  _search: buildSearchable('medication', r) })),
      ...appointments.map((r) => ({ ...r, _type: 'appointment', _search: buildSearchable('appointment', r) })),
      ...vitals.map((r)       => ({ ...r, _type: 'vital',       _search: buildSearchable('vital', r) })),
      ...notes.map((r)        => ({ ...r, _type: 'note',        _search: buildSearchable('note', r) })),
      ...contacts.map((r)     => ({ ...r, _type: 'contact',     _search: buildSearchable('contact', r) })),
    ];
    return all;
  }, [meds, appointments, vitals, notes, contacts]);

  const tokens = useMemo(() => tokenize(q), [q]);

  // ── Apply filter + score ──
  const results = useMemo(() => {
    const filtered = category === 'all'
      ? indexed
      : indexed.filter((r) => r._type === category);

    if (tokens.length === 0) return [];

    return filtered
      .map((r) => ({ ...r, _score: scoreRecord(r, tokens) }))
      .filter((r) => r._score > 0)
      .sort((a, b) => b._score - a._score);
  }, [indexed, category, tokens]);

  // ── Group results by type, preserving rank within group ──
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of results) {
      if (!map.has(r._type)) map.set(r._type, []);
      map.get(r._type).push(r);
    }
    return [...map.entries()];
  }, [results]);

  const totalCount = results.length;
  const counts = useMemo(() => {
    const c = { all: 0, medication: 0, appointment: 0, vital: 0, note: 0, contact: 0 };
    for (const r of indexed) {
      if (tokens.length === 0 || scoreRecord(r, tokens) > 0) {
        c[r._type]++;
        c.all++;
      }
    }
    return c;
  }, [indexed, tokens]);

  // ── Per-type card renderers ──
  const renderCard = (r) => {
    const meta = TYPE_META[r._type];
    const onOpen = () => navigate(meta.route(r));
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); }
    };

    let content;
    switch (r._type) {
      case 'medication':
        content = (
          <>
            <h3 className="srch-card-title">{highlight(r.name, tokens)}</h3>
            <div className="srch-chips">
              {r.form && <span className="srch-chip">{highlight(r.form, tokens)}</span>}
              {r.dosage != null && (
                <span className="srch-chip">
                  {highlight(`${r.dosage} ${r.dosageUnit || ''}`.trim(), tokens)}
                </span>
              )}
              {r.frequency && <span className="srch-chip">{highlight(r.frequency, tokens)}</span>}
            </div>
            <p className="srch-meta">
              {r.startDate && <span>Start: {fmtDate(r.startDate)}</span>}
              {r.endDate && <span>End: {fmtDate(r.endDate)}</span>}
              {r.prescriber && <span>Rx: {highlight(r.prescriber, tokens)}</span>}
            </p>
            {r.notes && <p className="srch-body">{highlight(r.notes, tokens)}</p>}
          </>
        );
        break;

      case 'appointment':
        content = (
          <>
            <h3 className="srch-card-title">
              {highlight(r.provider || r.type || 'Appointment', tokens)}
            </h3>
            <div className="srch-chips">
              {r.type && <span className="srch-chip">{highlight(r.type, tokens)}</span>}
              {r.date && <span className="srch-chip">{fmtDate(r.date)}</span>}
              {r.time && <span className="srch-chip">{fmtTime(r.time)}</span>}
            </div>
            {r.location && <p className="srch-meta"><span>📍 {highlight(r.location, tokens)}</span></p>}
            {r.notes && <p className="srch-body">{highlight(r.notes, tokens)}</p>}
          </>
        );
        break;

      case 'vital': {
        const readings = [
          ['Blood Pressure', r.bloodPressure, 'mmHg'],
          ['Heart Rate', r.heartRate, 'bpm'],
          ['Cholesterol', r.cholesterol, 'mg/dL'],
          ['Temperature', r.temperature, '°F'],
          ['Weight', r.weight, 'lbs'],
          ['Oxygen Sat', r.oxygenSat, '%'],
        ].filter(([, v]) => v != null && v !== '');
        content = (
          <>
            <h3 className="srch-card-title">Vitals — {fmtDate(r.date)}</h3>
            <div className="srch-chips">
              {readings.map(([label, value, unit]) => (
                <span key={label} className="srch-chip">
                  {highlight(`${label}: ${value} ${unit}`, tokens)}
                </span>
              ))}
            </div>
          </>
        );
        break;
      }

      case 'note':
        content = (
          <>
            <h3 className="srch-card-title">{highlight(r.title || 'Untitled note', tokens)}</h3>
            <div className="srch-chips">
              {r.category && <span className="srch-chip">{highlight(r.category, tokens)}</span>}
              {r.dietType && <span className="srch-chip">{highlight(r.dietType, tokens)}</span>}
              {r.pinned && <span className="srch-chip srch-chip-accent">📌 Pinned</span>}
            </div>
            {r.body && (
              <p className="srch-body">
                {highlight(String(r.body).slice(0, 220), tokens)}
                {r.body.length > 220 ? '…' : ''}
              </p>
            )}
          </>
        );
        break;

      case 'contact':
        content = (
          <>
            <h3 className="srch-card-title">{highlight(r.name, tokens)}</h3>
            <div className="srch-chips">
              {r.role && <span className="srch-chip">{highlight(r.role, tokens)}</span>}
              {r.specialty && <span className="srch-chip">{highlight(r.specialty, tokens)}</span>}
              {r.organization && <span className="srch-chip">{highlight(r.organization, tokens)}</span>}
            </div>
            <p className="srch-meta">
              {r.phone && <span>📞 {highlight(r.phone, tokens)}</span>}
              {r.email && <span>✉️ {highlight(r.email, tokens)}</span>}
            </p>
          </>
        );
        break;

      default:
        content = null;
    }

    return (
      <div
        key={`${r._type}-${r.id}`}
        className="srch-card"
        style={{ '--srch-accent': meta.color }}
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={onKey}
      >
        <div className="srch-card-icon">{meta.icon}</div>
        <div className="srch-card-body">
          {content}
        </div>
        <div className="srch-card-arrow">→</div>
      </div>
    );
  };

  return (
    <div className="srch-page">
      <header className="dash-nav">
        <BrandLink />
        <Link to="/dashboard" className="srch-back-link">&larr; Dashboard</Link>
      </header>

      <main className="srch-main">
        <div className="srch-header">
          <h1>Search</h1>
          <p>Find medications, doctor visits, vitals, notes, and contacts across your records.</p>
        </div>

        <div className="srch-bar-wrap">
          <span className="srch-bar-icon">🔎</span>
          <input
            className="srch-bar"
            type="text"
            placeholder="Search by name, doctor, condition, date…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          {q && (
            <button
              className="srch-bar-clear"
              onClick={() => setQ('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="srch-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`srch-tab${category === c.key ? ' srch-tab-active' : ''}`}
              onClick={() => setCategory(c.key)}
            >
              <span className="srch-tab-icon">{c.icon}</span>
              <span>{c.label}</span>
              {tokens.length > 0 && (
                <span className="srch-tab-count">{counts[c.key]}</span>
              )}
            </button>
          ))}
        </div>

        {loading && <p className="srch-empty">Loading your records…</p>}

        {!loading && tokens.length === 0 && (
          <div className="srch-hint">
            <p>Start typing to search across your records.</p>
            <p className="srch-hint-sub">
              You have <strong>{indexed.length}</strong> total items indexed —
              {' '}{meds.length} medications, {appointments.length} appointments,
              {' '}{vitals.length} vitals, {notes.length} notes, {contacts.length} contacts.
            </p>
          </div>
        )}

        {!loading && tokens.length > 0 && totalCount === 0 && (
          <div className="srch-empty">
            <p>No results for <strong>"{q}"</strong>.</p>
            <p className="srch-empty-sub">Try fewer words or a different category.</p>
          </div>
        )}

        {!loading && tokens.length > 0 && totalCount > 0 && (
          <>
            <p className="srch-summary">
              {totalCount} result{totalCount === 1 ? '' : 's'} for{' '}
              <strong>"{q}"</strong>
              {category !== 'all' && <> in <em>{CATEGORIES.find((c) => c.key === category)?.label}</em></>}
            </p>

            {grouped.map(([type, items]) => (
              <section key={type} className="srch-group">
                <h2 className="srch-group-title">
                  <span>{TYPE_META[type].icon}</span>
                  {TYPE_META[type].label}s
                  <span className="srch-group-count">{items.length}</span>
                </h2>
                <div className="srch-list">
                  {items.map(renderCard)}
                </div>
              </section>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
