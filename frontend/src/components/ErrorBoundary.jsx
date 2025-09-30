import React from 'react';
import { Result, Button, Card, Typography, Space, Alert, Collapse } from 'antd';
import { 
  BugOutlined, 
  ReloadOutlined, 
  HomeOutlined, 
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      recoveryAttempts: 0,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error: error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      errorInfo: errorInfo
    });

    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    try {
      // Send error to monitoring service (e.g., Sentry, LogRocket)
      const errorData = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        userId: this.getUserId(),
        sessionId: this.getSessionId()
      };

      // In production, send to actual monitoring service
      if (process.env.NODE_ENV === 'production') {
        fetch('/api/errors/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorData)
        }).catch(err => {
          console.error('Failed to log error:', err);
        });
      }
    } catch (err) {
      console.error('Failed to log error to service:', err);
    }
  };

  getUserId = () => {
    // Get user ID from localStorage, context, or other sources
    try {
      return localStorage.getItem('userId') || 'anonymous';
    } catch {
      return 'anonymous';
    }
  };

  getSessionId = () => {
    // Get session ID from localStorage or generate one
    try {
      let sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('sessionId', sessionId);
      }
      return sessionId;
    } catch {
      return `session-${Date.now()}`;
    }
  };

  handleRetry = () => {
    this.setState(prevState => ({
      recoveryAttempts: prevState.recoveryAttempts + 1
    }));

    // Attempt to recover by clearing error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Force a re-render of the component tree
    this.forceUpdate();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
      window.location.reload();
  };

  handleShowDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  handleReportError = () => {
    const errorData = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Create error report
    const report = JSON.stringify(errorData, null, 2);
    
    // Copy to clipboard
    navigator.clipboard.writeText(report).then(() => {
      alert('Error report copied to clipboard. Please send it to support.');
    }).catch(() => {
      // Fallback: download as file
      const blob = new Blob([report], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error-report-${this.state.errorId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId, recoveryAttempts, showDetails } = this.state;

      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: 24,
          background: '#f5f5f5'
        }}>
          <Card style={{ maxWidth: 800, width: '100%' }}>
            <Result
              icon={<BugOutlined style={{ color: '#ff4d4f' }} />}
              status="error"
              title="Something went wrong"
              subTitle={`We encountered an unexpected error. Error ID: ${errorId}`}
              extra={
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Space wrap>
                    <Button 
                      type="primary" 
                      icon={<ReloadOutlined />}
            onClick={this.handleRetry}
                      disabled={recoveryAttempts >= 3}
                    >
                      Try Again {recoveryAttempts > 0 && `(${recoveryAttempts}/3)`}
                    </Button>
                    <Button 
                      icon={<HomeOutlined />}
                      onClick={this.handleGoHome}
                    >
                      Go Home
                    </Button>
                    <Button 
                      onClick={this.handleReload}
          >
            Reload Page
                    </Button>
                  </Space>

                  {recoveryAttempts >= 3 && (
                    <Alert
                      message="Recovery Failed"
                      description="Multiple recovery attempts have failed. Please try reloading the page or contact support."
                      type="warning"
                      showIcon
                    />
                  )}

                  <div style={{ textAlign: 'center' }}>
                    <Button 
                      type="link" 
                      icon={<InfoCircleOutlined />}
                      onClick={this.handleShowDetails}
                    >
                      {showDetails ? 'Hide' : 'Show'} Technical Details
                    </Button>
                    
                    <Button 
                      type="link" 
                      icon={<ExclamationCircleOutlined />}
                      onClick={this.handleReportError}
                    >
                      Report Error
                    </Button>
                  </div>

                  {showDetails && (
                    <Collapse defaultActiveKey={['error']}>
                      <Panel header="Error Details" key="error">
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <div>
                            <Text strong>Error Message:</Text>
                            <Paragraph code style={{ marginTop: 8 }}>
                              {error?.message || 'Unknown error'}
                            </Paragraph>
                          </div>

                          {error?.stack && (
                            <div>
                              <Text strong>Stack Trace:</Text>
                              <Paragraph code style={{ 
                                marginTop: 8, 
                                maxHeight: 200, 
                                overflow: 'auto',
                                fontSize: 12
                              }}>
                                {error.stack}
                              </Paragraph>
                            </div>
                          )}

                          {errorInfo?.componentStack && (
                            <div>
                              <Text strong>Component Stack:</Text>
                              <Paragraph code style={{ 
                                marginTop: 8, 
                                maxHeight: 200, 
                                overflow: 'auto',
                                fontSize: 12
                              }}>
                                {errorInfo.componentStack}
                              </Paragraph>
                            </div>
                          )}

                          <div>
                            <Text strong>Error ID:</Text>
                            <Paragraph code style={{ marginTop: 8 }}>
                              {errorId}
                            </Paragraph>
                          </div>

                          <div>
                            <Text strong>URL:</Text>
                            <Paragraph code style={{ marginTop: 8 }}>
                              {window.location.href}
                            </Paragraph>
                          </div>

                          <div>
                            <Text strong>Timestamp:</Text>
                            <Paragraph code style={{ marginTop: 8 }}>
                              {new Date().toISOString()}
                            </Paragraph>
                          </div>
                        </Space>
                      </Panel>
                    </Collapse>
                  )}
                </Space>
              }
            />
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 