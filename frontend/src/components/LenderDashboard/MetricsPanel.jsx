import React from 'react';
import { Card, CardContent } from '../ui/card';
import { TrendingUp, FileText, BarChart4 } from 'lucide-react';

const MetricsPanel = ({ dashboardMetrics, totalLoans, approvalRate }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <Card className="dark:bg-[#18191a] border-emerald-200 dark:border-emerald-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Approval Rate</h4>
            <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">
              {approvalRate}%
            </p>
          </div>
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
            <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </CardContent>
    </Card>
    <Card className="dark:bg-[#18191a] border-blue-200 dark:border-blue-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Applications</h4>
            <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">
              {totalLoans}
            </p>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </CardContent>
    </Card>
    <Card className="dark:bg-[#18191a] border-purple-200 dark:border-purple-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300">Efficiency Score</h4>
            <p className="text-3xl font-bold text-purple-800 dark:text-purple-200">
              {totalLoans > 0 ? Math.round((dashboardMetrics.approvedLoans / totalLoans) * 100) : 0}
            </p>
          </div>
          <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
            <BarChart4 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default MetricsPanel; 