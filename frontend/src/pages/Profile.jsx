import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MovieCard from '../components/MovieCard';

function Profile() {
    const { user, logout, loading } = useContext(AuthContext);
    const navigate = useNavigate();
    const [watchlist, setWatchlist] = useState([]);
    
    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        if (user) {
            fetchWatchlist();
        }
    }, [user]);

    const fetchWatchlist = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/watchlist/');
            setWatchlist(res.data);
        } catch (error) {
            console.error("Error fetching watchlist", error);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const removeFromWatchlist = async (movie) => {
        try {
            await axios.post('http://127.0.0.1:8000/api/watchlist/', {
                movie_id: movie.movie_id,
                title: movie.title
            });
            // Update local state to reflect removal
            setWatchlist(watchlist.filter(m => m.movie_id !== movie.movie_id));
        } catch (error) {
            console.error("Error removing from watchlist", error);
        }
    };

    if (loading || !user) return <div className="loading">Loading Profile...</div>;

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--text-muted)' }}>
                <div>
                    <h1 style={{ color: 'var(--primary)' }}>My Profile</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Welcome, {user.username} 👋</p>
                </div>
                <button 
                    onClick={handleLogout}
                    className="search-button" 
                    style={{ backgroundColor: 'transparent', border: '1px solid #ff4c4c', color: '#ff4c4c' }}
                >
                    Logout
                </button>
            </div>

            <h2 className="section-title">My Wishlist / Watchlist 📌</h2>
            <div className="movie-grid">
                {watchlist.length > 0 ? (
                    watchlist.map((movie) => (
                        <MovieCard 
                            key={movie.movie_id} 
                            movie={movie} 
                            onClick={() => {}} 
                            isWatchlisted={true} 
                            onToggleWatchlist={removeFromWatchlist} 
                        />
                    ))
                ) : (
                    <p style={{ marginLeft: '4rem', color: 'var(--text-muted)' }}>Your watchlist is empty. Go find some movies!</p>
                )}
            </div>
        </div>
    );
}

export default Profile;
