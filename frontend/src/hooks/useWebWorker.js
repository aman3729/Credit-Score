import { useState, useCallback, useRef, useEffect } from 'react';

export const useWebWorker = (workerScript) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  
  const workerRef = useRef(null);
  const messageQueueRef = useRef([]);
  const isProcessingRef = useRef(false);

  // Initialize worker
  const initializeWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    try {
      workerRef.current = new Worker(workerScript);
      
      workerRef.current.onmessage = (event) => {
        const { type, result, error, progress } = event.data;
        
        if (error) {
          setError(error);
          setIsProcessing(false);
          isProcessingRef.current = false;
          return;
        }

        if (progress !== undefined) {
          setProgress(progress);
        }

        if (result) {
          setResult(result);
          setIsProcessing(false);
          isProcessingRef.current = false;
          
          // Process next message in queue
          if (messageQueueRef.current.length > 0) {
            const nextMessage = messageQueueRef.current.shift();
            sendMessage(nextMessage);
          }
        }
      };

      workerRef.current.onerror = (error) => {
        setError(error.message);
        setIsProcessing(false);
        isProcessingRef.current = false;
      };

      return true;
    } catch (err) {
      setError(`Failed to initialize worker: ${err.message}`);
      return false;
    }
  }, [workerScript]);

  // Send message to worker
  const sendMessage = useCallback((message) => {
    if (!workerRef.current) {
      if (!initializeWorker()) {
        return false;
      }
    }

    if (isProcessingRef.current) {
      // Queue message if worker is busy
      messageQueueRef.current.push(message);
      return true;
    }

    try {
      setIsProcessing(true);
      isProcessingRef.current = true;
      setError(null);
      setProgress(0);
      
      workerRef.current.postMessage(message);
      return true;
    } catch (err) {
      setError(`Failed to send message: ${err.message}`);
      setIsProcessing(false);
      isProcessingRef.current = false;
      return false;
    }
  }, [initializeWorker]);

  // Process CSV data
  const processCSV = useCallback((csvText, options = {}) => {
    return sendMessage({
      type: 'PROCESS_CSV',
      data: csvText,
      options
    });
  }, [sendMessage]);

  // Process Excel data
  const processExcel = useCallback((arrayBuffer, options = {}) => {
    return sendMessage({
      type: 'PROCESS_EXCEL',
      data: arrayBuffer,
      options
    });
  }, [sendMessage]);

  // Validate data
  const validateData = useCallback((data, rules = {}) => {
    return sendMessage({
      type: 'VALIDATE_DATA',
      data: data,
      options: { rules }
    });
  }, [sendMessage]);

  // Transform data
  const transformData = useCallback((data, mappings = {}) => {
    return sendMessage({
      type: 'TRANSFORM_DATA',
      data: data,
      options: { mappings }
    });
  }, [sendMessage]);

  // Analyze data
  const analyzeData = useCallback((data) => {
    return sendMessage({
      type: 'ANALYZE_DATA',
      data: data
    });
  }, [sendMessage]);

  // Generate preview
  const generatePreview = useCallback((data, maxRows = 10) => {
    return sendMessage({
      type: 'GENERATE_PREVIEW',
      data: data,
      options: { maxRows }
    });
  }, [sendMessage]);

  // Terminate worker
  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsProcessing(false);
    isProcessingRef.current = false;
    setProgress(0);
    messageQueueRef.current = [];
  }, []);

  // Clear results
  const clearResults = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  // Initialize worker on mount
  useEffect(() => {
    initializeWorker();
    
    // Cleanup on unmount
    return () => {
      terminateWorker();
    };
  }, [initializeWorker, terminateWorker]);

  return {
    // State
    isProcessing,
    result,
    error,
    progress,
    
    // Actions
    processCSV,
    processExcel,
    validateData,
    transformData,
    analyzeData,
    generatePreview,
    terminateWorker,
    clearResults,
    
    // Utilities
    hasWorker: !!workerRef.current,
    queueLength: messageQueueRef.current.length
  };
}; 