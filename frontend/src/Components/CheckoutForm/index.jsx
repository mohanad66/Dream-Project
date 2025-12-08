// src/Components/CheckoutForm/index.jsx - UPDATED FOR EGP WITH QUANTITY

import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../services/api';
import './css/style.scss';

export default function CheckoutForm({ cartItems: propCartItems, totalAmount: propTotal, totalItems: propTotalItems }) {
    const stripe = useStripe();
    const elements = useElements();

    const [email, setEmail] = useState('');
    const [cartItems, setCartItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [succeeded, setSucceeded] = useState(false);

    // Load cart from localStorage or use props
    useEffect(() => {
        if (propCartItems && propTotal !== undefined) {
            // Use props if available
            setCartItems(propCartItems);
            setTotal(propTotal);
            setTotalItems(propTotalItems || 0);
        } else {
            // Fallback to localStorage
            const items = JSON.parse(localStorage.getItem('cart')) || [];
            const itemsWithQuantity = items.map(item => ({
                ...item,
                quantity: item.quantity || 1
            }));
            setCartItems(itemsWithQuantity);
            
            const cartTotal = itemsWithQuantity.reduce((sum, item) => {
                const price = parseFloat(item.price) || 0;
                const quantity = item.quantity || 1;
                return sum + (price * quantity);
            }, 0);
            
            const itemCount = itemsWithQuantity.reduce((sum, item) => sum + (item.quantity || 1), 0);
            
            setTotal(cartTotal);
            setTotalItems(itemCount);
        }
    }, [propCartItems, propTotal, propTotalItems]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!stripe || !elements || total === 0) {
            return;
        }

        setProcessing(true);

        try {
            // Prepare order items with quantities for backend
            const orderItems = cartItems.map(item => ({
                id: item.id,
                name: item.name,
                price: parseFloat(item.price),
                quantity: item.quantity || 1,
                subtotal: (parseFloat(item.price) || 0) * (item.quantity || 1)
            }));

            const response = await api.post('/api/payments/create-intent/', {
                amount: Math.round(total * 100), // Convert to cents
                currency: 'egp',
                user_email: email,
                order_items: orderItems, // Send items with quantities
                total_items: totalItems
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
            const errorMessage = err.response?.data?.error ||
                (err.response ? `Server error: ${err.response.status}` : err.message);
            setError(`Payment error: ${errorMessage}`);
            setProcessing(false);
        }
    };

    // Redirect to home after 2 seconds if payment succeeded or cart is empty
    useEffect(() => {
        if (succeeded || (cartItems.length === 0 && !succeeded)) {
            const timer = setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [succeeded, cartItems.length]);

    if (succeeded) {
        return (
            <div className="payment-success">
                <h2>Payment Successful!</h2>
                <p>Thank you for your purchase. A confirmation has been sent to your email.</p>
                <p className="order-details">
                    Total items: {totalItems} | Total paid: {total.toFixed(2)} EGP
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

    return (
        <form id="payment-form" onSubmit={handleSubmit}>
            <div className="order-summary">
                <h3>Order Summary ({totalItems} item{totalItems !== 1 ? 's' : ''})</h3>
                {cartItems.map(item => (
                    <div key={item.id} className="summary-item">
                        <div className="item-info">
                            <span className="item-name">{item.name}</span>
                            <span className="item-quantity">× {item.quantity || 1}</span>
                        </div>
                        <span className="item-price">
                            {((parseFloat(item.price) || 0) * (item.quantity || 1)).toFixed(2)} EGP
                        </span>
                    </div>
                ))}
                <div className="summary-total">
                    <span>Total</span>
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