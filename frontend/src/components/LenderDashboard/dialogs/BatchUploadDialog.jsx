import React from 'react';
import { Modal } from 'antd';
import AdminBatchUpload from '../../AdminBatchUpload';
import { Upload } from 'lucide-react';

const BatchUploadDialog = ({ showBatchUpload, handleBatchUploadClose, handleBatchUploadComplete, toast }) => (
  <Modal
    open={showBatchUpload}
    onCancel={handleBatchUploadClose}
    footer={null}
    title={
      <div className="flex items-center gap-2">
        <Upload className="h-5 w-5 text-blue-600" />
        <span>Batch Upload Borrowers</span>
      </div>
    }
    width={700}
    destroyOnHidden
    className="batch-upload-modal"
  >
    <AdminBatchUpload 
      onClose={handleBatchUploadClose} 
      onUploadComplete={(results) => {
        handleBatchUploadComplete(results);
        toast && toast({
          title: "Batch Upload Complete",
          description: `Successfully processed ${results?.successCount || 0} users.`,
          variant: "success",
          duration: 5000,
        });
      }} 
    />
  </Modal>
);

export default BatchUploadDialog; 