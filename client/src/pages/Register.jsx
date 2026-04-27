import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import '../styles/Register.css';

const INITIAL = {
  // Account
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  // Personal
  firstName: '',
  lastName: '',
  age: '',
  gender: '',
  height: '',
  heightUnit: 'in',
  weight: '',
  weightUnit: 'lbs',
  // Doctor
  doctorName: '',
  doctorPhone: '',
  lastVisit: '',
  nextVisit: '',
};

const STEPS = ['Account', 'Personal Info', 'Doctor Details'];

export default function Register() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: '' }));
  };

  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.username.trim())            e.username = 'Username is required';
      if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Valid email required';
      if (form.password.length < 8)         e.password = 'Password must be at least 8 characters';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    if (step === 1) {
      if (!form.firstName.trim()) e.firstName = 'First name is required';
      if (!form.lastName.trim())  e.lastName  = 'Last name is required';
      if (!form.age || form.age < 1 || form.age > 120) e.age = 'Enter a valid age';
      if (!form.gender)           e.gender    = 'Please select a gender';
      if (!form.height)           e.height    = 'Height is required';
      if (!form.weight)           e.weight    = 'Weight is required';
    }
    if (step === 2) {
      if (!form.doctorName.trim()) e.doctorName = 'Doctor name is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    setStatus('sending');
    try {
      // Create the Firebase Auth user
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);

      // Set the display name to the chosen username
      await updateProfile(user, { displayName: form.username });

      // Save the full profile to Firestore under users/{uid}
      await setDoc(doc(db, 'users', user.uid), {
        username:    form.username,
        email:       form.email,
        firstName:   form.firstName,
        lastName:    form.lastName,
        age:         Number(form.age),
        gender:      form.gender,
        height:      form.height,
        heightUnit:  form.heightUnit,
        weight:      form.weight,
        weightUnit:  form.weightUnit,
        doctorName:  form.doctorName,
        doctorPhone: form.doctorPhone,
        lastVisit:   form.lastVisit,
        nextVisit:   form.nextVisit,
        emergencyContacts: [],
        createdAt:   new Date().toISOString(),
      });

      setStatus('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setErrors((prev) => ({ ...prev, email: 'An account with this email already exists' }));
        setStep(0);
      }
      setStatus('error');
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        {/* Header */}
        <div className="register-header">
          <Link to="/" className="register-logo">
            &#10084; HealthSimplify
          </Link>
          <h1>Create Your Account</h1>
          <p>Join Today and Take Control of Your Health.</p>
        </div>

        {/* Step Indicators */}
        <div className="step-indicators">
          {STEPS.map((label, i) => (
            <div key={label} className={`step-ind ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="step-ind-dot">{i < step ? '✓' : i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>

          {/* Step 0 — Account */}
          {step === 0 && (
            <div className="form-section">
              <div className="field">
                <label>Username</label>
                <input type="text" placeholder="e.g. johndoe92" value={form.username} onChange={set('username')} />
                {errors.username && <span className="field-error">{errors.username}</span>}
              </div>
              <div className="field">
                <label>Email Address</label>
                <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} />
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>
              <div className="field">
                <label>Confirm Password</label>
                <input type="password" placeholder="Repeat your password" value={form.confirmPassword} onChange={set('confirmPassword')} />
                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
              </div>
            </div>
          )}

          {/* Step 1 — Personal Info */}
          {step === 1 && (
            <div className="form-section">
              <div className="field-row">
                <div className="field">
                  <label>First Name</label>
                  <input type="text" placeholder="John" value={form.firstName} onChange={set('firstName')} />
                  {errors.firstName && <span className="field-error">{errors.firstName}</span>}
                </div>
                <div className="field">
                  <label>Last Name</label>
                  <input type="text" placeholder="Doe" value={form.lastName} onChange={set('lastName')} />
                  {errors.lastName && <span className="field-error">{errors.lastName}</span>}
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Age</label>
                  <input type="number" min="1" max="120" placeholder="e.g. 35" value={form.age} onChange={set('age')} />
                  {errors.age && <span className="field-error">{errors.age}</span>}
                </div>
                <div className="field">
                  <label>Gender</label>
                  <select value={form.gender} onChange={set('gender')}>
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="nonbinary">Non-binary</option>
                    <option value="prefer_not">Prefer not to say</option>
                  </select>
                  {errors.gender && <span className="field-error">{errors.gender}</span>}
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Height</label>
                  <div className="input-with-unit">
                    <input type="number" min="1" placeholder="e.g. 68" value={form.height} onChange={set('height')} />
                    <select value={form.heightUnit} onChange={set('heightUnit')}>
                      <option value="in">in</option>
                      <option value="cm">cm</option>
                    </select>
                  </div>
                  {errors.height && <span className="field-error">{errors.height}</span>}
                </div>
                <div className="field">
                  <label>Weight</label>
                  <div className="input-with-unit">
                    <input type="number" min="1" placeholder="e.g. 160" value={form.weight} onChange={set('weight')} />
                    <select value={form.weightUnit} onChange={set('weightUnit')}>
                      <option value="lbs">lbs</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                  {errors.weight && <span className="field-error">{errors.weight}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Doctor Details */}
          {step === 2 && (
            <div className="form-section">
              <div className="field">
                <label>Doctor's Full Name</label>
                <input type="text" placeholder="Dr. Jane Smith" value={form.doctorName} onChange={set('doctorName')} />
                {errors.doctorName && <span className="field-error">{errors.doctorName}</span>}
              </div>
              <div className="field">
                <label>Doctor's Phone Number <span className="optional">(optional)</span></label>
                <input type="tel" placeholder="e.g. (555) 123-4567" value={form.doctorPhone} onChange={set('doctorPhone')} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Last Visit Date <span className="optional">(optional)</span></label>
                  <input type="date" value={form.lastVisit} onChange={set('lastVisit')} />
                </div>
                <div className="field">
                  <label>Next Appointment <span className="optional">(optional)</span></label>
                  <input type="date" value={form.nextVisit} onChange={set('nextVisit')} />
                </div>
              </div>

              {status === 'error' && (
                <p className="submit-error">&#10007; Registration failed. Please try again.</p>
              )}
              {status === 'success' && (
                <p className="submit-success">&#10003; Account created! Redirecting to your dashboard...</p>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="form-nav">
            {step > 0 && (
              <button type="button" className="btn-back" onClick={back}>
                &#8592; Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn-next" onClick={next}>
                Next &#8594;
              </button>
            ) : (
              <button type="submit" className="btn-submit" disabled={status === 'sending' || status === 'success'}>
                {status === 'sending' ? 'Creating Account...' : 'Create Account'}
              </button>
            )}
          </div>
        </form>

        <p className="login-link">
          Already have an account? <Link to="/">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
