import React from 'react';
import { Modal } from 'antd';
import EnhancedRegister from '../../EnhancedRegister';
import { UserPlus } from 'lucide-react';

const RegisterUserDialog = ({ showRegister, setShowRegister, toast }) => (
  <Modal
    open={showRegister}
    onCancel={() => setShowRegister(false)}
    footer={null}
    title={
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-green-600" />
        <span>Register New User</span>
      </div>
    }
    width={600}
    destroyOnHidden
    className="register-modal"
  >
    <EnhancedRegister 
      onSuccess={(userData) => {
        setShowRegister(false);
        toast && toast({
          title: "User Registered Successfully",
          description: `New user ${userData?.email || 'has been created'} and is ready for credit assessment.`,
          variant: "success",
          duration: 5000,
        });
      }} 
      onClose={() => setShowRegister(false)} 
      isAdmin={false} 
    />
  </Modal>
);

export default RegisterUserDialog; 