import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../config/logger.js';

class LogArchiver {
  constructor() {
    this.archiveDir = path.join(process.cwd(), 'archives');
    this.ensureArchiveDir();
  }

  async ensureArchiveDir() {
    try {
      await fs.mkdir(this.archiveDir, { recursive: true });
    } catch (error) {
      logger.error('Error creating archive directory:', error);
    }
  }

  async compressLog(logFile) {
    const gzFile = `${logFile}.gz`;
    try {
      await pipeline(
        createReadStream(logFile),
        createGzip(),
        createWriteStream(gzFile)
      );
      return gzFile;
    } catch (error) {
      logger.error('Error compressing log file:', error);
      throw error;
    }
  }

  async archiveLog(logFile) {
    try {
      const fileName = path.basename(logFile);
      const archivePath = path.join(this.archiveDir, fileName);

      // Compress the log file
      const compressedFile = await this.compressLog(logFile);
      
      // Move compressed file to archive directory
      const archiveGzPath = `${archivePath}.gz`;
      await fs.rename(compressedFile, archiveGzPath);
      
      // Delete original log file
      await fs.unlink(logFile);
      
      logger.info(`Successfully archived and compressed log file: ${fileName}`);
    } catch (error) {
      logger.error('Error archiving log file:', error);
      throw error;
    }
  }

  async archiveOldLogs() {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      const files = await fs.readdir(logsDir);
      const now = new Date();

      for (const file of files) {
        if (!file.endsWith('.log')) continue;

        const filePath = path.join(logsDir, file);
        const stats = await fs.stat(filePath);
        const fileAge = (now - stats.mtime) / (1000 * 60 * 60 * 24); // Age in days

        // Archive files older than 14 days
        if (fileAge > 14) {
          await this.archiveLog(filePath);
        }
      }
    } catch (error) {
      logger.error('Error archiving old logs:', error);
      throw error;
    }
  }

  async cleanupOldArchives() {
    try {
      const files = await fs.readdir(this.archiveDir);
      const now = new Date();
      const retentionDays = 90; // Keep archives for 90 days

      for (const file of files) {
        const filePath = path.join(this.archiveDir, file);
        const stats = await fs.stat(filePath);
        const fileAge = (now - stats.mtime) / (1000 * 60 * 60 * 24);

        if (fileAge > retentionDays) {
          await fs.unlink(filePath);
          logger.info(`Deleted old archive: ${file}`);
        }
      }

      logger.info('Completed cleanup of old archives');
    } catch (error) {
      logger.error('Error cleaning up old archives:', error);
      throw error;
    }
  }

  async getArchivedLog(date) {
    try {
      const fileName = `security-${date}.log.gz`;
      const archivePath = path.join(this.archiveDir, fileName);

      // Check if archive exists
      try {
        await fs.access(archivePath);
      } catch {
        return null; // Archive doesn't exist
      }

      // Return the compressed file path
      return archivePath;
    } catch (error) {
      logger.error('Error accessing archived log:', error);
      throw error;
    }
  }
}

export const logArchiver = new LogArchiver(); 