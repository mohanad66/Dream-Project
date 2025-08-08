import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import './css/styles.scss';

export default function Profile() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [editMode, setEditMode] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [adminLoading, setAdminLoading] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone_number: '',
    });

    // Check if user is admin (staff or superuser)
    const isAdmin = user?.is_staff || user?.is_superuser;

    useEffect(() => {
        const getUser = async () => {
            try {
                const response = await api.get("/api/user/myuser/");
                setUser(response.data);
                setFormData({
                    first_name: response.data.first_name || '',
                    last_name: response.data.last_name || '',
                    phone_number: response.data.phone_number || '',
                });
            } catch (err) {
                console.error("Failed to fetch user data:", err);
                setError("Failed to load user data. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        
        getUser();
    }, []);

    // Fetch all users for admin
    const fetchAllUsers = async () => {
    // Early return with explicit permission check
    if (!isAdmin) {
        setError("Unauthorized access");
        return;
    }

    setAdminLoading(true);
    setError(null); // Reset error state
    
    try {
        const response = await api.get("/api/user/all/");
        
        // Validate response data structure
        if (!Array.isArray(response.data)) {
            throw new Error("Invalid user data format");
        }

        // Optional: Filter sensitive fields client-side
        const sanitizedUsers = response.data.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            is_active: user.is_active,
            // Explicitly include only needed fields
        }));

        setAllUsers(sanitizedUsers);
        
    } catch (err) {
        console.error("Failed to fetch all users:", err);
        
        // More specific error messages
        const errorMessage = err.response?.status === 403 
            ? "Permission denied" 
            : err.message || "Failed to load user list";
            
        setError(errorMessage);
        
        // Clear user list on error
        setAllUsers([]);
    } finally {
        setAdminLoading(false);
    }
};

    // Load users when admin tab is accessed
    useEffect(() => {
        if (activeTab === 'admin' && isAdmin && allUsers.length === 0) {
            fetchAllUsers();
        }
    }, [activeTab, isAdmin]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const response = await api.patch("/api/user/myuser/", formData);
            setUser(response.data);
            setEditMode(false);
            setError(null);
        } catch (err) {
            console.error("Failed to update user:", err);
            setError("Failed to update profile. Please try again.");
        }
    };

    const handleUserStatusToggle = async (userId, currentStatus) => {
        try {
            const response = await api.patch(`/api/user/${userId}/`, {
                is_active: !currentStatus
            });
            
            // Update the user in the list
            setAllUsers(prev => prev.map(u => 
                u.id === userId ? { ...u, is_active: !currentStatus } : u
            ));
        } catch (err) {
            console.error("Failed to update user status:", err);
            setError("Failed to update user status.");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            return;
        }

        try {
            await api.delete(`/api/user/${userId}/`);
            setAllUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
            console.error("Failed to delete user:", err);
            setError("Failed to delete user.");
        }
    };

    if (loading) {
        return (
            <div className="profile-container">
                <div className="loading-spinner"></div>
                <p>Loading user data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-container error">
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                    <button onClick={() => window.location.reload()} className="retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="profile-container">
                <p>No user data available</p>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <div className="profile-header">
                <div className="avatar">
                    {user.first_name && user.last_name ?
                        `${user.first_name.charAt(0)}${user.last_name.charAt(0)}` :
                        user.username.charAt(0).toUpperCase()}
                </div>
                <h1>
                    {user.first_name ? user.first_name : user.username} {user.last_name ? user.last_name : ""} 
                    {user.is_superuser && <span className="badge superuser">Super Admin</span>}
                    {user.is_staff && !user.is_superuser && <span className="badge admin">Admin</span>}
                </h1>
                <p className="username">@{user.username}</p>
                <p className="email">{user.email}</p>
            </div>

            <div className="profile-tabs">
                <button
                    className={activeTab === 'profile' ? 'active' : ''}
                    onClick={() => setActiveTab('profile')}
                >
                    Profile
                </button>
                <button
                    className={activeTab === 'settings' ? 'active' : ''}
                    onClick={() => setActiveTab('settings')}
                >
                    Settings
                </button>
                {isAdmin && (
                    <button
                        className={activeTab === 'admin' ? 'active' : ''}
                        onClick={() => setActiveTab('admin')}
                    >
                        Admin Panel
                    </button>
                )}
            </div>

            <div className="profile-content">
                {activeTab === 'profile' && (
                    <div className="profile-info">
                        <div className="info-section">
                            <div className="section-header">
                                <h3>Personal Information</h3>
                                {!editMode && (
                                    <button 
                                        className="edit-btn"
                                        onClick={() => setEditMode(true)}
                                    >
                                        Edit Profile
                                    </button>
                                )}
                            </div>
                            
                            {editMode ? (
                                <form onSubmit={handleSave}>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>First Name</label>
                                            <input
                                                type="text"
                                                name="first_name"
                                                value={formData.first_name}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="info-item">
                                            <label>Last Name</label>
                                            <input
                                                type="text"
                                                name="last_name"
                                                value={formData.last_name}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="info-item">
                                            <label>Username</label>
                                            <p>{user.username}</p>
                                        </div>
                                        <div className="info-item">
                                            <label>Email</label>
                                            <p>{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="cancel-btn" onClick={() => setEditMode(false)}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="save-btn">
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="info-grid">
                                    <div className="info-item">
                                        <label>First Name</label>
                                        <p>{user.first_name || 'Not provided'}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Last Name</label>
                                        <p>{user.last_name || 'Not provided'}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Username</label>
                                        <p>{user.username}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Email</label>
                                        <p style={{fontSize : "14px"}}>{user.email}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Account Type</label>
                                        <p>
                                            {user.is_superuser ? 'Super Administrator' : 
                                             user.is_staff ? 'Administrator' : 'Regular User'}
                                        </p>
                                    </div>
                                    <div className="info-item">
                                        <label>Member Since</label>
                                        <p>{new Date(user.date_joined).toLocaleDateString()}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Last Login</label>
                                        <p>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="settings-section">
                        <h3>Account Settings</h3>
                        <form className="settings-form">
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={user.email} readOnly />
                            </div>
                            <div className="form-group">
                                <label>Change Password</label>
                                <input type="password" placeholder="Current password" />
                                <input type="password" placeholder="New password" />
                                <input type="password" placeholder="Confirm new password" />
                            </div>
                            <div className="form-group">
                                <label>Notification Preferences</label>
                                <div className="checkbox-group">
                                    <label>
                                        <input type="checkbox" defaultChecked /> Email notifications
                                    </label>
                                    <label>
                                        <input type="checkbox" defaultChecked /> SMS notifications
                                    </label>
                                    <label>
                                        <input type="checkbox" /> Promotional offers
                                    </label>
                                </div>
                            </div>
                            <button type="submit" className="save-btn">Save Changes</button>
                        </form>
                    </div>
                )}

                {activeTab === 'admin' && isAdmin && (
                    <div className="admin-section">
                        <h3>Admin Panel</h3>
                        
                        <div className="admin-stats">
                            <div className="stat-card">
                                <h4>Total Users</h4>
                                <p className="stat-number">{allUsers.length}</p>
                            </div>
                            <div className="stat-card">
                                <h4>Active Users</h4>
                                <p className="stat-number">{allUsers.filter(u => u.is_active).length}</p>
                            </div>
                            <div className="stat-card">
                                <h4>Admin Users</h4>
                                <p className="stat-number">{allUsers.filter(u => u.is_staff || u.is_superuser).length}</p>
                            </div>
                        </div>

                        <div className="user-management">
                            <div className="section-header">
                                <h4>User Management</h4>
                                <button onClick={fetchAllUsers} className="refresh-btn" disabled={adminLoading}>
                                    {adminLoading ? 'Loading...' : 'Refresh'}
                                </button>
                            </div>
                            
                            {adminLoading ? (
                                <div className="loading">Loading users...</div>
                            ) : (
                                <div className="users-table">
                                    <div className="table-header">
                                        <span>User</span>
                                        <span>Email</span>
                                        <span>Status</span>
                                        <span>Role</span>
                                        <span>Joined</span>
                                        <span>Actions</span>
                                    </div>
                                    {allUsers.map(userItem => (
                                        <div key={userItem.id} className="table-row">
                                            <div className="user-info">
                                                <div className="user-avatar">
                                                    {userItem.first_name && userItem.last_name ?
                                                        `${userItem.first_name.charAt(0)}${userItem.last_name.charAt(0)}` :
                                                        userItem.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{fontSize : "16px"}} className="username">{userItem.username}</p>
                                                    <p className="name">{userItem.first_name} {userItem.last_name}</p>
                                                </div>
                                            </div>
                                            <span style={{fontSize : "14px"}} className="email">{userItem.email}</span>
                                            <span className={`status ${userItem.is_active ? 'active' : 'inactive'}`}>
                                                {userItem.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className="role">
                                                {userItem.is_superuser ? 'Super Admin' : 
                                                 userItem.is_staff ? 'Admin' : 'User'}
                                            </span>
                                            <span className="date">{new Date(userItem.date_joined).toLocaleDateString()}</span>
                                            <div className="actions">
                                                {userItem.id !== user.id && (
                                                    <>
                                                        <button
                                                            className={`toggle-btn ${userItem.is_active ? 'deactivate' : 'activate'}`}
                                                            onClick={() => handleUserStatusToggle(userItem.id, userItem.is_active)}
                                                        >
                                                            {userItem.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        {(user.is_superuser || user.is_staff) && (
                                                            <button
                                                                className="delete-btn"
                                                                onClick={() => handleDeleteUser(userItem.id)}
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                {userItem.id === user.id && (
                                                    <span className="self-indicator">You</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}