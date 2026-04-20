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
import { updateDoc as updateUserDoc, doc as userDoc } from 'firebase/firestore';
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

    // Build the vitals object with all values
    const vitalsData = {};
    if (formData.bloodPressure.systolic && formData.bloodPressure.diastolic) {
      vitalsData.bloodPressure = `${formData.bloodPressure.systolic}/${formData.bloodPressure.diastolic}`;
    }
    if (formData.heartRate) vitalsData.heartRate = formData.heartRate;
    if (formData.cholesterol) vitalsData.cholesterol = formData.cholesterol;
    if (formData.temperature) vitalsData.temperature = formData.temperature;
    if (formData.weight) vitalsData.weight = formData.weight;
    if (formData.oxygenSat) vitalsData.oxygenSat = formData.oxygenSat;

    if (Object.keys(vitalsData).length === 0) {
      setError('Please fill in at least one vital field');
      return;
    }

    const entryTimestamp = new Date().toISOString();

    try {
      // If editing, update the existing document
      if (editingId) {
        await updateDoc(doc(db, 'vitals', editingId), {
          ...vitalsData,
          date: formData.date,
          updatedAt: entryTimestamp,
        });
      } else {
        // Create new document with all vitals in one entry
        await addDoc(collection(db, 'vitals'), {
          userId: user.uid,
          ...vitalsData,
          date: formData.date,
          createdAt: entryTimestamp,
        });
      }

      // Update profile weight if weight was recorded
      if (formData.weight) {
        const weightValue = Number(formData.weight);
        await updateUserDoc(userDoc(db, 'users', user.uid), {
          weight: weightValue,
          weightUnit: 'lbs',
          updatedAt: new Date().toISOString(),
        });
      }

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

  const handleEditGroup = (v) => {
    const formFromGroup = {
      date: v.date || new Date().toISOString().split('T')[0],
      bloodPressure: { systolic: '', diastolic: '' },
      heartRate: '',
      cholesterol: '',
      temperature: '',
      weight: '',
      oxygenSat: '',
    };

    // Parse blood pressure
    if (v.bloodPressure) {
      const [sys, dia] = v.bloodPressure.split('/');
      formFromGroup.bloodPressure = { systolic: sys || '', diastolic: dia || '' };
    }
    if (v.heartRate) formFromGroup.heartRate = v.heartRate;
    if (v.cholesterol) formFromGroup.cholesterol = v.cholesterol;
    if (v.temperature) formFromGroup.temperature = v.temperature;
    if (v.weight) formFromGroup.weight = v.weight;
    if (v.oxygenSat) formFromGroup.oxygenSat = v.oxygenSat;

    setFormData(formFromGroup);
    setEditingId(v.id);
    setShowForm(true);
  };

  const handleDeleteGroup = async (v) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await deleteDoc(doc(db, 'vitals', v.id));
      setVitals(vitals.filter(v => v.id !== v.id));
    } catch (err) {
      setError('Failed to delete vitals');
    }
  };

  if (loading) return <div className="vitals-loading">Loading...</div>;

  return (
    <div className="vitals-page">
      <header className="dash-nav">
        <Link to="/" className="dash-logo">&#10084; HealthSimplify</Link>
        <Link to="/dashboard" className="appt-back-link">&larr; Dashboard</Link>
      </header>
      
      <main className="vitals-main">
        <div className="vitals-header">
          <div className="vitals-header-left">
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
            {vitals.map((vitalDoc, index) => (
              <div key={vitalDoc.id} className="vital-group">
                <div className="vital-group-header">
                  <h3>Entry #{vitals.length - index}</h3>
                  <div className="vital-group-meta">
                    {new Date(vitalDoc.createdAt).toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </div>
                  <div className="vital-group-actions">
                    <button onClick={() => handleEditGroup(vitalDoc)}>Edit</button>
                    <button onClick={() => handleDeleteGroup(vitalDoc)} className="btn-delete">Delete</button>
                  </div>
                </div>
                <div className="vital-group-items">
                  {vitalDoc.bloodPressure && (
                    <div className="vital-item">
                      <span className="vital-item-icon">💓</span>
                      <span className="vital-item-type">Blood Pressure</span>
                      <span className="vital-item-value">{vitalDoc.bloodPressure} mmHg</span>
                    </div>
                  )}
                  {vitalDoc.heartRate && (
                    <div className="vital-item">
                      <span className="vital-item-icon">❤️</span>
                      <span className="vital-item-type">Heart Rate</span>
                      <span className="vital-item-value">{vitalDoc.heartRate} bpm</span>
                    </div>
                  )}
                  {vitalDoc.cholesterol && (
                    <div className="vital-item">
                      <span className="vital-item-icon">🧬</span>
                      <span className="vital-item-type">Cholesterol</span>
                      <span className="vital-item-value">{vitalDoc.cholesterol} mg/dL</span>
                    </div>
                  )}
                  {vitalDoc.temperature && (
                    <div className="vital-item">
                      <span className="vital-item-icon">🌡️</span>
                      <span className="vital-item-type">Temperature</span>
                      <span className="vital-item-value">{vitalDoc.temperature} °F</span>
                    </div>
                  )}
                  {vitalDoc.weight && (
                    <div className="vital-item">
                      <span className="vital-item-icon">⚖️</span>
                      <span className="vital-item-type">Weight</span>
                      <span className="vital-item-value">{vitalDoc.weight} lbs</span>
                    </div>
                  )}
                  {vitalDoc.oxygenSat && (
                    <div className="vital-item">
                      <span className="vital-item-icon">🫁</span>
                      <span className="vital-item-type">Oxygen Saturation</span>
                      <span className="vital-item-value">{vitalDoc.oxygenSat}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}