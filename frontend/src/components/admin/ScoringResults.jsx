import React from 'react';
import { Card, Table, Tag, Typography } from 'antd';

const { Text } = Typography;

const ScoringResults = ({ results }) => {
  if (!results || results.length === 0) return null;

  const columns = [
    {
      title: 'Phone Number',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Credit Score',
      dataIndex: 'creditScore',
      key: 'creditScore',
      render: (score) => score ? (
        <Tag color={score >= 750 ? 'green' : score >= 650 ? 'orange' : 'red'}>
          {score}
        </Tag>
      ) : (
        <Tag color="red">Error</Tag>
      )
    },
    {
      title: 'Score Class',
      dataIndex: 'scoreClass',
      key: 'scoreClass',
      render: (cls) => cls ? (
        <Tag color={
          cls === 'Excellent' ? 'green' : 
          cls === 'Good' ? 'blue' : 
          cls === 'Fair' ? 'orange' : 'red'
        }>
          {cls}
        </Tag>
      ) : null
    },
    {
      title: 'Error',
      dataIndex: 'error',
      key: 'error',
      render: (error) => error ? (
        <Text type="danger">{error}</Text>
      ) : null
    }
  ];

  return (
    <Card title="Credit Scoring Results" style={{ marginBottom: 16 }}>
      <Table 
        dataSource={results} 
        columns={columns} 
        rowKey="originalIndex"
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
};

export default ScoringResults; 