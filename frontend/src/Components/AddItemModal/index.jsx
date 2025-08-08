import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './css/style.scss';

export const AddItemModal = ({ config, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);

    // Fetch categories if the form needs them (for the Product modal)
    useEffect(() => {
        const needsCategories = config.fields.some(field => field.name === 'category');
        if (needsCategories) {
            api.get('/api/categories/')
                .then(response => setCategories(response.data))
                .catch(err => console.error("Failed to fetch categories", err));
        }
    }, [config.fields]);


    const handleInputChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            setFormData(prev => ({ ...prev, [name]: files[0] }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const submissionData = new FormData();
        for (const key in formData) {
            // Don't append empty optional fields
            if (formData[key] !== '' && formData[key] !== null) {
                submissionData.append(key, formData[key]);
            }
        }

        // Add default author for products if not provided.
        // In a real app, this might be the logged-in user's author ID.
        if (config.title.includes('Product') && !submissionData.has('author')) {
             submissionData.append('author', 1); // Default author ID
        }

        try {
            await api.post(config.endpoint, submissionData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onSuccess();
        } catch (err) {
            const errorData = err.response?.data;
            let errorMsg = 'An unexpected error occurred.';
            if (typeof errorData === 'object' && errorData !== null) {
                // Format validation errors nicely
                errorMsg = Object.entries(errorData).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' | ');
            }
            setError(errorMsg);
            console.error("Failed to add item:", err.response || err);
        } finally {
            setLoading(false);
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
                            <label htmlFor={field.name}>{field.label}</label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    id={field.name}
                                    name={field.name}
                                    onChange={handleInputChange}
                                    required={field.required}
                                />
                            ) : field.type === 'select' ? (
                                <select
                                    id={field.name}
                                    name={field.name}
                                    onChange={handleInputChange}
                                    required={field.required}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Select an option</option>
                                    {/* Handle dynamic options for categories or static options */}
                                    {(field.name === 'category' ? categories : field.options || []).map(opt => (
                                        <option key={opt.id || opt} value={opt.id || opt}>
                                            {opt.name || opt}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type={field.type}
                                    id={field.name}
                                    name={field.name}
                                    onChange={handleInputChange}
                                    required={field.required}
                                    step={field.type === 'number' ? '0.01' : undefined}
                                />
                            )}
                        </div>
                    ))}
                    {error && <p className="error-message">{error}</p>}
                    <div className="form-actions">
                        <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
