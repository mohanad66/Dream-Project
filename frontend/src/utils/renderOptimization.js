/**
 * React Rendering Performance Optimization Utilities
 * These hooks and components help reduce render delays and improve interactivity
 */

import React, { useMemo, useCallback, memo } from 'react';

/**
 * Memoized list component for rendering large lists efficiently
 * Prevents unnecessary re-renders of list items
 */
export const MemoizedList = memo(({ items, renderItem, keyExtractor }) => {
    return (
        <div>
            {items.map((item, index) => (
                <div key={keyExtractor ? keyExtractor(item) : index}>
                    {renderItem(item)}
                </div>
            ))}
        </div>
    );
});

MemoizedList.displayName = 'MemoizedList';

/**
 * Defer non-critical rendering until after the browser is idle
 * Useful for rendering lists, modals, etc.
 */
export function useDeferredValue(value) {
    const [deferredValue, setDeferredValue] = React.useState(value);

    React.useEffect(() => {
        const timeoutId = requestIdleCallback(() => {
            setDeferredValue(value);
        });

        return () => cancelIdleCallback(timeoutId);
    }, [value]);

    return deferredValue;
}

/**
 * Debounce hook for expensive operations (filtering, searching, etc.)
 * Reduces render calls by delaying expensive computations
 */
export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = React.useState(value);

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Throttle hook for frequent operations (scroll, resize, etc.)
 * Prevents excessive re-renders during high-frequency events
 */
export function useThrottle(value, interval = 500) {
    const [throttledValue, setThrottledValue] = React.useState(value);
    const lastUpdated = React.useRef(Date.now());

    React.useEffect(() => {
        const now = Date.now();

        if (now >= lastUpdated.current + interval) {
            lastUpdated.current = now;
            setThrottledValue(value);
        } else {
            const timeout = setTimeout(() => {
                lastUpdated.current = Date.now();
                setThrottledValue(value);
            }, interval - (now - lastUpdated.current));

            return () => clearTimeout(timeout);
        }
    }, [value, interval]);

    return throttledValue;
}

/**
 * Memoized product card component
 * Prevents re-renders when parent re-renders but data hasn't changed
 */
export const ProductCard = memo(({ product, onAddCart }) => {
    return (
        <div className="product-card">
            <img src={product.image} alt={product.name} loading="lazy" />
            <h3>{product.name}</h3>
            <p>${product.price}</p>
            <button onClick={() => onAddCart(product)}>Add to Cart</button>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison: re-render only if product or callback changes
    return prevProps.product.id === nextProps.product.id &&
        prevProps.onAddCart === nextProps.onAddCart;
});

ProductCard.displayName = 'ProductCard';

/**
 * Lazy image component with blur-up effect
 * Defers image loading and prevents layout shift
 */
export const LazyImage = memo(({ src, alt, placeholder, width, height }) => {
    const [imageSrc, setImageSrc] = React.useState(placeholder);
    const [imageRef, setImageRef] = React.useState(null);

    React.useEffect(() => {
        let observer;
        const img = imageRef;

        if (img && imageSrc === placeholder) {
            observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        const fullSizeImg = new Image();
                        fullSizeImg.src = src;
                        fullSizeImg.onload = () => {
                            setImageSrc(src);
                        };
                        observer.unobserve(img);
                    }
                },
                { rootMargin: '200px' } // Start loading 200px before entering viewport
            );

            observer.observe(img);
        }

        return () => observer?.disconnect();
    }, [src, placeholder, imageRef]);

    return (
        <img
            ref={setImageRef}
            src={imageSrc}
            alt={alt}
            width={width}
            height={height}
            style={{
                transition: 'filter 0.3s ease-in-out',
                filter: imageSrc === placeholder ? 'blur(20px)' : 'blur(0px)',
            }}
        />
    );
});

LazyImage.displayName = 'LazyImage';

/**
 * Performance monitoring hook
 * Logs render times to help identify performance bottlenecks
 */
export function useRenderTime(componentName) {
    React.useEffect(() => {
        const startTime = performance.now();

        return () => {
            const endTime = performance.now();
            console.log(`${componentName} rendered in ${(endTime - startTime).toFixed(2)}ms`);
        };
    });
}

/**
 * Batch state updates to prevent multiple re-renders
 * Useful in event handlers that update multiple state variables
 */
export function useBatchState(initialState) {
    const [state, setState] = React.useState(initialState);

    const batchUpdate = useCallback((updates) => {
        setState((prev) => ({ ...prev, ...updates }));
    }, []);

    return [state, batchUpdate];
}
