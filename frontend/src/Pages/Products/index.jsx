import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import "./css/style.scss";
import Card from '../../Components/Card';
import api from '../../services/api';

export default function Products({ categories = [], products = [], tags = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [visibleProductsCount, setVisibleProductsCount] = useState(10);
  const productsPerPage = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [categories, products]);

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

  // Get actual price range
  const actualPriceRange = useMemo(() => {
    if (processedProducts.length === 0) return { min: 0, max: 1000 };
    const prices = processedProducts.map(p => p.price).filter(p => p > 0);
    return {
      min: 0,
      max: prices.length ? Math.ceil(Math.max(...prices)) : 1000
    };
  }, [processedProducts]);

  // Reset price range if no query params
  useEffect(() => {
    if (!queryParams.get('minPrice') && !queryParams.get('maxPrice')) {
      setPriceRange({
        min: actualPriceRange.min,
        max: actualPriceRange.max
      });
    }
  }, [actualPriceRange]);

  // Update URL params
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

  // Handle price change
  const handlePriceChange = (e, type) => {
    const value = parseInt(e.target.value) || 0;
    setPriceRange(prev => ({
      ...prev,
      [type === 'min' ? 'min' : 'max']: type === 'min'
        ? Math.min(Math.max(value, actualPriceRange.min), prev.max - 1)
        : Math.max(Math.min(value, actualPriceRange.max), prev.min + 1)
    }));
  };

  // Filter products based on criteria
  const filteredProducts = useMemo(() => {
    return processedProducts.filter(product => {
      // Search filter
      const matchesSearch = searchTerm === '' ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const matchesCategory = selectedCategory === 'all' ||
        (selectedCategory === 'uncategorized' && product.category === null) ||
        product.category === parseInt(selectedCategory);

      // Price filter
      const matchesPrice = product.price >= priceRange.min && product.price <= priceRange.max;

      // Tags filter
      const matchesTags = selectedTags.length === 0 ||
        (product.tags && selectedTags.some(tagId =>
          product.tags.some(productTag => productTag.id === tagId || productTag === tagId)
        ));

      return matchesSearch && matchesCategory && matchesPrice && matchesTags;
    });
  }, [processedProducts, searchTerm, selectedCategory, priceRange, selectedTags]);

  // Get visible products based on pagination
  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleProductsCount);
  }, [filteredProducts, visibleProductsCount]);

  // Reset visible products count when filters change
  useEffect(() => {
    setVisibleProductsCount(productsPerPage);
  }, [searchTerm, selectedCategory, priceRange, selectedTags]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    
    // If we're near the bottom (within 100px) and there are more products to load
    if (scrollTop + clientHeight >= scrollHeight - 100 && 
        visibleProducts.length < filteredProducts.length && 
        !isLoadingMore) {
      
      setIsLoadingMore(true);
      
      // Simulate loading delay for better UX
      setTimeout(() => {
        setVisibleProductsCount(prev => Math.min(prev + productsPerPage, filteredProducts.length));
        setIsLoadingMore(false);
      }, 500);
    }
  }, [visibleProducts.length, filteredProducts.length, isLoadingMore]);

  // Add scroll event listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Handle tag toggle
  const handleTagToggle = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setPriceRange(actualPriceRange);
    setSelectedTags([]);
    setVisibleProductsCount(productsPerPage);
  };

  // Get available categories
  const availableCategories = useMemo(() => {
    return categories.filter(cat => cat.is_active !== false);
  }, [categories]);

  // Check for uncategorized products
  const hasUncategorizedProducts = processedProducts.some(p => p.category === null);

  // Loading state
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

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

        {/* Tags Filter */}
        <div className="tags-filter">
          <label>Filter by Tags</label>
          <div className="tags-list">
            {tags.length > 0 ? (
              tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-filter-btn ${selectedTags.includes(tag.id) ? 'active' : ''}`}
                  onClick={() => handleTagToggle(tag.id)}
                >
                  {tag.name}
                  {selectedTags.includes(tag.id) && <span className="tag-check">✓</span>}
                </button>
              ))
            ) : (
              <p className="no-tags">No tags available</p>
            )}
          </div>
          {selectedTags.length > 0 && (
            <p className="selected-tags-count">
              {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} selected
            </p>
          )}
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
        {visibleProducts.length > 0 ? (
          visibleProducts.map(product => (
            <Card key={product.id} card={product} categories={categories} tags={tags} />
          ))
        ) : filteredProducts.length !== processedProducts.length ? (
          <div className="no-products">
            <h3>No products found</h3>
            <p>Try adjusting your filters or search terms.</p>
            <button onClick={resetFilters}>Reset All Filters</button>
          </div>
        ) : (
          <div className='empty'>
            <h2>There aren't any Products</h2>
          </div>
        )}
      </div>

      {/* Loading More Indicator */}
      {isLoadingMore && (
        <div className="loading-more">
          <div className="loading-spinner"></div>
          <p>Loading more products...</p>
        </div>
      )}

      {/* Show "Load More" button as alternative to infinite scroll */}
      {visibleProducts.length < filteredProducts.length && !isLoadingMore && (
        <div className="load-more-container">
          <button 
            className="load-more-btn" 
            onClick={() => setVisibleProductsCount(prev => Math.min(prev + productsPerPage, filteredProducts.length))}
          >
            Load More ({filteredProducts.length - visibleProducts.length} remaining)
          </button>
          <p className="showing-count">
            Showing {visibleProducts.length} of {filteredProducts.length} products
          </p>
        </div>
      )}

      {/* End of products message */}
      {visibleProducts.length === filteredProducts.length && filteredProducts.length > 0 && (
        <div className="end-of-products">
          <p>You've reached the end! Showing all {filteredProducts.length} products.</p>
        </div>
      )}
    </div>
  );
}
