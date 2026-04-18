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
import Appointments from './pages/Appointments.jsx'
import Profile from './pages/Profile.jsx'

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
          <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
