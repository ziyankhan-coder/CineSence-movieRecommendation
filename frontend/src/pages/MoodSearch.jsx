import React, { useState } from 'react';
import axios from 'axios';
import MovieCard from '../components/MovieCard';

// ----------------------------------------------------------------------
// EXPLANATION FOR INTERVIEW:
// This page takes a natural language string from the user.
// When 'Search' is clicked, it sends the text to our Django backend.
// Django uses basic NLP to map those words to movie metadata (genres/keywords)
// and returns the best matching movies.
// ----------------------------------------------------------------------

function MoodSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setSearched(true);
    
    // Call the Mood Search API
    axios.get(`http://127.0.0.1:8000/api/mood-search/?q=${query}`)
      .then(response => {
        setResults(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error with mood search:", error);
        setLoading(false);
      });
  };

  return (
    <div>
      <div className="search-container">
        <h2>How are you feeling today?</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Example: "I want to watch an action movie with aliens" or "sad romantic"
        </p>
        
        <div className="search-input-group">
          <input 
            type="text" 
            className="search-input"
            placeholder="Type your mood..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="search-button" onClick={handleSearch}>
            Search AI
          </button>
        </div>
      </div>

      {loading && <div className="loading">AI is analyzing your mood...</div>}

      {!loading && searched && (
        <>
          <h2 className="section-title">AI Matches for "{query}"</h2>
          <div className="movie-grid">
            {results.length > 0 ? (
              results.map((movie) => (
                <MovieCard key={movie.movie_id} movie={movie} onClick={() => {}} />
              ))
            ) : (
              <p style={{ marginLeft: '4rem' }}>No perfect match found. Try different words!</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default MoodSearch;
