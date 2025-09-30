import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { 
  Upload, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  FileText,
  Users,
  Zap
} from 'lucide-react';

const UploadProgressCard = ({ progress = 0, status = 'idle', onStart }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'processing':
        return <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Upload Completed';
      case 'error':
        return 'Upload Failed';
      case 'processing':
        return 'Processing...';
      default:
        return 'Ready to Start';
    }
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <CardHeader>
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <CardTitle className="text-gray-900 dark:text-white">Upload Progress</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getStatusText()}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge 
            variant={status === 'completed' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}
            className="text-sm"
          >
            {getStatusText()}
          </Badge>
        </div>

        {/* Action Button */}
        {status === 'idle' && onStart && (
          <div className="flex justify-center">
            <Button 
              onClick={onStart}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Zap className="h-4 w-4 mr-2" />
              Start Upload
            </Button>
          </div>
        )}

        {/* Sample Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <FileText className="h-6 w-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
            <div className="text-sm text-gray-600 dark:text-gray-400">Files</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">1</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Users className="h-6 w-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
            <div className="text-sm text-gray-600 dark:text-gray-400">Records</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">1,234</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
            <div className="text-sm text-gray-600 dark:text-gray-400">Success</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">1,200</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-600 dark:text-red-400" />
            <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">34</div>
          </div>
        </div>

        {/* Status Messages */}
        {status === 'processing' && (
          <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Processing your data with AI-powered analysis. This may take a few minutes for large files.
            </AlertDescription>
          </Alert>
        )}

        {status === 'completed' && (
          <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Upload completed successfully! Your data has been processed and is ready for review.
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              Upload failed. Please check your file format and try again.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadProgressCard; 