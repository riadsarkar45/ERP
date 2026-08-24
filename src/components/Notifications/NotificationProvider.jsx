import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/socket.io/socketContext';
import notiSound from '../../assets/faaah.mp3';
// ⚠️ FIXING THE FILE PATH ERROR:
// If 'faaah.mp3' is inside your 'public' folder, keep this line exactly as is:

// If 'faaah.mp3' is inside your 'src/assets' folder, DELETE the line above 
// and UNCOMMENT this line instead:
// import SOUND_URL from '../../assets/faaah.mp3'; 

export default function GlobalNotifications() {
    const socket = useSocket();
    const [notifications, setNotifications] = useState([]);
    const audioRef = useRef(null);
    const timeoutsRef = useRef(new Set());
    const isAudioUnlockedRef = useRef(false);
    const SOUND_URL = notiSound;


    // 1. Initialize Audio & Catch Path Errors
    useEffect(() => {
        audioRef.current = new Audio(SOUND_URL);
        audioRef.current.volume = 0.5;

        // Preload to catch 404 errors early
        audioRef.current.load();
        audioRef.current.addEventListener('error', () => {
            console.error("❌ Audio file failed to load. Ensure 'faaah.mp3' is in your 'public' folder or update the import path.");
        });

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
        };
    }, []);

    // 2. Automatically unlock browser audio restrictions on first user interaction
    useEffect(() => {
        const unlockAudio = () => {
            if (isAudioUnlockedRef.current) return;
            if (audioRef.current) {
                // Play and immediately pause to "trick" the browser into allowing audio
                audioRef.current.play()
                    .then(() => {
                        audioRef.current.pause();
                        audioRef.current.currentTime = 0;
                        isAudioUnlockedRef.current = true;
                        console.log("🔊 Audio unlocked! Notifications will now play sound.");
                    })
                    .catch(() => { });
            }
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);

        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };
    }, []);

    // 3. Handle Socket Notifications
    useEffect(() => {
        if (!socket) return;

        const handleNotification = (data) => {
            console.log(data, "received data from backend");
            const id = Date.now() + Math.random();
            setNotifications((prev) => [...prev, { id, ...data }]);

            // Play Sound
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch((err) => {
                    console.warn("Audio blocked. Click anywhere on the page to enable sound.", err);
                });
            }

            // Auto remove after 4s
            const timeoutId = setTimeout(() => {
                setNotifications((prev) => prev.filter((n) => n.id !== id));
                timeoutsRef.current.delete(timeoutId);
            }, 4000);

            timeoutsRef.current.add(timeoutId);
        };

        socket.on('work-order-approval-request', handleNotification);

        return () => {
            socket.off('work-order-approval-request', handleNotification);
            timeoutsRef.current.forEach(clearTimeout);
            timeoutsRef.current.clear();
        };
    }, [socket]);

    const remove = (id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80">
            {notifications.map((n) => (
                <div
                    key={n.id}
                    className={`p-3 rounded-lg shadow-lg text-sm text-white transition-all ${n.type === 'error' ? 'bg-red-500' :
                            n.type === 'success' ? 'bg-green-500' :
                                n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                >
                    <div className="flex justify-between items-start gap-2">
                        <div>
                            {n.title && <p className="font-semibold">{n.title}</p>}
                            <p>{n.message}</p>
                        </div>
                        <button onClick={() => remove(n.id)} className="opacity-80 hover:opacity-100">
                            ✕
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}