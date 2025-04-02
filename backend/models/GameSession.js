const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        default: 0
    },
    answers: [{
        questionIndex: Number,
        selectedOption: Number,
        timeTaken: Number,
        isCorrect: Boolean,
        pointsEarned: Number
    }]
});

const gameSessionSchema = new mongoose.Schema({
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    code: {
        type: String,
        unique: true
    },
    status: {
        type: String,
        enum: ['waiting', 'playing', 'completed'],
        default: 'waiting'
    },
    currentQuestion: {
        type: Number,
        default: -1
    },
    participants: [participantSchema],
    startedAt: Date,
    endedAt: Date
}, {
    timestamps: true
});

// Generate unique game code before saving
gameSessionSchema.pre('validate', function(next) {
    if (this.isNew && !this.code) {
        this.code = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    next();
});

// Calculate points based on time taken
gameSessionSchema.methods.calculatePoints = function(questionIndex, timeTaken, isCorrect) {
    const question = this.quiz.questions[questionIndex];
    if (!isCorrect) return 0;
    
    // If answered correctly, calculate points based on time
    const maxTime = this.quiz.timePerQuestion;
    const timeRatio = Math.max(0, (maxTime - timeTaken) / maxTime);
    const pointRange = question.maxPoints - question.basePoints;
    const points = Math.round(question.basePoints + (pointRange * timeRatio));
    
    return Math.max(question.basePoints, Math.min(question.maxPoints, points));
};

const GameSession = mongoose.model('GameSession', gameSessionSchema);
module.exports = GameSession;