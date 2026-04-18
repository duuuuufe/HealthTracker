import { useState } from 'react';
import { Link } from 'react-router-dom';
import './App.css';

const FEATURES = [
  {
    icon: '👤',
    title: 'Registration & Profile',
    desc: 'Store personal info — name, age, weight, height, gender, doctor details, visit dates, and annual checkup schedules.',
  },
  {
    icon: '🔒',
    title: 'Secure Login',
    desc: 'Role-based authentication protects your records. Unauthorized users cannot view or alter medication data.',
  },
  {
    icon: '💓',
    title: 'Vital Signs',
    desc: 'Log blood pressure, glucose levels, cholesterol, heart rate, and more with timestamped history.',
  },
  {
    icon: '💊',
    title: 'Medication Tracker',
    desc: 'Track every medication, dosage, and schedule. Get alerts and notifications so you never miss a dose.',
  },
  {
    icon: '🥗',
    title: 'Diet & Nutrition',
    desc: 'Record daily food intake, calorie counts, and weight progress toward your personal health goals.',
  },
  {
    icon: '📝',
    title: 'Notes & Recipes',
    desc: 'Save favorite recipes, diet plans, health articles, and personal notes — all in one secure place.',
  },
  {
    icon: '🔍',
    title: 'Smart Search',
    desc: 'Instantly find past or upcoming doctor appointments, medication history, vitals, and more.',
  },
  {
    icon: '🚨',
    title: 'Monitoring & Alerts',
    desc: 'Notifies you, family members, or your doctor if medication is missed or a dangerous drug conflict is detected.',
  },
  {
    icon: '📡',
    title: 'Communication',
    desc: 'Built-in support for email, SMS, and phone-based notifications to keep caregivers and doctors informed.',
  },
  {
    icon: '🗄️',
    title: 'Easy Data Maintenance',
    desc: 'Add new doctors, medications, or records without any programming — a fully manageable system.',
  },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Create Your Profile', desc: 'Register with your personal and medical details in minutes.' },
  { step: '2', title: 'Log Your Health Data', desc: 'Track vitals, meds, diet, and notes daily from any device.' },
  { step: '3', title: 'Get Alerted', desc: 'Receive timely reminders and conflict warnings automatically.' },
  { step: '4', title: 'Stay Connected', desc: 'Share updates with your doctor or family via email, SMS, or call.' },
];

function App() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus('success');
        setForm({ name: '', email: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="app">

      {/* ── Nav ── */}
      <nav className="nav">
        <div className="nav-brand">
          <span className="nav-icon">&#10084;</span> HealthSimplify
        </div>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How It Works</a></li>
          <li><a href="#contact">Contact</a></li>
          <li><Link to="/login">Login In</Link></li>
          <li><Link to="/register" className="btn btn-nav">Get Started</Link></li>
        </ul>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">Personal Health Monitoring System</div>
          <h1>Your Health, Managed,<br /><span className="accent">Simplified</span></h1>
          <p>
            Track vitals, manage medications, monitor your diet, and stay connected with
            your care team — all in one secure, easy-to-use platform designed and personalized for you.
          </p>
          <div className="hero-buttons">
            <a href="#contact" className="btn btn-primary">Start for Free</a>
            <a href="#features" className="btn btn-secondary">Explore Features</a>
          </div>
          <div className="hero-trust">
            <span>&#10003; HIPAA-conscious design</span>
            <span>&#10003; Real-time alerts</span>
            <span>&#10003; Easy, Accessible and Personalized</span>
          </div>
        </div>
        <div className="hero-graphic">
          <div className="dashboard-preview">
            <div className="dp-header">
              <span className="dp-dot red"></span>
              <span className="dp-dot yellow"></span>
              <span className="dp-dot green"></span>
              <span className="dp-title">Health Dashboard</span>
            </div>
            <div className="dp-body">
              <div className="dp-card">
                <span className="dp-label">Blood Pressure</span>
                <span className="dp-value good">120/80</span>
              </div>
              <div className="dp-card">
                <span className="dp-label">Glucose</span>
                <span className="dp-value good">94 mg/dL</span>
              </div>
              <div className="dp-card">
                <span className="dp-label">Next Medication</span>
                <span className="dp-value warn">2:30 PM</span>
              </div>
              <div className="dp-card">
                <span className="dp-label">Calories Today</span>
                <span className="dp-value">1,240 kcal</span>
              </div>
              <div className="dp-alert">
                &#128276; Metformin due in 45 minutes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="features">
        <div className="section-header">
          <h2>Everything You Need to Manage Your Health</h2>
          <p>Ten powerful tools to cover every aspect of your personal health.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className="how">
        <div className="section-header light">
          <h2>How It Works</h2>
          <p>Get up and running in four simple steps.</p>
        </div>
        <div className="steps">
          {HOW_IT_WORKS.map((s) => (
            <div className="step" key={s.step}>
              <div className="step-number">{s.step}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Monitoring Callout ── */}
      <section className="callout">
        <div className="callout-inner">
          <div className="callout-icon">&#128680;</div>
          <div className="callout-text">
            <h3>Smart Conflict Detection</h3>
            <p>
              HealthSimplify automatically cross-checks your medication list for life-threatening
              interactions and instantly notifies you, your caregiver, or your pharmacist — before it becomes an emergency.
            </p>
          </div>
          <a href="#contact" className="btn btn-white">Learn More</a>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="contact">
        <div className="section-header">
          <h2>Get in Touch</h2>
          <p>Have questions or want early access? Send us a message.</p>
        </div>
        <form className="contact-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Your Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <textarea
            placeholder="Your Message"
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending...' : 'Send Message'}
          </button>
          {status === 'success' && <p className="form-success">&#10003; Thank you! We will be in touch soon.</p>}
          {status === 'error' && <p className="form-error">&#10007; Something went wrong. Please try again.</p>}
        </form>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="nav-icon">&#10084;</span> HealthSimplify
          </div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>
            <a href="#contact">Contact</a>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms &amp; Conditions</Link>
          </div>
          <p className="footer-copy">&copy; 2026 HealthSimplify. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}

export default App;
