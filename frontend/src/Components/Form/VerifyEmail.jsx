// src/Components/VerifyEmail/VerifyEmail.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function VerifyEmail() {
    const navigate = useNavigate();
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const userId = sessionStorage.getItem("pending_user_id");

    useEffect(() => {
        if (!userId) navigate("/register");
    }, [userId, navigate]);

    useEffect(() => {
        if (resendCooldown === 0) return;
        const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await api.post("/api/otp/verify/", {
                user_id: userId,
                otp_code: otp,
            });
            sessionStorage.removeItem("pending_user_id");
            setSuccess("Email verified! Redirecting to login...");
            setTimeout(() => navigate("/login"), 2000);
        } catch (err) {
            setError(err.response?.data?.error || "Invalid or expired code");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError("");
        setSuccess("");
        try {
            await api.post("/api/otp/resend/", { user_id: userId });
            setSuccess("New code sent! Check your email.");
            setResendCooldown(60); 
        } catch (err) {
            setError(err.response?.data?.error || "Failed to resend");
        }
    };

    return (
        <div className="form-wrapper">
            <form onSubmit={handleVerify} className="form-container">
                <h1>Verify Email</h1>
                <p style={{ color: "#666", textAlign: "center" }}>
                    Enter the 6-digit code sent to your email.
                </p>

                {error && <div className="error">{error}</div>}
                {success && <div className="success">{success}</div>}

                <div className="form-inputs">
                    <input
                        className="form-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                        style={{ letterSpacing: "0.5rem", textAlign: "center", fontSize: "1.4rem" }}
                        disabled={loading}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="form-button"
                    disabled={loading || otp.length < 6}
                    aria-busy={loading}
                >
                    {loading ? "Verifying..." : "Verify"}
                </button>

                <div className="form-footer">
                    <p className="form-link">
                        Didn't get a code?{" "}
                        <span
                            onClick={resendCooldown === 0 ? handleResend : undefined}
                            style={{
                                cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
                                color: resendCooldown > 0 ? "#aaa" : undefined,
                            }}
                        >
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                        </span>
                    </p>
                </div>
            </form>
        </div>
    );
}