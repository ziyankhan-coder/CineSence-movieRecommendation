import React, { useState, useContext } from 'react';
import axios from 'axios';
import MovieCard from '../components/MovieCard';
import TrailerModal from '../components/TrailerModal';
import { AuthContext } from '../context/AuthContext';

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
  const [selectedTrailerMovie, setSelectedTrailerMovie] = useState(null);
  
  // Connect to auth context to handle watchlist
  const { user } = useContext(AuthContext);
  const [watchlist, setWatchlist] = useState(
    JSON.parse(localStorage.getItem('cinesense_watchlist')) || []
  );

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
        console.error("Error performing mood search:", error);
        setLoading(false);
      });
  };

  const handleMovieClick = (movie) => {
    setSelectedTrailerMovie(movie);
  };

  const toggleWatchlist = async (movie) => {
    const isWatchlisted = watchlist.some(m => m.movie_id === movie.movie_id);
    let updatedWatchlist;
    if (isWatchlisted) {
      updatedWatchlist = watchlist.filter(m => m.movie_id !== movie.movie_id);
    } else {
      updatedWatchlist = [...watchlist, movie];
    }
    
    setWatchlist(updatedWatchlist);
    
    if (user) {
      try {
        await axios.post('http://127.0.0.1:8000/api/watchlist/', {
          movie_id: movie.movie_id,
          title: movie.title
        });
      } catch (err) {
        console.error("Failed to sync watchlist", err);
      }
    } else {
      localStorage.setItem('cinesense_watchlist', JSON.stringify(updatedWatchlist));
    }
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
            <div className="movie-grid">
              {results.map((movie) => (
                <MovieCard 
                  key={movie.movie_id} 
                  movie={movie} 
                  onClick={handleMovieClick}
                  isWatchlisted={watchlist.some(m => m.movie_id === movie.movie_id)}
                  onToggleWatchlist={toggleWatchlist} 
                />
              ))}
            </div>
          ) : (  <p style={{ marginLeft: '4rem' }}>No perfect match found. Try different words!</p>
            )}
          </div>
        </>
      )}
      
      {selectedTrailerMovie && (
        <TrailerModal 
          movie={selectedTrailerMovie} 
          onClose={() => setSelectedTrailerMovie(null)} 
        />
      )}
    </div>
  );
}

export default MoodSearch;
