import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

const BatchUploadResults = ({ batchResults }) => {
  if (!batchResults) return null;
  return (
    <Card style={{ marginBottom: 24 }}>
      <CardHeader>
        <CardTitle>Batch Upload Results</CardTitle>
      </CardHeader>
      <CardContent>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(batchResults, null, 2)}</pre>
      </CardContent>
    </Card>
  );
};

export default BatchUploadResults; 