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
    maxPoints: {
        type: Number,
        default: 1000 // maximum points possible for fastest answer
    },
    basePoints: {
        type: Number,
        default: 100 // minimum points for correct answer regardless of time
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
        name: { type: String },
        type: { type: String },
        uploadDate: { type: Date }
    }
}, {
    timestamps: true
});

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;