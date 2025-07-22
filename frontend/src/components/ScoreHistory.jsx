import React from 'react';
import { scoreRanges } from '../data/creditData';

const ScoreHistory = ({ score = 700 }) => {  // Default score of 700 if undefined
  // Generate historical data for the past 12 months
  const generateHistory = () => {
    const history = [];
    const now = new Date();
    const currentScore = Number(score) || 700; // Ensure score is a number
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(now.getMonth() - i);
      
      // Generate a score that fluctuates around the current score
      const monthScore = currentScore + Math.floor(Math.random() * 40) - 20;
      
      history.push({
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        score: Math.max(300, Math.min(monthScore, 850)) // Using standard credit score range
      });
    }
    
    return history;
  };
  
  const historyData = generateHistory();
  const maxScore = Math.max(...historyData.map(item => item.score));
  
  return (
    <div className="bg-white dark:bg-black rounded-2xl shadow-xl p-6 transition-colors duration-200">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
        <i className="fas fa-chart-bar text-purple-500 dark:text-purple-400 mr-2"></i>
        Score History
      </h2>
      
      <div className="h-64 flex items-end space-x-2">
        {historyData.map((item, index) => {
          const height = ((item.score - 650) / (maxScore - 650)) * 100;
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
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 dark:bg-dark-secondary rounded-lg transition-colors duration-200">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <i className="fas fa-trophy text-yellow-500 mr-2"></i>
            Highest Score
          </div>
          <div className="text-xl font-bold text-gray-800 dark:text-gray-200">786</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">3 months ago</div>
        </div>
        <div className="border-l-4 border-green-500 pl-4 py-2 bg-gray-50 dark:bg-dark-secondary rounded-lg transition-colors duration-200">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <i className="fas fa-trend-up text-green-500 mr-2"></i>
            Score Trend
          </div>
          <div className="text-xl font-bold text-green-600 dark:text-green-400">+46 points</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">in last 6 months</div>
        </div>
      </div>
    </div>
  );
};

export default ScoreHistory;