import React, { useState, useEffect } from 'react';
import "./css/style.scss";
import whatsappLogo from "../../imgs/whatsapp.png";
import useFancybox from '../Fancy Box';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

export default function Card({ card, categories }) {
    const [showPopup, setShowPopup] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);

    // Check if this card is in favorites when component mounts
    useEffect(() => {
        const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        setIsFavorite(favorites.some(fav => fav.id === card.id));
    }, [card.id]);

    const toggleFavorite = () => {
        const favorites = JSON.parse(localStorage.getItem('favorites')) || [];

        if (isFavorite) {
            // Remove from favorites
            const updatedFavorites = favorites.filter(fav => fav.id !== card.id);
            localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
        } else {
            // Add to favorites
            const updatedFavorites = [...favorites, card];
            localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
        }

        setIsFavorite(!isFavorite);
    };

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

    // Safely handle description text
    const getDescriptionPreview = () => {
        if (!card.description) return ''; // Return empty string if description is undefined/null
        return card.description.length >= 50
            ? `${card.description.substring(0, 50)}...`
            : card.description;
    };
    return (
        <>
            <div className="card">
                <button
                    className="favorite-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite();
                    }}
                >
                    {isFavorite ? <FaHeart color="red" /> : <FaRegHeart />}
                </button>

                <img className='card-image' src={`http://127.0.0.1:8000${card.image}`} alt="" onClick={() => setShowPopup(true)} />
                <h2>{card.name}</h2>
                <span className="price">{card.price} L.E</span>
                <p className='card-content'>{getDescriptionPreview()}</p>
                <a className='whatsapp-btn' href={`https://wa.me/201011608722?text=${encodeURIComponent(" The Product Name : " + card.name + " The Product Price " + card.price)}`} target="_blank" rel="noopener noreferrer">
                    <img src={whatsappLogo} alt="Chat on WhatsApp" />
                    Chat on WhatsApp
                </a>
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
                                    Category: undefined
                                </p>}
                                <p className='popup-content'>{card.description || 'No description available'}</p>

                                <a className='whatsapp-btn bigger' href={`https://wa.me/201011608722?text=${encodeURIComponent(" The Product Name : " + card.name + " The Product Price " + card.price)}`} target="_blank" rel="noopener noreferrer">
                                    <img src={whatsappLogo} />
                                    Chat on WhatsApp
                                </a>
                            </div>
                            <div className="popup-right">
                                <div ref={fancyboxRef} className="img popup-img">
                                    <a data-fancybox={`gallery${crypto.randomUUID()}`} href={`http://127.0.0.1:8000${card.image}`}>
                                        <img src={`http://127.0.0.1:8000${card.image}`} alt="" />
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