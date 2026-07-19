import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ----------------------------------------------------------------------
// EXPLANATION FOR INTERVIEW:
// We use 'useEffect' to fetch the poster from OMDB API automatically 
// when the movie card loads. This connects our App to the outside world!
// ----------------------------------------------------------------------

function MovieCard({ movie, onClick }) {
  const [posterUrl, setPosterUrl] = useState(null);

  useEffect(() => {
    // We use environment variables so the key is not exposed on GitHub!
    const OMDB_API_KEY = import.meta.env.VITE_OMDB_API_KEY;  
    
    // Encode title so spaces become %20 for the URL
    const title = encodeURIComponent(movie.title);
    
    axios.get(`http://www.omdbapi.com/?t=${title}&apikey=${OMDB_API_KEY}`)
      .then(response => {
        if (response.data && response.data.Poster && response.data.Poster !== "N/A") {
          setPosterUrl(response.data.Poster);
        }
      })
      .catch(err => console.error("Error fetching poster:", err));
  }, [movie.title]);

  return (
    <div className="movie-card" onClick={() => onClick(movie)}>
      <div className="movie-poster" style={posterUrl ? { backgroundImage: `url(${posterUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
        {!posterUrl && "🎬"}
      </div>
      <div className="movie-info">
        <h3 className="movie-title">{movie.title}</h3>
        {movie.match_score && (
          <p className="movie-score">Mood Match Score: {movie.match_score}</p>
        )}
      </div>
    </div>
  );
}

export default MovieCard;
