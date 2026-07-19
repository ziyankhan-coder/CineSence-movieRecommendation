import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('access_token');
        const username = localStorage.getItem('username');
        if (token && username) {
            setUser({ username, token });
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        localStorage.setItem('access_token', userData.access);
        localStorage.setItem('refresh_token', userData.refresh);
        localStorage.setItem('username', userData.username);
        setUser({ username: userData.username, token: userData.access });
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('username');
        setUser(null);
    };

    // Axios interceptor to add token to every request
    axios.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('access_token');
            // Only add the token for requests to our own backend API to avoid CORS issues with 3rd party APIs (like OMDB)
            if (token && config.url.includes('127.0.0.1:8000')) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
