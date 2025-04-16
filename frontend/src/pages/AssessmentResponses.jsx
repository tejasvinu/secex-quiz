import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Navigation from '../components/Navigation';
import AnalyticsSection from '../components/AnalyticsSection';
import { 
    UserCircleIcon, 
    ChatBubbleLeftEllipsisIcon, 
    CheckCircleIcon, 
    ArrowDownTrayIcon,
    BuildingOfficeIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { normalizeCentreName, getStandardizedCenterName } from '../utils/helpers'; // Import helpers

export default function AssessmentResponses() {
    const { id } = useParams();
    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
    const [centerFilter, setCenterFilter] = useState('');
    
    // New state for managing responses
    const [editResponseId, setEditResponseId] = useState(null);
    const [editingResponse, setEditingResponse] = useState(null);
    const [editResultId, setEditResultId] = useState(null);
    const [editingResult, setEditingResult] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteItemId, setDeleteItemId] = useState(null);
    const [deleteItemType, setDeleteItemType] = useState(null);
    const modalRef = useRef(null);

    useEffect(() => {
        fetchAssessment();
    }, [id]);

    // Sort function for responses/results
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };    // Get all available centers for filtering
    const availableCenters = useMemo(() => {
        if (!assessment) return [];
        
        // Use a Map to track normalized keys and their display names
        const centerMap = new Map();
        
        if (assessment.assessmentType === 'survey') {
            assessment.responses.forEach(response => {
                if (response.participantCentre) {
                    const normalizedKey = normalizeCentreName(response.participantCentre);
                    centerMap.set(normalizedKey, getStandardizedCenterName(response.participantCentre));
                }
            });
        } else {
            assessment.results.forEach(result => {
                if (result.participant.centre) {
                    const normalizedKey = normalizeCentreName(result.participant.centre);
                    centerMap.set(normalizedKey, getStandardizedCenterName(result.participant.centre));
                }
            });
        }
        
        // Get unique keys sorted alphabetically
        const normalizedKeys = Array.from(centerMap.keys()).sort();
        
        return normalizedKeys;
    }, [assessment]);

    // Get sorted and filtered responses/results
    const sortedResponses = useMemo(() => {
        if (!assessment) return [];
        
        let items = [];
        if (assessment.assessmentType === 'survey') {
            items = [...assessment.responses];
        } else {
            items = [...assessment.results];
        }
          // Apply center filter using normalized names
        if (centerFilter) {
            items = items.filter(item => {
                const center = assessment.assessmentType === 'survey' 
                    ? item.participantCentre 
                    : item.participant.centre;
                // Compare using our normalization function for case-insensitive matching
                return center && normalizeCentreName(center) === centerFilter;
            });
        }
        
        // Apply sorting
        return items.sort((a, b) => {
            let aValue, bValue;
            
            if (sortConfig.key === 'name') {
                aValue = assessment.assessmentType === 'survey' ? a.participantName : a.participant.name;
                bValue = assessment.assessmentType === 'survey' ? b.participantName : b.participant.name;
            } else if (sortConfig.key === 'score') {
                if (assessment.assessmentType === 'survey') return 0; // No sorting by score for surveys
                aValue = a.totalScore;
                bValue = b.totalScore;
            } else if (sortConfig.key === 'centre') {
                aValue = assessment.assessmentType === 'survey' ? a.participantCentre : a.participant.centre;
                bValue = assessment.assessmentType === 'survey' ? b.participantCentre : b.participant.centre;
                // Convert to lowercase for case-insensitive sorting
                aValue = aValue ? aValue.toLowerCase() : '';
                bValue = bValue ? bValue.toLowerCase() : '';
            }
            
            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }, [assessment, sortConfig, centerFilter]);    // Calculate center-specific statistics
    const centerStats = useMemo(() => {
        if (!assessment) return [];
        
        const stats = {}; // Use an object for efficient lookup by normalized key
        
        if (assessment.assessmentType !== 'survey') {
            assessment.results.forEach(result => {
                const originalCentreName = result.participant.centre || 'Unspecified';
                // Use the robust normalization function
                const centreKey = normalizeCentreName(originalCentreName); 
                
                if (!stats[centreKey]) {
                    stats[centreKey] = {
                        nameKey: centreKey, 
                        // Store a standardized display name for consistent UI presentation
                        displayName: getStandardizedCenterName(originalCentreName),
                        count: 0,
                        totalScore: 0,
                        highestScore: 0,
                        participants: []
                    };
                }
                
                // Update stats for the normalized key
                stats[centreKey].count++;
                stats[centreKey].totalScore += result.totalScore;
                stats[centreKey].highestScore = Math.max(stats[centreKey].highestScore, result.totalScore);
                stats[centreKey].participants.push({
                    name: result.participant.name,
                    score: result.totalScore
                });
            });
            
            Object.values(stats).forEach(centreStat => {
                centreStat.avgScore = Math.round(centreStat.totalScore / centreStat.count);
            });
        } else {
            assessment.responses.forEach(response => {
                const originalCentreName = response.participantCentre || 'Unspecified';
                // Use the robust normalization function
                const centreKey = normalizeCentreName(originalCentreName);
                
                if (!stats[centreKey]) {
                    stats[centreKey] = {
                        nameKey: centreKey, 
                        originalDisplayName: originalCentreName,
                        count: 0,
                        participants: []
                    };
                }
                
                // Update stats for the normalized key
                stats[centreKey].count++;
                stats[centreKey].participants.push({
                    name: response.participantName
                });
            });
        }
        
        // Sort the results based on assessment type and nameKey
        return Object.values(stats).sort((a, b) => {
            if (assessment.assessmentType === 'survey') {
                if (b.count !== a.count) return b.count - a.count;
            } else {
                if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
            }
            return (a.nameKey || '').localeCompare((b.nameKey || ''));
        });
    }, [assessment]);

    // Get a random color based on centre name for consistent coloring
    const getCentreColor = (centre) => {
        const safeCentre = centre || ''; // Ensure centre is not null/undefined
        if (!safeCentre) return 'bg-gray-200 text-gray-700';
        
        const colors = [
            'bg-blue-100 text-blue-700',
            'bg-green-100 text-green-700',
            'bg-yellow-100 text-yellow-700',
            'bg-purple-100 text-purple-700',
            'bg-pink-100 text-pink-700',
            'bg-indigo-100 text-indigo-700',
            'bg-teal-100 text-teal-700',
            'bg-orange-100 text-orange-700',
        ];
        
        // Simple hash function to get consistent colors for the same centre
        const hash = safeCentre.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    const fetchAssessment = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const response = await axios.get(
                `${import.meta.env.VITE_API_URL}/api/assessment/${id}/results`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setAssessment(response.data);
        } catch (error) {
            console.error('Failed to fetch assessment:', error);
        } finally {
            setLoading(false);
        }
    };    const calculateResponseStats = (questionIndex, centerName = null) => {
        if (!assessment) return []; // Added check for assessment

        // Normalize the filter center name if provided
        const normalizedFilterCenter = centerName ? normalizeCentreName(centerName) : null;

        if (assessment.assessmentType === 'survey') {
            // Filter responses by normalized center name if provided
            const filteredResponses = normalizedFilterCenter
                ? assessment.responses.filter(r => normalizeCentreName(r.participantCentre) === normalizedFilterCenter)
                : assessment.responses;
                
            const responses = filteredResponses.map(r => r.responses[questionIndex]?.response);
            const totalResponses = responses.filter(r => r).length;
            const stats = {};
            
            responses.forEach(response => {
                if (response) {
                    stats[response] = (stats[response] || 0) + 1;
                }
            });

            const options = assessment.questions[questionIndex].options;
            return options.map(option => ({
                option,
                count: stats[option] || 0,
                percentage: totalResponses ? Math.round((stats[option] || 0) / totalResponses * 100) : 0
            }));
        } else {
            // Filter results by normalized center name if provided
            const filteredResults = normalizedFilterCenter
                ? assessment.results.filter(r => normalizeCentreName(r.participant.centre) === normalizedFilterCenter)
                : assessment.results;
                
            const answers = filteredResults.map(r => r.answers[questionIndex]);
            const totalAnswers = answers.length;
            const correctAnswers = answers.filter(a => a?.isCorrect).length;
            const incorrectAnswers = answers.filter(a => a?.isCorrect === false).length;

            return [
                {
                    option: 'Correct',
                    count: correctAnswers,
                    percentage: totalAnswers ? Math.round((correctAnswers / totalAnswers) * 100) : 0
                },
                {
                    option: 'Incorrect',
                    count: incorrectAnswers,
                    percentage: totalAnswers ? Math.round((incorrectAnswers / totalAnswers) * 100) : 0
                }
            ];
        }
    };

    const calculateAvgScore = () => {
        if (!assessment.results?.length) return 0;
        const totalScore = assessment.results.reduce((sum, result) => sum + result.totalScore, 0);
        return Math.round(totalScore / assessment.results.length);
    };    const responseColors = {
        'No': 'bg-red-400 bg-opacity-90',
        'Little': 'bg-orange-400 bg-opacity-90',
        'Somewhat': 'bg-yellow-400 bg-opacity-90',
        'Mostly': 'bg-emerald-400 bg-opacity-90',
        'Completely': 'bg-green-400 bg-opacity-90',
        'Correct': 'bg-green-400 bg-opacity-90',
        'Incorrect': 'bg-red-400 bg-opacity-90'
    };    const sentimentLabels = {
        'No': 'Very Negative (1)',
        'Little': 'Negative (2)',
        'Somewhat': 'Neutral (3)',
        'Mostly': 'Positive (4)',
        'Completely': 'Very Positive (5)'
    };

    // Calculate weighted average score for Likert scale responses
    const calculateLikertScore = (stats) => {
        const weights = {
            'No': 1,
            'Little': 2,
            'Somewhat': 3,
            'Mostly': 4,
            'Completely': 5
        };
        
        let totalWeightedScore = 0;
        let totalResponses = 0;
        
        stats.forEach(stat => {
            if (weights[stat.option]) {
                totalWeightedScore += weights[stat.option] * stat.count;
                totalResponses += stat.count;
            }
        });
        
        return totalResponses ? (totalWeightedScore / totalResponses).toFixed(2) : 0;
    };

    // Calculate overall survey engagement metrics
    const calculateSurveyMetrics = useMemo(() => {
        if (!assessment || assessment.assessmentType !== 'survey') return null;

        const metrics = {
            totalResponses: assessment.responses.length,
            averageCompletionRate: 0,
            commentRate: 0,
            averageLikertScore: 0,
            questionScores: []
        };

        if (metrics.totalResponses === 0) return metrics;

        // Calculate completion and comment rates
        let totalQuestionResponses = 0;
        let totalPossibleResponses = metrics.totalResponses * assessment.questions.length;
        let totalComments = 0;
        let totalPossibleComments = 0;

        assessment.questions.forEach((question, index) => {
            const stats = calculateResponseStats(index);
            const questionResponses = stats.reduce((sum, stat) => sum + stat.count, 0);
            totalQuestionResponses += questionResponses;
            
            const likertScore = calculateLikertScore(stats);
            metrics.questionScores.push({
                question: question.question,
                likertScore: parseFloat(likertScore),
                responseRate: (questionResponses / metrics.totalResponses) * 100
            });

            if (question.allowComments) {
                totalPossibleComments += metrics.totalResponses;
                totalComments += assessment.responses.filter(r => r.responses[index]?.comments).length;
            }
        });

        metrics.averageCompletionRate = (totalQuestionResponses / totalPossibleResponses) * 100;
        metrics.commentRate = totalPossibleComments ? (totalComments / totalPossibleComments) * 100 : 0;
        metrics.averageLikertScore = metrics.questionScores.reduce((sum, q) => sum + q.likertScore, 0) / assessment.questions.length;

        return metrics;
    }, [assessment]);

    // Analysis of response patterns by center
    const analyzeCenterPatterns = useMemo(() => {
        if (!assessment || assessment.assessmentType !== 'survey' || !centerStats.length) return [];

        return centerStats.map(center => {
            const centerMetrics = {
                centerName: center.displayName,
                responseCount: center.count,
                averageLikertScore: 0,
                questionScores: []
            };

            assessment.questions.forEach((question, index) => {
                const stats = calculateResponseStats(index, center.nameKey);
                const likertScore = calculateLikertScore(stats);
                centerMetrics.questionScores.push({
                    question: question.question,
                    likertScore: parseFloat(likertScore)
                });
            });

            centerMetrics.averageLikertScore = centerMetrics.questionScores.reduce((sum, q) => sum + q.likertScore, 0) / assessment.questions.length;
            return centerMetrics;
        });
    }, [assessment, centerStats]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
                    <LoadingSpinner size="large" />
                </div>
            </div>
        );
    }

    if (!assessment) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
                    <p className="text-red-600">Assessment not found</p>
                </div>
            </div>
        );
    }

    const downloadSubmissions = () => {
        // Prepare CSV data with detailed headers
        const headers = [
            'Name', 'Email', 'Department', 'Designation', 'Centre', 
            'Experience Level', 'Score', 'Submission Date', 'Additional Feedback'
        ];

        if (assessment.assessmentType === 'survey') {
            // Add question headers dynamically
            assessment.questions.forEach((q, index) => {
                headers.push(`Q${index + 1} Response`);
                headers.push(`Q${index + 1} Comments`);
            });
        } else {
            // Add quiz-specific question headers
            assessment.questions.forEach((q, index) => {
                headers.push(`Q${index + 1} Selected Answer`);
                headers.push(`Q${index + 1} Correct?`);
                headers.push(`Q${index + 1} Points`);
            });
        }

        const csvRows = [headers];

        if (assessment.assessmentType === 'survey') {
            assessment.responses.forEach(response => {
                const row = [
                    response.participantName || '',
                    response.participantEmail || '',
                    response.participantDepartment || '',
                    response.participantDesignation || '',
                    response.participantCentre || '',
                    'N/A', // Experience not applicable for surveys
                    'N/A', // Score not applicable for surveys
                    new Date(response.submittedAt).toLocaleString(),
                    response.additionalFeedback || ''
                ];

                // Add response details for each question
                response.responses.forEach(ans => {
                    row.push(ans.response || '');
                    row.push(ans.comments || '');
                });

                csvRows.push(row);
            });
        } else {
            assessment.results.forEach(result => {
                const row = [
                    result.participant.name || '',
                    result.participant.email || '',
                    result.participant.department || '',
                    result.participant.designation || '',
                    result.participant.centre || '',
                    result.participant.experience || '',
                    `${result.totalScore}%`,
                    new Date(result.completedAt).toLocaleString(),
                    'N/A' // Additional feedback not applicable for quizzes
                ];

                // Add answer details for each question
                result.answers.forEach(ans => {
                    row.push(assessment.questions[ans.questionIndex]?.options[ans.selectedOption] || '');
                    row.push(ans.isCorrect ? 'Yes' : 'No');
                    row.push(ans.points);
                });

                csvRows.push(row);
            });
        }

        // Convert to CSV string
        const csvContent = csvRows
            .map(row => row.map(cell => `"${cell || ''}"`).join(','))
            .join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${assessment.title} - Detailed Submissions.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Function to generate and download center-specific report
    const downloadCenterReport = (centerName) => { // centerName here is the normalized (lowercase) key
        if (!assessment) return;
        
        // Use the standardized display name for the report title
        const displayCenterName = getStandardizedCenterName(centerName);

        let headers = [];
        const csvRows = [];
        
        if (assessment.assessmentType === 'survey') {
            headers = ['Question', ...assessment.questions[0].options, 'Total Responses']; // Assuming all questions have same options
            csvRows.push(headers);

            assessment.questions.forEach((question, index) => {
                const stats = calculateResponseStats(index, centerName);
                const row = [question.question];
                let totalCount = 0;
                
                // Ensure stats match the order of options in the header
                assessment.questions[0].options.forEach(option => {
                    const stat = stats.find(s => s.option === option);
                    const count = stat ? stat.count : 0;
                    row.push(count);
                    totalCount += count;
                });
                row.push(totalCount); // Add total responses for this question in this center
                csvRows.push(row);
            });

        } else { // Existing logic for quiz
            headers = ['Question', 'Correct Answers', 'Incorrect Answers', 'Percentage Correct'];
            csvRows.push(headers);
            
            // For each question, calculate stats for the specified center (using the normalized key)
            assessment.questions.forEach((question, index) => {
                // Pass the normalized centerName to calculateResponseStats
                const stats = calculateResponseStats(index, centerName); 
                const correctStat = stats.find(s => s.option === 'Correct') || { count: 0, percentage: 0 };
                const incorrectStat = stats.find(s => s.option === 'Incorrect') || { count: 0, percentage: 0 };
                
                csvRows.push([
                    question.question,
                    correctStat.count,
                    incorrectStat.count,
                    `${correctStat.percentage}%`
                ]);
            });
        }
        
        // Convert to CSV
        const csvContent = csvRows
            .map(row => row.map(cell => `"${cell || ''}"`).join(','))
            .join('\\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${assessment.title} - ${displayCenterName} Report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Handler to start editing a response
    const handleEditResponse = (response) => {
        setEditResponseId(response._id);
        setEditingResponse({...response});
        setIsEditing(true);
    };

    // Handler to start editing a quiz result
    const handleEditResult = (result) => {
        setEditResultId(result._id);
        setEditingResult({...result});
        setIsEditing(true);
    };

    // Save edited response
    const saveResponseChanges = async () => {
        setIsSaving(true);
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            await axios.put(
                `${import.meta.env.VITE_API_URL}/api/assessment/${id}/responses/${editResponseId}`,
                editingResponse,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            // Update the assessment state
            setAssessment(prev => {
                const updatedResponses = prev.responses.map(response => 
                    response._id === editResponseId ? editingResponse : response
                );
                return {...prev, responses: updatedResponses};
            });
            
            setIsEditing(false);
            setEditResponseId(null);
            setEditingResponse(null);
            toast.success('Response updated successfully');
        } catch (error) {
            console.error('Failed to update response:', error);
            toast.error('Failed to update response');
        } finally {
            setIsSaving(false);
        }
    };

    // Save edited quiz result
    const saveResultChanges = async () => {
        setIsSaving(true);
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            await axios.put(
                `${import.meta.env.VITE_API_URL}/api/assessment/${id}/results/${editResultId}`,
                editingResult,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            // Update the assessment state
            setAssessment(prev => {
                const updatedResults = prev.results.map(result => 
                    result._id === editResultId ? editingResult : result
                );
                return {...prev, results: updatedResults};
            });
            
            setIsEditing(false);
            setEditResultId(null);
            setEditingResult(null);
            toast.success('Result updated successfully');
        } catch (error) {
            console.error('Failed to update result:', error);
            toast.error('Failed to update result');
        } finally {
            setIsSaving(false);
        }
    };

    // Handler for showing delete confirmation modal
    const confirmDelete = (id, type) => {
        setDeleteItemId(id);
        setDeleteItemType(type);
        setDeleteModalOpen(true);
    };

    // Handler for deleting a response or result
    const handleDelete = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            if (deleteItemType === 'response') {
                await axios.delete(
                    `${import.meta.env.VITE_API_URL}/api/assessment/${id}/responses/${deleteItemId}`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
                
                // Update state to remove the deleted response
                setAssessment(prev => ({
                    ...prev,
                    responses: prev.responses.filter(r => r._id !== deleteItemId)
                }));
                
                toast.success('Response deleted successfully');
            } else if (deleteItemType === 'result') {
                await axios.delete(
                    `${import.meta.env.VITE_API_URL}/api/assessment/${id}/results/${deleteItemId}`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
                
                // Update state to remove the deleted result
                setAssessment(prev => ({
                    ...prev,
                    results: prev.results.filter(r => r._id !== deleteItemId)
                }));
                
                toast.success('Result deleted successfully');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete item');
        } finally {
            setDeleteModalOpen(false);
            setDeleteItemId(null);
            setDeleteItemType(null);
        }
    };

    // Handle changes to editing response fields
    const handleResponseChange = (field, value) => {
        setEditingResponse(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle changes to editing result participant fields
    const handleResultParticipantChange = (field, value) => {
        setEditingResult(prev => ({
            ...prev,
            participant: {
                ...prev.participant,
                [field]: value
            }
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            <Navigation />
            <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                {/* Delete Confirmation Modal */}
                {deleteModalOpen && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                        <div ref={modalRef} className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                            <div className="mt-3 text-center">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                    <TrashIcon className="h-6 w-6 text-red-600" />
                                </div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Confirm Deletion</h3>
                                <div className="mt-2 px-7 py-3">
                                    <p className="text-sm text-gray-500">
                                        Are you sure you want to delete this {deleteItemType}? This action cannot be undone.
                                    </p>
                                </div>
                                <div className="flex justify-center gap-4 mt-2">
                                    <button 
                                        onClick={() => setDeleteModalOpen(false)}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleDelete}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-base font-medium rounded-md shadow-sm"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Response Modal */}
                {isEditing && (editResponseId || editResultId) && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                        <div className="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                            <div className="flex justify-between items-center border-b pb-3 mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Edit {editResponseId ? 'Response' : 'Result'}
                                </h3>
                                <button 
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditResponseId(null);
                                        setEditingResponse(null);
                                        setEditResultId(null);
                                        setEditingResult(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                            
                            <div className="max-h-[calc(100vh-200px)] overflow-y-auto py-2">
                                {editResponseId && editingResponse && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                                <input 
                                                    type="text" 
                                                    value={editingResponse.participantName || ''} 
                                                    onChange={(e) => handleResponseChange('participantName', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <input 
                                                    type="email" 
                                                    value={editingResponse.participantEmail || ''} 
                                                    onChange={(e) => handleResponseChange('participantEmail', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                                <input 
                                                    type="text" 
                                                    value={editingResponse.participantDepartment || ''} 
                                                    onChange={(e) => handleResponseChange('participantDepartment', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                                <input 
                                                    type="text" 
                                                    value={editingResponse.participantDesignation || ''} 
                                                    onChange={(e) => handleResponseChange('participantDesignation', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Centre</label>
                                                <select
                                                    value={editingResponse.participantCentre || ''}
                                                    onChange={(e) => handleResponseChange('participantCentre', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                                >
                                                    <option value="">Select Centre</option>
                                                    <option value="delhi">Delhi</option>
                                                    <option value="bengaluru">Bengaluru</option>
                                                    <option value="mumbai">Mumbai</option>
                                                    <option value="kolkatta">Kolkatta</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        {editingResponse.additionalFeedback !== undefined && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Feedback</label>
                                                <textarea 
                                                    value={editingResponse.additionalFeedback || ''} 
                                                    onChange={(e) => handleResponseChange('additionalFeedback', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                                    rows="3"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {editResultId && editingResult && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                                <input 
                                                    type="text" 
                                                    value={editingResult.participant.name || ''} 
                                                    onChange={(e) => handleResultParticipantChange('name', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <input 
                                                    type="email" 
                                                    value={editingResult.participant.email || ''} 
                                                    onChange={(e) => handleResultParticipantChange('email', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                                <input 
                                                    type="text" 
                                                    value={editingResult.participant.department || ''} 
                                                    onChange={(e) => handleResultParticipantChange('department', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                                <input 
                                                    type="text" 
                                                    value={editingResult.participant.designation || ''} 
                                                    onChange={(e) => handleResultParticipantChange('designation', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Centre</label>
                                                <select
                                                    value={editingResult.participant.centre || ''}
                                                    onChange={(e) => handleResultParticipantChange('centre', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                                >
                                                    <option value="">Select Centre</option>
                                                    <option value="delhi">Delhi</option>
                                                    <option value="bengaluru">Bengaluru</option>
                                                    <option value="mumbai">Mumbai</option>
                                                    <option value="kolkatta">Kolkatta</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                                                <select
                                                    value={editingResult.participant.experience || ''}
                                                    onChange={(e) => handleResultParticipantChange('experience', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                                >
                                                    <option value="">Select Experience Level</option>
                                                    <option value="beginner">Beginner</option>
                                                    <option value="intermediate">Intermediate</option>
                                                    <option value="advanced">Advanced</option>
                                                    <option value="expert">Expert</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div className="font-medium text-gray-700 mb-1">
                                            Total Score: {editingResult.totalScore}%
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
                                <button 
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditResponseId(null);
                                        setEditingResponse(null);
                                        setEditResultId(null);
                                        setEditingResult(null);
                                    }}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-md"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={editResponseId ? saveResponseChanges : saveResultChanges}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md flex items-center"
                                >
                                    {isSaving ? (
                                        <>
                                            <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-10">
                    <h2 className="text-2xl font-semibold text-slate-800 mb-6">Response Analytics</h2>
                    <AnalyticsSection assessmentId={id} />
                </div>

                {assessment.assessmentType === 'survey' && calculateSurveyMetrics && (
                    <div className="mb-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Response Overview</h3>
                                <div className="text-3xl font-bold text-blue-600 mb-2">
                                    {calculateSurveyMetrics.totalResponses}
                                </div>
                                <div className="text-sm text-gray-600">Total Responses</div>
                                <div className="mt-4 flex items-center">
                                    <div className="text-sm font-medium text-gray-600">Completion Rate</div>
                                    <div className="ml-auto text-sm font-semibold text-blue-600">
                                        {calculateSurveyMetrics.averageCompletionRate.toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Average Sentiment</h3>
                                <div className="text-3xl font-bold text-green-600 mb-2">
                                    {calculateSurveyMetrics.averageLikertScore.toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600">Likert Scale (1-5)</div>
                                <div className="mt-4 flex items-center">
                                    <div className="text-sm font-medium text-gray-600">Comment Rate</div>
                                    <div className="ml-auto text-sm font-semibold text-green-600">
                                        {calculateSurveyMetrics.commentRate.toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:col-span-2">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Question Response Rates</h3>
                                <div className="space-y-3">
                                    {calculateSurveyMetrics.questionScores
                                        .sort((a, b) => b.responseRate - a.responseRate)
                                        .slice(0, 3)
                                        .map((score, index) => (
                                            <div key={index} className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-700 truncate mb-1">
                                                        Q{index + 1}: {score.question}
                                                    </div>
                                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 rounded-full"
                                                            style={{ width: `${score.responseRate}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="text-sm font-semibold text-gray-700 min-w-[4rem] text-right">
                                                    {score.responseRate.toFixed(1)}%
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>

                        {analyzeCenterPatterns.length > 1 && (
                            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-6">Center Response Analysis</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="border border-gray-100 rounded-lg p-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-4">Average Engagement by Center</h4>
                                        <div className="space-y-4">
                                            {analyzeCenterPatterns
                                                .sort((a, b) => b.averageLikertScore - a.averageLikertScore)
                                                .map((center, index) => (
                                                    <div key={index} className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="font-medium text-gray-600">{center.centerName}</span>
                                                            <span className="font-semibold text-blue-600">
                                                                {center.averageLikertScore.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500 rounded-full"
                                                                style={{ width: `${(center.averageLikertScore / 5) * 100}%` }}
                                                            />
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {center.responseCount} responses
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    <div className="border border-gray-100 rounded-lg p-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-4">Response Distribution</h4>
                                        <div className="space-y-6">
                                            {assessment.questions.slice(0, 3).map((question, qIndex) => (
                                                <div key={qIndex} className="space-y-3">
                                                    <div className="text-sm font-medium text-gray-700 truncate">
                                                        Q{qIndex + 1}: {question.question}
                                                    </div>
                                                    <div className="flex h-2 rounded-full overflow-hidden">
                                                        {question.options.map((option, oIndex) => {
                                                            const totalResponses = analyzeCenterPatterns.reduce(
                                                                (sum, center) => sum + center.responseCount,
                                                                0
                                                            );
                                                            const count = analyzeCenterPatterns.reduce(
                                                                (sum, center) => {
                                                                    const stats = calculateResponseStats(qIndex, center.nameKey);
                                                                    return sum + (stats.find(s => s.option === option)?.count || 0);
                                                                },
                                                                0
                                                            );
                                                            return (
                                                                <div
                                                                    key={oIndex}
                                                                    className={`${responseColors[option]}`}
                                                                    style={{
                                                                        width: `${(count / totalResponses) * 100}%`
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="flex justify-between text-xs text-gray-500">
                                                        <span>No</span>
                                                        <span>Completely</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Question Breakdown Section */}
                <div className="space-y-8 mb-12">
                    <div className="flex justify-between items-center mb-6 border-b pb-3">
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-800">Question Breakdown</h2>
                            {assessment.assessmentType === 'survey' && (
                                <p className="text-sm text-gray-600 mt-1">
                                    Analysis of {assessment.questions.length} questions with Likert scale responses
                                </p>
                            )}
                        </div>
                        
                        {availableCenters.length > 0 && (
                            <div className="relative">
                                <select
                                    value={centerFilter}
                                    onChange={(e) => setCenterFilter(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Centers</option>
                                    {availableCenters.map(center => (
                                        // Display standardized center name, value is normalized (lowercase)
                                        <option key={center} value={center}>
                                            {getStandardizedCenterName(center)}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Quick Insights Panel */}
                    {assessment.assessmentType !== 'survey' && assessment.questions.length > 0 && (
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
                            <h3 className="text-lg font-semibold text-slate-800 mb-5">Quick Insights</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Highest performing question */}
                                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                    <h4 className="text-sm font-semibold text-green-800 mb-2">Highest Performance</h4>
                                    {(() => {
                                        let highestCorrectRate = 0;
                                        let highestQuestionIndex = 0;
                                        
                                        assessment.questions.forEach((_, index) => {
                                            const stats = calculateResponseStats(index, centerFilter || null);
                                            const correctRate = stats.find(s => s.option === 'Correct')?.percentage || 0;
                                            if (correctRate > highestCorrectRate) {
                                                highestCorrectRate = correctRate;
                                                highestQuestionIndex = index;
                                            }
                                        });
                                        
                                        return (
                                            <>
                                                <p className="text-sm text-gray-700 mb-1">
                                                    <span className="font-medium">Question {highestQuestionIndex + 1}:</span> {assessment.questions[highestQuestionIndex].question}
                                                </p>
                                                <div className="flex items-center mt-3">
                                                    <span className="text-green-600 font-bold text-xl">{highestCorrectRate}%</span>
                                                    <span className="ml-2 text-xs text-gray-600">correct responses</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                
                                {/* Lowest performing question */}
                                <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                                    <h4 className="text-sm font-semibold text-red-800 mb-2">Lowest Performance</h4>
                                    {(() => {
                                        let lowestCorrectRate = 100;
                                        let lowestQuestionIndex = 0;
                                        
                                        assessment.questions.forEach((_, index) => {
                                            const stats = calculateResponseStats(index, centerFilter || null);
                                            const correctRate = stats.find(s => s.option === 'Correct')?.percentage || 0;
                                            if (correctRate < lowestCorrectRate) {
                                                lowestCorrectRate = correctRate;
                                                lowestQuestionIndex = index;
                                            }
                                        });
                                        
                                        return (
                                            <>
                                                <p className="text-sm text-gray-700 mb-1">
                                                    <span className="font-medium">Question {lowestQuestionIndex + 1}:</span> {assessment.questions[lowestQuestionIndex].question}
                                                </p>
                                                <div className="flex items-center mt-3">
                                                    <span className="text-red-600 font-bold text-xl">{lowestCorrectRate}%</span>
                                                    <span className="ml-2 text-xs text-gray-600">correct responses</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {assessment.questions.map((question, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                            <div className="flex justify-between items-start mb-5">
                                <h3 className="text-lg font-semibold text-slate-800">
                                    {index + 1}. {question.question}
                                </h3>
                                {assessment.assessmentType === 'survey' && (
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm text-gray-600">Average Rating:</span>
                                            <span className="font-semibold text-blue-600">
                                                {calculateLikertScore(calculateResponseStats(index))}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Overall Sentiment:</span>                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                parseFloat(calculateLikertScore(calculateResponseStats(index))) >= 4.5 ? 'bg-green-100 text-green-800' :
                                                parseFloat(calculateLikertScore(calculateResponseStats(index))) >= 3.5 ? 'bg-emerald-100 text-emerald-800' :
                                                parseFloat(calculateLikertScore(calculateResponseStats(index))) >= 2.5 ? 'bg-blue-100 text-blue-800' :
                                                parseFloat(calculateLikertScore(calculateResponseStats(index))) >= 1.5 ? 'bg-orange-100 text-orange-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {parseFloat(calculateLikertScore(calculateResponseStats(index))) >= 4.5 ? 'Very Positive' :
                                                 parseFloat(calculateLikertScore(calculateResponseStats(index))) >= 3.5 ? 'Positive' :
                                                 parseFloat(calculateLikertScore(calculateResponseStats(index))) >= 2.5 ? 'Neutral' :
                                                 parseFloat(calculateLikertScore(calculateResponseStats(index))) >= 1.5 ? 'Negative' :
                                                 'Very Negative'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {assessment.assessmentType === 'survey' && (
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Response Distribution</h4>
                                        <div className="space-y-3">
                                            {calculateResponseStats(index, centerFilter).map((stat, statIndex) => (
                                                <div key={statIndex} className="flex items-center gap-4">
                                                    <div className="w-24 text-sm font-medium text-gray-700 text-right">{stat.option}</div>
                                                    <div className="flex-1">
                                                        <div className="h-5 bg-gray-200 rounded-full overflow-hidden relative">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ease-out ${responseColors[stat.option]}`}
                                                                style={{ width: `${stat.percentage}%` }}
                                                            />
                                                            {stat.percentage > 10 && (
                                                                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-luminosity">
                                                                    {stat.percentage}% ({stat.count})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Additional Metrics for Survey Questions */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Response Summary</h4>                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Total Responses:</span>
                                                    <span className="text-sm font-medium">{
                                                        calculateResponseStats(index, centerFilter)?.length > 0
                                                            ? calculateResponseStats(index, centerFilter)
                                                                .reduce((sum, stat) => sum + stat.count, 0)
                                                            : 0
                                                    }</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Most Common:</span>                                                    <span className="text-sm font-medium">{
                                                        calculateResponseStats(index, centerFilter)?.length > 0
                                                            ? calculateResponseStats(index, centerFilter)
                                                                .reduce((prev, curr) => prev.count > curr.count ? prev : curr).option
                                                            : 'None'
                                                    }</span>
                                                </div>
                                                {question.allowComments && (
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Comments:</span>
                                                        <span className="text-sm font-medium">{
                                                            assessment.responses.filter(r => 
                                                                (!centerFilter || normalizeCentreName(r.participantCentre) === centerFilter) &&
                                                                r.responses[index]?.comments
                                                            ).length
                                                        }</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Sentiment Breakdown</h4>
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                                                    {calculateResponseStats(index, centerFilter).map((stat, statIndex) => {                                                const stats = calculateResponseStats(index, centerFilter);
                                                        if (!stats || stats.length === 0) return null;
                                                        const totalResponses = stats.reduce((sum, s) => sum + s.count, 0);
                                                        if (totalResponses === 0) return null;
                                                        return (
                                                            <div
                                                                key={statIndex}
                                                                className={`h-full float-left ${responseColors[stat.option]}`}
                                                                style={{ width: `${(stat.count / totalResponses) * 100}%` }}
                                                            />
                                                        );
                                                    })}
                                                </div>                                                <div className="text-xs text-gray-500 flex justify-between">
                                                    <span className="text-red-600">Very Negative</span>
                                                    <span className="text-orange-600">Negative</span>
                                                    <span className="text-blue-600">Neutral</span>
                                                    <span className="text-emerald-600">Positive</span>
                                                    <span className="text-green-600">Very Positive</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                </div>

                <div className="mt-12">
                    <div className="flex justify-between items-center mb-6 border-b pb-3">
                        <h2 className="text-2xl font-semibold text-slate-800">Individual Responses</h2>
                        
                        <div className="flex items-center gap-4">
                            {availableCenters.length > 0 && (
                                <div className="relative">
                                    <select
                                        value={centerFilter}
                                        onChange={(e) => setCenterFilter(e.target.value)}
                                        className="block w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">All Centers</option>
                                        {availableCenters.map(center => (
                                            // Display standardized center name, value is normalized (lowercase)
                                            <option key={center} value={center}>
                                                {getStandardizedCenterName(center)}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                                    </div>
                                </div>
                            )}
                            
                            <div className="inline-flex rounded-md shadow-sm">
                                <button
                                    onClick={() => requestSort('name')}
                                    className={`relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-l-md border ${sortConfig.key === 'name' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-300'}`}
                                >
                                    Name
                                    {sortConfig.key === 'name' && (
                                        <span className="ml-1">
                                            {sortConfig.direction === 'ascending' ? (
                                                <ArrowUpIcon className="h-3 w-3" />
                                            ) : (
                                                <ArrowDownIcon className="h-3 w-3" />
                                            )}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => requestSort('centre')}
                                    className={`relative inline-flex items-center px-3 py-2 text-sm font-medium border-t border-b ${sortConfig.key === 'centre' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-300'}`}
                                >
                                    Centre
                                    {sortConfig.key === 'centre' && (
                                        <span className="ml-1">
                                            {sortConfig.direction === 'ascending' ? (
                                                <ArrowUpIcon className="h-3 w-3" />
                                            ) : (
                                                <ArrowDownIcon className="h-3 w-3" />
                                            )}
                                        </span>
                                    )}
                                </button>
                                {assessment.assessmentType !== 'survey' && (
                                    <button
                                        onClick={() => requestSort('score')}
                                        className={`relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-r-md border ${sortConfig.key === 'score' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-300'}`}
                                    >
                                        Score
                                        {sortConfig.key === 'score' && (
                                            <span className="ml-1">
                                                {sortConfig.direction === 'ascending' ? (
                                                    <ArrowUpIcon className="h-3 w-3" />
                                                ) : (
                                                    <ArrowDownIcon className="h-3 w-3" />
                                                )}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {((assessment.assessmentType === 'survey' && assessment.responses.length > 0) || 
                      (assessment.assessmentType !== 'survey' && assessment.results.length > 0)) ? (
                        <div className="space-y-6">
                            {assessment.assessmentType === 'survey' ? (
                                // Survey Responses
                                sortedResponses.map((response, index) => (
                                    <details key={index} className="bg-white rounded-lg shadow-md overflow-hidden group">
                                        <summary className="flex justify-between items-center p-5 cursor-pointer hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div>
                                                    <h3 className="text-base font-semibold text-slate-800">
                                                        {response.participantName}
                                                        <span className="text-sm font-normal text-gray-500 ml-2">
                                                            ({response.participantDesignation})
                                                        </span>
                                                    </h3>
                                                    <div className="flex items-center mt-1">
                                                        <p className="text-sm text-gray-600 mr-3">{response.participantDepartment}</p>
                                                        {response.participantCentre && (
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCentreColor(normalizeCentreName(response.participantCentre))}`}>
                                                                <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                                                                {getStandardizedCenterName(response.participantCentre)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleEditResponse(response);
                                                        }}
                                                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors rounded-full hover:bg-blue-50"
                                                        title="Edit Response"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            confirmDelete(response._id, 'response');
                                                        }}
                                                        className="p-1 text-red-600 hover:text-red-800 transition-colors rounded-full hover:bg-red-50"
                                                        title="Delete Response"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(response.submittedAt).toLocaleDateString()}
                                                </span>
                                                <span className="text-sm text-gray-500 group-open:rotate-90 transform transition-transform duration-200">▼</span>
                                            </div>
                                        </summary>
                                        <div className="px-5 pb-5 border-t border-gray-100">
                                            <div className="space-y-4 mt-4">
                                                {response.responses.map((answer, answerIndex) => (
                                                    <div key={answerIndex} className="bg-gray-50 p-4 rounded-md border border-gray-100">
                                                        <p className="text-sm font-medium text-slate-700 mb-1">
                                                            {assessment.questions[answerIndex].question}
                                                        </p>                                                        <p className="text-sm text-blue-700 font-medium">
                                                            Response: <span className="font-semibold">{answer?.response || 'No response'}</span>
                                                        </p>                                                        {answer?.comments && (
                                                            <p className="text-sm text-gray-600 mt-1 italic">
                                                                Comment: "{answer.comments}"
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}

                                            </div>

                                            {response.additionalFeedback && (
                                                <div className="mt-6 pt-4 border-t border-gray-100">
                                                    <h4 className="text-sm font-semibold text-slate-700 mb-1">
                                                        Overall Feedback
                                                    </h4>
                                                    <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-3 rounded-md border border-gray-100 italic">
                                                        "{response.additionalFeedback}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                ))
                            ) : (                                // Quiz Results
                                sortedResponses.map((result, index) => (
                                    <details key={index} className="bg-white rounded-lg shadow-md overflow-hidden group">
                                        <summary className="flex justify-between items-center p-5 cursor-pointer hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div>
                                                    <h3 className="text-base font-semibold text-slate-800">
                                                        {result.participant.name}
                                                        <span className="text-sm font-normal text-gray-500 ml-2">
                                                            ({result.participant.designation || result.participant.experience})
                                                        </span>
                                                    </h3>
                                                    <div className="flex items-center mt-1">
                                                        <p className="text-sm text-gray-600 mr-3">{result.participant.department}</p>
                                                        {result.participant.centre && (
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCentreColor(normalizeCentreName(result.participant.centre))}`}>
                                                                <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                                                                {getStandardizedCenterName(result.participant.centre)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleEditResult(result);
                                                        }}
                                                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors rounded-full hover:bg-blue-50"
                                                        title="Edit Result"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            confirmDelete(result._id, 'result');
                                                        }}
                                                        className="p-1 text-red-600 hover:text-red-800 transition-colors rounded-full hover:bg-red-50"
                                                        title="Delete Result"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-lg font-semibold ${result.totalScore >= (assessment.passingScore || 70) ? 'text-green-600' : 'text-red-600'}`}>
                                                        {result.totalScore}% 
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(result.completedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <span className="text-sm text-gray-500 group-open:rotate-90 transform transition-transform duration-200">▼</span>
                                            </div>
                                        </summary>
                                        <div className="px-5 pb-5 border-t border-gray-100">
                                            <div className="space-y-4 mt-4">
                                                {result.answers.map((answer, answerIndex) => (
                                                    <div key={answerIndex} 
                                                         className={`p-4 rounded-md border ${
                                                             answer.isCorrect 
                                                                 ? 'bg-green-50 border-green-200' 
                                                                 : 'bg-red-50 border-red-200'
                                                         }`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-700 mb-1">
                                                                    {assessment.questions[answerIndex].question}
                                                                </p>
                                                                <p className={`text-sm font-medium ${
                                                                    answer.isCorrect ? 'text-green-700' : 'text-red-700'
                                                                }`}>
                                                                    Selected: {assessment.questions[answerIndex].options[answer.selectedOption]}
                                                                </p>
                                                                {!answer.isCorrect && (
                                                                    <p className="text-sm text-gray-600 mt-1">
                                                                        Correct: {assessment.questions[answerIndex].options[assessment.questions[answerIndex].correctOption]}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="ml-4">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                                    answer.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                    {answer.isCorrect ? 'Correct' : 'Incorrect'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </details>
                                ))
                            )}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">No responses available for this assessment.</p>
                    )}
                </div>
            </main>
        </div>
    );
}