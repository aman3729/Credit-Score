import { useState, useCallback } from 'react';
import { message } from 'antd';

export const useAIMapping = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [confidence, setConfidence] = useState(0);

  const analyzeHeaders = useCallback(async (headers, availableFields) => {
    setIsAnalyzing(true);
    setSuggestions([]);
    setConfidence(0);

    try {
      // Call AI endpoint for field mapping suggestions
      const response = await fetch('/api/ai/mapping-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceHeaders: headers,
          targetFields: Object.keys(availableFields),
          fieldDescriptions: availableFields
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI suggestions');
      }

      const result = await response.json();
      
      setSuggestions(result.suggestions || []);
      setConfidence(result.confidence || 0);

      if (result.suggestions?.length > 0) {
        message.success(`AI found ${result.suggestions.length} field mappings with ${Math.round(result.confidence * 100)}% confidence`);
      } else {
        message.info('No AI suggestions available for this file format');
      }

      return result.suggestions;
    } catch (error) {
      console.error('AI analysis failed:', error);
      message.warning('AI analysis unavailable, using basic matching');
      
      // Fallback to basic string matching
      return generateBasicSuggestions(headers, availableFields);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const generateBasicSuggestions = useCallback((headers, availableFields) => {
    const suggestions = [];
    const targetFields = Object.keys(availableFields);

    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Find best matches using fuzzy matching
      let bestMatch = null;
      let bestScore = 0;

      targetFields.forEach(targetField => {
        const normalizedTarget = targetField.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Calculate similarity score
        const score = calculateSimilarity(normalizedHeader, normalizedTarget);
        
        if (score > bestScore && score > 0.6) { // Minimum 60% similarity
          bestScore = score;
          bestMatch = targetField;
        }
      });

      if (bestMatch) {
        suggestions.push({
          sourceField: header,
          targetField: bestMatch,
          confidence: bestScore,
          transformation: suggestTransformation(header, bestMatch, availableFields[bestMatch])
        });
      }
    });

    setSuggestions(suggestions);
    setConfidence(suggestions.length > 0 ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length : 0);

    return suggestions;
  }, []);

  const calculateSimilarity = useCallback((str1, str2) => {
    // Simple Levenshtein distance-based similarity
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }, []);

  const suggestTransformation = useCallback((sourceField, targetField, fieldMeta) => {
    const sourceLower = sourceField.toLowerCase();
    const targetLower = targetField.toLowerCase();

    // Suggest transformations based on field types and patterns
    if (fieldMeta.type === 'string') {
      if (sourceLower.includes('name') || sourceLower.includes('title')) {
        return 'titlecase';
      }
      if (sourceLower.includes('email') || sourceLower.includes('mail')) {
        return 'lowercase';
      }
      if (sourceLower.includes('code') || sourceLower.includes('id')) {
        return 'uppercase';
      }
    }

    if (fieldMeta.type === 'number') {
      if (sourceLower.includes('rate') || sourceLower.includes('percentage')) {
        return 'percentage';
      }
      if (sourceLower.includes('currency') || sourceLower.includes('amount')) {
        return 'currency';
      }
    }

    return null; // No transformation needed
  }, []);

  const applySuggestions = useCallback((suggestions) => {
    const mappings = {};
    suggestions.forEach(suggestion => {
      mappings[suggestion.targetField] = {
        sourceField: suggestion.sourceField,
        transformation: suggestion.transformation,
        confidence: suggestion.confidence
      };
    });
    return mappings;
  }, []);

  const improveSuggestions = useCallback(async (currentMappings, sampleData) => {
    try {
      const response = await fetch('/api/ai/improve-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMappings,
          sampleData: sampleData.slice(0, 10) // Send first 10 rows for analysis
        })
      });

      if (!response.ok) throw new Error('Failed to improve suggestions');

      const result = await response.json();
      
      if (result.improvedMappings) {
        setSuggestions(prev => prev.map(suggestion => {
          const improved = result.improvedMappings[suggestion.targetField];
          return improved ? { ...suggestion, ...improved } : suggestion;
        }));
        message.success('AI improved mapping suggestions based on data analysis');
      }

      return result.improvedMappings;
    } catch (error) {
      console.error('Failed to improve suggestions:', error);
      return null;
    }
  }, []);

  return {
    isAnalyzing,
    suggestions,
    confidence,
    analyzeHeaders,
    applySuggestions,
    improveSuggestions,
    resetSuggestions: () => {
      setSuggestions([]);
      setConfidence(0);
    }
  };
}; 