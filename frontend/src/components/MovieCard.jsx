import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ----------------------------------------------------------------------
// EXPLANATION FOR INTERVIEW:
// We use 'useEffect' to fetch the poster from OMDB API automatically 
// when the movie card loads. This connects our App to the outside world!
// ----------------------------------------------------------------------

function MovieCard({ movie, onClick, isWatchlisted, onToggleWatchlist }) {
  const [posterUrl, setPosterUrl] = useState(null);

  useEffect(() => {
    // We use environment variables for best practice, but provide the free public key as a fallback
    // so that recruiters testing the app don't experience missing posters if they forget to add the key.
    const OMDB_API_KEY = import.meta.env.VITE_OMDB_API_KEY || '38503190';  
    
    // Encode title so spaces become %20 for the URL
    const title = encodeURIComponent(movie.title);
    
    axios.get(`https://www.omdbapi.com/?t=${title}&apikey=${OMDB_API_KEY}`)
      .then(response => {
        if (response.data && response.data.Poster && response.data.Poster !== "N/A") {
          setPosterUrl(response.data.Poster);
        }
      })
      .catch(err => console.error("Error fetching poster:", err));
  }, [movie.title]);

  return (
    <div className="movie-card">
      <div className="movie-poster" onClick={() => onClick(movie)} style={posterUrl ? { backgroundImage: `url(${posterUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
        {!posterUrl && "🎬"}
      </div>
      <div className="movie-info">
        <h3 className="movie-title" onClick={() => onClick(movie)}>{movie.title}</h3>
        {movie.match_score && (
          <p className="movie-score">Mood Match Score: {movie.match_score}</p>
        )}
        
        {/* Watchlist Button */}
        {onToggleWatchlist && (
          <button 
            className={`watchlist-btn ${isWatchlisted ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(movie);
            }}
          >
            {isWatchlisted ? '✓ In Watchlist' : '+ Add to Watchlist'}
          </button>
        )}
      </div>
    </div>
  );
}

export default MovieCard;
