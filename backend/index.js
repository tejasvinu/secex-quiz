const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { createServer } = require('http');
const { Server } = require('socket.io');
const quizRoutes = require('./routes/quizRoutes');
const authRoutes = require('./routes/authRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const httpServer = createServer(app);

// CORS configuration
const allowedOrigins = "*";
const corsOptions = {
    origin:'*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Initialize Socket.IO with CORS options
const io = new Server(httpServer, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
    path: '/socket.io/',
    allowEIO3: true,
    pingTimeout: 30000, // Reduced from 60000
    pingInterval: 10000, // Reduced from 25000
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e6
});

// Store io instance to be used in routes
app.set('io', io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Socket.IO event handlers
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-game', (gameCode) => {
        socket.join(gameCode);
        console.log(`Client ${socket.id} joined game ${gameCode}`);
    });

    socket.on('start-game', (gameCode) => {
        io.to(gameCode).emit('game-started');
        console.log(`Game started: ${gameCode}`);
    });

    socket.on('next-question', ({ gameCode, questionIndex }) => {
        io.to(gameCode).emit('new-question', { questionIndex });
        console.log(`New question ${questionIndex} for game ${gameCode}`);
    });

    socket.on('submit-answer', ({ gameCode, username, answer, timeTaken }) => {
        io.to(gameCode).emit('player-answered', { 
            username, 
            timeTaken,
            answer
        });
        console.log(`Answer submitted by ${username} in game ${gameCode}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/assessment', assessmentRoutes);

// Home route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to SecEx Quiz API' });
});

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, HOST, () => {
    console.log(`Server is running on ${HOST}:${PORT}`);
});