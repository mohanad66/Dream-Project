// src/Components/Card/index.jsx

import React, { useState, useEffect } from 'react';
import "./css/style.scss";
import useFancybox from '../Fancy Box';
import { FaShoppingCart, FaBolt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection

export default function Card({ card, categories }) {
    const [showPopup, setShowPopup] = useState(false);
    const [isAddedToCart, setIsAddedToCart] = useState(false); // State for cart button
    const navigate = useNavigate(); // Hook for navigation

    // --- POPUP LOGIC ---
    useEffect(() => {
        if (showPopup) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [showPopup]);

    const [fancyboxRef] = useFancybox();

    const getDescriptionPreview = () => {
        if (!card.description) return '';
        return card.description.length >= 50
            ? `${card.description.substring(0, 50)}...`
            : card.description;
    };

    // --- CART & BUY NOW LOGIC ---
    const handleAddToCart = () => {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        // Prevent duplicate entries
        if (!cart.some(item => item.id === card.id)) {
            cart.push(card);
            localStorage.setItem('cart', JSON.stringify(cart));
        }
        setIsAddedToCart(true);
        // Reset button text after 2 seconds
        setTimeout(() => setIsAddedToCart(false), 2000);
    };

    const handleBuyNow = () => {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        if (!cart.some(item => item.id === card.id)) {
            cart.push(card);
            localStorage.setItem('cart', JSON.stringify(cart));
        }
        // Redirect to a checkout page
        navigate('/checkout');
    };


    return (
        <>
            <div className="card">
                <img className='card-image' src={`http://127.0.0.1:8000${card.image}`} alt={card.name} onClick={( ) => setShowPopup(true)} />
                <h2>{card.name}</h2>
                <span className="price">{card.price} L.E</span>
                <p className='card-content'>{getDescriptionPreview()}</p>

                {/* Action Buttons */}
                <div className="card-actions">
                    <button className="add-to-cart-btn" onClick={handleAddToCart} disabled={isAddedToCart}>
                        <FaShoppingCart /> {isAddedToCart ? 'Added!' : 'Add to Cart'}
                    </button>
                    <button className="buy-now-btn" onClick={handleBuyNow}>
                        <FaBolt /> Buy Now
                    </button>
                </div>
            </div>

            {showPopup && (
                <div className="card-popup-overlay" onClick={() => setShowPopup(false)}>
                    <div className="card-popup-rectangle" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setShowPopup(false)}>×</button>
                        <div className="popup-content">
                            <div className="popup-left">
                                <h2>{card.name}</h2>
                                {card.price && <p className="card-price">Price: {card.price} L.E</p>}
                                {card.category ? (
                                    <p className="card-category">
                                        Category: {categories.find((category) => category.id === card.category)?.name}
                                    </p>
                                ) : <p className="card-category">
                                    Category: Uncategorized
                                </p>}
                                <p className='popup-content-full'>{card.description || 'No description available'}</p>

                                <div className="popup-actions">
                                     <button className="add-to-cart-btn" onClick={handleAddToCart} disabled={isAddedToCart}>
                                        <FaShoppingCart /> {isAddedToCart ? 'Added!' : 'Add to Cart'}
                                    </button>
                                    <button className="buy-now-btn" onClick={handleBuyNow}>
                                        <FaBolt /> Buy Now
                                    </button>
                                </div>
                            </div>
                            <div className="popup-right">
                                <div ref={fancyboxRef} className="img popup-img">
                                    <a data-fancybox={`gallery${crypto.randomUUID()}`} href={`http://127.0.0.1:8000${card.image}`}>
                                        <img src={`http://127.0.0.1:8000${card.image}`} alt={card.name} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
             )}
        </>
    );
}
