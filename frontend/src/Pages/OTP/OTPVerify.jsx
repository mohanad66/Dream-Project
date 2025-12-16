import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function VerifyOtp() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const pendingUser = localStorage.getItem('pendingOtpUser');
    if (!pendingUser) {
      navigate('/login');
      return;
    }
    const userData = JSON.parse(pendingUser);
    setUserEmail(userData.email);
  }, [navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/api/otp/verify/', { otp });
      if (response.data.success) {
        localStorage.removeItem('pendingOtpUser');
        navigate('/profile'); // Your dashboard route
      } else {
        setError('Invalid OTP');
        setOtp('');
      }
    } catch (err) {
      setError('Verification failed');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h1>Verify OTP</h1>
        <p>Code sent to <strong>{userEmail}</strong></p>
        
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleVerify}>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Enter 6-digit OTP"
            maxLength={6}
            style={{ width: '100%', padding: '1rem', margin: '1rem 0', fontSize: '1.5rem' }}
          />
          <button type="submit" disabled={loading || otp.length !== 6}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/login')}
            style={{ marginLeft: '1rem' }}
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
