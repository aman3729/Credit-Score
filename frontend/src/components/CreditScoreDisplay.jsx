import React, { useState } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { FiRefreshCw, FiInfo } from 'react-icons/fi';

const CreditScoreDisplay = ({ 
  score: initialScore = 700, 
  lastUpdated = new Date().toISOString(), 
  change = 0,
  onRefresh,
  loading = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const safeScore = Math.max(300, Math.min(850, initialScore || 0));
  const safeChange = Number(change) || 0;
  const getScoreColor = (score) => {
    if (score >= 740) return '#10B981'; // Green
    if (score >= 670) return '#F59E0B'; // Yellow
    if (score >= 580) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };
  
  const getScoreColorDark = (score) => {
    if (score >= 740) return '#34D399'; // Brighter green for dark mode
    if (score >= 670) return '#FBBF24'; // Brighter yellow for dark mode
    if (score >= 580) return '#FB923C'; // Brighter orange for dark mode
    return '#F87171'; // Softer red for dark mode
  };

  const getScoreLabel = (score) => {
    if (score >= 740) return 'Excellent';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  };

  const scoreColor = document.documentElement.classList.contains('dark') 
    ? getScoreColorDark(safeScore) 
    : getScoreColor(safeScore);
  const scoreLabel = getScoreLabel(safeScore);
  const isPositiveChange = safeChange > 0;
  const changeText = safeChange > 0 ? `+${safeChange}` : safeChange.toString();

  const handleRefreshClick = async () => {
    if (onRefresh && typeof onRefresh === 'function') {
      await onRefresh();
    }
  };

  return (
    <div className="bg-white dark:bg-black p-6 rounded-xl shadow-sm transition-colors duration-200">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Credit Score</h2>
          <div 
            className="ml-2 relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <FiInfo className="w-4 h-4 text-gray-400 cursor-help" />
            {isHovered && (
              <div className="absolute z-10 w-64 p-3 mt-2 text-sm text-gray-700 dark:text-gray-300 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-black dark:text-gray-300 dark:border-gray-600">
                <p>Your credit score is calculated based on multiple factors including payment history, credit utilization, and more.</p>
              </div>
            )}
          </div>
        </div>
        <button 
          onClick={handleRefreshClick}
          disabled={loading}
          className={`text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-200 ${loading ? 'animate-spin' : ''}`}
          title="Refresh score"
        >
          <FiRefreshCw className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex flex-col items-center py-4">
        <div className="relative w-48 h-48 mb-2">
          <CircularProgressbar
            value={safeScore}
            maxValue={850}
            minValue={300}
            text=""
            strokeWidth={8}
            styles={{
              path: {
                stroke: scoreColor,
                strokeLinecap: 'round',
                transition: 'stroke-dashoffset 0.8s ease 0s',
              },
              trail: {
                stroke: '#e5e7eb',
                strokeLinecap: 'round',
              },
              background: {
                fill: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
              },
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : safeScore}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {scoreLabel} Credit
            </span>
            {safeChange !== 0 && (
              <div className="flex items-center justify-center mt-1">
                <span 
                  className={`text-sm font-medium ${
                    isPositiveChange 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {isPositiveChange ? '↑' : '↓'} {Math.abs(safeChange)} points
                </span>
              </div>
            )}
            {safeChange === 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">No change</span>
            )}
          </div>
        </div>
        
        <div className="w-full mt-4 space-y-2">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>300</span>
            <span className="text-xs font-medium">Your score: {safeScore}</span>
            <span>850</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-out" 
              style={{
                width: `${((safeScore - 300) / (850 - 300)) * 100}%`,
                backgroundColor: scoreColor,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Poor</span>
            <span>Excellent</span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {new Date(lastUpdated).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </p>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Score Breakdown</h3>
        <div className="space-y-2">
          {[
            { label: 'Payment History', value: '95%', color: 'bg-green-500' },
            { label: 'Credit Usage', value: '30%', color: 'bg-blue-500' },
            { label: 'Credit Age', value: '5yrs', color: 'bg-yellow-500' },
            { label: 'Credit Mix', value: '3', color: 'bg-purple-500' },
            { label: 'New Credit', value: '1', color: 'bg-red-500' },
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
              <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(CreditScoreDisplay);
