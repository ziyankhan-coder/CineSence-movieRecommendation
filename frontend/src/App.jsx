import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import MoodSearch from './pages/MoodSearch';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import React, { useContext } from 'react';
import './index.css';

// Google Client ID - The user needs to provide this!
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE";

// ----------------------------------------------------------------------
// EXPLANATION FOR INTERVIEW:
// App component is the root of our React application.
// We use 'react-router-dom' to handle navigation between different pages
// without reloading the browser (this is what makes it a Single Page App - SPA).
// ----------------------------------------------------------------------

function Navbar() {
  const { user } = useContext(AuthContext);
  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">CineSense</Link>
      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/mood-search">AI Mood Search</Link>
        {user ? (
          <Link to="/profile" style={{ color: 'var(--primary)' }}>My Profile</Link>
        ) : (
          <Link to="/login" style={{ border: '1px solid var(--primary)', padding: '4px 12px', borderRadius: '4px' }}>Login</Link>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <div className="app-container">
            <Navbar />
            
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/mood-search" element={<MoodSearch />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
