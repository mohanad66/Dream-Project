import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../../services/constants.js";
import { useAuth } from "../../services/auth";
import "../../Components/Form/css/styles.scss"; // Reuse existing form styles

export default function SellerRegister() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    business_name: "",
    business_description: "",
    contact_phone: "",
    contact_email: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { refetchUser, isAuthenticated } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const payload = { ...formData };
      
      if (isAuthenticated) {
        // Upgrade existing user
        await api.post("/api/sellers/upgrade/", {
          business_name: payload.business_name,
          business_description: payload.business_description,
          contact_phone: payload.contact_phone,
          contact_email: payload.contact_email,
        });
      } else {
        // Register new user and seller
        const response = await api.post("/api/sellers/register/", payload);
        
        // Save tokens
        localStorage.setItem(ACCESS_TOKEN, response.data.access);
        localStorage.setItem(REFRESH_TOKEN, response.data.refresh);
        api.defaults.headers.common["Authorization"] = `Bearer ${response.data.access}`;
      }
      
      if (refetchUser) {
          await refetchUser();
      }

      // Redirect to seller dashboard or home
      navigate("/seller/dashboard");
    } catch (err) {
      console.error("Seller registration error:", err);
      let errorMessage = "Registration failed.";
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === "string") {
          errorMessage = data;
        } else {
          const fieldErrors = [];
          Object.keys(data).forEach((field) => {
            if (Array.isArray(data[field])) {
              fieldErrors.push(`${field}: ${data[field].join(", ")}`);
            } else {
              fieldErrors.push(`${field}: ${data[field]}`);
            }
          });
          if (fieldErrors.length > 0) errorMessage = fieldErrors.join("\n");
        }
      } else {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
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

      <div className="form-wrapper" style={{ marginTop: '100px', marginBottom: '50px' }}>
        <form onSubmit={handleSubmit} className="form-container" style={{ maxWidth: '600px' }}>
          <h1>Register as a Seller</h1>

          {error && (
            <div className="error" style={{ whiteSpace: "pre-line" }}>
              {error}
            </div>
          )}

          <div className="form-inputs">
            {!isAuthenticated && (
              <>
                <h3>Personal Information</h3>
                <div className="name-fields">
                  <input
                    type="text"
                    name="first_name"
                    placeholder="First Name"
                    className="form-input"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                  />
                  <input
                    type="text"
                    name="last_name"
                    placeholder="Last Name"
                    className="form-input"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password (min 8 chars)"
                  className="form-input"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
              </>
            )}

            <h3 style={{ marginTop: '20px' }}>Business Information</h3>
            <input
              type="text"
              name="business_name"
              placeholder="Business Name"
              className="form-input"
              value={formData.business_name}
              onChange={handleChange}
              required
            />
            <textarea
              name="business_description"
              placeholder="Business Description (Optional)"
              className="form-input"
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={formData.business_description}
              onChange={handleChange}
            />
            <div className="name-fields">
              <input
                type="text"
                name="contact_phone"
                placeholder="Business Phone"
                className="form-input"
                value={formData.contact_phone}
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="contact_email"
                placeholder="Business Email"
                className="form-input"
                value={formData.contact_email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button type="submit" className="form-button" disabled={loading}>
            {loading ? "Processing..." : "Register Seller Account"}
          </button>
          
          <div className="form-footer">
            <p className="form-link">
              Already have an account? <span onClick={() => navigate("/login")}>Login</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
