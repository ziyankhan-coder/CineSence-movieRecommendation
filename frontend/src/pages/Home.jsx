import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MovieCard from '../components/MovieCard';

// ----------------------------------------------------------------------
// EXPLANATION FOR INTERVIEW:
// - `useState`: Stores data inside this component (like the list of movies).
// - `useEffect`: Runs code automatically when the page loads (like fetching data from our Django API).
// - `axios`: A library used to make HTTP requests (GET/POST) to our backend.
// ----------------------------------------------------------------------

function Home() {
  const [movies, setMovies] = useState([]);
  const [bollywood, setBollywood] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial movies when page loads
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/movies/')
      .then(response => {
        setMovies(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching movies:", error);
        setLoading(false);
      });

    axios.get('http://127.0.0.1:8000/api/bollywood/')
      .then(response => {
        setBollywood(response.data);
      })
      .catch(error => console.error("Error fetching bollywood:", error));
  }, []);

  // Fetch recommendations when a user clicks a movie
  const handleMovieClick = (movie) => {
    setSelectedMovie(movie);
    setRecommendations([]); // clear old recommendations
    
    // Call our Django ML API
    axios.get(`http://127.0.0.1:8000/api/recommend/?title=${movie.title}`)
      .then(response => {
        setRecommendations(response.data);
      })
      .catch(error => {
        console.error("Error fetching recommendations:", error);
      });
  };

  if (loading) {
    return <div className="loading">Loading Movies from Database...</div>;
  }

  return (
    <div>
      <section className="hero">
        <h1>Welcome to CineSense</h1>
        <p>Your personal AI-powered movie recommendation engine. Click on any movie below to find similar titles using our Machine Learning model.</p>
      </section>

      {/* Show Recommendations if a movie was clicked */}
      {selectedMovie && (
        <div style={{ backgroundColor: '#2a2b30', paddingBottom: '2rem' }}>
          <h2 className="section-title" style={{ color: 'var(--primary)' }}>
            Because you liked "{selectedMovie.title}"
          </h2>
          <div className="movie-grid">
            {recommendations.length > 0 ? (
              recommendations.map((rec) => (
                <MovieCard key={rec.movie_id} movie={rec} onClick={handleMovieClick} />
              ))
            ) : (
              <p style={{ marginLeft: '4rem' }}>Calculating AI Recommendations...</p>
            )}
          </div>
        </div>
      )}

      {/* Show Trending Movies */}
      <h2 className="section-title">Trending Movies</h2>
      <div className="movie-grid">
        {movies.map((movie) => (
          <MovieCard key={movie.movie_id} movie={movie} onClick={handleMovieClick} />
        ))}
      </div>

      {/* Show Bollywood Hits */}
      <h2 className="section-title" style={{ marginTop: '2rem' }}>Bollywood Hits 🇮🇳</h2>
      <div className="movie-grid">
        {bollywood.map((movie) => (
          <MovieCard key={movie.movie_id} movie={movie} onClick={handleMovieClick} />
        ))}
      </div>
    </div>
  );
}

export default Home;
