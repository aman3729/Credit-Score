import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';

export const useTemplateManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);

  // Load templates
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/templates', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to load templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
      setCategories(data.categories || []);
      
      return data.templates;
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError(err.message);
      message.error(`Failed to load templates: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new template
  const createTemplate = useCallback(async (templateData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });

      if (!response.ok) {
        throw new Error('Failed to create template');
      }

      const newTemplate = await response.json();
      setTemplates(prev => [...prev, newTemplate]);
      
      message.success('Template created successfully');
      return newTemplate;
    } catch (err) {
      console.error('Template creation failed:', err);
      setError(err.message);
      message.error(`Template creation failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update template
  const updateTemplate = useCallback(async (templateId, updates) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update template');
      }

      const updatedTemplate = await response.json();
      setTemplates(prev => 
        prev.map(template => 
          template.id === templateId ? updatedTemplate : template
        )
      );
      
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(updatedTemplate);
      }
      
      message.success('Template updated successfully');
      return updatedTemplate;
    } catch (err) {
      console.error('Template update failed:', err);
      setError(err.message);
      message.error(`Template update failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplate]);

  // Delete template
  const deleteTemplate = useCallback(async (templateId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      setTemplates(prev => prev.filter(template => template.id !== templateId));
      
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
      
      message.success('Template deleted successfully');
    } catch (err) {
      console.error('Template deletion failed:', err);
      setError(err.message);
      message.error(`Template deletion failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplate]);

  // Duplicate template
  const duplicateTemplate = useCallback(async (templateId, newName) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${templateId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate template');
      }

      const duplicatedTemplate = await response.json();
      setTemplates(prev => [...prev, duplicatedTemplate]);
      
      message.success('Template duplicated successfully');
      return duplicatedTemplate;
    } catch (err) {
      console.error('Template duplication failed:', err);
      setError(err.message);
      message.error(`Template duplication failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Share template
  const shareTemplate = useCallback(async (templateId, shareData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${templateId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareData)
      });

      if (!response.ok) {
        throw new Error('Failed to share template');
      }

      const shareResult = await response.json();
      message.success('Template shared successfully');
      return shareResult;
    } catch (err) {
      console.error('Template sharing failed:', err);
      setError(err.message);
      message.error(`Template sharing failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get template versions
  const getTemplateVersions = useCallback(async (templateId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${templateId}/versions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to get template versions');
      }

      const versions = await response.json();
      return versions;
    } catch (err) {
      console.error('Failed to get template versions:', err);
      setError(err.message);
      message.error(`Failed to get template versions: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Restore template version
  const restoreTemplateVersion = useCallback(async (templateId, versionId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${templateId}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to restore template version');
      }

      const restoredTemplate = await response.json();
      setTemplates(prev => 
        prev.map(template => 
          template.id === templateId ? restoredTemplate : template
        )
      );
      
      message.success('Template version restored successfully');
      return restoredTemplate;
    } catch (err) {
      console.error('Template version restoration failed:', err);
      setError(err.message);
      message.error(`Template version restoration failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Export template
  const exportTemplate = useCallback(async (templateId, format = 'json') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${templateId}/export?format=${format}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to export template');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-${templateId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      message.success('Template exported successfully');
    } catch (err) {
      console.error('Template export failed:', err);
      setError(err.message);
      message.error(`Template export failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Import template
  const importTemplate = useCallback(async (file) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('template', file);

      const response = await fetch('/api/templates/import', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to import template');
      }

      const importedTemplate = await response.json();
      setTemplates(prev => [...prev, importedTemplate]);
      
      message.success('Template imported successfully');
      return importedTemplate;
    } catch (err) {
      console.error('Template import failed:', err);
      setError(err.message);
      message.error(`Template import failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search templates
  const searchTemplates = useCallback(async (query, filters = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        ...filters
      });

      const response = await fetch(`/api/templates/search?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to search templates');
      }

      const searchResults = await response.json();
      return searchResults;
    } catch (err) {
      console.error('Template search failed:', err);
      setError(err.message);
      message.error(`Template search failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get template analytics
  const getTemplateAnalytics = useCallback(async (templateId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${templateId}/analytics`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to get template analytics');
      }

      const analytics = await response.json();
      return analytics;
    } catch (err) {
      console.error('Failed to get template analytics:', err);
      setError(err.message);
      message.error(`Failed to get template analytics: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Validate template
  const validateTemplate = useCallback(async (templateData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/templates/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });

      if (!response.ok) {
        throw new Error('Template validation failed');
      }

      const validation = await response.json();
      return validation;
    } catch (err) {
      console.error('Template validation failed:', err);
      setError(err.message);
      message.error(`Template validation failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    // State
    templates,
    selectedTemplate,
    isLoading,
    error,
    categories,
    
    // Actions
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    shareTemplate,
    getTemplateVersions,
    restoreTemplateVersion,
    exportTemplate,
    importTemplate,
    searchTemplates,
    getTemplateAnalytics,
    validateTemplate,
    
    // Utilities
    setSelectedTemplate,
    clearError: () => setError(null)
  };
}; 