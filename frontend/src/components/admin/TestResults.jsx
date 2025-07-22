import React from 'react';
import { Card, Alert, Typography } from 'antd';

const { Text } = Typography;

const TestResults = ({ results }) => {
  if (!results) return null;
  return (
    <Card title="Test Results" style={{ marginBottom: 16 }}>
      <Alert
        message={`Test completed: ${results.successCount} successful, ${results.errorCount} errors`}
        type={results.successRate > 0.8 ? 'success' : 'warning'}
        showIcon
        style={{ marginBottom: 16 }}
      />
      {results.mappedData && results.mappedData.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>Sample Mapped Data:</Text>
          <pre style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4 }}>
            {JSON.stringify(results.mappedData[0], null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
};

export default TestResults; 