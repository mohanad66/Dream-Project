import React, { useEffect, useState } from "react";
import { CreditCard, Smartphone, Store, Truck, MapPin } from "lucide-react";
import CheckoutForm from "../../Components/CheckoutForm";
import CouponInput from "../../Components/CouponInput";
import "./css/style.scss";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { ACCESS_TOKEN } from "../../services/constants";
import { FaLock, FaClipboardCheck, FaTruckFast, FaShieldHalved, FaPlus, FaMinus, FaTrash } from "react-icons/fa6";

const PAYMENT_METHODS = [
  { id: "card", label: "Credit/Debit Card", icon: <CreditCard size={22} />, description: "Pay securely with Visa/Mastercard" },
  { id: "paymob_wallet", label: "Mobile Wallet", icon: <Smartphone size={22} />, description: "Vodafone Cash, Orange Cash, Etisalat" },
  { id: "fawry", label: "Fawry", icon: <Store size={22} />, description: "Pay at any Fawry outlet" },
];

const EGYPTIAN_CITIES = [
  "Cairo", "Giza", "Alexandria", "Qalyubia", "Sharqia", "Dakahlia",
  "Gharbia", "Monufia", "Beheira", "Kafr El Sheikh", "Damietta",
  "Port Said", "Ismailia", "Suez", "North Sinai", "South Sinai",
  "Beni Suef", "Fayoum", "Minya", "Asyut", "Sohag", "Qena",
  "Luxor", "Aswan", "Red Sea", "New Valley",
];

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const navigate = useNavigate();

  const isAuthed = !!localStorage.getItem(ACCESS_TOKEN);

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
  const finalTotal = Math.max(subtotal - discountAmount + deliveryFee, 0);

  const handleCouponApply = (couponData) => setAppliedCoupon(couponData);
  const handleCouponRemove = () => setAppliedCoupon(null);

  const persistCart = (items) => {
    localStorage.setItem("cart", JSON.stringify(items));
    window.dispatchEvent(new Event("cart-updated"));
  };

  const handleQuantityChange = (productId, change) => {
    const updated = cartItems.map((item) => {
      if (item.id === productId) {
        const newQuantity = (item.quantity || 1) + change;
        if (newQuantity >= 1 && newQuantity <= 99) {
          return { ...item, quantity: newQuantity };
        }
      }
      return item;
    });
    setCartItems(updated);
    persistCart(updated);
  };

  const handleRemoveItem = (productId) => {
    const updated = cartItems.filter((item) => item.id !== productId);
    setCartItems(updated);
    persistCart(updated);
    if (updated.length === 0) navigate("/cart");
  };

  const handleCityChange = async (city) => {
    setDeliveryCity(city);
    if (!city) {
      setDeliveryFee(0);
      return;
    }

    setDeliveryLoading(true);
    try {
      const response = await api.post("/api/delivery/fee/", {
        city: city,
        delivery_type: "platform",
      });
      setDeliveryFee(parseFloat(response.data.fee) || 0);
    } catch (err) {
      console.error("Failed to calculate delivery fee:", err);
      setDeliveryFee(40);
    } finally {
      setDeliveryLoading(false);
    }
  };

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
                    <div className="order-item-name-line">
                      <h3>{item.name}</h3>
                      <button
                        className="order-item-remove"
                        onClick={() => handleRemoveItem(item.id)}
                        title="Remove item"
                        aria-label={`Remove ${item.name}`}
                      >
                        <FaTrash />
                      </button>
                    </div>
                    <p className="order-item-price">
                      {parseFloat(item.price).toFixed(2)} L.E
                    </p>
                    <div className="order-item-qty">
                      <button
                        className="order-qty-btn"
                        onClick={() => handleQuantityChange(item.id, -1)}
                        disabled={(item.quantity || 1) <= 1}
                        aria-label="Decrease quantity"
                      >
                        <FaMinus />
                      </button>
                      <span className="order-qty-value">{item.quantity || 1}</span>
                      <button
                        className="order-qty-btn"
                        onClick={() => handleQuantityChange(item.id, 1)}
                        disabled={(item.quantity || 1) >= 99}
                        aria-label="Increase quantity"
                      >
                        <FaPlus />
                      </button>
                      <span className="order-item-subtotal">
                        {((parseFloat(item.price) || 0) * (item.quantity || 1)).toFixed(2)} L.E
                      </span>
                    </div>
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

            {/* Delivery Location */}
            <div className="delivery-section">
              <div className="delivery-header">
                <MapPin size={18} />
                <span>Delivery Location</span>
              </div>
              <select
                className="delivery-city-select"
                value={deliveryCity}
                onChange={(e) => handleCityChange(e.target.value)}
              >
                <option value="">Select your city</option>
                {EGYPTIAN_CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {deliveryLoading && (
                <div className="delivery-loading">Calculating delivery fee...</div>
              )}
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
                <span>{deliveryFee > 0 ? `${deliveryFee.toFixed(2)} L.E` : "FREE"}</span>
              </div>
              <div className="total-line total-final">
                <span>Total</span>
                <span>{finalTotal.toFixed(2)} L.E</span>
              </div>
            </div>
          </div>

          {/* Payment Form Section */}
          <div className="payment-section">
            {isAuthed ? (
              <>
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
                  deliveryFee={deliveryFee}
                />
              </>
            ) : (
              <div className="checkout-gate">
                <div className="checkout-gate__icon">
                  <FaShieldHalved size={26} />
                </div>
                <h2>Log in to complete your order</h2>
                <p className="checkout-gate__intro">
                  Your cart is safe and saved. Create a free account (or sign
                  in) to finish checking out — your items stay in your cart
                  either way.
                </p>
                <ul className="checkout-gate__benefits">
                  <li><FaLock size={15} /> Secure payment with full order protection</li>
                  <li><FaTruckFast size={15} /> Track your order from checkout to delivery</li>
                  <li><FaClipboardCheck size={15} /> Access order history and fast re-ordering</li>
                </ul>
                <div className="checkout-gate__actions">
                  <Link className="checkout-gate__btn checkout-gate__btn--primary" to="/login?next=/checkout">
                    Log in
                  </Link>
                  <Link className="checkout-gate__btn checkout-gate__btn--ghost" to="/register?next=/checkout">
                    Create a free account
                  </Link>
                </div>
                <p className="checkout-gate__note">
                  <Link to="/cart">← Back to cart</Link> to review your items.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
