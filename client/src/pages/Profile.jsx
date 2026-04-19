import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import '../styles/Profile.css';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data);
          setFormData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            age: data.age || '',
            gender: data.gender || '',
            height: data.height || '',
            heightUnit: data.heightUnit || 'in',
            weight: data.weight || '',
            weightUnit: data.weightUnit || 'lbs',
            doctorName: data.doctorName || '',
            doctorPhone: data.doctorPhone || '',
            lastVisit: data.lastVisit || '',
            nextVisit: data.nextVisit || '',
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    setError('');
    setSuccess('');
  };

  const validate = () => {
    const errors = [];
    if (!formData.firstName?.trim()) errors.push('First name is required');
    if (!formData.lastName?.trim())  errors.push('Last name is required');
    if (!formData.age || formData.age < 1 || formData.age > 120) errors.push('Age must be between 1 and 120');
    if (!formData.gender)            errors.push('Gender is required');
    if (!formData.height)            errors.push('Height is required');
    if (!formData.weight)            errors.push('Weight is required');
    if (!formData.doctorName?.trim()) errors.push('Doctor name is required');
    return errors;
  };

  const handleSave = async () => {
    if (!user) return;
    
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        age: formData.age ? Number(formData.age) : null,
        height: formData.height ? Number(formData.height) : null,
        weight: formData.weight ? Number(formData.weight) : null,
        updatedAt: new Date().toISOString(),
      });
      setProfile({ ...profile, ...formData });
      setEditing(false);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError('Failed to update profile');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      age: profile.age || '',
      gender: profile.gender || '',
      height: profile.height || '',
      heightUnit: profile.heightUnit || 'in',
      weight: profile.weight || '',
      weightUnit: profile.weightUnit || 'lbs',
      doctorName: profile.doctorName || '',
      doctorPhone: profile.doctorPhone || '',
      lastVisit: profile.lastVisit || '',
      nextVisit: profile.nextVisit || '',
    });
    setEditing(false);
    setError('');
  };

  if (loading) return <div className="profile-loading">Loading...</div>;

  return (
    <div className="profile-page">
      {/* ── Nav ── */}
      <header className="dash-nav">
        <Link to="/" className="dash-logo">&#10084; HealthSimplify</Link>
        <Link to="/dashboard" className="appt-back-link">&larr; Dashboard</Link>
      </header>

      <main className="profile-main">
        {/* ── Page Header ── */}
        <div className="profile-header">
          <div className="profile-header-left">
            <h1>👤 Profile</h1>
          </div>
          {!editing && (
            <button className="btn-edit" onClick={() => setEditing(true)}>
              ✏️ Edit
            </button>
          )}
        </div>

      {error && <div className="profile-error">{error}</div>}
      {success && <div className="profile-success">{success}</div>}

      {!profile ? (
        <div className="profile-empty">
          <p>No profile found.</p>
        </div>
      ) : editing ? (
        <div className="profile-form">
          <div className="form-section">
            <h2>Personal Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>First Name</label>
                <input type="text" value={formData.firstName} onChange={handleChange('firstName')} />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" value={formData.lastName} onChange={handleChange('lastName')} />
              </div>
              <div className="form-group">
                <label>Age</label>
                <input type="number" value={formData.age} onChange={handleChange('age')} />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select value={formData.gender} onChange={handleChange('gender')}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Height</label>
                <div className="input-with-unit">
                  <input type="number" value={formData.height} onChange={handleChange('height')} />
                  <select value={formData.heightUnit} onChange={handleChange('heightUnit')}>
                    <option value="in">in</option>
                    <option value="cm">cm</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Weight</label>
                <div className="input-with-unit">
                  <input type="number" value={formData.weight} onChange={handleChange('weight')} />
                  <select value={formData.weightUnit} onChange={handleChange('weightUnit')}>
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Doctor Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Doctor Name</label>
                <input type="text" value={formData.doctorName} onChange={handleChange('doctorName')} />
              </div>
              <div className="form-group">
                <label>Doctor Phone</label>
                <input type="tel" value={formData.doctorPhone} onChange={handleChange('doctorPhone')} />
              </div>
              <div className="form-group">
                <label>Last Visit</label>
                <input type="date" value={formData.lastVisit} onChange={handleChange('lastVisit')} />
              </div>
              <div className="form-group">
                <label>Next Visit</label>
                <input type="date" value={formData.nextVisit} onChange={handleChange('nextVisit')} />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="profile-view">
          <div className="profile-section">
            <h2>Personal Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Name</span>
                <span className="info-value">{profile.firstName} {profile.lastName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{profile.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Age</span>
                <span className="info-value">{profile.age || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Gender</span>
                <span className="info-value">{profile.gender || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Height</span>
                <span className="info-value">
                  {profile.height ? `${profile.height} ${profile.heightUnit}` : '-'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Weight</span>
                <span className="info-value">
                  {profile.weight ? `${profile.weight} ${profile.weightUnit}` : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h2>Doctor Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Doctor Name</span>
                <span className="info-value">{profile.doctorName || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Doctor Phone</span>
                <span className="info-value">{profile.doctorPhone || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Last Visit</span>
                <span className="info-value">{profile.lastVisit || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Next Visit</span>
                <span className="info-value">{profile.nextVisit || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}