import React, { useState, useEffect } from "react";
import { useAuth } from "../../services/auth";
import api from "../../services/api";
import { FaBoxOpen, FaChartLine, FaWallet, FaPlus, FaEdit } from "react-icons/fa";
import "./seller.scss";

export default function SellerDashboard() {
  const { data, isSeller } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const profile = data?.sellerProfile;

  useEffect(() => {
    if (activeTab === "products" && isSeller) {
      fetchProducts();
    }
  }, [activeTab, isSeller]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/sellers/products/");
      setProducts(response.data.results || response.data);
    } catch (err) {
      console.error("Failed to fetch seller products", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const checkStripeReturn = async () => {
      try {
        await api.get("/api/sellers/stripe/return/");
        // refresh auth/profile data so `profile.stripe_payouts_enabled` updates
        // (however your app refetches the user — e.g. refetchUser() from useAuth)
      } catch (err) {
        console.error("Failed to sync Stripe return status", err);
      }
    };
    checkStripeReturn();
  }, []);
  const handleStripeOnboard = async () => {
    try {
      const res = await api.post("/api/sellers/stripe/onboard/");
      window.location.href = res.data.url;
    } catch (err) {
      console.error("Failed to get onboarding link", err);
      alert("Failed to initiate Stripe onboarding.");
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

  return (
    <div className="seller-dashboard-page">
      {/* Animated background particles */}
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
            <li className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>
              <FaChartLine className="tab-icon" /> Overview
            </li>
            <li className={activeTab === "products" ? "active" : ""} onClick={() => setActiveTab("products")}>
              <FaBoxOpen className="tab-icon" /> My Products
            </li>
            <li className={activeTab === "finances" ? "active" : ""} onClick={() => setActiveTab("finances")}>
              <FaWallet className="tab-icon" /> Finances & Payouts
            </li>
          </ul>
        </div>

        <div className="dashboard-content glass-panel">
          {activeTab === "overview" && (
            <div className="tab-pane">
              <h1>Welcome, {profile?.business_name}</h1>
              <p>Verification Status: <strong>{profile?.verification_status}</strong></p>
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
                  <p>{profile?.stripe_payouts_enabled ? "Enabled" : "Pending Setup"}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div className="tab-pane fade-in">
              <div className="flex-between">
                <h1>My Products</h1>
                <button className="btn btn-primary glass-btn">
                  <FaPlus /> Add Product
                </button>
              </div>

              {loading ? (
                <p>Loading products...</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan="4">No products found.</td>
                      </tr>
                    ) : (
                      products.map(p => (
                        <tr key={p.id}>
                          <td>{p.name}</td>
                          <td>${p.price}</td>
                          <td>
                            <span className={`badge ${p.approval_status}`}>
                              {p.approval_status}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-sm glass-btn">
                              <FaEdit /> Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "finances" && (
            <div className="tab-pane finances-tab fade-in">
              <h1>Finances & Payouts</h1>
              {!profile?.stripe_payouts_enabled ? (
                <div className="onboard-box glass-panel-inner">
                  <h3>Set up your payouts</h3>
                  <p>You need to connect a Stripe account to receive funds for your sales.</p>
                  <button onClick={handleStripeOnboard} className="btn btn-primary stripe-btn">
                    Connect with Stripe
                  </button>
                </div>
              ) : (
                <div className="success-box glass-panel-inner">
                  <h3>Payouts Enabled</h3>
                  <p>Your Stripe connected account is fully set up. Payouts will be sent automatically based on your Stripe settings.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
