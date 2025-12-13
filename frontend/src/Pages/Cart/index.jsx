// src/Pages/Cart/index.jsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './css/style.scss';
import { FaTrash, FaPlus, FaMinus } from 'react-icons/fa';

export default function Cart() {
    const [cartItems, setCartItems] = useState([]);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    // Load cart items from localStorage when the component mounts
    useEffect(() => {
        const items = JSON.parse(localStorage.getItem('cart')) || [];
        // Ensure all items have a quantity property
        const itemsWithQuantity = items.map(item => ({
            ...item,
            quantity: item.quantity || 1
        }));
        setCartItems(itemsWithQuantity);
    }, []);

    // Function to update quantity
    const handleQuantityChange = (productId, change) => {
        const updatedCart = cartItems.map(item => {
            if (item.id === productId) {
                const newQuantity = (item.quantity || 1) + change;
                // Ensure quantity stays between 1 and 99
                if (newQuantity >= 1 && newQuantity <= 99) {
                    return { ...item, quantity: newQuantity };
                }
            }
            return item;
        });
        setCartItems(updatedCart);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
    };

    // Function to update quantity directly from input
    const handleQuantityInput = (productId, value) => {
        const numValue = parseInt(value) || 1;
        if (numValue >= 1 && numValue <= 99) {
            const updatedCart = cartItems.map(item =>
                item.id === productId ? { ...item, quantity: numValue } : item
            );
            setCartItems(updatedCart);
            localStorage.setItem('cart', JSON.stringify(updatedCart));
        }
    };

    // Function to remove an item from the cart
    const handleRemoveItem = (productId) => {
        const updatedCart = cartItems.filter(item => item.id !== productId);
        setCartItems(updatedCart);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
    };

    // Function to clear the entire cart
    const handleClearCart = () => {
        setCartItems([]);
        localStorage.removeItem('cart');
    };

    // Calculate the total price with quantities
    const subtotal = cartItems.reduce((total, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = item.quantity || 1;
        return total + (price * quantity);
    }, 0);

    // Calculate total number of items
    const totalItems = cartItems.reduce((total, item) => total + (item.quantity || 1), 0);

    const handleCheckout = () => {
        navigate('/checkout');
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="cart-page-container">
            <h1>Your Shopping Cart</h1>
            {totalItems > 0 && (
                <p className="cart-item-count">{totalItems} item{totalItems !== 1 ? 's' : ''} in cart</p>
            )}

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
                                    src={`${import.meta.env.VITE_API_URL}0${item.image}`}
                                    alt={item.name}
                                    className="item-image"
                                />
                                <div className="item-details">
                                    <h3 className="item-name">{item.name}</h3>
                                    <p className="item-price">{parseFloat(item.price).toFixed(2)} L.E</p>

                                    <div className="quantity-control">
                                        <button
                                            className="quantity-btn"
                                            onClick={() => handleQuantityChange(item.id, -1)}
                                            disabled={(item.quantity || 1) <= 1}
                                        >
                                            <FaMinus />
                                        </button>
                                        <input
                                            type="number"
                                            className="quantity-input"
                                            value={item.quantity || 1}
                                            onChange={(e) => handleQuantityInput(item.id, e.target.value)}
                                            min="1"
                                            max="99"
                                        />
                                        <button
                                            className="quantity-btn"
                                            onClick={() => handleQuantityChange(item.id, 1)}
                                            disabled={(item.quantity || 1) >= 99}
                                        >
                                            <FaPlus />
                                        </button>
                                    </div>

                                    <p className="item-subtotal">
                                        Subtotal: {((parseFloat(item.price) || 0) * (item.quantity || 1)).toFixed(2)} L.E
                                    </p>
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
                            <span>Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})</span>
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