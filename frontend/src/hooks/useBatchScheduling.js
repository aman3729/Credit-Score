import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';

export const useBatchScheduling = () => {
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeZones] = useState([
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Africa/Addis_Ababa', label: 'Addis Ababa (EAT)' }
  ]);

  // Load schedules
  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/schedules', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to load schedules');
      }

      const data = await response.json();
      setSchedules(data.schedules || []);
      
      return data.schedules;
    } catch (err) {
      console.error('Failed to load schedules:', err);
      setError(err.message);
      message.error(`Failed to load schedules: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new schedule
  const createSchedule = useCallback(async (scheduleData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData)
      });

      if (!response.ok) {
        throw new Error('Failed to create schedule');
      }

      const newSchedule = await response.json();
      setSchedules(prev => [...prev, newSchedule]);
      
      message.success('Schedule created successfully');
      return newSchedule;
    } catch (err) {
      console.error('Schedule creation failed:', err);
      setError(err.message);
      message.error(`Schedule creation failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update schedule
  const updateSchedule = useCallback(async (scheduleId, updates) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update schedule');
      }

      const updatedSchedule = await response.json();
      setSchedules(prev => 
        prev.map(schedule => 
          schedule.id === scheduleId ? updatedSchedule : schedule
        )
      );
      
      if (selectedSchedule?.id === scheduleId) {
        setSelectedSchedule(updatedSchedule);
      }
      
      message.success('Schedule updated successfully');
      return updatedSchedule;
    } catch (err) {
      console.error('Schedule update failed:', err);
      setError(err.message);
      message.error(`Schedule update failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedSchedule]);

  // Delete schedule
  const deleteSchedule = useCallback(async (scheduleId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      setSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
      
      if (selectedSchedule?.id === scheduleId) {
        setSelectedSchedule(null);
      }
      
      message.success('Schedule deleted successfully');
    } catch (err) {
      console.error('Schedule deletion failed:', err);
      setError(err.message);
      message.error(`Schedule deletion failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedSchedule]);

  // Enable/disable schedule
  const toggleSchedule = useCallback(async (scheduleId, enabled) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${scheduleId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle schedule');
      }

      const updatedSchedule = await response.json();
      setSchedules(prev => 
        prev.map(schedule => 
          schedule.id === scheduleId ? updatedSchedule : schedule
        )
      );
      
      message.success(`Schedule ${enabled ? 'enabled' : 'disabled'} successfully`);
      return updatedSchedule;
    } catch (err) {
      console.error('Schedule toggle failed:', err);
      setError(err.message);
      message.error(`Schedule toggle failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run schedule immediately
  const runScheduleNow = useCallback(async (scheduleId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${scheduleId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to run schedule');
      }

      const result = await response.json();
      message.success('Schedule executed successfully');
      return result;
    } catch (err) {
      console.error('Schedule execution failed:', err);
      setError(err.message);
      message.error(`Schedule execution failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get schedule history
  const getScheduleHistory = useCallback(async (scheduleId, limit = 50) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${scheduleId}/history?limit=${limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to get schedule history');
      }

      const history = await response.json();
      return history;
    } catch (err) {
      console.error('Failed to get schedule history:', err);
      setError(err.message);
      message.error(`Failed to get schedule history: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Validate cron expression
  const validateCronExpression = useCallback(async (cronExpression) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/schedules/validate-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronExpression })
      });

      if (!response.ok) {
        throw new Error('Failed to validate cron expression');
      }

      const validation = await response.json();
      return validation;
    } catch (err) {
      console.error('Cron validation failed:', err);
      setError(err.message);
      message.error(`Cron validation failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get next run times
  const getNextRunTimes = useCallback(async (cronExpression, count = 5) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/schedules/next-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronExpression, count })
      });

      if (!response.ok) {
        throw new Error('Failed to get next run times');
      }

      const nextRuns = await response.json();
      return nextRuns;
    } catch (err) {
      console.error('Failed to get next run times:', err);
      setError(err.message);
      message.error(`Failed to get next run times: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get schedule statistics
  const getScheduleStatistics = useCallback(async (scheduleId, timeRange = '30d') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${scheduleId}/statistics?range=${timeRange}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to get schedule statistics');
      }

      const statistics = await response.json();
      return statistics;
    } catch (err) {
      console.error('Failed to get schedule statistics:', err);
      setError(err.message);
      message.error(`Failed to get schedule statistics: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Duplicate schedule
  const duplicateSchedule = useCallback(async (scheduleId, newName) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${scheduleId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate schedule');
      }

      const duplicatedSchedule = await response.json();
      setSchedules(prev => [...prev, duplicatedSchedule]);
      
      message.success('Schedule duplicated successfully');
      return duplicatedSchedule;
    } catch (err) {
      console.error('Schedule duplication failed:', err);
      setError(err.message);
      message.error(`Schedule duplication failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get schedule templates
  const getScheduleTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/schedules/templates', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to get schedule templates');
      }

      const templates = await response.json();
      return templates;
    } catch (err) {
      console.error('Failed to get schedule templates:', err);
      setError(err.message);
      message.error(`Failed to get schedule templates: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load schedules on mount
  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  return {
    // State
    schedules,
    selectedSchedule,
    isLoading,
    error,
    timeZones,
    
    // Actions
    loadSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    toggleSchedule,
    runScheduleNow,
    getScheduleHistory,
    validateCronExpression,
    getNextRunTimes,
    getScheduleStatistics,
    duplicateSchedule,
    getScheduleTemplates,
    
    // Utilities
    setSelectedSchedule,
    clearError: () => setError(null)
  };
}; 