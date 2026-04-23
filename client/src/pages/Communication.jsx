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
import '../styles/Communication.css';

const ROLES = [
  'Primary Doctor', 'Specialist', 'Nurse', 'Therapist', 'Pharmacy',
  'Lab', 'Insurance', 'Caregiver', 'Family', 'Emergency Contact', 'Other',
];

const ROLE_ICONS = {
  'Primary Doctor':    '🩺',
  'Specialist':        '👨‍⚕️',
  'Nurse':             '💉',
  'Therapist':         '🧠',
  'Pharmacy':          '💊',
  'Lab':               '🔬',
  'Insurance':         '📋',
  'Caregiver':         '🤝',
  'Family':            '👨‍👩‍👧',
  'Emergency Contact': '🆘',
  'Other':             '📇',
};

const EMPTY_CONTACT = {
  name: '',
  role: 'Primary Doctor',
  specialty: '',
  organization: '',
  email: '',
  phone: '',
  sms: '',
  address: '',
  notes: '',
  isPrimary: false,
  isEmergency: false,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Display helpers for phone numbers / protocol links
const fmtPhone = (p) => {
  if (!p) return '';
  const d = p.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === '1')
    return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  return p;
};
const telLink  = (p) => `tel:${(p || '').replace(/\D/g, '')}`;
const smsLink  = (p) => `sms:${(p || '').replace(/\D/g, '')}`;
const mailLink = (e) => `mailto:${e}`;

export default function Communication() {
  const { user, profile } = useAuth();

  // ── My contact info (profile doc fields) ──
  const [myInfo, setMyInfo] = useState({
    phone: '',
    preferredContact: 'email',
    emailNotifications: true,
    smsNotifications: false,
  });
  const [editingMe, setEditingMe] = useState(false);
  const [savingMe, setSavingMe]   = useState(false);
  const [meSaved, setMeSaved]     = useState(false);

  // ── Care team contacts ──
  const [contacts, setContacts]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [editingId, setEditingId]         = useState(null);
  const [form, setForm]                   = useState(EMPTY_CONTACT);
  const [errors, setErrors]               = useState({});
  const [saving, setSaving]               = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [filterRole, setFilterRole]       = useState('all');
  const [copiedKey, setCopiedKey]         = useState(null);

  // Real-time contacts listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'contacts'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setContacts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // Hydrate myInfo from profile once available
  useEffect(() => {
    if (!profile) return;
    setMyInfo({
      phone:              profile.phone              || '',
      preferredContact:   profile.preferredContact   || 'email',
      emailNotifications: profile.emailNotifications ?? true,
      smsNotifications:   profile.smsNotifications   ?? false,
    });
  }, [profile]);

  // ── My info handlers ──
  const saveMyInfo = async () => {
    setSavingMe(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        phone:              myInfo.phone.trim(),
        preferredContact:   myInfo.preferredContact,
        emailNotifications: myInfo.emailNotifications,
        smsNotifications:   myInfo.smsNotifications,
        updatedAt:          new Date().toISOString(),
      });
      setEditingMe(false);
      setMeSaved(true);
      setTimeout(() => setMeSaved(false), 2200);
    } catch (err) {
      console.error('Failed to update contact info:', err);
    } finally {
      setSavingMe(false);
    }
  };

  // ── Contact form handlers ──
  const setField = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((err) => ({ ...err, [field]: '' }));
  };

  const resetForm = () => {
    setForm(EMPTY_CONTACT);
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() && !form.phone.trim() && !form.sms.trim()) {
      e.contactMethod = 'Add at least one contact method (email, phone, or SMS)';
    }
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      e.email = 'Invalid email address';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const phone = form.phone.trim();
    const payload = {
      name:         form.name.trim(),
      role:         form.role,
      specialty:    form.specialty.trim(),
      organization: form.organization.trim(),
      email:        form.email.trim(),
      phone,
      // If SMS field is empty, default to the phone number
      sms:          form.sms.trim() || phone,
      address:      form.address.trim(),
      notes:        form.notes.trim(),
      isPrimary:    form.isPrimary,
      isEmergency:  form.isEmergency,
      updatedAt:    Timestamp.now(),
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, 'users', user.uid, 'contacts', editingId), payload);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'contacts'), {
          ...payload,
          createdAt: Timestamp.now(),
        });
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save contact:', err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c) => {
    setForm({
      name:         c.name         || '',
      role:         c.role         || 'Primary Doctor',
      specialty:    c.specialty    || '',
      organization: c.organization || '',
      email:        c.email        || '',
      phone:        c.phone        || '',
      sms:          c.sms          || '',
      address:      c.address      || '',
      notes:        c.notes        || '',
      isPrimary:    !!c.isPrimary,
      isEmergency:  !!c.isEmergency,
    });
    setEditingId(c.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'contacts', id));
  };

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1400);
    } catch { /* clipboard may be unavailable */ }
  };

  // ── Filtering ──
  const filtered = contacts.filter((c) => {
    if (filterRole !== 'all' && c.role !== filterRole) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q)          ||
      c.role?.toLowerCase().includes(q)          ||
      c.organization?.toLowerCase().includes(q)  ||
      c.specialty?.toLowerCase().includes(q)     ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const emergency = filtered.filter((c) => c.isEmergency);
  const primary   = filtered.filter((c) => c.isPrimary && !c.isEmergency);
  const others    = filtered.filter((c) => !c.isEmergency && !c.isPrimary);

  // ── Contact card renderer ──
  const renderCard = (c) => {
    const hasSms = c.sms && c.sms !== c.phone;
    return (
      <div
        key={c.id}
        className={
          'contact-card' +
          (c.isEmergency ? ' contact-emergency' : '') +
          (c.isPrimary   ? ' contact-primary'   : '')
        }
      >
        <div className="contact-top">
          <div className="contact-avatar">{ROLE_ICONS[c.role] || '📇'}</div>
          <div className="contact-header">
            <div className="contact-name-row">
              <h3>{c.name}</h3>
              {c.isEmergency && <span className="badge badge-emergency">Emergency</span>}
              {c.isPrimary   && <span className="badge badge-primary">Primary</span>}
            </div>
            <p className="contact-role">
              {c.role}{c.specialty && <> · <span>{c.specialty}</span></>}
            </p>
            {c.organization && <p className="contact-org">🏥 {c.organization}</p>}
          </div>
        </div>

        <div className="contact-methods">
          {c.email && (
            <div className="method">
              <span className="method-label">✉️ Email</span>
              <a href={mailLink(c.email)} className="method-value">{c.email}</a>
              <button
                type="button"
                className="method-copy"
                onClick={() => copy(c.email, `${c.id}-email`)}
                aria-label="Copy email"
              >
                {copiedKey === `${c.id}-email` ? '✓' : '📋'}
              </button>
            </div>
          )}
          {c.phone && (
            <div className="method">
              <span className="method-label">📞 Phone</span>
              <a href={telLink(c.phone)} className="method-value">{fmtPhone(c.phone)}</a>
              <button
                type="button"
                className="method-copy"
                onClick={() => copy(c.phone, `${c.id}-phone`)}
                aria-label="Copy phone"
              >
                {copiedKey === `${c.id}-phone` ? '✓' : '📋'}
              </button>
            </div>
          )}
          {hasSms && (
            <div className="method">
              <span className="method-label">💬 SMS</span>
              <a href={smsLink(c.sms)} className="method-value">{fmtPhone(c.sms)}</a>
              <button
                type="button"
                className="method-copy"
                onClick={() => copy(c.sms, `${c.id}-sms`)}
                aria-label="Copy SMS number"
              >
                {copiedKey === `${c.id}-sms` ? '✓' : '📋'}
              </button>
            </div>
          )}
        </div>

        {c.address && <p className="contact-address">📍 {c.address}</p>}
        {c.notes   && <p className="contact-notes">{c.notes}</p>}

        <div className="contact-actions">
          {c.phone && (
            <a href={telLink(c.phone)} className="btn-action btn-call">📞 Call</a>
          )}
          {(c.sms || c.phone) && (
            <a href={smsLink(c.sms || c.phone)} className="btn-action btn-sms">💬 Text</a>
          )}
          {c.email && (
            <a href={mailLink(c.email)} className="btn-action btn-email">✉️ Email</a>
          )}
          <button className="btn-edit"   onClick={() => startEdit(c)}>Edit</button>
          <button className="btn-delete" onClick={() => handleDelete(c.id)}>Delete</button>
        </div>
      </div>
    );
  };

  const preferredLabel = {
    email: 'Email', phone: 'Phone Call', sms: 'Text Message', any: 'Any',
  }[myInfo.preferredContact];

  return (
    <div className="comm-page">
      <header className="dash-nav">
        <Link to="/" className="dash-logo">&#10084; HealthSimplify</Link>
        <Link to="/dashboard" className="comm-back-link">&larr; Dashboard</Link>
      </header>

      <main className="comm-main">
        <div className="comm-header">
          <div>
            <h1>Communication</h1>
            <p>Manage your contact information and care team directory.</p>
          </div>
        </div>

        {/* ── My Contact Info ── */}
        <section className="comm-section">
          <div className="comm-section-header">
            <h2>📬 My Contact Info</h2>
            <div className="section-header-actions">
              {meSaved && <span className="saved-indicator">✓ Saved</span>}
              {!editingMe && (
                <button
                  type="button"
                  className="btn-edit-inline"
                  onClick={() => setEditingMe(true)}
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          {editingMe ? (
            <div className="myinfo-form">
              <div className="myinfo-grid">
                <div className="field">
                  <label>Email (from account)</label>
                  <input type="email" value={user?.email || ''} readOnly disabled />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={myInfo.phone}
                    onChange={(e) => setMyInfo({ ...myInfo, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="field">
                  <label>Preferred Contact Method</label>
                  <select
                    value={myInfo.preferredContact}
                    onChange={(e) => setMyInfo({ ...myInfo, preferredContact: e.target.value })}
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone Call</option>
                    <option value="sms">Text Message (SMS)</option>
                    <option value="any">Any method</option>
                  </select>
                </div>
              </div>

              <div className="comm-prefs">
                <label className="pref-toggle">
                  <input
                    type="checkbox"
                    checked={myInfo.emailNotifications}
                    onChange={(e) => setMyInfo({ ...myInfo, emailNotifications: e.target.checked })}
                  />
                  Receive email notifications
                </label>
                <label className="pref-toggle">
                  <input
                    type="checkbox"
                    checked={myInfo.smsNotifications}
                    onChange={(e) => setMyInfo({ ...myInfo, smsNotifications: e.target.checked })}
                  />
                  Receive SMS notifications
                </label>
              </div>

              <div className="form-actions">
                <button className="btn-save" onClick={saveMyInfo} disabled={savingMe}>
                  {savingMe ? 'Saving…' : 'Save Changes'}
                </button>
                <button className="btn-cancel" onClick={() => setEditingMe(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="myinfo-display">
              <div className="myinfo-row">
                <span className="myinfo-icon">✉️</span>
                <div>
                  <strong>Email</strong>
                  {user?.email ? (
                    <a href={mailLink(user.email)}>{user.email}</a>
                  ) : (
                    <em>Not set</em>
                  )}
                </div>
              </div>
              <div className="myinfo-row">
                <span className="myinfo-icon">📞</span>
                <div>
                  <strong>Phone</strong>
                  {myInfo.phone ? (
                    <a href={telLink(myInfo.phone)}>{fmtPhone(myInfo.phone)}</a>
                  ) : (
                    <em>Not set</em>
                  )}
                </div>
              </div>
              <div className="myinfo-row">
                <span className="myinfo-icon">⚙️</span>
                <div>
                  <strong>Preferences</strong>
                  <span className="myinfo-prefs-text">
                    Preferred: <em>{preferredLabel}</em>
                    {' · '}Email alerts: {myInfo.emailNotifications ? 'On' : 'Off'}
                    {' · '}SMS alerts: {myInfo.smsNotifications ? 'On' : 'Off'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Care Team ── */}
        <section className="comm-section">
          <div className="comm-section-header">
            <h2>👥 Care Team</h2>
            {!showForm && (
              <button className="btn-add" onClick={() => setShowForm(true)}>+ Add Contact</button>
            )}
          </div>

          {showForm && (
            <form className="contact-form" onSubmit={handleSubmit}>
              <h3>{editingId ? 'Edit Contact' : 'New Contact'}</h3>

              <div className="form-grid">
                <div className="field">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={setField('name')}
                    placeholder="Dr. Jane Smith"
                  />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </div>

                <div className="field">
                  <label>Role *</label>
                  <select value={form.role} onChange={setField('role')}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label>Specialty</label>
                  <input
                    type="text"
                    value={form.specialty}
                    onChange={setField('specialty')}
                    placeholder="Cardiology"
                  />
                </div>

                <div className="field">
                  <label>Organization</label>
                  <input
                    type="text"
                    value={form.organization}
                    onChange={setField('organization')}
                    placeholder="City Hospital"
                  />
                </div>

                <div className="field form-full">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={setField('email')}
                    placeholder="jane.smith@hospital.com"
                  />
                  {errors.email && <span className="field-error">{errors.email}</span>}
                </div>

                <div className="field">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={setField('phone')}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="field">
                  <label>SMS (if different)</label>
                  <input
                    type="tel"
                    value={form.sms}
                    onChange={setField('sms')}
                    placeholder="Defaults to phone"
                  />
                </div>

                <div className="field form-full">
                  <label>Address</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={setField('address')}
                    placeholder="123 Main St, Suite 400"
                  />
                </div>

                <div className="field form-full">
                  <label>Notes</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={setField('notes')}
                    placeholder="Office hours, how to reach them, preferences…"
                  />
                </div>
              </div>

              {errors.contactMethod && (
                <p className="form-level-error">{errors.contactMethod}</p>
              )}

              <div className="form-toggles">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.isPrimary}
                    onChange={setField('isPrimary')}
                  />
                  ⭐ Primary care provider
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.isEmergency}
                    onChange={setField('isEmergency')}
                  />
                  🆘 Emergency contact
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Contact'}
                </button>
                <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          )}

          {!showForm && contacts.length > 0 && (
            <div className="comm-search-row">
              <div className="comm-search">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search contacts…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
                )}
              </div>
              <select
                className="role-filter"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="all">All roles</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}

          {loading ? (
            <div className="comm-loading">Loading contacts…</div>
          ) : filtered.length === 0 ? (
            <div className="comm-empty">
              <span className="empty-icon">📇</span>
              <p>
                {contacts.length === 0
                  ? 'No care team contacts yet — add your first one!'
                  : 'No contacts match your filter.'}
              </p>
              {contacts.length === 0 && !showForm && (
                <button className="btn-add" onClick={() => setShowForm(true)}>+ Add Contact</button>
              )}
            </div>
          ) : (
            <>
              {emergency.length > 0 && (
                <div className="contact-group contact-group-emergency">
                  <h3 className="group-title">🆘 Emergency</h3>
                  <div className="contact-list">{emergency.map(renderCard)}</div>
                </div>
              )}
              {primary.length > 0 && (
                <div className="contact-group">
                  <h3 className="group-title">⭐ Primary Care</h3>
                  <div className="contact-list">{primary.map(renderCard)}</div>
                </div>
              )}
              {others.length > 0 && (
                <div className="contact-group">
                  {(emergency.length > 0 || primary.length > 0) && (
                    <h3 className="group-title">Other Contacts</h3>
                  )}
                  <div className="contact-list">{others.map(renderCard)}</div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
