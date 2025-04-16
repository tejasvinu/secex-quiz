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
    PencilIcon, // Add PencilIcon
    TrashIcon,  // Add TrashIcon
    XMarkIcon,  // Add XMarkIcon
    ArrowPathIcon, // Add ArrowPathIcon for saving state
    PrinterIcon // Add PrinterIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { normalizeCentreName, getStandardizedCenterName } from '../utils/helpers'; // Import helpers

export default function AssessmentResponses() {
    const { id } = useParams();
    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
    const [centerFilter, setCenterFilter] = useState('');
    
    // New state for managing responses/results editing and deleting
    const [editResponseId, setEditResponseId] = useState(null);
    const [editingResponse, setEditingResponse] = useState(null); // Holds the response data being edited
    const [editResultId, setEditResultId] = useState(null);
    const [editingResult, setEditingResult] = useState(null); // Holds the result data being edited
    const [isEditing, setIsEditing] = useState(false); // Controls edit modal visibility
    const [isSaving, setIsSaving] = useState(false); // Loading state for save button
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteItemId, setDeleteItemId] = useState(null); // ID of the response/result to delete
    const [deleteItemType, setDeleteItemType] = useState(null); // 'response' or 'result'
    const modalRef = useRef(null); // Ref for modal click outside

    useEffect(() => {
        fetchAssessment();
    }, [id]);

    // Close modal if clicked outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setDeleteModalOpen(false);
                // Optionally close edit modal too, if needed
                // setIsEditing(false); 
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [modalRef]);

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
            toast.error('Failed to load assessment data.'); // Add user feedback
        } finally {
            setLoading(false);
        }
    };    
    
    const calculateResponseStats = (questionIndex, centerName = null) => {
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

    // --- Edit/Delete Handlers ---

    // Open Edit Modal for Survey Response
    const handleEditResponse = (response) => {
        setEditResponseId(response._id);
        setEditingResponse({ ...response }); // Clone response data for editing
        setEditResultId(null);
        setEditingResult(null);
        setIsEditing(true);
    };

    // Open Edit Modal for Quiz Result
    const handleEditResult = (result) => {
        setEditResultId(result._id);
        // Ensure participant data is properly nested for editing
        setEditingResult({ ...result, participant: { ...result.participant } }); 
        setEditResponseId(null);
        setEditingResponse(null);
        setIsEditing(true);
    };

    // Handle changes in the edit form for Survey Response
    const handleResponseChange = (field, value) => {
        setEditingResponse(prev => ({ ...prev, [field]: value }));
    };

    // Handle changes in the edit form for Quiz Result (participant details)
    const handleResultParticipantChange = (field, value) => {
        setEditingResult(prev => ({
            ...prev,
            participant: { ...prev.participant, [field]: value }
        }));
    };

    // Save changes for Survey Response
    const saveResponseChanges = async () => {
        if (!editResponseId || !editingResponse) return;
        setIsSaving(true);
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const response = await axios.put(
                `${import.meta.env.VITE_API_URL}/api/assessment/${id}/responses/${editResponseId}`,
                editingResponse, // Send the entire updated response object
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // Update local state immediately for better UX
            setAssessment(prev => ({
                ...prev,
                responses: prev.responses.map(r => 
                    r._id === editResponseId ? response.data.response : r
                )
            }));

            toast.success('Response updated successfully!');
            setIsEditing(false);
            setEditResponseId(null);
            setEditingResponse(null);
        } catch (error) {
            console.error('Failed to update response:', error);
            toast.error('Failed to update response. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Save changes for Quiz Result
    const saveResultChanges = async () => {
        if (!editResultId || !editingResult) return;
        setIsSaving(true);
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            // Only send the fields that can be updated (e.g., participant details)
            const updatePayload = { participant: editingResult.participant }; 
            
            const response = await axios.put(
                `${import.meta.env.VITE_API_URL}/api/assessment/${id}/results/${editResultId}`,
                updatePayload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local state immediately
            setAssessment(prev => ({
                ...prev,
                results: prev.results.map(r => 
                    r._id === editResultId ? response.data.result : r
                )
            }));

            toast.success('Result updated successfully!');
            setIsEditing(false);
            setEditResultId(null);
            setEditingResult(null);
        } catch (error) {
            console.error('Failed to update result:', error);
            toast.error('Failed to update result. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Open Delete Confirmation Modal
    const confirmDelete = (itemId, itemType) => {
        setDeleteItemId(itemId);
        setDeleteItemType(itemType);
        setDeleteModalOpen(true);
    };

    // Handle actual deletion
    const handleDelete = async () => {
        if (!deleteItemId || !deleteItemType) return;
        
        const endpoint = deleteItemType === 'response' 
            ? `${import.meta.env.VITE_API_URL}/api/assessment/${id}/responses/${deleteItemId}`
            : `${import.meta.env.VITE_API_URL}/api/assessment/${id}/results/${deleteItemId}`;
            
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            await axios.delete(endpoint, { headers: { Authorization: `Bearer ${token}` } });

            // Update local state immediately
            setAssessment(prev => {
                if (deleteItemType === 'response') {
                    return { ...prev, responses: prev.responses.filter(r => r._id !== deleteItemId) };
                } else {
                    return { ...prev, results: prev.results.filter(r => r._id !== deleteItemId) };
                }
            });

            toast.success(`${deleteItemType.charAt(0).toUpperCase() + deleteItemType.slice(1)} deleted successfully!`);
            setDeleteModalOpen(false);
            setDeleteItemId(null);
            setDeleteItemType(null);
        } catch (error) {
            console.error(`Failed to delete ${deleteItemType}:`, error);
            toast.error(`Failed to delete ${deleteItemType}. Please try again.`);
            setDeleteModalOpen(false); // Close modal even on error
        }
    };

    // --- CSV Export Functions ---

    // Helper function to convert array of objects to CSV string
    const convertToCSV = (data) => {
        if (!data || data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','), // header row
            ...data.map(row => 
                headers.map(fieldName => 
                    JSON.stringify(row[fieldName], (key, value) => value === null ? '' : value) // handle null values and quotes
                ).join(',')
            )
        ];
        return csvRows.join('\r\n');
    };

    // Helper function to trigger CSV download
    const downloadCSV = (csvString, filename) => {
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) { // Feature detection
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Function to download report for a specific center
    const downloadCenterReport = (centerKey) => {
        if (!assessment) return;
        
        const centerDisplayName = getStandardizedCenterName(centerKey);
        const filename = `${assessment.title}_${centerDisplayName}_Report.csv`;
        
        let dataToExport = [];

        if (assessment.assessmentType === 'survey') {
            dataToExport = assessment.responses
                .filter(r => normalizeCentreName(r.participantCentre) === centerKey)
                .map(r => {
                    const row = {
                        Name: r.participantName,
                        Email: r.participantEmail,
                        Department: r.participantDepartment,
                        Designation: r.participantDesignation,
                        Centre: getStandardizedCenterName(r.participantCentre), // Use standardized name
                        SubmittedAt: new Date(r.submittedAt).toLocaleString(),
                    };
                    assessment.questions.forEach((q, index) => {
                        row[`Q${index + 1}_Response`] = r.responses[index]?.response || 'N/A';
                        if (q.allowComments) {
                            row[`Q${index + 1}_Comment`] = r.responses[index]?.comments || '';
                        }
                    });
                    row['AdditionalFeedback'] = r.additionalFeedback || '';
                    return row;
                });
        } else { // Quiz
            dataToExport = assessment.results
                .filter(r => normalizeCentreName(r.participant.centre) === centerKey)
                .map(r => {
                    const row = {
                        Name: r.participant.name,
                        Email: r.participant.email,
                        Department: r.participant.department,
                        Designation: r.participant.designation,
                        Centre: getStandardizedCenterName(r.participant.centre), // Use standardized name
                        Experience: r.participant.experience,
                        CompletedAt: new Date(r.completedAt).toLocaleString(),
                        TotalScore: `${r.totalScore}%`,
                    };
                    assessment.questions.forEach((q, index) => {
                        row[`Q${index + 1}_Selected`] = assessment.questions[index].options[r.answers[index]?.selectedOption] || 'N/A';
                        row[`Q${index + 1}_Correct`] = r.answers[index]?.isCorrect ? 'Yes' : 'No';
                        row[`Q${index + 1}_Points`] = r.answers[index]?.points || 0;
                    });
                    return row;
                });
        }

        if (dataToExport.length === 0) {
            toast.error(`No data found for center: ${centerDisplayName}`);
            return;
        }

        const csvString = convertToCSV(dataToExport);
        downloadCSV(csvString, filename);
        toast.success(`Report for ${centerDisplayName} downloaded.`);
    };

    // Function to download the overall report (all centers or filtered)
    const downloadOverallReport = () => {
        if (!assessment) return;

        const filename = `${assessment.title}_${centerFilter ? getStandardizedCenterName(centerFilter) + '_' : ''}Overall_Report.csv`;
        
        let dataToExport = [];
        const itemsToProcess = centerFilter 
            ? sortedResponses // Use already filtered list if centerFilter is active
            : (assessment.assessmentType === 'survey' ? assessment.responses : assessment.results);

        if (assessment.assessmentType === 'survey') {
            dataToExport = itemsToProcess.map(r => {
                const row = {
                    Name: r.participantName,
                    Email: r.participantEmail,
                    Department: r.participantDepartment,
                    Designation: r.participantDesignation,
                    Centre: getStandardizedCenterName(r.participantCentre),
                    SubmittedAt: new Date(r.submittedAt).toLocaleString(),
                };
                assessment.questions.forEach((q, index) => {
                    row[`Q${index + 1}_Response`] = r.responses[index]?.response || 'N/A';
                    if (q.allowComments) {
                        row[`Q${index + 1}_Comment`] = r.responses[index]?.comments || '';
                    }
                });
                row['AdditionalFeedback'] = r.additionalFeedback || '';
                return row;
            });
        } else { // Quiz
            dataToExport = itemsToProcess.map(r => {
                const row = {
                    Name: r.participant.name,
                    Email: r.participant.email,
                    Department: r.participant.department,
                    Designation: r.participant.designation,
                    Centre: getStandardizedCenterName(r.participant.centre),
                    Experience: r.participant.experience,
                    CompletedAt: new Date(r.completedAt).toLocaleString(),
                    TotalScore: `${r.totalScore}%`,
                };
                assessment.questions.forEach((q, index) => {
                    row[`Q${index + 1}_Selected`] = assessment.questions[index].options[r.answers[index]?.selectedOption] || 'N/A';
                    row[`Q${index + 1}_Correct`] = r.answers[index]?.isCorrect ? 'Yes' : 'No';
                    row[`Q${index + 1}_Points`] = r.answers[index]?.points || 0;
                });
                return row;
            });
        }

        if (dataToExport.length === 0) {
            toast.error(`No data found${centerFilter ? ` for center: ${getStandardizedCenterName(centerFilter)}` : ''}.`);
            return;
        }

        const csvString = convertToCSV(dataToExport);
        downloadCSV(csvString, filename);
        toast.success(`Overall report${centerFilter ? ` for ${getStandardizedCenterName(centerFilter)}` : ''} downloaded.`);
    };


    // Function to handle printing the report
    const handlePrintReport = () => {
        // Add check to ensure assessment is loaded
        if (!assessment) {
            console.error("Cannot print report: Assessment data not loaded yet.");
            toast.error("Report data is not ready yet. Please wait.");
            return;
        }
        // Add a title dynamically for printing
        const originalTitle = document.title;
        document.title = `${assessment.title} - Responses Report${centerFilter ? ` (${getStandardizedCenterName(centerFilter)})` : ''}`;
        window.print();
        document.title = originalTitle; // Restore original title
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!assessment) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-800">Assessment not found</h2>
                    <p className="text-gray-600">The assessment you are looking for does not exist.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 print:bg-white">
            {/* Add print-specific styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 1cm; /* Adjust margins */
                    }
                    body {
                        -webkit-print-color-adjust: exact !important; /* Chrome, Safari */
                        color-adjust: exact !important; /* Firefox */
                        margin: 0;
                        padding: 0;
                        font-size: 9pt; /* Slightly smaller base font for print */
                        line-height: 1.4;
                    }
                    /* Hide elements not needed for print */
                    nav, 
                    button, 
                    select, 
                    details summary::marker, /* Hide default details marker */
                    details summary svg, /* Hide custom icons in summary */
                    .print-hide, 
                    .fixed.inset-0, /* Modals */
                    #headlessui-portal-root /* Potential modal portal */ {
                        display: none !important;
                    }
                    /* Show elements hidden by default but needed for print */
                    details {
                        page-break-inside: avoid; /* Try to keep details block together */
                    }
                    details[open] > div { /* Ensure content within OPEN details is visible */
                        display: block !important; 
                    }
                    details > summary { /* Style summary for print */
                        display: block !important; /* Make summary block for layout */
                        cursor: default;
                        list-style: none; /* Remove list marker */
                        padding-bottom: 0.5rem;
                        margin-bottom: 0.5rem;
                        border-bottom: 1px solid #eee;
                    }
                    /* General print layout adjustments */
                    main {
                        max-width: 100% !important;
                        padding: 0 !important; /* Remove padding, use @page margin */
                        margin: 0 !important;
                    }
                    h1, h2, h3, h4 {
                        page-break-after: avoid; /* Prevent breaks right after headings */
                        margin-top: 1.5rem;
                    }
                    .bg-white, .bg-gray-50, .bg-gradient-to-br, .bg-blue-50, .bg-green-50, .bg-red-50, .bg-gray-100 {
                        background: white !important;
                        border-color: #ddd !important; /* Consistent light borders */
                        box-shadow: none !important;
                    }
                    .shadow-lg, .shadow-md, .shadow-sm {
                        box-shadow: none !important;
                    }
                    .rounded-xl, .rounded-lg, .rounded-md, .rounded-full {
                        border-radius: 0 !important; /* Remove rounded corners */
                    }
                    .text-slate-800, .text-gray-900, .text-gray-700, .text-gray-600, .text-gray-500, .text-blue-700, .text-green-700, .text-red-700, .text-blue-600, .text-green-600, .text-red-600 /* etc. */ {
                        color: black !important; /* Ensure text is black */
                    }
                    /* Specific component adjustments */
                    .h-5.bg-gray-200, .h-2.bg-gray-200, .h-1\\.5.bg-gray-100 { /* Progress bars */
                        border: 1px solid #ccc;
                        background: white !important;
                        height: 8px !important; /* Consistent height */
                    }
                    .h-full.rounded-full { /* Progress bar fill */
                        background: #aaa !important; /* Use a consistent gray fill */
                        height: 100% !important;
                    }
                    .absolute.inset-0.flex.items-center.justify-center, /* Hide percentage text inside bars */
                    .mix-blend-luminosity { 
                        display: none !important; 
                    }
                    .grid { /* Prevent grids from breaking across pages */
                        page-break-inside: avoid;
                    }
                    /* Add page breaks before major sections */
                    .section-break {
                        page-break-before: always;
                        margin-top: 1.5cm; /* Add space before new section */
                        padding-top: 1cm;
                        border-top: 1px solid #ccc;
                    }
                    /* Display selected filter */
                    .print-filter-display {
                        display: block !important;
                        margin-bottom: 1rem;
                        font-weight: bold;
                        font-size: 1.1em;
                        border-bottom: 1px solid #ccc;
                        padding-bottom: 0.5rem;
                    }
                    /* Add page numbers (requires browser support) */
                    /* Not directly possible with CSS alone, but good practice */
                    /* Consider adding a footer in HTML if needed */
                    .print-title {
                        display: block !important;
                        text-align: center;
                        font-size: 1.5em;
                        margin-bottom: 1.5cm;
                    }
                }
            `}</style>

            <Navigation className="print-hide" />
            <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                {/* Page Title & Actions */}
                <div className="flex flex-wrap justify-between items-center mb-8 gap-4 print:hidden">
                    <h1 className="text-3xl font-bold text-slate-900">
                        {assessment.title} - Responses 
                    </h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={downloadOverallReport}
                            title={`Export ${centerFilter ? getStandardizedCenterName(centerFilter) + ' ' : ''}Report as CSV`}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5 mr-2 text-gray-500" />
                            Export CSV
                        </button>
                        <button
                            onClick={handlePrintReport}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <PrinterIcon className="h-5 w-5 mr-2" />
                            Print Report
                        </button>
                    </div>
                </div>
                {/* Hidden Title for Printing */}
                <h1 className="hidden print-title">
                    {assessment.title} - Responses Report
                </h1>


                {/* Delete Confirmation Modal (add print-hide class) */}
                {deleteModalOpen && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center print-hide">
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

                {/* Edit Response/Result Modal (add print-hide class) */}
                {isEditing && (editResponseId || editResultId) && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center print-hide">
                        <div className="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                            <div className="flex justify-between items-center border-b pb-3 mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Edit {editResponseId ? 'Response' : 'Result'} Details
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
                            
                            {/* Modal Content */}
                            <div className="max-h-[calc(100vh-200px)] overflow-y-auto py-2">
                                {editResponseId && editingResponse && (
                                    <div className="space-y-4">
                                        {/* Survey Response Edit Fields */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                                <input 
                                                    type="text" 
                                                    value={editingResponse.participantName || ''} 
                                                    onChange={(e) => handleResponseChange('participantName', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <input 
                                                    type="email" 
                                                    value={editingResponse.participantEmail || ''} 
                                                    onChange={(e) => handleResponseChange('participantEmail', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                                <input 
                                                    type="text" 
                                                    value={editingResponse.participantDepartment || ''} 
                                                    onChange={(e) => handleResponseChange('participantDepartment', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                                <input 
                                                    type="text" 
                                                    value={editingResponse.participantDesignation || ''} 
                                                    onChange={(e) => handleResponseChange('participantDesignation', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Centre</label>
                                                {/* Consider making this a dropdown if centers are predefined */}
                                                <input 
                                                    type="text" 
                                                    value={editingResponse.participantCentre || ''} 
                                                    onChange={(e) => handleResponseChange('participantCentre', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="e.g., Delhi, Mumbai"
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Only show feedback if it exists */}
                                        {editingResponse.additionalFeedback !== undefined && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Feedback</label>
                                                <textarea 
                                                    value={editingResponse.additionalFeedback || ''} 
                                                    onChange={(e) => handleResponseChange('additionalFeedback', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                    rows="3"
                                                />
                                            </div>
                                        )}
                                        {/* Display non-editable fields */}
                                        <div className="mt-4 pt-4 border-t">
                                            <p className="text-sm text-gray-500">Submitted: {new Date(editingResponse.submittedAt).toLocaleString()}</p>
                                            {/* Add other non-editable info if needed */}
                                        </div>
                                    </div>
                                )}

                                {editResultId && editingResult && (
                                    <div className="space-y-4">
                                        {/* Quiz Result Edit Fields (Participant Details) */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                                <input 
                                                    type="text" 
                                                    value={editingResult.participant.name || ''} 
                                                    onChange={(e) => handleResultParticipantChange('name', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <input 
                                                    type="email" 
                                                    value={editingResult.participant.email || ''} 
                                                    onChange={(e) => handleResultParticipantChange('email', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                                <input 
                                                    type="text" 
                                                    value={editingResult.participant.department || ''} 
                                                    onChange={(e) => handleResultParticipantChange('department', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                                <input 
                                                    type="text" 
                                                    value={editingResult.participant.designation || ''} 
                                                    onChange={(e) => handleResultParticipantChange('designation', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Centre</label>
                                                {/* Consider making this a dropdown */}
                                                <input 
                                                    type="text" 
                                                    value={editingResult.participant.centre || ''} 
                                                    onChange={(e) => handleResultParticipantChange('centre', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="e.g., Delhi, Mumbai"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                                                {/* Consider making this a dropdown */}
                                                <input 
                                                    type="text" 
                                                    value={editingResult.participant.experience || ''} 
                                                    onChange={(e) => handleResultParticipantChange('experience', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="e.g., Beginner, Intermediate"
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Display non-editable fields */}
                                        <div className="mt-4 pt-4 border-t">
                                            <p className="text-sm font-medium text-gray-700 mb-1">
                                                Total Score: <span className="font-bold">{editingResult.totalScore}%</span>
                                            </p>
                                            <p className="text-sm text-gray-500">Completed: {new Date(editingResult.completedAt).toLocaleString()}</p>
                                            {/* Add other non-editable info if needed */}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Modal Actions */}
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
                                    className={`px-4 py-2 text-white text-sm font-medium rounded-md flex items-center justify-center transition-colors ${
                                        isSaving 
                                            ? 'bg-blue-400 cursor-not-allowed' 
                                            : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
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

                {/* Display selected filter for print */}
                {centerFilter && (
                    <div className="hidden print-filter-display">
                        Report Filtered By Center: {getStandardizedCenterName(centerFilter)}
                    </div>
                )}

                <div id="analytics" className="mb-10 section-break print:mt-0 print:pt-0 print:border-none">
                    <h2 className="text-2xl font-semibold text-slate-800 mb-6">Response Analytics</h2>
                    {/* AnalyticsSection might need internal print adjustments if it uses complex JS charts */}
                    <AnalyticsSection assessmentId={id} />
                </div>

                {assessment.assessmentType === 'survey' && calculateSurveyMetrics && (
                    <div id="survey-metrics" className="mb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 section-break">
                        {/* Survey Overview Stats */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Response Rate</h3>
                            <div className="text-3xl font-bold text-blue-600 mb-2">
                                {calculateSurveyMetrics.totalResponses}
                            </div>
                            <div className="text-sm text-gray-600">
                                Total Responses
                            </div>
                            <div className="mt-4 flex items-center">
                                <div className="text-sm font-medium text-gray-600">Completion Rate</div>
                                <div className="ml-auto text-sm font-semibold text-blue-600">
                                    {calculateSurveyMetrics.averageCompletionRate.toFixed(1)}%
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Engagement Score</h3>
                            <div className="text-3xl font-bold text-green-600 mb-2">
                                {calculateSurveyMetrics.averageLikertScore.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600">
                                Average Likert Score (1-5)
                            </div>
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
                                {calculateSurveyMetrics.questionScores.slice(0, 3).map((score, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-700 truncate mb-1">
                                                {score.question}
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
                )}

                {/* Centers Performance Summary */}
                {centerStats.length > 1 && (
                    <div id="center-performance" className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-10 section-break">
                        <h2 className="text-xl font-semibold text-slate-800 mb-6">Centers Performance Summary</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {centerStats.map((center, index) => {
                                // Use the pre-calculated standardized displayName
                                const displayCenterName = center.displayName; 

                                return (
                                    <div key={index} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 bg-gray-50/50">
                                        <div className="flex items-center mb-3">
                                            {/* Use nameKey for color, displayName for text */}
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCentreColor(center.nameKey)}`}>
                                                <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                                                {displayCenterName} 
                                            </span>
                                            <span className="text-sm text-gray-600 ml-2">{center.count} {assessment.assessmentType === 'survey' ? 'responses' : 'participants'}</span>
                                        </div>
                                        
                                        {assessment.assessmentType === 'survey' ? (
                                            // Survey-specific display: Just show count and actions
                                            <div className="flex justify-between items-center mt-3">
                                                <button 
                                                    onClick={() => setCenterFilter(center.nameKey)} 
                                                    title={`Filter responses by ${displayCenterName}`}
                                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium print-hide transition-colors"
                                                >
                                                    View Responses
                                                </button>
                                                <button 
                                                    onClick={() => downloadCenterReport(center.nameKey)} 
                                                    title={`Export ${displayCenterName} report as CSV`}
                                                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center print-hide transition-colors"
                                                >
                                                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> {/* Slightly smaller icon */}
                                                    Export
                                                </button>
                                            </div>
                                        ) : (
                                            // Quiz-specific display: Show scores and performance
                                            <>
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
                                                                            <span className="font-medium">{participant.score}%</span>
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center mt-3">
                                                    <button 
                                                        onClick={() => setCenterFilter(center.nameKey)} 
                                                        title={`Filter results by ${displayCenterName}`}
                                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium print-hide transition-colors"
                                                    >
                                                        View Details
                                                    </button>
                                                    <button 
                                                        onClick={() => downloadCenterReport(center.nameKey)} 
                                                        title={`Export ${displayCenterName} report as CSV`}
                                                        className="text-sm text-gray-600 hover:text-gray-800 flex items-center print-hide transition-colors"
                                                    >
                                                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> {/* Slightly smaller icon */}
                                                        Export
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                        
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div id="question-breakdown" className="space-y-8 mb-12 section-break">
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-6 border-b pb-4">
                        <h2 className="text-2xl font-semibold text-slate-800">Question Breakdown</h2>
                        
                        {availableCenters.length > 0 && (
                            <div className="flex items-center gap-2 print-hide"> {/* Hide filter dropdown for print */}
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
                                {centerFilter && (
                                    <button 
                                        onClick={() => setCenterFilter('')} 
                                        title="Clear center filter"
                                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                )}
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
                        <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 print:shadow-none print:border print:border-gray-200 print:p-4 print:mb-4">
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
                                        <div className="w-24 flex-shrink-0 text-sm font-medium text-gray-700 text-right print:text-black">{stat.option}</div>
                                        <div className="flex-1">
                                            {/* Simplified bar for print */}
                                            <div className="h-5 bg-gray-200 rounded-full overflow-hidden relative print:border print:border-gray-300 print:bg-white print:h-3">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ease-out ${responseColors[stat.option] || 'bg-blue-600'} print:bg-gray-500`}
                                                    style={{ width: `${stat.percentage}%` }}
                                                />
                                                {/* Show percentage text next to bar for print */}
                                                <span className="hidden print:inline-block ml-2 text-xs font-semibold">{stat.percentage}%</span>
                                            </div>
                                        </div>
                                        <div className="w-16 flex-shrink-0 text-sm text-gray-600 text-right print:text-black tabular-nums">{stat.count}</div>
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
                                            // Use nameKey for calculation consistency
                                            const centerQuestionStats = calculateResponseStats(index, center.nameKey); 
                                            const correctPercentage = centerQuestionStats.find(s => s.option === 'Correct')?.percentage || 0;
                                            return (
                                                <div key={centerIdx} className="border border-gray-100 rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        {/* Use nameKey for color, displayName for text */}
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCentreColor(center.nameKey)}`}>
                                                            {center.displayName} 
                                                        </span>
                                                        <span className={`text-sm font-semibold ${correctPercentage >= (assessment.passingScore || 70) ? 'text-green-600' : 'text-red-600'}`}>
                                                            {correctPercentage}% correct
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${correctPercentage >= (assessment.passingScore || 70) ? 'bg-green-500' : 'bg-red-500'}`}
                                                            style={{ width: `${correctPercentage}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {centerQuestionStats.find(s => s.option === 'Correct')?.count || 0} of {center.count} participants answered correctly
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
                                            // Filter out responses not matching the center filter (using normalized names)
                                            if (centerFilter && normalizeCentreName(response.participantCentre) !== centerFilter) {
                                                return null;
                                            }
                                            const comment = response.responses[index]?.comments;
                                            if (!comment) return null;
                                            return (
                                                <div key={respIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                                    <p className="text-sm text-gray-700 italic">"{comment}"</p>
                                                    <p className="text-xs text-gray-500 mt-2 text-right">
                                                        - {response.participantName} ({getStandardizedCenterName(response.participantCentre) || 'N/A'})
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

                <div id="individual-responses" className="mt-12 section-break">
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-6 border-b pb-4">
                        <h2 className="text-2xl font-semibold text-slate-800">Individual Responses</h2>
                        
                        <div className="flex items-center gap-4 print-hide"> {/* Hide controls for print */}
                            {availableCenters.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <select
                                            value={centerFilter}
                                            onChange={(e) => setCenterFilter(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">All Centers</option>
                                            {availableCenters.map(center => (
                                                <option key={center} value={center}>
                                                    {getStandardizedCenterName(center)}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                                        </div>
                                    </div>
                                    {centerFilter && (
                                        <button 
                                            onClick={() => setCenterFilter('')} 
                                            title="Clear center filter"
                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                        >
                                            <XMarkIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            )}
                            
                            {/* Sort Controls */}
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

                    {((assessment.assessmentType === 'survey' && sortedResponses.length > 0) || 
                      (assessment.assessmentType !== 'survey' && sortedResponses.length > 0)) ? ( // Check sortedResponses length
                        <div className="space-y-4"> {/* Reduced spacing */}
                            {assessment.assessmentType === 'survey' ? (
                                // Survey Responses
                                sortedResponses.map((response, index) => (
                                    <details key={response._id || index} className="bg-white rounded-lg shadow-md overflow-hidden group print:shadow-none print:border print:border-gray-200 print:mb-4 transition-shadow hover:shadow-lg">
                                        {/* Refined Summary */}
                                        <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors list-none print:p-0 print:cursor-default print:border-b print:border-gray-200 print:pb-2 print:mb-2">
                                            <div className="flex items-start gap-3">
                                                {/* ... existing participant info ... */}
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
                                                {/* Edit/Delete Buttons */}
                                                <div className="flex space-x-1 print-hide">
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); handleEditResponse(response); }}
                                                        className="p-1.5 text-blue-600 hover:text-blue-800 transition-colors rounded-full hover:bg-blue-50"
                                                        title="Edit Response"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); confirmDelete(response._id, 'response'); }}
                                                        className="p-1.5 text-red-600 hover:text-red-800 transition-colors rounded-full hover:bg-red-50"
                                                        title="Delete Response"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                {/* Date and Expand Icon */}
                                                <span className="text-xs text-gray-500 print-hide">
                                                    {new Date(response.submittedAt).toLocaleDateString()}
                                                </span>
                                                <svg className="h-5 w-5 text-gray-400 group-open:rotate-90 transform transition-transform duration-200 print-hide" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </summary>
                                        {/* Ensure content div is styled for print */}
                                        <div className="px-5 pb-5 border-t border-gray-100 print:px-0 print:pb-0 print:border-none">
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
                            ) : ( // Quiz Results
                                sortedResponses.map((result, index) => (
                                    <details key={result._id || index} className="bg-white rounded-lg shadow-md overflow-hidden group print:shadow-none print:border print:border-gray-200 print:mb-4 transition-shadow hover:shadow-lg">
                                        {/* Refined Summary */}
                                        <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors list-none print:p-0 print:cursor-default print:border-b print:border-gray-200 print:pb-2 print:mb-2">
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
                                                {/* Edit/Delete Buttons */}
                                                <div className="flex space-x-1 print-hide">
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); handleEditResult(result); }}
                                                        className="p-1.5 text-blue-600 hover:text-blue-800 transition-colors rounded-full hover:bg-blue-50"
                                                        title="Edit Result"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); confirmDelete(result._id, 'result'); }}
                                                        className="p-1.5 text-red-600 hover:text-red-800 transition-colors rounded-full hover:bg-red-50"
                                                        title="Delete Result"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                {/* Score/Date and Expand Icon */}
                                                <div className="flex flex-col items-end print-hide">
                                                    <span className={`text-lg font-semibold ${result.totalScore >= (assessment.passingScore || 70) ? 'text-green-600' : 'text-red-600'}`}>
                                                        {result.totalScore}% 
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(result.completedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <svg className="h-5 w-5 text-gray-400 group-open:rotate-90 transform transition-transform duration-200 print-hide" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </summary>
                                        {/* Ensure content div is styled for print */}
                                        <div className="px-5 pb-5 border-t border-gray-100 print:px-0 print:pb-0 print:border-none">
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
                        // Refined Empty State
                        <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm border border-dashed border-gray-200">
                            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-slate-700">No Responses Found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {centerFilter 
                                    ? `No responses match the filter "${getStandardizedCenterName(centerFilter)}".`
                                    : (assessment.assessmentType === 'survey' 
                                        ? 'Responses will appear here once participants complete the survey.'
                                        : 'Results will appear here once participants complete the quiz.')
                                }
                            </p>
                            {centerFilter && (
                                <button 
                                    onClick={() => setCenterFilter('')}
                                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Clear Filter
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}