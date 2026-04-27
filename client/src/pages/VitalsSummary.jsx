import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BrandLink from '../components/BrandLink';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import '../styles/VitalsSummary.css';

export default function VitalsSummary() {
  const { user } = useAuth();
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const fetchVitals = async () => {
      if (!user) return;
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
        console.error('Error fetching vitals:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVitals();
  }, [user]);

  useEffect(() => {
    if (vitals.length === 0) {
      setSummary(null);
      return;
    }

    const vitalFields = ['bloodPressure', 'heartRate', 'cholesterol', 'temperature', 'weight', 'oxygenSat'];
    const vitalLabels = {
      bloodPressure: 'Blood Pressure',
      heartRate: 'Heart Rate',
      cholesterol: 'Cholesterol',
      temperature: 'Temperature',
      weight: 'Weight',
      oxygenSat: 'Oxygen Saturation'
    };
    const vitalUnits = {
      bloodPressure: 'mmHg',
      heartRate: 'bpm',
      cholesterol: 'mg/dL',
      temperature: '°F',
      weight: 'lbs',
      oxygenSat: '%'
    };

    const latestByField = {};
    const valuesByField = {};

    vitals.forEach(doc => {
      vitalFields.forEach(field => {
        if (doc[field]) {
          // Track latest by field
          if (!latestByField[field] || doc.date > latestByField[field].date) {
            latestByField[field] = { value: doc[field], date: doc.date };
          }
          
          // Track values for averages
          if (!valuesByField[field]) {
            valuesByField[field] = [];
          }
          let numValue = parseFloat(doc[field]);
          if (!isNaN(numValue)) {
            valuesByField[field].push(numValue);
          }
        }
      });
    });

    const averages = {};
    Object.keys(valuesByField).forEach(field => {
      const values = valuesByField[field];
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        averages[field] = (sum / values.length).toFixed(1);
      }
    });

    setSummary({
      latest: latestByField,
      averages,
      totalEntries: vitals.length,
      dateRange: {
        oldest: vitals[vitals.length - 1]?.date,
        newest: vitals[0]?.date
      }
    });
  }, [vitals]);

  const getVitalIcon = (field) => {
    const icons = {
      bloodPressure: '💓',
      heartRate: '❤️',
      cholesterol: '🧬',
      temperature: '🌡️',
      weight: '⚖️',
      oxygenSat: '🫁'
    };
    return icons[field] || '📊';
  };

  const getVitalLabel = (field) => {
    const labels = {
      bloodPressure: 'Blood Pressure',
      heartRate: 'Heart Rate',
      cholesterol: 'Cholesterol',
      temperature: 'Temperature',
      weight: 'Weight',
      oxygenSat: 'Oxygen Saturation'
    };
    return labels[field] || field;
  };

  const getVitalStatus = (field, value) => {
    const statusRanges = {
      bloodPressure: { low: [90, 60], high: [140, 90] },
      heartRate: { low: 60, high: 100 },
      cholesterol: { high: 200 },
      temperature: { low: 97, high: 99 },
      weight: null,
      oxygenSat: { low: 95 }
    };

    const range = statusRanges[field];
    if (!range) return 'neutral';

    if (field === 'bloodPressure') {
      const [sys, dia] = value.split('/').map(Number);
      if (sys > range.high[0] || dia > range.high[1]) return 'high';
      if (sys < range.low[0] || dia < range.low[1]) return 'low';
      return 'normal';
    }

    const num = parseFloat(value);
    if (range.low && num < range.low) return 'low';
    if (range.high && num > range.high) return 'high';
    return 'normal';
  };

  if (loading) return <div className="summary-loading">Loading...</div>;

  return (
    <div className="summary-page">
      {/* ── Nav ── */}
      <header className="dash-nav">
        <BrandLink />
        <Link to="/vitals" className="appt-back-link">&larr; Vitals</Link>
      </header>

      <main className="summary-main">
        {/* ── Page Header ── */}
        <div className="summary-header">
          <div className="summary-header-left">
            <h1>📊 Vitals Summary</h1>
          </div>
        </div>

      {!summary ? (
        <div className="summary-empty">
          <p>No vitals recorded yet.</p>
          <p>Start tracking your health data to see summaries here.</p>
        </div>
      ) : (
        <>
          <div className="summary-stats">
            <div className="stat-card">
              <span className="stat-value">{summary.totalEntries}</span>
              <span className="stat-label">Total Entries</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {summary.dateRange.oldest && summary.dateRange.newest 
                  ? `${summary.dateRange.newest}`
                  : '-'}
              </span>
              <span className="stat-label">Last Recorded</span>
            </div>
          </div>

          <div className="summary-sections">
            <div className="summary-section">
              <h2>Latest Readings</h2>
              <div className="vitals-grid">
                {Object.entries(summary.latest).map(([field, data]) => {
                  const status = getVitalStatus(field, data.value);
                  return (
                    <div key={field} className={`vital-card ${status}`}>
                      <div className="vital-icon">{getVitalIcon(field)}</div>
                      <div className="vital-info">
                        <span className="vital-type">{getVitalLabel(field)}</span>
                        <span className="vital-value">{data.value} {field === 'bloodPressure' ? 'mmHg' : field === 'heartRate' ? 'bpm' : field === 'cholesterol' ? 'mg/dL' : field === 'temperature' ? '°F' : field === 'weight' ? 'lbs' : '%'}</span>
                        <span className="vital-date">{data.date}</span>
                      </div>
                      <span className={`status-badge ${status}`}>
                        {status === 'normal' ? '✓' : status === 'high' ? '↑' : '↓'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="summary-section">
              <h2>Averages</h2>
              <div className="vitals-grid">
                {Object.entries(summary.averages).map(([field, avg]) => {
                  const latest = summary.latest[field];
                  const status = getVitalStatus(field, latest?.value || avg);
                  return (
                    <div key={field} className={`vital-card ${status}`}>
                      <div className="vital-icon">{getVitalIcon(field)}</div>
                      <div className="vital-info">
                        <span className="vital-type">{getVitalLabel(field)}</span>
                        <span className="vital-value">{avg} {field === 'bloodPressure' ? 'mmHg' : field === 'heartRate' ? 'bpm' : field === 'cholesterol' ? 'mg/dL' : field === 'temperature' ? '°F' : field === 'weight' ? 'lbs' : '%'}</span>
                        <span className="vital-label">average</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="summary-legend">
            <span className="legend-item"><span className="dot normal"></span> Normal</span>
            <span className="legend-item"><span className="dot high"></span> High</span>
            <span className="legend-item"><span className="dot low"></span> Low</span>
          </div>
        </>
      )}
      </main>
    </div>
  );
}