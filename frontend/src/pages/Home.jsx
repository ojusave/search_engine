/**
 * Home page - redirects to search
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/search');
  }, [navigate]);

  return null;
}
