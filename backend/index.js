const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? ['http://localhost:5173', 'http://frontend'] // Allow frontend service and localhost
            : 'http://localhost:5173',
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io/'
});

// Store io instance to be used in routes
app.set('io', io);

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['http://localhost:5173', 'http://frontend']
        : 'http://localhost:5173',
    credentials: true
}));
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
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/quiz', require('./routes/quizRoutes'));

// Home route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to SecEx Quiz API' });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});