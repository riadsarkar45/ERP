import React, { useEffect, useState } from 'react';
import { useSocket } from '../../../hooks/socket.io/socketContext';

const ApiMonitoring = () => {
    const socket = useSocket();
    
    // 👇 CHANGE 1: Use an array instead of an object
    const [apiData, setApiData] = useState([]);

    useEffect(() => {
        if (!socket) return;

        const handleApiUpdate = (data) => {
            // 👇 CHANGE 2: Add the new event to the beginning of the array
            // We use .slice(0, 50) to keep only the last 50 events. 
            // This prevents memory leaks and keeps the UI fast if the app runs all day!
            setApiData(prevData => [data, ...prevData].slice(0, 50)); 
        };

        socket.on('rate-limit-event', handleApiUpdate);

        return () => {
            socket.off('rate-limit-event', handleApiUpdate);
        };
    }, [socket]);

    return (
        <div className="bg-white p-2 border border-blue-500 rounded-md">
            <div className="bg-blue-200 p-1 rounded-md mb-2">
                <h2 className="font-bold text-center">API Monitoring</h2>
            </div>
            
            {apiData.length === 0 ? (
                <p className="text-gray-500 text-center">No API data available.</p>
            ) : (
                // 👇 CHANGE 3: Map directly over the array
                apiData.map((data, index) => (
                    <div 
                        key={index} 
                        className={`flex gap-3 border p-2 my-2 rounded-md ${
                            data.type === "blocked" 
                                ? "bg-red-500/40 text-red-800 border-red-500" 
                                : "bg-green-500/20 text-green-800 border-green-500"
                        }`}
                    >
                        <span className="font-bold">{`>> >>`}</span>
                        
                        <div className="grid grid-cols-3 gap-4 uppercase">
                            <p><span className="font-semibold">Route:</span> {data.route}</p>
                            <p><span className="font-semibold">IP:</span> {data.ip}</p>
                            <p><span className="font-semibold">Status:</span> {data.type}</p>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default ApiMonitoring;