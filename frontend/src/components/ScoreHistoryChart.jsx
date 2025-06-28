import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Score: <span className="font-medium">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const ScoreHistoryChart = ({ data }) => {
  // Find the highest and current scores for highlighting
  const highestScore = Math.max(...data.map(item => item.score));
  const currentScore = data[data.length - 1]?.score;
  const firstScore = data[0]?.score;
  const scoreChange = currentScore - firstScore;
  const isPositiveChange = scoreChange >= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Score History</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">Your Score</span>
          </div>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" strokeOpacity={0.1} />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 12 }}
            />
            <YAxis 
              domain={['dataMin - 50', 'dataMax + 50']}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickFormatter={(value) => value}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#6366F1"
              strokeWidth={2}
              dot={{
                stroke: '#6366F1',
                strokeWidth: 2,
                fill: '#fff',
                r: 4,
                strokeDasharray: ''
              }}
              activeDot={{
                r: 6,
                stroke: '#fff',
                strokeWidth: 2,
                fill: '#6366F1'
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Current Score</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{currentScore}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Highest Score</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{highestScore}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Change (12 mo)</p>
          <p className={`text-xl font-semibold ${isPositiveChange ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isPositiveChange ? '+' : ''}{scoreChange} pts
          </p>
        </div>
      </div>
    </div>
  );
};

export default ScoreHistoryChart;
