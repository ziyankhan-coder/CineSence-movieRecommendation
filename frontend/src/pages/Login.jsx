import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';

function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            if (isLogin) {
                const res = await axios.post('http://127.0.0.1:8000/api/login/', {
                    username: formData.username,
                    password: formData.password
                });
                login(res.data);
                navigate('/');
            } else {
                await axios.post('http://127.0.0.1:8000/api/register/', formData);
                setIsLogin(true); // Switch to login after successful register
                setError('Registration successful! Please login.');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred');
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/google-login/', {
                token: credentialResponse.credential
            });
            login(res.data);
            navigate('/');
        } catch (err) {
            setError('Google login failed');
        }
    };

    return (
        <div className="auth-container" style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center', backgroundColor: '#1e1f24', padding: '2rem', borderRadius: '12px' }}>
            <h2 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            
            {error && <div style={{ color: '#ff4c4c', marginBottom: '1rem', padding: '10px', backgroundColor: 'rgba(255, 76, 76, 0.1)', borderRadius: '4px' }}>{error}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <input 
                    type="text" 
                    placeholder="Username" 
                    className="search-input"
                    style={{ borderRadius: '8px' }}
                    value={formData.username} 
                    onChange={e => setFormData({...formData, username: e.target.value})} 
                    required 
                />
                
                {!isLogin && (
                    <input 
                        type="email" 
                        placeholder="Email" 
                        className="search-input"
                        style={{ borderRadius: '8px' }}
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})} 
                        required 
                    />
                )}
                
                <input 
                    type="password" 
                    placeholder="Password" 
                    className="search-input"
                    style={{ borderRadius: '8px' }}
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    required 
                />
                
                <button type="submit" className="search-button" style={{ borderRadius: '8px', padding: '12px' }}>
                    {isLogin ? 'Login' : 'Sign Up'}
                </button>
            </form>
            
            <div style={{ margin: '1.5rem 0', color: 'var(--text-muted)' }}>OR</div>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google Login Failed')}
                />
            </div>
            
            <p style={{ color: 'var(--text-muted)' }}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <span 
                    style={{ color: 'var(--primary)', cursor: 'pointer' }}
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                >
                    {isLogin ? 'Sign Up' : 'Login'}
                </span>
            </p>
        </div>
    );
}

export default Login;
