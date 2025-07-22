import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import DecisionBadge from './DecisionBadge.jsx';

const RecentDecisionsPanel = ({ recentDecisions }) => (
  <Card>
    <CardHeader>
      <CardTitle>Recent Decisions</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {recentDecisions.length > 0 ? recentDecisions.map((decision, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <h4 className="font-medium">{decision.user?.name || 'Unknown User'}</h4>
              <p className="text-sm text-muted-foreground">
                {decision.user?.email || 'No email'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DecisionBadge decision={decision.lendingDecision?.decision || 'Review'} />
            </div>
          </div>
        )) : (
          <div className="text-center py-4 text-muted-foreground">
            No recent decisions
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default RecentDecisionsPanel; 