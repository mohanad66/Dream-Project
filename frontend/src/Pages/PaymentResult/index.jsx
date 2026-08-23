import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "../../Components/Toast/useToast";
import "./style.scss";

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [status, setStatus] = useState("loading");

  const success = searchParams.get("success") === "true";
  const orderId = searchParams.get("order");

  useEffect(() => {
    if (success) {
      setStatus("success");
      localStorage.removeItem("cart");
      toast.success("Payment successful! Your order has been confirmed.");
    } else {
      setStatus("failed");
      toast.error("Payment was not completed. Please try again.");
    }
  }, [success, toast]);

  return (
    <div className="payment-result-page">
      <div className="payment-result-card">
        {status === "loading" && (
          <>
            <Loader2 size={64} className="spin" />
            <h2>Verifying Payment...</h2>
            <p>Please wait while we confirm your payment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle size={64} className="payment-result-icon payment-result-icon--success" />
            <h2>Payment Successful!</h2>
            <p>Thank you for your purchase. Your order has been confirmed.</p>
            {orderId && <p className="payment-result-order">Order #{orderId}</p>}
            <div className="payment-result-actions">
              <button className="payment-result-btn payment-result-btn--primary" onClick={() => navigate(`/orders/${orderId}`)}>
                View Order
              </button>
              <button className="payment-result-btn" onClick={() => navigate("/")}>
                Continue Shopping
              </button>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle size={64} className="payment-result-icon payment-result-icon--failed" />
            <h2>Payment Not Completed</h2>
            <p>Your payment could not be processed. No charges were made.</p>
            {orderId && <p className="payment-result-order">Order #{orderId}</p>}
            <div className="payment-result-actions">
              <button className="payment-result-btn payment-result-btn--primary" onClick={() => navigate("/checkout")}>
                Try Again
              </button>
              <button className="payment-result-btn" onClick={() => navigate("/")}>
                Back to Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
