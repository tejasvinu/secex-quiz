const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Assessment = require('../models/Assessment');

// Create a new assessment
router.post('/', protect, async (req, res) => {
    try {
        const { title, description, questions } = req.body;
        const assessment = await Assessment.create({
            title,
            description,
            questions,
            creator: req.user._id
        });
        res.status(201).json(assessment);
    } catch (error) {
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

// Submit a response to an assessment
router.post('/:id/submit', async (req, res) => {
    try {
        const { participantName, participantEmail, participantDepartment, responses, additionalFeedback } = req.body;
        
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        assessment.responses.push({
            participantName,
            participantEmail,
            participantDepartment,
            responses,
            additionalFeedback
        });

        await assessment.save();
        res.status(201).json({ message: 'Response submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to submit response', error: error.message });
    }
});

module.exports = router;