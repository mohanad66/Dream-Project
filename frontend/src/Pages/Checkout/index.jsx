// src/Pages/Checkout/index.jsx

import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../../Components/CheckoutForm';
import './css/style.scss';
import { useNavigate } from 'react-router-dom';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function CheckoutPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [cartItems, setCartItems] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        // Load cart items from localStorage
        const items = JSON.parse(localStorage.getItem('cart')) || [];
        
        // Ensure all items have quantity
        const itemsWithQuantity = items.map(item => ({
            ...item,
            quantity: item.quantity || 1
        }));
        
        setCartItems(itemsWithQuantity);

        // If cart is empty, redirect to cart page
        if (items.length === 0) {
            navigate('/cart');
            return;
        }

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, [navigate]);

    // Calculate totals
    const subtotal = cartItems.reduce((total, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = item.quantity || 1;
        return total + (price * quantity);
    }, 0);

    const totalItems = cartItems.reduce((total, item) => total + (item.quantity || 1), 0);

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="checkout-page-container">
            <div className="checkout-wrapper">
                <h1>Complete Your Purchase</h1>
                
                <div className="checkout-content">
                    {/* Order Summary Section */}
                    <div className="order-summary-section">
                        <h2>Order Summary</h2>
                        <div className="order-items">
                            {cartItems.map(item => (
                                <div key={item.id} className="order-item">
                                    <img
                                        src={`${import.meta.env.VITE_API_URL}${item.image}`}
                                        alt={item.name}
                                        className="order-item-image"
                                    />
                                    <div className="order-item-details">
                                        <h3>{item.name}</h3>
                                        <p className="order-item-price">
                                            {parseFloat(item.price).toFixed(2)} L.E × {item.quantity}
                                        </p>
                                        <p className="order-item-subtotal">
                                            {((parseFloat(item.price) || 0) * (item.quantity || 1)).toFixed(2)} L.E
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="order-totals">
                            <div className="total-line">
                                <span>Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})</span>
                                <span>{subtotal.toFixed(2)} L.E</span>
                            </div>
                            <div className="total-line">
                                <span>Shipping</span>
                                <span>FREE</span>
                            </div>
                            <div className="total-line total-final">
                                <span>Total</span>
                                <span>{subtotal.toFixed(2)} L.E</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Form Section */}
                    <div className="payment-section">
                        <h2>Payment Details</h2>
                        <Elements stripe={stripePromise}>
                            <CheckoutForm 
                                cartItems={cartItems}
                                totalAmount={subtotal}
                                totalItems={totalItems}
                            />
                        </Elements>
                    </div>
                </div>
            </div>
        </div>
    );
}