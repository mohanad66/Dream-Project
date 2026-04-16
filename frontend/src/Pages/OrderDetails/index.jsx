import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './css/style.scss';

export default function OrderDetailsPage() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchOrderDetails();
    }, [id]);

    const fetchOrderDetails = async () => {
        try {
            const token = localStorage.getItem('access');
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await axios.get(`/api/orders/${id}/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            setOrder(response.data);
            setIsLoading(false);
        } catch (err) {
            console.error('Error fetching order details:', err);
            setError('Failed to load order details. Please try again.');
            setIsLoading(false);
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
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
        switch (status?.toLowerCase()) {
            case 'confirmed':
                return 'Confirmed';
            case 'pending':
                return 'Processing';
            case 'cancelled':
                return 'Cancelled';
            case 'delivered':
                return 'Delivered';
            default:
                return status || 'Pending';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTrackingSteps = () => {
        const steps = [
            { status: 'pending', label: 'Order Placed', description: 'Your order has been received' },
            { status: 'confirmed', label: 'Order Confirmed', description: 'Your order has been confirmed and is being processed' },
            { status: 'shipped', label: 'Shipped', description: 'Your order has been shipped' },
            { status: 'delivered', label: 'Delivered', description: 'Your order has been delivered' }
        ];

        let currentStepIndex = steps.findIndex(step => step.status === order?.status);
        if (currentStepIndex === -1 && order?.status === 'cancelled') {
            currentStepIndex = 0;
        }

        return steps.map((step, index) => ({
            ...step,
            isCompleted: order?.status === 'cancelled' ? false : index <= currentStepIndex,
            isCurrent: index === currentStepIndex && order?.status !== 'cancelled',
            isCancelled: order?.status === 'cancelled'
        }));
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="error-container">
                <p>{error || 'Order not found'}</p>
                <button onClick={() => navigate('/orders')} className="back-btn">
                    Back to Orders
                </button>
            </div>
        );
    }

    const trackingSteps = getTrackingSteps();

    return (
        <div className="order-details-container">
            <div className="order-details-wrapper">
                <button onClick={() => navigate('/orders')} className="back-btn">
                    ← Back to Orders
                </button>

                <div className="order-header">
                    <h1>Order #{order.id}</h1>
                    <div className={`order-status ${getStatusBadgeClass(order.status)}`}>
                        {getStatusText(order.status)}
                    </div>
                </div>

                <div className="order-info-section">
                    <div className="info-card">
                        <h3>Order Information</h3>
                        <p><strong>Order Date:</strong> {formatDate(order.created_at)}</p>
                        <p><strong>Shipping Address:</strong> {order.shipping_address || 'Not provided'}</p>
                        {order.note && <p><strong>Note:</strong> {order.note}</p>}
                    </div>

                    {order.payment && (
                        <div className="info-card">
                            <h3>Payment Information</h3>
                            <p><strong>Payment Status:</strong> {order.payment.status}</p>
                            <p><strong>Amount:</strong> {parseFloat(order.payment.amount).toFixed(1)} L.E</p>
                            <p><strong>Currency:</strong> {order.payment.currency}</p>
                        </div>
                    )}
                </div>

                {/* Order Tracking Timeline */}
                {order.status !== 'cancelled' && (
                    <div className="tracking-section">
                        <h3>Order Tracking</h3>
                        <div className="tracking-timeline">
                            {trackingSteps.map((step, index) => (
                                <div key={step.status} className={`tracking-step ${step.isCompleted ? 'completed' : ''} ${step.isCurrent ? 'current' : ''}`}>
                                    <div className="step-icon">
                                        {step.isCompleted ? '✓' : index + 1}
                                    </div>
                                    <div className="step-content">
                                        <h4>{step.label}</h4>
                                        <p>{step.description}</p>
                                    </div>
                                    {index < trackingSteps.length - 1 && <div className="step-line"></div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {order.status === 'cancelled' && (
                    <div className="cancelled-notice">
                        <p>⚠️ This order has been cancelled.</p>
                    </div>
                )}

                <div className="order-items-section">
                    <h3>Order Items</h3>
                    <div className="order-items-list">
                        {order.items?.map((item) => (
                            <div key={item.id} className="order-item-detail">
                               
                                <div className="order-item-info">
                                    <h4>{item.product?.name}</h4>
                                    <p>Quantity: {item.quantity}</p>
                                    <p>Unit Price: {parseFloat(item.unit_price).toFixed(1)} L.E</p>
                                </div>
                                <div className="order-item-total">
                                    <strong>Total: </strong>
                                    {(item.quantity * parseFloat(item.unit_price)).toFixed(1)} L.E
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="order-summary">
                    <div className="summary-line">
                        <span>Subtotal:</span>
                        <span>{order.items?.reduce((sum, item) => 
                            sum + (item.quantity * parseFloat(item.unit_price)), 0
                        ).toFixed(1)} L.E</span>
                    </div>
                    <div className="summary-line">
                        <span>Shipping:</span>
                        <span>FREE</span>
                    </div>
                    <div className="summary-line total">
                        <span>Total:</span>
                        <span>{order.items?.reduce((sum, item) => 
                            sum + (item.quantity * parseFloat(item.unit_price)), 0
                        ).toFixed(1)} L.E</span>
                    </div>
                </div>
            </div>
        </div>
    );
}