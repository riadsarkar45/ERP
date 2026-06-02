import React, { useEffect } from 'react';
import { useSocket } from '../../../hooks/socket.io/socketContext';

const ApiMonitoring = () => {
    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;

        const handleApiUpdate = (data) => {
            console.log('API Update:', data);
        };

        socket.on('rate-limit-event', handleApiUpdate);

        return () => {
            socket.off('rate-limit-event', handleApiUpdate);
        };
    }, [socket]);
    return (
        <div>

        </div>
    );
};

export default ApiMonitoring;