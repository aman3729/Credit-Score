import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { api } from '../lib/api';
import PremiumSidebar from './PremiumSidebar';
import PremiumTopbar from './PremiumTopbar';
import PremiumHeroPanel from './PremiumHeroPanel';
import CreditScoreDial from './CreditScoreDial';
import RecentActivityTimeline from './RecentActivityTimeline';
import PremiumToolsPanel from './PremiumToolsPanel';
import ImprovementTipsEngine from './ImprovementTipsEngine';
import PremiumAlerts from './PremiumAlerts';
import PremiumInsights from './PremiumInsights';
import CreditInsights from './CreditInsights';
import { Card, CardContent } from './ui/card';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import jsPDF from 'jspdf';
import html2pdf from 'html2pdf.js';

const PremiumDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for real user data
  const [userData, setUserData] = useState(null);
  const [creditData, setCreditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // 'contact' | 'profile' | 'dispute' | 'support' | null
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || '', subject: '', message: '' });
  const [exportModal, setExportModal] = useState(null); // 'email' | 'lender' | null
  const [exportEmail, setExportEmail] = useState('');

  const handleOpen = (type) => { setModal(type); };
  const handleClose = () => { setModal(null); setForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || '', subject: '', message: '' }); };

  const handleChange = (e) => { setForm(f => ({ ...f, [e.target.name]: e.target.value })); };

  const handleSubmit = async (type) => {
    setLoading(true);
    try {
      if (type === 'contact' || type === 'profile') {
        await api.put(`/users/${user._id || user.id}`, form);
        toast({ title: 'Success', description: 'Profile updated successfully.' });
        fetchUserData && fetchUserData();
      } else if (type === 'dispute') {
        await api.post('/disputes', { subject: form.subject, message: form.message });
        toast({ title: 'Dispute Submitted', description: 'Your score dispute has been submitted.' });
      } else if (type === 'support') {
        await api.post('/support', { subject: form.subject, message: form.message });
        toast({ title: 'Support Request Sent', description: 'Your support request has been sent.' });
      }
      handleClose();
    } catch (err) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Something went wrong.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's credit data
  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch user's credit data
      const response = await api.get(`/users/${user.id}/credit-data`);
      const data = response.data.data || response.data;
      
      // Transform the data to match our component expectations
      const transformedData = {
        ...data,
        creditScore: data.currentScore,
        currentScore: data.currentScore,
        creditHistory: data.creditScores?.map(score => ({
          score: score.score,
          date: score.date,
          source: 'api',
          factors: score.factors || {}
        })) || []
      };
      
      setCreditData(transformedData);
      setUserData(user);
      
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load your credit data');
      toast({
        title: 'Error',
        description: 'Failed to load your credit data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh credit score (premium feature)
  const handleRefreshScore = async () => {
    if (!user?.premium?.isPremium) {
      toast({
        title: 'Premium Feature',
        description: 'Real-time credit refresh is a premium feature.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setRefreshing(true);
      
      // Call backend to refresh credit score
      const response = await api.post(`/users/${user.id}/refresh-credit-score`);
      
      // Update local data
      setCreditData(prev => ({
        ...prev,
        ...response.data.data
      }));
      
      toast({
        title: 'Score Refreshed',
        description: 'Your credit score has been updated successfully!',
        variant: 'default',
      });
      
    } catch (err) {
      console.error('Error refreshing score:', err);
      toast({
        title: 'Refresh Failed',
        description: 'Unable to refresh your credit score. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate score improvement
  const getScoreImprovement = () => {
    if (!creditData?.creditHistory || creditData.creditHistory.length < 2) {
      return { change: 0, percentage: 0, trend: 'neutral' };
    }

    const currentScore = creditData.creditScore || creditData.currentScore;
    const previousScore = creditData.creditHistory[1]?.score;
    
    if (!currentScore || !previousScore) {
      return { change: 0, percentage: 0, trend: 'neutral' };
    }

    const change = currentScore - previousScore;
    const percentage = Math.round((change / previousScore) * 100);
    
    return {
      change,
      percentage,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  };

  // Get score category and color
  const getScoreCategory = (score) => {
    if (!score) return { category: 'Unknown', color: 'gray', emoji: '❓' };
    
    if (score >= 800) return { category: 'Excellent', color: 'green', emoji: '🟢' };
    if (score >= 740) return { category: 'Very Good', color: 'blue', emoji: '🔵' };
    if (score >= 670) return { category: 'Good', color: 'yellow', emoji: '🟡' };
    if (score >= 580) return { category: 'Fair', color: 'orange', emoji: '🟠' };
    return { category: 'Poor', color: 'red', emoji: '🔴' };
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.text('Credit Report', 10, 10);
    doc.text(JSON.stringify(creditData, null, 2), 10, 20);
    doc.save('credit-report.pdf');
  };

  const handleSendEmail = async () => {
    try {
      await api.post(`/users/${user.id}/send-report`, { email: exportEmail });
      toast({ title: 'Report Sent', description: 'The report has been sent to your email.' });
      setExportModal(null);
    } catch (err) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to send email.', variant: 'destructive' });
    }
  };

  const handleShareLender = async () => {
    try {
      await api.post(`/users/${user.id}/share-score`, { email: exportEmail });
      toast({ title: 'Score Shared', description: 'The score has been shared with the lender.' });
      setExportModal(null);
    } catch (err) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to share with lender.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading your premium dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={fetchUserData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scoreImprovement = getScoreImprovement();
  const scoreCategory = getScoreCategory(creditData?.creditScore || creditData?.currentScore);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="flex">
        {/* Sidebar */}
        <PremiumSidebar user={userData} />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Topbar */}
          <PremiumTopbar user={userData} />
          
          {/* Main Dashboard Content */}
          <main className="flex-1 p-6 space-y-6">
            {/* Hero Panel */}
            <PremiumHeroPanel 
              user={userData}
              scoreImprovement={scoreImprovement}
              scoreCategory={scoreCategory}
              onRefresh={handleRefreshScore}
              refreshing={refreshing}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Credit Score Dial */}
              <div className="lg:col-span-2">
                <CreditScoreDial 
                  creditData={creditData}
                  scoreCategory={scoreCategory}
                />
              </div>
              
              {/* Premium Tools Panel */}
              <div className="lg:col-span-1">
                <PremiumToolsPanel 
                  user={userData}
                  creditData={creditData}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity Timeline */}
              <RecentActivityTimeline creditData={creditData} />
              
              {/* Improvement Tips Engine */}
              <ImprovementTipsEngine 
                creditData={creditData}
                scoreCategory={scoreCategory}
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alerts & Notifications */}
              <PremiumAlerts user={userData} />
              
              {/* Insights & Projections */}
              <PremiumInsights 
                creditData={creditData}
                scoreImprovement={scoreImprovement}
              />
            </div>
            
            {/* Account & Support Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account & Support</h2>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-gray-700 dark:text-gray-200">Verified Phone: <span className="font-bold">{creditData?.verifiedPhone || 'N/A'}</span></div>
                  <div className="text-gray-700 dark:text-gray-200 mt-1">Subscription Tier: <span className="font-bold">{user?.premium?.isPremium ? 'Premium' : user?.trial?.isTrial ? 'Trial' : 'Basic'}</span></div>
                  <button className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition" onClick={() => handleOpen('contact')}>Update Contact Info</button>
                  <button className="mt-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition" onClick={() => handleOpen('profile')}>View/Edit Profile</button>
                </div>
                <div className="flex flex-col gap-2 mt-4 md:mt-0">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition" onClick={() => handleOpen('support')}>Contact Support / Chatbot</button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition" onClick={() => handleOpen('dispute')}>Submit Score Dispute</button>
                </div>
              </div>
            </div>
            
            {/* Credit Insights */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Advanced Credit Analysis</h2>
              <CreditInsights 
                creditData={creditData}
                scoreCategory={scoreCategory}
              />
            </div>

            {/* Export Options Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Export Options</h2>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <button className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition" onClick={handleDownloadPDF}>Download PDF</button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition" onClick={() => setExportModal('email')}>Send to Email</button>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition" onClick={() => setExportModal('lender')}>Share with Lender</button>
              </div>
            </div>

            {/* Export Modals */}
            <Dialog open={exportModal === 'email'} onOpenChange={v => !v && setExportModal(null)}>
              <DialogContent>
                <DialogHeader><DialogTitle>Send Report to Email</DialogTitle></DialogHeader>
                <Input name="email" value={exportEmail} onChange={e => setExportEmail(e.target.value)} placeholder="Enter your email" className="mb-2" />
                <DialogFooter>
                  <Button onClick={handleSendEmail}>Send</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={exportModal === 'lender'} onOpenChange={v => !v && setExportModal(null)}>
              <DialogContent>
                <DialogHeader><DialogTitle>Share Score with Lender</DialogTitle></DialogHeader>
                <Input name="email" value={exportEmail} onChange={e => setExportEmail(e.target.value)} placeholder="Lender's email" className="mb-2" />
                <DialogFooter>
                  <Button onClick={handleShareLender}>Share</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </main>
        </div>
      </div>

      {/* Modals */}
      <Dialog open={modal === 'contact'} onOpenChange={v => !v && handleClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Contact Info</DialogTitle></DialogHeader>
          <Input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="mb-2" />
          <Input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="mb-2" />
          <Input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" className="mb-2" />
          <DialogFooter>
            <Button onClick={() => handleSubmit('contact')} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={modal === 'profile'} onOpenChange={v => !v && handleClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>View/Edit Profile</DialogTitle></DialogHeader>
          <Input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="mb-2" />
          <Input name="address" value={form.address} onChange={handleChange} placeholder="Address" className="mb-2" />
          <DialogFooter>
            <Button onClick={() => handleSubmit('profile')} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={modal === 'dispute'} onOpenChange={v => !v && handleClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Score Dispute</DialogTitle></DialogHeader>
          <Input name="subject" value={form.subject} onChange={handleChange} placeholder="Subject" className="mb-2" />
          <Textarea name="message" value={form.message} onChange={handleChange} placeholder="Describe your dispute..." className="mb-2" />
          <DialogFooter>
            <Button onClick={() => handleSubmit('dispute')} disabled={loading}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={modal === 'support'} onOpenChange={v => !v && handleClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Contact Support / Chatbot</DialogTitle></DialogHeader>
          <Input name="subject" value={form.subject} onChange={handleChange} placeholder="Subject" className="mb-2" />
          <Textarea name="message" value={form.message} onChange={handleChange} placeholder="How can we help you?" className="mb-2" />
          <DialogFooter>
            <Button onClick={() => handleSubmit('support')} disabled={loading}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PremiumDashboard; 