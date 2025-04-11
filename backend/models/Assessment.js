const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    question: String,
    response: String,
    comments: String,
    isCorrect: Boolean,
    points: Number,
    centre: String
});

const surveyResponseSchema = new mongoose.Schema({
    participantName: String,
    participantEmail: String,
    participantDepartment: String,
    participantDesignation: String,
    participantCentre: String,
    responses: [responseSchema],
    additionalFeedback: String,
    score: Number,
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    questionType: {
        type: String,
        enum: ['quiz', 'survey'],
        required: true
    },
    options: {
        type: [String],
        required: true
    },
    correctOption: {
        type: Number,
        required: function() {
            return this.questionType === 'quiz';
        }
    },
    points: {
        type: Number,
        default: function() {
            return this.questionType === 'quiz' ? 1 : 0;
        }
    },
    allowComments: {
        type: Boolean,
        default: true
    }
});

const feedbackSchema = new mongoose.Schema({
    difficulty: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    clarity: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    relevance: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comments: String
});

const assessmentResultSchema = new mongoose.Schema({
    participant: {
        name: String,
        email: String,
        department: String,
        designation: String,
        centre: String,
        experience: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert']
        }
    },
    answers: [{
        questionIndex: Number,
        selectedOption: Number,
        isCorrect: Boolean,
        points: Number
    }],
    totalScore: {
        type: Number,
        default: 0
    },
    feedback: feedbackSchema,
    completedAt: Date
}, {
    timestamps: true
});

const assessmentSchema = new mongoose.Schema({
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
    assessmentType: {
        type: String,
        enum: ['quiz', 'survey', 'mixed'],
        required: true,
        default: 'survey'
    },
    questions: [questionSchema],
    responses: [surveyResponseSchema],
    results: [assessmentResultSchema],
    timeLimit: {
        type: Number,
        default: null // null means no time limit
    },
    passingScore: {
        type: Number,
        default: null // null means no passing score required
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Assessment = mongoose.model('Assessment', assessmentSchema);
module.exports = Assessment;