import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import "./css/style.scss";
import Card from '../../Components/Card';
import { fetchAllCategories, fetchAllTags } from '../../services/auth';
import { Helmet } from 'react-helmet-async';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Products() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  const [tags, setTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(queryParams.get('category') || 'all');
  const [searchTerm, setSearchTerm] = useState(queryParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [actualPriceRange, setActualPriceRange] = useState({ min: 0, max: 1000 });
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 9;

  const debounceTimer = useRef(null);

  // Debounce search input — wait 400ms after user stops typing
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(debounceTimer.current);
  }, [searchTerm]);

  // Load tags and categories once
  useEffect(() => {
    const loadMeta = async () => {
      const [allTags, allCategories] = await Promise.all([
        fetchAllTags(`${API_URL}/api/tags/`),
        fetchAllCategories(`${API_URL}/api/categories/`)
      ]);
      setTags(allTags);
      setCategories(allCategories);
    };
    loadMeta();
  }, []);

  const fetchProducts = useCallback(async () => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage);
      params.set('page_size', productsPerPage);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
      if (priceRange.min > 0) params.set('minPrice', priceRange.min);
      if (priceRange.max < actualPriceRange.max) params.set('maxPrice', priceRange.max);

      const res = await fetch(`${API_URL}/api/products/?${params.toString()}`);
      const data = await res.json();

      setProducts(data.results || []);
      setTotalCount(data.count || 0);

      if (actualPriceRange.max === 1000 && data.results?.length > 0) {
        const prices = data.results.map(p => parseFloat(p.price));
        const maxPrice = Math.ceil(Math.max(...prices));
        setActualPriceRange({ min: 0, max: maxPrice });
        setPriceRange(prev => ({ ...prev, max: maxPrice }));
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedTags, priceRange.min, priceRange.max, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (currentPage > 1) params.set('page', currentPage);
    navigate(`?${params.toString()}`, { replace: true });
  }, [selectedCategory, debouncedSearch, currentPage]);

  const totalPages = Math.ceil(totalCount / productsPerPage);

  const handleTagToggle = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
    setCurrentPage(1);
  };

  const handlePriceChange = (e, type) => {
    const value = parseInt(e.target.value) || 0;
    setPriceRange(prev => ({
      ...prev,
      [type]: type === 'min'
        ? Math.min(Math.max(value, 0), prev.max - 1)
        : Math.max(Math.min(value, actualPriceRange.max), prev.min + 1)
    }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedCategory('all');
    setPriceRange(actualPriceRange);
    setSelectedTags([]);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const availableCategories = categories.filter(c => c.is_active !== false);

  if (isLoading) {
    return <div className="loading-container"><div className="loading-spinner"></div></div>;
  }

  return (
    <>
      <Helmet>
        <title>Products - Dream Store | Shop Quality Items Online</title>
        <meta name="description" content="Browse our wide range of products at Dream Store. Find electronics, fashion, home goods and more with advanced filtering and search." />
        <meta name="keywords" content="products, shopping, electronics, fashion, home goods, online store" />
        <link rel="canonical" href="https://dreamstore.com/products" />
        <meta property="og:title" content="Products - Dream Store | Shop Quality Items Online" />
        <meta property="og:description" content="Browse our wide range of products at Dream Store." />
        <meta property="og:url" content="https://dreamstore.com/products" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="products-container">
        <h1>Our Products</h1>

        <div className="filters">
          {/* Search — with immediate visual feedback */}
          <div className="search-filter">
            <label htmlFor="search-input">Search</label>
            <div style={{ position: 'relative' }}>
              <input
                id="search-input"
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isSearching && (
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#888' }}>
                  searching...
                </span>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div className="category-filter">
            <label htmlFor="category-select">Category</label>
            <select id="category-select" value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}>
              <option value="all">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
              <option value="uncategorized">Uncategorized</option>
            </select>
          </div>

          {/* Tags Filter */}
          <div className="tags-filter">
            <label>Filter by Tags</label>
            <div className="tags-list">
              {tags.length > 0 ? tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-filter-btn ${selectedTags.includes(tag.id) ? 'active' : ''}`}
                  onClick={() => handleTagToggle(tag.id)}
                >
                  {tag.name}
                  {selectedTags.includes(tag.id) && <span className="tag-check">✓</span>}
                </button>
              )) : <p className="no-tags">No tags available</p>}
            </div>
            {selectedTags.length > 0 && (
              <p className="selected-tags-count">{selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} selected</p>
            )}
          </div>

          {/* Price Filter */}
          <div className="price-filter">
            <label>Price Range: ${priceRange.min} - ${priceRange.max}</label>
            <div className="price-inputs">
              <input type="number" min={0} max={priceRange.max - 1} value={priceRange.min} onChange={(e) => handlePriceChange(e, 'min')} aria-label="Minimum price" />
              <span>to</span>
              <input type="number" min={priceRange.min + 1} max={actualPriceRange.max} value={priceRange.max} onChange={(e) => handlePriceChange(e, 'max')} aria-label="Maximum price" />
            </div>
            <div className="range-slider">
              <input type="range" min={0} max={actualPriceRange.max} value={priceRange.min} onChange={(e) => handlePriceChange(e, 'min')} />
              <input type="range" min={0} max={actualPriceRange.max} value={priceRange.max} onChange={(e) => handlePriceChange(e, 'max')} />
              <div className="slider-track">
                <div className="slider-range" style={{
                  left: `${(priceRange.min / actualPriceRange.max) * 100}%`,
                  right: `${100 - (priceRange.max / actualPriceRange.max) * 100}%`
                }} />
              </div>
            </div>
          </div>

          <button className="reset-filters" onClick={resetFilters}>Reset All Filters</button>
        </div>

        {/* Results Summary */}
        <div className="results-summary">
          <p>Showing {products.length} of {totalCount} products</p>
        </div>

        {/* Product Grid */}
        <div className="products-grid">
          {products.length > 0 ? (
            products.map(product => (
              <Card key={product.id} card={product} categories={categories} tags={tags} />
            ))
          ) : (
            <div className="no-products">
              <h3>No products found</h3>
              <p>Try adjusting your filters or search terms.</p>
              <button onClick={resetFilters}>Reset All Filters</button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-container">
            <div className="pagination-info">
              <span className="page-info">Page {currentPage} of {totalPages} ({totalCount} total)</span>
            </div>
            <div className="pagination-controls">
              <button className="pagination-btn prev-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
              <div className="page-numbers">
                {getPageNumbers().map((p, i) =>
                  p === '...' ? <span key={`e-${i}`} className="page-ellipsis">...</span> :
                    <button key={p} className={`page-number ${currentPage === p ? 'active' : ''}`} onClick={() => handlePageChange(p)}>{p}</button>
                )}
              </div>
              <button className="pagination-btn next-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}