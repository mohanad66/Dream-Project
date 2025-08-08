// src/Components/Form/Form.jsx
import { Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../../services/api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../../services/constants.js";
import "./css/styles.scss";

export default function Form({ route, method, onLogin, successRedirect }) {
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        ...(method === "register" && {
            email: "",
            first_name: "",
            last_name: ""
        })
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState("");
    const navigate = useNavigate();
    const isLogin = method === "login";
    const formTitle = isLogin ? "Login" : "Register";

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setError(null);

        try {
            const payload = {
                username: formData.username.trim(),
                password: formData.password,
            };

            if (isLogin) {
                delete api.defaults.headers.common["Authorization"];
                localStorage.removeItem(ACCESS_TOKEN);
                localStorage.removeItem(REFRESH_TOKEN);

                const response = await api.post("/api/token/", payload, {
                    skipAuthRefresh: true
                });

                localStorage.setItem(ACCESS_TOKEN, response.data.access);
                localStorage.setItem(REFRESH_TOKEN, response.data.refresh);
                api.defaults.headers.common["Authorization"] = `Bearer ${response.data.access}`;

                const userResponse = await api.get("/api/user/myuser/", {
                    skipAuthRefresh: true
                });

                onLogin(userResponse.data);

                if (successRedirect) {
                    navigate(successRedirect);
                }
            } else {
                if (!formData.email) {
                    throw new Error("Email is required");
                }
                payload.email = formData.email.trim();
                payload.first_name = formData.first_name.trim();
                payload.last_name = formData.last_name.trim();

                await api.post("/api/user/register/", payload);

                setRegisteredEmail(payload.email);
                setRegistrationSuccess(true);

                setFormData({
                    username: "", password: "", email: "", first_name: "", last_name: ""
                });
            }
        } catch (error) {
            console.error("Authentication error:", error);
            let errorMessage;

            if (error.response?.data) {
                const data = error.response.data;
                if (typeof data === "string") {
                    errorMessage = data;
                } else if (data.detail) {
                    errorMessage = data.detail;
                } else if (data.error) {
                    errorMessage = data.error;
                } else {
                    const fieldErrors = [];
                    Object.keys(data).forEach(field => {
                        if (Array.isArray(data[field])) {
                            fieldErrors.push(`${field.charAt(0).toUpperCase() + field.slice(1)}: ${data[field].join(", ")}`);
                        } else {
                            fieldErrors.push(`${field}: ${data[field]}`);
                        }
                    });
                    errorMessage = fieldErrors.length > 0
                        ? fieldErrors.join("\n")
                        : "Authentication failed";
                }
            } else {
                errorMessage = error.message || "An unexpected network error occurred.";
            }

            setError(errorMessage);

            if (isLogin) {
                localStorage.removeItem(ACCESS_TOKEN);
                localStorage.removeItem(REFRESH_TOKEN);
                delete api.defaults.headers.common["Authorization"];
            }
        } finally {
            setLoading(false);
        }
    };

    if (registrationSuccess) {

        return (
           <Navigate to="/login" replace/>
        );
    }

    return (
        <div className="form-wrapper">
            <form onSubmit={handleSubmit} className="form-container">
                <h1>{formTitle}</h1>

                {error && (
                    <div className="error-message" style={{ whiteSpace: "pre-line" }}>
                        {error}
                    </div>
                )}

                <div className="form-inputs">
                    <input
                        type="text"
                        name="username"
                        className="form-input"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Username"
                        disabled={loading}
                        required
                        autoComplete="username"
                    />

                    {!isLogin && (
                        <>
                            <div className="name-fields">
                                <input
                                    type="text"
                                    name="first_name"
                                    placeholder="First Name"
                                    className="form-input"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    required
                                    autoComplete="given-name"
                                />
                                <input
                                    type="text"
                                    name="last_name"
                                    placeholder="Last Name"
                                    className="form-input"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    required
                                    autoComplete="family-name"
                                />
                            </div>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                placeholder="Email"
                                onChange={handleChange}
                                className="form-input"
                                required
                                autoComplete="email"
                            />
                        </>
                    )}

                    <input
                        type="password"
                        name="password"
                        className="form-input"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Password"
                        disabled={loading}
                        minLength={8}
                        required
                        autoComplete={isLogin ? "current-password" : "new-password"}
                    />

                </div>
                <button
                    type="submit"
                    className="form-button"
                    disabled={loading}
                    aria-busy={loading}
                >
                    {loading ? (
                        <span className="loading-indicator">Processing...</span>
                    ) : (
                        formTitle
                    )}
                </button>

                <div className="form-footer">
                    {isLogin ? (
                        <>
                            <p className="form-link">
                                Don't have an account?{' '}
                                <span onClick={() => navigate('/register')}>Register</span>
                            </p>
                            <p className="form-link">
                                Forgot password?{' '}
                                <span onClick={() => navigate('/reset-password')}>Reset it</span>
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="form-link">
                                Already have an account?{' '}
                                <span onClick={() => navigate('/login')}>Login</span>
                            </p>
                            <p className="terms-notice">
                                By registering, you agree to our Terms of Service and Privacy Policy
                            </p>
                        </>
                    )}
                </div>
            </form>
        </div>
    );
}