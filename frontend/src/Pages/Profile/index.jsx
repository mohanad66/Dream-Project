import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import './css/styles.scss';
import { PasswordChangeSection } from '../../Components/PasswordChange/PasswordChange';
import { AddItemModal } from '../../Components/AddItemModal/index';
import Card from '../../Components/Card';

const ProductCard = ({ product, categories }) => (
    <Card card={product} categories={categories} />
);

export default function Profile({ categories = [] }) {
    // --- STATE MANAGEMENT ---
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({ first_name: '', last_name: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [adminLoading, setAdminLoading] = useState(false);
    const [myProducts, setMyProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [pagination, setPagination] = useState({
        count: 0,
        next: null,
        previous: null,
        currentPage: 1,
    });

    // --- DATA FETCHING ---
    const fetchAllUsers = useCallback(async (page = 1) => {
        // Guard clause moved inside to use fresh user state
        if (!user?.is_superuser) return;
        setAdminLoading(true);
        try {
            const response = await api.get(`/api/user/all/?page=${page}`);
            setAllUsers(response.data.results);
            setPagination({
                count: response.data.count,
                next: response.data.next,
                previous: response.data.previous,
                currentPage: page,
            });
        } catch (err) {
            setError("Failed to load user list.");
            console.error(err);
        } finally {
            setAdminLoading(false);
        }
    }, [user]); // Depend on the user object

    const fetchMyProducts = useCallback(async () => {
        if (!user || !(user.is_staff || user.is_superuser)) return;
        setProductsLoading(true);
        try {
            const response = await api.get('/api/products/');
            const userProducts = response.data.filter(product => product.owner?.id === user.id);
            setMyProducts(userProducts);
        } catch (err) {
            console.error("Failed to fetch products:", err);
            setError("Failed to load your products.");
        } finally {
            setProductsLoading(false);
        }
    }, [user]); // Depend on the user object

    useEffect(() => {
        const getUser = async () => {
            try {
                const response = await api.get("/api/user/myuser/");
                setUser(response.data);
                setFormData({ first_name: response.data.first_name || '', last_name: response.data.last_name || '' });
            } catch (err) {
                setError("Failed to load user data.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        getUser();
    }, []);

    useEffect(() => {
        if (user && (user.is_staff || user.is_superuser) && activeTab === 'admin') {
            fetchMyProducts();
            if (user.is_superuser) {
                fetchAllUsers();
            }
        }
    }, [activeTab, user, fetchMyProducts, fetchAllUsers]);

    // --- EVENT HANDLERS ---
    const handleOpenModal = (type) => {
        let config = {};
        switch (type) {
            case 'Product':
                config = {
                    title: 'Add New Product',
                    endpoint: '/api/admin/products/',
                    fields: [
                        { name: 'name', label: 'Product Name', type: 'text', required: true },
                        { name: 'description', label: 'Description', type: 'textarea', required: true },
                        { name: 'price', label: 'Price', type: 'number', required: true },
                        { name: 'image', label: 'Product Image', type: 'file', required: true },
                        { name: 'category', label: 'Category', type: 'select', required: false },
                        { name: 'is_active', label: 'Is Active?', type: 'checkbox', default: true },
                    ]
                };
                break;
            case 'Category':
                config = {
                    title: 'Add New Category',
                    endpoint: '/api/admin/categories/',
                    fields: [{ name: 'name', label: 'Category Name', type: 'text', required: true }]
                };
                break;
            case 'Contact':
                 config = {
                    title: 'Add New Contact',
                    endpoint: '/api/admin/contacts/',
                    fields: [
                        { name: 'name', label: 'Name (e.g., Main Office)', type: 'text', required: true },
                        { name: 'value', label: 'Value (e.g., 555-1234)', type: 'text', required: true },
                        { name: 'contact_type', label: 'Type', type: 'select', required: true, options: ['phone', 'email', 'address', 'social', 'other'] },
                        { name: 'display_order', label: 'Display Order', type: 'number', required: false },
                        { name: 'is_active', label: 'Is Active?', type: 'checkbox', default: true },
                    ]
                };
                break;
            default:
                return;
        }
        setModalConfig(config);
        setIsModalOpen(true);
    };

    const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const response = await api.patch("/api/user/myuser/", formData);
            setUser(response.data);
            setEditMode(false);
        } catch (err) {
            setError("Failed to update profile.");
        }
    };

    const handleUserStatusToggle = async (userId, currentStatus) => {
        try {
            await api.patch(`/api/user/${userId}/`, { is_active: !currentStatus });
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
        } catch (err) {
            setError("Failed to update user status.");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure? This action is irreversible.")) return;
        try {
            await api.delete(`/api/user/${userId}/`);
            setAllUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
            setError("Failed to delete user.");
        }
    };

    const getUserRole = (user) => {
        if (user.is_superuser) return 'Super Admin';
        if (user.is_staff) return 'Admin';
        return 'User';
    };

    // --- RENDER LOGIC ---
    if (loading) return <div className="profile-container"><div className="loading-spinner" /></div>;
    if (error) return <div className="profile-container error-message"><p>{error}</p></div>;
    if (!user) return null;

    // Calculate permissions on every render to ensure they are fresh
    const isSuperuser = user.is_superuser;
    const isAdmin = user.is_staff || user.is_superuser;

    return (
        <div className="profile-container">
            <header className="profile-header">
                <div className="profile-header__avatar">
                    {user.first_name && user.last_name ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}` : user.username.charAt(0).toUpperCase()}
                </div>
                <h1 className="profile-header__name">{user.first_name || user.username} {user.last_name || ""}</h1>
                <p className="profile-header__username">@{user.username}</p>
                <p className="profile-header__email">{user.email}</p>
                <div>
                    {isSuperuser && <span className="profile-header__badge profile-header__badge--superuser">Super Admin</span>}
                    {isAdmin && !isSuperuser && <span className="profile-header__badge profile-header__badge--admin">Admin</span>}
                </div>
            </header>

            <nav className="profile-tabs">
                <button className={`profile-tabs__button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Profile</button>
                <button className={`profile-tabs__button ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
                {isAdmin && <button className={`profile-tabs__button ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>Admin Panel</button>}
            </nav>

            <main className="profile-content">
                {activeTab === 'profile' && (
                    <section className="profile-content__section">
                        <div className="profile-content__header">
                            <h3>Personal Information</h3>
                            {!editMode && <button className="button button--secondary" onClick={() => setEditMode(true)}>Edit</button>}
                        </div>
                        {editMode ? (
                            <form onSubmit={handleSave}>
                                <div className="info-grid">
                                    <div className="info-grid__item"><label>First Name</label><input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} className="form-input" /></div>
                                    <div className="info-grid__item"><label>Last Name</label><input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} className="form-input" /></div>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="button button--text" onClick={() => setEditMode(false)}>Cancel</button>
                                    <button type="submit" className="button button--primary">Save Changes</button>
                                </div>
                            </form>
                        ) : (
                            <div className="info-grid">
                                <div className="info-grid__item"><label>First Name</label><p>{user.first_name || 'N/A'}</p></div>
                                <div className="info-grid__item"><label>Last Name</label><p>{user.last_name || 'N/A'}</p></div>
                                <div className="info-grid__item"><label>Username</label><p>{user.username}</p></div>
                                <div className="info-grid__item"><label>Email</label><p>{user.email}</p></div>
                                <div className="info-grid__item"><label>Member Since</label><p>{new Date(user.date_joined).toLocaleDateString()}</p></div>
                            </div>
                        )}
                    </section>
                )}

                {activeTab === 'settings' && (
                    <section className="profile-content__section">
                        <div className="profile-content__header"><h3>Account Settings</h3></div>
                        <PasswordChangeSection />
                    </section>
                )}

                {activeTab === 'admin' && isAdmin && (
                    <section className="profile-content__section">
                        <div className="profile-content__header"><h3>Admin Panel</h3></div>

                        <div className="my-products-section">
                            <div className="profile-content__header">
                                <h4>My Products ({myProducts.length})</h4>
                                <button onClick={fetchMyProducts} className="button button--secondary" disabled={productsLoading}>{productsLoading ? 'Refreshing...' : 'Refresh'}</button>
                            </div>
                            {productsLoading ? <div className="loading-spinner" /> : myProducts.length > 0 ? (
                                <div className="my-products-grid cards-container">{myProducts.map(p => <ProductCard key={p.id} product={p} categories={categories} />)}</div>
                            ) : <p>You have not created any products yet.</p>}
                        </div>

                        {isSuperuser && (
                            <div className="user-management-section">
                                <div className="profile-content__header"><h4>User Management</h4></div>
                                {adminLoading ? <div className="loading-spinner" /> : (
                                    <>
                                        <div className="users-table">
                                            <div className="users-table__header">
                                                <span>User</span><span>Email</span><span>Status</span><span>Role</span><span>Actions</span>
                                            </div>
                                            {Array.isArray(allUsers) && allUsers.map(userItem => (
                                                <div key={userItem.id} className="users-table__row">
                                                    <div className="users-table__user-info">
                                                        <div className="users-table__avatar">{userItem.first_name ? userItem.first_name.charAt(0) : userItem.username.charAt(0)}</div>
                                                        <p>{userItem.username}</p>
                                                    </div>
                                                    <span>{userItem.email}</span>
                                                    <span className={`status-pill status-pill--${userItem.is_active ? 'active' : 'inactive'}`}>{userItem.is_active ? 'Active' : 'Inactive'}</span>
                                                    <span>{getUserRole(userItem)}</span>
                                                    <div className="actions">
                                                        {userItem.id !== user.id && (
                                                            <>
                                                                <button className="button button--small button--secondary" onClick={() => handleUserStatusToggle(userItem.id, userItem.is_active)}>{userItem.is_active ? 'Deactivate' : 'Activate'}</button>
                                                                <button className="button button--small button--danger" onClick={() => handleDeleteUser(userItem.id)}>Delete</button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pagination-controls">
                                            <button onClick={() => fetchAllUsers(pagination.currentPage - 1)} disabled={!pagination.previous} className="button">Previous</button>
                                            <span>Page {pagination.currentPage} of {Math.ceil(pagination.count / 10)}</span>
                                            <button onClick={() => fetchAllUsers(pagination.currentPage + 1)} disabled={!pagination.next} className="button">Next</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="management-section">
                            <div className="profile-content__header"><h4>Content Management</h4></div>
                            <div className="management-actions">
                                <button className="button button--primary" onClick={() => handleOpenModal('Product')}>Add Product</button>
                                {isSuperuser && <button className="button button--primary" onClick={() => handleOpenModal('Category')}>Add Category</button>}
                                {isSuperuser && <button className="button button--primary" onClick={() => handleOpenModal('Contact')}>Add Contact</button>}
                            </div>
                        </div>
                    </section>
                )}
            </main>

            {isModalOpen && (
                <AddItemModal
                    config={modalConfig}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        alert(`${modalConfig.title.replace('Add New ', '')} added successfully!`);
                        if (modalConfig.endpoint.includes('products')) {
                            fetchMyProducts();
                        }
                    }}
                />
            )}
        </div>
    );
}
