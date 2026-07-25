import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
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

    // Get user initials for avatar
    const getUserInitials = (name) => {
        if (!name) return 'U';
        return name.charAt(0).toUpperCase();
    };

    return (
        <div className="profile-container">
            {/* Top Banner Card */}
            <div className="profile-header-card">
                <div className="profile-user-info">
                    <div className="profile-avatar-large">
                        {getUserInitials(user.username)}
                    </div>
                    <div className="profile-details">
                        <h1>{user.username}</h1>
                        <p>✨ VIP CineSense Member</p>
                    </div>
                </div>

                <div className="profile-stats">
                    <div className="stat-box">
                        <span className="stat-number">{watchlist.length}</span>
                        <span className="stat-label">Watchlisted</span>
                    </div>
                    <button onClick={handleLogout} className="profile-logout-btn">
                        <span>🚪</span> Logout
                    </button>
                </div>
            </div>

            {/* Watchlist Section */}
            <div className="profile-section-header">
                <h2 className="profile-section-title">
                    <span>📌</span> My Wishlist & Watchlist
                </h2>
            </div>

            {watchlist.length > 0 ? (
                <div className="movie-grid">
                    {watchlist.map((movie) => (
                        <MovieCard 
                            key={movie.movie_id} 
                            movie={movie} 
                            onClick={() => {}} 
                            isWatchlisted={true} 
                            onToggleWatchlist={removeFromWatchlist} 
                        />
                    ))}
                </div>
            ) : (
                <div className="empty-watchlist-card">
                    <span className="empty-icon">🎬</span>
                    <h3>Your Watchlist is Empty</h3>
                    <p>You haven't saved any movies to your watchlist yet. Start exploring and save movies you want to watch!</p>
                    <Link to="/" className="explore-btn">
                        Explore Movies Now
                    </Link>
                </div>
            )}
        </div>
    );
}

export default Profile;
