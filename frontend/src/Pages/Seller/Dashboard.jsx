import React, { useState, useEffect } from "react";
import { useAuth } from "../../services/auth";
import api from "../../services/api";
import {
  FaBoxOpen,
  FaChartLine,
  FaWallet,
  FaPlus,
  FaEdit,
  FaTrash,
  FaBox,
  FaDollarSign,
} from "react-icons/fa";
import "./seller.scss";
import { useToast } from "../../Components/Toast/useToast";
import Button from "../../Components/UI/Button";
import Input from "../../Components/UI/Input";
import Select from "../../Components/UI/Select";
import FilePicker from "../../Components/UI/FilePicker";
import ConfirmDialog from "../../Components/ConfirmDialog";

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  category: "",
  image: null,
};

export default function SellerDashboard() {
  const { data, isSeller, fetchAllData } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const profile = data?.sellerProfile;

  useEffect(() => {
    if (activeTab === "products" && isSeller) {
      fetchProducts();
      fetchCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isSeller]);

  useEffect(() => {
    const checkStripeReturn = async () => {
      try {
        await api.get("/api/sellers/stripe/return/");
        if (fetchAllData) {
          fetchAllData(true);
        }
      } catch (err) {
        console.error("Failed to sync Stripe return status", err);
      }
    };
    checkStripeReturn();
  }, [fetchAllData]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/sellers/products/");
      setProducts(response.data.results || response.data);
    } catch (err) {
      console.error("Failed to fetch seller products", err);
      toast.error("Could not load your products.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get("/api/categories/");
      setCategories(response.data.results || response.data);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  const handleStripeOnboard = async () => {
    try {
      const res = await api.post("/api/sellers/stripe/onboard/");
      window.location.href = res.data.url;
    } catch (err) {
      console.error("Failed to get onboarding link", err);
      toast.error("Failed to initiate Stripe onboarding.");
    }
  };

  const validateForm = (form) => {
    if (!form.name || !form.name.trim()) return "Please enter a product name.";
    if (!form.description || !form.description.trim())
      return "Please enter a product description.";
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0)
      return "Please enter a valid price greater than 0.";
    if (!form.category) return "Please select a category.";
    return null;
  };

  const handleAddProduct = async () => {
    const error = validateForm(newProduct);
    if (error) {
      toast.error(error);
      return;
    }
    if (!newProduct.image) {
      toast.error("Please upload a product image.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", newProduct.name.trim());
      formData.append("description", newProduct.description.trim());
      formData.append("price", parseFloat(newProduct.price));
      formData.append("category", newProduct.category);
      formData.append("image", newProduct.image);

      await api.post("/api/sellers/products/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowAddModal(false);
      setNewProduct(EMPTY_FORM);
      await fetchProducts();
      toast.success("Product added", {
        title: "Submitted for review",
        message: "Your product is now pending approval.",
      });
    } catch (err) {
      console.error("Failed to add product", err);
      toast.error("Failed to add product. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price != null ? String(product.price) : "",
      category: product.category != null ? String(product.category) : "",
      image: null,
    });
    setShowEditModal(true);
  };

  const handleUpdateProduct = async () => {
    const error = validateForm(editForm);
    if (error) {
      toast.error(error);
      return;
    }

    setSavingEdit(true);
    try {
      const formData = new FormData();
      formData.append("name", editForm.name.trim());
      formData.append("description", editForm.description.trim());
      formData.append("price", parseFloat(editForm.price));
      formData.append("category", editForm.category);
      if (editForm.image) {
        formData.append("image", editForm.image);
      }

      await api.patch(`/api/sellers/products/${editingProduct.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowEditModal(false);
      setEditingProduct(null);
      await fetchProducts();
      toast.success("Product updated", {
        title: "Sent back for review",
        message: "Your changes will be live once approved.",
      });
    } catch (err) {
      console.error("Failed to update product", err);
      toast.error("Failed to update product. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/sellers/products/${confirmDelete.id}/`);
      toast.success(`"${confirmDelete.name}" was deleted.`);
      setConfirmDelete(null);
      await fetchProducts();
    } catch (err) {
      console.error("Failed to delete product", err);
      toast.error("Failed to delete product. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (!isSeller) {
    return (
      <div className="seller-dashboard container">
        <div className="error-box">
          <h2>Access Denied</h2>
          <p>You must be an approved seller to access this dashboard.</p>
        </div>
      </div>
    );
  }

  const Spinner = () => (
    <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
      <div
        style={{
          border: "4px solid var(--border-color)",
          borderLeftColor: "var(--color-primary)",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          animation: "spin 1s linear infinite",
        }}
      />
    </div>
  );

  return (
    <div className="seller-dashboard-page">
      <div className="particles">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="seller-dashboard container">
        <div className="dashboard-sidebar glass-panel">
          <h2>Seller Panel</h2>
          <ul>
            <li
              className={activeTab === "overview" ? "active" : ""}
              onClick={() => setActiveTab("overview")}
            >
              <FaChartLine className="tab-icon" /> Overview
            </li>
            <li
              className={activeTab === "products" ? "active" : ""}
              onClick={() => setActiveTab("products")}
            >
              <FaBoxOpen className="tab-icon" /> My Products
            </li>
            <li
              className={activeTab === "finances" ? "active" : ""}
              onClick={() => setActiveTab("finances")}
            >
              <FaWallet className="tab-icon" /> Finances &amp; Payouts
            </li>
          </ul>
        </div>

        <div className="dashboard-content glass-panel">
          {activeTab === "overview" && (
            <div className="tab-pane fade-in">
              <h1>Welcome, {profile?.business_name}</h1>
              <p>
                Verification Status:{" "}
                <strong>{profile?.verification_status}</strong>
              </p>
              {profile?.rejection_reason && (
                <p className="error-text">Reason: {profile?.rejection_reason}</p>
              )}

              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total Products</h3>
                  <p>Check "My Products" tab</p>
                </div>
                <div className="stat-card">
                  <h3>Stripe Status</h3>
                  <p>
                    {profile?.stripe_payouts_enabled
                      ? "Enabled"
                      : "Pending Setup"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div className="tab-pane fade-in">
              <div
                className="flex-between"
                style={{ flexWrap: "wrap", gap: "1rem" }}
              >
                <h1>My Products</h1>
                <Button variant="gold" size="md" onClick={() => setShowAddModal(true)}>
                  <FaPlus /> Add Product
                </Button>
              </div>

              {loading ? (
                <Spinner />
              ) : products.length === 0 ? (
                <div className="empty-state-dash">
                  <FaBox />
                  <h3>No products yet</h3>
                  <p>Add your first product to start selling on DreamStore.</p>
                  <Button
                    variant="gold"
                    size="md"
                    onClick={() => setShowAddModal(true)}
                  >
                    <FaPlus /> Add Product
                  </Button>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id}>
                          <td>{p.name}</td>
                          <td>${p.price}</td>
                          <td>
                            <span className={`badge ${p.approval_status}`}>
                              {p.approval_status}
                            </span>
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                gap: "0.5rem",
                                flexWrap: "wrap",
                              }}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEdit(p)}
                              >
                                <FaEdit /> Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setConfirmDelete(p)}
                              >
                                <FaTrash /> Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "finances" && (
            <div className="tab-pane finances-tab fade-in">
              <h1>Finances &amp; Payouts</h1>
              {!profile?.stripe_payouts_enabled ? (
                <div
                  className="onboard-box glass-panel-inner"
                  style={{ padding: "1.5rem", marginTop: "1rem" }}
                >
                  <h3>Set up your payouts</h3>
                  <p style={{ marginBottom: "1rem" }}>
                    You need to connect a Stripe account to receive funds for
                    your sales.
                  </p>
                  <Button variant="gold" size="md" onClick={handleStripeOnboard}>
                    Connect with Stripe
                  </Button>
                </div>
              ) : (
                <div
                  className="success-box glass-panel-inner"
                  style={{ padding: "1.5rem", marginTop: "1rem" }}
                >
                  <h3>Payouts Enabled</h3>
                  <p>
                    Your Stripe connected account is fully set up. Payouts will
                    be sent automatically based on your Stripe settings.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel-inner">
            <h2>Add New Product</h2>
            <div className="modal-form">
              <Input
                label="Product Name"
                placeholder="e.g. Handcrafted Leather Wallet"
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
              />
              <Input
                label="Description"
                placeholder="Describe your product…"
                textarea
                rows="3"
                value={newProduct.description}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, description: e.target.value })
                }
              />
              <Input
                label="Price (USD)"
                type="number"
                min="0"
                step="0.01"
                icon={<FaDollarSign />}
                placeholder="0.00"
                value={newProduct.price}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, price: e.target.value })
                }
              />
              <Select
                label="Category"
                placeholder="Select a category"
                options={categories}
                value={newProduct.category}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, category: e.target.value })
                }
              />
              <FilePicker
                label="Product Image"
                hint="PNG or JPG. The image should be wider than it is tall."
                value={newProduct.image}
                onChange={(file) =>
                  setNewProduct({ ...newProduct, image: file })
                }
              />
            </div>
            <div className="modal-actions">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowAddModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                size="md"
                loading={saving}
                onClick={handleAddProduct}
              >
                Save Product
              </Button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingProduct && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel-inner">
            <h2>Edit Product</h2>
            <p className="modal-subtitle">
              Edits send the product back for review before going live.
            </p>
            <div className="modal-form">
              <Input
                label="Product Name"
                placeholder="e.g. Handcrafted Leather Wallet"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
              <Input
                label="Description"
                placeholder="Describe your product…"
                textarea
                rows="3"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />
              <Input
                label="Price (USD)"
                type="number"
                min="0"
                step="0.01"
                icon={<FaDollarSign />}
                placeholder="0.00"
                value={editForm.price}
                onChange={(e) =>
                  setEditForm({ ...editForm, price: e.target.value })
                }
              />
              <Select
                label="Category"
                placeholder="Select a category"
                options={categories}
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
              />
              <FilePicker
                label="Product Image"
                hint="Leave unchanged to keep the current image."
                initialPreview={editingProduct.image}
                value={editForm.image}
                onChange={(file) =>
                  setEditForm({ ...editForm, image: file })
                }
              />
            </div>
            <div className="modal-actions">
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProduct(null);
                }}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                size="md"
                loading={savingEdit}
                onClick={handleUpdateProduct}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this product?"
        message={`"${confirmDelete?.name}" will be permanently removed from your store. This cannot be undone.`}
        confirmText="Delete"
        tone="danger"
        loading={deleting}
        onConfirm={handleDeleteProduct}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
