import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Navigation from '../components/Navigation';
import { UserCircleIcon, ChatBubbleLeftEllipsisIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function AssessmentResponses() {
    const { id } = useParams();
    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAssessment();
    }, [id]);

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
    };

    const calculateResponseStats = (questionIndex) => {
        if (assessment.assessmentType === 'survey') {
            const responses = assessment.responses.map(r => r.responses[questionIndex]?.response);
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
            const answers = assessment.results.map(r => r.answers[questionIndex]);
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            <Navigation />
            <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <div className="mb-10">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">{assessment.title}</h1>
                    <p className="text-gray-600 text-base">{assessment.description}</p>
                    {assessment.assessmentType !== 'survey' && (
                        <div className="mt-2 text-sm text-blue-600">
                            Type: Quiz {assessment.timeLimit && `• Time Limit: ${assessment.timeLimit} minutes`}
                            {assessment.passingScore && ` • Passing Score: ${assessment.passingScore}%`}
                        </div>
                    )}
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

                <div className="space-y-8 mb-12">
                    <h2 className="text-2xl font-semibold text-slate-800 mb-6 border-b pb-3">Question Breakdown</h2>
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
                                {calculateResponseStats(index).map((stat, statIndex) => (
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

                            {assessment.assessmentType === 'survey' && question.allowComments && 
                             assessment.responses.some(r => r.responses[index]?.comments) && (
                                <div className="mt-8 pt-5 border-t border-gray-200">
                                    <h4 className="text-base font-semibold text-slate-700 mb-4 flex items-center">
                                        <ChatBubbleLeftEllipsisIcon className="h-5 w-5 mr-2 text-gray-400"/>
                                        Comments
                                    </h4>
                                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                        {assessment.responses.map((response, respIndex) => {
                                            const comment = response.responses[index]?.comments;
                                            if (!comment) return null;
                                            return (
                                                <div key={respIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                                    <p className="text-sm text-gray-700 italic">"{comment}"</p>
                                                    <p className="text-xs text-gray-500 mt-2 text-right">
                                                        - {response.participantName} ({response.participantDepartment})
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
                    <h2 className="text-2xl font-semibold text-slate-800 mb-6 border-b pb-3">Individual Responses</h2>
                    {((assessment.assessmentType === 'survey' && assessment.responses.length > 0) || 
                      (assessment.assessmentType !== 'survey' && assessment.results.length > 0)) ? (
                        <div className="space-y-6">
                            {assessment.assessmentType === 'survey' ? (
                                // Survey Responses
                                assessment.responses.map((response, index) => (
                                    <details key={index} className="bg-white rounded-lg shadow-md overflow-hidden group">
                                        <summary className="flex justify-between items-center p-5 cursor-pointer hover:bg-gray-50 transition-colors">
                                            <div>
                                                <h3 className="text-base font-semibold text-slate-800">
                                                    {response.participantName}
                                                    <span className="text-sm font-normal text-gray-500 ml-2">
                                                        ({response.participantDesignation})
                                                    </span>
                                                </h3>
                                                <p className="text-sm text-gray-600">{response.participantDepartment}</p>
                                            </div>
                                            <span className="text-sm text-gray-500 group-open:rotate-90 transform transition-transform duration-200">▼</span>
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
                            ) : (
                                // Quiz Results
                                assessment.results.map((result, index) => (
                                    <details key={index} className="bg-white rounded-lg shadow-md overflow-hidden group">
                                        <summary className="flex justify-between items-center p-5 cursor-pointer hover:bg-gray-50 transition-colors">
                                            <div>
                                                <h3 className="text-base font-semibold text-slate-800">
                                                    {result.participant.name}
                                                    <span className="text-sm font-normal text-gray-500 ml-2">
                                                        ({result.participant.experience})
                                                    </span>
                                                </h3>
                                                <p className="text-sm text-gray-600">{result.participant.email}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-lg font-semibold text-blue-600">
                                                    Score: {result.totalScore}%
                                                </span>
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