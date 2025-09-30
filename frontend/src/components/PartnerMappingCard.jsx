import React from 'react';
import { Select, Button, Card, Space, Typography, Alert, Spin, Tag, Divider } from 'antd';
import { BankOutlined, FileTextOutlined, PlusOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Title, Text } = Typography;

const PartnerMappingCard = ({
  partners,
  selectedPartner,
  setSelectedPartner,
  mappingProfiles,
  selectedProfileId,
  setSelectedProfileId,
  selectedProfile,
  onCreateNewMapping,
  onUseMapping,
  isLoading,
  isUploading,
  createNewMapping = false
}) => {

  return (
  <div style={{ marginBottom: 16 }}>
    {/* Partner Selection Section */}
    <Card 
      title={
        <Space>
          <BankOutlined style={{ color: '#1890ff' }} />
          <span>1. Select Your Organization</span>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          Choose your financial institution:
        </Text>
        <Select
          value={selectedPartner}
          onChange={setSelectedPartner}
          placeholder="Select your organization"
          style={{ width: '100%', maxWidth: 400 }}
          disabled={isUploading}
          size="large"
        >
          {partners.map(partner => (
            <Option key={partner.id} value={partner.id}>
              <Space>
                <BankOutlined />
                {partner.name}
              </Space>
            </Option>
          ))}
        </Select>
      </div>
    </Card>

    {/* Mapping Profile Selection Section */}
    {selectedPartner && (
      <Card 
        title={
          <Space>
            <FileTextOutlined style={{ color: '#52c41a' }} />
            <span>2. Choose Your Mapping Profile</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Loading mapping profiles...</Text>
            </div>
          </div>
        ) : (mappingProfiles && mappingProfiles.length > 0) ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Available mapping profiles for {(partners || []).find(p => p.id === selectedPartner)?.name || selectedPartner}:
              </Text>
              <Select
                value={selectedProfileId}
                onChange={setSelectedProfileId}
                placeholder="Select a mapping profile"
                style={{ width: '100%', maxWidth: 400 }}
                size="large"
              >
                {(mappingProfiles || []).map(profile => (
                  <Option key={profile._id} value={profile._id}>
                    <Space>
                      <FileTextOutlined />
                      {profile.name}
                      <Tag color="blue">{profile.fileType?.toUpperCase()}</Tag>
                    </Space>
                  </Option>
                ))}
              </Select>
            </div>

            {/* Selected Profile Details */}
            {selectedProfile && (
              <Alert
                message={
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>Mapping Profile Selected</span>
                  </Space>
                }
                description={
                  <div>
                    <Text strong>{selectedProfile.name}</Text>
                    <br />
                    <Text type="secondary">
                      File Type: {selectedProfile.fileType?.toUpperCase() || 'N/A'}
                    </Text>
                    <br />
                    <Text type="secondary">
                      Fields Mapped: {Object.keys(selectedProfile.fieldsMapping || {}).length}
                    </Text>
                  </div>
                }
                type="success"
                showIcon={false}
                style={{ marginBottom: 16 }}
                action={
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={onUseMapping}
                  >
                    Use This Mapping
                  </Button>
                }
              />
            )}

            <Divider />

            {/* Create New Mapping Option */}
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                Don't see the right mapping profile?
              </Text>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={onCreateNewMapping}
                size="large"
              >
                Create New Mapping Profile
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                No mapping profiles found for this organization
              </Text>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={onCreateNewMapping}
                size="large"
              >
                Create Your First Mapping Profile
              </Button>
            </div>
          </div>
        )}
      </Card>
    )}

    {/* Quick Actions */}
              {selectedPartner && (selectedProfileId || createNewMapping === true) && (
      <Card 
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>Ready to Proceed</span>
          </Space>
        }
        style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}
      >
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            You've selected: {(partners || []).find(p => p.id === selectedPartner)?.name || selectedPartner}
          </Text>
          {selectedProfileId ? (
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Using mapping profile: {(mappingProfiles || []).find(p => p._id === selectedProfileId)?.name || selectedProfileId}
            </Text>
          ) : createNewMapping ? (
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Creating new mapping profile
            </Text>
          ) : null}
          <Button
            type="primary"
            size="large"
            onClick={selectedProfileId ? onUseMapping : onCreateNewMapping}
            icon={<CheckCircleOutlined />}
          >
            {selectedProfileId ? 'Continue with Selected Mapping' : 'Continue to Create Mapping'}
          </Button>
        </div>
      </Card>
    )}
  </div>
  );
};

export default PartnerMappingCard; 