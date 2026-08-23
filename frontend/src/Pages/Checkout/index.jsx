import React, { useEffect, useState } from "react";
import { CreditCard, Smartphone, Store } from "lucide-react";
import CheckoutForm from "../../Components/CheckoutForm";
import CouponInput from "../../Components/CouponInput";
import "./css/style.scss";
import { useNavigate } from "react-router-dom";

const PAYMENT_METHODS = [
  { id: "card", label: "Credit/Debit Card", icon: <CreditCard size={22} />, description: "Pay securely with Visa/Mastercard" },
  { id: "paymob_wallet", label: "Mobile Wallet", icon: <Smartphone size={22} />, description: "Vodafone Cash, Orange Cash, Etisalat" },
  { id: "fawry", label: "Fawry", icon: <Store size={22} />, description: "Pay at any Fawry outlet" },
];

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const items = JSON.parse(localStorage.getItem("cart")) || [];
    const itemsWithQuantity = items.map((item) => ({
      ...item,
      quantity: item.quantity || 1,
    }));

    setCartItems(itemsWithQuantity);

    if (items.length === 0) {
      navigate("/cart");
      return;
    }

    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  const subtotal = cartItems.reduce((total, item) => {
    const price = parseFloat(item.price) || 0;
    return total + price * (item.quantity || 1);
  }, 0);

  const totalItems = cartItems.reduce(
    (total, item) => total + (item.quantity || 1),
    0
  );

  const discountAmount = appliedCoupon ? parseFloat(appliedCoupon.calculated_discount) || 0 : 0;
  const finalTotal = Math.max(subtotal - discountAmount, 0);

  const handleCouponApply = (couponData) => setAppliedCoupon(couponData);
  const handleCouponRemove = () => setAppliedCoupon(null);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="checkout-page-container">
      <div className="checkout-wrapper">
        <h1>Complete Your Purchase</h1>

        <div className="checkout-content">
          {/* Order Summary Section */}
          <div className="order-summary-section">
            <h2>Order Summary</h2>
            <div className="order-items">
              {cartItems.map((item) => (
                <div key={item.id} className="order-item">
                  <img src={item.image} alt={item.name} className="order-item-image" />
                  <div className="order-item-details">
                    <h3>{item.name}</h3>
                    <p className="order-item-price">
                      {parseFloat(item.price).toFixed(2)} L.E × {item.quantity}
                    </p>
                    <p className="order-item-subtotal">
                      {((parseFloat(item.price) || 0) * (item.quantity || 1)).toFixed(2)} L.E
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="coupon-section">
              <CouponInput
                subtotal={subtotal}
                onApply={handleCouponApply}
                onRemove={handleCouponRemove}
                appliedCoupon={appliedCoupon}
              />
            </div>

            <div className="order-totals">
              <div className="total-line">
                <span>Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})</span>
                <span>{subtotal.toFixed(2)} L.E</span>
              </div>
              {appliedCoupon && (
                <div className="total-line discount-line">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>-{discountAmount.toFixed(2)} L.E</span>
                </div>
              )}
              <div className="total-line">
                <span>Shipping</span>
                <span>FREE</span>
              </div>
              <div className="total-line total-final">
                <span>Total</span>
                <span>{finalTotal.toFixed(2)} L.E</span>
              </div>
            </div>
          </div>

          {/* Payment Form Section */}
          <div className="payment-section">
            <h2>Payment Details</h2>

            {/* Payment Method Selector */}
            <div className="payment-method-selector">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.id}
                  className={`payment-method-card ${paymentMethod === method.id ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                  />
                  <div className="payment-method-icon">{method.icon}</div>
                  <div className="payment-method-info">
                    <span className="payment-method-label">{method.label}</span>
                    <span className="payment-method-desc">{method.description}</span>
                  </div>
                  <div className="payment-method-radio" />
                </label>
              ))}
            </div>

            {/* Checkout Form */}
            <CheckoutForm
              cartItems={cartItems}
              totalAmount={finalTotal}
              totalItems={totalItems}
              paymentMethod={paymentMethod}
              coupon={appliedCoupon}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
