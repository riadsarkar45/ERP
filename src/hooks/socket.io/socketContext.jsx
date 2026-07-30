/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect } from 'react';
import { io } from 'socket.io-client';

// Created ONCE at module scope, not inside a component or useState
// initializer. This is deliberate: React 18 StrictMode double-invokes
// effects in development, which was causing the cleanup below to call
// socket.close() — and Socket.IO does NOT auto-reconnect after an
// explicit close(). That left the socket permanently dead after the
// very first render cycle in dev, even though it looked like nothing
// was wrong. Keeping the instance at module scope means it survives
// StrictMode's mount/unmount/remount simulation untouched.
// http://localhost:3000
// https://erp-eyf7.onrender.com
const socket = io(import.meta.env.VITE_BACKEND_URL || 'https://erp-eyf7.onrender.com', {
    withCredentials: true,
});

const SocketContext = createContext(socket);

export const SocketProvider = ({ children }) => {
    useEffect(() => {
        const handleConnect = () => console.log('Socket connected:', socket.id);
        const handleDisconnect = () => console.log('Socket disconnected');

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        // Only remove these specific listeners on cleanup — do NOT close
        // the socket here. It's a singleton meant to live for the app's
        // lifetime, not tied to this provider's mount/unmount.
        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    return useContext(SocketContext);
};