import React from 'react';
import { scoreRanges } from '../data/creditData';

const ScoreHistory = ({ score, creditHistory = [] }) => {
  // Use real credit history data if available, otherwise show empty state
  const historyData = creditHistory.length > 0 ? creditHistory.map(item => ({
    month: new Date(item.date).toLocaleString('default', { month: 'short' }),
    year: new Date(item.date).getFullYear(),
    score: item.score || 0
  })) : [];
  const maxScore = Math.max(...historyData.map(item => item.score));
  
  return (
    <div className="bg-white dark:bg-black rounded-2xl shadow-xl p-6 transition-colors duration-200">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
        <i className="fas fa-chart-bar text-purple-500 dark:text-purple-400 mr-2"></i>
        Score History
      </h2>
      
      {historyData.length > 0 ? (
        <div className="h-64 flex items-end space-x-2">
          {historyData.map((item, index) => {
            const height = maxScore > 650 ? ((item.score - 650) / (maxScore - 650)) * 100 : 50;
            const colorClass = scoreRanges.find(range => 
              item.score >= parseInt(range.range.split('-')[0]) && 
              item.score <= parseInt(range.range.split('-')[1])
            )?.color || 'bg-blue-500';
            
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className={`w-full ${colorClass} rounded-t history-bar transition-all duration-200`}
                  style={{ height: `${height}%` }}
                ></div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {item.month}
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300 font-medium mt-1">
                  {item.score}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">📊</div>
            <p>No credit history data available</p>
            <p className="text-sm">Upload your credit data to see your score history</p>
          </div>
        </div>
      )}
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 dark:bg-dark-secondary rounded-lg transition-colors duration-200">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <i className="fas fa-trophy text-yellow-500 mr-2"></i>
            Highest Score
          </div>
          <div className="text-xl font-bold text-gray-800 dark:text-gray-200">
            {historyData.length > 0 ? Math.max(...historyData.map(item => item.score)) : '─'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {historyData.length > 0 ? 'Available' : 'No data'}
          </div>
        </div>
        <div className="border-l-4 border-green-500 pl-4 py-2 bg-gray-50 dark:bg-dark-secondary rounded-lg transition-colors duration-200">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <i className="fas fa-trend-up text-green-500 mr-2"></i>
            Score Trend
          </div>
          <div className="text-xl font-bold text-green-600 dark:text-green-400">
            {historyData.length > 1 ? 
              `${historyData[historyData.length - 1].score - historyData[0].score > 0 ? '+' : ''}${historyData[historyData.length - 1].score - historyData[0].score} points` : 
              '─'
            }
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {historyData.length > 1 ? 'over time period' : 'No trend data'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreHistory;