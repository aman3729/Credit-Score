import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.join(__dirname, '.env.test') });
} else {
  dotenv.config({ path: path.join(__dirname, '.env') });
} 