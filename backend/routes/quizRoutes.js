const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Quiz = require('../models/Quiz');
const GameSession = require('../models/GameSession');
const { upload, extractTextFromDocument, generateQuizFromText } = require('../utils/documentProcessor');

// Create quiz from topic
router.post('/create-from-topic', protect, async (req, res) => {
    try {
        const { title, description, topic, numQuestions = 10, timePerQuestion = 30 } = req.body;
        
        // Generate quiz questions using AI with the topic as content
        const questions = await generateQuizFromText(topic, title, numQuestions);
        
        // Create the quiz in the database
        const quiz = await Quiz.create({
            title: title || `Quiz about ${topic}`,
            description: description || `Automatically generated quiz about ${topic}`,
            questions,
            timePerQuestion,
            creator: req.user._id,
            isAiGenerated: true
        });

        res.status(201).json(quiz);
    } catch (error) {
        console.error('Error creating quiz from topic:', error);
        res.status(500).json({ message: 'Failed to create quiz from topic', error: error.message });
    }
});

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

// Get user's game history
router.get('/my-game-history', protect, async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Find games where user is host or participant
        const hostedGames = await GameSession.find({ 
            host: req.user._id,
            status: 'completed'
        }).populate('quiz', 'title description').sort('-endedAt');
        
        if (!hostedGames) {
            return res.status(500).json({ message: 'Error fetching hosted games' });
        }

        // Find games where user participated
        const participatedGames = await GameSession.find({ 
            'participants.username': req.user.username,
            status: 'completed',
            host: { $ne: req.user._id } // exclude games where user is host
        }).populate('quiz', 'title description').sort('-endedAt');

        if (!participatedGames) {
            return res.status(500).json({ message: 'Error fetching participated games' });
        }
        
        // Process hosted games
        const hostedGameData = hostedGames.map(game => ({
            id: game._id,
            quizTitle: game.quiz?.title || 'Untitled Quiz',
            quizDescription: game.quiz?.description,
            date: game.endedAt,
            role: 'host',
            participants: game.participants?.length || 0
        }));

        // Process participated games
        const participatedGameData = participatedGames.map(game => {
            const userAsParticipant = game.participants.find(p => p.username === req.user.username);
            const sortedParticipants = [...game.participants].sort((a, b) => b.score - a.score);
            const userPosition = sortedParticipants.findIndex(p => p.username === req.user.username) + 1;
            const totalParticipants = game.participants.length;
            
            // Calculate accuracy
            const totalQuestions = game.quiz.questions?.length || 0;
            const correctAnswers = userAsParticipant?.answers?.filter(a => a.isCorrect)?.length || 0;
            const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

            return {
                id: game._id,
                quizTitle: game.quiz?.title || 'Untitled Quiz',
                quizDescription: game.quiz?.description,
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
        res.status(500).json({ 
            message: 'Failed to fetch game history',
            error: error.message 
        });
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

// Get a single quiz by ID
router.get('/:quizId', protect, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        
        // Check if user is authorized to view this quiz
        if (quiz.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this quiz' });
        }
        
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch quiz', error: error.message });
    }
});

// Update a quiz
router.put('/:quizId', protect, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        // Check if user is authorized to update this quiz
        if (quiz.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this quiz' });
        }

        const { title, description, questions, timePerQuestion } = req.body;
        
        // Validate quiz format if questions are being updated
        if (questions) {
            const isValidQuiz = questions.every(q => 
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
        }

        const updatedQuiz = await Quiz.findByIdAndUpdate(
            req.params.quizId,
            { 
                title, 
                description, 
                questions, 
                timePerQuestion,
                updatedAt: new Date()
            },
            { new: true }
        );

        res.json(updatedQuiz);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update quiz', error: error.message });
    }
});

// Delete a quiz
router.delete('/:quizId', protect, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        // Check if user is authorized to delete this quiz
        if (quiz.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this quiz' });
        }

        // Delete the quiz
        await Quiz.findByIdAndDelete(req.params.quizId);
        
        // Also delete any associated game sessions
        await GameSession.deleteMany({ quiz: req.params.quizId });

        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete quiz', error: error.message });
    }
});

// Get quiz statistics
router.get('/:quizId/stats', protect, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        // Check if user is authorized to view this quiz's stats
        if (quiz.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view these statistics' });
        }

        // Get all completed game sessions for this quiz
        const gameSessions = await GameSession.find({
            quiz: req.params.quizId,
            status: 'completed'
        });

        // Calculate statistics
        const totalGames = gameSessions.length;
        const totalParticipants = gameSessions.reduce((sum, game) => sum + game.participants.length, 0);
        
        // Calculate average score and accuracy
        let totalScore = 0;
        let totalCorrectAnswers = 0;
        let totalAnswers = 0;

        gameSessions.forEach(game => {
            game.participants.forEach(participant => {
                totalScore += participant.score || 0;
                const correctAnswers = participant.answers.filter(a => a.isCorrect).length;
                totalCorrectAnswers += correctAnswers;
                totalAnswers += participant.answers.length;
            });
        });

        const averageScore = totalParticipants ? (totalScore / totalParticipants).toFixed(2) : 0;
        const averageAccuracy = totalAnswers ? ((totalCorrectAnswers / totalAnswers) * 100).toFixed(2) : 0;

        // Get question-specific statistics
        const questionStats = quiz.questions.map((_, index) => {
            let correct = 0;
            let total = 0;

            gameSessions.forEach(game => {
                game.participants.forEach(participant => {
                    const answer = participant.answers.find(a => a.questionIndex === index);
                    if (answer) {
                        total++;
                        if (answer.isCorrect) correct++;
                    }
                });
            });

            return {
                questionNumber: index + 1,
                correctPercentage: total ? ((correct / total) * 100).toFixed(2) : 0,
                totalAttempts: total
            };
        });

        res.json({
            totalGames,
            totalParticipants,
            averageScore,
            averageAccuracy,
            questionStats,
            lastPlayed: gameSessions.length > 0 ? 
                gameSessions.sort((a, b) => b.endedAt - a.endedAt)[0].endedAt : 
                null
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch quiz statistics', error: error.message });
    }
});

// Duplicate a quiz
router.post('/:quizId/duplicate', protect, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        // Create a new quiz with the same content
        const newQuiz = await Quiz.create({
            title: `${quiz.title} (Copy)`,
            description: quiz.description,
            questions: quiz.questions,
            timePerQuestion: quiz.timePerQuestion,
            creator: req.user._id,
            isAiGenerated: quiz.isAiGenerated,
            sourceDocument: quiz.sourceDocument
        });

        res.status(201).json(newQuiz);
    } catch (error) {
        res.status(500).json({ message: 'Failed to duplicate quiz', error: error.message });
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
            .populate('quiz', 'questions timePerQuestion');

        if (!gameSession) {
            return res.status(404).json({ message: 'Game session not found' });
        }

        const participant = gameSession.participants.find(p => p.username === username);
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        const currentQuestion = gameSession.quiz.questions[gameSession.currentQuestion];
        const isCorrect = Number(answer) === Number(currentQuestion.correctOption);
        const pointsEarned = gameSession.calculatePoints(gameSession.currentQuestion, timeTaken, isCorrect);

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

        // Emit event to all players WITHOUT correctness info
        req.app.get('io').to(gameSession.code).emit('player-answered', {
            username,
            timeTaken
        });

        // Return minimal response without correctness info
        res.json({ 
            submitted: true,
            timeTaken
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
        // Only send correctOption and scores in completed state
        const gameSession = await GameSession.findById(req.params.sessionId)
            .populate('quiz');
        
        if (!gameSession) {
            return res.status(404).json({ message: 'Game session not found' });
        }

        // Only send scores and correctness info if game is completed
        const response = {
            status: gameSession.status,
            currentQuestion: gameSession.currentQuestion,
            code: gameSession.code,
            quiz: {
                ...gameSession.quiz.toObject(),
                questions: gameSession.quiz.questions.map(q => ({
                    question: q.question,
                    options: q.options,
                    maxPoints: q.maxPoints,
                    basePoints: q.basePoints
                }))
            },
            participants: gameSession.status === 'completed' 
                ? gameSession.participants
                : gameSession.participants.map(p => ({

                    username: p.username,
                    answers: p.answers.map(a => ({
                        questionIndex: a.questionIndex,
                        selectedOption: a.selectedOption,
                        timeTaken: a.timeTaken
                    }))
                }))
        };

        res.json(response);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get game status', error: error.message });
    }
});

module.exports = router;