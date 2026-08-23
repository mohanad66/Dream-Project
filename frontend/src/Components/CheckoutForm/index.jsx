import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle, ExternalLink, Copy, CreditCard } from "lucide-react";
import api from "../../services/api";
import { useToast } from "../../Components/Toast/useToast";
import "./css/style.scss";

function CardForm({ email, setEmail, shippingAddress, setShippingAddress, note, setNote, total, buildOrderPayload, onOrderCreated, onError }) {
  const toast = useToast();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const [cardNumber, setCardNumber] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");

  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (total === 0) return;

    const digits = cardNumber.replace(/\s/g, "");
    if (digits.length < 13) { setError("Invalid card number"); return; }
    if (!expiryMonth || !expiryYear) { setError("Enter expiry date"); return; }
    if (cvv.length < 3) { setError("Invalid CVV"); return; }
    if (!cardHolderName.trim()) { setError("Enter cardholder name"); return; }

    setProcessing(true);
    setError(null);

    try {
      // 1. Create order
      const orderRes = await api.post("/api/orders/create/", {
        ...buildOrderPayload(),
        payment_method: "paymob",
      });
      const orderId = orderRes.data.id;
      onOrderCreated(orderId);

      // 2. Init Paymob — get payment_token
      const initRes = await api.post("/api/payments/paymob/init/", {
        order_id: orderId,
        billing_data: { email, street: shippingAddress },
      });
      const { payment_token } = initRes.data;

      // 3. Pay with card details
      const payRes = await api.post("/api/payments/paymob/pay/", {
        payment_token,
        card_number: digits,
        card_holder_name: cardHolderName.trim(),
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        cvv,
      });

      if (payRes.data.success) {
        onOrderCreated(orderId, true);
        toast.success("Payment successful!");
      } else {
        setError(payRes.data.error || "Payment failed");
        setProcessing(false);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details || `Error: ${err.message}`;
      setError(msg);
      setProcessing(false);
    }
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="card-email">Email Address</label>
        <input
          type="email"
          id="card-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="card-shipping">Shipping Address</label>
        <textarea
          id="card-shipping"
          value={shippingAddress}
          onChange={(e) => setShippingAddress(e.target.value)}
          placeholder="Enter your shipping address"
          rows="3"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="card-note">Order Notes (Optional)</label>
        <textarea
          id="card-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any special instructions"
          rows="2"
        />
      </div>

      <div className="form-group">
        <label>Cardholder Name</label>
        <input
          type="text"
          value={cardHolderName}
          onChange={(e) => setCardHolderName(e.target.value)}
          placeholder="Name on card"
          required
        />
      </div>

      <div className="form-group">
        <label>Card Number</label>
        <input
          type="text"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          placeholder="0000 0000 0000 0000"
          maxLength={19}
          required
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div className="form-group">
          <label>Expiry Month</label>
          <input
            type="text"
            value={expiryMonth}
            onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
            placeholder="MM"
            maxLength={2}
            required
          />
        </div>
        <div className="form-group">
          <label>Expiry Year</label>
          <input
            type="text"
            value={expiryYear}
            onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, "").slice(0, 2))}
            placeholder="YY"
            maxLength={2}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>CVV</label>
        <input
          type="password"
          value={cvv}
          onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="***"
          maxLength={4}
          required
        />
      </div>

      <button disabled={processing} id="submit-btn">
        <span id="button-text">
          {processing ? (
            <span className="btn-loading"><Loader2 size={18} className="spin" /> Processing...</span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CreditCard size={18} />
              Pay {total.toFixed(2)} L.E
            </span>
          )}
        </span>
      </button>

      {error && <div id="payment-message" role="alert">{error}</div>}
    </form>
  );
}

export default function CheckoutForm({
  cartItems: propCartItems,
  totalAmount: propTotal,
  totalItems: propTotalItems,
  paymentMethod,
  coupon,
}) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [note, setNote] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [orderId, setOrderId] = useState(null);

  // Fawry state
  const [fawryRef, setFawryRef] = useState(null);
  const [fawryUrl, setFawryUrl] = useState(null);

  useEffect(() => {
    if (propCartItems && propTotal !== undefined) {
      setCartItems(propCartItems);
      setTotal(propTotal);
      setTotalItems(propTotalItems || 0);
    } else {
      const items = JSON.parse(localStorage.getItem("cart")) || [];
      const itemsWithQuantity = items.map((item) => ({
        ...item,
        quantity: item.quantity || 1,
      }));
      setCartItems(itemsWithQuantity);
      const cartTotal = itemsWithQuantity.reduce((sum, item) => {
        return sum + (parseFloat(item.price) || 0) * (item.quantity || 1);
      }, 0);
      const itemCount = itemsWithQuantity.reduce((sum, item) => sum + (item.quantity || 1), 0);
      setTotal(cartTotal);
      setTotalItems(itemCount);
    }
  }, [propCartItems, propTotal, propTotalItems]);

  const buildOrderPayload = () => ({
    order_items: cartItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: parseFloat(item.price),
      quantity: item.quantity || 1,
      subtotal: (parseFloat(item.price) || 0) * (item.quantity || 1),
    })),
    total_items: totalItems,
    shipping_address: shippingAddress,
    note,
    email,
    payment_method: paymentMethod,
    ...(coupon && {
      coupon_code: coupon.code,
      discount_amount: parseFloat(coupon.calculated_discount) || 0,
    }),
  });

  // --- Fawry ---
  const handleFawryCheckout = async () => {
    if (!email || !shippingAddress) {
      setError("Please fill in your email and shipping address.");
      return;
    }
    setProcessing(true);
    setError(null);

    try {
      const response = await api.post("/api/orders/create/", {
        ...buildOrderPayload(),
        payment_method: paymentMethod,
      });
      const order = response.data;
      setOrderId(order.id);

      const res = await api.post("/api/payments/fawry/checkout/", {
        order_id: order.id,
      });

      setFawryRef(res.data.fawry_ref_number);
      setFawryUrl(res.data.payment_url);
      setProcessing(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to initiate Fawry payment");
      setProcessing(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (paymentMethod === "fawry") {
      handleFawryCheckout();
    }
  };

  const handleCardOrderCreated = (id, success) => {
    setOrderId(id);
    if (success) {
      setSucceeded(true);
      localStorage.removeItem("cart");
    }
  };

  // Redirect after success
  useEffect(() => {
    if (succeeded && paymentMethod !== "fawry") {
      const timer = setTimeout(() => {
        window.location.href = orderId ? `/orders/${orderId}` : "/";
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [succeeded, orderId, paymentMethod]);

  // --- Success states ---
  if (succeeded && !fawryRef) {
    return (
      <div className="payment-success">
        <CheckCircle size={48} className="success-icon" />
        <h2>Payment Successful!</h2>
        <p>Thank you for your purchase. A confirmation has been sent to your email.</p>
        <p className="order-details">
          Order ID: #{orderId} | Total items: {totalItems} | Total paid: {total.toFixed(2)} L.E
        </p>
      </div>
    );
  }

  if (cartItems.length === 0 && !succeeded) {
    return (
      <div className="empty-checkout">
        <h2>Your cart is empty.</h2>
        <p>Add items to your cart before checking out.</p>
      </div>
    );
  }

  // --- Fawry reference ---
  if (fawryRef) {
    return (
      <div className="fawry-container">
        <CheckCircle size={48} className="fawry-success-icon" />
        <h3>Fawry Payment</h3>
        <p className="fawry-instruction">
          Use the reference number below at any Fawry outlet to complete your payment.
        </p>
        <div className="fawry-ref-box">
          <span className="fawry-ref-label">Reference Number</span>
          <span className="fawry-ref-number">{fawryRef}</span>
          <button
            className="fawry-copy-btn"
            onClick={() => navigator.clipboard.writeText(String(fawryRef))}
            type="button"
          >
            <Copy size={14} /> Copy
          </button>
        </div>
        {fawryUrl && (
          <a href={fawryUrl} target="_blank" rel="noopener noreferrer" className="fawry-link">
            <ExternalLink size={14} /> Pay Online
          </a>
        )}
        <p className="fawry-note">Order #{orderId} — {total.toFixed(2)} L.E</p>
      </div>
    );
  }

  // --- Card: render CardForm with Paymob headless fields ---
  if (paymentMethod === "card") {
    return (
      <CardForm
        email={email}
        setEmail={setEmail}
        shippingAddress={shippingAddress}
        setShippingAddress={setShippingAddress}
        note={note}
        setNote={setNote}
        total={total}
        buildOrderPayload={buildOrderPayload}
        onOrderCreated={handleCardOrderCreated}
        onError={setError}
      />
    );
  }

  // --- Non-card methods: common form ---
  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="shipping">Shipping Address</label>
        <textarea
          id="shipping"
          value={shippingAddress}
          onChange={(e) => setShippingAddress(e.target.value)}
          placeholder="Enter your shipping address"
          rows="3"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="note">Order Notes (Optional)</label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any special instructions"
          rows="2"
        />
      </div>

      <button disabled={processing} id="submit-btn">
        <span id="button-text">
          {processing ? (
            <span className="btn-loading"><Loader2 size={18} className="spin" /> Processing...</span>
          ) : (
            `Pay ${total.toFixed(2)} L.E`
          )}
        </span>
      </button>

      {error && <div id="payment-message" role="alert">{error}</div>}
    </form>
  );
}
