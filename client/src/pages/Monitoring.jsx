import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLink from '../components/BrandLink';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import '../styles/Monitoring.css';

const VITAL_RULES = {
  bloodPressure: {
    label: 'Blood Pressure',
    icon: '💓',
    unit: 'mmHg',
    check: (v) => {
      const [s, d] = String(v).split('/').map(Number);
      if (Number.isNaN(s) || Number.isNaN(d)) return null;
      if (s >= 180 || d >= 120) return { severity: 'critical', note: 'Hypertensive crisis — seek care immediately' };
      if (s >= 140 || d >= 90)  return { severity: 'high', note: 'Hypertension stage 2' };
      if (s >= 130 || d >= 80)  return { severity: 'high', note: 'Hypertension stage 1' };
      if (s < 90  || d < 60)    return { severity: 'low',  note: 'Hypotension' };
      return null;
    },
  },
  heartRate: {
    label: 'Heart Rate', icon: '❤️', unit: 'bpm',
    check: (v) => {
      const n = Number(v);
      if (Number.isNaN(n)) return null;
      if (n > 120) return { severity: 'critical', note: 'Tachycardia — sustained high heart rate' };
      if (n > 100) return { severity: 'high', note: 'Elevated heart rate' };
      if (n < 50)  return { severity: 'critical', note: 'Bradycardia — abnormally low heart rate' };
      if (n < 60)  return { severity: 'low', note: 'Below typical resting range' };
      return null;
    },
  },
  cholesterol: {
    label: 'Cholesterol', icon: '🧬', unit: 'mg/dL',
    check: (v) => {
      const n = Number(v);
      if (Number.isNaN(n)) return null;
      if (n >= 240) return { severity: 'high', note: 'High cholesterol' };
      if (n >= 200) return { severity: 'low', note: 'Borderline-high cholesterol' };
      return null;
    },
  },
  temperature: {
    label: 'Temperature', icon: '🌡️', unit: '°F',
    check: (v) => {
      const n = Number(v);
      if (Number.isNaN(n)) return null;
      if (n >= 103) return { severity: 'critical', note: 'High fever' };
      if (n >= 100.4) return { severity: 'high', note: 'Fever' };
      if (n < 95) return { severity: 'critical', note: 'Hypothermia risk' };
      if (n < 97) return { severity: 'low', note: 'Below typical range' };
      return null;
    },
  },
  oxygenSat: {
    label: 'Oxygen Saturation', icon: '🫁', unit: '%',
    check: (v) => {
      const n = Number(v);
      if (Number.isNaN(n)) return null;
      if (n < 90)  return { severity: 'critical', note: 'Dangerously low oxygen — seek care' };
      if (n < 95)  return { severity: 'high', note: 'Below normal oxygen saturation' };
      return null;
    },
  },
};

// Curated, illustrative dangerous medication-pair combinations.
// Matched by case-insensitive substring on the medication name.
const DRUG_INTERACTIONS = [
  {
    a: 'warfarin', b: 'aspirin',
    severity: 'critical',
    reason: 'Both thin the blood — combination can cause severe bleeding.',
  },
  {
    a: 'warfarin', b: 'ibuprofen',
    severity: 'critical',
    reason: 'NSAIDs amplify warfarin\'s anticoagulant effect, raising bleeding risk.',
  },
  {
    a: 'warfarin', b: 'naproxen',
    severity: 'critical',
    reason: 'NSAIDs amplify warfarin\'s anticoagulant effect, raising bleeding risk.',
  },
  {
    a: 'metformin', b: 'contrast',
    severity: 'high',
    reason: 'Iodinated contrast with metformin can trigger lactic acidosis in at-risk patients.',
  },
  {
    a: 'lisinopril', b: 'spironolactone',
    severity: 'high',
    reason: 'Both raise potassium — combination can cause hyperkalemia.',
  },
  {
    a: 'lisinopril', b: 'potassium',
    severity: 'high',
    reason: 'ACE inhibitors with potassium supplements can cause hyperkalemia.',
  },
  {
    a: 'simvastatin', b: 'clarithromycin',
    severity: 'critical',
    reason: 'Clarithromycin sharply raises simvastatin levels — risk of muscle breakdown (rhabdomyolysis).',
  },
  {
    a: 'simvastatin', b: 'erythromycin',
    severity: 'high',
    reason: 'Macrolide antibiotics raise statin levels — increased rhabdomyolysis risk.',
  },
  {
    a: 'ssri', b: 'maoi',
    severity: 'critical',
    reason: 'Combining SSRIs and MAOIs can cause serotonin syndrome.',
  },
  {
    a: 'sertraline', b: 'tramadol',
    severity: 'high',
    reason: 'Both raise serotonin — risk of serotonin syndrome.',
  },
  {
    a: 'fluoxetine', b: 'tramadol',
    severity: 'high',
    reason: 'Both raise serotonin — risk of serotonin syndrome.',
  },
  {
    a: 'clopidogrel', b: 'omeprazole',
    severity: 'high',
    reason: 'Omeprazole reduces clopidogrel\'s antiplatelet effect.',
  },
  {
    a: 'digoxin', b: 'amiodarone',
    severity: 'high',
    reason: 'Amiodarone raises digoxin levels — risk of toxicity.',
  },
  {
    a: 'metronidazole', b: 'alcohol',
    severity: 'high',
    reason: 'Disulfiram-like reaction — severe nausea, vomiting, flushing.',
  },
  {
    a: 'monoamine oxidase', b: 'tyramine',
    severity: 'critical',
    reason: 'MAOIs with tyramine-containing foods can cause hypertensive crisis.',
  },
];

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatRelative(date) {
  const ms = Date.now() - date.getTime();
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor(ms / 3_600_000);
  if (ms < 60_000) return 'Just now';
  if (hours < 1) return `${Math.floor(ms / 60_000)} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildMissedAlerts(meds) {
  const alerts = [];
  meds.forEach((m) => {
    if (!Array.isArray(m.missedNotified)) return;
    m.missedNotified.forEach((key) => {
      const [dateKey, time] = key.split('_');
      if (!dateKey || !time) return;
      const [y, mo, d] = dateKey.split('-').map(Number);
      const [h, mi] = time.split(':').map(Number);
      const when = new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0);
      if (Number.isNaN(when.getTime())) return;
      alerts.push({
        id: `${m.id}_${key}`,
        medId: m.id,
        medName: m.name,
        dosage: `${m.dosage} ${m.dosageUnit || ''}`.trim(),
        time,
        when,
      });
    });
  });
  alerts.sort((a, b) => b.when - a.when);
  return alerts;
}

function buildInteractions(activeMeds) {
  const matches = [];
  for (let i = 0; i < activeMeds.length; i++) {
    for (let j = i + 1; j < activeMeds.length; j++) {
      const a = (activeMeds[i].name || '').toLowerCase();
      const b = (activeMeds[j].name || '').toLowerCase();
      DRUG_INTERACTIONS.forEach((rule) => {
        const ra = rule.a.toLowerCase();
        const rb = rule.b.toLowerCase();
        const hit = (a.includes(ra) && b.includes(rb)) || (a.includes(rb) && b.includes(ra));
        if (hit) {
          matches.push({
            id: `${activeMeds[i].id}_${activeMeds[j].id}_${ra}_${rb}`,
            medA: activeMeds[i].name,
            medB: activeMeds[j].name,
            severity: rule.severity,
            reason: rule.reason,
          });
        }
      });
    }
  }
  return matches;
}

function buildVitalAlerts(latestVital) {
  if (!latestVital) return [];
  const out = [];
  Object.entries(VITAL_RULES).forEach(([key, rule]) => {
    const value = latestVital[key];
    if (value === undefined || value === null || value === '') return;
    const result = rule.check(value);
    if (result) {
      out.push({
        id: `${latestVital.id}_${key}`,
        field: key,
        label: rule.label,
        icon: rule.icon,
        unit: rule.unit,
        value,
        severity: result.severity,
        note: result.note,
        date: latestVital.date,
      });
    }
  });
  return out;
}

const SEVERITY_RANK = { critical: 3, high: 2, low: 1 };

export default function Monitoring() {
  const { user } = useAuth();
  const [meds, setMeds] = useState([]);
  const [latestVital, setLatestVital] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'medications'), orderBy('startDate', 'desc'));
    return onSnapshot(q, (snap) => {
      setMeds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'vitals'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLatestVital(docs[0] || null);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'contacts'));
    return onSnapshot(q, (snap) => {
      setContacts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const activeMeds = useMemo(
    () => meds.filter((m) => (!m.endDate || m.endDate >= today) && m.startDate <= today),
    [meds, today],
  );

  const missedAlerts = useMemo(() => buildMissedAlerts(meds), [meds]);
  const interactions = useMemo(() => buildInteractions(activeMeds), [activeMeds]);
  const vitalAlerts = useMemo(() => buildVitalAlerts(latestVital), [latestVital]);

  const recentMissed = missedAlerts.slice(0, 8);
  const recipients = contacts
    .filter((c) => c.isEmergency || c.isPrimary || c.role === 'Caregiver' || c.role === 'Family')
    .sort((a, b) => Number(b.isEmergency) - Number(a.isEmergency));

  const severitySummary = useMemo(() => {
    const counts = { critical: 0, high: 0, low: 0 };
    interactions.forEach((i) => { counts[i.severity] = (counts[i.severity] || 0) + 1; });
    vitalAlerts.forEach((v) => { counts[v.severity] = (counts[v.severity] || 0) + 1; });
    counts.high += recentMissed.length;
    return counts;
  }, [interactions, vitalAlerts, recentMissed.length]);

  const totalAlerts = severitySummary.critical + severitySummary.high + severitySummary.low;

  return (
    <div className="mon-page">
      <header className="dash-nav">
        <BrandLink />
        <Link to="/dashboard" className="mon-back-link">&larr; Dashboard</Link>
      </header>

      <main className="mon-main">
        <div className="mon-header">
          <div>
            <h1>🚨 Monitoring &amp; Alerts</h1>
            <p>
              Real-time check on missed doses, dangerous medication combinations, and out-of-range vital readings.
            </p>
          </div>
        </div>

        <section className={`mon-summary mon-summary-${totalAlerts === 0 ? 'ok' : severitySummary.critical ? 'critical' : 'warn'}`}>
          {totalAlerts === 0 ? (
            <>
              <span className="mon-summary-icon">✅</span>
              <div>
                <h2>All clear</h2>
                <p>No active alerts. We'll notify you here and through your contacts if anything changes.</p>
              </div>
            </>
          ) : (
            <>
              <span className="mon-summary-icon">{severitySummary.critical ? '🚨' : '⚠️'}</span>
              <div>
                <h2>{totalAlerts} active alert{totalAlerts === 1 ? '' : 's'}</h2>
                <p>
                  {severitySummary.critical > 0 && (
                    <span className="mon-pill mon-pill-critical">{severitySummary.critical} critical</span>
                  )}
                  {severitySummary.high > 0 && (
                    <span className="mon-pill mon-pill-high">{severitySummary.high} high</span>
                  )}
                  {severitySummary.low > 0 && (
                    <span className="mon-pill mon-pill-low">{severitySummary.low} watch</span>
                  )}
                </p>
              </div>
            </>
          )}
        </section>

        {loading && <p className="mon-empty">Loading monitoring data…</p>}

        {/* ── Missed Doses ── */}
        <section className="mon-section">
          <div className="mon-section-header">
            <h2>💊 Missed Doses</h2>
            <Link to="/medication" className="mon-section-link">Manage medications →</Link>
          </div>
          {recentMissed.length === 0 ? (
            <div className="mon-card mon-card-clear">
              <span className="mon-card-icon">✅</span>
              <div>
                <strong>No missed doses recorded.</strong>
                <p>You're on track with your scheduled medications.</p>
              </div>
            </div>
          ) : (
            <ul className="mon-list">
              {recentMissed.map((a) => (
                <li key={a.id} className="mon-card mon-card-warn">
                  <span className="mon-card-icon">💊</span>
                  <div className="mon-card-body">
                    <div className="mon-card-title">
                      <strong>{a.medName}</strong>
                      {a.dosage && <span className="mon-meta-badge">{a.dosage}</span>}
                    </div>
                    <p className="mon-card-line">
                      Scheduled at {formatTime(a.time)} · {formatRelative(a.when)}
                    </p>
                  </div>
                  <span className="mon-sev mon-sev-high">High</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Drug Interactions ── */}
        <section className="mon-section">
          <div className="mon-section-header">
            <h2>⚠️ Drug Interaction Warnings</h2>
            <span className="mon-section-meta">Checking {activeMeds.length} active medication{activeMeds.length === 1 ? '' : 's'}</span>
          </div>
          {activeMeds.length < 2 ? (
            <div className="mon-card mon-card-clear">
              <span className="mon-card-icon">ℹ️</span>
              <div>
                <strong>Not enough active medications to cross-check.</strong>
                <p>Drug interaction warnings appear when two or more active meds may conflict.</p>
              </div>
            </div>
          ) : interactions.length === 0 ? (
            <div className="mon-card mon-card-clear">
              <span className="mon-card-icon">✅</span>
              <div>
                <strong>No flagged interactions.</strong>
                <p>None of your active medications match our list of dangerous combinations.</p>
              </div>
            </div>
          ) : (
            <ul className="mon-list">
              {interactions
                .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
                .map((c) => (
                <li key={c.id} className={`mon-card mon-card-${c.severity}`}>
                  <span className="mon-card-icon">{c.severity === 'critical' ? '🚨' : '⚠️'}</span>
                  <div className="mon-card-body">
                    <div className="mon-card-title">
                      <strong>{c.medA}</strong>
                      <span className="mon-card-vs">+</span>
                      <strong>{c.medB}</strong>
                    </div>
                    <p className="mon-card-line">{c.reason}</p>
                  </div>
                  <span className={`mon-sev mon-sev-${c.severity}`}>
                    {c.severity === 'critical' ? 'Critical' : 'High'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mon-disclaimer">
            Informational only — always confirm with your pharmacist or prescriber before changing medications.
          </p>
        </section>

        {/* ── Out-of-range Vitals ── */}
        <section className="mon-section">
          <div className="mon-section-header">
            <h2>📈 Vital Sign Alerts</h2>
            <Link to="/vitals" className="mon-section-link">View vitals →</Link>
          </div>
          {!latestVital ? (
            <div className="mon-card mon-card-clear">
              <span className="mon-card-icon">ℹ️</span>
              <div>
                <strong>No vitals recorded yet.</strong>
                <p>
                  <Link to="/vitals">Log your first reading</Link> to enable monitoring.
                </p>
              </div>
            </div>
          ) : vitalAlerts.length === 0 ? (
            <div className="mon-card mon-card-clear">
              <span className="mon-card-icon">✅</span>
              <div>
                <strong>Latest readings are within normal range.</strong>
                <p>Last recorded {latestVital.date}.</p>
              </div>
            </div>
          ) : (
            <ul className="mon-list">
              {vitalAlerts
                .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
                .map((v) => (
                <li key={v.id} className={`mon-card mon-card-${v.severity}`}>
                  <span className="mon-card-icon">{v.icon}</span>
                  <div className="mon-card-body">
                    <div className="mon-card-title">
                      <strong>{v.label}</strong>
                      <span className="mon-meta-badge">{v.value} {v.unit}</span>
                    </div>
                    <p className="mon-card-line">{v.note}</p>
                    <p className="mon-card-sub">Recorded {v.date}</p>
                  </div>
                  <span className={`mon-sev mon-sev-${v.severity}`}>
                    {v.severity === 'critical' ? 'Critical' : v.severity === 'high' ? 'High' : 'Watch'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Alert Recipients ── */}
        <section className="mon-section">
          <div className="mon-section-header">
            <h2>📡 Alert Recipients</h2>
            <Link to="/communication" className="mon-section-link">Manage contacts →</Link>
          </div>
          {recipients.length === 0 ? (
            <div className="mon-card mon-card-clear">
              <span className="mon-card-icon">ℹ️</span>
              <div>
                <strong>No emergency or family contacts saved.</strong>
                <p>
                  <Link to="/communication">Add a contact</Link> marked as emergency or family to receive alerts on your behalf.
                </p>
              </div>
            </div>
          ) : (
            <ul className="mon-recipients">
              {recipients.map((c) => (
                <li key={c.id} className="mon-recipient">
                  <span className="mon-recipient-icon">
                    {c.isEmergency ? '🆘' : c.role === 'Family' ? '👨‍👩‍👧' : c.role === 'Caregiver' ? '🤝' : '🩺'}
                  </span>
                  <div className="mon-recipient-body">
                    <div className="mon-recipient-name">
                      {c.name || 'Unnamed contact'}
                      {c.isEmergency && <span className="mon-pill mon-pill-critical">Emergency</span>}
                      {c.isPrimary && <span className="mon-pill mon-pill-high">Primary</span>}
                    </div>
                    <div className="mon-recipient-meta">{c.role}{c.organization ? ` · ${c.organization}` : ''}</div>
                    <div className="mon-recipient-channels">
                      {c.email && <span>✉️ {c.email}</span>}
                      {c.sms   && <span>📱 {c.sms}</span>}
                      {c.phone && <span>📞 {c.phone}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
