import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  Table, 
  Tag, 
  DatePicker, 
  Select, 
  Button, 
  Space,
  Typography,
  Alert,
  Spin
} from 'antd';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  UploadOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  TrendingUpOutlined,
  DownloadOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

const UploadAnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);

  // Mock data - replace with actual API calls
  const mockAnalyticsData = {
    overview: {
      totalUploads: 1250,
      successfulUploads: 1180,
      failedUploads: 70,
      successRate: 94.4,
      averageProcessingTime: 180,
      totalRecordsProcessed: 1250000,
      averageFileSize: 25.5
    },
    timeSeries: [
      { date: '2024-01-09', uploads: 45, successRate: 93.3, avgTime: 175 },
      { date: '2024-01-10', uploads: 52, successRate: 94.2, avgTime: 182 },
      { date: '2024-01-11', uploads: 48, successRate: 95.8, avgTime: 168 },
      { date: '2024-01-12', uploads: 61, successRate: 91.8, avgTime: 195 },
      { date: '2024-01-13', uploads: 38, successRate: 97.4, avgTime: 165 },
      { date: '2024-01-14', uploads: 55, successRate: 94.5, avgTime: 178 },
      { date: '2024-01-15', uploads: 42, successRate: 95.2, avgTime: 172 }
    ],
    partnerStats: [
      { partner: 'Commercial Bank of Ethiopia', uploads: 450, successRate: 96.0, avgTime: 165 },
      { partner: 'Awash Bank', uploads: 320, successRate: 93.8, avgTime: 185 },
      { partner: 'Dashen Bank', uploads: 280, successRate: 94.6, avgTime: 175 },
      { partner: 'Bank of Abyssinia', uploads: 200, successRate: 92.5, avgTime: 190 }
    ],
    errorBreakdown: [
      { type: 'Validation Error', count: 35, percentage: 50.0 },
      { type: 'Network Timeout', count: 15, percentage: 21.4 },
      { type: 'File Format Error', count: 10, percentage: 14.3 },
      { type: 'Server Error', count: 5, percentage: 7.1 },
      { type: 'Authentication Error', count: 5, percentage: 7.1 }
    ],
    fileTypeStats: [
      { type: 'CSV', count: 800, percentage: 64.0 },
      { type: 'Excel', count: 300, percentage: 24.0 },
      { type: 'JSON', count: 100, percentage: 8.0 },
      { type: 'XML', count: 50, percentage: 4.0 }
    ]
  };

  const mockRealTimeData = {
    activeUploads: 12,
    queueLength: 8,
    systemLoad: 65,
    recentUploads: [
      { id: 'upload-001', partner: 'Commercial Bank', status: 'processing', progress: 75, time: '2 min ago' },
      { id: 'upload-002', partner: 'Awash Bank', status: 'completed', progress: 100, time: '5 min ago' },
      { id: 'upload-003', partner: 'Dashen Bank', status: 'failed', progress: 45, time: '8 min ago' }
    ]
  };

  useEffect(() => {
    loadAnalyticsData();
    loadRealTimeData();
    
    // Set up real-time updates
    const interval = setInterval(loadRealTimeData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [timeRange, partnerFilter]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAnalyticsData(mockAnalyticsData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRealTimeData = async () => {
    try {
      // Replace with actual API call
      setRealTimeData(mockRealTimeData);
    } catch (error) {
      console.error('Failed to load real-time data:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'processing';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircleOutlined />;
      case 'processing': return <ClockCircleOutlined />;
      case 'failed': return <ExclamationCircleOutlined />;
      default: return null;
    }
  };

  const chartColors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'];

  const recentUploadsColumns = [
    {
      title: 'Upload ID',
      dataIndex: 'id',
      key: 'id',
      render: (text) => <Text code>{text}</Text>
    },
    {
      title: 'Partner',
      dataIndex: 'partner',
      key: 'partner'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress) => <Progress percent={progress} size="small" />
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time'
    }
  ];

  if (isLoading && !analyticsData) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading analytics data...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <TrendingUpOutlined style={{ marginRight: 8 }} />
          Upload Analytics Dashboard
        </Title>
        <Text type="secondary">
          Real-time monitoring and analytics for credit data uploads
        </Text>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Text strong>Time Range:</Text>
          <Select value={timeRange} onChange={setTimeRange} style={{ width: 120 }}>
            <Option value="1d">Last 24h</Option>
            <Option value="7d">Last 7 days</Option>
            <Option value="30d">Last 30 days</Option>
            <Option value="90d">Last 90 days</Option>
            <Option value="custom">Custom</Option>
          </Select>
          
          <Text strong>Partner:</Text>
          <Select value={partnerFilter} onChange={setPartnerFilter} style={{ width: 200 }}>
            <Option value="all">All Partners</Option>
            <Option value="CBE">Commercial Bank of Ethiopia</Option>
            <Option value="DBE">Development Bank of Ethiopia</Option>
            <Option value="AWASH">Awash Bank</Option>
            <Option value="DASHEN">Dashen Bank</Option>
            <Option value="ABYSSINIA">Bank of Abyssinia</Option>
            <Option value="WEGAGEN">Wegagen Bank</Option>
            <Option value="NIB">Nib International Bank</Option>
            <Option value="HIBRET">Hibret Bank</Option>
            <Option value="LION">Lion International Bank</Option>
            <Option value="COOP">Cooperative Bank of Oromia</Option>
            <Option value="ZEMEN">Zemen Bank</Option>
            <Option value="OROMIA">Oromia International Bank</Option>
            <Option value="BUNNA">Bunna Bank</Option>
            <Option value="BERHAN">Berhan Bank</Option>
            <Option value="ABAY">Abay Bank</Option>
            <Option value="ADDIS">Addis International Bank</Option>
            <Option value="DEBUB">Debub Global Bank</Option>
            <Option value="ENAT">Enat Bank</Option>
            <Option value="GADAA">Gadaa Bank</Option>
            <Option value="HIJRA">Hijra Bank</Option>
            <Option value="SHABELLE">Shabelle Bank</Option>
            <Option value="SIINQEE">Siinqee Bank</Option>
            <Option value="TSEHAY">Tsehay Bank</Option>
            <Option value="AMHARA">Amhara Bank</Option>
            <Option value="AHADU">Ahadu Bank</Option>
            <Option value="GOH">Goh Bank</Option>
            <Option value="AMAN">Aman Bank</Option>
          </Select>
          
          <Button icon={<ReloadOutlined />} onClick={loadAnalyticsData}>
            Refresh
          </Button>
          
          <Button icon={<DownloadOutlined />} type="primary">
            Export Report
          </Button>
        </Space>
      </Card>

      {/* Overview Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Uploads"
              value={analyticsData?.overview.totalUploads}
              prefix={<UploadOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Success Rate"
              value={analyticsData?.overview.successRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg Processing Time"
              value={analyticsData?.overview.averageProcessingTime}
              suffix="s"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Records Processed"
              value={analyticsData?.overview.totalRecordsProcessed.toLocaleString()}
              prefix={<TrendingUpOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Row 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Upload Trends" extra={<Button type="link" icon={<EyeOutlined />}>View Details</Button>}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData?.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="uploads" stroke="#1890ff" strokeWidth={2} />
                <Line type="monotone" dataKey="successRate" stroke="#52c41a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Success Rate by Partner" extra={<Button type="link" icon={<EyeOutlined />}>View Details</Button>}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData?.partnerStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="partner" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="successRate" fill="#52c41a" />
                <Bar dataKey="avgTime" fill="#faad14" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Charts Row 2 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Error Breakdown" extra={<Button type="link" icon={<EyeOutlined />}>View Details</Button>}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData?.errorBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percentage }) => `${type}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analyticsData?.errorBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="File Type Distribution" extra={<Button type="link" icon={<EyeOutlined />}>View Details</Button>}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData?.fileTypeStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stackId="1" stroke="#1890ff" fill="#1890ff" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Real-time Monitoring */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Recent Uploads" extra={<Button type="link" icon={<EyeOutlined />}>View All</Button>}>
            <Table
              columns={recentUploadsColumns}
              dataSource={realTimeData?.recentUploads}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="System Status">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text>Active Uploads</Text>
                <Progress percent={realTimeData?.activeUploads * 10} status="active" />
                <Text type="secondary">{realTimeData?.activeUploads} uploads</Text>
              </div>
              
              <div>
                <Text>Queue Length</Text>
                <Progress percent={realTimeData?.queueLength * 5} />
                <Text type="secondary">{realTimeData?.queueLength} pending</Text>
              </div>
              
              <div>
                <Text>System Load</Text>
                <Progress 
                  percent={realTimeData?.systemLoad} 
                  status={realTimeData?.systemLoad > 80 ? 'exception' : 'normal'}
                />
                <Text type="secondary">{realTimeData?.systemLoad}%</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Alerts */}
      {analyticsData?.overview.successRate < 95 && (
        <Alert
          message="Performance Alert"
          description="Success rate is below 95%. Consider reviewing recent uploads for potential issues."
          type="warning"
          showIcon
          style={{ marginTop: 24 }}
        />
      )}
    </div>
  );
};

export default UploadAnalyticsDashboard; 