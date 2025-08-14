import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import './css/styles.scss';
import { PasswordChangeSection } from '../../Components/PasswordChange/PasswordChange';
import { AddItemModal } from '../../Components/AddItemModal/index';
import Card from '../../Components/Card';
import { useNavigate } from 'react-router-dom';

const ProductCard = ({ product, categories, onToggleStatus }) => (
    <Card card={product} categories={categories} onToggleStatus={onToggleStatus} />
);

export default function Profile({ categories: initialCategories = [] }) {
    // --- STATE MANAGEMENT ---
    const navigate = useNavigate()
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
    const [allCategories, setAllCategories] = useState(initialCategories);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [pagination, setPagination] = useState({
        count: 0,
        next: null,
        previous: null,
        currentPage: 1,
    });
    const [editingItem, setEditingItem] = useState(null); // Track item being edited

    // --- DATA FETCHING ---
    const handleUserRoleChange = async (userId, newRole) => {
        if (!window.confirm(`Change this user's role to ${newRole}?`)) return;

        try {
            let updateData = {};
            if (newRole === 'Super Admin') {
                updateData = { is_staff: true, is_superuser: true };
            } else if (newRole === 'Admin') {
                updateData = { is_staff: true, is_superuser: false };
            } else {
                updateData = { is_staff: false, is_superuser: false };
            }

            console.log("Sending role update:", updateData);

            await api.patch(`/api/user/${userId}/`, updateData);

            // Update local state
            setAllUsers(prev => prev.map(u =>
                u.id === userId ? {
                    ...u,
                    ...updateData
                } : u
            ));

            // Show success message
            setError(`Successfully updated role to ${newRole}`);
            setTimeout(() => setError(null), 3000);
        } catch (err) {
            console.error("Role update error:", err.response?.data || err);
            setError("Failed to update user role: " + (err.response?.data?.detail || "Unknown error"));
        }
    };

    const fetchAllUsers = useCallback(async (page = 1) => {
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
    }, [user]);

    const fetchMyProducts = useCallback(async () => {
        if (!user || !(user.is_staff || user.is_superuser)) return;
        setProductsLoading(true);
        try {
            const response = await api.get('/api/admins/products/');
            const userProducts = response.data.filter(product => product.owner?.id === user.id);
            setMyProducts(userProducts);
        } catch (err) {
            console.error("Failed to fetch products:", err);
            setError("Failed to load your products.");
        } finally {
            setProductsLoading(false);
        }
    }, [user]);

    const fetchAllCategories = useCallback(async () => {
        if (!user || !(user.is_staff || user.is_superuser)) return;
        setCategoriesLoading(true);
        try {
            const response = await api.get('/api/admin/categories/');
            setAllCategories(response.data);
        } catch (err) {
            console.error("Failed to fetch categories:", err);
            setError("Failed to load categories.");
        } finally {
            setCategoriesLoading(false);
        }
    }, [user]);

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
            fetchAllCategories();
            if (user.is_superuser) {
                fetchAllUsers();
            }
        }
    }, [activeTab, user, fetchMyProducts, fetchAllUsers, fetchAllCategories]);

    // --- EVENT HANDLERS ---
    const handleOpenModal = (type, item = null) => {
        let config = {};
        setEditingItem(item); // Set the item being edited

        switch (type) {
            case 'Product':
                config = {
                    title: item ? 'Edit Product' : 'Add New Product',
                    endpoint: item ? `/api/admins/products/${item.id}/` : '/api/admins/products/',
                    method: item ? 'PATCH' : 'POST',
                    fields: [
                        { name: 'name', label: 'Product Name', type: 'text', required: true, value: item?.name },
                        { name: 'description', label: 'Description', type: 'textarea', required: true, value: item?.description },
                        { name: 'price', label: 'Price', type: 'number', required: true, value: item?.price },
                        { name: 'image', label: 'Product Image', type: 'file', required: !item }, // Not required for edits
                        {
                            name: 'category',
                            label: 'Category',
                            type: 'select',
                            required: false,
                            value: item?.category?.id,
                            options: allCategories.map(cat => ({ value: cat.id, label: cat.name }))
                        },
                        { name: 'is_active', label: 'Is Active?', type: 'checkbox', default: true, value: item?.is_active },
                    ]
                };
                break;
            case 'Category':
                config = {
                    title: item ? 'Edit Category' : 'Add New Category',
                    endpoint: item ? `/api/admins/categories/${item.id}/` : '/api/admins/categories/',
                    method: item ? 'PATCH' : 'POST',
                    fields: [
                        { name: 'name', label: 'Category Name', type: 'text', required: true, value: item?.name },
                        { name: 'is_active', label: 'Is Active?', type: 'checkbox', default: true, value: item?.is_active },
                    ]
                };
                break;
            case 'Contact':
                config = {
                    title: item ? 'Edit Contact' : 'Add New Contact',
                    endpoint: item ? `/api/admins/contacts/${item.id}/` : '/api/admins/contacts/',
                    method: item ? 'PATCH' : 'POST',
                    fields: [
                        { name: 'name', label: 'Name (e.g., Main Office)', type: 'text', required: true, value: item?.name },
                        { name: 'value', label: 'Value (e.g., 555-1234)', type: 'text', required: true, value: item?.value },
                        {
                            name: 'contact_type',
                            label: 'Type',
                            type: 'select',
                            required: true,
                            value: item?.contact_type,
                            options: ['phone', 'email', 'address', 'social', 'other'].map(type => ({
                                value: type,
                                label: type.charAt(0).toUpperCase() + type.slice(1)
                            }))
                        },
                        { name: 'display_order', label: 'Display Order', type: 'number', required: false, value: item?.display_order },
                        { name: 'is_active', label: 'Is Active?', type: 'checkbox', default: true, value: item?.is_active },
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

            // Add page reload after successful save
            setTimeout(() => {
                window.location.reload();
            }, 100);

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

    const handleCategoryStatusToggle = async (categoryId, currentStatus) => {
        try {
            await api.patch(`/api/admins/categories/${categoryId}/`, { is_active: !currentStatus });
            setAllCategories(prev => prev.map(cat => cat.id === categoryId ? { ...cat, is_active: !currentStatus } : cat));
        } catch (err) {
            setError("Failed to update category status.");
        }
    };

    const handleProductStatusToggle = async (productId, currentStatus) => {
        try {
            await api.patch(`/api/admins/products/${productId}/`, { is_active: !currentStatus });
            setMyProducts(prev => prev.map(product => product.id === productId ? { ...product, is_active: !currentStatus } : product));
        } catch (err) {
            setError("Failed to update product status.");
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            await api.delete(`/api/admins/products/${productId}/`);
            setMyProducts(prev => prev.filter(product => product.id !== productId));
        } catch (err) {
            setError("Failed to delete product.");
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (!window.confirm("Are you sure you want to delete this category?")) return;
        try {
            await api.delete(`/api/admins/categories/${categoryId}/`);
            setAllCategories(prev => prev.filter(cat => cat.id !== categoryId));
        } catch (err) {
            setError("Failed to delete category.");
        }
    };

    // Modified onSuccess handler to always reload the page
    const handleModalSuccess = () => {
        console.log("Modal success triggered - reloading page"); // Debug log
        setIsModalOpen(false);
        setEditingItem(null); // Clear the editing item

        // Add a small delay to ensure modal closes before reload
        setTimeout(() => {
            window.location.reload();
        }, 100);
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
                                <div className="products-table table">
                                    <div className="products-table__header table__header">
                                        <span>Product Name</span><span>Status</span><span>Actions</span>
                                    </div>
                                    {myProducts.map(product => (
                                        <div key={product.id} className="products-table__row table__row">
                                            <span>{product.name}</span>
                                            <span className={`status-pill status-pill--${product.is_active ? 'active' : 'inactive'}`}>{product.is_active ? 'Active' : 'Inactive'}</span>
                                            <div className="actions">
                                                <button
                                                    className="button button--small button--secondary"
                                                    onClick={() => handleProductStatusToggle(product.id, product.is_active)}
                                                >
                                                    {product.is_active ? 'Deactivate' : 'Activate'}
                                                </button>
                                                <button
                                                    className="button button--small button--primary"
                                                    onClick={() => handleOpenModal('Product', product)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="button button--small button--danger"
                                                    onClick={() => handleDeleteProduct(product.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p>You have not created any products yet.</p>}
                        </div>

                        <div className="category-management-section management-section">
                            <div className="profile-content__header">
                                <h4>Category Management</h4>
                                <button onClick={fetchAllCategories} className="button button--secondary" disabled={categoriesLoading}>{categoriesLoading ? 'Refreshing...' : 'Refresh'}</button>
                            </div>
                            {categoriesLoading ? <div className="loading-spinner" /> : allCategories.length > 0 ? (
                                <div className="categories-table table">
                                    <div className="categories-table__header table__header">
                                        <span>Category Name</span><span>Status</span><span>Actions</span>
                                    </div>
                                    {allCategories.map(category => (
                                        <div key={category.id} className="categories-table__row table__row">
                                            <span>{category.name}</span>
                                            <span className={`status-pill status-pill--${category.is_active ? 'active' : 'inactive'}`}>{category.is_active ? 'Active' : 'Inactive'}</span>
                                            <div className="actions">
                                                <button
                                                    className="button button--small button--secondary"
                                                    onClick={() => handleCategoryStatusToggle(category.id, category.is_active)}
                                                >
                                                    {category.is_active ? 'Deactivate' : 'Activate'}
                                                </button>
                                                <button
                                                    className="button button--small button--primary"
                                                    onClick={() => handleOpenModal('Category', category)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="button button--small button--danger"
                                                    onClick={() => handleDeleteCategory(category.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p>No categories found.</p>}
                        </div>

                        {isSuperuser && (
                            <div className="user-management-section management-section">
                                <div className="profile-content__header"><h4>User Management</h4></div>
                                {adminLoading ? <div className="loading-spinner" /> : (
                                    <>
                                        <div className="users-table table">
                                            <div className="users-table__header table__header">
                                                <span>User</span><span>Email</span><span>Status</span><span>Role</span><span>Actions</span>
                                            </div>
                                            {Array.isArray(allUsers) && allUsers.map(userItem => (
                                                <div key={userItem.id} className="users-table__row table__row">
                                                    <div className="users-table__user-info table__user-info">
                                                        <div className="users-table__avatar table__avatar">
                                                            {userItem.first_name ? userItem.first_name.charAt(0) : userItem.username.charAt(0)}
                                                        </div>
                                                        <p>{userItem.username}</p>
                                                    </div>
                                                    <span>{userItem.email}</span>
                                                    <span className={`status-pill status-pill--${userItem.is_active ? 'active' : 'inactive'}`}>
                                                        {userItem.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                    <span>
                                                        {userItem.is_superuser ? "Super Admin" : userItem.is_staff ? "Admin" : "User"}
                                                    </span>
                                                    <div className="actions">
                                                        {userItem.id !== user.id && (
                                                            <>
                                                                <button
                                                                    className="button button--small button--secondary"
                                                                    onClick={() => handleUserStatusToggle(userItem.id, userItem.is_active)}
                                                                >
                                                                    {userItem.is_active ? 'Deactivate' : 'Activate'}
                                                                </button>
                                                                <button
                                                                    className="button button--small button--danger"
                                                                    onClick={() => handleDeleteUser(userItem.id)}
                                                                >
                                                                    Delete
                                                                </button>
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
                                <button className="button button--primary" onClick={() => handleOpenModal('Product')}>Add New Product</button>
                                <button className="button button--primary" onClick={() => handleOpenModal('Category')}>Add New Category</button>
                                <button className="button button--primary" onClick={() => handleOpenModal('Contact')}>Add New Contact</button>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            {isModalOpen && modalConfig && (
                <AddItemModal
                    config={modalConfig}
                    onClose={() => {
                        console.log("Modal closing"); // Debug log
                        setIsModalOpen(false);
                        // Force reload whenever modal closes (after any operation)
                        setTimeout(() => {
                            console.log("Reloading page after modal close");
                            window.location.reload();
                        }, 300);
                    }}
                    onSuccess={handleModalSuccess}
                />
            )}
        </div>
    );
}