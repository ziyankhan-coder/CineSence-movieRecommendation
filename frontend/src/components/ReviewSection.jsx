import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

function ReviewSection({ movie }) {
    const { user } = useContext(AuthContext);
    const [reviewsData, setReviewsData] = useState({ average_rating: 0, total_reviews: 0, reviews: [] });
    const [loading, setLoading] = useState(true);
    
    // Form state
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchReviews();
    }, [movie.movie_id]);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/reviews/${movie.movie_id}/`);
            setReviewsData(response.data);
            
            // If user is logged in, check if they already reviewed this movie and pre-fill form
            if (user) {
                const myReview = response.data.reviews.find(r => r.username === user.username);
                if (myReview) {
                    setRating(myReview.rating);
                    setComment(myReview.comment);
                } else {
                    setRating(0);
                    setComment('');
                }
            }
        } catch (err) {
            console.error("Failed to load reviews:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setError("You must be logged in to leave a review.");
            return;
        }
        if (rating === 0) {
            setError("Please select a star rating.");
            return;
        }

        setSubmitting(true);
        setError(null);
        
        try {
            await axios.post(`http://127.0.0.1:8000/api/reviews/${movie.movie_id}/`, {
                rating: rating,
                comment: comment,
                movie_title: movie.title
            });
            // Reload reviews to show the new one
            fetchReviews();
            // Show success briefly
        } catch (err) {
            console.error("Error submitting review:", err);
            setError(err.response?.data?.error || "Failed to submit review");
        } finally {
            setSubmitting(false);
        }
    };

    // Render 5 stars for the form
    const renderStarInput = () => {
        return (
            <div className="star-rating-input">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                        key={star}
                        className={`star ${star <= (hoverRating || rating) ? 'filled' : ''}`}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                    >
                        ★
                    </span>
                ))}
            </div>
        );
    };

    // Helper to render static stars for a review
    const renderStaticStars = (num) => {
        return (
            <div className="static-stars">
                {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} className={`star ${star <= num ? 'filled' : ''}`}>★</span>
                ))}
            </div>
        );
    };

    if (loading) return <div className="reviews-loading">Loading reviews...</div>;

    return (
        <div className="review-section">
            <div className="review-header">
                <h3>Audience Reviews</h3>
                <div className="average-rating">
                    <span className="big-star">★</span> 
                    <span className="score">{reviewsData.average_rating}</span> 
                    <span className="count">({reviewsData.total_reviews} reviews)</span>
                </div>
            </div>

            {/* Write a review form */}
            <div className="review-form-container">
                <h4>{user ? (rating > 0 && reviewsData.reviews.find(r => r.username === user.username) ? "Update your review" : "Rate this movie") : "Login to rate this movie"}</h4>
                {error && <div className="review-error">{error}</div>}
                
                {user ? (
                    <form onSubmit={handleSubmit} className="review-form">
                        {renderStarInput()}
                        <textarea 
                            placeholder="What did you think of the movie? (Optional)"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            maxLength={500}
                        />
                        <button type="submit" disabled={submitting} className="submit-btn">
                            {submitting ? 'Submitting...' : 'Post Review'}
                        </button>
                    </form>
                ) : (
                    <p className="login-prompt">You need to be logged in to write a review.</p>
                )}
            </div>

            {/* Review List */}
            <div className="reviews-list">
                {reviewsData.reviews.length === 0 ? (
                    <p className="no-reviews">No reviews yet. Be the first to review!</p>
                ) : (
                    reviewsData.reviews.map(review => (
                        <div key={review.id} className="review-card">
                            <div className="review-card-header">
                                <div className="reviewer-info">
                                    <div className="avatar">{review.username.charAt(0).toUpperCase()}</div>
                                    <span className="username">{review.username}</span>
                                </div>
                                <span className="date">{review.created_on}</span>
                            </div>
                            {renderStaticStars(review.rating)}
                            {review.comment && <p className="review-comment">{review.comment}</p>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default ReviewSection;
