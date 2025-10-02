import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge, Plus, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const SupportCenterPanel = () => (
  <Card className="border border-[#1a4a38]">
    <CardHeader>
      <CardTitle className="text-gray-900 dark:text-white">Support Center</CardTitle>
      <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
        Internal communication and ticket management
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-[#1a4a38] rounded-lg p-4">
          <h3 className="font-semibold mb-4">Active Tickets</h3>
          <div className="space-y-4">
            <div className="border-b border-[#1a4a38] pb-4">
              <div className="flex justify-between">
                <span className="font-medium">Password Reset Issue</span>
                <Badge className="bg-yellow-100 text-yellow-800">Open</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">User: emma@example.com</p>
              <p className="text-sm mt-2">User unable to reset password despite multiple attempts...</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">Assigned to: You</span>
                <span className="text-xs text-gray-500">2 days ago</span>
              </div>
            </div>
            <div className="border-b border-[#1a4a38] pb-4">
              <div className="flex justify-between">
                <span className="font-medium">Score Discrepancy</span>
                <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">User: michael@example.com</p>
              <p className="text-sm mt-2">User reports credit score different from other bureaus...</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">Assigned to: Sarah Johnson</span>
                <span className="text-xs text-gray-500">1 day ago</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between">
                <span className="font-medium">Document Upload Failure</span>
                <Badge className="bg-purple-100 text-purple-800">New</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">User: david@example.com</p>
              <p className="text-sm mt-2">User unable to upload identity verification documents...</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">Unassigned</span>
                <span className="text-xs text-gray-500">3 hours ago</span>
              </div>
            </div>
          </div>
          <Button className="w-full mt-4 bg-[#009688] hover:bg-[#00796b] text-white">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </div>
        <div className="lg:col-span-2 border border-[#1a4a38] rounded-lg p-4">
          <h3 className="font-semibold mb-4">Ticket Conversation</h3>
          <div className="border border-[#1a4a38] rounded-lg p-4 h-96 overflow-y-auto mb-4">
            <div className="space-y-4">
              <div className="flex justify-end">
                <div className="bg-[#e0f2f1] dark:bg-[#1a4a38] rounded-lg p-3 max-w-md">
                  <p>Hi Emma, we've reset your password on our end. Please try logging in with your new temporary password: TempPass123. You'll be prompted to change it after login.</p>
                  <p className="text-xs text-gray-500 mt-2">You - Today at 10:30 AM</p>
                </div>
              </div>
              <div className="flex">
                <div className="bg-[#f5f5f5] dark:bg-[#0d261c] rounded-lg p-3 max-w-md">
                  <p>Thanks for your help! I was able to log in and change my password. Everything seems to be working now.</p>
                  <p className="text-xs text-gray-500 mt-2">Emma Wilson - Today at 10:45 AM</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-[#e0f2f1] dark:bg-[#1a4a38] rounded-lg p-3 max-w-md">
                  <p>Great to hear! Is there anything else I can help you with today?</p>
                  <p className="text-xs text-gray-500 mt-2">You - Today at 10:46 AM</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Type your message..." />
            <Button className="bg-[#009688] hover:bg-[#00796b] text-white">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default SupportCenterPanel; 