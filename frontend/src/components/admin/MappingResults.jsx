import React from 'react';
import { Card, Row, Col, Statistic, Alert } from 'antd';

const MappingResults = ({ results }) => {
  if (!results) return null;
  return (
    <Card title="Mapping Results" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={6}>
          <Statistic title="Total Records" value={results.summary.totalRecords} />
        </Col>
        <Col span={6}>
          <Statistic
            title="Success Rate"
            value={Math.round(results.successRate * 100)}
            suffix="%"
            valueStyle={{ color: results.successRate > 0.8 ? '#3f8600' : '#cf1322' }}
          />
        </Col>
        <Col span={6}>
          <Statistic title="Mapped Records" value={results.summary.mappedRecords} />
        </Col>
        <Col span={6}>
          <Statistic title="Scored Records" value={results.summary.scoredRecords} />
        </Col>
      </Row>
      {results.summary.averageScore > 0 && (
        <Alert
          message={`Average Credit Score: ${Math.round(results.summary.averageScore)}`}
          description={`${results.summary.scoredRecords} records successfully scored`}
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
      {results.errors.length > 0 && (
        <Alert
          message={`${results.errors.length} records had errors`}
          description="Check the error details below"
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

export default MappingResults; 