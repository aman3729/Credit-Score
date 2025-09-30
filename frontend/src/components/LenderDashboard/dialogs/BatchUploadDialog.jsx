import React from 'react';
import AdminBatchUpload from '../../AdminBatchUpload';
import { Upload, X } from 'lucide-react';
import { Button } from '../../ui/button';

const BatchUploadDialog = ({ showBatchUpload, handleBatchUploadClose, handleBatchUploadComplete, toast }) => {
  console.log('BatchUploadDialog props:', { showBatchUpload, handleBatchUploadClose, handleBatchUploadComplete, toast });
  
  if (!showBatchUpload) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">Batch Upload Borrowers</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBatchUploadClose}
            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] bg-white dark:bg-gray-900">
          <AdminBatchUpload 
            onClose={handleBatchUploadClose} 
            onUploadComplete={(results) => {
              console.log('Batch upload completed:', results);
              handleBatchUploadComplete(results);
              toast && toast({
                title: "Batch Upload Complete",
                description: `Successfully processed ${results?.successCount || 0} users.`,
                variant: "success",
                duration: 5000,
              });
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default BatchUploadDialog; 