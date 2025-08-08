import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ACCESS_TOKEN } from '../../services/constants.js';
import { jwtDecode } from 'jwt-decode';

export default function ProtectedRoute({ children }) {
  const [authState, setAuthState] = useState({
    isAuthorized: false,
    isLoading: true
  });
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    
    if (!token) {
      setAuthState({ isAuthorized: false, isLoading: false });
      return;
    }

    try {
      const { exp } = jwtDecode(token);
      const isValid = exp * 1000 > Date.now();
      
      setAuthState({
        isAuthorized: isValid,
        isLoading: false
      });

      // If coming from login, assume token is fresh
      if (location.state?.from === 'login') {
        setAuthState({ isAuthorized: true, isLoading: false });
      }
    } catch (error) {
      setAuthState({ isAuthorized: false, isLoading: false });
    }
  }, [location.state]);

  if (authState.isLoading) {
    return <div>Loading...</div>;
  }

  if (!authState.isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return children;
}