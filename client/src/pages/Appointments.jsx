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
import '../styles/Appointments.css';

const APPT_TYPES = [
  'General Checkup',
  'Follow-up',
  'Specialist',
  'Lab Work',
  'Imaging',
  'Dental',
  'Vision',
  'Therapy',
  'Other',
];

const EMPTY_FORM = {
  date: '',
  time: '',
  provider: '',
  location: '',
  type: 'General Checkup',
  notes: '',
};

export default function Appointments() {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState([]);
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
      collection(db, 'users', user.uid, 'appointments'),
      orderBy('date', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // ── Helpers ──
  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: '' }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const validate = () => {
    const e = {};
    if (!form.date) e.date = 'Date is required';
    if (!form.time) e.time = 'Time is required';
    if (!form.provider.trim()) e.provider = 'Provider name is required';
    if (!form.location.trim()) e.location = 'Location is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Create / Update ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      date: form.date,
      time: form.time,
      provider: form.provider.trim(),
      location: form.location.trim(),
      type: form.type,
      notes: form.notes.trim(),
      updatedAt: Timestamp.now(),
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, 'users', user.uid, 'appointments', editingId), payload);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'appointments'), {
          ...payload,
          createdAt: Timestamp.now(),
        });
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save appointment:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ──
  const startEdit = (appt) => {
    setForm({
      date: appt.date,
      time: appt.time,
      provider: appt.provider,
      location: appt.location,
      type: appt.type,
      notes: appt.notes || '',
    });
    setEditingId(appt.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this appointment?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'appointments', id));
  };

  // ── Formatting ──
  const fmtDate = (d) =>
    new Date(d + 'T00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const fmtTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const isPast = (d) => new Date(d + 'T23:59') < new Date();

  const upcoming = appointments.filter((a) => !isPast(a.date));
  const past = appointments.filter((a) => isPast(a.date));

  return (
    <div className="appt-page">
      {/* ── Nav ── */}
      <header className="dash-nav">
        <Link to="/" className="dash-logo">&#10084; HealthSimplify</Link>
        <Link to="/dashboard" className="appt-back-link">&larr; Dashboard</Link>
      </header>

      <main className="appt-main">
        {/* ── Page Header ── */}
        <div className="appt-header">
          <div>
            <h1>Appointments</h1>
            <p>Schedule and manage your doctor visits.</p>
          </div>
          {!showForm && (
            <button className="btn-add" onClick={() => setShowForm(true)}>
              + New Appointment
            </button>
          )}
        </div>

        {/* ── Appointment Form ── */}
        {showForm && (
          <form className="appt-form" onSubmit={handleSubmit}>
            <h2>{editingId ? 'Edit Appointment' : 'New Appointment'}</h2>

            <div className="appt-form-grid">
              <div className="field">
                <label>Date *</label>
                <input type="date" value={form.date} onChange={set('date')} />
                {errors.date && <span className="field-error">{errors.date}</span>}
              </div>

              <div className="field">
                <label>Time *</label>
                <input type="time" value={form.time} onChange={set('time')} />
                {errors.time && <span className="field-error">{errors.time}</span>}
              </div>

              <div className="field">
                <label>Provider / Doctor *</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Smith"
                  value={form.provider}
                  onChange={set('provider')}
                />
                {errors.provider && <span className="field-error">{errors.provider}</span>}
              </div>

              <div className="field">
                <label>Location *</label>
                <input
                  type="text"
                  placeholder="e.g. City Health Clinic"
                  value={form.location}
                  onChange={set('location')}
                />
                {errors.location && <span className="field-error">{errors.location}</span>}
              </div>

              <div className="field">
                <label>Appointment Type</label>
                <select value={form.type} onChange={set('type')}>
                  {APPT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="field appt-notes-field">
                <label>Notes <span className="optional">(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="Reason for visit, things to discuss, etc."
                  value={form.notes}
                  onChange={set('notes')}
                />
              </div>
            </div>

            <div className="appt-form-actions">
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
        {loading && <p className="appt-empty">Loading appointments...</p>}

        {/* ── Upcoming ── */}
        {!loading && (
          <section className="appt-section">
            <h2 className="appt-section-title">Upcoming ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <p className="appt-empty">No upcoming appointments.</p>
            ) : (
              <div className="appt-list">
                {upcoming.map((a) => (
                  <div key={a.id} className="appt-card">
                    <div className="appt-card-date">
                      <span className="appt-card-day">
                        {new Date(a.date + 'T00:00').toLocaleDateString('en-US', { day: 'numeric' })}
                      </span>
                      <span className="appt-card-month">
                        {new Date(a.date + 'T00:00').toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>
                    <div className="appt-card-body">
                      <h3>{a.provider}</h3>
                      <span className="appt-badge">{a.type}</span>
                      <p className="appt-meta">
                        <span>{fmtTime(a.time)}</span>
                        <span>{a.location}</span>
                      </p>
                      {a.notes && <p className="appt-notes">{a.notes}</p>}
                    </div>
                    <div className="appt-card-actions">
                      <button className="btn-edit" onClick={() => startEdit(a)}>Edit</button>
                      <button className="btn-delete" onClick={() => handleDelete(a.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Past ── */}
        {!loading && past.length > 0 && (
          <section className="appt-section">
            <h2 className="appt-section-title">Past ({past.length})</h2>
            <div className="appt-list">
              {past.map((a) => (
                <div key={a.id} className="appt-card appt-card-past">
                  <div className="appt-card-date">
                    <span className="appt-card-day">
                      {new Date(a.date + 'T00:00').toLocaleDateString('en-US', { day: 'numeric' })}
                    </span>
                    <span className="appt-card-month">
                      {new Date(a.date + 'T00:00').toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>
                  <div className="appt-card-body">
                    <h3>{a.provider}</h3>
                    <span className="appt-badge appt-badge-past">{a.type}</span>
                    <p className="appt-meta">
                      <span>{fmtDate(a.date)}</span>
                      <span>{fmtTime(a.time)}</span>
                      <span>{a.location}</span>
                    </p>
                    {a.notes && <p className="appt-notes">{a.notes}</p>}
                  </div>
                  <div className="appt-card-actions">
                    <button className="btn-delete" onClick={() => handleDelete(a.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
