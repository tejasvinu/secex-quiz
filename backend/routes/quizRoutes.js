const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Quiz = require('../models/Quiz');
const GameSession = require('../models/GameSession');
const { upload, extractTextFromDocument, generateQuizFromText } = require('../utils/documentProcessor');

// Create a quiz from document
router.post('/create-from-document', protect, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No document provided' });
        }

        // Extract text from the uploaded document
        const text = await extractTextFromDocument(req.file);
        
        // Generate quiz questions using AI
        const numQuestions = req.body.numQuestions || 10;
        const questions = await generateQuizFromText(text, req.body.title, numQuestions);
        
        // Create the quiz in the database
        const quiz = await Quiz.create({
            title: req.body.title,
            description: req.body.description || `Quiz generated from ${req.file.originalname}`,
            questions,
            timePerQuestion: req.body.timePerQuestion || 30,
            creator: req.user._id,
            isAiGenerated: true,
            sourceDocument: {
                name: req.file.originalname,
                type: req.file.mimetype,
                uploadDate: new Date()
            }
        });

        res.status(201).json(quiz);
    } catch (error) {
        console.error('Error creating quiz from document:', error);
        res.status(500).json({ message: 'Failed to create quiz from document', error: error.message });
    }
});

// Create a quiz from existing JSON format
router.post('/import-json', protect, async (req, res) => {
    try {
        const { quiz } = req.body;
        
        if (!quiz || !quiz.questions || !Array.isArray(quiz.questions)) {
            return res.status(400).json({ message: 'Invalid quiz format' });
        }

        // Validate the quiz format
        const isValidQuiz = quiz.questions.every(q => 
            q.question && 
            Array.isArray(q.options) && 
            q.options.length === 4 && 
            typeof q.correctOption === 'number' && 
            q.correctOption >= 0 && 
            q.correctOption < 4
        );

        if (!isValidQuiz) {
            return res.status(400).json({ message: 'Invalid quiz question format' });
        }

        const newQuiz = await Quiz.create({
            title: quiz.title || 'Imported Quiz',
            description: quiz.description || 'Quiz imported from JSON format',
            questions: quiz.questions,
            timePerQuestion: quiz.timePerQuestion || 30,
            creator: req.user._id
        });

        res.status(201).json(newQuiz);
    } catch (error) {
        console.error('Error importing quiz:', error);
        res.status(500).json({ message: 'Failed to import quiz', error: error.message });
    }
});

// Create a quiz
router.post('/', protect, async (req, res) => {
    try {
        const { title, description, questions, timePerQuestion } = req.body;
        const quiz = await Quiz.create({
            title,
            description,
            questions,
            timePerQuestion,
            creator: req.user._id
        });
        res.status(201).json(quiz);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create quiz', error: error.message });
    }
});

// Get all quizzes created by the user
router.get('/my-quizzes', protect, async (req, res) => {
    try {
        const quizzes = await Quiz.find({ creator: req.user._id })
            .select('-questions.correctOption')
            .sort('-createdAt');
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch quizzes', error: error.message });
    }
});

// Get user's game history
router.get('/my-game-history', protect, async (req, res) => {
    try {
        // Find games where user is host or participant
        const hostedGames = await GameSession.find({ 
            host: req.user._id,
            status: 'completed'
        }).populate('quiz', 'title description').sort('-endedAt');
        
        // Find games where user participated
        const participatedGames = await GameSession.find({ 
            'participants.username': req.user.username,
            status: 'completed',
            host: { $ne: req.user._id } // exclude games where user is host
        }).populate('quiz', 'title description').sort('-endedAt');
        
        // Process hosted games
        const hostedGameData = hostedGames.map(game => {
            return {
                id: game._id,
                quizTitle: game.quiz.title,
                quizDescription: game.quiz.description,
                date: game.endedAt,
                role: 'host',
                participants: game.participants.length,
                topPerformer: game.participants.sort((a, b) => b.score - a.score)[0]?.username || 'No participants',
                topScore: game.participants.sort((a, b) => b.score - a.score)[0]?.score || 0
            };
        });
        
        // Process participated games
        const participatedGameData = participatedGames.map(game => {
            const userAsParticipant = game.participants.find(p => p.username === req.user.username);
            const userPosition = game.participants.sort((a, b) => b.score - a.score)
                .findIndex(p => p.username === req.user.username) + 1;
            const totalParticipants = game.participants.length;
            
            // Calculate stats
            const correctAnswers = userAsParticipant?.answers?.filter(a => a.isCorrect).length || 0;
            const totalQuestions = userAsParticipant?.answers?.length || 0;
            const accuracy = totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
            
            return {
                id: game._id,
                quizTitle: game.quiz.title,
                quizDescription: game.quiz.description,
                date: game.endedAt,
                role: 'participant',
                score: userAsParticipant?.score || 0,
                position: userPosition,
                totalParticipants,
                accuracy,
                correctAnswers,
                totalQuestions
            };
        });
        
        res.json({
            hostedGames: hostedGameData,
            participatedGames: participatedGameData
        });
    } catch (error) {
        console.error('Error fetching game history:', error);
        res.status(500).json({ message: 'Failed to fetch game history', error: error.message });
    }
});

// Create a game session
router.post('/:quizId/start-game', protect, async (req, res) => {
    try {
        console.log('Starting game for quiz:', req.params.quizId);
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        console.log('Quiz found:', quiz);

        const gameSession = await GameSession.create({
            quiz: quiz._id,
            host: req.user._id,
            status: 'waiting',
            currentQuestion: -1,
            participants: []
        });
        console.log('Game session created:', gameSession);

        res.status(201).json({
            sessionId: gameSession._id,
            code: gameSession.code
        });
    } catch (error) {
        console.error('Error creating game session:', error);
        res.status(500).json({ 
            message: 'Failed to start game', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Join a game session
router.post('/join-game', async (req, res) => {
    try {
        const { code, username } = req.body;
        const gameSession = await GameSession.findOne({ 
            code: code.toUpperCase(),
            status: 'waiting'
        }).populate('quiz', '-questions.correctOption');

        if (!gameSession) {
            return res.status(404).json({ message: 'Game not found or already started' });
        }

        // Check if username is already taken in this session
        if (gameSession.participants.some(p => p.username === username)) {
            return res.status(400).json({ message: 'Username already taken in this game' });
        }

        gameSession.participants.push({ username });
        await gameSession.save();

        res.json({
            sessionId: gameSession._id,
            quiz: gameSession.quiz,
            participants: gameSession.participants.map(p => p.username)
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to join game', error: error.message });
    }
});

// Start the game
router.post('/game/:sessionId/start', protect, async (req, res) => {
    try {
        const gameSession = await GameSession.findById(req.params.sessionId);
        if (!gameSession) {
            return res.status(404).json({ message: 'Game session not found' });
        }

        if (gameSession.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to start this game' });
        }

        gameSession.status = 'playing';
        gameSession.currentQuestion = 0;
        gameSession.startedAt = new Date();
        await gameSession.save();

        res.json({ message: 'Game started' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to start game', error: error.message });
    }
});

// Move to next question
router.post('/game/:sessionId/next-question', protect, async (req, res) => {
    try {
        const { questionIndex } = req.body;
        const gameSession = await GameSession.findById(req.params.sessionId);

        if (!gameSession) {
            return res.status(404).json({ message: 'Game session not found' });
        }

        if (gameSession.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to control this game' });
        }

        gameSession.currentQuestion = questionIndex;
        await gameSession.save();

        res.json({ message: 'Question updated' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update question', error: error.message });
    }
});

// Submit answer
router.post('/game/:sessionId/answer', async (req, res) => {
    try {
        const { username, answer, timeTaken } = req.body;
        const gameSession = await GameSession.findById(req.params.sessionId)
            .populate('quiz', 'questions timePerQuestion'); // Only get needed fields

        if (!gameSession) {
            return res.status(404).json({ message: 'Game session not found' });
        }

        const participant = gameSession.participants.find(p => p.username === username);
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        const currentQuestion = gameSession.quiz.questions[gameSession.currentQuestion];
        // Convert both to numbers to ensure proper comparison
        const isCorrect = Number(answer) === Number(currentQuestion.correctOption);

        // Calculate points based on time taken and correctness
        let pointsEarned = 0;
        if (isCorrect) {
            const maxPoints = currentQuestion.points || 1;
            const timeBonus = Math.max(0, 1 - (timeTaken / gameSession.quiz.timePerQuestion));
            // Base points (50%) + time bonus (up to 50% more)
            pointsEarned = Math.ceil(maxPoints * (0.5 + 0.5 * timeBonus));
        }

        // Record the answer
        participant.answers.push({
            questionIndex: gameSession.currentQuestion,
            selectedOption: answer,
            timeTaken,
            isCorrect,
            pointsEarned
        });

        // Update participant's total score
        participant.score = (participant.score || 0) + pointsEarned;
        await gameSession.save();

        // Emit event to all players with answer result
        req.app.get('io').to(gameSession.code).emit('player-answered', {
            username,
            pointsEarned,
            isCorrect,
            timeTaken
        });

        res.json({ 
            isCorrect,
            pointsEarned,
            totalScore: participant.score
        });
    } catch (error) {
        console.error('Error in submit-answer:', error);
        res.status(500).json({ message: 'Failed to submit answer', error: error.message });
    }
});

// End game
router.post('/game/:sessionId/end', protect, async (req, res) => {
    try {
        const gameSession = await GameSession.findById(req.params.sessionId)
            .populate('quiz');

        if (!gameSession) {
            return res.status(404).json({ message: 'Game session not found' });
        }

        if (gameSession.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to end this game' });
        }

        // Calculate final statistics for each participant
        const finalScores = gameSession.participants.map(participant => {
            const correctAnswers = participant.answers.filter(a => a.isCorrect).length;
            const totalQuestions = gameSession.quiz.questions.length;
            const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
            
            return {
                username: participant.username,
                score: participant.score || 0,
                correctAnswers,
                accuracy,
                totalQuestions
            };
        });

        // Sort by score in descending order
        finalScores.sort((a, b) => b.score - a.score);

        gameSession.status = 'completed';
        gameSession.endedAt = new Date();
        await gameSession.save();

        // Emit final scores to all players
        req.app.get('io').to(gameSession.code).emit('game-over', {
            finalScores
        });

        res.json({ 
            message: 'Game ended',
            finalScores
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to end game', error: error.message });
    }
});

// Get game session status
router.get('/game/:sessionId', async (req, res) => {
    try {
        const gameSession = await GameSession.findById(req.params.sessionId)
            .populate('quiz')
            .select('-quiz.questions.correctOption');
        
        if (!gameSession) {
            return res.status(404).json({ message: 'Game session not found' });
        }

        res.json({
            status: gameSession.status,
            currentQuestion: gameSession.currentQuestion,
            participants: gameSession.participants,
            quiz: gameSession.quiz,
            code: gameSession.code
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get game status', error: error.message });
    }
});

module.exports = router;