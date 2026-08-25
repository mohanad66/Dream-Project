import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle, ExternalLink, Copy, CreditCard, Smartphone } from "lucide-react";
import api from "../../services/api";
import { useToast } from "../../Components/Toast/useToast";
import "./css/style.scss";

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
  const [walletNumber, setWalletNumber] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const [fawryRef, setFawryRef] = useState(null);
  const [fawryUrl, setFawryUrl] = useState(null);

  const [paymobIframeUrl, setPaymobIframeUrl] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    if (!paymobIframeUrl || succeeded) return;

    const handleMessage = (event) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data && (data.success === true || data.status === "success" || data.event === "payment")) {
          setSucceeded(true);
        } else if (data && (data.success === false || data.status === "failed")) {
          setError("Payment was not completed. Please try again.");
          setPaymobIframeUrl(null);
          setProcessing(false);
        }
      } catch (e) {}
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [paymobIframeUrl, succeeded]);

  useEffect(() => {
    if (!orderId || succeeded) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 60) { clearInterval(interval); return; }
      try {
        const res = await api.get(`/api/orders/${orderId}/`);
        if (res.data && (res.data.status === "confirmed" || res.data.status === "processing" || res.data.status === "shipped")) {
          setSucceeded(true);
          clearInterval(interval);
        }
      } catch (e) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [orderId, succeeded]);

  useEffect(() => {
    if (propCartItems && propTotal !== undefined) {
      setCartItems(propCartItems);
      setTotal(propTotal);
      setTotalItems(propTotalItems || 0);
    } else {
      const items = JSON.parse(localStorage.getItem("cart")) || [];
      const itemsWithQuantity = items.map((item) => ({ ...item, quantity: item.quantity || 1 }));
      setCartItems(itemsWithQuantity);
      const cartTotal = itemsWithQuantity.reduce((s, i) => s + (parseFloat(i.price) || 0) * (i.quantity || 1), 0);
      const itemCount = itemsWithQuantity.reduce((s, i) => s + (i.quantity || 1), 0);
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

  const handleCardInit = async (e) => {
    e.preventDefault();
    if (processing) return;
    if (total === 0) { setError("Cart total is 0"); return; }
    if (!email) { setError("Enter your email"); return; }
    if (!shippingAddress) { setError("Enter your shipping address"); return; }

    setProcessing(true);
    setError(null);

    try {
      const orderRes = await api.post("/api/orders/create/", {
        ...buildOrderPayload(),
        payment_method: "paymob",
      });
      const oid = orderRes.data.id;

      const initRes = await api.post("/api/payments/paymob/init/", {
        order_id: oid,
        billing_data: { email, street: shippingAddress },
        payment_method: "card",
      });

      if (initRes.data.iframe_url) {
        setOrderId(oid);
        setPaymobIframeUrl(initRes.data.iframe_url);
      } else {
        setError("Failed to initialize payment");
        setProcessing(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details || `Error: ${err.message}`);
      setProcessing(false);
    }
  };

  const handleWalletPay = async (e) => {
    e.preventDefault();
    if (processing) return;
    if (total === 0) { setError("Cart total is 0"); return; }
    if (!email) { setError("Enter your email"); return; }
    if (!shippingAddress) { setError("Enter your shipping address"); return; }
    if (!walletNumber || walletNumber.length < 10) { setError("Enter a valid wallet number (e.g. 01012345678)"); return; }

    setProcessing(true);
    setError(null);

    try {
      const orderRes = await api.post("/api/orders/create/", {
        ...buildOrderPayload(),
        payment_method: "paymob_wallet",
      });
      const oid = orderRes.data.id;

      const res = await api.post("/api/payments/paymob/wallet/", {
        order_id: oid,
        wallet_number: walletNumber,
      });

      if (res.data.redirect_url) {
        setOrderId(oid);
        window.location.href = res.data.redirect_url;
      } else {
        setError("Failed to initialize wallet payment");
        setProcessing(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details || `Error: ${err.message}`);
      setProcessing(false);
    }
  };

  const handleFawryPay = async (e) => {
    e.preventDefault();
    if (processing) return;
    if (!email || !shippingAddress) { setError("Fill in email and shipping address"); return; }

    setProcessing(true);
    setError(null);

    try {
      const orderRes = await api.post("/api/orders/create/", {
        ...buildOrderPayload(),
        payment_method: "fawry",
      });
      const oid = orderRes.data.id;

      const res = await api.post("/api/payments/fawry/checkout/", { order_id: oid });
      setOrderId(oid);
      setFawryRef(res.data.fawry_ref_number);
      setFawryUrl(res.data.payment_url);
      setProcessing(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to initiate Fawry payment");
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (succeeded) {
      const t = setTimeout(() => { window.location.href = orderId ? `/orders/${orderId}` : "/"; }, 2500);
      return () => clearTimeout(t);
    }
  }, [succeeded, orderId]);

  if (succeeded && !fawryRef) {
    return (
      <div className="payment-success">
        <CheckCircle size={48} className="success-icon" />
        <h2>Payment Successful!</h2>
        <p>Thank you for your purchase.</p>
        <p className="order-details">Order #{orderId} | {total.toFixed(2)} L.E</p>
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

  if (fawryRef) {
    return (
      <div className="fawry-container">
        <CheckCircle size={48} className="fawry-success-icon" />
        <h3>Fawry Payment</h3>
        <p className="fawry-instruction">Use this reference number at any Fawry outlet.</p>
        <div className="fawry-ref-box">
          <span className="fawry-ref-label">Reference Number</span>
          <span className="fawry-ref-number">{fawryRef}</span>
          <button className="fawry-copy-btn" onClick={() => navigator.clipboard.writeText(String(fawryRef))} type="button">
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

  if (paymentMethod === "card" && paymobIframeUrl) {
    return (
      <div className="paymob-iframe-wrapper">
        {!iframeLoaded && (
          <div className="iframe-loader">
            <Loader2 size={32} className="spin" />
            <p>Loading payment form...</p>
          </div>
        )}
        <p className="iframe-instruction">Complete your payment below</p>
        <iframe
          src={paymobIframeUrl}
          frameBorder="0"
          style={{ width: "100%", minHeight: "600px", borderRadius: "12px", opacity: iframeLoaded ? 1 : 0, transition: "opacity 0.3s" }}
          title="Paymob Payment"
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation"
          onLoad={() => setIframeLoaded(true)}
        />
      </div>
    );
  }

  if (paymentMethod === "card") {
    return (
      <form id="payment-form" onSubmit={handleCardInit}>
        <div className="form-group">
          <label>Email Address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" />
        </div>

        <div className="form-group">
          <label>Shipping Address</label>
          <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Enter your shipping address" rows="3" />
        </div>

        <div className="form-group">
          <label>Order Notes (Optional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Special instructions" rows="2" />
        </div>

        <button type="submit" disabled={processing} id="submit-btn">
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

  if (paymentMethod === "paymob_wallet") {
    return (
      <form id="payment-form" onSubmit={handleWalletPay}>
        <div className="form-group">
          <label>Email Address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" />
        </div>

        <div className="form-group">
          <label>Shipping Address</label>
          <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Enter your shipping address" rows="3" />
        </div>

        <div className="form-group">
          <label>Order Notes (Optional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Special instructions" rows="2" />
        </div>

        <div className="form-group wallet-number-group">
          <label>
            <Smartphone size={16} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Vodafone Cash / Mobile Wallet Number
          </label>
          <input
            type="tel"
            value={walletNumber}
            onChange={(e) => setWalletNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
            placeholder="01012345678"
            pattern="01[0-9]{9}"
            maxLength={11}
          />
          <span className="field-hint">You will receive an OTP on this number to confirm payment</span>
        </div>

        <button type="submit" disabled={processing} id="submit-btn">
          <span id="button-text">
            {processing ? (
              <span className="btn-loading"><Loader2 size={18} className="spin" /> Redirecting to wallet...</span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Smartphone size={18} />
                Pay {total.toFixed(2)} L.E via Wallet
              </span>
            )}
          </span>
        </button>

        {error && <div id="payment-message" role="alert">{error}</div>}
      </form>
    );
  }

  return (
    <form id="payment-form" onSubmit={handleFawryPay}>
      <div className="form-group">
        <label>Email Address</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" />
      </div>

      <div className="form-group">
        <label>Shipping Address</label>
        <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Enter your shipping address" rows="3" />
      </div>

      <div className="form-group">
        <label>Order Notes (Optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Special instructions" rows="2" />
      </div>

      <button type="submit" disabled={processing} id="submit-btn">
        <span id="button-text">
          {processing ? (
            <span className="btn-loading"><Loader2 size={18} className="spin" /> Processing...</span>
          ) : (
            `Submit Order — ${total.toFixed(2)} L.E`
          )}
        </span>
      </button>

      {error && <div id="payment-message" role="alert">{error}</div>}
    </form>
  );
}
