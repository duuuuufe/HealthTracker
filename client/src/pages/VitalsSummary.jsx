import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

    const latestByType = {};
    const valuesByType = {};

    vitals.forEach(v => {
      if (!latestByType[v.type] || v.date > latestByType[v.type].date) {
        latestByType[v.type] = v;
      }
      
      if (!valuesByType[v.type]) {
        valuesByType[v.type] = [];
      }
      
      let numValue = parseFloat(v.value);
      if (!isNaN(numValue)) {
        valuesByType[v.type].push(numValue);
      }
    });

    const averages = {};
    Object.keys(valuesByType).forEach(type => {
      const values = valuesByType[type];
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        averages[type] = (sum / values.length).toFixed(1);
      }
    });

    const entryCount = new Set(vitals.map(v => v.entryId)).size;

    setSummary({
      latest: latestByType,
      averages,
      totalEntries: entryCount,
      totalRecords: vitals.length,
      dateRange: {
        oldest: vitals[vitals.length - 1]?.date,
        newest: vitals[0]?.date
      }
    });
  }, [vitals]);

  const getVitalIcon = (type) => {
    const icons = {
      'Blood Pressure': '💓',
      'Heart Rate': '❤️',
      'Cholesterol': '🧬',
      'Temperature': '🌡️',
      'Weight': '⚖️',
      'Oxygen Saturation': '🫁'
    };
    return icons[type] || '📊';
  };

  const getVitalStatus = (type, value) => {
    const statusRanges = {
      'Blood Pressure': { low: [90, 60], high: [140, 90] },
      'Heart Rate': { low: 60, high: 100 },
      'Cholesterol': { high: 200 },
      'Temperature': { low: 97, high: 99 },
      'Weight': null,
      'Oxygen Saturation': { low: 95 }
    };

    const range = statusRanges[type];
    if (!range) return 'neutral';

    if (type === 'Blood Pressure') {
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
      <div className="summary-header">
        <div className="summary-header-left">
          <Link to="/vitals" className="btn-back">← Back</Link>
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
              <span className="stat-value">{summary.totalRecords}</span>
              <span className="stat-label">Total Records</span>
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
                {Object.entries(summary.latest).map(([type, vital]) => {
                  const status = getVitalStatus(type, vital.value);
                  return (
                    <div key={type} className={`vital-card ${status}`}>
                      <div className="vital-icon">{getVitalIcon(type)}</div>
                      <div className="vital-info">
                        <span className="vital-type">{type}</span>
                        <span className="vital-value">{vital.value} {vital.unit}</span>
                        <span className="vital-date">{vital.date}</span>
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
                {Object.entries(summary.averages).map(([type, avg]) => {
                  const vital = summary.latest[type];
                  const status = getVitalStatus(type, vital?.value || avg);
                  return (
                    <div key={type} className={`vital-card ${status}`}>
                      <div className="vital-icon">{getVitalIcon(type)}</div>
                      <div className="vital-info">
                        <span className="vital-type">{type}</span>
                        <span className="vital-value">{avg} {vital?.unit}</span>
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
    </div>
  );
}