import API from './api';

export const getNewUsers = async (days = 30) => {
  try {
    const response = await API.get('/api/analytics/new-users/', {
      params: { days }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching new users:', error);
    throw error;
  }
};

export const getTopProducts = async (limit = 10, days = 30) => {
  try {
    const response = await API.get('/api/analytics/top-products/', {
      params: { limit, days }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching top products:', error);
    throw error;
  }
};

export const getPurchases = async (userId = null, productId = null, days = 30, username = null) => {
  try {
    const params = { days };
    if (userId) params.user_id = userId;
    if (productId) params.product_id = productId;
    if (username) params.username = username; // Add username filter

    const response = await API.get('/api/analytics/purchases/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching purchases:', error);
    throw error;
  }
};