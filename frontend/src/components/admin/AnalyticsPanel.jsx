import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

const AnalyticsPanel = ({ analyticsData, loading, error, onRefresh }) => (
  <Card className="border border-[#1a4a38]">
    <CardHeader>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-gray-900 dark:text-white">Analytics Dashboard</CardTitle>
          <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
            Comprehensive insights into credit performance
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={onRefresh}
            className="border-[#2196f3] text-[#2196f3] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]"
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[200px]">
          <div className="animate-spin h-12 w-12 border-t-4 border-b-4 border-[#2196f3] rounded-full mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-bold">Error:</span>
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="border border-[#1a4a38] rounded-lg p-4">
              <h3 className="font-semibold mb-4">Score Distribution</h3>
              <div className="bg-gray-100 dark:bg-[#1a4a38] h-64 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Score distribution chart visualization</span>
              </div>
            </div>
            <div className="border border-[#1a4a38] rounded-lg p-4">
              <h3 className="font-semibold mb-4">Approval Rate Trends</h3>
              <div className="bg-gray-100 dark:bg-[#1a4a38] h-64 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Approval rate trend chart visualization</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border border-[#1a4a38]">
              <CardHeader>
                <CardTitle className="text-lg">Rejection Reasons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.rejectionReasons ? Object.entries(analyticsData.rejectionReasons).map(([reason, percentage], index) => (
                    <div key={reason}>
                      <div className="flex justify-between mb-1">
                        <span>{reason}</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: ['#f44336', '#ff9800', '#ffc107', '#4caf50', '#2196f3'][index % 5]
                          }}
                        ></div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 py-8">
                      <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                      Loading rejection data...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="border border-[#1a4a38]">
              <CardHeader>
                <CardTitle className="text-lg">Score by Region</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Region</TableHead>
                      <TableHead className="text-right">Avg. Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData.regionalScores ? Object.entries(analyticsData.regionalScores).map(([region, score]) => (
                      <TableRow key={region}>
                        <TableCell>{region}</TableCell>
                        <TableCell className="text-right">{score}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-gray-500 py-4">
                          <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
                          Loading regional data...
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="border border-[#1a4a38]">
              <CardHeader>
                <CardTitle className="text-lg">Score by Occupation</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Occupation</TableHead>
                      <TableHead className="text-right">Avg. Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData.occupationScores ? Object.entries(analyticsData.occupationScores).map(([occupation, score]) => (
                      <TableRow key={occupation}>
                        <TableCell>{occupation}</TableCell>
                        <TableCell className="text-right">{score}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-gray-500 py-4">
                          <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
                          Loading occupation data...
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </CardContent>
  </Card>
);

export default AnalyticsPanel; 