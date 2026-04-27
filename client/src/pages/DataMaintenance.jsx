import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLink from '../components/BrandLink';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import '../styles/DataMaintenance.css';

// Collections the user owns. `vitals` is global (filtered by userId); the rest
// are subcollections of `users/{uid}`.
const COLLECTIONS = [
  { key: 'vitals',       label: 'Vitals',       icon: '❤️',  global: true  },
  { key: 'medications',  label: 'Medications',  icon: '💊',  global: false },
  { key: 'appointments', label: 'Appointments', icon: '📅',  global: false },
  { key: 'notes',        label: 'Notes',        icon: '📝',  global: false },
  { key: 'contacts',     label: 'Contacts',     icon: '📇',  global: false },
];

// ── Helpers ──
const queryFor = (uid, c) =>
  c.global
    ? query(collection(db, c.key), where('userId', '==', uid))
    : query(collection(db, 'users', uid, c.key));

// Serialize Firestore Timestamps to ISO strings for export.
const serializeDoc = (data) => {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && typeof v.toDate === 'function') {
      out[k] = v.toDate().toISOString();
    } else {
      out[k] = v;
    }
  }
  return out;
};

// Convert known timestamp fields back to Timestamp on import.
const deserializeDoc = (data) => {
  const out = { ...data };
  ['createdAt', 'updatedAt'].forEach((f) => {
    if (typeof out[f] === 'string') {
      const d = new Date(out[f]);
      if (!isNaN(d.getTime())) out[f] = Timestamp.fromDate(d);
    }
  });
  delete out.id; // never write the doc id into the document body
  return out;
};

// Minimal CSV generator with proper escaping.
const toCSV = (rows) => {
  if (!rows.length) return '';
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    let s;
    if (Array.isArray(v))       s = v.join('; ');
    else if (typeof v === 'object') s = JSON.stringify(v);
    else                         s = String(v);
    return /[,\n"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    keys.join(','),
    ...rows.map((r) => keys.map((k) => esc(r[k])).join(',')),
  ].join('\n');
};

const download = (filename, content, mime = 'application/json') => {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

// Delete everything returned by a Firestore query, batched 500-at-a-time.
const deleteAllInQuery = async (q) => {
  const snap = await getDocs(q);
  for (let i = 0; i < snap.docs.length; i += 500) {
    const chunk = snap.docs.slice(i, i + 500);
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.docs.length;
};

export default function DataMaintenance() {
  const { user, profile } = useAuth();
  const navigate          = useNavigate();

  const [counts, setCounts]           = useState({});
  const [lastUpdated, setLastUpdated] = useState({});

  const [exporting, setExporting]   = useState(false);
  const [exportingKey, setExportingKey] = useState(null);

  const [importFile, setImportFile] = useState(null);
  const [importMode, setImportMode] = useState('merge'); // 'merge' | 'replace'
  const [importing, setImporting]   = useState(false);

  const [clearTarget, setClearTarget]       = useState('');
  const [clearConfirm, setClearConfirm]     = useState(false);
  const [clearing, setClearing]             = useState(false);

  const [showDelete, setShowDelete]         = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteText, setDeleteText]         = useState('');
  const [deleting, setDeleting]             = useState(false);

  const [message, setMessage] = useState(null); // { type: 'ok'|'err', text: string }

  const flash = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4200);
  };

  // ── Live counts and last-updated per collection ──
  useEffect(() => {
    if (!user) return;
    const unsubs = COLLECTIONS.map((c) => {
      const q = queryFor(user.uid, c);
      return onSnapshot(q, (snap) => {
        setCounts((prev) => ({ ...prev, [c.key]: snap.size }));
        let newest = null;
        snap.docs.forEach((d) => {
          const data = d.data();
          const ts   = data.updatedAt || data.createdAt;
          if (!ts) return;
          const date = ts.toDate ? ts.toDate() : new Date(ts);
          if (!newest || date > newest) newest = date;
        });
        setLastUpdated((prev) => ({ ...prev, [c.key]: newest }));
      });
    });
    return () => unsubs.forEach((u) => u());
  }, [user]);

  // ── Export all (JSON) ──
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const payload = {
        app:        'HealthSimplify',
        version:    1,
        exportedAt: new Date().toISOString(),
        user: {
          uid:   user.uid,
          email: user.email,
        },
        profile: profile ? serializeDoc(profile) : null,
        collections: {},
      };
      for (const c of COLLECTIONS) {
        const snap = await getDocs(queryFor(user.uid, c));
        payload.collections[c.key] = snap.docs.map((d) => ({
          id: d.id,
          ...serializeDoc(d.data()),
        }));
      }
      const stamp = new Date().toISOString().slice(0, 10);
      download(`healthsimplify-backup-${stamp}.json`, JSON.stringify(payload, null, 2));
      flash('ok', 'Full backup downloaded.');
    } catch (err) {
      console.error(err);
      flash('err', 'Export failed. Check the console for details.');
    } finally {
      setExporting(false);
    }
  };

  // ── Export single collection (CSV) ──
  const handleExportCsv = async (c) => {
    setExportingKey(c.key);
    try {
      const snap = await getDocs(queryFor(user.uid, c));
      const rows = snap.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) }));
      if (!rows.length) {
        flash('err', `No ${c.label.toLowerCase()} to export.`);
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      download(`healthsimplify-${c.key}-${stamp}.csv`, toCSV(rows), 'text/csv');
      flash('ok', `${c.label} exported (${rows.length} rows).`);
    } catch (err) {
      console.error(err);
      flash('err', `Failed to export ${c.label}.`);
    } finally {
      setExportingKey(null);
    }
  };

  // ── Import backup ──
  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      const data = JSON.parse(text);

      if (!data.collections || typeof data.collections !== 'object') {
        throw new Error('Invalid backup file — missing "collections" object.');
      }

      let totalAdded   = 0;
      let totalCleared = 0;

      for (const c of COLLECTIONS) {
        const records = data.collections[c.key];
        if (!Array.isArray(records)) continue;

        if (importMode === 'replace') {
          totalCleared += await deleteAllInQuery(queryFor(user.uid, c));
        }

        for (const raw of records) {
          const body = deserializeDoc(raw);
          if (c.global) {
            body.userId = user.uid;
            await addDoc(collection(db, c.key), body);
          } else {
            await addDoc(collection(db, 'users', user.uid, c.key), body);
          }
          totalAdded++;
        }
      }

      flash(
        'ok',
        importMode === 'replace'
          ? `Imported ${totalAdded} records (removed ${totalCleared} existing).`
          : `Imported ${totalAdded} records (existing data preserved).`,
      );
      setImportFile(null);
    } catch (err) {
      console.error(err);
      flash('err', err.message || 'Import failed — is the file a valid backup?');
    } finally {
      setImporting(false);
    }
  };

  // ── Bulk clear a single collection ──
  const handleClear = async () => {
    if (!clearTarget) return;
    const c = COLLECTIONS.find((x) => x.key === clearTarget);
    if (!c) return;
    setClearing(true);
    try {
      const removed = await deleteAllInQuery(queryFor(user.uid, c));
      flash('ok', `Removed ${removed} ${c.label.toLowerCase()}.`);
      setClearTarget('');
      setClearConfirm(false);
    } catch (err) {
      console.error(err);
      flash('err', `Failed to clear ${c.label}.`);
    } finally {
      setClearing(false);
    }
  };

  // ── Delete entire account ──
  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') {
      flash('err', 'Please type DELETE to confirm.');
      return;
    }
    if (!deletePassword) {
      flash('err', 'Enter your password to confirm.');
      return;
    }
    setDeleting(true);
    try {
      // Re-authenticate (Firebase requires recent login for deletion)
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Wipe all subcollections
      for (const c of COLLECTIONS) {
        await deleteAllInQuery(queryFor(user.uid, c));
      }
      // Delete profile doc
      await deleteDoc(doc(db, 'users', user.uid));
      // Finally delete the auth user
      await deleteUser(auth.currentUser);

      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      const msg =
        err.code === 'auth/wrong-password' ? 'Incorrect password.'
        : err.code === 'auth/too-many-requests' ? 'Too many attempts — try again later.'
        : err.message || 'Failed to delete account.';
      flash('err', msg);
    } finally {
      setDeleting(false);
    }
  };

  const fmtDate = (d) => {
    if (!d) return 'Never';
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const totalRecords = Object.values(counts).reduce((a, b) => a + (b || 0), 0);

  return (
    <div className="dm-page">
      <header className="dash-nav">
        <BrandLink />
        <Link to="/dashboard" className="dm-back-link">&larr; Dashboard</Link>
      </header>

      <main className="dm-main">
        <div className="dm-header">
          <div>
            <h1>Data Maintenance</h1>
            <p>Export, import, and manage all your health data.</p>
          </div>
        </div>

        {message && (
          <div className={`dm-toast dm-toast-${message.type}`}>
            <span>{message.type === 'ok' ? '✓' : '⚠️'}</span>
            {message.text}
          </div>
        )}

        {/* ── Overview ── */}
        <section className="dm-section">
          <div className="dm-section-header">
            <h2>📊 Overview</h2>
            <span className="dm-total">
              {totalRecords} total record{totalRecords === 1 ? '' : 's'}
            </span>
          </div>
          <div className="dm-summary-grid">
            {COLLECTIONS.map((c) => (
              <div key={c.key} className="dm-summary-card">
                <div className="dm-summary-icon">{c.icon}</div>
                <div className="dm-summary-body">
                  <p className="dm-summary-label">{c.label}</p>
                  <p className="dm-summary-count">
                    {counts[c.key] ?? '—'}
                  </p>
                  <p className="dm-summary-meta">
                    Last updated: {fmtDate(lastUpdated[c.key])}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Export ── */}
        <section className="dm-section">
          <div className="dm-section-header">
            <h2>⬇️ Export</h2>
          </div>
          <p className="dm-section-desc">
            Download a full backup of your data as JSON, or export individual collections as CSV.
          </p>

          <div className="dm-export-row">
            <button className="dm-btn-primary" onClick={handleExportAll} disabled={exporting}>
              {exporting ? 'Preparing backup…' : '📦 Download Full Backup (JSON)'}
            </button>
          </div>

          <div className="dm-csv-grid">
            {COLLECTIONS.map((c) => (
              <button
                key={c.key}
                className="dm-csv-btn"
                onClick={() => handleExportCsv(c)}
                disabled={exportingKey === c.key || !counts[c.key]}
              >
                <span className="dm-csv-icon">{c.icon}</span>
                <span className="dm-csv-label">
                  {exportingKey === c.key ? 'Exporting…' : `${c.label} (CSV)`}
                </span>
                <span className="dm-csv-count">{counts[c.key] ?? 0}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Import ── */}
        <section className="dm-section">
          <div className="dm-section-header">
            <h2>⬆️ Import</h2>
          </div>
          <p className="dm-section-desc">
            Restore from a HealthSimplify JSON backup. Choose <strong>Merge</strong> to
            add records alongside your existing data, or <strong>Replace</strong> to
            wipe each collection before importing.
          </p>

          <div className="dm-import-box">
            <label className="dm-file-picker">
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              <span className="dm-file-btn">Choose file…</span>
              <span className="dm-file-name">
                {importFile ? importFile.name : 'No file selected'}
              </span>
            </label>

            <div className="dm-import-mode">
              <label className={`dm-mode-opt${importMode === 'merge' ? ' dm-mode-active' : ''}`}>
                <input
                  type="radio"
                  name="import-mode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                />
                <strong>Merge</strong>
                <span>Keep existing records</span>
              </label>
              <label className={`dm-mode-opt${importMode === 'replace' ? ' dm-mode-active' : ''}`}>
                <input
                  type="radio"
                  name="import-mode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                <strong>Replace</strong>
                <span>Clear each collection first</span>
              </label>
            </div>

            <button
              className="dm-btn-primary"
              onClick={handleImport}
              disabled={!importFile || importing}
            >
              {importing ? 'Importing…' : 'Import Backup'}
            </button>
          </div>
        </section>

        {/* ── Bulk Clear ── */}
        <section className="dm-section">
          <div className="dm-section-header">
            <h2>🧹 Bulk Clear</h2>
          </div>
          <p className="dm-section-desc">
            Permanently remove every record in a selected collection. This cannot be undone.
          </p>

          <div className="dm-clear-row">
            <select
              value={clearTarget}
              onChange={(e) => { setClearTarget(e.target.value); setClearConfirm(false); }}
            >
              <option value="">Select a collection…</option>
              {COLLECTIONS.map((c) => (
                <option key={c.key} value={c.key} disabled={!counts[c.key]}>
                  {c.icon} {c.label} ({counts[c.key] ?? 0})
                </option>
              ))}
            </select>

            {clearTarget && !clearConfirm && (
              <button className="dm-btn-warn" onClick={() => setClearConfirm(true)}>
                Clear…
              </button>
            )}

            {clearTarget && clearConfirm && (
              <>
                <button
                  className="dm-btn-danger"
                  onClick={handleClear}
                  disabled={clearing}
                >
                  {clearing
                    ? 'Clearing…'
                    : `Yes, delete all ${COLLECTIONS.find((c) => c.key === clearTarget)?.label}`}
                </button>
                <button
                  className="dm-btn-ghost"
                  onClick={() => setClearConfirm(false)}
                  disabled={clearing}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </section>

        {/* ── Danger Zone ── */}
        <section className="dm-section dm-danger">
          <div className="dm-section-header">
            <h2>⚠️ Danger Zone</h2>
          </div>
          <div className="dm-danger-box">
            <div>
              <h3>Delete Account</h3>
              <p>
                Permanently delete your account, all health data, and revoke access.
                This cannot be undone.
              </p>
            </div>
            {!showDelete ? (
              <button className="dm-btn-danger" onClick={() => setShowDelete(true)}>
                Delete Account
              </button>
            ) : (
              <button
                className="dm-btn-ghost"
                onClick={() => {
                  setShowDelete(false);
                  setDeletePassword('');
                  setDeleteText('');
                }}
              >
                Cancel
              </button>
            )}
          </div>

          {showDelete && (
            <div className="dm-delete-form">
              <p className="dm-delete-warning">
                You are about to permanently delete your account and all data associated with it.
              </p>
              <div className="dm-field">
                <label>Confirm your password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Current password"
                  autoComplete="current-password"
                />
              </div>
              <div className="dm-field">
                <label>Type <code>DELETE</code> to confirm</label>
                <input
                  type="text"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              <button
                className="dm-btn-danger dm-btn-full"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteText !== 'DELETE' || !deletePassword}
              >
                {deleting ? 'Deleting account…' : 'Permanently Delete My Account'}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
