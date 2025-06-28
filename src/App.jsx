import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const App = () => {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
  const fetchData = async () => {
    try {
      setIsLoading(true)
      const res = await axios.get('/api/credit-score')
      console.log('✅ Credit score API response:', res.data)
      setData(res.data)
    } catch (err) {
      console.error('❌ Failed to fetch credit score:', err)
      setError('Failed to load credit score data.')
    } finally {
      setIsLoading(false)
    }
  }
  fetchData()
}, [])


  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
          <p className="font-bold">No Data Available</p>
          <p>Unable to load credit score information.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Credit Score Dashboard</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
        {/* Score Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700">Current Score</h2>
            <p className="text-4xl font-bold text-blue-600">{data.score}</p>
          </div>
          <div className={`p-4 rounded-lg ${
            data.status.toLowerCase().includes('good') 
              ? 'bg-green-50' 
              : 'bg-yellow-50'
          }`}>
            <h2 className="text-lg font-semibold text-gray-700">Status</h2>
            <p className={`text-2xl font-bold ${
              data.status.toLowerCase().includes('good') 
                ? 'text-green-600' 
                : 'text-yellow-600'
            }`}>
              {data.status}
            </p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-800">Recommendations</h2>
          <ul className="list-disc pl-6 space-y-1">
            {data.recommendations.map((item, idx) => (
              <li key={idx} className="text-gray-700">{item}</li>
            ))}
          </ul>
        </div>

        {/* History Chart */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-800">Score History</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#6b7280' }} 
                  axisLine={{ stroke: '#9ca3af' }}
                />
                <YAxis 
                  tick={{ fill: '#6b7280' }} 
                  axisLine={{ stroke: '#9ca3af' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e5e7eb',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  name="Credit Score"
                  stroke="#4f46e5" 
                  strokeWidth={2} 
                  dot={{ r: 4, fill: '#4f46e5' }}
                  activeDot={{ r: 6, fill: '#6366f1' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App