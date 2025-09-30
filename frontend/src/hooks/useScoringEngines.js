import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';

// Available scoring engines with their configurations
const SCORING_ENGINES = {
  enhanced: {
    id: 'enhanced',
    name: 'Enhanced AI Model',
    description: 'Advanced machine learning model with 95% accuracy',
    version: '2.1.0',
    features: ['AI-powered', 'Real-time processing', 'High accuracy'],
    performance: {
      accuracy: 0.95,
      processingTime: 2.5,
      throughput: 1000
    },
    config: {
      modelType: 'neural_network',
      layers: [64, 32, 16],
      activation: 'relu',
      dropout: 0.2
    },
    pricing: {
      perRecord: 0.001,
      monthly: 500
    }
  },
  traditional: {
    id: 'traditional',
    name: 'Traditional FICO Model',
    description: 'Classic FICO scoring algorithm',
    version: '1.0.0',
    features: ['Industry standard', 'Fast processing', 'Proven reliability'],
    performance: {
      accuracy: 0.88,
      processingTime: 1.0,
      throughput: 2000
    },
    config: {
      modelType: 'linear_regression',
      weights: 'standard_fico',
      threshold: 580
    },
    pricing: {
      perRecord: 0.0005,
      monthly: 200
    }
  },
  custom: {
    id: 'custom',
    name: 'Custom Model',
    description: 'Custom scoring model for specific requirements',
    version: '1.0.0',
    features: ['Customizable', 'Domain-specific', 'Flexible'],
    performance: {
      accuracy: 0.92,
      processingTime: 3.0,
      throughput: 500
    },
    config: {
      modelType: 'custom',
      parameters: 'configurable'
    },
    pricing: {
      perRecord: 0.002,
      monthly: 1000
    }
  },
  experimental: {
    id: 'experimental',
    name: 'Experimental Model',
    description: 'Latest research model with cutting-edge features',
    version: '3.0.0-beta',
    features: ['Latest research', 'Advanced features', 'Beta testing'],
    performance: {
      accuracy: 0.97,
      processingTime: 5.0,
      throughput: 300
    },
    config: {
      modelType: 'transformer',
      attentionHeads: 8,
      layers: 12
    },
    pricing: {
      perRecord: 0.003,
      monthly: 1500
    }
  }
};

export const useScoringEngines = () => {
  const [selectedEngine, setSelectedEngine] = useState('enhanced');
  const [engineConfig, setEngineConfig] = useState({});
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get available engines
  const getAvailableEngines = useCallback(() => {
    return Object.values(SCORING_ENGINES);
  }, []);

  // Get engine details
  const getEngineDetails = useCallback((engineId) => {
    return SCORING_ENGINES[engineId] || null;
  }, []);

  // Select scoring engine
  const selectEngine = useCallback(async (engineId) => {
    setIsLoading(true);
    setError(null);

    try {
      const engine = SCORING_ENGINES[engineId];
      if (!engine) {
        throw new Error('Invalid scoring engine');
      }

      // Load engine configuration
      const response = await fetch(`/api/scoring/engines/${engineId}/config`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to load engine configuration');
      }

      const config = await response.json();
      
      setSelectedEngine(engineId);
      setEngineConfig(config);
      
      message.success(`Switched to ${engine.name}`);
      
      return config;
    } catch (err) {
      console.error('Engine selection failed:', err);
      setError(err.message);
      message.error(`Failed to select engine: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Test engine performance
  const testEnginePerformance = useCallback(async (engineId, testData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/scoring/engines/${engineId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testData })
      });

      if (!response.ok) {
        throw new Error('Performance test failed');
      }

      const metrics = await response.json();
      setPerformanceMetrics(metrics);
      
      message.success('Performance test completed');
      return metrics;
    } catch (err) {
      console.error('Performance test failed:', err);
      setError(err.message);
      message.error(`Performance test failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Compare engines
  const compareEngines = useCallback(async (engineIds, testData) => {
    setIsLoading(true);
    setError(null);

    try {
      const comparisonPromises = engineIds.map(engineId =>
        testEnginePerformance(engineId, testData)
      );

      const results = await Promise.all(comparisonPromises);
      
      const comparison = engineIds.map((engineId, index) => ({
        engine: SCORING_ENGINES[engineId],
        metrics: results[index]
      }));

      message.success('Engine comparison completed');
      return comparison;
    } catch (err) {
      console.error('Engine comparison failed:', err);
      setError(err.message);
      message.error(`Engine comparison failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [testEnginePerformance]);

  // Get engine recommendations
  const getEngineRecommendations = useCallback(async (dataProfile) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/scoring/engines/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataProfile })
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      const recommendations = await response.json();
      
      message.success('Engine recommendations loaded');
      return recommendations;
    } catch (err) {
      console.error('Failed to get recommendations:', err);
      setError(err.message);
      message.error(`Failed to get recommendations: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update engine configuration
  const updateEngineConfig = useCallback(async (engineId, config) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/scoring/engines/${engineId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }

      const updatedConfig = await response.json();
      setEngineConfig(updatedConfig);
      
      message.success('Engine configuration updated');
      return updatedConfig;
    } catch (err) {
      console.error('Configuration update failed:', err);
      setError(err.message);
      message.error(`Configuration update failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get engine statistics
  const getEngineStatistics = useCallback(async (engineId, timeRange = '30d') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/scoring/engines/${engineId}/statistics?range=${timeRange}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to get statistics');
      }

      const statistics = await response.json();
      return statistics;
    } catch (err) {
      console.error('Failed to get statistics:', err);
      setError(err.message);
      message.error(`Failed to get statistics: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Calculate cost estimate
  const calculateCost = useCallback((engineId, recordCount) => {
    const engine = SCORING_ENGINES[engineId];
    if (!engine) return 0;

    const perRecordCost = engine.pricing.perRecord;
    const totalCost = recordCount * perRecordCost;
    
    return {
      perRecord: perRecordCost,
      total: totalCost,
      monthly: engine.pricing.monthly,
      currency: 'USD'
    };
  }, []);

  // Get current engine
  const getCurrentEngine = useCallback(() => {
    return SCORING_ENGINES[selectedEngine];
  }, [selectedEngine]);

  // Check engine availability
  const isEngineAvailable = useCallback((engineId) => {
    const engine = SCORING_ENGINES[engineId];
    return engine && engine.version !== '3.0.0-beta'; // Beta engines might be restricted
  }, []);

  return {
    // State
    selectedEngine,
    engineConfig,
    performanceMetrics,
    isLoading,
    error,
    
    // Actions
    getAvailableEngines,
    getEngineDetails,
    selectEngine,
    testEnginePerformance,
    compareEngines,
    getEngineRecommendations,
    updateEngineConfig,
    getEngineStatistics,
    calculateCost,
    getCurrentEngine,
    isEngineAvailable,
    
    // Utilities
    engines: SCORING_ENGINES
  };
}; 