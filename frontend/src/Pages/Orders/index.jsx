import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './css/style.scss';

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        next: null,
        previous: null,
        count: 0
    });
    const navigate = useNavigate();

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async (url = '/api/orders/mine/') => {
        try {
            const token = localStorage.getItem('access');
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('API Response:', response.data); // Debug log

            // Handle both paginated and non-paginated responses
            let ordersData = [];
            if (response.data.results) {
                // Paginated response
                ordersData = response.data.results;
                setPagination({
                    next: response.data.next,
                    previous: response.data.previous,
                    count: response.data.count
                });
            } else if (Array.isArray(response.data)) {
                // Non-paginated response
                ordersData = response.data;
            } else {
                // Unexpected response format
                console.error('Unexpected response format:', response.data);
                ordersData = [];
            }

            setOrders(ordersData);
            setIsLoading(false);
        } catch (err) {
            console.error('Error fetching orders:', err);
            if (err.response?.status === 401) {
                setError('Session expired. Please login again.');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                setError(err.response?.data?.error || 'Failed to load orders. Please try again.');
            }
            setIsLoading(false);
        }
    };

    const getStatusBadgeClass = (status) => {
        if (!status) return 'status-pending';
        switch (status.toLowerCase()) {
            case 'confirmed':
                return 'status-confirmed';
            case 'pending':
                return 'status-pending';
            case 'cancelled':
                return 'status-cancelled';
            case 'delivered':
                return 'status-delivered';
            default:
                return 'status-pending';
        }
    };

    const getStatusText = (status) => {
        if (!status) return 'Processing';
        switch (status.toLowerCase()) {
            case 'confirmed':
                return 'Confirmed';
            case 'pending':
                return 'Processing';
            case 'cancelled':
                return 'Cancelled';
            case 'delivered':
                return 'Delivered';
            default:
                return status;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid date';
        }
    };

    const loadMoreOrders = () => {
        if (pagination.next) {
            fetchOrders(pagination.next);
        }
    };

    const loadPreviousOrders = () => {
        if (pagination.previous) {
            fetchOrders(pagination.previous);
        }
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <p>{error}</p>
                <button onClick={() => fetchOrders()} className="retry-btn">Retry</button>
            </div>
        );
    }

    return (
        <div className="orders-page-container">
            <div className="orders-wrapper">
                <h1>My Orders</h1>
                
                {orders.length === 0 ? (
                    <div className="no-orders">
                        <p>You haven't placed any orders yet.</p>
                        <button onClick={() => navigate('/products')} className="shop-now-btn">
                            Start Shopping
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="orders-list">
                            {orders.map((order) => (
                                <div key={order.id} className="order-card">
                                    <div className="order-header">
                                        <div className="order-info">
                                            <span className="order-number">Order #{order.id}</span>
                                            <span className="order-date">{formatDate(order.created_at)}</span>
                                        </div>
                                        <div className={`order-status ${getStatusBadgeClass(order.status)}`}>
                                            {getStatusText(order.status)}
                                        </div>
                                    </div>

                                    <div className="order-items">
                                        {order.items && order.items.length > 0 ? (
                                            order.items.map((item) => (
                                                <div key={item.id} className="order-item">
                                                    <img
                                                        src={item.product?.image || '/placeholder-image.jpg'}
                                                        alt={item.product?.name || 'Product'}
                                                        className="order-item-image"
                                                        onError={(e) => {
                                                            e.target.src = '/placeholder-image.jpg';
                                                        }}
                                                    />
                                                    <div className="order-item-details">
                                                        <h4>{item.product?.name || 'Product'}</h4>
                                                        <p>Quantity: {item.quantity}</p>
                                                        <p>Price: {parseFloat(item.unit_price || 0).toFixed(2)} L.E</p>
                                                    </div>
                                                    <div className="order-item-total">
                                                        {(item.quantity * parseFloat(item.unit_price || 0)).toFixed(2)} L.E
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-items">No items found</div>
                                        )}
                                    </div>

                                    <div className="order-footer">
                                        <div className="order-total">
                                            <strong>Total Amount:</strong>
                                            <span>
                                                {order.items && order.items.length > 0 
                                                    ? order.items.reduce((sum, item) => 
                                                        sum + (item.quantity * parseFloat(item.unit_price || 0)), 0
                                                    ).toFixed(2)
                                                    : '0.00'
                                                } L.E
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/orders/${order.id}`)}
                                            className="view-details-btn"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Pagination Controls */}
                        {(pagination.previous || pagination.next) && (
                            <div className="pagination-controls">
                                {pagination.previous && (
                                    <button onClick={loadPreviousOrders} className="pagination-btn">
                                        ← Previous
                                    </button>
                                )}
                                {pagination.next && (
                                    <button onClick={loadMoreOrders} className="pagination-btn">
                                        Next →
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}