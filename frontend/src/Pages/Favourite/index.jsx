import React, { useState, useEffect } from 'react';
import "./css/style.css";
import Card from '../../Components/Card';

const FavoritesPage = ({ categories }) => {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load favorites from localStorage on component mount
    useEffect(() => {
        try {
            const savedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
            
            // Filter out any invalid or undefined cards
            const validFavorites = savedFavorites.filter(card => 
                card && 
                typeof card === 'object' && 
                card.id && 
                card.name && 
                card.image
            );
            
            setFavorites(validFavorites);
        } catch (error) {
            console.error("Error loading favorites:", error);
            setFavorites([]);
        } finally {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return <div>Loading favorites...</div>;
    }

    return (
        <div className="favorites-page">
            <h1>Your Favorites</h1>
            {favorites.length === 0 ? (
                <p>You haven't added any favorites yet.</p>
            ) : (
                <div className="cards-container">
                    {favorites.map(card => {
                        // Ensure each card has all required properties with fallbacks
                        const safeCard = {
                            id: card.id || 'no-id',
                            name: card.name || 'Unnamed Product',
                            price: card.price || 'N/A',
                            description: card.description || '',
                            image: card.image || '',
                            category: card.category || null
                        };
                        
                        return (
                            <Card
                                key={safeCard.id} 
                                card={safeCard} 
                                categories={categories} 
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FavoritesPage;