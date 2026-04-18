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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
