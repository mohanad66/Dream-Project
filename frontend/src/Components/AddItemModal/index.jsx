import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../../services/api";
import "./css/style.scss";
import { persistentCache } from "../../utils/persistentCache";

export const AddItemModal = ({ config, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [newTag, setNewTag] = useState("");

  // Multi-image state
  const [newGalleryFiles, setNewGalleryFiles] = useState([]); // File[] to upload
  const [existingGallery, setExistingGallery] = useState([]); // {id, image}[] from server
  const [deletingImageId, setDeletingImageId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const galleryInputRef = useRef(null);

  const generateSlug = (name) =>
    name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  // Initialize form data
  useEffect(() => {
    const initialData = {};
    config.fields.forEach((field) => {
      if (field.value !== undefined && field.value !== null) {
        if (field.type === "file" && typeof field.value === "string") {
          initialData[field.name] = "";
        } else if (field.type === "multi-images") {
          // Handled separately via existingGallery state
        } else {
          initialData[field.name] = field.value;
        }
      } else if (field.type === "checkbox" && field.default !== undefined) {
        initialData[field.name] = field.default;
      } else if (field.type === "multi-images") {
        // skip
      } else {
        initialData[field.name] = "";
      }
    });
    setFormData(initialData);

    // Initialize existing gallery images for edit mode
    const galleryField = config.fields.find((f) => f.type === "multi-images");
    if (galleryField && Array.isArray(galleryField.value)) {
      setExistingGallery(galleryField.value);
    } else {
      setExistingGallery([]);
    }
    setNewGalleryFiles([]);

    // Initialize tags
    let tagIds = [];
    const tagsField = config.fields.find((f) => f.name === "tags");
    if (tagsField?.value) {
      if (Array.isArray(tagsField.value)) {
        tagIds = tagsField.value[0] && typeof tagsField.value[0] === "object"
          ? tagsField.value.map((t) => t.id)
          : tagsField.value;
      }
    }
    setSelectedTags(tagIds);
  }, [config]);

  // Fetch categories
  useEffect(() => {
    if (config.fields.some((f) => f.name === "category" && f.type === "select")) {
      api.get("/api/categories/")
        .then((res) => setCategories(res.data?.results ?? res.data ?? []))
        .catch((err) => console.error("Failed to fetch categories", err));
    }
  }, [config.fields]);

  // Fetch tags
  useEffect(() => {
    if (!config.fields.some((f) => f.name === "tags" && f.type === "tags")) return;

    const fetchAllTags = async (url, all = []) => {
      try {
        const res = await api.get(url);
        const data = res.data;
        const combined = [...all, ...(data?.results || data || [])];
        return data?.next ? fetchAllTags(data.next, combined) : combined;
      } catch {
        return all;
      }
    };

    fetchAllTags("/api/admins/tags/").then((tags) => {
      setAvailableTags(Array.isArray(tags) ? tags : []);
    });
  }, [config.fields]);

  // ─── Handlers ───────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value, type, files, checked } = e.target;
    if (type === "file") {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleTagSelect = (tagId) => {
    setSelectedTags((prev) =>
      Array.isArray(prev)
        ? prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
        : [tagId]
    );
  };

  const handleAddNewTag = async () => {
    if (!newTag.trim()) return;
    try {
      const res = await api.post("/api/admins/tags/", {
        name: newTag.trim(),
        slug: generateSlug(newTag.trim()),
      }, { headers: { "Content-Type": "application/json" } });
      const created = res.data;
      setAvailableTags((prev) => (Array.isArray(prev) ? [...prev, created] : [created]));
      setSelectedTags((prev) => (Array.isArray(prev) ? [...prev, created.id] : [created.id]));
      setNewTag("");
      setError("");
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.name?.[0] || d?.slug?.[0] || d?.detail || "Failed to create tag.";
      setError(msg);
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleRemoveTag = (tagId) => setSelectedTags((prev) => prev.filter((id) => id !== tagId));

  // ─── Gallery image handlers ──────────────────────────────────
  const addGalleryFiles = useCallback((files) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setNewGalleryFiles((prev) => {
      // Deduplicate by name+size
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      return [...prev, ...validFiles.filter((f) => !existing.has(`${f.name}-${f.size}`))];
    });
  }, []);

  const removeNewGalleryFile = (index) => {
    setNewGalleryFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGalleryDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addGalleryFiles(e.dataTransfer.files);
  };

  const handleDeleteExistingImage = async (imgId) => {
    // Extract product ID from endpoint URL, e.g. /api/admins/products/5/
    const productId = config.endpoint?.match(/products\/(\d+)\//)?.[1];
    if (!productId) return;
    setDeletingImageId(imgId);
    try {
      await api.delete(`/api/admins/products/${productId}/gallery/${imgId}/`);
      setExistingGallery((prev) => prev.filter((img) => img.id !== imgId));
    } catch (err) {
      setError("Failed to delete image. Please try again.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setDeletingImageId(null);
    }
  };

  // ─── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let response;
      const hasFileField = config.fields.some((f) => f.type === "file" || f.type === "multi-images");

      if (hasFileField) {
        const submissionData = new FormData();

        Object.entries(formData).forEach(([key, value]) => {
          if (key === "tags") return;
          if (value !== null && value !== undefined) {
            if (key === "image") {
              if (value instanceof File) submissionData.append(key, value);
              else if (value === "" && config.method === "PATCH") return;
            } else if (value !== "") {
              submissionData.append(key, value);
            }
          }
        });

        // Append gallery images
        newGalleryFiles.forEach((file) => {
          submissionData.append("uploaded_images", file);
        });

        // Append tags
        selectedTags.forEach((tagId) => submissionData.append("tags", tagId));

        const headers = { "Content-Type": "multipart/form-data" };
        response = config.method === "PATCH"
          ? await api.patch(config.endpoint, submissionData, { headers })
          : await api.post(config.endpoint, submissionData, { headers });
      } else {
        const jsonData = {};
        Object.entries(formData).forEach(([key, value]) => {
          if (key === "tags") return;
          if (value !== null && value !== undefined && value !== "") jsonData[key] = value;
        });

        if (config.title.includes("Tag") && jsonData.name && !jsonData.slug) {
          jsonData.slug = generateSlug(jsonData.name);
        }
        if (selectedTags.length > 0) jsonData.tags = selectedTags;

        response = config.method === "PATCH"
          ? await api.patch(config.endpoint, jsonData)
          : await api.post(config.endpoint, jsonData);
      }

      setError("✓ Successfully saved!");
      await persistentCache.clear();
      if (onSuccess) onSuccess(response.data);
    } catch (err) {
      const errorData = err.response?.data;
      let errorMsg = "An unexpected error occurred.";

      if (typeof errorData === "object" && errorData !== null) {
        const msgs = Object.entries(errorData).map(([key, value]) => {
          const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
          const text = Array.isArray(value) ? value.join(", ") : value;
          return `${label}: ${text}`;
        });
        errorMsg = msgs.join(" | ");
      } else if (err.response?.status === 400) {
        errorMsg = "Invalid data. Please check your inputs.";
      } else if (err.response?.status === 500) {
        errorMsg = "Server error. Please try again later.";
      }

      setError(errorMsg);
      document.querySelector(".modal-content")?.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  // ─── Field Renderers ─────────────────────────────────────────
  const renderField = (field) => {
    const value = formData[field.name] ?? "";
    const isFileField = field.type === "file";
    const isEditMode = config.method === "PATCH";

    let filePlaceholder = "";
    if (isFileField && isEditMode && field.value && typeof field.value === "string") {
      filePlaceholder = `Current: ${field.value.split("/").pop()}`;
    }

    switch (field.type) {
      case "textarea":
        return (
          <textarea
            id={field.name}
            name={field.name}
            value={value}
            onChange={handleInputChange}
            required={field.required}
          />
        );

      case "select": {
        const options = field.name === "category" ? categories : field.options || [];
        return (
          <select id={field.name} name={field.name} value={value} onChange={handleInputChange} required={field.required}>
            <option value="" disabled>Select an option</option>
            {options.map((opt) => (
              <option key={opt.id || opt} value={opt.id || opt}>{opt.name || opt}</option>
            ))}
          </select>
        );
      }

      case "checkbox":
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
              <span className="checkbox-custom" />
              {field.label}
            </label>
          </div>
        );

      case "tags":
        return (
          <div className="tags-field">
            <div className="selected-tags">
              <label className="tags-label">Selected Tags:</label>
              {selectedTags.length > 0 ? (
                selectedTags.map((tagId) => {
                  const tag = availableTags.find((t) => t.id === tagId);
                  return tag ? (
                    <span key={tagId} className="tag-badge">
                      {tag.name}
                      <button type="button" onClick={() => handleRemoveTag(tagId)} className="tag-remove">×</button>
                    </span>
                  ) : null;
                })
              ) : (
                <p className="no-tags-message">No tags selected</p>
              )}
            </div>

            <div className="add-tag-section">
              <label className="tags-label">Create and add new tag:</label>
              <div className="new-tag-input-group">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Enter tag name..."
                  className="new-tag-input"
                  onKeyPress={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNewTag(); } }}
                />
                <button type="button" onClick={handleAddNewTag} className="add-tag-btn" disabled={!newTag.trim()}>
                  + Create &amp; Add
                </button>
              </div>
              <small className="tag-help-text">This will create the tag and automatically select it</small>
            </div>

            <div className="available-tags">
              <label className="tags-label">Or select existing tags:</label>
              <div className="tags-grid">
                {availableTags.length > 0 ? (
                  availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagSelect(tag.id)}
                      className={`tag-option ${selectedTags.includes(tag.id) ? "selected" : ""}`}
                    >
                      {tag.name}
                    </button>
                  ))
                ) : (
                  <div className="no-tags-available"><p>No tags available. Create one above!</p></div>
                )}
              </div>
            </div>
          </div>
        );

      case "multi-images":
        return (
          <div className="multi-images-field">
            {/* Existing gallery (edit mode) */}
            {existingGallery.length > 0 && (
              <div className="gallery-existing">
                <p className="gallery-section-label">Current gallery images:</p>
                <div className="gallery-grid">
                  {existingGallery.map((img) => (
                    <div key={img.id} className="gallery-thumb">
                      <img src={img.image} alt="Gallery" />
                      <button
                        type="button"
                        className="gallery-thumb-remove"
                        onClick={() => handleDeleteExistingImage(img.id)}
                        disabled={deletingImageId === img.id}
                        title="Remove image"
                      >
                        {deletingImageId === img.id ? "…" : "×"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drop zone */}
            <div
              className={`gallery-dropzone ${isDragging ? "dragging" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleGalleryDrop}
              onClick={() => galleryInputRef.current?.click()}
            >
              <div className="gallery-dropzone-icon">🖼️</div>
              <p className="gallery-dropzone-text">
                {isDragging ? "Drop images here" : "Click or drag &amp; drop images"}
              </p>
              <p className="gallery-dropzone-sub">PNG, JPG, WEBP accepted</p>
              <input
                ref={galleryInputRef}
                type="file"
                multiple
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => addGalleryFiles(e.target.files)}
              />
            </div>

            {/* New files preview */}
            {newGalleryFiles.length > 0 && (
              <div className="gallery-new-previews">
                <p className="gallery-section-label">Images to upload ({newGalleryFiles.length}):</p>
                <div className="gallery-grid">
                  {newGalleryFiles.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="gallery-thumb new">
                      <img src={URL.createObjectURL(file)} alt={file.name} />
                      <button
                        type="button"
                        className="gallery-thumb-remove"
                        onClick={() => removeNewGalleryFile(idx)}
                        title="Remove"
                      >
                        ×
                      </button>
                      <span className="gallery-thumb-name">{file.name.slice(0, 12)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            step={field.type === "number" ? "0.01" : undefined}
            placeholder={isFileField && isEditMode ? filePlaceholder : undefined}
          />
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{config.title}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {config.fields.map((field) => (
            <div className="form-group" key={field.name}>
              {field.type !== "checkbox" && field.type !== "tags" && field.type !== "multi-images" && (
                <label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>
              )}
              {(field.type === "tags" || field.type === "multi-images") && (
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
            <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
              ) : config.method === "PATCH" ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
