import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const [isConnecting, setIsConnecting] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;

    useEffect(() => {
        let socketInstance = null;

        const connectSocket = () => {
            const socketUrl = import.meta.env.VITE_SOCKET_URL;
            
            socketInstance = io(socketUrl, {
                transports: ['websocket'],
                path: '/socket.io',
                reconnectionAttempts: 3,
                reconnectionDelay: 500,
                timeout: 5000,
                autoConnect: true,
                forceNew: true
            });

            socketInstance.on('connect', () => {
                console.log('Socket connected:', socketInstance.id);
                setSocket(socketInstance);
                setIsConnecting(false);
                setRetryCount(0);
            });

            socketInstance.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                if (retryCount < MAX_RETRIES) {
                    setRetryCount(prev => prev + 1);
                    setTimeout(() => {
                        console.log('Retrying connection...');
                        socketInstance.connect();
                    }, 2000);
                } else {
                    setIsConnecting(false);
                    toast.error('Could not connect to game server. Please refresh the page.');
                }
            });

            socketInstance.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
                if (reason === 'io server disconnect') {
                    // Server disconnected us, try to reconnect
                    socketInstance.connect();
                }
            });
        };

        connectSocket();

        return () => {
            if (socketInstance) {
                socketInstance.close();
            }
        };
    }, [retryCount]);

    if (isConnecting) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <LoadingSpinner size="large" color="white" />
                    <p className="mt-4 text-white text-lg">
                        {retryCount > 0 ? `Retrying connection (${retryCount}/${MAX_RETRIES})...` : 'Connecting to server...'}
                    </p>
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