const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    question: String,
    response: String,
    comments: String
});

const surveyResponseSchema = new mongoose.Schema({
    participantName: String,
    participantEmail: String,
    participantDepartment: String,
    responses: [responseSchema],
    additionalFeedback: String,
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
    options: {
        type: [String],
        default: ['No', 'Little', 'Somewhat', 'Mostly', 'Completely']
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
        experience: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert']
        }
    },
    answers: [{
        questionIndex: Number,
        selectedOption: Number
    }],
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
    questions: [questionSchema],
    responses: [surveyResponseSchema],
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