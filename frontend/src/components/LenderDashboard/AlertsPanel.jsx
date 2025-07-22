import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Bell, AlertTriangle } from 'lucide-react';

const AlertsPanel = ({ alerts }) => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle>Alerts & Monitoring</CardTitle>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {alerts.length > 0 ? alerts.map((alert, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className={`p-2 rounded-full mt-1 ${alert.type === 'critical' ? 'bg-red-100' : 'bg-yellow-100'}`}>
              <AlertTriangle className={`h-4 w-4 ${alert.type === 'critical' ? 'text-red-600' : 'text-yellow-600'}`} />
            </div>
            <div>
              <h4 className="font-medium">{alert.title}</h4>
              <p className="text-sm text-muted-foreground">{alert.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
            </div>
          </div>
        )) : (
          <div className="text-center py-4 text-muted-foreground">
            No alerts at this time
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default AlertsPanel; 