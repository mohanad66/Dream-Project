// src/Pages/Checkout/index.jsx

import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../../Components/CheckoutForm'; // We'll create this next
import './css/style.scss';

// Load your Stripe public key from environment variables
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function CheckoutPage() {
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        // Simulate loading time or wait for data to be ready
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500); // Adjust timing as needed

        // Cleanup timer on component unmount
        return () => clearTimeout(timer);
    }, [stripePromise]);
    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner">
                </div>
            </div>
        );
    }
    return (
        <div className="checkout-page-container">
            <div className="checkout-wrapper">
                <h1>Complete Your Purchase</h1>
                <Elements stripe={stripePromise}>
                    <CheckoutForm />
                </Elements>
            </div>
        </div>
    );
}
