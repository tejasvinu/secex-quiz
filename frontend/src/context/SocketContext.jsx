import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import LoadingSpinner from '../components/LoadingSpinner';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const [isConnecting, setIsConnecting] = useState(true);

    useEffect(() => {
        // Use window.location to get the current host dynamically
        const host = window.location.hostname;
        const port = window.location.port || '80';
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socketUrl = import.meta.env.VITE_SOCKET_URL || `${protocol}//${host}:${port}`;
        
        const newSocket = io(socketUrl, {
            transports: ['websocket'],
            path: '/socket.io/',
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            secure: window.location.protocol === 'https:'
        });
        
        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setSocket(newSocket);
            setIsConnecting(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setIsConnecting(false);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });

        return () => {
            if (newSocket) newSocket.close();
        };
    }, []);

    if (isConnecting) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <LoadingSpinner size="large" color="white" />
                    <p className="mt-4 text-white text-lg">Connecting to server...</p>
                </div>
            </div>
        );
    }

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const socket = useContext(SocketContext);
    if (!socket) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return socket;
}