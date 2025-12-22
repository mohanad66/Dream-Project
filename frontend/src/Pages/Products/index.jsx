import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import "./css/style.scss";
import Card from '../../Components/Card';
import { fetchAllCategories, fetchAllTags } from '../../services/auth';

export default function Products({ products = []}) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const [tags, setTags] = useState([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [categories, setCategories] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState([]);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [showPlagiarismReport, setShowPlagiarismReport] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 9; // Changed to 8 as per your image

  const productsContainerRef = useRef(null);
  useEffect(() => {
    const loadTags = async () => {
      setIsLoadingTags(true);
      const allTags = await fetchAllTags('http://127.0.0.1:8000/api/tags/');
      setTags(allTags);
      setIsLoadingTags(false);
    };
     const loadCategories = async () => {
      const allCategories = await fetchAllCategories('http://127.0.0.1:8000/api/categories/');
      setCategories(allCategories);
    };
    
    loadTags();
    loadCategories();
  }, []);
  const processedProducts = useMemo(() => {
    return products
      .filter(product => product.is_active !== false)
      .map(product => ({
        ...product,
        price: parseFloat(product.price) || 0,
        category: product.category || null
      }));
  }, [products]);
  
  const actualPriceRange = useMemo(() => {
    if (processedProducts.length === 0) return { min: 0, max: 1000 };
    const prices = processedProducts.map(p => p.price).filter(p => p > 0);
    return {
      min: 0,
      max: prices.length ? Math.ceil(Math.max(...prices)) : 1000
    };
  }, [processedProducts]);
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  // Get current page products
  const currentProducts = useMemo(() => {
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    return filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  }, [filteredProducts, currentPage, productsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, priceRange, selectedTags]);

  // Update URL params with page
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (priceRange.min !== actualPriceRange.min) params.set('minPrice', priceRange.min.toString());
    if (priceRange.max !== actualPriceRange.max) params.set('maxPrice', priceRange.max.toString());
    if (currentPage > 1) params.set('page', currentPage.toString());

    const newSearch = params.toString();
    if (newSearch !== location.search.slice(1)) {
      navigate(`?${newSearch}`, { replace: true });
    }
  }, [selectedCategory, searchTerm, priceRange, actualPriceRange, currentPage, navigate, location.search]);

  // Read page from URL on initial load
  useEffect(() => {
    const pageFromUrl = queryParams.get('page');
    if (pageFromUrl) {
      const pageNum = parseInt(pageFromUrl);
      if (pageNum > 0) {
        setCurrentPage(pageNum);
      }
    }
  }, []);

  const detectSimilarProducts = useCallback(() => {
    if (processedProducts.length < 2) return [];

    const similar = [];
    const threshold = 0.7;

    for (let i = 0; i < processedProducts.length; i++) {
      for (let j = i + 1; j < processedProducts.length; j++) {
        const productA = processedProducts[i];
        const productB = processedProducts[j];

        const nameSimilarity = calculateSimilarity(
          productA.name.toLowerCase(),
          productB.name.toLowerCase()
        );

        const descSimilarity = calculateSimilarity(
          (productA.description || '').toLowerCase(),
          (productB.description || '').toLowerCase()
        );

        if (nameSimilarity > threshold || descSimilarity > threshold) {
          similar.push({
            product1: productA,
            product2: productB,
            nameSimilarity: (nameSimilarity * 100).toFixed(1),
            descriptionSimilarity: (descSimilarity * 100).toFixed(1),
            confidence: Math.max(nameSimilarity, descSimilarity) * 100
          });
        }
      }
    }

    return similar;
  }, [processedProducts]);

  useEffect(() => {
    if (processedProducts.length > 1) {
      const similar = detectSimilarProducts();
      setSimilarProducts(similar);
    }
  }, [processedProducts, detectSimilarProducts]);

  const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;

    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  };



  // Reset price range if no query params
  useEffect(() => {
    if (!queryParams.get('minPrice') && !queryParams.get('maxPrice')) {
      setPriceRange({
        min: actualPriceRange.min,
        max: actualPriceRange.max
      });
    }
  }, [actualPriceRange]);

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
    setCurrentPage(1);
  };

  // Get available categories
  const availableCategories = useMemo(() => {
    return categories.filter(cat => cat.is_active !== false);
  }, [categories]);

  // Check for uncategorized products
  const hasUncategorizedProducts = processedProducts.some(p => p.category === null);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Show limited pages with ellipsis
      if (currentPage <= 3) {
        // Near the beginning
        for (let i = 1; i <= 4; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pageNumbers.push(i);
      } else {
        // In the middle
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="products-container" ref={productsContainerRef}>
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

      {/* Results Summary */}
      <div className="results-summary">
        <p>
          Showing {currentProducts.length} of {filteredProducts.length} products
          {filteredProducts.length !== processedProducts.length && ' (filtered)'}
        </p>
      </div>

      {/* Product Grid */}
      <div className="products-grid">
        {currentProducts.length > 0 ? (
          currentProducts.map(product => (
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

      {/* Pagination Controls */}
      {filteredProducts.length > productsPerPage && (
        <div className="pagination-container">
          <div className="pagination-info">
            <span className="page-info">
              Page {currentPage} of {totalPages} ({filteredProducts.length} total items)
            </span>
          </div>

          <div className="pagination-controls">
            <button
              className="pagination-btn prev-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <div className="page-numbers">
              {getPageNumbers().map((pageNum, index) => (
                pageNum === '...' ? (
                  <span key={`ellipsis-${index}`} className="page-ellipsis">...</span>
                ) : (
                  <button
                    key={pageNum}
                    className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                )
              ))}
            </div>

            <button
              className="pagination-btn next-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>

          <div className="pagination-jump">
            <span>Go to page:</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  handlePageChange(page);
                }
              }}
              className="page-jump-input"
            />
            <span>of {totalPages}</span>
          </div>
        </div>
      )}

      {/* PLAGIARISM DETECTION SECTION */}
      {similarProducts.length > 0 && (
        <div className="plagiarism-detection-section">
          <div className="plagiarism-header">
            <h3>⚠️ Potential Duplicate Products Detected</h3>
            <button
              className="toggle-plagiarism-btn"
              onClick={() => setShowPlagiarismReport(!showPlagiarismReport)}
            >
              {showPlagiarismReport ? 'Hide Report' : 'Show Details'}
            </button>
          </div>

          {showPlagiarismReport && (
            <div className="plagiarism-report">
              <p className="plagiarism-summary">
                Found {similarProducts.length} potential duplicate{similarProducts.length > 1 ? 's' : ''}
                (threshold: 70% similarity)
              </p>

              <div className="similar-products-list">
                {similarProducts.map((similar, index) => (
                  <div key={index} className="similar-product-pair">
                    <div className="similarity-score">
                      <span className="score-badge">
                        {Math.max(similar.nameSimilarity, similar.descriptionSimilarity)}% match
                      </span>
                    </div>

                    <div className="product-comparison">
                      <div className="product-item">
                        <h4>{similar.product1.name}</h4>
                        <p className="product-id">ID: {similar.product1.id}</p>
                        {similar.nameSimilarity > 70 && (
                          <p className="similarity-detail">
                            <strong>Name similarity:</strong> {similar.nameSimilarity}%
                          </p>
                        )}
                        {similar.descriptionSimilarity > 70 && (
                          <p className="similarity-detail">
                            <strong>Description similarity:</strong> {similar.descriptionSimilarity}%
                          </p>
                        )}
                      </div>

                      <div className="vs-separator">vs</div>

                      <div className="product-item">
                        <h4>{similar.product2.name}</h4>
                        <p className="product-id">ID: {similar.product2.id}</p>
                        {similar.nameSimilarity > 70 && (
                          <p className="similarity-detail">
                            <strong>Name similarity:</strong> {similar.nameSimilarity}%
                          </p>
                        )}
                        {similar.descriptionSimilarity > 70 && (
                          <p className="similarity-detail">
                            <strong>Description similarity:</strong> {similar.descriptionSimilarity}%
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="plagiarism-actions">
                      <button
                        className="action-btn view-details"
                        onClick={() => {
                          console.log('Compare products:', similar.product1.id, similar.product2.id);
                        }}
                      >
                        Compare Details
                      </button>
                      <button
                        className="action-btn mark-resolved"
                        onClick={() => {
                          setSimilarProducts(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        Mark as Reviewed
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="plagiarism-footer">
                <p className="disclaimer">
                  <small>
                    Note: This is an automated detection based on text similarity.
                    Please review each case manually to confirm if products are actually duplicates.
                  </small>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}