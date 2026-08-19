import React, { useState, useEffect } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2, CheckCircle, ExternalLink, Copy } from "lucide-react";
import api from "../../services/api";
import "./css/style.scss";

function CardForm({ email, setEmail, shippingAddress, setShippingAddress, note, setNote, total, buildOrderPayload, onOrderCreated, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || total === 0) return;

    setProcessing(true);
    setError(null);

    try {
      const payload = await api.post("/api/payments/create-intent/", {
        amount: Math.round(total * 100),
        currency: "egp",
        ...buildOrderPayload(),
      });

      const { clientSecret, orderId } = payload.data;
      onOrderCreated(orderId);

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { email },
        },
      });

      if (result.error) {
        setError(`Payment failed: ${result.error.message}`);
        setProcessing(false);
      } else if (result.paymentIntent.status === "succeeded") {
        onOrderCreated(orderId, true);
        setProcessing(false);
      } else {
        setError(`Payment status: ${result.paymentIntent.status}`);
        setProcessing(false);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response ? `Server error: ${err.response.status}` : err.message;
      setError(`Payment error: ${msg}`);
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
        <label>Card Details</label>
        <CardElement
          id="card-element"
          options={{
            style: {
              base: {
                color: "#ccc",
                fontFamily: "Arial, sans-serif",
                fontSmoothing: "antialiased",
                fontSize: "16px",
                "::placeholder": { color: "#aab7c4" },
              },
              invalid: { color: "#fa755a", iconColor: "#fa755a" },
            },
          }}
        />
      </div>

      <button disabled={processing || !stripe} id="submit-btn">
        <span id="button-text">
          {processing ? "Processing..." : `Pay ${total.toFixed(2)} L.E`}
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

  // Paymob state
  const [paymobIframeUrl, setPaymobIframeUrl] = useState(null);

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

  // Shared order creation for non-card methods
  const createOrder = async () => {
    const response = await api.post("/api/orders/create/", {
      ...buildOrderPayload(),
      payment_method: paymentMethod,
    });
    return response.data;
  };

  // --- Paymob Wallet ---
  const handlePaymobCheckout = async () => {
    if (!email || !shippingAddress) {
      setError("Please fill in your email and shipping address.");
      return;
    }
    setProcessing(true);
    setError(null);

    try {
      const order = await createOrder();
      setOrderId(order.id);

      const res = await api.post("/api/payments/paymob/checkout/", {
        order_id: order.id,
      });

      setPaymobIframeUrl(res.data.iframe_url);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to initiate Paymob payment");
      setProcessing(false);
    }
  };

  // --- Fawry ---
  const handleFawryCheckout = async () => {
    if (!email || !shippingAddress) {
      setError("Please fill in your email and shipping address.");
      return;
    }
    setProcessing(true);
    setError(null);

    try {
      const order = await createOrder();
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

  // --- COD ---
  const handleCodCheckout = async () => {
    if (!email || !shippingAddress) {
      setError("Please fill in your email and shipping address.");
      return;
    }
    setProcessing(true);
    setError(null);

    try {
      const order = await createOrder();
      setOrderId(order.id);
      setSucceeded(true);
      setProcessing(false);
      localStorage.removeItem("cart");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to place order");
      setProcessing(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    switch (paymentMethod) {
      case "paymob_wallet":
        handlePaymobCheckout();
        break;
      case "fawry":
        handleFawryCheckout();
        break;
      case "cod":
        handleCodCheckout();
        break;
      default:
        break;
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
  if (succeeded && !fawryRef && !paymobIframeUrl) {
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

  // --- Paymob iframe ---
  if (paymobIframeUrl) {
    return (
      <div className="paymob-container">
        <h3>Complete Payment</h3>
        <iframe
          src={paymobIframeUrl}
          title="Paymob Payment"
          className="paymob-iframe"
          allow="payment"
        />
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

  // --- Card: render inside CardForm (which has its own Stripe hooks) ---
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
