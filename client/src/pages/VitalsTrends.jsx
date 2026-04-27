import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import '../styles/VitalsTrends.css';

const METRICS = [
  {
    key: 'bloodPressure',
    label: 'Blood Pressure',
    icon: '💓',
    unit: 'mmHg',
    color: '#ef4444',
    secondaryColor: '#3b82f6',
    series: ['systolic', 'diastolic'],
    healthyRange: { min: 90, max: 130 },
  },
  {
    key: 'heartRate',
    label: 'Heart Rate',
    icon: '❤️',
    unit: 'bpm',
    color: '#dc2626',
    healthyRange: { min: 60, max: 100 },
  },
  {
    key: 'cholesterol',
    label: 'Cholesterol',
    icon: '🧬',
    unit: 'mg/dL',
    color: '#8b5cf6',
    healthyRange: { max: 200 },
  },
  {
    key: 'temperature',
    label: 'Temperature',
    icon: '🌡️',
    unit: '°F',
    color: '#f59e0b',
    healthyRange: { min: 97, max: 99 },
  },
  {
    key: 'weight',
    label: 'Weight',
    icon: '⚖️',
    unit: 'lbs',
    color: '#16a34a',
  },
  {
    key: 'oxygenSat',
    label: 'Oxygen Saturation',
    icon: '🫁',
    unit: '%',
    color: '#0ea5e9',
    healthyRange: { min: 95 },
  },
];

const RANGES = [
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '90d', label: '90 Days', days: 90 },
  { key: 'all', label: 'All Time', days: null },
];

function parseValue(metric, raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  if (metric.key === 'bloodPressure') {
    const parts = String(raw).split('/');
    const systolic = parseFloat(parts[0]);
    const diastolic = parseFloat(parts[1]);
    if (Number.isNaN(systolic) || Number.isNaN(diastolic)) return null;
    return { systolic, diastolic };
  }
  const num = parseFloat(raw);
  return Number.isNaN(num) ? null : num;
}

function buildPoints(metric, vitals, daysWindow) {
  const cutoff = daysWindow
    ? new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000)
    : null;

  const points = [];
  vitals.forEach((entry) => {
    if (!entry.date || !entry[metric.key]) return;
    const d = new Date(entry.date);
    if (Number.isNaN(d.getTime())) return;
    if (cutoff && d < cutoff) return;
    const parsed = parseValue(metric, entry[metric.key]);
    if (parsed === null) return;
    points.push({ date: d, value: parsed });
  });
  points.sort((a, b) => a.date - b.date);
  return points;
}

function computeStats(metric, points) {
  if (points.length === 0) return null;
  const flat = [];
  points.forEach((p) => {
    if (metric.key === 'bloodPressure') {
      flat.push(p.value.systolic, p.value.diastolic);
    } else {
      flat.push(p.value);
    }
  });
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const avg = flat.reduce((s, v) => s + v, 0) / flat.length;
  const first = points[0];
  const last = points[points.length - 1];

  let trend = 'flat';
  let delta = 0;
  if (points.length >= 2) {
    if (metric.key === 'bloodPressure') {
      delta = last.value.systolic - first.value.systolic;
    } else {
      delta = last.value - first.value;
    }
    if (Math.abs(delta) > 0.5) trend = delta > 0 ? 'up' : 'down';
  }

  return { min, max, avg, latest: last.value, trend, delta, count: points.length };
}

function formatNumber(n) {
  if (typeof n !== 'number') return '-';
  return Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1);
}

function formatValue(metric, value) {
  if (value === null || value === undefined) return '-';
  if (metric.key === 'bloodPressure') {
    return `${Math.round(value.systolic)}/${Math.round(value.diastolic)}`;
  }
  return formatNumber(value);
}

const CHART_W = 640;
const CHART_H = 220;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 32;

function TrendChart({ metric, points }) {
  const [hover, setHover] = useState(null);

  if (points.length === 0) {
    return (
      <div className="trend-empty">
        <p>No data in this range.</p>
      </div>
    );
  }

  const xs = points.map((p) => p.date.getTime());
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const xSpan = Math.max(maxX - minX, 1);

  const allYs = [];
  points.forEach((p) => {
    if (metric.key === 'bloodPressure') {
      allYs.push(p.value.systolic, p.value.diastolic);
    } else {
      allYs.push(p.value);
    }
  });
  let minY = Math.min(...allYs);
  let maxY = Math.max(...allYs);
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const padY = (maxY - minY) * 0.15;
  minY -= padY;
  maxY += padY;
  const ySpan = maxY - minY;

  const innerW = CHART_W - PAD_L - PAD_R;
  const innerH = CHART_H - PAD_T - PAD_B;

  const xPos = (t) =>
    points.length === 1
      ? PAD_L + innerW / 2
      : PAD_L + ((t - minX) / xSpan) * innerW;
  const yPos = (v) => PAD_T + innerH - ((v - minY) / ySpan) * innerH;

  const buildPath = (selector) => {
    return points
      .map((p, i) => {
        const x = xPos(p.date.getTime());
        const v = selector(p.value);
        const y = yPos(v);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = minY + (ySpan * i) / yTicks;
    return { v, y: yPos(v) };
  });

  const isBP = metric.key === 'bloodPressure';
  const series = isBP
    ? [
        { name: 'Systolic', color: metric.color, sel: (v) => v.systolic },
        { name: 'Diastolic', color: metric.secondaryColor, sel: (v) => v.diastolic },
      ]
    : [{ name: metric.label, color: metric.color, sel: (v) => v }];

  const handleMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * CHART_W;
    let nearestIdx = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(xPos(p.date.getTime()) - px);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    });
    setHover(nearestIdx);
  };

  const tooltipPoint = hover !== null ? points[hover] : null;

  return (
    <div className="trend-chart-wrap">
      <svg
        className="trend-chart"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_L}
              x2={CHART_W - PAD_R}
              y1={t.y}
              y2={t.y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text x={PAD_L - 6} y={t.y + 4} textAnchor="end" className="trend-axis">
              {formatNumber(t.v)}
            </text>
          </g>
        ))}

        {metric.healthyRange && (
          <>
            {metric.healthyRange.min !== undefined && metric.healthyRange.max !== undefined && (
              <rect
                x={PAD_L}
                y={yPos(metric.healthyRange.max)}
                width={innerW}
                height={Math.max(yPos(metric.healthyRange.min) - yPos(metric.healthyRange.max), 0)}
                fill="#10b981"
                opacity="0.08"
              />
            )}
          </>
        )}

        {series.map((s) => (
          <g key={s.name}>
            <path
              d={buildPath(s.sel)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={xPos(p.date.getTime())}
                cy={yPos(s.sel(p.value))}
                r={hover === i ? 5 : 3}
                fill={s.color}
                stroke="#fff"
                strokeWidth="1.5"
              />
            ))}
          </g>
        ))}

        {tooltipPoint && (
          <line
            x1={xPos(tooltipPoint.date.getTime())}
            x2={xPos(tooltipPoint.date.getTime())}
            y1={PAD_T}
            y2={CHART_H - PAD_B}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        <line
          x1={PAD_L}
          x2={CHART_W - PAD_R}
          y1={CHART_H - PAD_B}
          y2={CHART_H - PAD_B}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        {points.length > 0 && (
          <>
            <text
              x={PAD_L}
              y={CHART_H - PAD_B + 18}
              textAnchor="start"
              className="trend-axis"
            >
              {points[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
            <text
              x={CHART_W - PAD_R}
              y={CHART_H - PAD_B + 18}
              textAnchor="end"
              className="trend-axis"
            >
              {points[points.length - 1].date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </text>
          </>
        )}
      </svg>

      {tooltipPoint && (
        <div className="trend-tooltip">
          <span className="trend-tooltip-date">
            {tooltipPoint.date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span className="trend-tooltip-value">
            {formatValue(metric, tooltipPoint.value)} {metric.unit}
          </span>
        </div>
      )}

      {isBP && (
        <div className="trend-legend">
          <span className="trend-legend-item">
            <span className="trend-legend-dot" style={{ background: metric.color }} />
            Systolic
          </span>
          <span className="trend-legend-item">
            <span className="trend-legend-dot" style={{ background: metric.secondaryColor }} />
            Diastolic
          </span>
        </div>
      )}
    </div>
  );
}

export default function VitalsTrends() {
  const { user } = useAuth();
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeKey, setRangeKey] = useState('30d');

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
        setVitals(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching vitals:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVitals();
  }, [user]);

  const range = RANGES.find((r) => r.key === rangeKey) || RANGES[1];

  const seriesByMetric = useMemo(() => {
    const out = {};
    METRICS.forEach((m) => {
      const points = buildPoints(m, vitals, range.days);
      out[m.key] = { points, stats: computeStats(m, points) };
    });
    return out;
  }, [vitals, range.days]);

  const hasAnyData = Object.values(seriesByMetric).some((s) => s.points.length > 0);

  if (loading) return <div className="trends-loading">Loading...</div>;

  return (
    <div className="trends-page">
      <header className="dash-nav">
        <Link to="/" className="dash-logo">&#10084; HealthSimplify</Link>
        <Link to="/vitals" className="appt-back-link">&larr; Vitals</Link>
      </header>

      <main className="trends-main">
        <div className="trends-header">
          <div className="trends-header-left">
            <h1>📈 Health Trends</h1>
            <p className="trends-subtitle">
              See how your vitals and weight have changed over time.
            </p>
          </div>
          <div className="trends-range">
            {RANGES.map((r) => (
              <button
                key={r.key}
                className={`range-btn ${rangeKey === r.key ? 'active' : ''}`}
                onClick={() => setRangeKey(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {vitals.length === 0 ? (
          <div className="trends-empty-state">
            <p>No vitals recorded yet.</p>
            <p>
              <Link to="/vitals" className="trends-cta">Record your first reading</Link> to start
              seeing trends here.
            </p>
          </div>
        ) : !hasAnyData ? (
          <div className="trends-empty-state">
            <p>No data in the selected range.</p>
            <p>Try a longer range or record new readings.</p>
          </div>
        ) : (
          <div className="trends-grid">
            {METRICS.map((metric) => {
              const { points, stats } = seriesByMetric[metric.key];
              if (points.length === 0) return null;
              return (
                <section key={metric.key} className="trend-card">
                  <header className="trend-card-header">
                    <div className="trend-card-title">
                      <span className="trend-card-icon">{metric.icon}</span>
                      <div>
                        <h2>{metric.label}</h2>
                        <span className="trend-card-unit">{metric.unit}</span>
                      </div>
                    </div>
                    {stats && (
                      <div className={`trend-card-trend trend-${stats.trend}`}>
                        {stats.trend === 'up' && '↑'}
                        {stats.trend === 'down' && '↓'}
                        {stats.trend === 'flat' && '→'}
                        <span>
                          {stats.trend === 'flat'
                            ? 'Stable'
                            : `${stats.delta > 0 ? '+' : ''}${formatNumber(stats.delta)}`}
                        </span>
                      </div>
                    )}
                  </header>

                  <TrendChart metric={metric} points={points} />

                  {stats && (
                    <div className="trend-stats">
                      <div className="trend-stat">
                        <span className="trend-stat-label">Latest</span>
                        <span className="trend-stat-value">
                          {formatValue(metric, stats.latest)}
                        </span>
                      </div>
                      <div className="trend-stat">
                        <span className="trend-stat-label">Average</span>
                        <span className="trend-stat-value">
                          {metric.key === 'bloodPressure' ? '-' : formatNumber(stats.avg)}
                        </span>
                      </div>
                      <div className="trend-stat">
                        <span className="trend-stat-label">Min</span>
                        <span className="trend-stat-value">{formatNumber(stats.min)}</span>
                      </div>
                      <div className="trend-stat">
                        <span className="trend-stat-label">Max</span>
                        <span className="trend-stat-value">{formatNumber(stats.max)}</span>
                      </div>
                      <div className="trend-stat">
                        <span className="trend-stat-label">Readings</span>
                        <span className="trend-stat-value">{stats.count}</span>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
