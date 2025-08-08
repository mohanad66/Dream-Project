// src/Components/Form/Form.jsx
import { useNavigate } from "react-router-dom";
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
    const navigate = useNavigate();
    const isLogin = method === "login";
    const formTitle = isLogin ? "Login" : "Register";

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value.trim() // Trim whitespace from inputs
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prevent multiple submissions
        if (loading) return;

        setLoading(true);
        setError(null);

        try {
            // Validate required fields
            if (!formData.username || !formData.password) {
                throw new Error("Username and password are required");
            }

            // Prepare clean payload
            const payload = {
                username: formData.username,
                password: formData.password
            };

            if (!isLogin) {
                payload.email = formData.email;
                payload.first_name = formData.first_name;
                payload.last_name = formData.last_name;
            }


            console.log("Making request with payload (hidden password):", {
                ...payload,
                password: "***" // Hide password in logs
            });

            if (isLogin) {
                // For login: Clear auth header and tokens BEFORE making request
                delete api.defaults.headers.common["Authorization"];
                localStorage.removeItem(ACCESS_TOKEN);
                localStorage.removeItem(REFRESH_TOKEN);

                // Make login request without any auth headers - ADD skipAuthRefresh flag
                const response = await api.post("/api/token/", payload, {
                    skipAuthRefresh: true  // ← ADDED THIS LINE
                });

                console.log("Login response received:", response.status);

                // Store new tokens
                localStorage.setItem(ACCESS_TOKEN, response.data.access);
                localStorage.setItem(REFRESH_TOKEN, response.data.refresh);

                // Set new auth header
                api.defaults.headers.common["Authorization"] = `Bearer ${response.data.access}`;

                // Verify token by fetching user data - ADD skipAuthRefresh flag
                try {
                    const userResponse = await api.get("/api/user/myuser/", {
                        skipAuthRefresh: true  // ← ADDED THIS LINE TOO
                    });
                    
                    // Add small delay to prevent race conditions
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    onLogin(userResponse.data);

                    // Clear form data on successful login
                    setFormData({
                        username: "",
                        password: "",
                        ...(method === "register" && {
                            email: "",
                            first_name: "",
                            last_name: ""
                        })
                    });

                    if (successRedirect) {
                        navigate(successRedirect);
                    }
                } catch (verifyError) {
                    console.error("Token verification failed:", verifyError);
                    // Clear tokens if verification fails
                    localStorage.removeItem(ACCESS_TOKEN);
                    localStorage.removeItem(REFRESH_TOKEN);
                    delete api.defaults.headers.common["Authorization"];
                    throw new Error("Session verification failed after login");
                }
            } else {
                // For registration
                const response = await api.post("/api/user/register/", payload);
                console.log("Registration successful");

                // Clear form data
                setFormData({
                    username: "",
                    password: "",
                    email: "",
                    first_name: "",
                    last_name: ""
                });

                // Redirect to login with success state
                navigate("/login", {
                    state: {
                        registrationSuccess: true,
                        username: formData.username
                    }
                });
            }
        } catch (error) {
            console.error("Authentication error:", error);
            console.error("Error response data:", error.response?.data);

            // Format error message
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
                    // Handle field-specific errors
                    const fieldErrors = [];
                    Object.keys(data).forEach(field => {
                        if (Array.isArray(data[field])) {
                            fieldErrors.push(`${field}: ${data[field].join(", ")}`);
                        } else {
                            fieldErrors.push(`${field}: ${data[field]}`);
                        }
                    });
                    errorMessage = fieldErrors.length > 0
                        ? fieldErrors.join("\n")
                        : "Authentication failed";
                }
            } else {
                errorMessage = error.message || "Network error occurred";
            }

            setError(errorMessage);

            // Clear tokens on login failure
            if (isLogin) {
                localStorage.removeItem(ACCESS_TOKEN);
                localStorage.removeItem(REFRESH_TOKEN);
                delete api.defaults.headers.common["Authorization"];
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="form-container">
            <h1>{formTitle}</h1>

            {error && (
                <div className="error-message" style={{ whiteSpace: "pre-line" }}>
                    {error}
                </div>
            )}

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
        </form>
    );
}