import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import App from './App.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Vitals from './pages/Vitals.jsx'
import VitalsSummary from './pages/VitalsSummary.jsx'
import VitalsTrends from './pages/VitalsTrends.jsx'
import Appointments from './pages/Appointments.jsx'
import Medication from './pages/Medication.jsx'
import Profile from './pages/Profile.jsx'
import Notes from './pages/Notes.jsx'
import NoteDetail from './pages/NoteDetail.jsx'
import Communication from './pages/Communication.jsx'
import DataMaintenance from './pages/DataMaintenance.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import Terms from './pages/Terms.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"          element={<App />} />
          <Route path="/register"  element={<Register />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/vitals" element={<ProtectedRoute><Vitals /></ProtectedRoute>} />
          <Route path="/vitals-summary" element={<ProtectedRoute><VitalsSummary /></ProtectedRoute>} />
          <Route path="/vitals-trends" element={<ProtectedRoute><VitalsTrends /></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
          <Route path="/medication"   element={<ProtectedRoute><Medication /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/notes"     element={<ProtectedRoute><Notes /></ProtectedRoute>} />
          <Route path="/notes/:id" element={<ProtectedRoute><NoteDetail /></ProtectedRoute>} />
          <Route path="/communication" element={<ProtectedRoute><Communication /></ProtectedRoute>} />
          <Route path="/data"          element={<ProtectedRoute><DataMaintenance /></ProtectedRoute>} />
          <Route path="/privacy"      element={<PrivacyPolicy />} />
          <Route path="/terms"        element={<Terms />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
