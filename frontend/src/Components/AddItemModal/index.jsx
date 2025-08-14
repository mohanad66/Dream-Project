import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './css/style.scss';

export const AddItemModal = ({ config, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);

    // Initialize form data with default or existing values
    useEffect(() => {
        const initialData = {};
        config.fields.forEach(field => {
            // Use existing value if available, otherwise use default
            if (field.value !== undefined) {
                initialData[field.name] = field.value;
            } else if (field.type === 'checkbox' && field.default !== undefined) {
                initialData[field.name] = field.default;
            } else {
                initialData[field.name] = '';
            }
        });
        setFormData(initialData);
    }, [config]);

    // Fetch categories if needed
    useEffect(() => {
        const needsCategories = config.fields.some(field =>
            field.name === 'category' && field.type === 'select'
        );

        if (needsCategories) {
            api.get('/api/categories/')
                .then(response => setCategories(response.data))
                .catch(err => console.error("Failed to fetch categories", err));
        }
    }, [config.fields]);

    const handleInputChange = (e) => {
        const { name, value, type, files, checked } = e.target;

        if (type === 'file') {
            setFormData(prev => ({ ...prev, [name]: files[0] }));
        } else if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const submissionData = new FormData();

        // Prepare form data
        Object.entries(formData).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                // Handle file deletion - if editing and file field is empty
                if (key === 'image' && value === '' && config.method === 'PATCH') {
                    // Send null to clear existing image
                    submissionData.append(key, null);
                } else {
                    submissionData.append(key, value);
                }
            }
        });

        try {
            let response;
            const headers = { 'Content-Type': 'multipart/form-data' };

            if (config.method === 'PATCH') {
                // For updates
                response = await api.patch(config.endpoint, submissionData, { headers });
            } else {
                // For new items
                response = await api.post(config.endpoint, submissionData, { headers });
            }

            console.log("Save successful, calling onSuccess and reloading page");
            
            // Call the parent's onSuccess callback first
            if (onSuccess) {
                onSuccess(response.data);
            }
            
            // Then reload the page after a short delay
            setTimeout(() => {
                console.log("Reloading page now...");
                window.location.reload(true);
            }, 100);

        } catch (err) {
            const errorData = err.response?.data;
            let errorMsg = 'An unexpected error occurred.';

            if (typeof errorData === 'object' && errorData !== null) {
                // Handle validation errors
                errorMsg = Object.entries(errorData)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join(' | ');
            } else if (err.response?.status === 400) {
                errorMsg = 'Invalid data. Please check your inputs.';
            }

            setError(errorMsg);
            console.error("Operation failed:", err.response || err);
        } finally {
            setLoading(false);
        }
    };

    // Render appropriate input based on field type
    const renderField = (field) => {
        const value = formData[field.name] || '';
        const isFileField = field.type === 'file';
        const isEditMode = config.method === 'PATCH';
        let filePlaceholder = '';
        if (isFileField && isEditMode && value) {
            if (typeof value === 'string') {
                // Extract filename from URL
                filePlaceholder = `Current file: ${value.split('/').pop()}`;
            } else if (value instanceof File) {
                // Handle newly selected file
                filePlaceholder = `Selected file: ${value.name}`;
            }
        }
        switch (field.type) {
            case 'textarea':
                return (
                    <textarea
                        id={field.name}
                        name={field.name}
                        value={value}
                        onChange={handleInputChange}
                        required={field.required}
                    />
                );

            case 'select':
                const options = field.name === 'category'
                    ? categories
                    : field.options || [];

                return (
                    <select
                        id={field.name}
                        name={field.name}
                        value={value}
                        onChange={handleInputChange}
                        required={field.required}
                    >
                        <option value="" disabled>Select an option</option>
                        {options.map(opt => (
                            <option key={opt.id || opt} value={opt.id || opt}>
                                {opt.name || opt}
                            </option>
                        ))}
                    </select>
                );

            case 'checkbox':
                return (
                    <div className="checkbox-wrapper">
                        <input
                            type="checkbox"
                            id={field.name}
                            name={field.name}
                            checked={value}
                            onChange={handleInputChange}
                            className="checkbox-input"
                        />
                        <label htmlFor={field.name} className="checkbox-label">
                            <span className="checkbox-custom"></span>
                            {field.label}
                        </label>
                    </div>
                );

            default:
                return (
                    <input
                        type={field.type}
                        id={field.name}
                        name={field.name}
                        value={isFileField ? undefined : value}
                        onChange={handleInputChange}
                        required={field.required && !(isFileField && isEditMode)}
                        step={field.type === 'number' ? '0.01' : undefined}
                        placeholder={isFileField && isEditMode ? filePlaceholder : undefined}
                    />
                );
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{config.title}</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {config.fields.map(field => (
                        <div className="form-group" key={field.name}>
                            {/* Don't show label for checkboxes (label is part of the checkbox) */}
                            {field.type !== 'checkbox' && (
                                <label htmlFor={field.name}>
                                    {field.label}
                                    {field.required && <span className="required">*</span>}
                                </label>
                            )}

                            {renderField(field)}
                        </div>
                    ))}

                    {error && <div className="error-message">{error}</div>}

                    <div className="form-actions">
                        <button
                            type="button"
                            className="cancel-btn"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="loading-dots">
                                    <span>.</span><span>.</span><span>.</span>
                                </span>
                            ) : (
                                config.method === 'PATCH' ? 'Update' : 'Create'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};