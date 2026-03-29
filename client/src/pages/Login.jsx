import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import '../styles/Login.css';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const navigate = useNavigate();

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: '' }));
    setStatus('');
  };

  const validate = () => {
    const e = {};
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('loading');
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setStatus('bad-credentials');
      } else if (err.code === 'auth/too-many-requests') {
        setStatus('too-many');
      } else {
        setStatus('error');
      }
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErrors({ reset: 'Enter a valid email address' });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch {
      setErrors({ reset: 'Could not send reset email. Check the address and try again.' });
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Header */}
        <div className="login-header">
          <Link to="/" className="login-logo">&#10084; HealthSimplify</Link>
          <h1>Welcome Back</h1>
          <p>Sign in to manage your health records.</p>
        </div>

        {/* Login Form */}
        {!showReset ? (
          <form onSubmit={handleLogin} noValidate>
            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="field">
              <label>
                Password
                <button type="button" className="forgot-link" onClick={() => { setShowReset(true); setResetEmail(form.email); }}>
                  Forgot password?
                </button>
              </label>
              <input
                type="password"
                placeholder="Your password"
                value={form.password}
                onChange={set('password')}
                autoComplete="current-password"
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            {status === 'bad-credentials' && (
              <p className="form-error">&#10007; Incorrect email or password.</p>
            )}
            {status === 'too-many' && (
              <p className="form-error">&#10007; Too many failed attempts. Try again later or reset your password.</p>
            )}
            {status === 'error' && (
              <p className="form-error">&#10007; Something went wrong. Please try again.</p>
            )}

            <button type="submit" className="btn-login" disabled={status === 'loading'}>
              {status === 'loading' ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* Password Reset Form */
          <form onSubmit={handlePasswordReset} noValidate>
            <div className="reset-info">
              <div className="reset-icon">&#128274;</div>
              {!resetSent ? (
                <>
                  <h2>Reset Your Password</h2>
                  <p>Enter your account email and we will send you a reset link.</p>
                </>
              ) : (
                <>
                  <h2>Check Your Email</h2>
                  <p>A password reset link was sent to <strong>{resetEmail}</strong>. Check your inbox.</p>
                </>
              )}
            </div>

            {!resetSent && (
              <div className="field">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => { setResetEmail(e.target.value); setErrors({}); }}
                />
                {errors.reset && <span className="field-error">{errors.reset}</span>}
              </div>
            )}

            <div className="reset-actions">
              <button type="button" className="btn-back" onClick={() => { setShowReset(false); setResetSent(false); setErrors({}); }}>
                &#8592; Back to Sign In
              </button>
              {!resetSent && (
                <button type="submit" className="btn-login">Send Reset Link</button>
              )}
            </div>
          </form>
        )}

        <p className="register-link">
          Don&apos;t have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
