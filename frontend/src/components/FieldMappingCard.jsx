import React from 'react';
const FieldMappingBuilder = React.lazy(() => import('./admin/FieldMappingBuilder'));
import { Button } from 'antd';

const FieldMappingCard = ({
  detectedFields,
  availableFields,
  fieldMappings,
  setFieldMappings,
  onSaveMappingProfile,
  isSavingProfile,
  selectedPartner
}) => (
  <div style={{ marginBottom: 16 }}>
    <React.Suspense fallback={<div>Loading mapping UI...</div>}>
      <FieldMappingBuilder
        detectedFields={detectedFields}
        availableFields={availableFields}
        onMappingsChange={setFieldMappings}
        initialMappings={fieldMappings}
      />
    </React.Suspense>
    <Button
      type="primary"
      onClick={onSaveMappingProfile}
      disabled={!selectedPartner || !fieldMappings || Object.keys(fieldMappings).length === 0 || isSavingProfile}
      loading={isSavingProfile}
      style={{ marginTop: 12 }}
    >
      Save Mapping Profile
    </Button>
  </div>
);

export default FieldMappingCard; 