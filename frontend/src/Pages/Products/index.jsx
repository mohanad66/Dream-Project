import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import "./css/style.scss";
import Card from '../../Components/Card';

export default function Products({ categories = [], products = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  // State management
  const [selectedCategory, setSelectedCategory] = useState(
    queryParams.get('category') || 'all'
  );
  const [searchTerm, setSearchTerm] = useState(
    queryParams.get('search') || ''
  );
  const [priceRange, setPriceRange] = useState({
    min: 0,
    max: queryParams.get('maxPrice') ? parseInt(queryParams.get('maxPrice')) : 1000
  });

  // Process products
  const processedProducts = useMemo(() => {
    return products
      .filter(product => product.is_active !== false)
      .map(product => ({
        ...product,
        price: parseFloat(product.price) || 0,
        category: product.category || null
      }));
  }, [products]);

  // Calculate price range
  const actualPriceRange = useMemo(() => {
    if (processedProducts.length === 0) return { min: 0, max: 1000 };
    const prices = processedProducts.map(p => p.price).filter(p => p > 0);
    return {
      min: 0,
      max: prices.length ? Math.ceil(Math.max(...prices)) : 1000
    };
  }, [processedProducts]);

  // Update price range when products change
  useEffect(() => {
    if (!queryParams.get('minPrice') && !queryParams.get('maxPrice')) {
      setPriceRange({
        min: actualPriceRange.min,
        max: actualPriceRange.max
      });
    }
  }, [actualPriceRange]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (priceRange.min !== actualPriceRange.min) params.set('minPrice', priceRange.min.toString());
    if (priceRange.max !== actualPriceRange.max) params.set('maxPrice', priceRange.max.toString());

    const newSearch = params.toString();
    if (newSearch !== location.search.slice(1)) {
      navigate(`?${newSearch}`, { replace: true });
    }
  }, [selectedCategory, searchTerm, priceRange, actualPriceRange, navigate, location.search]);

  // Filter products (single declaration)
  const filteredProducts = useMemo(() => {
    return processedProducts.filter(product => {
      const categoryMatch = selectedCategory === 'all' ||
        (selectedCategory === 'uncategorized' ? product.category === null :
          product.category && product.category.toString() === selectedCategory.toString());

      const searchLower = searchTerm.toLowerCase().trim();
      const searchMatch = !searchLower ||
        (product.name && product.name.toLowerCase().includes(searchLower)) ||
        (product.description && product.description.toLowerCase().includes(searchLower));

      const priceMatch = (product.price || 0) >= priceRange.min &&
        (product.price || 0) <= priceRange.max;

      return categoryMatch && searchMatch && priceMatch;
    });
  }, [processedProducts, selectedCategory, searchTerm, priceRange]);

  // Helper functions
  const handlePriceChange = (e, type) => {
    const value = parseInt(e.target.value) || 0;
    setPriceRange(prev => ({
      ...prev,
      [type === 'min' ? 'min' : 'max']: type === 'min'
        ? Math.min(Math.max(value, actualPriceRange.min), prev.max - 1)
        : Math.max(Math.min(value, actualPriceRange.max), prev.min + 1)
    }));
  };

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchTerm('');
    setPriceRange({ min: actualPriceRange.min, max: actualPriceRange.max });
  };

  // Modified to show all active categories regardless of whether they have products
  const availableCategories = useMemo(() => {
    return categories.filter(cat => cat.is_active !== false);
  }, [categories]);

  const hasUncategorizedProducts = processedProducts.some(p => p.category === null);

  return (
    <div className="products-container">
      <h1>Our Products</h1>

      <div className="filters">
        {/* Search Filter */}
        <div className="search-filter">
          <label htmlFor="search-input">Search</label>
          <input
            id="search-input"
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Filter */}
        <div className="category-filter">
          <label htmlFor="category-select">Category</label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories ({processedProducts.length})</option>
            {availableCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name} ({processedProducts.filter(p => p.category === category.id).length > 99 ? "99+" : processedProducts.filter(p => p.category === category.id).length})
              </option>
            ))}
            {hasUncategorizedProducts && (
              <option value="uncategorized">
                Uncategorized ({processedProducts.filter(p => p.category === null).length > 99 ? "99+" : processedProducts.filter(p => p.category === null).length})
              </option>
            )}
          </select>
        </div>

        {/* Price Filter */}
        <div className="price-filter">
          <label>Price Range: ${priceRange.min} - ${priceRange.max}</label>
          <div className="price-inputs">
            <input
              type="number"
              min={actualPriceRange.min}
              max={priceRange.max - 1}
              value={priceRange.min}
              onChange={(e) => handlePriceChange(e, 'min')}
              aria-label="Minimum price"
            />
            <span>to</span>
            <input
              type="number"
              min={priceRange.min + 1}
              max={actualPriceRange.max}
              value={priceRange.max}
              onChange={(e) => handlePriceChange(e, 'max')}
              aria-label="Maximum price"
            />
          </div>
          <div className="range-slider">
            <input
              type="range"
              min={actualPriceRange.min}
              max={actualPriceRange.max}
              value={priceRange.min}
              onChange={(e) => handlePriceChange(e, 'min')}
            />
            <input
              type="range"
              min={actualPriceRange.min}
              max={actualPriceRange.max}
              value={priceRange.max}
              onChange={(e) => handlePriceChange(e, 'max')}
            />
            <div className="slider-track">
              <div className="slider-range" style={{
                left: `${((priceRange.min - actualPriceRange.min) / (actualPriceRange.max - actualPriceRange.min)) * 100}%`,
                right: `${100 - ((priceRange.max - actualPriceRange.min) / (actualPriceRange.max - actualPriceRange.min)) * 100}%`
              }} />
            </div>
          </div>
        </div>

        <button className="reset-filters" onClick={resetFilters}>
          Reset All Filters
        </button>
      </div>

      {/* Product Grid */}
      <div className="products-grid">
        {filteredProducts.length > 0 && products.length > 0 ? (
          filteredProducts.map(product => (
            <Card key={product.id} card={product} categories={categories} />
          ))
        ) : filteredProducts.length != products.length ? (
          <div className="no-products">
            <h3>No products found</h3>
            <p>Try adjusting your filters or search terms.</p>
            <button onClick={resetFilters}>Reset All Filters</button>
          </div>
        ) : (<div className='empty'>
          <h2>There isn't any Products</h2>
        </div>)}
      </div>
    </div>
  );
}