// src/Components/CheckoutForm/index.jsx - UPDATED FOR EGP

import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../services/api'; // Your configured axios instance
import './css/style.scss';

export default function CheckoutForm() {
    const stripe = useStripe();
    const elements = useElements();

    const [email, setEmail] = useState('');
    const [cartItems, setCartItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [succeeded, setSucceeded] = useState(false);

    // Load cart from localStorage
    useEffect(() => {
        const items = JSON.parse(localStorage.getItem('cart')) || [];
        setCartItems(items);
        const cartTotal = items.reduce((sum, item) => sum + parseFloat(item.price), 0);
        setTotal(cartTotal);
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!stripe || !elements || total === 0) {
            return;
        }

        setProcessing(true);

        try {
            const response = await api.post('/api/payments/create-intent/', {
                amount: Math.round(total * 100),
                currency: 'egp',
                user_email: email,
            });

            const clientSecret = response.data.clientSecret;

            const payload = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement),
                    billing_details: {
                        email: email,
                    },
                },
            });

            if (payload.error) {
                setError(`Payment failed: ${payload.error.message}`);
                setProcessing(false);
            } else {
                setError(null);
                setProcessing(false);
                setSucceeded(true);
                localStorage.removeItem('cart');
            }
        } catch (err) {
            // Improved error handling to show server response details
            const errorMessage = err.response?.data?.error ||
                (err.response ? `Server error: ${err.response.status}` : err.message);
            setError(`Payment error: ${errorMessage}`);
            setProcessing(false);
        }
    };

    if (succeeded) {
        return (
            <div className="payment-success">
                <h2>Payment Successful!</h2>
                <p>Thank you for your purchase. A confirmation has been sent to your email.</p>
            </div>
        );
    }

    if (cartItems.length === 0 && !succeeded) {
        return (
            <div className="empty-checkout">
                <h2>Your cart is empty.</h2>
                <p>Add items to your cart before checking out.</p>
            </div>
        )
    }

    return (
        <form id="payment-form" onSubmit={handleSubmit}>
            <div className="order-summary">
                <h3>Order Summary</h3>
                {cartItems.map(item => (
                    <div key={item.id} className="summary-item">
                        <span>{item.name}</span>
                        {/* +++ UPDATED CURRENCY DISPLAY +++ */}
                        <span>{parseFloat(item.price).toFixed(2)} EGP</span>
                    </div>
                ))}
                <div className="summary-total">
                    <span>Total</span>
                    {/* +++ UPDATED CURRENCY DISPLAY +++ */}
                    <span>{total.toFixed(2)} EGP</span>
                </div>
            </div>

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
                <label>Card Details</label>
                <CardElement id="card-element" options={cardElementOptions} />
            </div>

            <button disabled={processing || !stripe || succeeded} id="submit-btn">
                <span id="button-text">
                    {/* +++ UPDATED CURRENCY DISPLAY +++ */}
                    {processing ? "Processing..." : `Pay ${total.toFixed(2)} EGP`}
                </span>
            </button>

            {error && <div id="payment-message" role="alert">{error}</div>}
        </form>
    );
}

// Styling options for the Stripe CardElement
const cardElementOptions = {
    style: {
        base: {
            color: "#32325d",
            fontFamily: 'Arial, sans-serif',
            fontSmoothing: "antialiased",
            fontSize: "16px",
            "::placeholder": {
                color: "#aab7c4",
            },
        },
        invalid: {
            color: "#fa755a",
            iconColor: "#fa755a",
        },
    },
};
