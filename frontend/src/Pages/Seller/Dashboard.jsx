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
import { Megaphone, Settings, Truck, Store } from "lucide-react";
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

  const [offers, setOffers] = useState([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState({ title: "", description: "", offer_type: "promotion", discount_percent: "", image: null });
  const [savingOffer, setSavingOffer] = useState(false);

  const [paymobAccountId, setPaymobAccountId] = useState("");
  const [paymobWalletNumber, setPaymobWalletNumber] = useState("");
  const [savingPaymob, setSavingPaymob] = useState(false);

  const profile = data?.sellerProfile;

  useEffect(() => {
    if (!isSeller) return;
    const refreshProfile = async () => {
      try {
        const res = await api.get("/api/sellers/me/");
        const updated = res.data;
        if (updated && JSON.stringify(updated) !== JSON.stringify(data?.sellerProfile)) {
          fetchAllData(true);
        }
      } catch (e) { /* ignore */ }
    };
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isSeller) return;
    if (activeTab === "overview") {
      fetchProducts();
      fetchOffers();
    } else if (activeTab === "products") {
      fetchProducts();
      fetchCategories();
    } else if (activeTab === "offers") {
      fetchOffers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isSeller]);

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

  useEffect(() => {
    if (profile) {
      setPaymobAccountId(profile.paymob_account_id || "");
      setPaymobWalletNumber(profile.paymob_wallet_number || "");
    }
  }, [profile]);

  const handleSavePaymob = async () => {
    if (!paymobAccountId.trim() && !paymobWalletNumber.trim()) {
      toast.error("Enter at least your Paymob Account ID or Wallet Number.");
      return;
    }
    setSavingPaymob(true);
    try {
      await api.patch("/api/sellers/me/", {
        paymob_account_id: paymobAccountId.trim(),
        paymob_wallet_number: paymobWalletNumber.trim(),
      });
      fetchAllData(true);
      toast.success("Paymob payout details saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save Paymob details.");
    } finally {
      setSavingPaymob(false);
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

  const fetchOffers = async () => {
    try {
      const response = await api.get("/api/sellers/offers/");
      setOffers(response.data.results || response.data);
    } catch (err) { console.error(err); toast.error("Could not load offers."); }
  };

  const handleCreateOffer = async () => {
    if (!offerForm.title.trim()) { toast.error("Title is required."); return; }
    setSavingOffer(true);
    try {
      const formData = new FormData();
      formData.append("title", offerForm.title.trim());
      formData.append("description", offerForm.description.trim());
      formData.append("offer_type", offerForm.offer_type);
      if (offerForm.discount_percent) formData.append("discount_percent", parseFloat(offerForm.discount_percent));
      if (offerForm.image) formData.append("image", offerForm.image);
      await api.post("/api/sellers/offers/", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setShowOfferModal(false);
      setOfferForm({ title: "", description: "", offer_type: "promotion", discount_percent: "", image: null });
      fetchOffers();
      toast.success("Offer created!");
    } catch (err) { console.error(err); toast.error("Failed to create offer."); }
    finally { setSavingOffer(false); }
  };

  const handleDeleteOffer = async (id) => {
    try {
      await api.delete(`/api/sellers/offers/${id}/`);
      fetchOffers();
      toast.success("Offer deleted.");
    } catch (err) { toast.error("Failed to delete offer."); }
  };

  const handleToggleOfferActive = async (offer) => {
    try {
      await api.patch(`/api/sellers/offers/${offer.id}/`, { is_active: !offer.is_active });
      fetchOffers();
      toast.success(`Offer ${offer.is_active ? "deactivated" : "activated"}.`);
    } catch (err) { toast.error("Failed to toggle offer status."); }
  };

  const toggleDeliveryType = async (newType) => {
    try {
      await api.patch("/api/sellers/me/delivery-type/", { delivery_type: newType });
      fetchAllData(true);
      toast.success("Delivery type updated.");
    } catch (err) { toast.error("Failed to update delivery type."); }
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

  if (profile?.verification_status !== "approved") {
    const statusLabel = profile?.verification_status === "rejected" ? "Rejected" : "Pending Approval";
    const statusColor = profile?.verification_status === "rejected" ? "var(--color-danger)" : "var(--color-gold)";
    return (
      <div className="seller-dashboard-page">
        <div className="seller-dashboard container" style={{ justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", maxWidth: 500, width: "100%" }}>
            {profile?.verification_status === "rejected" ? (
              <FaBox style={{ fontSize: "3rem", color: "var(--color-danger)", marginBottom: "1rem" }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid var(--color-gold)", borderTopColor: "transparent", animation: "spin 1s linear infinite", margin: "0 auto 1.5rem" }} />
            )}
            <h2 style={{ marginBottom: "0.5rem" }}>Account {statusLabel}</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
              {profile?.verification_status === "rejected"
                ? "Your seller account has been rejected."
                : "Your seller account is being reviewed by our team. You'll have full access once approved."}
            </p>
            {profile?.rejection_reason && (
              <div style={{ padding: "0.75rem 1rem", borderRadius: 8, background: "var(--color-danger-light, rgba(224,106,93,0.1))", border: "1px solid var(--color-danger)", marginBottom: "1rem", color: "var(--color-danger)", fontSize: "0.9rem" }}>
                <strong>Reason:</strong> {profile.rejection_reason}
              </div>
            )}
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Status: <span style={{ color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
            </p>
          </div>
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
            <li
              className={activeTab === "offers" ? "active" : ""}
              onClick={() => setActiveTab("offers")}
            >
              <Megaphone className="tab-icon" /> Offers
            </li>
            <li
              className={activeTab === "settings" ? "active" : ""}
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="tab-icon" /> Delivery Settings
            </li>
          </ul>
        </div>

        <div className="dashboard-content glass-panel">
          {activeTab === "overview" && (
            <div className="tab-pane fade-in">
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
                {profile?.avatar && (
                  <img src={profile.avatar} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--color-gold)" }} />
                )}
                <div>
                  <h1 style={{ margin: 0 }}>Welcome, {profile?.business_name}</h1>
                  <p style={{ margin: "0.25rem 0 0", color: "var(--text-secondary)" }}>
                    @{profile?.user_username} · Joined {new Date(profile?.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
                <span className={`status-pill status-pill--${profile?.verification_status === "approved" ? "active" : profile?.verification_status === "rejected" ? "inactive" : "pending"}`}>
                  {profile?.verification_status || "pending"}
                </span>
                <span className={`status-pill status-pill--${(profile?.paymob_account_id || profile?.paymob_wallet_number) ? "active" : "pending"}`}>
                  Payouts: {(profile?.paymob_account_id || profile?.paymob_wallet_number) ? "Configured" : "Pending Setup"}
                </span>
                <span className={`status-pill status-pill--${profile?.delivery_type === "seller" ? "active" : ""}`}>
                  {profile?.delivery_type === "seller" ? "Self Delivery" : "Platform Delivery"}
                </span>
              </div>

              {profile?.rejection_reason && (
                <div style={{ padding: "1rem", borderRadius: 8, background: "var(--color-danger-light, rgba(224,106,93,0.1))", border: "1px solid var(--color-danger)", marginBottom: "1.5rem", color: "var(--color-danger)" }}>
                  <strong>Rejection Reason:</strong> {profile?.rejection_reason}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div className="glass-panel-inner" style={{ padding: "1.5rem", textAlign: "center" }}>
                  <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Products</p>
                  <p style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-gold, #c9a24b)" }}>{products.length}</p>
                </div>
                <div className="glass-panel-inner" style={{ padding: "1.5rem", textAlign: "center" }}>
                  <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Commission Rate</p>
                  <p style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-gold, #c9a24b)" }}>{parseFloat(profile?.effective_commission_rate ?? 10).toFixed(1)}%</p>
                </div>
                <div className="glass-panel-inner" style={{ padding: "1.5rem", textAlign: "center" }}>
                  <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Active Offers</p>
                  <p style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-gold, #c9a24b)" }}>{offers.filter(o => o.is_active).length}</p>
                </div>
                <div className="glass-panel-inner" style={{ padding: "1.5rem", textAlign: "center" }}>
                  <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Delivery</p>
                  <p style={{ fontSize: "2rem", fontWeight: 700, color: profile?.delivery_type === "seller" ? "#3fa781" : "#c9a24b" }}>
                    {profile?.delivery_type === "seller" ? "Self" : "Platform"}
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

              {/* Commission & Fee Summary */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <div className="glass-panel-inner" style={{ padding: "1.25rem", textAlign: "center" }}>
                  <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Commission Rate</p>
                  <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-gold, #c9a24b)" }}>
                    {parseFloat(profile?.effective_commission_rate ?? 10).toFixed(1)}%
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>per sale</p>
                </div>
                <div className="glass-panel-inner" style={{ padding: "1.25rem", textAlign: "center" }}>
                  <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Delivery Mode</p>
                  <p style={{ fontSize: "1.75rem", fontWeight: 700, color: profile?.delivery_type === "seller" ? "#3fa781" : "#c9a24b" }}>
                    {profile?.delivery_type === "seller" ? "Self" : "Platform"}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    {profile?.delivery_type === "seller" ? "50% reduced commission" : "Standard commission"}
                  </p>
                </div>
                <div className="glass-panel-inner" style={{ padding: "1.25rem", textAlign: "center" }}>
                  <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Your Payout Per L.E</p>
                  <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#3fa781" }}>
                    {(100 - parseFloat(profile?.effective_commission_rate ?? 10) * (profile?.delivery_type === "seller" ? 0.5 : 1)).toFixed(1)}%
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    kept after commission
                  </p>
                </div>
              </div>

              <div
                className="onboard-box glass-panel-inner"
                style={{ padding: "1.5rem", marginTop: "1rem" }}
              >
                <h3>Payout via Paymob</h3>
                <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
                  Enter your Paymob account details below. Payouts will be
                  sent to this account after each completed order.
                </p>

                <div style={{ display: "grid", gap: "0.75rem", maxWidth: 420 }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                      Paymob Account ID
                    </label>
                    <input
                      type="text"
                      value={paymobAccountId}
                      onChange={(e) => setPaymobAccountId(e.target.value)}
                      placeholder="e.g. 456789"
                      style={{
                        width: "100%", padding: "0.5rem 0.75rem", fontSize: "0.9rem",
                        background: "var(--bg-body)", border: "1px solid var(--border-color)",
                        borderRadius: "var(--border-radius-md)", color: "var(--text-color)",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                      Wallet Number
                    </label>
                    <input
                      type="text"
                      value={paymobWalletNumber}
                      onChange={(e) => setPaymobWalletNumber(e.target.value)}
                      placeholder="e.g. 01012345678"
                      style={{
                        width: "100%", padding: "0.5rem 0.75rem", fontSize: "0.9rem",
                        background: "var(--bg-body)", border: "1px solid var(--border-color)",
                        borderRadius: "var(--border-radius-md)", color: "var(--text-color)",
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Button variant="gold" size="md" onClick={handleSavePaymob} disabled={savingPaymob}>
                    {savingPaymob ? "Saving..." : "Save Details"}
                  </Button>
                  {paymobAccountId || paymobWalletNumber ? (
                    <span style={{ fontSize: "0.75rem", color: "var(--color-success, #10b981)" }}>Details saved</span>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {activeTab === "offers" && (
            <div className="tab-pane fade-in">
              <div
                className="flex-between"
                style={{ flexWrap: "wrap", gap: "1rem" }}
              >
                <h1>My Offers</h1>
                <Button variant="gold" size="md" onClick={() => setShowOfferModal(true)}>
                  <FaPlus /> Create Offer
                </Button>
              </div>

              {offers.length === 0 ? (
                <div className="empty-state-dash">
                  <Megaphone size={48} />
                  <h3>No offers yet</h3>
                  <p>Create your first offer to attract more customers.</p>
                  <Button variant="gold" size="md" onClick={() => setShowOfferModal(true)}>
                    <FaPlus /> Create Offer
                  </Button>
                </div>
              ) : (
                <div style={{ overflowX: "auto", marginTop: "1.5rem" }}>
                  <table className="table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Discount %</th>
                        <th>Status</th>
                        <th>Active</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offers.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              {o.image && (
                                <img
                                  src={o.image}
                                  alt={o.title}
                                  style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border-color)" }}
                                />
                              )}
                              {o.title}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${o.offer_type}`}>
                              {o.offer_type}
                            </span>
                          </td>
                          <td>{o.discount_percent ? `${o.discount_percent}%` : "—"}</td>
                          <td>
                            <span className={`badge ${o.is_active ? "approved" : "pending"}`}>
                              {o.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <Button
                              variant={o.is_active ? "danger" : "success"}
                              size="sm"
                              onClick={() => handleToggleOfferActive(o)}
                            >
                              {o.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          </td>
                          <td>{o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}</td>
                          <td>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteOffer(o.id)}
                            >
                              <FaTrash /> Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="tab-pane fade-in">
              <h1>Delivery Settings</h1>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                Choose how orders are delivered to your customers.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                <div
                  onClick={() => toggleDeliveryType("platform")}
                  style={{
                    padding: "2rem",
                    borderRadius: "12px",
                    border: `2px solid ${profile?.delivery_type === "platform" ? "#c9a24b" : "var(--border-color)"}`,
                    background: "var(--bg-secondary, rgba(255,255,255,0.04))",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                    textAlign: "center",
                  }}
                >
                  <Truck size={40} style={{ color: profile?.delivery_type === "platform" ? "#c9a24b" : "var(--text-secondary)", marginBottom: "1rem" }} />
                  <h3>Platform Delivery</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                    Platform handles delivery and takes a commission per sale.
                  </p>
                  {profile?.delivery_type === "platform" && (
                    <span className="badge approved" style={{ marginTop: "0.75rem", display: "inline-block" }}>Selected</span>
                  )}
                </div>

                <div
                  onClick={() => toggleDeliveryType("seller")}
                  style={{
                    padding: "2rem",
                    borderRadius: "12px",
                    border: `2px solid ${profile?.delivery_type === "seller" ? "#c9a24b" : "var(--border-color)"}`,
                    background: "var(--bg-secondary, rgba(255,255,255,0.04))",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                    textAlign: "center",
                  }}
                >
                  <Store size={40} style={{ color: profile?.delivery_type === "seller" ? "#c9a24b" : "var(--text-secondary)", marginBottom: "1rem" }} />
                  <h3>Self Delivery</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                    You deliver your orders and pay a reduced commission upfront.
                  </p>
                  {profile?.delivery_type === "seller" && (
                    <span className="badge approved" style={{ marginTop: "0.75rem", display: "inline-block" }}>Selected</span>
                  )}
                </div>
              </div>

              <div className="glass-panel-inner" style={{ padding: "1.25rem", marginTop: "2rem", borderRadius: "10px" }}>
                <h3 style={{ marginBottom: "0.5rem" }}>Commission Info</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  <strong>Platform Delivery:</strong> Standard platform commission applies per sale.<br />
                  <strong>Self Delivery:</strong> Reduced commission is charged upfront when you list a product.
                </p>
              </div>
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

      {showOfferModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel-inner">
            <h2>Create Offer</h2>
            <div className="modal-form">
              <Input
                label="Offer Title"
                placeholder="e.g. Summer Sale 20% Off"
                value={offerForm.title}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, title: e.target.value })
                }
              />
              <Input
                label="Description"
                placeholder="Describe your offer..."
                textarea
                rows="3"
                value={offerForm.description}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, description: e.target.value })
                }
              />
              <Select
                label="Offer Type"
                options={[
                  { id: "promotion", name: "Promotion" },
                  { id: "announcement", name: "Announcement" },
                  { id: "product", name: "Product" },
                ]}
                value={offerForm.offer_type}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, offer_type: e.target.value })
                }
              />
              <Input
                label="Discount %"
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 20"
                hint="Leave product empty above to apply to ALL your products"
                value={offerForm.discount_percent}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, discount_percent: e.target.value })
                }
              />
              <FilePicker
                label="Offer Image"
                hint="Optional. PNG or JPG."
                value={offerForm.image}
                onChange={(file) =>
                  setOfferForm({ ...offerForm, image: file })
                }
              />
            </div>
            <div className="modal-actions">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowOfferModal(false)}
                disabled={savingOffer}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                size="md"
                loading={savingOffer}
                onClick={handleCreateOffer}
              >
                Create Offer
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
