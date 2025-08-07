// src/Components/ProtectedRoute/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../services/constants.js';
import api from '../../services/api.js';
import { jwtDecode } from 'jwt-decode';

export default function ProtectedRoute({ children }) {
  const [authState, setAuthState] = useState({
    isAuthorized: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    let isMounted = true;
    
    const verifyAuth = async () => {
      try {
        const token = localStorage.getItem(ACCESS_TOKEN);
        
        // Case 1: No token at all
        if (!token) {
          if (isMounted) {
            setAuthState({
              isAuthorized: false,
              isLoading: false,
              error: 'No authentication token found'
            });
          }
          return;
        }

        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;
        
        // Case 2: Token is expired
        if (decoded.exp < now) {
          const refreshToken = localStorage.getItem(REFRESH_TOKEN);
          
          // Case 2a: No refresh token
          if (!refreshToken) {
            if (isMounted) {
              setAuthState({
                isAuthorized: false,
                isLoading: false,
                error: 'Session expired - please login again'
              });
            }
            return;
          }

          // Case 2b: Try to refresh token
          try {
            const response = await api.post('/api/token/refresh/', { 
              refresh: refreshToken 
            });
            
            localStorage.setItem(ACCESS_TOKEN, response.data.access);
            
            if (isMounted) {
              setAuthState({
                isAuthorized: true,
                isLoading: false,
                error: null
              });
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            localStorage.removeItem(ACCESS_TOKEN);
            localStorage.removeItem(REFRESH_TOKEN);
            
            if (isMounted) {
              setAuthState({
                isAuthorized: false,
                isLoading: false,
                error: 'Session expired - please login again'
              });
            }
          }
        } 
        // Case 3: Token is valid
        else {
          // Verify token with backend
          try {
            await api.get('/api/user/verify-token/');
            
            if (isMounted) {
              setAuthState({
                isAuthorized: true,
                isLoading: false,
                error: null
              });
            }
          } catch (verifyError) {
            console.error('Token verification failed:', verifyError);
            localStorage.removeItem(ACCESS_TOKEN);
            
            if (isMounted) {
              setAuthState({
                isAuthorized: false,
                isLoading: false,
                error: 'Invalid session - please login again'
              });
            }
          }
        }
      } catch (err) {
        console.error('Auth verification failed:', err);
        
        if (isMounted) {
          setAuthState({
            isAuthorized: false,
            isLoading: false,
            error: 'Authentication error'
          });
        }
      }
    };

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Show loading state
  if (authState.isLoading) {
    return <div> loading...</div>;
  }

  // Redirect to login if not authorized
  if (!authState.isAuthorized) {
    // Optionally pass the error state to login page
    return <Navigate 
      to="/login" 
      state={{ from: 'protected', error: authState.error }} 
      replace 
    />;
  }

  // Render protected content
  return children;
}