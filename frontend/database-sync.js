// Database Synchronization Module
// This replaces localStorage with database API calls for important data

// Note: API_BASE_URL is defined in script.js

// ===== LOYALTY POINTS =====

async function getLoyaltyPoints() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/loyalty-points`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.loyaltyPoints;
        }
        return 0;
    } catch (error) {
        console.error('Get loyalty points error:', error);
        return 0;
    }
}

async function addLoyaltyPoints(points) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/loyalty-points/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ points })
        });
        
        if (response.ok) {
            const data = await response.json();
            // Update currentUser object
            if (window.currentUser) {
                window.currentUser.loyaltyPoints = data.loyaltyPoints;
                localStorage.setItem('user', JSON.stringify(window.currentUser));
            }
            return data.loyaltyPoints;
        }
        return null;
    } catch (error) {
        console.error('Add loyalty points error:', error);
        return null;
    }
}

async function redeemLoyaltyPoints(points) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/loyalty-points/redeem`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ points })
        });
        
        if (response.ok) {
            const data = await response.json();
            // Update currentUser object
            if (window.currentUser) {
                window.currentUser.loyaltyPoints = data.loyaltyPoints;
                localStorage.setItem('user', JSON.stringify(window.currentUser));
            }
            return data.loyaltyPoints;
        } else {
            const error = await response.json();
            throw new Error(error.message);
        }
    } catch (error) {
        console.error('Redeem loyalty points error:', error);
        throw error;
    }
}

// ===== CART =====

async function getCart() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.cart || [];
        }
        return [];
    } catch (error) {
        console.error('Get cart error:', error);
        return [];
    }
}

async function addToCart(productId, productName, quantity, price) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId, productName, quantity, price })
        });
        
        if (response.ok) {
            const data = await response.json();
            // Update global cart variable
            if (typeof window.cart !== 'undefined') {
                window.cart = data.cart;
            }
            return data.cart;
        }
        return null;
    } catch (error) {
        console.error('Add to cart error:', error);
        return null;
    }
}

async function updateCartItem(productId, quantity) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/cart`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId, quantity })
        });
        
        if (response.ok) {
            const data = await response.json();
            // Update global cart variable
            if (typeof window.cart !== 'undefined') {
                window.cart = data.cart;
            }
            return data.cart;
        }
        return null;
    } catch (error) {
        console.error('Update cart error:', error);
        return null;
    }
}

async function removeFromCart(productId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/cart/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Update global cart variable
            if (typeof window.cart !== 'undefined') {
                window.cart = data.cart;
            }
            return data.cart;
        }
        return null;
    } catch (error) {
        console.error('Remove from cart error:', error);
        return null;
    }
}

async function clearCart() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/cart`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            // Update global cart variable
            if (typeof window.cart !== 'undefined') {
                window.cart = [];
            }
            return [];
        }
        return null;
    } catch (error) {
        console.error('Clear cart error:', error);
        return null;
    }
}

// ===== WISHLIST =====

async function getWishlist() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/wishlist`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.wishlist || [];
        }
        return [];
    } catch (error) {
        console.error('Get wishlist error:', error);
        return [];
    }
}

async function addToWishlist(productId, productName) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/wishlist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId, productName })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.wishlist;
        }
        return null;
    } catch (error) {
        console.error('Add to wishlist error:', error);
        return null;
    }
}

async function removeFromWishlist(productId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/wishlist/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.wishlist;
        }
        return null;
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        return null;
    }
}

// ===== PREFERENCES =====

async function getPreferences() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/preferences`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.preferences || {};
        }
        return {};
    } catch (error) {
        console.error('Get preferences error:', error);
        return {};
    }
}

async function updatePreferences(preferences) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/preferences`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(preferences)
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.preferences;
        }
        return null;
    } catch (error) {
        console.error('Update preferences error:', error);
        return null;
    }
}

// ===== SYNC ON LOGIN =====

async function syncUserDataOnLogin() {
    try {
        // Load all user data from database
        const [loyaltyPoints, cart, wishlist, preferences] = await Promise.all([
            getLoyaltyPoints(),
            getCart(),
            getWishlist(),
            getPreferences()
        ]);
        
        // Update currentUser object
        if (window.currentUser) {
            window.currentUser.loyaltyPoints = loyaltyPoints;
            window.currentUser.cart = cart;
            window.currentUser.wishlist = wishlist;
            window.currentUser.preferences = preferences;
            localStorage.setItem('user', JSON.stringify(window.currentUser));
        }
        
        // Update global variables
        if (typeof window.cart !== 'undefined') {
            window.cart = cart;
        }
        
        console.log('✅ User data synced from database');
        return true;
    } catch (error) {
        console.error('Sync user data error:', error);
        return false;
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.dbSync = {
        // Loyalty Points
        getLoyaltyPoints,
        addLoyaltyPoints,
        redeemLoyaltyPoints,
        // Cart
        getCart,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        // Wishlist
        getWishlist,
        addToWishlist,
        removeFromWishlist,
        // Preferences
        getPreferences,
        updatePreferences,
        // Sync
        syncUserDataOnLogin
    };
}
