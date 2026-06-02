/* eslint-disable react-refresh/only-export-components */ // Fixes the ESLint warning

import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket] = useState(() => 
    io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000', {
      withCredentials: true,
    })
  );

  useEffect(() => {
    const handleConnect = () => console.log(' Socket connected:', socket.id);
    const handleDisconnect = () => console.log(' Socket disconnected');

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.close();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};