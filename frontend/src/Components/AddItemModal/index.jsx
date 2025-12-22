import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './css/style.scss';

export const AddItemModal = ({ config, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [newTag, setNewTag] = useState('');

    const generateSlug = (name) => {
        return name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };


    // 2. Replace the initialization useEffect
    useEffect(() => {
        const initialData = {};
        config.fields.forEach(field => {
            // Use existing value if available, otherwise use default
            if (field.value !== undefined && field.value !== null) {
                // Special handling for file fields - don't include the URL in formData
                if (field.type === 'file' && typeof field.value === 'string') {
                    initialData[field.name] = ''; // Empty string for existing files
                } else {
                    initialData[field.name] = field.value;
                }
            } else if (field.type === 'checkbox' && field.default !== undefined) {
                initialData[field.name] = field.default;
            } else {
                initialData[field.name] = '';
            }
        });
        setFormData(initialData);

        // Initialize selected tags if editing
        // FIX: Handle both array of IDs and array of objects
        if (initialData.tags) {
            let tagIds = [];

            if (Array.isArray(initialData.tags)) {
                // Check if tags are objects or IDs
                if (initialData.tags.length > 0 && typeof initialData.tags[0] === 'object') {
                    // Tags are objects like [{id: 1, name: 'tag1'}, ...]
                    tagIds = initialData.tags.map(tag => tag.id);
                } else {
                    // Tags are already IDs like [1, 2, 3]
                    tagIds = initialData.tags;
                }
            }

            console.log('Initializing tags:', tagIds);
            setSelectedTags(tagIds);
        } else {
            setSelectedTags([]);
        }
    }, [config]);


    // Fetch categories if needed
    // Fetch categories if needed
    useEffect(() => {
        const needsCategories = config.fields.some(field =>
            field.name === 'category' && field.type === 'select'
        );

        if (needsCategories) {
            api.get('/api/categories/')
                .then(response => {
                    // ✅ Extract results from paginated response
                    const categoriesData = response.data?.results ?? response.data ?? [];
                    setCategories(categoriesData);
                })
                .catch(err => console.error("Failed to fetch categories", err));
        }
    }, [config.fields]);

    // Fetch tags if needed
    // Fetch tags if needed - UPDATED VERSION
    useEffect(() => {
        const needsTags = config.fields.some(field =>
            field.name === 'tags' && field.type === 'tags'
        );

        if (needsTags) {
            console.log('Fetching tags for modal...');

            // Function to fetch all pages recursively
            const fetchAllTags = async (url, allTags = []) => {
                try {
                    const response = await api.get(url);
                    const data = response.data;

                    // Extract tags from current page
                    const currentTags = data?.results || data || [];

                    // Combine with previous tags
                    const combinedTags = [...allTags, ...currentTags];

                    // Check if there's a next page
                    if (data?.next) {
                        // Recursively fetch next page
                        return fetchAllTags(data.next, combinedTags);
                    }

                    // No more pages, return all tags
                    return combinedTags;

                } catch (err) {
                    console.error("Failed to fetch tags", err);
                    return allTags; // Return whatever we have so far
                }
            };

            // Start fetching from the first page
            fetchAllTags('/api/admins/tags/')
                .then(allTags => {
                    console.log('All tags fetched:', allTags);
                    if (Array.isArray(allTags)) {
                        setAvailableTags(allTags);
                        console.log(`Total available tags: ${allTags.length}`);
                    } else {
                        console.error('Tags data is not an array:', allTags);
                        setAvailableTags([]);
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch tags", err);
                    setAvailableTags([]);
                });
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

    // Replace the problematic handleTagSelect function with this:
    const handleTagSelect = (tagId) => {
        setSelectedTags(prev => {
            // Ensure prev is always an array
            if (!Array.isArray(prev)) {
                return [tagId];
            }
            if (prev.includes(tagId)) {
                return prev.filter(id => id !== tagId);
            } else {
                return [...prev, tagId];
            }
        });
    };

    // Also update the initialization useEffect to be more defensive:
    useEffect(() => {
        const initialData = {};
        config.fields.forEach(field => {
            // Use existing value if available, otherwise use default
            if (field.value !== undefined && field.value !== null) {
                // Special handling for file fields - don't include the URL in formData
                if (field.type === 'file' && typeof field.value === 'string') {
                    initialData[field.name] = ''; // Empty string for existing files
                } else {
                    initialData[field.name] = field.value;
                }
            } else if (field.type === 'checkbox' && field.default !== undefined) {
                initialData[field.name] = field.default;
            } else {
                initialData[field.name] = '';
            }
        });
        setFormData(initialData);

        // Initialize selected tags if editing
        // FIX: Handle both array of IDs and array of objects
        let tagIds = [];

        if (initialData.tags) {
            if (Array.isArray(initialData.tags)) {
                // Check if tags are objects or IDs
                if (initialData.tags.length > 0 && typeof initialData.tags[0] === 'object') {
                    // Tags are objects like [{id: 1, name: 'tag1'}, ...]
                    tagIds = initialData.tags.map(tag => tag.id);
                } else {
                    // Tags are already IDs like [1, 2, 3]
                    tagIds = initialData.tags;
                }
            } else {
                // If tags is not an array, set to empty array
                console.warn('Tags data is not an array:', initialData.tags);
            }
        }

        console.log('Initializing tags:', tagIds);
        setSelectedTags(tagIds);
    }, [config]);


    const handleAddNewTag = async () => {
        if (!newTag.trim()) return;

        try {
            const tagData = {
                name: newTag.trim(),
                slug: generateSlug(newTag.trim())  // Auto-generate slug
            };

            const response = await api.post('/api/admins/tags/',
                tagData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            const createdTag = response.data;

            console.log('Tag created successfully:', createdTag);

            // Add to available tags
            setAvailableTags(prev => {
                // Ensure prev is always an array
                if (!prev || !Array.isArray(prev)) {
                    return [createdTag];
                }
                return [...prev, createdTag];
            });

            // Auto-select the new tag
            setSelectedTags(prev => {
                // Ensure prev is always an array
                if (!prev || !Array.isArray(prev)) {
                    return [createdTag.id];
                }
                return [...prev, createdTag.id];
            });

            // Clear input
            setNewTag('');

            // Show success message briefly
            setError('');
        } catch (err) {
            console.error("Failed to create tag", err);
            console.error("Error response:", err.response?.data);

            let errorMsg = 'Failed to create tag.';

            if (err.response?.data?.name) {
                errorMsg = Array.isArray(err.response.data.name)
                    ? err.response.data.name[0]
                    : err.response.data.name;
            } else if (err.response?.data?.slug) {
                errorMsg = Array.isArray(err.response.data.slug)
                    ? err.response.data.slug[0]
                    : err.response.data.slug;
            } else if (err.response?.data?.detail) {
                errorMsg = err.response.data.detail;
            } else if (err.response?.status === 400) {
                errorMsg = 'Tag name already exists or is invalid.';
            }

            setError(errorMsg);
            // Clear error after 5 seconds
            setTimeout(() => setError(''), 5000);
        }
    };


    const handleRemoveTag = (tagId) => {
        setSelectedTags(selectedTags.filter(id => id !== tagId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let response;

            // Check if any field is a file type
            const hasFileField = config.fields.some(field => field.type === 'file');

            if (hasFileField) {
                // === PRODUCTS (with file uploads) - Use FormData ===
                const submissionData = new FormData();

                // Add form fields
                Object.entries(formData).forEach(([key, value]) => {
                    if (key === 'tags') return; // Handle tags separately

                    if (value !== null && value !== undefined) {
                        // Special handling for image field
                        if (key === 'image') {
                            if (value instanceof File) {
                                // New file selected
                                submissionData.append(key, value);
                            } else if (value === '' && config.method === 'PATCH') {
                                // Editing but no new file selected - don't append anything
                                // The backend will keep the existing image
                                return;
                            }
                        } else if (value !== '') {
                            submissionData.append(key, value);
                        }
                    }
                });

                // Add tags
                if (selectedTags.length > 0) {
                    selectedTags.forEach(tagId => {
                        submissionData.append('tags', tagId);
                    });
                }

                // Send with multipart headers
                const headers = { 'Content-Type': 'multipart/form-data' };

                if (config.method === 'PATCH') {
                    response = await api.patch(config.endpoint, submissionData, { headers });
                } else {
                    response = await api.post(config.endpoint, submissionData, { headers });
                }

            } else {
                // === TAGS, CATEGORIES, CONTACTS (no files) - Use JSON ===
                const jsonData = {};

                // Add form fields
                Object.entries(formData).forEach(([key, value]) => {
                    if (key === 'tags') return; // Handle tags separately

                    if (value !== null && value !== undefined && value !== '') {
                        jsonData[key] = value;
                    }
                });

                // Add tags array if present
                if (config.title.includes('Tag')) {
                    if (jsonData.name && !jsonData.slug) {
                        jsonData.slug = generateSlug(jsonData.name);
                    }
                }

                // Add tags array if present
                if (selectedTags.length > 0) {
                    jsonData.tags = selectedTags;
                }

                console.log('Sending JSON data:', jsonData);
                console.log('Endpoint:', config.endpoint);
                console.log('Method:', config.method);

                // Send as JSON (default for axios)
                if (config.method === 'PATCH') {
                    response = await api.patch(config.endpoint, jsonData);
                } else {
                    response = await api.post(config.endpoint, jsonData);
                }
            }

            console.log("Save successful");

            // Show success message briefly
            setError('✓ Successfully saved! Reloading...');

            // Call the parent's onSuccess callback first
            if (onSuccess) {
                onSuccess(response.data);
            }

            // Then reload the page after a short delay
            setTimeout(() => {
                console.log("Reloading page now...");
                window.location.reload(true);
            }, 500);

        } catch (err) {
            const errorData = err.response?.data;
            let errorMsg = 'An unexpected error occurred.';

            if (typeof errorData === 'object' && errorData !== null) {
                // Handle validation errors - format them nicely
                const errorMessages = [];

                Object.entries(errorData).forEach(([key, value]) => {
                    const fieldLabel = key === 'name' ? 'Name' :
                        key === 'email' ? 'Email' :
                            key === 'value' ? 'Value' :
                                key === 'contact_type' ? 'Contact Type' :
                                    key.charAt(0).toUpperCase() + key.slice(1);

                    const errorText = Array.isArray(value) ? value.join(', ') : value;
                    errorMessages.push(`${fieldLabel}: ${errorText}`);
                });

                errorMsg = errorMessages.join(' | ');
            } else if (err.response?.status === 400) {
                errorMsg = 'Invalid data. Please check your inputs and try again.';
            } else if (err.response?.status === 500) {
                errorMsg = 'Server error. Please try again later.';
            }

            setError(errorMsg);
            console.error("Operation failed:", err.response || err);
            console.error("Error data:", errorData);

            // Scroll to top of modal to show error
            document.querySelector('.modal-content')?.scrollTo({ top: 0, behavior: 'smooth' });
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

            case 'tags':
                return (
                    <div className="tags-field">
                        {/* Selected Tags */}
                        <div className="selected-tags">
                            <label className="tags-label">Selected Tags:</label>
                            {selectedTags.length > 0 ? (
                                selectedTags.map(tagId => {
                                    const tag = availableTags.find(t => t.id === tagId);
                                    return tag ? (
                                        <span key={tagId} className="tag-badge">
                                            {tag.name}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(tagId)}
                                                className="tag-remove"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ) : null;
                                })
                            ) : (
                                <p className="no-tags-message">No tags selected</p>
                            )}
                        </div>

                        {/* Add New Tag Section */}
                        <div className="add-tag-section">
                            <label className="tags-label">Create and add new tag:</label>
                            <div className="new-tag-input-group">
                                <input
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    placeholder="Enter tag name..."
                                    className="new-tag-input"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddNewTag();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddNewTag}
                                    className="add-tag-btn"
                                    disabled={!newTag.trim()}
                                >
                                    + Create & Add
                                </button>
                            </div>
                            <small className="tag-help-text">
                                This will create the tag and automatically select it
                            </small>
                        </div>

                        {/* Available Tags */}
                        <div className="available-tags">
                            <label className="tags-label">Or select existing tags:</label>
                            <div className="tags-grid">
                                {availableTags.length > 0 ? (
                                    availableTags.map(tag => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => handleTagSelect(tag.id)}
                                            className={`tag-option ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                                        >
                                            {tag.name}
                                        </button>
                                    ))
                                ) : (
                                    <div className="no-tags-available">
                                        <p>No tags available. Create one above!</p>
                                    </div>
                                )}
                            </div>
                        </div>
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
                            {field.type !== 'checkbox' && field.type !== 'tags' && (
                                <label htmlFor={field.name}>
                                    {field.label}
                                    {field.required && <span className="required">*</span>}
                                </label>
                            )}

                            {field.type === 'tags' && (
                                <label className="tags-main-label">
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