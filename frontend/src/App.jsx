import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import MoodSearch from './pages/MoodSearch';
import './index.css';

// ----------------------------------------------------------------------
// EXPLANATION FOR INTERVIEW:
// App component is the root of our React application.
// We use 'react-router-dom' to handle navigation between different pages
// without reloading the browser (this is what makes it a Single Page App - SPA).
// ----------------------------------------------------------------------

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Navbar is outside of Routes so it appears on every page */}
        <nav className="navbar">
          <Link to="/" className="nav-brand">CineSense</Link>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/mood-search">AI Mood Search</Link>
          </div>
        </nav>

        {/* Routes define which component to show based on the URL */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mood-search" element={<MoodSearch />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
