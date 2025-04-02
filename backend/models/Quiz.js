const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    options: [{
        type: String,
        required: true
    }],
    correctOption: {
        type: Number,
        required: true
    },
    points: {
        type: Number,
        default: 1
    }
});

const quizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    questions: [questionSchema],
    timePerQuestion: {
        type: Number,
        default: 20 // seconds
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isAiGenerated: {
        type: Boolean,
        default: false
    },
    sourceDocument: {
        name: String,
        type: String,
        uploadDate: Date
    }
}, {
    timestamps: true
});

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;