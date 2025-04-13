import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import axios from 'axios';
import { 
    UserGroupIcon, 
    BuildingOfficeIcon, 
    AcademicCapIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { normalizeCentreName, getStandardizedCenterName } from '../utils/helpers'; // Import helpers

export default function AnalyticsSection({ assessmentId }) {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, [assessmentId]);

    const fetchAnalytics = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const response = await axios.get(
                `${import.meta.env.VITE_API_URL}/api/assessment/${assessmentId}/analytics`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setAnalytics(response.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Process and aggregate centre stats using normalization
    const processedCentreStats = useMemo(() => {
        if (!analytics?.centreStats) return {};

        const aggregatedStats = {};

        Object.entries(analytics.centreStats).forEach(([originalName, stats]) => {
            const normalizedKey = normalizeCentreName(originalName);
            const displayName = getStandardizedCenterName(originalName); // Get display name based on normalized key

            if (!aggregatedStats[normalizedKey]) {
                aggregatedStats[normalizedKey] = {
                    displayName: displayName, // Store the display name
                    count: 0,
                    totalScore: 0, // Keep track of total score for averaging
                    hasScore: stats.avgScore !== undefined, // Check if this group has scores
                };
            }

            aggregatedStats[normalizedKey].count += stats.count;
            if (stats.avgScore !== undefined) {
                // Weight the average score by the count for accurate aggregation
                aggregatedStats[normalizedKey].totalScore += (stats.avgScore * stats.count);
            }
        });

        // Calculate final average scores and format for StatCard
        const finalStats = {};
        Object.entries(aggregatedStats).forEach(([key, aggregated]) => {
            const avgScore = aggregated.hasScore && aggregated.count > 0 
                ? Math.round(aggregated.totalScore / aggregated.count) 
                : undefined;
            
            finalStats[aggregated.displayName] = { // Use displayName as the key for the StatCard
                count: aggregated.count,
                avgScore: avgScore,
            };
        });

        // Sort by display name for consistent order
        return Object.entries(finalStats)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});

    }, [analytics]);

    if (loading) {
        return <div className="text-center py-8">Loading analytics...</div>;
    }

    if (error || !analytics) {
        return <div className="text-center py-8 text-red-600">Failed to load analytics data</div>;
    }

    const StatCard = ({ icon: Icon, title, stats }) => (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            </div>
            <div className="space-y-4">
                {Object.entries(stats).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-700">{key}</p>
                            <p className="text-xs text-gray-500">
                                {value.count} {value.count === 1 ? 'response' : 'responses'}
                            </p>
                        </div>
                        {value.avgScore !== undefined && (
                            <div className="text-right">
                                <p className="text-sm font-medium text-blue-600">
                                    {value.avgScore}% 
                                </p>
                                <p className="text-xs text-gray-500">avg score</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const TimeStatCard = ({ title, stats, type }) => {
        // Sort and format time-based stats
        const sortedStats = Object.entries(stats).sort((a, b) => {
            if (type === 'hourly') {
                return parseInt(a[0]) - parseInt(b[0]);
            }
            return new Date(b[0]) - new Date(a[0]);
        });

        return (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <ClockIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
                </div>
                <div className="space-y-2">
                    {sortedStats.map(([timeKey, count]) => (
                        <div key={timeKey} className="flex justify-between items-center">
                            <span className="text-sm text-slate-700">
                                {type === 'hourly' 
                                    ? `${timeKey}:00 - ${timeKey}:59`
                                    : timeKey}
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="h-2 bg-blue-100 rounded-full" 
                                    style={{ 
                                        width: `${Math.max(20, (count / Math.max(...Object.values(stats)) * 100))}px`
                                    }} 
                                />
                                <span className="text-sm text-gray-600">{count}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    icon={BuildingOfficeIcon}
                    title="Responses by Centre"
                    stats={processedCentreStats} // Use processed stats
                />
                <StatCard 
                    icon={UserGroupIcon}
                    title="Responses by Department"
                    stats={analytics.departmentStats}
                />
                <StatCard 
                    icon={AcademicCapIcon}
                    title="Responses by Experience"
                    stats={analytics.experienceStats}
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <TimeStatCard 
                    title="Hourly Activity"
                    stats={analytics.timeStats.hourly}
                    type="hourly"
                />
                <TimeStatCard 
                    title="Daily Activity"
                    stats={analytics.timeStats.daily}
                    type="daily"
                />
                <TimeStatCard 
                    title="Monthly Activity"
                    stats={analytics.timeStats.monthly}
                    type="monthly"
                />
            </div>
        </div>
    );
}
