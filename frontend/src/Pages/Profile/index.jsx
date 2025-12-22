import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import './css/styles.scss';
import { PasswordChangeSection } from '../../Components/PasswordChange/PasswordChange';
import { AddItemModal } from '../../Components/AddItemModal/index';
import Card from '../../Components/Card';
import { useNavigate } from 'react-router-dom';
import SimpleThemeToggle from '../../Components/ThemeToggle/SimpleThemeToggle';
import ThemeToggle from '../../Components/ThemeToggle/SimpleThemeToggle';

// Constants for better maintainability
const USER_ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  USER: 'User'
};

const MODAL_TYPES = {
  PRODUCT: 'Product',
  CATEGORY: 'Category',
  CONTACT: 'Contact',
  TAG: 'Tag'
};

const PaginationControls = ({ pagination, onPageChange, loading }) => {
  const totalPages = Math.ceil(pagination.count / 10);

  return (
    <div className="pagination-controls">
      <button
        onClick={() => onPageChange(pagination.currentPage - 1)}
        disabled={!pagination.previous || loading}
        className="button"
      >
        Previous
      </button>
      <span>
        Page {pagination.currentPage} of {totalPages || 1} ({pagination.count} total items)
      </span>
      <button
        onClick={() => onPageChange(pagination.currentPage + 1)}
        disabled={!pagination.next || loading}
        className="button"
      >
        Next
      </button>
    </div>
  );
};
const ProductCard = ({ product, categories, onToggleStatus }) => (
  <Card card={product} categories={categories} onToggleStatus={onToggleStatus} />
);

export default function Profile({ categories: initialCategories = [] }) {
  // Navigation
  const navigate = useNavigate();

  // State management
  const [state, setState] = useState({
    user: null,
    loading: true,
    error: null,
    activeTab: 'profile',
    editMode: false,
    formData: { first_name: '', last_name: '' },
    isModalOpen: false,
    modalConfig: null,
    allUsers: [],
    adminLoading: false,
    myProducts: [],
    productsLoading: false,
    productsPagination: {
      count: 0,
      next: null,
      previous: null,
      currentPage: 1,
    },
    allCategories: initialCategories,
    categoriesLoading: false,
    categoriesPagination: {
      count: 0,
      next: null,
      previous: null,
      currentPage: 1,
    },
    allContacts: [],
    contactsLoading: false,
    contactsPagination: {
      count: 0,
      next: null,
      previous: null,
      currentPage: 1,
    },
    allTags: [],
    tagsLoading: false,
    tagsPagination: {
      count: 0,
      next: null,
      previous: null,
      currentPage: 1,
    },
    usersPagination: {
      count: 0,
      next: null,
      previous: null,
      currentPage: 1,
    },
    editingItem: null
  });

  // Destructure state for easier access
  const {
    user,
    loading,
    error,
    activeTab,
    editMode,
    formData,
    allTags,
    tagsLoading,
    tagsPagination,
    isModalOpen,
    modalConfig,
    allUsers,
    adminLoading,
    usersPagination,
    myProducts,
    productsLoading,
    productsPagination,
    allCategories,
    categoriesLoading,
    categoriesPagination,
    allContacts,
    contactsLoading,
    contactsPagination,
    editingItem
  } = state;

  // Derived state
  const isSuperuser = user?.is_superuser;
  const isAdmin = user?.is_staff || isSuperuser;

  // Data fetching functions
  const fetchData = useCallback(async (url, options = {}) => {
    try {
      return await api.get(url, options);
    } catch (error) {
      throw error;
    }
  }, []);


  const updateData = useCallback(async (url, data, method = 'patch') => {
    try {
      if (method === 'patch') {
        return await api.patch(url, data);
      } else if (method === 'post') {
        return await api.post(url, data);
      } else if (method === 'delete') {
        return await api.delete(url);
      }
    } catch (error) {
      throw error;
    }
  }, []);

  // Fetch functions
  const fetchAllUsers = useCallback(async (page = 1) => {
    if (!isSuperuser) return;

    setState(prev => ({ ...prev, adminLoading: true }));

    try {
      const response = await fetchData(`/api/user/all/?page=${page}`);
      setState(prev => ({
        ...prev,
        allUsers: response.data.results,
        usersPagination: {
          count: response.data.count,
          next: response.data.next,
          previous: response.data.previous,
          currentPage: page,
        },
        adminLoading: false
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: "Failed to load user list.",
        adminLoading: false
      }));
    }
  }, [isSuperuser, fetchData]);

  const fetchMyProducts = useCallback(async (page = 1) => {
    if (!isAdmin) return;

    setState(prev => ({ ...prev, productsLoading: true }));

    try {
      const response = await fetchData(`/api/admins/products/?page=${page}`);

      // ✅ Safely extract results from paginated response
      const allProducts = response.data?.results ?? response.data ?? [];

      // Filter products by current user
      const userProducts = allProducts.filter(product => product.owner === user?.id);

      console.log('All products:', allProducts);
      console.log('Current user ID:', user?.id);
      console.log('Filtered user products:', userProducts);

      setState(prev => ({
        ...prev,
        myProducts: userProducts,
        productsPagination: {
          count: response.data?.count ?? 0,
          next: response.data?.next ?? null,
          previous: response.data?.previous ?? null,
          currentPage: page,
        },
        productsLoading: false
      }));
    } catch (err) {
      console.error('Error fetching products:', err);
      setState(prev => ({
        ...prev,
        error: "Failed to load your products.",
        productsLoading: false
      }));
    }
  }, [isAdmin, user?.id, fetchData]);

  const fetchAllCategories = useCallback(async (page = 1) => {
    if (!isAdmin) return;

    setState(prev => ({ ...prev, categoriesLoading: true }));

    try {
      const response = await fetchData(`/api/admins/categories/?page=${page}`);
      setState(prev => ({
        ...prev,
        allCategories: response.data.results,
        categoriesPagination: {
          count: response.data.count,
          next: response.data.next,
          previous: response.data.previous,
          currentPage: page,
        },
        categoriesLoading: false
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: "Failed to load categories.",
        categoriesLoading: false
      }));
    }
  }, [isAdmin, fetchData]);

  const fetchAllContacts = useCallback(async (page = 1) => {
    if (!isAdmin) return;

    setState(prev => ({ ...prev, contactsLoading: true }));

    try {
      const response = await fetchData(`/api/admins/contacts/?page=${page}`);
      setState(prev => ({
        ...prev,
        allContacts: response.data.results,
        contactsPagination: {
          count: response.data.count,
          next: response.data.next,
          previous: response.data.previous,
          currentPage: page,
        },
        contactsLoading: false
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: "Failed to load contacts.",
        contactsLoading: false
      }));
    }
  }, [isAdmin, fetchData]);

  const fetchAllTags = useCallback(async (page = 1) => {
    if (!isAdmin) return;

    setState(prev => ({ ...prev, tagsLoading: true }));

    try {
      const response = await fetchData(`/api/admins/tags/?page=${page}`);
      console.log('Tags API response:', response.data); // Debug log

      // Check if response.data has results property (pagination) or is the array itself
      const tagsData = response.data?.results || response.data;

      setState(prev => ({
        ...prev,
        allTags: Array.isArray(tagsData) ? tagsData : [],
        tagsPagination: {
          count: response.data?.count || 0,
          next: response.data?.next || null,
          previous: response.data?.previous || null,
          currentPage: page,
        },
        tagsLoading: false
      }));
    } catch (err) {
      console.error('Error fetching tags:', err);
      setState(prev => ({
        ...prev,
        error: "Failed to load tags.",
        tagsLoading: false
      }));
    }
  }, [isAdmin, fetchData]);
  
  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetchData("/api/user/myuser/");
      setState(prev => ({
        ...prev,
        user: response.data,
        formData: {
          first_name: response.data.first_name || '',
          last_name: response.data.last_name || ''
        },
        loading: false
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: "Failed to load user data.",
        loading: false
      }));
    }
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Tab-specific data fetching
  useEffect(() => {
    if (isAdmin && activeTab === 'admin') {
      fetchMyProducts();
      fetchAllCategories();
      fetchAllContacts();
      fetchAllTags();
      if (isSuperuser) {
        fetchAllUsers();
      }
    }
  }, [activeTab, isAdmin, isSuperuser, fetchMyProducts, fetchAllCategories, fetchAllContacts, fetchAllTags, fetchAllUsers]);

  // Modal handling
  const handleOpenModal = (type, item = null) => {
    let config = {};

    const commonFields = {
      [MODAL_TYPES.PRODUCT]: [
        { name: 'name', label: 'Product Name', type: 'text', required: true, value: item?.name },
        { name: 'description', label: 'Description', type: 'textarea', required: true, value: item?.description },
        { name: 'price', label: 'Price', type: 'number', required: true, value: item?.price },
        { name: 'image', label: 'Product Image', type: 'file', required: !item },
        {
          name: 'category',
          label: 'Category',
          type: 'select',
          required: false,
          value: item?.category?.id,
          // Add safe access with optional chaining and default array
          options: (allCategories || []).map(cat => ({ id: cat.id, name: cat.name }))
        },
        { name: 'tags', label: 'Tags', type: 'tags', value: item?.tags },
        { name: 'is_active', label: 'Is Active?', type: 'checkbox', default: true, value: item?.is_active },
      ],
      [MODAL_TYPES.CATEGORY]: [
        { name: 'name', label: 'Category Name', type: 'text', required: true, value: item?.name },
        { name: 'is_active', label: 'Is Active?', type: 'checkbox', default: true, value: item?.is_active },
      ],
      [MODAL_TYPES.CONTACT]: [
        { name: 'name', label: 'Name (e.g., Main Office)', type: 'text', required: true, value: item?.name },
        { name: 'value', label: 'Value (e.g., 555-1234)', type: 'text', required: true, value: item?.value },
        {
          name: 'contact_type',
          label: 'Type',
          type: 'select',
          required: true,
          value: item?.contact_type,
          options: ['phone', 'email', 'address', 'social', 'other'].map(type => ({
            id: type,
            name: type.charAt(0).toUpperCase() + type.slice(1)
          }))
        },
        { name: 'display_order', label: 'Display Order', type: 'number', required: false, value: item?.display_order },
        { name: 'is_active', label: 'Is Active?', type: 'checkbox', default: true, value: item?.is_active },
      ],
      [MODAL_TYPES.TAG]: [
        { name: 'name', label: 'Tag Name', type: 'text', required: true, value: item?.name },
        { name: 'slug', label: 'Slug (URL-friendly name)', type: 'text', required: false, value: item?.slug },
      ]
    };

    // Determine the correct endpoint based on type
    let endpoint;
    endpoint = item ? `/api/admins/${type.toLowerCase()}s/${item.id}/` : `/api/admins/${type.toLowerCase()}s/`;

    config = {
      title: item ? `Edit ${type}` : `Add New ${type}`,
      endpoint: endpoint,
      method: item ? 'PATCH' : 'POST',
      fields: commonFields[type]
    };

    setState(prev => {
      // Ensure prev is always an object
      if (!prev || typeof prev !== 'object') {
        return {
          ...state, // Use current state as fallback
          modalConfig: config,
          isModalOpen: true,
          editingItem: item
        };
      }
      return {
        ...prev,
        modalConfig: config,
        isModalOpen: true,
        editingItem: item
      };
    });
  };

  // Form handling
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [name]: value
      }
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const response = await updateData("/api/user/myuser/", formData);
      setState(prev => ({
        ...prev,
        user: response.data,
        editMode: false
      }));
      setTimeout(() => window.location.reload(), 100);
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: "Failed to update profile."
      }));
    }
  };

  // Status toggle handlers
  const createToggleHandler = (entityType) => async (id, currentStatus) => {
    try {
      const endpoint = `/api/admins/${entityType}s/${id}/`;

      await updateData(endpoint, { is_active: !currentStatus });

      setState(prev => {
        let stateKey;
        if (entityType === 'product') stateKey = 'myProducts';
        else if (entityType === 'category') stateKey = 'allCategories';
        else if (entityType === 'contact') stateKey = 'allContacts';
        else if (entityType === 'tag') stateKey = 'allTags';

        const newItems = prev[stateKey].map(item =>
          item.id === id ? { ...item, is_active: !currentStatus } : item
        );

        return {
          ...prev,
          [stateKey]: newItems
        };
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: `Failed to update ${entityType} status.`
      }));
    }
  };

  const handleProductStatusToggle = createToggleHandler('product');
  const handleCategoryStatusToggle = createToggleHandler('category');
  const handleContactStatusToggle = createToggleHandler('contact');

  const handleUserStatusToggle = async (userId, currentStatus) => {
    try {
      await updateData(`/api/user/${userId}/`, { is_active: !currentStatus });
      setState(prev => ({
        ...prev,
        allUsers: prev.allUsers.map(u =>
          u.id === userId ? { ...u, is_active: !currentStatus } : u
        )
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: "Failed to update user status."
      }));
    }
  };

  // Delete handlers
  const createDeleteHandler = (entityType) => async (id) => {
    if (!window.confirm(`Are you sure you want to delete this ${entityType}?`)) return;

    try {
      const endpoint = `/api/admins/${entityType}s/${id}/`;

      await updateData(endpoint, {}, 'delete');

      setState(prev => {
        let stateKey;
        if (entityType === 'product') stateKey = 'myProducts';
        else if (entityType === 'category') stateKey = 'allCategories';
        else if (entityType === 'contact') stateKey = 'allContacts';
        else if (entityType === 'tag') stateKey = 'allTags';

        const newItems = prev[stateKey].filter(item => item.id !== id);

        return {
          ...prev,
          [stateKey]: newItems
        };
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: `Failed to delete ${entityType}.`
      }));
    }
  };

  const handleDeleteProduct = createDeleteHandler('product');
  const handleDeleteCategory = createDeleteHandler('category');
  const handleDeleteContact = createDeleteHandler('contact');
  const handleDeleteTag = createDeleteHandler('tag');

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure? This action is irreversible.")) return;
    try {
      await updateData(`/api/user/${userId}/`, {}, 'delete');
      setState(prev => ({
        ...prev,
        allUsers: prev.allUsers.filter(u => u.id !== userId)
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: "Failed to delete user."
      }));
    }
  };

  // User role management
  const handleUserRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Change this user's role to ${newRole}?`)) return;

    try {
      const roleUpdateData = {
        is_staff: newRole !== USER_ROLES.USER,
        is_superuser: newRole === USER_ROLES.SUPER_ADMIN
      };

      await updateData(`/api/user/${userId}/`, roleUpdateData);

      setState(prev => ({
        ...prev,
        allUsers: prev.allUsers.map(u =>
          u.id === userId ? { ...u, ...roleUpdateData } : u
        ),
        error: `Successfully updated role to ${newRole}`
      }));

      setTimeout(() => setState(prev => ({ ...prev, error: null })), 3000);
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: "Failed to update user role: " + (err.response?.data?.detail || "Unknown error")
      }));
    }
  };

  // Modal success handler
  const handleModalSuccess = () => {
    setState(prev => ({
      ...prev,
      isModalOpen: false,
      editingItem: null
    }));
    setTimeout(() => window.location.reload(), 100);
  };

  // Helper functions
  const getUserRole = (user) => {
    if (user.is_superuser) return USER_ROLES.SUPER_ADMIN;
    if (user.is_staff) return USER_ROLES.ADMIN;
    return USER_ROLES.USER;
  };

  // Render loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  // Render error state
  if (error) return (
    <div className="profile-container error-message">
      <p>{error}</p>
    </div>
  );

  // Render nothing if no user
  if (!user) return null;

  return (
    <div className="profile-container">
      {/* Profile Header */}
      <header className="profile-header">
        <div className="profile-header__avatar">
          {user.first_name && user.last_name
            ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`
            : user.username.charAt(0).toUpperCase()}
        </div>
        <h1 className="profile-header__name">
          {user.first_name || user.username} {user.last_name || ""}
        </h1>
        <p className="profile-header__username">@{user.username}</p>
        <p className="profile-header__email">{user.email}</p>
        <div>
          {isSuperuser && (
            <span className="profile-header__badge profile-header__badge--superuser">
              Super Admin
            </span>
          )}
          {isAdmin && !isSuperuser && (
            <span className="profile-header__badge profile-header__badge--admin">
              Admin
            </span>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="profile-tabs">
        <button
          className={`profile-tabs__button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setState(prev => ({ ...prev, activeTab: 'profile' }))}
        >
          Profile
        </button>
        <button
          className={`profile-tabs__button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setState(prev => ({ ...prev, activeTab: 'settings' }))}
        >
          Settings
        </button>
        {isAdmin && (
          <button
            className={`profile-tabs__button ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setState(prev => ({ ...prev, activeTab: 'admin' }))}
          >
            Admin Panel
          </button>
        )}
      </nav>

      {/* Main Content */}
      <main className="profile-content">
        {activeTab === 'profile' && (
          <ProfileTab
            user={user}
            editMode={editMode}
            formData={formData}
            onInputChange={handleInputChange}
            onSave={handleSave}
            onEditToggle={() => setState(prev => ({ ...prev, editMode: !prev.editMode }))}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminTab
            isSuperuser={isSuperuser}
            user={user}
            myProducts={myProducts}
            productsLoading={productsLoading}
            productsPagination={productsPagination}
            allCategories={allCategories}
            categoriesLoading={categoriesLoading}
            categoriesPagination={categoriesPagination}
            allContacts={allContacts}
            contactsLoading={contactsLoading}
            contactsPagination={contactsPagination}
            allTags={allTags}
            tagsLoading={tagsLoading}
            tagsPagination={tagsPagination}
            allUsers={allUsers}
            adminLoading={adminLoading}
            usersPagination={usersPagination}
            onRefreshProducts={fetchMyProducts}
            onRefreshCategories={fetchAllCategories}
            onRefreshContacts={fetchAllContacts}
            onRefreshTags={fetchAllTags}
            onRefreshUsers={fetchAllUsers}
            onProductStatusToggle={handleProductStatusToggle}
            onCategoryStatusToggle={handleCategoryStatusToggle}
            onContactStatusToggle={handleContactStatusToggle}
            onUserStatusToggle={handleUserStatusToggle}
            onDeleteProduct={handleDeleteProduct}
            onDeleteCategory={handleDeleteCategory}
            onDeleteContact={handleDeleteContact}
            onDeleteTag={handleDeleteTag}
            onDeleteUser={handleDeleteUser}
            onOpenModal={handleOpenModal}
          />
        )}
      </main>

      {/* Modal */}
      {isModalOpen && modalConfig && (
        <AddItemModal
          config={modalConfig}
          onClose={() => setState(prev => ({ ...prev, isModalOpen: false }))}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}

// Sub-components
const ProfileTab = ({ user, editMode, formData, onInputChange, onSave, onEditToggle }) => (
  <section className="profile-content__section">
    <div className="profile-content__header">
      <h3>Personal Information</h3>
      {!editMode && (
        <button className="button button--secondary" onClick={onEditToggle}>
          Edit
        </button>
      )}
    </div>

    {editMode ? (
      <div>
        <div className="info-grid">
          <div className="info-grid__item">
            <label>First Name</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={onInputChange}
              className="form-input"
            />
          </div>
          <div className="info-grid__item">
            <label>Last Name</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={onInputChange}
              className="form-input"
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="button button--text" onClick={onEditToggle}>
            Cancel
          </button>
          <button type="button" className="button button--primary" onClick={onSave}>
            Save Changes
          </button>
        </div>
      </div>
    ) : (
      <div className="info-grid">
        <div className="info-grid__item">
          <label>First Name</label>
          <p>{user.first_name || 'N/A'}</p>
        </div>
        <div className="info-grid__item">
          <label>Last Name</label>
          <p>{user.last_name || 'N/A'}</p>
        </div>
        <div className="info-grid__item">
          <label>Username</label>
          <p>{user.username}</p>
        </div>
        <div className="info-grid__item">
          <label>Email</label>
          <p>{user.email}</p>
        </div>
        <div className="info-grid__item">
          <label>Member Since</label>
          <p>{new Date(user.date_joined).toLocaleDateString()}</p>
        </div>
      </div>
    )}
  </section>
);

// In your Profile component (index.jsx), update the SettingsTab component
const SettingsTab = () => (
  <section className="profile-content__section">
    <div className="profile-content__header">
      <h3>Account Settings</h3>
    </div>

    {/* Theme Toggle Section */}
    <div className="settings-section">
      <h4 className="settings-section__title">Appearance</h4>
      <ThemeToggle />
    </div>

    {/* Password Change Section */}
    <div className="settings-section">
      <h4 className="settings-section__title">Security</h4>
      <p className="settings-section__description">
        Manage your account security settings
      </p>
      <PasswordChangeSection />
    </div>
  </section>
);
const AdminTab = ({
  isSuperuser,
  user,
  myProducts = [],              // ✅ Add default
  productsLoading,
  productsPagination,
  allCategories = [],           // ✅ Add default
  categoriesLoading,
  categoriesPagination,
  allContacts = [],             // ✅ Add default
  contactsLoading,
  contactsPagination,
  allTags = [],                 // ✅ Add default
  tagsLoading,
  tagsPagination,
  allUsers = [],                // ✅ Add default
  adminLoading,
  usersPagination,
  onRefreshProducts,
  onRefreshCategories,
  onRefreshContacts,
  onRefreshTags,
  onRefreshUsers,
  onProductStatusToggle,
  onCategoryStatusToggle,
  onContactStatusToggle,
  onUserStatusToggle,
  onDeleteProduct,
  onDeleteCategory,
  onDeleteContact,
  onDeleteTag,
  onDeleteUser,
  onOpenModal
}) => (
  <section className="profile-content__section">
    <div className="profile-content__header">
      <h3>Admin Panel</h3>
    </div>

    {/* Products Section */}
    <div className="my-products-section">
      <div className="profile-content__header">
        <h4>My Products ({productsPagination.count})</h4>
        <button
          onClick={() => onRefreshProducts(1)}
          className="button button--secondary"
          disabled={productsLoading}
        >
          {productsLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {productsLoading ? (
        <div className="loading-spinner" />
      ) : myProducts.length > 0 ? (
        <>
          <ProductTable
            products={myProducts}
            onStatusToggle={onProductStatusToggle}
            onEdit={onOpenModal}
            onDelete={onDeleteProduct}
          />
          <PaginationControls
            pagination={productsPagination}
            onPageChange={onRefreshProducts}
            loading={productsLoading}
          />
        </>
      ) : (
        <p>You have not created any products yet.</p>
      )}
    </div>

    {/* Categories Section */}
    <div className="category-management-section management-section">
      <div className="profile-content__header">
        <h4>Category Management ({categoriesPagination.count})</h4>
        <button
          onClick={() => onRefreshCategories(1)}
          className="button button--secondary"
          disabled={categoriesLoading}
        >
          {categoriesLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {categoriesLoading ? (
        <div className="loading-spinner" />
      ) : allCategories.length > 0 ? (
        <>
          <CategoryTable
            categories={allCategories}
            onStatusToggle={onCategoryStatusToggle}
            onEdit={onOpenModal}
            onDelete={onDeleteCategory}
          />
          <PaginationControls
            pagination={categoriesPagination}
            onPageChange={onRefreshCategories}
            loading={categoriesLoading}
          />
        </>
      ) : (
        <p>No categories found.</p>
      )}
    </div>

    {/* Contacts Section */}
    <div className="contact-management-section management-section">
      <div className="profile-content__header">
        <h4>Contact Management ({contactsPagination.count})</h4>
        <button
          onClick={() => onRefreshContacts(1)}
          className="button button--secondary"
          disabled={contactsLoading}
        >
          {contactsLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {contactsLoading ? (
        <div className="loading-spinner" />
      ) : allContacts.length > 0 ? (
        <>
          <ContactTable
            contacts={allContacts}
            onStatusToggle={onContactStatusToggle}
            onEdit={onOpenModal}
            onDelete={onDeleteContact}
          />
          <PaginationControls
            pagination={contactsPagination}
            onPageChange={onRefreshContacts}
            loading={contactsLoading}
          />
        </>
      ) : (
        <p>No contacts found.</p>
      )}
    </div>

    {/* Tags Section */}
    <div className="tag-management-section management-section">
      <div className="profile-content__header">
        <h4>Tag Management ({tagsPagination?.count ?? 0})</h4>
        <button
          onClick={() => onRefreshTags(1)}
          className="button button--secondary"
          disabled={tagsLoading}
        >
          {tagsLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {tagsLoading ? (
        <div className="loading-spinner" />
      ) : (allTags?.length ?? 0) > 0 ? (
        <>
          <TagTable
            tags={allTags}
            onEdit={onOpenModal}
            onDelete={onDeleteTag}
          />
          {tagsPagination && (
            <PaginationControls
              pagination={tagsPagination}
              onPageChange={onRefreshTags}
              loading={tagsLoading}
            />
          )}
        </>
      ) : (
        <p>No tags found.</p>
      )}
    </div>

    {/* User Management (Super Admin only) */}
    {isSuperuser && (
      <div className="user-management-section management-section">
        <div className="profile-content__header">
          <h4>User Management ({usersPagination?.count || 0})</h4>
        </div>

        {adminLoading ? (
          <div className="loading-spinner" />
        ) : allUsers.length > 0 ? (
          <>
            <UserTable
              users={allUsers}
              currentUserId={user.id}
              onStatusToggle={onUserStatusToggle}
              onDelete={onDeleteUser}
            />
            {usersPagination && (
              <PaginationControls
                pagination={usersPagination}
                onPageChange={onRefreshUsers}
                loading={adminLoading}
              />
            )}
          </>
        ) : (
          <p>No users found.</p>
        )}
      </div>
    )}

    {/* Content Management Actions */}
    <div className="management-section">
      <div className="profile-content__header">
        <h4>Content Management</h4>
      </div>
      <div className="management-actions">
        <button
          className="button button--primary"
          onClick={() => onOpenModal('Product')}
        >
          Add New Product
        </button>
        <button
          className="button button--primary"
          onClick={() => onOpenModal('Category')}
        >
          Add New Category
        </button>
        <button
          className="button button--primary"
          onClick={() => onOpenModal('Contact')}
        >
          Add New Contact
        </button>
        <button
          className="button button--primary"
          onClick={() => onOpenModal('Tag')}
        >
          Add New Tag
        </button>
      </div>
    </div>
  </section>
);

// Table Components
const TagTable = ({ tags, onEdit, onDelete }) => (
  <div className="tags-table table">
    <div className="tags-table__header table__header">
      <span>Tag Name</span>
      <span>Slug</span>
      <span>Actions</span>
    </div>

    {tags.map(tag => (
      <div key={tag.id} className="tags-table__row table__row">
        <span>{tag.name}</span>
        <span className="tag-slug">{tag.slug || 'N/A'}</span>
        <div className="actions">
          <button
            className="button button--small button--primary"
            onClick={() => onEdit('Tag', tag)}
          >
            Edit
          </button>
          <button
            className="button button--small button--danger"
            onClick={() => onDelete(tag.id)}
          >
            Delete
          </button>
        </div>
      </div>
    ))}
  </div>
);

const ProductTable = ({ products, onStatusToggle, onEdit, onDelete }) => (
  <div className="products-table table">
    <div className="products-table__header table__header">
      <span>Product Name</span>
      <span>Status</span>
      <span>Actions</span>
    </div>

    {products.map(product => (
      <div key={product.id} className="products-table__row table__row">
        <span>{product.name}</span>
        <span className={`status-pill status-pill--${product.is_active ? 'active' : 'inactive'}`}>
          {product.is_active ? 'Active' : 'Inactive'}
        </span>
        <div className="actions">
          <button
            className="button button--small button--secondary"
            onClick={() => onStatusToggle(product.id, product.is_active)}
          >
            {product.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            className="button button--small button--primary"
            onClick={() => onEdit('Product', product)}
          >
            Edit
          </button>
          <button
            className="button button--small button--danger"
            onClick={() => onDelete(product.id)}
          >
            Delete
          </button>
        </div>
      </div>
    ))}
  </div>
);

const CategoryTable = ({ categories, onStatusToggle, onEdit, onDelete }) => (
  <div className="categories-table table">
    <div className="categories-table__header table__header">
      <span>Category Name</span>
      <span>Status</span>
      <span>Actions</span>
    </div>

    {categories.map(category => (
      <div key={category.id} className="categories-table__row table__row">
        <span>{category.name}</span>
        <span className={`status-pill status-pill--${category.is_active ? 'active' : 'inactive'}`}>
          {category.is_active ? 'Active' : 'Inactive'}
        </span>
        <div className="actions">
          <button
            className="button button--small button--secondary"
            onClick={() => onStatusToggle(category.id, category.is_active)}
          >
            {category.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            className="button button--small button--primary"
            onClick={() => onEdit('Category', category)}
          >
            Edit
          </button>
          <button
            className="button button--small button--danger"
            onClick={() => onDelete(category.id)}
          >
            Delete
          </button>
        </div>
      </div>
    ))}
  </div>
);

const ContactTable = ({ contacts, onStatusToggle, onEdit, onDelete }) => (
  <div className="contacts-table table">
    <div className="contacts-table__header table__header">
      <span>Contact Name</span>
      <span>Type</span>
      <span>Value</span>
      <span>Status</span>
      <span>Actions</span>
    </div>

    {contacts.map(contact => (
      <div key={contact.id} className="contacts-table__row table__row">
        <span>{contact.name}</span>
        <span className="contact-type-badge">
          {contact.contact_type?.charAt(0).toUpperCase() + contact.contact_type?.slice(1)}
        </span>
        <span className="contact-value">{contact.value}</span>
        <span className={`status-pill status-pill--${contact.is_active ? 'active' : 'inactive'}`}>
          {contact.is_active ? 'Active' : 'Inactive'}
        </span>
        <div className="actions">
          <button
            className="button button--small button--secondary"
            onClick={() => onStatusToggle(contact.id, contact.is_active)}
          >
            {contact.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            className="button button--small button--primary"
            onClick={() => onEdit('Contact', contact)}
          >
            Edit
          </button>
          <button
            className="button button--small button--danger"
            onClick={() => onDelete(contact.id)}
          >
            Delete
          </button>
        </div>
      </div>
    ))}
  </div>
);

const UserTable = ({ users, currentUserId, onStatusToggle, onDelete }) => (
  <div className="users-table table">
    <div className="users-table__header table__header">
      <span>User</span>
      <span>Email</span>
      <span>Status</span>
      <span>Role</span>
      <span>Actions</span>
    </div>

    {users.map(userItem => (
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
          {userItem.id !== currentUserId && (
            <>
              <button
                className="button button--small button--secondary"
                onClick={() => onStatusToggle(userItem.id, userItem.is_active)}
              >
                {userItem.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                className="button button--small button--danger"
                onClick={() => onDelete(userItem.id)}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    ))}
  </div>
);