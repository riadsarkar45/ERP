/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import useAxiosPublic from '../../hooks/Axios';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const axiosPublic = useAxiosPublic();
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [loading, setLoading] = useState(true); // true while we check for an existing session
    const hasAttemptedRefresh = useRef(false); // prevents StrictMode's double-effect from firing /refresh twice

    useEffect(() => {
        if (hasAttemptedRefresh.current) return;
        hasAttemptedRefresh.current = true;

        (async () => {
            try {
                const { data } = await axiosPublic.post('/api/auth/refresh');
                setAccessToken(data.accessToken);

                const meRes = await axiosPublic.get('/api/auth/me', {
                    headers: { Authorization: `Bearer ${data.accessToken}` },
                });
                setUser(meRes.data);
            } catch (err) {
                setAccessToken(null);
                console.log(err);
            } finally {
                setLoading(false);
            }
        })();
    }, [axiosPublic]);

    const login = async (phoneNo, password) => {
        const { data } = await axiosPublic.post('/api/auth/login', { phoneNo, password });
        setAccessToken(data.accessToken);
        setUser(data.user);
        return data;
    };
    const logout = async () => {
        try {
            await axiosPublic.post('/api/auth/logout');
        } finally {
            setAccessToken(null);
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                accessToken,
                setAccessToken, // exposed so useAxiosPrivate's interceptor can update it after a silent refresh
                loading,
                isAuthenticated: !!accessToken,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
};