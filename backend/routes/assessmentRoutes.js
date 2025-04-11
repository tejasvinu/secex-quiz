const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Assessment = require('../models/Assessment');

// Create a new assessment
router.post('/', protect, async (req, res) => {
    try {
        const { title, description, questions, assessmentType, timeLimit, passingScore } = req.body;

        // Basic validation
        if (!title || !description || !questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ 
                message: 'Invalid assessment data. Title, description, and at least one question are required.' 
            });
        }

        // Validate questions
        for (const question of questions) {
            if (!question.question || !question.options || !Array.isArray(question.options)) {
                return res.status(400).json({ 
                    message: 'Each question must have question text and options array' 
                });
            }

            if (assessmentType === 'quiz' && question.correctOption === null) {
                return res.status(400).json({ 
                    message: 'Quiz questions must have a correct option selected' 
                });
            }

            // Validate that all options are non-empty strings
            if (question.options.some(opt => typeof opt !== 'string' || !opt.trim())) {
                return res.status(400).json({ 
                    message: 'All options must be non-empty strings' 
                });
            }
        }

        const assessment = await Assessment.create({
            title,
            description,
            questions,
            assessmentType,
            timeLimit,
            passingScore,
            creator: req.user._id
        });

        res.status(201).json(assessment);
    } catch (error) {
        console.error('Assessment creation error:', error);
        res.status(500).json({ message: 'Failed to create assessment', error: error.message });
    }
});

// Get all assessments for a user
router.get('/my-assessments', protect, async (req, res) => {
    try {
        const assessments = await Assessment.find({ creator: req.user._id });
        res.json(assessments);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch assessments', error: error.message });
    }
});

// Get a specific assessment
router.get('/:id', async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }
        res.json(assessment);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch assessment', error: error.message });
    }
});

// Calculate score for quiz-type questions
const calculateScore = (questions, answers) => {
    let totalScore = 0;
    answers.forEach(answer => {
        const question = questions[answer.questionIndex];
        if (question.questionType === 'quiz') {
            answer.isCorrect = answer.selectedOption === question.correctOption;
            answer.points = answer.isCorrect ? question.points : 0;
            totalScore += answer.points;
        }
    });
    return totalScore;
};

// Submit a response to an assessment
router.post('/:id/submit', async (req, res) => {
    try {
        const { 
            participantName, 
            participantEmail, 
            participantDepartment,
            participantDesignation,
            responses, 
            additionalFeedback,
            answers,
            experience 
        } = req.body;
        
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        let score = null;
        if (assessment.assessmentType !== 'survey') {
            score = calculateScore(assessment.questions, answers);
        }

        // For quiz or mixed type assessments
        if (answers) {
            const result = {
                participant: {
                    name: participantName,
                    email: participantEmail,
                    department: participantDepartment,
                    designation: participantDesignation,
                    experience: experience
                },
                answers,
                totalScore: score,
                feedback: req.body.feedback,
                completedAt: new Date()
            };
            assessment.results.push(result);
        }

        // For survey or mixed type assessments
        if (responses) {
            assessment.responses.push({
                participantName,
                participantEmail,
                participantDepartment,
                participantDesignation,
                responses,
                additionalFeedback,
                score,
                submittedAt: new Date()
            });
        }

        await assessment.save();
        res.status(201).json({ 
            message: 'Response submitted successfully',
            score: score
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to submit response', error: error.message });
    }
});

// Get assessment results
router.get('/:id/results', protect, async (req, res) => {
    try {
        const assessment = await Assessment.findOne({ 
            _id: req.params.id,
            creator: req.user._id
        });

        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Send full assessment data including title, description, questions, etc.
        const results = {
            ...assessment.toObject(),
            responses: assessment.responses,
            results: assessment.results
        };

        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch results', error: error.message });
    }
});

// Toggle assessment status (enable/disable)
router.patch('/:id/toggle-status', protect, async (req, res) => {
    try {
        const assessment = await Assessment.findOne({ 
            _id: req.params.id,
            creator: req.user._id
        });

        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        assessment.isActive = !assessment.isActive;
        await assessment.save();

        res.json({ 
            message: `Assessment ${assessment.isActive ? 'enabled' : 'disabled'} successfully`,
            isActive: assessment.isActive 
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to toggle assessment status', error: error.message });
    }
});

// Update an existing assessment
router.put('/:id', protect, async (req, res) => {
    try {
        const { title, description, questions, assessmentType, timeLimit, passingScore } = req.body;

        // Find the assessment by ID and ensure it belongs to the logged-in user
        const assessment = await Assessment.findOne({ _id: req.params.id, creator: req.user._id });

        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Update the assessment fields
        assessment.title = title || assessment.title;
        assessment.description = description || assessment.description;
        assessment.questions = questions || assessment.questions;
        assessment.assessmentType = assessmentType || assessment.assessmentType;
        assessment.timeLimit = timeLimit || assessment.timeLimit;
        assessment.passingScore = passingScore || assessment.passingScore;

        await assessment.save();

        res.json({ message: 'Assessment updated successfully', assessment });
    } catch (error) {
        console.error('Failed to update assessment:', error);
        res.status(500).json({ message: 'Failed to update assessment', error: error.message });
    }
});

module.exports = router;