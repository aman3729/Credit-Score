import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function useMappings(partnerId) {
  const [mappings, setMappings] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/schema-mapping/partner/${partnerId}`);
        if (res.data.success) {
          setMappings(res.data.data);
        }
      } catch (error) {
        // Optionally handle error
        setMappings([]);
      }
    };
    if (partnerId) fetch();
    else setMappings([]);
  }, [partnerId]);

  return [mappings, setMappings];
} 