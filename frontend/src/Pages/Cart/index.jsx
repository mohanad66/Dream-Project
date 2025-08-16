// src/Pages/Cart/index.jsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './css/style.scss'; // We will create this file next
import { FaTrash } from 'react-icons/fa';

export default function Cart() {
    const [cartItems, setCartItems] = useState([]);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        // Simulate loading time or wait for data to be ready
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500); // Adjust timing as needed

        // Cleanup timer on component unmount
        return () => clearTimeout(timer);
    }, []);
    // Load cart items from localStorage when the component mounts
    useEffect(() => {
        const items = JSON.parse(localStorage.getItem('cart')) || [];
        setCartItems(items);
    }, []);

    // Function to remove an item from the cart
    const handleRemoveItem = (productId) => {
        const updatedCart = cartItems.filter(item => item.id !== productId);
        setCartItems(updatedCart);
        // Update localStorage
        localStorage.setItem('cart', JSON.stringify(updatedCart));
    };

    // Function to clear the entire cart
    const handleClearCart = () => {
        setCartItems([]);
        localStorage.removeItem('cart');
    };

    // Calculate the total price
    const subtotal = cartItems.reduce((total, item) => {
        // Ensure price is a number, default to 0 if invalid
        const price = parseFloat(item.price) || 0;
        return total + price;
    }, 0);

    const handleCheckout = () => {
        // Here you would typically navigate to a payment page.
        // We can reuse the payment logic you already have.
        // For now, it will just navigate to a placeholder route.
        navigate('/checkout');
    };
    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner">
                </div>
            </div>
        );
    }
    return (
        <div className="cart-page-container">
            <h1>Your Shopping Cart</h1>

            {cartItems.length === 0 ? (
                <div className="empty-cart">
                    <h2>Your cart is empty.</h2>
                    <p>Looks like you haven't added any products yet.</p>
                    <Link to="/products" className="browse-products-btn">
                        Browse Products
                    </Link>
                </div>
            ) : (
                <div className="cart-content">
                    <div className="cart-items-list">
                        {cartItems.map(item => (
                            <div key={item.id} className="cart-item">
                                <img
                                    src={`http://127.0.0.1:8000${item.image}`}
                                    alt={item.name}
                                    className="item-image"
                                />
                                <div className="item-details">
                                    <h3 className="item-name">{item.name}</h3>
                                    <p className="item-price">{parseFloat(item.price).toFixed(2)} L.E</p>
                                </div>
                                <button
                                    className="remove-item-btn"
                                    onClick={() => handleRemoveItem(item.id)}
                                    title="Remove item"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="cart-summary">
                        <h2>Order Summary</h2>
                        <div className="summary-line">
                            <span>Subtotal</span>
                            <span>{subtotal.toFixed(2)} L.E</span>
                        </div>
                        <div className="summary-line">
                            <span>Shipping</span>
                            <span>FREE</span>
                        </div>
                        <div className="summary-total">
                            <span>Total : </span>
                            <span>{subtotal.toFixed(2)} L.E</span>
                        </div>
                        <button className="checkout-btn" onClick={handleCheckout}>
                            Proceed to Checkout
                        </button>
                        <button className="clear-cart-btn" onClick={handleClearCart}>
                            Clear Cart
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
