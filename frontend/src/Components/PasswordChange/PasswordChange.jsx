import { useState } from "react";
import api from "../../services/api";
import "./css/style.scss";

export const PasswordChangeSection = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            setError("New passwords don't match");
            return;
        }

        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await api.post('/api/auth/password/change/', {
                old_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword
            });
            
            setMessage('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            const errorMessage = err.response?.data?.old_password?.[0] || 
                              err.response?.data?.new_password?.[0] || 
                              err.response?.data?.error || 
                              'Failed to change password';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="password-change-section">
            <form className="settings-form" onSubmit={handleSubmit}>
                {message && <div className="alert alert-success">{message}</div>}
                {error && <div className="alert alert-danger">{error}</div>}
                
                <div className="form-group">
                    <label>Current Password</label>
                    <input 
                        type="password" 
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                </div>
                
                <div className="form-group">
                    <label>New Password</label>
                    <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength="8"
                        autoComplete="new-password"
                    />
                    <small className="form-text text-muted">
                        Password must be at least 8 characters long
                    </small>
                </div>
                
                <div className="form-group">
                    <label>Confirm New Password</label>
                    <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                </div>
                
                <button 
                    type="submit" 
                    className="save-btn"
                    disabled={isLoading}
                >
                    {isLoading ? 'Changing...' : 'Change Password'}
                </button>
            </form>
        </div>
    );
};