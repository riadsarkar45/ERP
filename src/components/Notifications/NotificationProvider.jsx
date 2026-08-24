import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/socket.io/socketContext';

export default function GlobalNotifications() {
    const socket = useSocket();

    const [notifications, setNotifications] = useState([]);

    const audioRef = useRef(null);
    const timeoutsRef = useRef(new Set());

    useEffect(() => {
        audioRef.current = new Audio('/faaah.mp3');
        audioRef.current.volume = 0.5;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleNotification = (data) => {
            console.log(data, "received data from backend");

            const id = Date.now() + Math.random();

            setNotifications((prev) => [
                ...prev,
                { id, ...data }
            ]);

            // Play sound
            if (audioRef.current) {
                audioRef.current.currentTime = 0;

                audioRef.current.play().catch((err) => {
                    console.warn(
                        "Audio blocked by browser. User must interact with page first.",
                        err
                    );
                });
            }

            // Auto remove after 4 seconds
            const timeoutId = setTimeout(() => {
                setNotifications((prev) =>
                    prev.filter((n) => n.id !== id)
                );

                timeoutsRef.current.delete(timeoutId);
            }, 4000);

            timeoutsRef.current.add(timeoutId);
        };

        socket.on(
            'work-order-approval-request',
            handleNotification
        );

        return () => {
            socket.off(
                'work-order-approval-request',
                handleNotification
            );

            timeoutsRef.current.forEach((timeoutId) => {
                clearTimeout(timeoutId);
            });

            timeoutsRef.current.clear();
        };
    }, [socket]);

    const remove = (id) => {
        setNotifications((prev) =>
            prev.filter((n) => n.id !== id)
        );
    };

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80">
            {notifications.map((n) => (
                <div
                    key={n.id}
                    className={`p-3 rounded-lg shadow-lg text-sm text-white transition-all ${
                        n.type === 'error'
                            ? 'bg-red-500'
                            : n.type === 'success'
                            ? 'bg-green-500'
                            : n.type === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                    }`}
                >
                    <div className="flex justify-between items-start gap-2">
                        <div>
                            {n.title && (
                                <p className="font-semibold">
                                    {n.title}
                                </p>
                            )}

                            <p>{n.message}</p>
                        </div>

                        <button
                            onClick={() => remove(n.id)}
                            className="opacity-80 hover:opacity-100"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}