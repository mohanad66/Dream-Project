/**
 * Image optimization utilities for lazy loading and responsive images
 */

/**
 * Lazy load images with Intersection Observer
 * @param {string} selector - CSS selector for images to lazy load
 */
export function initLazyLoading(selector = 'img[data-src]') {
    const images = document.querySelectorAll(selector);

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

/**
 * Generate responsive image srcset for different screen sizes
 * @param {string} imageUrl - Base image URL (from Cloudinary or similar)
 * @param {number[]} widths - Array of widths to generate
 * @returns {string} srcset attribute value
 */
export function generateSrcset(imageUrl, widths = [320, 640, 960, 1280]) {
    if (!imageUrl) return '';

    // For Cloudinary URLs, modify to add width transformation
    if (imageUrl.includes('cloudinary')) {
        return widths
            .map(width => {
                const modifiedUrl = imageUrl.replace('/upload/', `/upload/w_${width},c_limit,q_auto/`);
                return `${modifiedUrl} ${width}w`;
            })
            .join(', ');
    }

    // For regular URLs, return as-is (implement custom resizing if needed)
    return imageUrl;
}

/**
 * Preload critical images for faster initial page load
 * @param {string[]} imageUrls - Array of image URLs to preload
 */
export function preloadImages(imageUrls) {
    imageUrls.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = url;
        document.head.appendChild(link);
    });
}

/**
 * Create a lazy-loading image component wrapper
 * @param {string} src - Image source
 * @param {string} alt - Alternative text
 * @param {object} props - Additional HTML attributes
 * @returns {HTMLDivElement} Image container
 */
export function createLazyImage(src, alt, props = {}) {
    const img = document.createElement('img');
    img.dataset.src = src;
    img.alt = alt;
    img.className = 'lazy-image';

    // Add placeholder or blur
    const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
    img.src = placeholder;

    Object.entries(props).forEach(([key, value]) => {
        img.setAttribute(key, value);
    });

    return img;
}

/**
 * Monitor image loading performance
 */
export function measureImagePerformance() {
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.initiatorType === 'img') {
                    const loadTime = entry.responseEnd - entry.startTime;
                    console.log(`Image ${entry.name} loaded in ${loadTime.toFixed(2)}ms`);
                }
            }
        });

        observer.observe({ entryTypes: ['resource'] });
    }
}
