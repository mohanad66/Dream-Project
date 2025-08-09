// src/Pages/Checkout/index.jsx

import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../../Components/CheckoutForm'; // We'll create this next
import './css/style.scss';

// Load your Stripe public key from environment variables
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function CheckoutPage() {
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
