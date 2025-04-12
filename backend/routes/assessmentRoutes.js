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
    let totalPossibleScore = 0;
    
    answers.forEach((answer, index) => {
        const question = questions[index];
        if (!question) return;
        
        answer.isCorrect = answer.selectedOption === question.correctOption;
        answer.points = answer.isCorrect ? question.points : 0;
        totalScore += answer.points;
        totalPossibleScore += question.points;
    });

    // Convert to percentage
    return totalPossibleScore > 0 ? Math.round((totalScore / totalPossibleScore) * 100) : 0;
};

// Submit a response to an assessment
router.post('/:id/submit', async (req, res) => {
    try {
        const { 
            participantName, 
            participantEmail, 
            participantDepartment, 
            participantDesignation,
            participantCentre,
            experience,
            responses,
            answers,
            additionalFeedback 
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
                    centre: participantCentre,
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
                participantCentre,
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
        const { title, description } = req.body;

        // Find the assessment by ID and ensure it belongs to the logged-in user
        const assessment = await Assessment.findOne({ _id: req.params.id, creator: req.user._id });

        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Only update title and description
        if (title) assessment.title = title;
        if (description) assessment.description = description;

        await assessment.save();

        res.json({ message: 'Assessment updated successfully', assessment });
    } catch (error) {
        console.error('Failed to update assessment:', error);
        res.status(500).json({ message: 'Failed to update assessment', error: error.message });
    }
});

// Get assessment analytics
router.get('/:id/analytics', protect, async (req, res) => {
    try {
        const assessment = await Assessment.findOne({ 
            _id: req.params.id,
            creator: req.user._id
        });

        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Initialize analytics object
        const analytics = {
            centreStats: {},
            departmentStats: {},
            experienceStats: {},
            timeStats: {
                hourly: {},
                daily: {},
                monthly: {}
            },
            totalResponses: 0
        };

        // Combined responses from both survey responses and quiz results
        const allResponses = [
            ...assessment.responses.map(r => ({
                centre: r.participantCentre,
                department: r.participantDepartment,
                submittedAt: r.submittedAt,
                type: 'survey'
            })),
            ...assessment.results.map(r => ({
                centre: r.participant.centre,
                department: r.participant.department,
                experience: r.participant.experience,
                submittedAt: r.completedAt,
                score: r.totalScore,
                type: 'quiz'
            }))
        ];

        analytics.totalResponses = allResponses.length;

        // Process centre statistics
        allResponses.forEach(response => {
            if (response.centre) {
                analytics.centreStats[response.centre] = analytics.centreStats[response.centre] || {
                    count: 0,
                    avgScore: 0,
                    totalScore: 0,
                    responses: 0
                };
                analytics.centreStats[response.centre].count++;
                if (response.score !== undefined) {
                    analytics.centreStats[response.centre].totalScore += response.score;
                    analytics.centreStats[response.centre].responses++;
                }
            }

            if (response.department) {
                analytics.departmentStats[response.department] = analytics.departmentStats[response.department] || {
                    count: 0,
                    avgScore: 0,
                    totalScore: 0,
                    responses: 0
                };
                analytics.departmentStats[response.department].count++;
                if (response.score !== undefined) {
                    analytics.departmentStats[response.department].totalScore += response.score;
                    analytics.departmentStats[response.department].responses++;
                }
            }

            if (response.experience) {
                analytics.experienceStats[response.experience] = analytics.experienceStats[response.experience] || {
                    count: 0,
                    avgScore: 0,
                    totalScore: 0,
                    responses: 0
                };
                analytics.experienceStats[response.experience].count++;
                if (response.score !== undefined) {
                    analytics.experienceStats[response.experience].totalScore += response.score;
                    analytics.experienceStats[response.experience].responses++;
                }
            }

            // Process time-based statistics
            const date = new Date(response.submittedAt);
            const hour = date.getHours();
            const day = date.toLocaleDateString();
            const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });

            analytics.timeStats.hourly[hour] = (analytics.timeStats.hourly[hour] || 0) + 1;
            analytics.timeStats.daily[day] = (analytics.timeStats.daily[day] || 0) + 1;
            analytics.timeStats.monthly[month] = (analytics.timeStats.monthly[month] || 0) + 1;
        });

        // Calculate averages for centres and departments
        Object.values(analytics.centreStats).forEach(stat => {
            if (stat.responses > 0) {
                stat.avgScore = Math.round(stat.totalScore / stat.responses);
            }
        });

        Object.values(analytics.departmentStats).forEach(stat => {
            if (stat.responses > 0) {
                stat.avgScore = Math.round(stat.totalScore / stat.responses);
            }
        });

        Object.values(analytics.experienceStats).forEach(stat => {
            if (stat.responses > 0) {
                stat.avgScore = Math.round(stat.totalScore / stat.responses);
            }
        });

        res.json(analytics);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
    }
});

module.exports = router;