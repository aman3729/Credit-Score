import { useState, useCallback, useRef } from 'react';
import { message } from 'antd';
import { v4 as uuidv4 } from 'uuid';
import { getCsrfToken, fetchCsrfToken } from '../services/csrfService';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_CONCURRENT_CHUNKS = 3;
const MAX_RETRIES = 3;

export const useChunkedUpload = () => {
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    progress: 0,
    currentChunk: 0,
    totalChunks: 0,
    uploadedChunks: 0,
    failedChunks: [],
    sessionId: null,
    uploadId: null
  });

  const [uploadResults, setUploadResults] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  
  const abortControllerRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  const createUploadSession = useCallback(async (file, partnerId, profileId, scoringEngine) => {
    try {
      // Validate required parameters
      if (!file) throw new Error('File is required');
      if (!partnerId) throw new Error('Partner ID is required');
      
      const sessionId = uuidv4();
      const uploadId = `upload-${Date.now()}`;
      
      // Get CSRF token
      let csrfToken = getCsrfToken();
      if (!csrfToken) {
        csrfToken = await fetchCsrfToken();
      }
      
      const requestBody = {
        sessionId,
        uploadId,
        fileName: file.name,
        fileSize: file.size,
        partnerId,
        profileId: profileId || null,
        scoringEngine: scoringEngine || 'default',
        totalChunks: Math.ceil(file.size / CHUNK_SIZE)
      };
      
      const response = await fetch('/api/v1/upload/create-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create upload session: ${response.status}`);
      }

      const sessionData = await response.json();
      
      setUploadState(prev => ({
        ...prev,
        sessionId,
        uploadId,
        totalChunks: Math.ceil(file.size / CHUNK_SIZE),
        isUploading: true,
        progress: 0,
        currentChunk: 0,
        uploadedChunks: 0,
        failedChunks: []
      }));

      return { sessionId, uploadId };
    } catch (error) {
      console.error('Session creation failed:', error);
      throw error;
    }
  }, []);

  const uploadChunk = useCallback(async (file, chunkIndex, sessionId, uploadId, retryCount = 0) => {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex);
    formData.append('sessionId', sessionId);
    formData.append('uploadId', uploadId);
    formData.append('totalChunks', Math.ceil(file.size / CHUNK_SIZE));

    try {
      // Get CSRF token
      let csrfToken = getCsrfToken();
      if (!csrfToken) {
        csrfToken = await fetchCsrfToken();
      }
      
      const response = await fetch('/api/v1/upload/upload-chunk', {
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': csrfToken
        },
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Chunk ${chunkIndex} upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, chunkIndex, result };
    } catch (error) {
      console.error(`Chunk ${chunkIndex} upload error:`, error);
      
      if (retryCount < MAX_RETRIES) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return uploadChunk(file, chunkIndex, sessionId, uploadId, retryCount + 1);
      }
      
      return { success: false, chunkIndex, error: error.message };
    }
  }, []);

  const processChunks = useCallback(async (file, sessionId, uploadId) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const chunks = Array.from({ length: totalChunks }, (_, i) => i);
    const results = [];
    const failedChunks = [];

    // Process chunks in batches for concurrent uploads
    for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_CHUNKS) {
      const batch = chunks.slice(i, i + MAX_CONCURRENT_CHUNKS);
      
      const batchPromises = batch.map(chunkIndex => 
        uploadChunk(file, chunkIndex, sessionId, uploadId)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, batchIndex) => {
        const chunkIndex = batch[i + batchIndex];
        
        if (result.status === 'fulfilled' && result.value.success) {
          results.push(result.value);
        } else {
          failedChunks.push({
            chunkIndex,
            error: result.reason || result.value?.error || 'Unknown error'
          });
        }
      });

      // Update progress
      const uploadedChunks = results.length;
      const progress = Math.round((uploadedChunks / totalChunks) * 100);
      
      setUploadState(prev => ({
        ...prev,
        uploadedChunks,
        progress,
        currentChunk: i + batch.length,
        failedChunks
      }));

      // Check if upload should be aborted
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Upload aborted by user');
      }
    }

    return { results, failedChunks };
  }, [uploadChunk]);

  const finalizeUpload = useCallback(async (sessionId, uploadId) => {
    try {
      // Get CSRF token
      let csrfToken = getCsrfToken();
      if (!csrfToken) {
        csrfToken = await fetchCsrfToken();
      }
      
      const response = await fetch('/api/v1/upload/finalize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ sessionId, uploadId })
      });

      if (!response.ok) throw new Error('Failed to finalize upload');

      const result = await response.json();
      setUploadResults(result);
      return result;
    } catch (error) {
      console.error('Upload finalization failed:', error);
      throw error;
    }
  }, []);

  const startUpload = useCallback(async (file, partnerId, profileId, scoringEngine) => {
    try {
      setUploadError(null);
      abortControllerRef.current = new AbortController();

      // Create upload session
      const { sessionId, uploadId } = await createUploadSession(file, partnerId, profileId, scoringEngine);

      // Upload chunks
      const { results, failedChunks } = await processChunks(file, sessionId, uploadId);

      if (failedChunks.length > 0) {
        throw new Error(`${failedChunks.length} chunks failed to upload`);
      }

      // Finalize upload
      const finalResult = await finalizeUpload(sessionId, uploadId);

      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100
      }));

      message.success('Upload completed successfully!');
      return finalResult;

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error.message);
      setUploadState(prev => ({ ...prev, isUploading: false }));
      message.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }, [createUploadSession, processChunks, finalizeUpload]);

  const abortUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setUploadState(prev => ({ ...prev, isUploading: false }));
    message.info('Upload aborted');
  }, []);

  const retryFailedChunks = useCallback(async (file, sessionId, uploadId) => {
    const { failedChunks } = uploadState;
    if (failedChunks.length === 0) return;

    setUploadState(prev => ({ ...prev, failedChunks: [] }));

    try {
      const retryPromises = failedChunks.map(({ chunkIndex }) => 
        uploadChunk(file, chunkIndex, sessionId, uploadId)
      );

      const retryResults = await Promise.allSettled(retryPromises);
      const newFailedChunks = [];

      retryResults.forEach((result, index) => {
        const { chunkIndex } = failedChunks[index];
        if (result.status === 'rejected' || !result.value.success) {
          newFailedChunks.push({
            chunkIndex,
            error: result.reason || result.value?.error || 'Retry failed'
          });
        }
      });

      setUploadState(prev => ({ ...prev, failedChunks: newFailedChunks }));

      if (newFailedChunks.length === 0) {
        const finalResult = await finalizeUpload(sessionId, uploadId);
        setUploadResults(finalResult);
        message.success('All chunks uploaded successfully!');
      } else {
        message.warning(`${newFailedChunks.length} chunks still failed after retry`);
      }

    } catch (error) {
      console.error('Retry failed:', error);
      message.error('Retry operation failed');
    }
  }, [uploadState.failedChunks, uploadChunk, finalizeUpload]);

  return {
    uploadState,
    uploadResults,
    uploadError,
    startUpload,
    abortUpload,
    retryFailedChunks,
    resetUpload: () => {
      setUploadState({
        isUploading: false,
        progress: 0,
        currentChunk: 0,
        totalChunks: 0,
        uploadedChunks: 0,
        failedChunks: [],
        sessionId: null,
        uploadId: null
      });
      setUploadResults(null);
      setUploadError(null);
    }
  };
}; 