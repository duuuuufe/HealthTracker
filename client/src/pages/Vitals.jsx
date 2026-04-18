import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import '../styles/Vitals.css';

const VITAL_TYPES = [
  { type: 'Blood Pressure', key: 'bloodPressure', unit: 'mmHg', fields: ['systolic', 'diastolic'] },
  { type: 'Heart Rate', key: 'heartRate', unit: 'bpm', fields: ['value'] },
  { type: 'Cholesterol', key: 'cholesterol', unit: 'mg/dL', fields: ['value'] },
  { type: 'Temperature', key: 'temperature', unit: '°F', fields: ['value'] },
  { type: 'Weight', key: 'weight', unit: 'lbs', fields: ['value'] },
  { type: 'Oxygen Saturation', key: 'oxygenSat', unit: '%', fields: ['value'] },
];

export default function Vitals() {
  const { user } = useAuth();
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bloodPressure: { systolic: '', diastolic: '' },
    heartRate: '',
    cholesterol: '',
    temperature: '',
    weight: '',
    oxygenSat: '',
  });

  useEffect(() => {
    const fetchVitals = async () => {
      if (!user) return;
      setError(null);
      try {
        const q = query(
          collection(db, 'vitals'),
          where('userId', '==', user.uid),
          orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);
        const fetchedVitals = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVitals(fetchedVitals);
      } catch (err) {
        setError('Failed to fetch vitals');
        console.error('Error fetching vitals:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVitals();
  }, [user]);

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      bloodPressure: { systolic: '', diastolic: '' },
      heartRate: '',
      cholesterol: '',
      temperature: '',
      weight: '',
      oxygenSat: '',
    });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const newVitals = [];

    // Blood Pressure
    if (formData.bloodPressure.systolic && formData.bloodPressure.diastolic) {
      newVitals.push({
        userId: user.uid,
        type: 'Blood Pressure',
        value: `${formData.bloodPressure.systolic}/${formData.bloodPressure.diastolic}`,
        unit: 'mmHg',
        date: formData.date,
      });
    }

    // Heart Rate
    if (formData.heartRate) {
      newVitals.push({
        userId: user.uid,
        type: 'Heart Rate',
        value: formData.heartRate,
        unit: 'bpm',
        date: formData.date,
      });
    }

    // Cholesterol
    if (formData.cholesterol) {
      newVitals.push({
        userId: user.uid,
        type: 'Cholesterol',
        value: formData.cholesterol,
        unit: 'mg/dL',
        date: formData.date,
      });
    }

    // Temperature
    if (formData.temperature) {
      newVitals.push({
        userId: user.uid,
        type: 'Temperature',
        value: formData.temperature,
        unit: '°F',
        date: formData.date,
      });
    }

    // Weight
    if (formData.weight) {
      newVitals.push({
        userId: user.uid,
        type: 'Weight',
        value: formData.weight,
        unit: 'lbs',
        date: formData.date,
      });
    }

    // Oxygen Saturation
    if (formData.oxygenSat) {
      newVitals.push({
        userId: user.uid,
        type: 'Oxygen Saturation',
        value: formData.oxygenSat,
        unit: '%',
        date: formData.date,
      });
    }

    if (newVitals.length === 0) {
      setError('Please fill in at least one vital field');
      return;
    }

    // Use a single timestamp for all vitals in this entry
    const entryTimestamp = new Date().toISOString();

    try {
      // If editing, delete old records for this entry first
      if (editingId) {
        const oldVitals = vitals.filter(v => v.createdAt === editingId || v.date === editingId);
        await Promise.all(oldVitals.map(v => deleteDoc(doc(db, 'vitals', v.id))));
      }

      // Save all vitals to Firebase with the same timestamp
      const savePromises = newVitals.map(vital => 
        addDoc(collection(db, 'vitals'), {
          ...vital,
          createdAt: entryTimestamp,
          entryId: entryTimestamp, // Use same ID to group them
        })
      );
      await Promise.all(savePromises);

      // Refresh the list
      const q = query(
        collection(db, 'vitals'),
        where('userId', '==', user.uid),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const fetchedVitals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVitals(fetchedVitals);
      resetForm();
      setShowForm(true);
    } catch (err) {
      setError('Failed to save vitals');
      console.error(err);
    }
  };

  // Group vitals by entryId (same for all vitals saved together)
  const groupedVitals = vitals.reduce((groups, vital) => {
    const entryId = vital.entryId || vital.createdAt || 'unknown';
    if (!groups[entryId]) {
      groups[entryId] = [];
    }
    groups[entryId].push(vital);
    return groups;
  }, {});

  const sortedEntryIds = Object.keys(groupedVitals).sort((a, b) => b.localeCompare(a));

  const handleEditGroup = (entryId, vitalsInGroup) => {
    // Use the first vital's date for the form
    const firstVital = vitalsInGroup[0];
    const formFromGroup = {
      date: firstVital?.date || new Date().toISOString().split('T')[0],
      bloodPressure: { systolic: '', diastolic: '' },
      heartRate: '',
      cholesterol: '',
      temperature: '',
      weight: '',
      oxygenSat: '',
    };

    vitalsInGroup.forEach(v => {
      if (v.type === 'Blood Pressure') {
        const [sys, dia] = v.value.split('/');
        formFromGroup.bloodPressure = { systolic: sys || '', diastolic: dia || '' };
      } else if (v.type === 'Heart Rate') {
        formFromGroup.heartRate = v.value;
      } else if (v.type === 'Cholesterol') {
        formFromGroup.cholesterol = v.value;
      } else if (v.type === 'Temperature') {
        formFromGroup.temperature = v.value;
      } else if (v.type === 'Weight') {
        formFromGroup.weight = v.value;
      } else if (v.type === 'Oxygen Saturation') {
        formFromGroup.oxygenSat = v.value;
      }
    });

    setFormData(formFromGroup);
    setEditingId(entryId);
    setShowForm(true);
  };

  const handleDeleteGroup = async (entryId, vitalsInGroup) => {
    if (!confirm(`Delete this entry (${vitalsInGroup.length} vital record(s))?`)) return;
    try {
      await Promise.all(vitalsInGroup.map(v => deleteDoc(doc(db, 'vitals', v.id))));
      setVitals(vitals.filter(v => v.entryId !== entryId && v.createdAt !== entryId));
    } catch (err) {
      setError('Failed to delete vitals');
    }
  };

  if (loading) return <div className="vitals-loading">Loading...</div>;

  return (
    <div className="vitals-page">
      <div className="vitals-header">
        <div className="vitals-header-left">
          <Link to="/dashboard" className="btn-back">← Back</Link>
          <h1>💓 Vital Signs</h1>
        </div>
        <div className="vitals-header-actions">
          <Link to="/vitals-summary" className="btn-summary">
            📊 Summary
          </Link>
          {!showForm && (
            <button className="btn-add" onClick={() => setShowForm(true)}>
              + Add Vitals
            </button>
          )}
          {showForm && !editingId && (
            <button className="btn-cancel" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {error && <div className="vitals-error">{error}</div>}

      {showForm && (
        <form className="vitals-form-inline" onSubmit={handleSubmit}>
          <h2>Record Vitals</h2>
          
          <div className="form-row">
            <label>
              Date
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </label>
          </div>

          <div className="vitals-grid">
            <div className="vital-field">
              <label>Blood Pressure (mmHg)</label>
              <div className="bp-inputs">
                <input
                  type="number"
                  value={formData.bloodPressure.systolic}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    bloodPressure: { ...formData.bloodPressure, systolic: e.target.value }
                  })}
                  placeholder="120"
                />
                <span>/</span>
                <input
                  type="number"
                  value={formData.bloodPressure.diastolic}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    bloodPressure: { ...formData.bloodPressure, diastolic: e.target.value }
                  })}
                  placeholder="80"
                />
              </div>
            </div>

            <div className="vital-field">
              <label>Heart Rate (bpm)</label>
              <input
                type="number"
                value={formData.heartRate}
                onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                placeholder="72"
              />
            </div>

            <div className="vital-field">
              <label>Cholesterol (mg/dL)</label>
              <input
                type="number"
                value={formData.cholesterol}
                onChange={(e) => setFormData({ ...formData, cholesterol: e.target.value })}
                placeholder="200"
              />
            </div>

            <div className="vital-field">
              <label>Temperature (°F)</label>
              <input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                placeholder="98.6"
              />
            </div>

            <div className="vital-field">
              <label>Weight (lbs)</label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                placeholder="150"
              />
            </div>

            <div className="vital-field">
              <label>Oxygen Saturation (%)</label>
              <input
                type="number"
                value={formData.oxygenSat}
                onChange={(e) => setFormData({ ...formData, oxygenSat: e.target.value })}
                placeholder="98"
              />
            </div>
          </div>

          <div className="form-buttons">
            <button type="submit" className="btn-save">Save All</button>
            <button type="button" className="btn-cancel" onClick={resetForm}>Clear</button>
          </div>
        </form>
      )}

      {vitals.length === 0 ? (
        <div className="vitals-empty">
          <p>No vitals recorded yet.</p>
          <p>Click "Add Vital" to start tracking your health data.</p>
        </div>
      ) : (
        <div className="vitals-groups">
          {sortedEntryIds.map((entryId, index) => (
            <div key={entryId} className="vital-group">
              <div className="vital-group-header">
                <h3>Entry #{sortedEntryIds.length - index}</h3>
                <div className="vital-group-meta">
                  {new Date(entryId).toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </div>
                <div className="vital-group-actions">
                  <button onClick={() => handleEditGroup(entryId, groupedVitals[entryId])}>Edit</button>
                  <button onClick={() => handleDeleteGroup(entryId, groupedVitals[entryId])} className="btn-delete">Delete</button>
                </div>
              </div>
              <div className="vital-group-items">
                {groupedVitals[entryId].map((v) => (
                  <div key={v.id} className="vital-item">
                    <span className="vital-item-icon">
                      {v.type === 'Blood Pressure' ? '💓' :
                       v.type === 'Heart Rate' ? '❤️' :
                       v.type === 'Cholesterol' ? '🧬' :
                       v.type === 'Temperature' ? '🌡️' :
                       v.type === 'Weight' ? '⚖️' :
                       v.type === 'Oxygen Saturation' ? '🫁' : '📊'}
                    </span>
                    <span className="vital-item-type">{v.type}</span>
                    <span className="vital-item-value">{v.value} {v.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}