import React, { useState } from "react";
import { Tag, X, Check, Loader2 } from "lucide-react";
import api from "../../services/api";
import "./css/style.scss";

export default function CouponInput({ subtotal, onApply, onRemove, appliedCoupon }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/api/coupons/validate/", {
        code: code.trim(),
        order_total: subtotal,
      });

      const data = response.data;
      if (data.valid) {
        onApply(data);
        setCode("");
      } else {
        setError(data.message || "Invalid coupon code");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to validate coupon");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setCode("");
    setError(null);
    onRemove();
  };

  if (appliedCoupon) {
    return (
      <div className="coupon-input coupon-applied">
        <div className="coupon-applied-info">
          <div className="coupon-applied-badge">
            <Check size={14} />
            <span>Coupon Applied</span>
          </div>
          <span className="coupon-code-display">{appliedCoupon.code}</span>
          <span className="coupon-discount">
            -{appliedCoupon.discount_type === "percentage"
              ? `${appliedCoupon.discount_value}%`
              : `${appliedCoupon.calculated_discount} L.E`}
          </span>
        </div>
        <button className="coupon-remove-btn" onClick={handleRemove} type="button">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <form className="coupon-input" onSubmit={handleApply}>
      <div className="coupon-input-field">
        <Tag size={16} className="coupon-icon" />
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="Enter coupon code"
          disabled={loading}
        />
      </div>
      <button
        type="submit"
        className="coupon-apply-btn"
        disabled={loading || !code.trim()}
      >
        {loading ? <Loader2 size={16} className="spin" /> : "Apply"}
      </button>
      {error && <p className="coupon-error">{error}</p>}
    </form>
  );
}
