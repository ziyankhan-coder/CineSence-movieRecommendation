import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import MovieCard from '../components/MovieCard';
import { AuthContext } from '../context/AuthContext';

// ----------------------------------------------------------------------
// EXPLANATION FOR INTERVIEW:
// - `useState`: Stores data inside this component (like the list of movies).
// - `useEffect`: Runs code automatically when the page loads (like fetching data from our Django API).
// - `axios`: A library used to make HTTP requests (GET/POST) to our backend.
// ----------------------------------------------------------------------

function Home() {
  const [movies, setMovies] = useState([]);
  const [bollywood, setBollywood] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [scifiMovies, setScifiMovies] = useState([]);
  const [comedyMovies, setComedyMovies] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  
  const [recommendations, setRecommendations] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  // Fetch initial movies when page loads
  useEffect(() => {
    // Load Watchlist
    if (user) {
      axios.get('http://127.0.0.1:8000/api/watchlist/')
        .then(res => setWatchlist(res.data))
        .catch(err => console.error("Error fetching watchlist:", err));
    } else {
      const savedWatchlist = JSON.parse(localStorage.getItem('cinesense_watchlist')) || [];
      setWatchlist(savedWatchlist);
    }

    // Fetch All Categories
    Promise.all([
      axios.get('http://127.0.0.1:8000/api/movies/'),
      axios.get('http://127.0.0.1:8000/api/bollywood/'),
      axios.get('http://127.0.0.1:8000/api/action/'),
      axios.get('http://127.0.0.1:8000/api/scifi/'),
      axios.get('http://127.0.0.1:8000/api/comedy/')
    ]).then(([resMovies, resBolly, resAction, resScifi, resComedy]) => {
      setMovies(resMovies.data);
      setBollywood(resBolly.data);
      setActionMovies(resAction.data);
      setScifiMovies(resScifi.data);
      setComedyMovies(resComedy.data);
      setLoading(false);
    }).catch(error => {
      console.error("Error fetching data:", error);
      setLoading(false);
    });
  }, [user]);

  const toggleWatchlist = async (movie) => {
    const isWatchlisted = watchlist.some(m => m.movie_id === movie.movie_id);
    let updatedWatchlist;
    
    if (isWatchlisted) {
      updatedWatchlist = watchlist.filter(m => m.movie_id !== movie.movie_id);
    } else {
      updatedWatchlist = [...watchlist, movie];
    }
    
    // Optimistic UI update
    setWatchlist(updatedWatchlist);
    
    if (user) {
      // Sync with Backend
      try {
        await axios.post('http://127.0.0.1:8000/api/watchlist/', {
          movie_id: movie.movie_id,
          title: movie.title
        });
      } catch (err) {
        console.error("Failed to sync watchlist with backend", err);
      }
    } else {
      // Save locally
      localStorage.setItem('cinesense_watchlist', JSON.stringify(updatedWatchlist));
    }
  };

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
                <MovieCard key={rec.movie_id} movie={rec} onClick={handleMovieClick} isWatchlisted={watchlist.some(m => m.movie_id === rec.movie_id)} onToggleWatchlist={toggleWatchlist} />
              ))
            ) : (
              <p style={{ marginLeft: '4rem' }}>Calculating AI Recommendations...</p>
            )}
          </div>
        </div>
      )}

      {/* Show Watchlist */}
      {watchlist.length > 0 && (
        <>
          <h2 className="section-title">My Watchlist 📌</h2>
          <div className="movie-grid">
            {watchlist.map((movie) => (
              <MovieCard key={movie.movie_id} movie={movie} onClick={handleMovieClick} isWatchlisted={true} onToggleWatchlist={toggleWatchlist} />
            ))}
          </div>
        </>
      )}

      {/* Show Trending Movies */}
      <h2 className="section-title" style={{ marginTop: '2rem' }}>Trending Now</h2>
      <div className="movie-grid">
        {movies.map((movie) => (
          <MovieCard key={movie.movie_id} movie={movie} onClick={handleMovieClick} isWatchlisted={watchlist.some(m => m.movie_id === movie.movie_id)} onToggleWatchlist={toggleWatchlist} />
        ))}
      </div>

      {/* Show Bollywood Hits */}
      <h2 className="section-title" style={{ marginTop: '2rem' }}>Bollywood Hits 🇮🇳</h2>
      <div className="movie-grid">
        {bollywood.map((movie) => (
          <MovieCard key={movie.movie_id} movie={movie} onClick={handleMovieClick} isWatchlisted={watchlist.some(m => m.movie_id === movie.movie_id)} onToggleWatchlist={toggleWatchlist} />
        ))}
      </div>

      {/* Show Action Blockbusters */}
      <h2 className="section-title" style={{ marginTop: '2rem' }}>Action Blockbusters 💥</h2>
      <div className="movie-grid">
        {actionMovies.map((movie) => (
          <MovieCard key={movie.movie_id} movie={movie} onClick={handleMovieClick} isWatchlisted={watchlist.some(m => m.movie_id === movie.movie_id)} onToggleWatchlist={toggleWatchlist} />
        ))}
      </div>

      {/* Show Sci-Fi Adventures */}
      <h2 className="section-title" style={{ marginTop: '2rem' }}>Sci-Fi Adventures 🛸</h2>
      <div className="movie-grid">
        {scifiMovies.map((movie) => (
          <MovieCard key={movie.movie_id} movie={movie} onClick={handleMovieClick} isWatchlisted={watchlist.some(m => m.movie_id === movie.movie_id)} onToggleWatchlist={toggleWatchlist} />
        ))}
      </div>

      {/* Show Comedy Hits */}
      <h2 className="section-title" style={{ marginTop: '2rem' }}>Comedy Hits 😂</h2>
      <div className="movie-grid">
        {comedyMovies.map((movie) => (
          <MovieCard key={movie.movie_id} movie={movie} onClick={handleMovieClick} isWatchlisted={watchlist.some(m => m.movie_id === movie.movie_id)} onToggleWatchlist={toggleWatchlist} />
        ))}
      </div>
    </div>
  );
}

export default Home;
