import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReviewSection from './ReviewSection';

function TrailerModal({ movie, onClose }) {
  const [trailerId, setTrailerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!movie) return;

    const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
    
    if (!YOUTUBE_API_KEY) {
      console.error("YouTube API Key is missing in .env!");
      setError(true);
      setLoading(false);
      return;
    }

    const searchQuery = encodeURIComponent(`${movie.title} official movie trailer`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${searchQuery}&type=video&key=${YOUTUBE_API_KEY}&maxResults=1`;

    axios.get(url)
      .then(res => {
        if (res.data.items && res.data.items.length > 0) {
          setTrailerId(res.data.items[0].id.videoId);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load trailer from YouTube API", err);
        setError(true);
        setLoading(false);
      });
  }, [movie]);

  if (!movie) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        
        <div className="video-container">
          {loading && <div className="loading" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Trailer...</div>}
          {error && <div className="error" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Could not find trailer</div>}
          {trailerId ? (
            <iframe 
              width="100%" 
              height="100%" 
              src={`https://www.youtube.com/embed/${trailerId}?autoplay=1`}
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen>
            </iframe>
          ) : (
            <div className="trailer-not-found">
              <span className="error-icon">🎬</span>
              <h3>Trailer Not Available</h3>
              <p>We couldn't find a trailer for "{movie.title}".</p>
              <p className="sub-error">You can still check out the reviews below or watch it on your favorite streaming platform.</p>
            </div>
          )}
        </div>
        
        <div className="modal-info">
          <h2>{movie.title}</h2>
          <div className="modal-tags">
            {movie.genres && <span className="tag">{movie.genres}</span>}
            {movie.rating && <span className="tag rating">⭐ {movie.rating}</span>}
          </div>
          <p className="plot">{movie.overview || "A great movie to watch!"}</p>
        </div>

        {/* Add Review Section Below the Trailer */}
        <div className="modal-reviews-wrapper">
          <ReviewSection movie={movie} />
        </div>
      </div>
    </div>
  );
}

export default TrailerModal;
