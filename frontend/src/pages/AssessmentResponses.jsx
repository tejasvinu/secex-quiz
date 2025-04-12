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
    };

    // Get all available centers for filtering
    const availableCenters = useMemo(() => {
        if (!assessment) return [];
        
        const centers = new Set();
        if (assessment.assessmentType === 'survey') {
            assessment.responses.forEach(response => {
                if (response.participantCentre) {
                    centers.add(response.participantCentre);
                }
            });
        } else {
            assessment.results.forEach(result => {
                if (result.participant.centre) {
                    centers.add(result.participant.centre);
                }
            });
        }
        return Array.from(centers).sort();
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
        
        // Apply center filter
        if (centerFilter) {
            items = items.filter(item => {
                const center = assessment.assessmentType === 'survey' 
                    ? item.participantCentre 
                    : item.participant.centre;
                return center === centerFilter;
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
            }
            
            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }, [assessment, sortConfig, centerFilter]);

    // Calculate center-specific statistics
    const centerStats = useMemo(() => {
        if (!assessment) return [];
        
        const stats = {};
        
        if (assessment.assessmentType !== 'survey') {
            assessment.results.forEach(result => {
                const centre = result.participant.centre || 'Unspecified';
                if (!stats[centre]) {
                    stats[centre] = {
                        name: centre,
                        count: 0,
                        totalScore: 0,
                        avgScore: 0,
                        highestScore: 0,
                        participants: []
                    };
                }
                
                stats[centre].count++;
                stats[centre].totalScore += result.totalScore;
                stats[centre].highestScore = Math.max(stats[centre].highestScore, result.totalScore);
                stats[centre].participants.push({
                    name: result.participant.name,
                    score: result.totalScore
                });
            });
            
            // Calculate averages
            Object.values(stats).forEach(centre => {
                centre.avgScore = Math.round(centre.totalScore / centre.count);
            });
        } else {
            assessment.responses.forEach(response => {
                const centre = response.participantCentre || 'Unspecified';
                if (!stats[centre]) {
                    stats[centre] = {
                        name: centre,
                        count: 0,
                        participants: []
                    };
                }
                
                stats[centre].count++;
                stats[centre].participants.push({
                    name: response.participantName
                });
            });
        }
        
        return Object.values(stats).sort((a, b) => 
            assessment.assessmentType === 'survey' 
                ? b.count - a.count 
                : b.avgScore - a.avgScore
        );
    }, [assessment]);

    // Get a random color based on centre name for consistent coloring
    const getCentreColor = (centre) => {
        if (!centre) return 'bg-gray-200 text-gray-700';
        
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
        const hash = centre.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
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
        if (assessment.assessmentType === 'survey') {
            // Filter responses by center if provided
            const filteredResponses = centerName 
                ? assessment.responses.filter(r => r.participantCentre === centerName)
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
            // Filter results by center if provided
            const filteredResults = centerName 
                ? assessment.results.filter(r => r.participant.centre === centerName)
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
    };

    const responseColors = {
        'No': 'bg-red-500',
        'Little': 'bg-orange-500',
        'Somewhat': 'bg-yellow-500',
        'Mostly': 'bg-lime-500',
        'Completely': 'bg-green-500',
        'Correct': 'bg-green-500',
        'Incorrect': 'bg-red-500'
    };

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
        // Prepare CSV data
        const headers = ['Name', 'Email', 'Department', 'Designation', 'Centre', 'Score', 'Submission Date'];
        const csvRows = [headers];

        if (assessment.assessmentType === 'survey') {
            assessment.responses.forEach(response => {
                csvRows.push([
                    response.participantName,
                    response.participantEmail,
                    response.participantDepartment,
                    response.participantDesignation,
                    response.participantCentre,
                    'N/A', // Score not applicable for surveys
                    new Date(response.submittedAt).toLocaleString()
                ]);
            });
        } else {
            assessment.results.forEach(result => {
                csvRows.push([
                    result.participant.name,
                    result.participant.email,
                    result.participant.department,
                    result.participant.designation,
                    result.participant.centre,
                    `${result.totalScore}%`,
                    new Date(result.completedAt).toLocaleString()
                ]);
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
        link.setAttribute('download', `${assessment.title} - Submissions.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Function to generate and download center-specific report
    const downloadCenterReport = (centerName) => {
        if (!assessment) return;
        
        // Create headers and rows for CSV
        const headers = ['Question', 'Correct Answers', 'Incorrect Answers', 'Percentage Correct'];
        const csvRows = [headers];
        
        // For each question, calculate stats for the specified center
        assessment.questions.forEach((question, index) => {
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
        
        // Convert to CSV
        const csvContent = csvRows
            .map(row => row.map(cell => `"${cell || ''}"`).join(','))
            .join('\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${assessment.title} - ${centerName} Report.csv`);
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

                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-10">
                    <h2 className="text-xl font-semibold text-slate-800 mb-4">Response Summary</h2>
                    <div className="flex items-center text-sm text-gray-600 space-x-6">
                        <span className="flex items-center">
                            <UserCircleIcon className="h-5 w-5 mr-1.5 text-gray-400" />
                            {assessment.assessmentType === 'survey' 
                                ? `${assessment.responses.length} total responses`
                                : `${assessment.results.length} total submissions`
                            }
                        </span>
                        {assessment.assessmentType !== 'survey' && (
                            <span className="flex items-center">
                                <CheckCircleIcon className="h-5 w-5 mr-1.5 text-green-500" />
                                Average Score: {calculateAvgScore()}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Centers Performance Summary */}
                {centerStats.length > 1 && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-10">
                        <h2 className="text-xl font-semibold text-slate-800 mb-6">Centers Performance Summary</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {centerStats.map((center, index) => (
                                <div key={index} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                                    <div className="flex items-center mb-3">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCentreColor(center.name)}`}>
                                            <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                                            {center.name}
                                        </span>
                                        <span className="text-sm text-gray-600 ml-2">{center.count} {assessment.assessmentType === 'survey' ? 'responses' : 'participants'}</span>
                                    </div>
                                    
                                    {assessment.assessmentType !== 'survey' && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-600">Average Score</span>
                                                <span className="font-medium">{center.avgScore}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${
                                                        center.avgScore >= (assessment.passingScore || 70) 
                                                            ? 'bg-green-500' 
                                                            : 'bg-red-500'
                                                    }`}
                                                    style={{ width: `${center.avgScore}%` }}
                                                />
                                            </div>
                                            
                                            <div className="flex justify-between items-center text-sm mt-3">
                                                <span className="text-gray-600">Top Score</span>
                                                <span className="font-medium">{center.highestScore}%</span>
                                            </div>
                                            
                                            {center.participants.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-gray-100">
                                                    <div className="text-xs text-gray-500 mb-1">Top Performers</div>
                                                    <div className="max-h-24 overflow-y-auto">
                                                        {center.participants
                                                            .sort((a, b) => b.score - a.score)
                                                            .slice(0, 3)
                                                            .map((participant, idx) => (
                                                                <div key={idx} className="flex justify-between text-sm py-1">
                                                                    <span className="text-gray-700 truncate" style={{maxWidth: "70%"}}>{participant.name}</span>
                                                                    {assessment.assessmentType !== 'survey' && (
                                                                        <span className="font-medium">{participant.score}%</span>
                                                                    )}
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                </div>                                            )}
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-center mt-3">
                                        {assessment.assessmentType === 'survey' ? (
                                            <button 
                                                onClick={() => setCenterFilter(center.name)} 
                                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                View Responses
                                            </button>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={() => setCenterFilter(center.name)} 
                                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    View Details
                                                </button>
                                                <button 
                                                    onClick={() => downloadCenterReport(center.name)} 
                                                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
                                                >
                                                    <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                                                    Export
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-8 mb-12">
                    <div className="flex justify-between items-center mb-6 border-b pb-3">
                        <h2 className="text-2xl font-semibold text-slate-800">Question Breakdown</h2>
                        
                        {availableCenters.length > 0 && (
                            <div className="relative">
                                <select
                                    value={centerFilter}
                                    onChange={(e) => setCenterFilter(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Centers</option>
                                    {availableCenters.map(center => (
                                        <option key={center} value={center}>{center}</option>
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
                            <h3 className="text-lg font-semibold text-slate-800 mb-5">
                                {index + 1}. {question.question}
                                {assessment.assessmentType !== 'survey' && (
                                    <span className="text-sm font-normal text-gray-500 ml-2">
                                        ({question.points} points)
                                    </span>
                                )}
                            </h3>

                            <div className="space-y-3">
                                {calculateResponseStats(index, centerFilter).map((stat, statIndex) => (
                                    <div key={statIndex} className="flex items-center gap-4">
                                        <div className="w-24 text-sm font-medium text-gray-700 text-right">{stat.option}</div>
                                        <div className="flex-1">
                                            <div className="h-5 bg-gray-200 rounded-full overflow-hidden relative">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ease-out ${responseColors[stat.option] || 'bg-blue-600'}`}
                                                    style={{ width: `${stat.percentage}%` }}
                                                />
                                                {stat.percentage > 10 && (
                                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-luminosity">
                                                        {stat.percentage}% 
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-16 text-sm text-gray-600 text-right">{stat.count}</div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Center Performance Comparison for Quiz Questions */}
                            {assessment.assessmentType !== 'survey' && centerStats.length > 1 && (
                                <div className="mt-6 pt-5 border-t border-gray-200">
                                    <h4 className="text-base font-semibold text-slate-700 mb-4 flex items-center">
                                        <BuildingOfficeIcon className="h-5 w-5 mr-2 text-gray-400"/>
                                        Center Performance Comparison
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {centerStats.map((center, centerIdx) => {
                                            const centerStats = calculateResponseStats(index, center.name);
                                            const correctPercentage = centerStats.find(s => s.option === 'Correct')?.percentage || 0;
                                            return (
                                                <div key={centerIdx} className="border border-gray-100 rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCentreColor(center.name)}`}>
                                                            {center.name}
                                                        </span>
                                                        <span className={`text-sm font-semibold ${correctPercentage >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {correctPercentage}% correct
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${correctPercentage >= 70 ? 'bg-green-500' : 'bg-red-500'}`}
                                                            style={{ width: `${correctPercentage}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {centerStats.find(s => s.option === 'Correct')?.count || 0} of {center.count} participants answered correctly
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Comments Section for Survey Questions */}
                            {assessment.assessmentType === 'survey' && question.allowComments &&
                             assessment.responses.some(r => r.responses[index]?.comments) && (
                                <div className="mt-6 pt-5 border-t border-gray-200">
                                    <h4 className="text-base font-semibold text-slate-700 mb-4 flex items-center">
                                        <ChatBubbleLeftEllipsisIcon className="h-5 w-5 mr-2 text-gray-400"/>
                                        Comments
                                    </h4>
                                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                        {assessment.responses.map((response, respIndex) => {
                                            // Filter out responses not matching the center filter if active
                                            if (centerFilter && response.participantCentre !== centerFilter) {
                                                return null;
                                            }
                                            const comment = response.responses[index]?.comments;
                                            if (!comment) return null;
                                            return (
                                                <div key={respIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                                    <p className="text-sm text-gray-700 italic">"{comment}"</p>
                                                    <p className="text-xs text-gray-500 mt-2 text-right">
                                                        - {response.participantName} ({response.participantCentre || 'N/A'})
                                                    </p>
                                                </div>
                                            );
                                        })}
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
                                            <option key={center} value={center}>{center}</option>
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
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCentreColor(response.participantCentre)}`}>
                                                                <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                                                                {response.participantCentre}
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
                                                        </p>
                                                        <p className="text-sm text-blue-700 font-medium">
                                                            Response: <span className="font-semibold">{answer.response}</span>
                                                        </p>
                                                        {answer.comments && (
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
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCentreColor(result.participant.centre)}`}>
                                                                <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                                                                {result.participant.centre}
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
                                                                    answer.isCorrect 
                                                                        ? 'bg-green-100 text-green-700' 
                                                                        : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                    {answer.points} pts
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
                        <div className="text-center py-10 px-6 bg-white rounded-lg shadow-sm border border-gray-100">
                            <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            <h3 className="mt-2 text-sm font-semibold text-slate-800">No Responses Yet</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {assessment.assessmentType === 'survey' 
                                    ? 'Responses will appear here once participants complete the survey.'
                                    : 'Results will appear here once participants complete the quiz.'
                                }
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}