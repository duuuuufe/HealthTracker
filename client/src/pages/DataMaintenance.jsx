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
import '../styles/DataMaintenance.css';

/* ── Doctors ── */
const SPECIALTIES = [
  'General Practice', 'Cardiology', 'Dermatology', 'Endocrinology',
  'Gastroenterology', 'Neurology', 'Oncology', 'Ophthalmology',
  'Orthopedics', 'Pediatrics', 'Psychiatry', 'Pulmonology',
  'Radiology', 'Surgery', 'Urology', 'Other',
];

const EMPTY_DOCTOR = {
  name: '',
  specialty: 'General Practice',
  clinic: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

/* ── Medicines ── */
const FORMS = [
  'Tablet', 'Capsule', 'Liquid', 'Injection', 'Cream', 'Ointment',
  'Inhaler', 'Patch', 'Drops', 'Suppository', 'Powder', 'Other',
];

const EMPTY_MEDICINE = {
  name: '',
  genericName: '',
  form: 'Tablet',
  strength: '',
  manufacturer: '',
  notes: '',
};

/* ── System Records ── */
const RECORD_TYPES = [
  'Allergy', 'Condition', 'Insurance', 'Pharmacy', 'Lab', 'Procedure', 'Other',
];

const RECORD_ICONS = {
  Allergy:   '🤧',
  Condition: '🩺',
  Insurance: '📋',
  Pharmacy:  '💊',
  Lab:       '🔬',
  Procedure: '🏥',
  Other:     '📄',
};

const EMPTY_RECORD = {
  type: 'Allergy',
  title: '',
  value: '',
  notes: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fmtPhone = (p) => {
  if (!p) return '';
  const d = p.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === '1')
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return p;
};

export default function DataMaintenance() {
  const { user } = useAuth();

  // ── Active tab ──
  const [tab, setTab] = useState('doctors');

  // ── Doctors state ──
  const [doctors, setDoctors]           = useState([]);
  const [loadingDocs, setLoadingDocs]   = useState(true);
  const [showDocForm, setShowDocForm]   = useState(false);
  const [editDocId, setEditDocId]       = useState(null);
  const [docForm, setDocForm]           = useState(EMPTY_DOCTOR);
  const [docErrors, setDocErrors]       = useState({});
  const [savingDoc, setSavingDoc]       = useState(false);
  const [docSearch, setDocSearch]       = useState('');

  // ── Medicines state ──
  const [medicines, setMedicines]       = useState([]);
  const [loadingMeds, setLoadingMeds]   = useState(true);
  const [showMedForm, setShowMedForm]   = useState(false);
  const [editMedId, setEditMedId]       = useState(null);
  const [medForm, setMedForm]           = useState(EMPTY_MEDICINE);
  const [medErrors, setMedErrors]       = useState({});
  const [savingMed, setSavingMed]       = useState(false);
  const [medSearch, setMedSearch]       = useState('');

  // ── System Records state ──
  const [records, setRecords]           = useState([]);
  const [loadingRecs, setLoadingRecs]   = useState(true);
  const [showRecForm, setShowRecForm]   = useState(false);
  const [editRecId, setEditRecId]       = useState(null);
  const [recForm, setRecForm]           = useState(EMPTY_RECORD);
  const [recErrors, setRecErrors]       = useState({});
  const [savingRec, setSavingRec]       = useState(false);
  const [recSearch, setRecSearch]       = useState('');
  const [filterType, setFilterType]     = useState('all');

  // ── Real-time listeners ──
  useEffect(() => {
    if (!user) return;
    const unsubs = [];

    // Doctors
    const qDocs = query(collection(db, 'users', user.uid, 'doctors'), orderBy('createdAt', 'desc'));
    unsubs.push(onSnapshot(qDocs, (snap) => {
      setDoctors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingDocs(false);
    }));

    // Medicines
    const qMeds = query(collection(db, 'users', user.uid, 'medicines'), orderBy('createdAt', 'desc'));
    unsubs.push(onSnapshot(qMeds, (snap) => {
      setMedicines(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingMeds(false);
    }));

    // System Records
    const qRecs = query(collection(db, 'users', user.uid, 'systemRecords'), orderBy('createdAt', 'desc'));
    unsubs.push(onSnapshot(qRecs, (snap) => {
      setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingRecs(false);
    }));

    return () => unsubs.forEach((u) => u());
  }, [user]);

  // ══════════════════════════════════════════
  //  DOCTORS
  // ══════════════════════════════════════════
  const setDocField = (field) => (e) => {
    setDocForm((f) => ({ ...f, [field]: e.target.value }));
    setDocErrors((err) => ({ ...err, [field]: '' }));
  };

  const resetDocForm = () => {
    setDocForm(EMPTY_DOCTOR);
    setDocErrors({});
    setEditDocId(null);
    setShowDocForm(false);
  };

  const validateDoc = () => {
    const e = {};
    if (!docForm.name.trim()) e.name = 'Doctor name is required';
    if (docForm.email.trim() && !EMAIL_RE.test(docForm.email.trim())) e.email = 'Invalid email';
    setDocErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleDocSubmit = async (ev) => {
    ev.preventDefault();
    if (!validateDoc()) return;
    setSavingDoc(true);
    const payload = {
      name:      docForm.name.trim(),
      specialty: docForm.specialty,
      clinic:    docForm.clinic.trim(),
      phone:     docForm.phone.trim(),
      email:     docForm.email.trim(),
      address:   docForm.address.trim(),
      notes:     docForm.notes.trim(),
      updatedAt: Timestamp.now(),
    };
    try {
      if (editDocId) {
        await updateDoc(doc(db, 'users', user.uid, 'doctors', editDocId), payload);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'doctors'), { ...payload, createdAt: Timestamp.now() });
      }
      resetDocForm();
    } catch (err) {
      console.error('Failed to save doctor:', err);
    } finally {
      setSavingDoc(false);
    }
  };

  const startEditDoc = (d) => {
    setDocForm({
      name:      d.name      || '',
      specialty: d.specialty || 'General Practice',
      clinic:    d.clinic    || '',
      phone:     d.phone     || '',
      email:     d.email     || '',
      address:   d.address   || '',
      notes:     d.notes     || '',
    });
    setEditDocId(d.id);
    setShowDocForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteDoctor = async (id) => {
    if (!window.confirm('Delete this doctor?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'doctors', id));
  };

  const filteredDocs = doctors.filter((d) => {
    if (!docSearch.trim()) return true;
    const q = docSearch.toLowerCase();
    return (
      d.name?.toLowerCase().includes(q) ||
      d.specialty?.toLowerCase().includes(q) ||
      d.clinic?.toLowerCase().includes(q)
    );
  });

  // ══════════════════════════════════════════
  //  MEDICINES
  // ══════════════════════════════════════════
  const setMedField = (field) => (e) => {
    setMedForm((f) => ({ ...f, [field]: e.target.value }));
    setMedErrors((err) => ({ ...err, [field]: '' }));
  };

  const resetMedForm = () => {
    setMedForm(EMPTY_MEDICINE);
    setMedErrors({});
    setEditMedId(null);
    setShowMedForm(false);
  };

  const validateMed = () => {
    const e = {};
    if (!medForm.name.trim()) e.name = 'Medicine name is required';
    setMedErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleMedSubmit = async (ev) => {
    ev.preventDefault();
    if (!validateMed()) return;
    setSavingMed(true);
    const payload = {
      name:         medForm.name.trim(),
      genericName:  medForm.genericName.trim(),
      form:         medForm.form,
      strength:     medForm.strength.trim(),
      manufacturer: medForm.manufacturer.trim(),
      notes:        medForm.notes.trim(),
      updatedAt:    Timestamp.now(),
    };
    try {
      if (editMedId) {
        await updateDoc(doc(db, 'users', user.uid, 'medicines', editMedId), payload);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'medicines'), { ...payload, createdAt: Timestamp.now() });
      }
      resetMedForm();
    } catch (err) {
      console.error('Failed to save medicine:', err);
    } finally {
      setSavingMed(false);
    }
  };

  const startEditMed = (m) => {
    setMedForm({
      name:         m.name         || '',
      genericName:  m.genericName  || '',
      form:         m.form         || 'Tablet',
      strength:     m.strength     || '',
      manufacturer: m.manufacturer || '',
      notes:        m.notes        || '',
    });
    setEditMedId(m.id);
    setShowMedForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteMedicine = async (id) => {
    if (!window.confirm('Delete this medicine?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'medicines', id));
  };

  const filteredMeds = medicines.filter((m) => {
    if (!medSearch.trim()) return true;
    const q = medSearch.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.genericName?.toLowerCase().includes(q) ||
      m.manufacturer?.toLowerCase().includes(q)
    );
  });

  // ══════════════════════════════════════════
  //  SYSTEM RECORDS
  // ══════════════════════════════════════════
  const setRecField = (field) => (e) => {
    setRecForm((f) => ({ ...f, [field]: e.target.value }));
    setRecErrors((err) => ({ ...err, [field]: '' }));
  };

  const resetRecForm = () => {
    setRecForm(EMPTY_RECORD);
    setRecErrors({});
    setEditRecId(null);
    setShowRecForm(false);
  };

  const validateRec = () => {
    const e = {};
    if (!recForm.title.trim()) e.title = 'Title is required';
    setRecErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRecSubmit = async (ev) => {
    ev.preventDefault();
    if (!validateRec()) return;
    setSavingRec(true);
    const payload = {
      type:      recForm.type,
      title:     recForm.title.trim(),
      value:     recForm.value.trim(),
      notes:     recForm.notes.trim(),
      updatedAt: Timestamp.now(),
    };
    try {
      if (editRecId) {
        await updateDoc(doc(db, 'users', user.uid, 'systemRecords', editRecId), payload);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'systemRecords'), { ...payload, createdAt: Timestamp.now() });
      }
      resetRecForm();
    } catch (err) {
      console.error('Failed to save record:', err);
    } finally {
      setSavingRec(false);
    }
  };

  const startEditRec = (r) => {
    setRecForm({
      type:  r.type  || 'Allergy',
      title: r.title || '',
      value: r.value || '',
      notes: r.notes || '',
    });
    setEditRecId(r.id);
    setShowRecForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'systemRecords', id));
  };

  const filteredRecs = records.filter((r) => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (!recSearch.trim()) return true;
    const q = recSearch.toLowerCase();
    return (
      r.title?.toLowerCase().includes(q) ||
      r.value?.toLowerCase().includes(q) ||
      r.type?.toLowerCase().includes(q)
    );
  });

  // ══════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════
  return (
    <div className="dm-page">
      <header className="dash-nav">
        <Link to="/" className="dash-logo">&#10084; HealthSimplify</Link>
        <Link to="/dashboard" className="dm-back-link">&larr; Dashboard</Link>
      </header>

      <main className="dm-main">
        <div className="dm-header">
          <div>
            <h1>Data Maintenance</h1>
            <p>Add or update doctors, medicines, and system records.</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="dm-tabs">
          <button
            className={`dm-tab ${tab === 'doctors' ? 'dm-tab-active' : ''}`}
            onClick={() => setTab('doctors')}
          >
            🩺 Doctors <span className="dm-tab-count">{doctors.length}</span>
          </button>
          <button
            className={`dm-tab ${tab === 'medicines' ? 'dm-tab-active' : ''}`}
            onClick={() => setTab('medicines')}
          >
            💊 Medicines <span className="dm-tab-count">{medicines.length}</span>
          </button>
          <button
            className={`dm-tab ${tab === 'records' ? 'dm-tab-active' : ''}`}
            onClick={() => setTab('records')}
          >
            📄 System Records <span className="dm-tab-count">{records.length}</span>
          </button>
        </div>

        {/* ═══ Doctors Tab ═══ */}
        {tab === 'doctors' && (
          <section className="dm-section">
            <div className="dm-section-header">
              <h2>🩺 Doctor Directory</h2>
              {!showDocForm && (
                <button className="btn-add" onClick={() => setShowDocForm(true)}>+ Add Doctor</button>
              )}
            </div>

            {showDocForm && (
              <form className="dm-form" onSubmit={handleDocSubmit}>
                <h3>{editDocId ? 'Edit Doctor' : 'New Doctor'}</h3>
                <div className="form-grid">
                  <div className="field">
                    <label>Name *</label>
                    <input type="text" value={docForm.name} onChange={setDocField('name')} placeholder="Dr. Jane Smith" />
                    {docErrors.name && <span className="field-error">{docErrors.name}</span>}
                  </div>
                  <div className="field">
                    <label>Specialty</label>
                    <select value={docForm.specialty} onChange={setDocField('specialty')}>
                      {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Clinic / Hospital</label>
                    <input type="text" value={docForm.clinic} onChange={setDocField('clinic')} placeholder="City Medical Center" />
                  </div>
                  <div className="field">
                    <label>Phone</label>
                    <input type="tel" value={docForm.phone} onChange={setDocField('phone')} placeholder="(555) 123-4567" />
                  </div>
                  <div className="field form-full">
                    <label>Email</label>
                    <input type="email" value={docForm.email} onChange={setDocField('email')} placeholder="dr.smith@hospital.com" />
                    {docErrors.email && <span className="field-error">{docErrors.email}</span>}
                  </div>
                  <div className="field form-full">
                    <label>Address</label>
                    <input type="text" value={docForm.address} onChange={setDocField('address')} placeholder="123 Medical Dr, Suite 200" />
                  </div>
                  <div className="field form-full">
                    <label>Notes</label>
                    <textarea rows={3} value={docForm.notes} onChange={setDocField('notes')} placeholder="Office hours, specializations, referral info..." />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-save" disabled={savingDoc}>
                    {savingDoc ? 'Saving...' : editDocId ? 'Save Changes' : 'Add Doctor'}
                  </button>
                  <button type="button" className="btn-cancel" onClick={resetDocForm}>Cancel</button>
                </div>
              </form>
            )}

            {!showDocForm && doctors.length > 0 && (
              <div className="dm-search-row">
                <div className="dm-search">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search doctors..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                  />
                  {docSearch && <button className="search-clear" onClick={() => setDocSearch('')}>✕</button>}
                </div>
              </div>
            )}

            {loadingDocs ? (
              <div className="dm-loading">Loading doctors...</div>
            ) : filteredDocs.length === 0 ? (
              <div className="dm-empty">
                <span className="empty-icon">🩺</span>
                <p>{doctors.length === 0 ? 'No doctors added yet — add your first one!' : 'No doctors match your search.'}</p>
                {doctors.length === 0 && !showDocForm && (
                  <button className="btn-add" onClick={() => setShowDocForm(true)}>+ Add Doctor</button>
                )}
              </div>
            ) : (
              <div className="dm-card-list">
                {filteredDocs.map((d) => (
                  <div key={d.id} className="dm-card">
                    <div className="dm-card-top">
                      <div className="dm-card-avatar">🩺</div>
                      <div className="dm-card-header">
                        <h3>{d.name}</h3>
                        <p className="dm-card-sub">{d.specialty}</p>
                        {d.clinic && <p className="dm-card-org">🏥 {d.clinic}</p>}
                      </div>
                    </div>
                    <div className="dm-card-details">
                      {d.phone && <div className="dm-detail"><span className="dm-detail-label">📞 Phone</span><span>{fmtPhone(d.phone)}</span></div>}
                      {d.email && <div className="dm-detail"><span className="dm-detail-label">✉️ Email</span><span>{d.email}</span></div>}
                      {d.address && <div className="dm-detail"><span className="dm-detail-label">📍 Address</span><span>{d.address}</span></div>}
                    </div>
                    {d.notes && <p className="dm-card-notes">{d.notes}</p>}
                    <div className="dm-card-actions">
                      <button className="btn-edit" onClick={() => startEditDoc(d)}>Edit</button>
                      <button className="btn-delete" onClick={() => deleteDoctor(d.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ═══ Medicines Tab ═══ */}
        {tab === 'medicines' && (
          <section className="dm-section">
            <div className="dm-section-header">
              <h2>💊 Medicine Catalog</h2>
              {!showMedForm && (
                <button className="btn-add" onClick={() => setShowMedForm(true)}>+ Add Medicine</button>
              )}
            </div>

            {showMedForm && (
              <form className="dm-form" onSubmit={handleMedSubmit}>
                <h3>{editMedId ? 'Edit Medicine' : 'New Medicine'}</h3>
                <div className="form-grid">
                  <div className="field">
                    <label>Brand Name *</label>
                    <input type="text" value={medForm.name} onChange={setMedField('name')} placeholder="Lipitor" />
                    {medErrors.name && <span className="field-error">{medErrors.name}</span>}
                  </div>
                  <div className="field">
                    <label>Generic Name</label>
                    <input type="text" value={medForm.genericName} onChange={setMedField('genericName')} placeholder="Atorvastatin" />
                  </div>
                  <div className="field">
                    <label>Form</label>
                    <select value={medForm.form} onChange={setMedField('form')}>
                      {FORMS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Strength / Dosage</label>
                    <input type="text" value={medForm.strength} onChange={setMedField('strength')} placeholder="10mg" />
                  </div>
                  <div className="field form-full">
                    <label>Manufacturer</label>
                    <input type="text" value={medForm.manufacturer} onChange={setMedField('manufacturer')} placeholder="Pfizer" />
                  </div>
                  <div className="field form-full">
                    <label>Notes</label>
                    <textarea rows={3} value={medForm.notes} onChange={setMedField('notes')} placeholder="Side effects, interactions, usage instructions..." />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-save" disabled={savingMed}>
                    {savingMed ? 'Saving...' : editMedId ? 'Save Changes' : 'Add Medicine'}
                  </button>
                  <button type="button" className="btn-cancel" onClick={resetMedForm}>Cancel</button>
                </div>
              </form>
            )}

            {!showMedForm && medicines.length > 0 && (
              <div className="dm-search-row">
                <div className="dm-search">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search medicines..."
                    value={medSearch}
                    onChange={(e) => setMedSearch(e.target.value)}
                  />
                  {medSearch && <button className="search-clear" onClick={() => setMedSearch('')}>✕</button>}
                </div>
              </div>
            )}

            {loadingMeds ? (
              <div className="dm-loading">Loading medicines...</div>
            ) : filteredMeds.length === 0 ? (
              <div className="dm-empty">
                <span className="empty-icon">💊</span>
                <p>{medicines.length === 0 ? 'No medicines added yet — add your first one!' : 'No medicines match your search.'}</p>
                {medicines.length === 0 && !showMedForm && (
                  <button className="btn-add" onClick={() => setShowMedForm(true)}>+ Add Medicine</button>
                )}
              </div>
            ) : (
              <div className="dm-card-list">
                {filteredMeds.map((m) => (
                  <div key={m.id} className="dm-card">
                    <div className="dm-card-top">
                      <div className="dm-card-avatar dm-card-avatar-med">💊</div>
                      <div className="dm-card-header">
                        <h3>{m.name}</h3>
                        {m.genericName && <p className="dm-card-sub">{m.genericName}</p>}
                        <div className="dm-med-tags">
                          <span className="dm-tag dm-tag-form">{m.form}</span>
                          {m.strength && <span className="dm-tag dm-tag-strength">{m.strength}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="dm-card-details">
                      {m.manufacturer && <div className="dm-detail"><span className="dm-detail-label">🏭 Manufacturer</span><span>{m.manufacturer}</span></div>}
                    </div>
                    {m.notes && <p className="dm-card-notes">{m.notes}</p>}
                    <div className="dm-card-actions">
                      <button className="btn-edit" onClick={() => startEditMed(m)}>Edit</button>
                      <button className="btn-delete" onClick={() => deleteMedicine(m.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ═══ System Records Tab ═══ */}
        {tab === 'records' && (
          <section className="dm-section">
            <div className="dm-section-header">
              <h2>📄 System Records</h2>
              {!showRecForm && (
                <button className="btn-add" onClick={() => setShowRecForm(true)}>+ Add Record</button>
              )}
            </div>

            {showRecForm && (
              <form className="dm-form" onSubmit={handleRecSubmit}>
                <h3>{editRecId ? 'Edit Record' : 'New Record'}</h3>
                <div className="form-grid">
                  <div className="field">
                    <label>Record Type *</label>
                    <select value={recForm.type} onChange={setRecField('type')}>
                      {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Title *</label>
                    <input type="text" value={recForm.title} onChange={setRecField('title')} placeholder="Penicillin Allergy" />
                    {recErrors.title && <span className="field-error">{recErrors.title}</span>}
                  </div>
                  <div className="field form-full">
                    <label>Value / Details</label>
                    <input type="text" value={recForm.value} onChange={setRecField('value')} placeholder="Severe — causes hives and swelling" />
                  </div>
                  <div className="field form-full">
                    <label>Notes</label>
                    <textarea rows={3} value={recForm.notes} onChange={setRecField('notes')} placeholder="Additional information, dates, reference numbers..." />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-save" disabled={savingRec}>
                    {savingRec ? 'Saving...' : editRecId ? 'Save Changes' : 'Add Record'}
                  </button>
                  <button type="button" className="btn-cancel" onClick={resetRecForm}>Cancel</button>
                </div>
              </form>
            )}

            {!showRecForm && records.length > 0 && (
              <div className="dm-search-row">
                <div className="dm-search">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={recSearch}
                    onChange={(e) => setRecSearch(e.target.value)}
                  />
                  {recSearch && <button className="search-clear" onClick={() => setRecSearch('')}>✕</button>}
                </div>
                <select className="dm-filter" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">All types</option>
                  {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            {loadingRecs ? (
              <div className="dm-loading">Loading records...</div>
            ) : filteredRecs.length === 0 ? (
              <div className="dm-empty">
                <span className="empty-icon">📄</span>
                <p>{records.length === 0 ? 'No system records yet — add your first one!' : 'No records match your filter.'}</p>
                {records.length === 0 && !showRecForm && (
                  <button className="btn-add" onClick={() => setShowRecForm(true)}>+ Add Record</button>
                )}
              </div>
            ) : (
              <div className="dm-card-list">
                {filteredRecs.map((r) => (
                  <div key={r.id} className="dm-card">
                    <div className="dm-card-top">
                      <div className="dm-card-avatar dm-card-avatar-rec">{RECORD_ICONS[r.type] || '📄'}</div>
                      <div className="dm-card-header">
                        <div className="dm-card-name-row">
                          <h3>{r.title}</h3>
                          <span className="dm-tag dm-tag-type">{r.type}</span>
                        </div>
                        {r.value && <p className="dm-card-sub">{r.value}</p>}
                      </div>
                    </div>
                    {r.notes && <p className="dm-card-notes">{r.notes}</p>}
                    <div className="dm-card-actions">
                      <button className="btn-edit" onClick={() => startEditRec(r)}>Edit</button>
                      <button className="btn-delete" onClick={() => deleteRecord(r.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
