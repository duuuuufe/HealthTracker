import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import '../styles/Medication.css';

const DOSAGE_UNITS = ['mg', 'mcg', 'g', 'ml', 'tablet(s)', 'capsule(s)', 'drop(s)', 'puff(s)', 'unit(s)'];

const FREQUENCIES = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every other day',
  'Weekly',
  'As needed',
];

const FORMS = ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Inhaler', 'Topical', 'Drops', 'Other'];

const EMPTY_FORM = {
  name: '',
  form: 'Tablet',
  dosage: '',
  dosageUnit: 'mg',
  frequency: 'Once daily',
  times: [''],
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  prescriber: '',
  notes: '',
  reminders: true,
  phone: '',
};

export default function Medication() {
  const { user } = useAuth();

  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Real-time listener ──
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'medications'),
      orderBy('startDate', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setMeds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // ── Helpers ──
  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: '' }));
  };

  const setTime = (idx) => (e) => {
    const next = [...form.times];
    next[idx] = e.target.value;
    setForm((f) => ({ ...f, times: next }));
    setErrors((err) => ({ ...err, times: '' }));
  };

  const addTime = () => {
    setForm((f) => ({ ...f, times: [...f.times, ''] }));
  };

  const removeTime = (idx) => {
    setForm((f) => ({
      ...f,
      times: f.times.length > 1 ? f.times.filter((_, i) => i !== idx) : f.times,
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Medication name is required';
    if (!String(form.dosage).trim()) e.dosage = 'Dosage is required';
    else if (isNaN(Number(form.dosage)) || Number(form.dosage) <= 0)
      e.dosage = 'Dosage must be a positive number';
    if (!form.startDate) e.startDate = 'Start date is required';
    if (form.endDate && form.endDate < form.startDate)
      e.endDate = 'End date must be on or after start date';
    const cleanedTimes = form.times.map((t) => t.trim()).filter(Boolean);
    if (cleanedTimes.length === 0) e.times = 'At least one intake time is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Create / Update ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      form: form.form,
      dosage: Number(form.dosage),
      dosageUnit: form.dosageUnit,
      frequency: form.frequency,
      times: form.times.map((t) => t.trim()).filter(Boolean).sort(),
      startDate: form.startDate,
      endDate: form.endDate || null,
      prescriber: form.prescriber.trim(),
      notes: form.notes.trim(),
      reminders: form.reminders,
      phone: form.phone.trim(),
      updatedAt: Timestamp.now(),
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, 'users', user.uid, 'medications', editingId), payload);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'medications'), {
          ...payload,
          createdAt: Timestamp.now(),
        });
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save medication:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ──
  const startEdit = (m) => {
    setForm({
      name: m.name,
      form: m.form || 'Tablet',
      dosage: String(m.dosage ?? ''),
      dosageUnit: m.dosageUnit || 'mg',
      frequency: m.frequency || 'Once daily',
      times: m.times && m.times.length > 0 ? [...m.times] : [''],
      startDate: m.startDate || new Date().toISOString().slice(0, 10),
      endDate: m.endDate || '',
      prescriber: m.prescriber || '',
      notes: m.notes || '',
      reminders: m.reminders ?? true,
      phone: m.phone || '',
    });
    setEditingId(m.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this medication?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'medications', id));
  };

  // ── Formatting ──
  const fmtTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const fmtDate = (d) =>
    new Date(d + 'T00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const latestMissedNotification = (missedNotified) => {
    if (!Array.isArray(missedNotified) || missedNotified.length === 0) return null;
    const latestKey = [...missedNotified].sort().pop();
    const [dateKey, time] = latestKey.split('_');
    if (!dateKey || !time) return null;
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${date} at ${fmtTime(time)}`;
  };

  const today = new Date().toISOString().slice(0, 10);
  const isActive = (m) =>
    (!m.endDate || m.endDate >= today) && m.startDate <= today;
  const isUpcoming = (m) => m.startDate > today;
  const isDiscontinued = (m) => m.endDate && m.endDate < today;

  const active = meds.filter(isActive);
  const upcoming = meds.filter(isUpcoming);
  const discontinued = meds.filter(isDiscontinued);

  const renderCard = (m, past = false) => {
    const lastMissed = latestMissedNotification(m.missedNotified);
    return (
      <div key={m.id} className={`med-card${past ? ' med-card-past' : ''}`}>
        <div className="med-card-icon">
          <span>&#128138;</span>
        </div>
        <div className="med-card-body">
          <div className="med-card-heading">
            <h3>{m.name}</h3>
            <span className="med-dosage">
              {m.dosage} {m.dosageUnit}
            </span>
          </div>
          <div className="med-badges">
            <span className="med-badge">{m.form}</span>
            <span className="med-badge med-badge-freq">{m.frequency}</span>
            {m.reminders && !past && (
              <span className="med-badge med-badge-reminder">Reminders On</span>
            )}
            {lastMissed && (
              <span className="med-badge med-badge-alert">Alert Sent</span>
            )}
          </div>
          {m.times && m.times.length > 0 && (
            <div className="med-times">
              <span className="med-times-label">Intake:</span>
              {m.times.map((t) => (
                <span key={t} className="med-time-chip">{fmtTime(t)}</span>
              ))}
            </div>
          )}
          <p className="med-meta">
            <span>Start: {fmtDate(m.startDate)}</span>
            {m.endDate && <span>End: {fmtDate(m.endDate)}</span>}
            {m.prescriber && <span>Rx: {m.prescriber}</span>}
          </p>
          {lastMissed && (
            <p className="med-alert-note">Last missed alert: {lastMissed}</p>
          )}
          {m.notes && <p className="med-notes">{m.notes}</p>}
        </div>
        <div className="med-card-actions">
          <button className="btn-edit" onClick={() => startEdit(m)}>Edit</button>
          <button className="btn-delete" onClick={() => handleDelete(m.id)}>Delete</button>
        </div>
      </div>
    );
  };

  return (
    <div className="med-page">
      {/* ── Nav ── */}
      <header className="dash-nav">
        <Link to="/" className="dash-logo">&#10084; HealthSimplify</Link>
        <Link to="/dashboard" className="med-back-link">&larr; Dashboard</Link>
      </header>

      <main className="med-main">
        {/* ── Page Header ── */}
        <div className="med-header">
          <div>
            <h1>Medications</h1>
            <p>Track your medications, dosages, and scheduled intake times.</p>
          </div>
          {!showForm && (
            <button className="btn-add" onClick={() => setShowForm(true)}>
              + New Medication
            </button>
          )}
        </div>

        {/* ── Form ── */}
        {showForm && (
          <form className="med-form" onSubmit={handleSubmit}>
            <h2>{editingId ? 'Edit Medication' : 'New Medication'}</h2>

            <div className="med-form-grid">
              <div className="field med-full">
                <label>Medication Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Metformin"
                  value={form.name}
                  onChange={set('name')}
                />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>

              <div className="field">
                <label>Form</label>
                <select value={form.form} onChange={set('form')}>
                  {FORMS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Prescriber <span className="optional">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Smith"
                  value={form.prescriber}
                  onChange={set('prescriber')}
                />
              </div>

              <div className="field">
                <label>Dosage *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 500"
                  value={form.dosage}
                  onChange={set('dosage')}
                />
                {errors.dosage && <span className="field-error">{errors.dosage}</span>}
              </div>

              <div className="field">
                <label>Unit</label>
                <select value={form.dosageUnit} onChange={set('dosageUnit')}>
                  {DOSAGE_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div className="field med-full">
                <label>Frequency</label>
                <select value={form.frequency} onChange={set('frequency')}>
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* ── Scheduled Intake Times ── */}
              <div className="field med-full">
                <label>Scheduled Intake Times *</label>
                <div className="med-times-editor">
                  {form.times.map((t, idx) => (
                    <div key={idx} className="med-time-row">
                      <input
                        type="time"
                        value={t}
                        onChange={setTime(idx)}
                      />
                      <button
                        type="button"
                        className="btn-time-remove"
                        onClick={() => removeTime(idx)}
                        disabled={form.times.length === 1}
                        aria-label="Remove time"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn-time-add" onClick={addTime}>
                    + Add time
                  </button>
                </div>
                {errors.times && <span className="field-error">{errors.times}</span>}
              </div>

              <div className="field">
                <label>Start Date *</label>
                <input type="date" value={form.startDate} onChange={set('startDate')} />
                {errors.startDate && <span className="field-error">{errors.startDate}</span>}
              </div>

              <div className="field">
                <label>End Date <span className="optional">(optional)</span></label>
                <input type="date" value={form.endDate} onChange={set('endDate')} />
                {errors.endDate && <span className="field-error">{errors.endDate}</span>}
              </div>

              <div className="field med-full">
                <label>Notes <span className="optional">(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="Take with food, side effects to watch for, etc."
                  value={form.notes}
                  onChange={set('notes')}
                />
              </div>

              {/* ── Reminders ── */}
              <div className="med-reminders-row">
                <label className="med-toggle-label">
                  <input
                    type="checkbox"
                    checked={form.reminders}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reminders: e.target.checked }))
                    }
                  />
                  <span className="med-toggle-switch" />
                  <span>Send dose reminders at each scheduled time</span>
                </label>
              </div>

              {form.reminders && (
                <div className="field med-full">
                  <label>Phone for SMS <span className="optional">(optional — email is always sent)</span></label>
                  <input
                    type="tel"
                    placeholder="e.g. +1 555-123-4567"
                    value={form.phone}
                    onChange={set('phone')}
                  />
                </div>
              )}
            </div>

            <div className="med-form-actions">
              <button type="button" className="btn-cancel" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {/* ── Loading ── */}
        {loading && <p className="med-empty">Loading medications...</p>}

        {/* ── Active ── */}
        {!loading && (
          <section className="med-section">
            <h2 className="med-section-title">Active ({active.length})</h2>
            {active.length === 0 ? (
              <p className="med-empty">No active medications.</p>
            ) : (
              <div className="med-list">{active.map((m) => renderCard(m))}</div>
            )}
          </section>
        )}

        {/* ── Upcoming ── */}
        {!loading && upcoming.length > 0 && (
          <section className="med-section">
            <h2 className="med-section-title">Upcoming ({upcoming.length})</h2>
            <div className="med-list">{upcoming.map((m) => renderCard(m))}</div>
          </section>
        )}

        {/* ── Discontinued ── */}
        {!loading && discontinued.length > 0 && (
          <section className="med-section">
            <h2 className="med-section-title">Discontinued ({discontinued.length})</h2>
            <div className="med-list">{discontinued.map((m) => renderCard(m, true))}</div>
          </section>
        )}
      </main>
    </div>
  );
}
