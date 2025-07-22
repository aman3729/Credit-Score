// CSRF service for fetching and storing the CSRF token
import api from '../utils/api';

let csrfToken = null;

export const fetchCsrfToken = async () => {
  const res = await api.get('/csrf-token');
  csrfToken = res.data.csrfToken;
  return csrfToken;
};

export const getCsrfToken = () => csrfToken; 