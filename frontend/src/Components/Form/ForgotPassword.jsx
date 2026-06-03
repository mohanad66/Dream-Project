// src/Components/ForgotPassword/ForgotPassword.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);  // 1=email, 2=otp, 3=new password
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [userId, setUserId] = useState(null);
    const [resetToken, setResetToken] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Step 1 — submit email
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await api.post("/api/auth/forgot-password/", { email });
            setUserId(res.data.user_id);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    // Step 2 — verify OTP
    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await api.post("/api/auth/verify-reset-otp/", {
                user_id: userId,
                otp_code: otp,
            });
            setResetToken(res.data.reset_token);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.error || "Invalid code");
        } finally {
            setLoading(false);
        }
    };

    // Step 3 — reset password
    const handleResetSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await api.post("/api/auth/reset-password/", {
                user_id: userId,
                reset_token: resetToken,
                new_password: newPassword,
            });
            navigate("/login");
        } catch (err) {
            const data = err.response?.data;
            setError(Array.isArray(data?.error)
                ? data.error.join(", ")
                : data?.error || "Reset failed"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-wrapper">
            <div className="form-container">

                {/* Step 1 — Email */}
                {step === 1 && (
                    <form onSubmit={handleEmailSubmit}>
                        <h1>Forgot Password</h1>
                        <p style={{ color: "#666", marginBottom: "1rem" }}>
                            Enter your email and we'll send you a code.
                        </p>
                        {error && <div className="error">{error}</div>}
                        <div className="form-inputs">
                            <input
                                className="form-input"
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button className="form-button" type="submit" disabled={loading}>
                            {loading ? "Sending..." : "Send Code"}
                        </button>
                        <div className="form-footer">
                            <p className="form-link">
                                <span onClick={() => navigate("/login")}>Back to Login</span>
                            </p>
                        </div>
                    </form>
                )}

                {/* Step 2 — OTP */}
                {step === 2 && (
                    <form onSubmit={handleOtpSubmit}>
                        <h1>Enter Code</h1>
                        <p style={{ color: "#666", marginBottom: "1rem" }}>
                            Check your email for the 6-digit code.
                        </p>
                        {error && <div className="error">{error}</div>}
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
                                required
                            />
                        </div>
                        <button className="form-button" type="submit"
                            disabled={loading || otp.length < 6}>
                            {loading ? "Verifying..." : "Verify Code"}
                        </button>
                    </form>
                )}

                {/* Step 3 — New Password */}
                {step === 3 && (
                    <form onSubmit={handleResetSubmit}>
                        <h1>New Password</h1>
                        {error && <div className="error">{error}</div>}
                        <div className="form-inputs">
                            <input
                                className="form-input"
                                type="password"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                minLength={8}
                                required
                            />
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                minLength={8}
                                required
                            />
                        </div>
                        <button className="form-button" type="submit" disabled={loading}>
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </form>
                )}

            </div>
        </div>
    );
}