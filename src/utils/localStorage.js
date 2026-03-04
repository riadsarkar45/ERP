// LocalStorage utility functions for order management

const STORAGE_KEY = 'knittingOrders';

export const getOrders = () => {
    try {
        const orders = localStorage.getItem(STORAGE_KEY);
        return orders ? JSON.parse(orders) : [];
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return [];
    }
};

export const saveOrder = (order) => {
    try {
        const orders = getOrders();
        const newOrder = {
            id: Date.now(),
            ...order,
            createdAt: new Date().toISOString()
        };
        orders.push(newOrder);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
        return newOrder;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        throw error;
    }
};

export const updateOrder = (id, updatedData) => {
    try {
        const orders = getOrders();
        const index = orders.findIndex(order => order.id === id);
        if (index !== -1) {
            orders[index] = { ...orders[index], ...updatedData, updatedAt: new Date().toISOString() };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
            return orders[index];
        }
        return null;
    } catch (error) {
        console.error('Error updating localStorage:', error);
        throw error;
    }
};

export const deleteOrder = (id) => {
    try {
        const orders = getOrders();
        const filteredOrders = orders.filter(order => order.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredOrders));
        return true;
    } catch (error) {
        console.error('Error deleting from localStorage:', error);
        throw error;
    }
};

export const searchOrders = (filters) => {
    try {
        const orders = getOrders();
        return orders.filter(order => {
            return Object.keys(filters).every(key => {
                if (!filters[key]) return true;
                return order[key]?.toLowerCase().includes(filters[key].toLowerCase());
            });
        });
    } catch (error) {
        console.error('Error searching orders:', error);
        return [];
    }
};
