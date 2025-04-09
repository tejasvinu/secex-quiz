import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Navigation from '../components/Navigation';

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
                `${import.meta.env.VITE_API_URL}/api/assessment/${id}`,
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
        const responses = assessment.responses.map(r => r.responses[questionIndex]?.response);
        const totalResponses = responses.filter(r => r).length;
        const stats = {};
        
        responses.forEach(response => {
            if (response) {
                stats[response] = (stats[response] || 0) + 1;
            }
        });

        const options = ['No', 'Little', 'Somewhat', 'Mostly', 'Completely'];
        return options.map(option => ({
            option,
            count: stats[option] || 0,
            percentage: totalResponses ? Math.round((stats[option] || 0) / totalResponses * 100) : 0
        }));
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
        <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">{assessment.title}</h1>
                    <p className="text-gray-600">{assessment.description}</p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold text-slate-800 mb-4">Response Summary</h2>
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {assessment.responses.length} total responses
                        </span>
                    </div>
                </div>

                <div className="space-y-8">
                    {assessment.questions.map((question, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-md p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">
                                {index + 1}. {question.question}
                            </h3>

                            <div className="space-y-4">
                                {calculateResponseStats(index).map((stat, statIndex) => (
                                    <div key={statIndex} className="flex items-center space-x-4">
                                        <div className="w-24 text-sm text-gray-600">{stat.option}</div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-600 rounded-full"
                                                    style={{ width: `${stat.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="w-24 text-sm text-gray-600">
                                            {stat.count} ({stat.percentage}%)
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {question.allowComments && (
                                <div className="mt-6">
                                    <h4 className="text-sm font-medium text-slate-700 mb-3">Comments</h4>
                                    <div className="space-y-3">
                                        {assessment.responses.map((response, respIndex) => {
                                            const comment = response.responses[index]?.comments;
                                            if (!comment) return null;
                                            return (
                                                <div key={respIndex} className="bg-gray-50 rounded-lg p-3">
                                                    <p className="text-sm text-gray-600">{comment}</p>
                                                    <p className="text-xs text-gray-400 mt-1">
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

                <div className="mt-8">
                    <h2 className="text-xl font-semibold text-slate-800 mb-4">Individual Responses</h2>
                    <div className="space-y-6">
                        {assessment.responses.map((response, index) => (
                            <div key={index} className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-medium text-slate-800 mb-2">
                                    {response.participantName} ({response.participantDesignation})
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">{response.participantDepartment}</p>

                                <div className="space-y-4">
                                    {response.responses.map((answer, answerIndex) => (
                                        <div key={answerIndex} className="bg-gray-50 p-4 rounded-lg">
                                            <h4 className="text-sm font-medium text-slate-700 mb-1">
                                                {assessment.questions[answerIndex].question}
                                            </h4>
                                            <p className="text-sm text-gray-600">Response: {answer.response}</p>
                                            {answer.comments && (
                                                <p className="text-sm text-gray-500 mt-1">Comment: {answer.comments}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {response.additionalFeedback && (
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium text-slate-700">Additional Feedback</h4>
                                        <p className="text-sm text-gray-600 mt-1">{response.additionalFeedback}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}