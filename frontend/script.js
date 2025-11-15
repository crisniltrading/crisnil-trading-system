// Global state
let currentUser = null;
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let cart = JSON.parse(localStorage.getItem('cart') || '[]');

// API base URL - configured based on environment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/api'
    : 'https://crisnil-trading-system.onrender.com/api';
window.API_BASE_URL = API_BASE_URL; // Make it globally accessible
console.log('🌐 API Base URL:', API_BASE_URL);

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
    initializeTheme();
    createFloatingElements();
    setupEventListeners();
    renderCart();
    checkBackendHealth();
    checkAuthStatus();
    initializeNotifications();

    // Navbar scroll effect (landing page)
    window.addEventListener('scroll', function () {
        const navbar = document.getElementById('navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });

    // Dashboard header compact scroll effect
    let scrollTimeout;
    window.addEventListener('scroll', function () {
        const dashboardHeader = document.querySelector('.dashboard-header');
        if (dashboardHeader) {
            // Clear existing timeout
            clearTimeout(scrollTimeout);

            // Add scrolled class immediately when scrolling
            if (window.scrollY > 20) {
                dashboardHeader.classList.add('scrolled');
            } else {
                dashboardHeader.classList.remove('scrolled');
            }
        }
    });

    // Auto-refresh dashboard data every 2 minutes (silent, no loading spinner)
    setInterval(() => {
        const dashboard = document.getElementById('dashboard');
        if (currentUser && dashboard && dashboard.classList.contains('active')) {
            // Only refresh if we have a valid token
            const token = localStorage.getItem('token');
            if (token) {
                loadDashboardData(true); // Pass true for silent refresh
                if (typeof updateSystemHealth === 'function') updateSystemHealth();
            } else {
                // Token is missing, user probably logged out
                console.log('Auto-refresh skipped - no token');
            }
        }
    }, 120000); // 2 minutes instead of 30 seconds
});

// Theme management
function initializeTheme() {
    if (isDarkMode) {
        document.body.classList.add('dark');
        document.querySelector('#themeToggle i').className = 'fas fa-sun';
    }
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', isDarkMode);

    const icon = document.querySelector('#themeToggle i');
    icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
}

// Floating elements
function createFloatingElements() {
    const container = document.getElementById('floatingElements');
    const icons = ['fa-snowflake', 'fa-fish', 'fa-drumstick-bite', 'fa-carrot', 'fa-leaf'];

    for (let i = 0; i < 12; i++) {
        const element = document.createElement('div');
        element.className = 'floating-element';
        element.innerHTML = `<i class="fas ${icons[Math.floor(Math.random() * icons.length)]}"></i>`;
        element.style.left = Math.random() * 100 + '%';
        element.style.top = Math.random() * 100 + '%';
        element.style.fontSize = (Math.random() * 2 + 1) + 'rem';
        element.style.animationDelay = Math.random() * 6 + 's';
        element.style.animationDuration = (Math.random() * 4 + 4) + 's';
        container.appendChild(element);
    }
}

// Event listeners
function setupEventListeners() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Add stock form listener
    const addStockForm = document.getElementById('addStockForm');
    if (addStockForm) {
        addStockForm.addEventListener('submit', handleAddStock);
    }

    // Remove stock form listener
    const removeStockForm = document.getElementById('removeStockForm');
    if (removeStockForm) {
        removeStockForm.addEventListener('submit', handleRemoveStock);
    }

    // Add product form listener
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProduct);
    }

    // Registration form listener
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
    }
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSave);
    }

    const createStaffForm = document.getElementById('createStaffForm');
    if (createStaffForm) {
        createStaffForm.addEventListener('submit', handleCreateStaff);
    }
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }

    // Product filters
    const categorySelect = document.querySelector('#productCategory');
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            const query = document.getElementById('productSearch')?.value || '';
            loadProducts({ category: categorySelect.value || undefined, search: query || undefined });
        });
    }

    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', () => {
            const v = themeSelect.value;
            if (v === 'dark' && !document.body.classList.contains('dark')) toggleTheme();
            if (v === 'light' && document.body.classList.contains('dark')) toggleTheme();
            localStorage.setItem('themePreference', v);
        });
    }
    const notifSelect = document.getElementById('notifSelect');
    if (notifSelect) {
        notifSelect.addEventListener('change', () => {
            localStorage.setItem('notificationPreference', notifSelect.value);
            showToast('Notification preference saved', 'success');
        });
    }

    // Profile picture upload handler
    initializeProfilePictureUpload();
}

// Registration handling
async function handleRegister(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    // Check if passwords match
    if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }

    const role = formData.get('role');
    const businessName = formData.get('business_name');

    const registrationData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: password,
        role: role,
        businessInfo: businessName ? { business_name: businessName } : undefined
    };

    // Validate required fields
    if (!registrationData.username || !registrationData.email || !registrationData.password || !registrationData.role) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    // Validate B2B requirements
    if (role === 'b2b' && (!businessName || businessName.trim().length < 2)) {
        showToast('Business name is required for B2B accounts', 'error');
        return;
    }

    try {
        showLoading();
        console.log('📤 Sending registration request:', registrationData);

        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registrationData)
        });

        console.log('📥 Registration response status:', response.status);
        const data = await response.json();
        console.log('📥 Registration response data:', data);
        hideLoading();

        if (response.ok && data.status === 'success') {
            console.log('✅ Registration successful!');
            
            // IMPORTANT: Close registration modal FIRST before showing success modal
            closeRegisterModal();
            
            // Show success modal
            showSuccessModal(
                '🎉 Account Created Successfully!',
                `Welcome to Crisnil Trading, ${registrationData.username}!<br><br>
                Your account has been created successfully. You can now log in and start shopping.<br><br>
                <strong>Account Details:</strong><br>
                📧 Email: ${registrationData.email}<br>
                👤 Username: ${registrationData.username}<br>
                🏷️ Account Type: ${role === 'b2b' ? 'B2B Business' : 'Client'}<br><br>
                ${role === 'b2b' ? `🏢 Business: ${businessName}<br><br>` : ''}
                A welcome email has been sent to your email address.`,
                () => {
                    // Auto-fill login form
                    const usernameField = document.getElementById('username');
                    const passwordField = document.getElementById('password');
                    if (usernameField) usernameField.value = registrationData.username;
                    if (passwordField) passwordField.value = '';
                    showLogin();
                }
            );
        } else {
            console.error('❌ Registration failed:', data);
            // Handle validation errors
            if (data.errors && Array.isArray(data.errors)) {
                data.errors.forEach(error => showToast(error, 'error'));
            } else {
                showToast(data.message || 'Registration failed', 'error');
            }
        }
    } catch (error) {
        hideLoading();
        console.error('❌ Registration error:', error);
        showToast('Registration failed. Please check your connection and try again.', 'error');
    }
}

// Authentication
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
        try {
            currentUser = JSON.parse(user);

            // Set global user role immediately
            const role = (currentUser.role || 'client').toLowerCase();
            window.currentUserRole = role;

            // Validate token by making a test API call
            const testResponse = await fetch(`${API_BASE_URL}/analytics/overview`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (testResponse.status === 401) {
                // Token is invalid, clear and redirect to login
                console.log('Invalid token detected, clearing auth data');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                currentUser = null;
                showLogin();
                showToast('Session expired. Please log in again.', 'warning');
                return;
            }

            showDashboard();
            loadDashboardData();
        } catch (error) {
            console.error('Error checking auth status:', error);
            // Network error - proceed with cached user data but show warning
            showDashboard();
            showToast('Unable to verify session. Some features may not work.', 'warning');
        }
    } else {
        showLandingPage();
    }
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('dashboard').classList.remove('active');
    document.getElementById('landingPage').classList.remove('active');
    document.body.classList.add('modal-open');
    // Scroll to top
    setTimeout(() => {
        document.getElementById('loginScreen').scrollTop = 0;
    }, 0);
}

// Video player function
function playVideo() {
    const videoEmbed = document.getElementById('videoEmbed');
    // CRISNIL Trading Corp video
    const videoId = 'cGxt4JqzrNw'; // Your actual video ID

    // Create iframe for video
    videoEmbed.innerHTML = `
        <iframe 
            width="100%" 
            height="100%" 
            src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
            title="CRISNIL Trading Corp" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
        </iframe>
    `;
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    document.getElementById('landingPage').classList.remove('active');
    document.body.classList.remove('modal-open');

    if (currentUser) {
        // Set global user role for UI elements
        const role = (currentUser.role || 'client').toLowerCase();
        window.currentUserRole = role;

        // Update user avatar, username, and role badge
        updateUserAvatar();

        // Add profile button to navigation
        if (typeof addProfileButtonToNavigation === 'function') {
            addProfileButtonToNavigation();
        }

        // Welcome notification for new login - only show once per session
        const sessionKey = `welcomed_${currentUser._id || currentUser.username}`;
        const welcomed = sessionStorage.getItem(sessionKey);

        // Also check if we already have a welcome notification in storage
        const existingNotifications = getNotifications();
        const hasWelcomeNotification = existingNotifications.some(n =>
            n.title === 'Welcome Back!' &&
            n.message.includes(currentUser.business_name || currentUser.username)
        );

        if (!welcomed && !hasWelcomeNotification) {
            sessionStorage.setItem(sessionKey, 'true');
            addNotification({
                type: 'info',
                title: 'Welcome Back!',
                message: `Welcome back, ${currentUser.business_name || currentUser.username}! Your dashboard is ready.`
            });
        }

        // Load products for the dropdowns
        loadProducts();

        // Enhanced role-based access control  
        const show = (id, visible) => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = visible ? '' : 'none';
            }
        };
        const isAdmin = role === 'admin';
        const isStaff = role === 'staff';
        const isB2B = role === 'b2b';
        const isClient = role === 'client';

        console.log('Setting up role-based access for:', role);

        // Show/hide loyalty menu items based on role
        const loyaltyRewardsMenuItem = document.getElementById('loyaltyRewardsMenuItem');
        const adminLoyaltyMenuItem = document.getElementById('adminLoyaltyMenuItem');

        if (isClient) {
            // Clients see the rewards modal
            if (loyaltyRewardsMenuItem) loyaltyRewardsMenuItem.style.display = '';
            if (adminLoyaltyMenuItem) adminLoyaltyMenuItem.style.display = 'none';
        } else if (isAdmin || isStaff) {
            // Admins/Staff see the management panel
            if (loyaltyRewardsMenuItem) loyaltyRewardsMenuItem.style.display = 'none';
            if (adminLoyaltyMenuItem) adminLoyaltyMenuItem.style.display = '';
        }

        if (isClient) {
            // Client view - only show client features
            show('tab-overview', true);
            show('tab-products', true);  // Browse products only
            show('tab-orders', true);    // View their orders
            show('tab-cart', true);
            show('tab-wishlist', true);
            show('tab-analytics', true);  // Client-focused analytics
            show('tab-transactions', true); // Client transactions

            // Hide admin-only features
            show('tab-inventory', false);  // Completely remove inventory for clients
            show('tab-expiry-tracker', false);  // Hide expiry tracker for clients
            show('tab-promotions', false);
            show('tab-reports', false); // No reports for clients

            // Hide admin buttons
            show('addProductBtn', false);  // Remove "Add Product" button for clients
            show('addStockBtn', false);
            show('removeStockBtn', false);
            show('createPromotionBtn', false);

            // Compare button visibility will be controlled by updateCompareButton()
            // which checks if user is in products section
        } else if (isB2B) {
            // B2B view - limited admin features, no client features
            show('tab-overview', true);
            show('tab-products', true);  // Can manage products
            show('tab-orders', true);    // Can view all orders
            show('tab-inventory', true); // Can manage inventory
            show('tab-analytics', true); // Can view analytics
            show('tab-transactions', true); // Can view transactions (but not process refunds)
            show('tab-promotions', false); // Cannot manage promotions
            show('tab-reports', false); // B2B cannot view reports

            // Hide client-only features
            show('tab-cart', false);
            show('tab-wishlist', false);
            show('tab-checkout', false);

            // Show limited admin buttons
            show('addProductBtn', true);
            show('addStockBtn', true);
            show('removeStockBtn', true);
            show('createPromotionBtn', false); // B2B cannot create promotions

            // Hide compare button for B2B
            show('compareButton', false);
        } else {
            // Admin/Staff view - show admin features, hide client features
            show('tab-overview', true);
            show('tab-products', true);
            show('tab-orders', true);
            show('tab-inventory', true);
            show('tab-expiry-tracker', isAdmin || isStaff); // Expiry tracker for admin/staff
            show('tab-analytics', true);
            show('tab-transactions', true);
            show('tab-promotions', isAdmin);
            show('tab-reports', isAdmin || isStaff); // Reports for admin/staff

            // Hide client-only features completely
            show('tab-cart', false);
            show('tab-wishlist', false);
            show('tab-checkout', false);

            // Show admin buttons
            show('addProductBtn', true);
            show('addStockBtn', true);
            show('removeStockBtn', true);
            show('createPromotionBtn', isAdmin);

            // Hide compare button for admin/staff
            show('compareButton', false);
        }

        // Show/hide sections based on role
        show('overviewSection', true);
        show('productsSection', true);
        show('ordersSection', true);
        show('cartSection', isClient); // Only clients can see cart
        show('wishlistSection', isClient); // Only clients can see wishlist
        show('checkoutSection', isClient); // Only clients can see checkout
        show('transactionsSection', isAdmin || isStaff || isB2B); // Admin transactions for admin/staff/B2B
        show('clientTransactionsSection', isClient); // Client transactions for clients only
        show('inventorySection', isAdmin || isStaff || isB2B); // Admin, staff, and B2B can see inventory
        show('expiry-trackerSection', isAdmin || isStaff); // Expiry tracker for admin/staff only
        show('analyticsSection', isAdmin || isStaff || isB2B); // Admin analytics only for admin/staff/B2B
        show('clientAnalyticsSection', isClient); // Client analytics only for clients
        show('promotionsSection', isAdmin); // Only admin can manage promotions
        show('reportsSection', isAdmin || isStaff); // Reports for admin/staff only

        // Update section titles based on role
        updateSectionTitlesForRole(role);

        // User display already set above, no need to duplicate

        // Hide staff creation form for non-admins
        show('createStaffForm', isAdmin);

        // Force switch to appropriate default tab based on role
        if (isClient) {
            // Clients start with overview or products
            switchTab('overview');
        } else if (isB2B) {
            // B2B users start with products/inventory
            switchTab('products');
        } else if (isAdmin || isStaff) {
            // Admin/staff start with overview
            switchTab('overview');
        }

        // Prefill checkout address from profile if available
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
            const checkoutForm = document.getElementById('checkoutForm');
            if (storedUser && checkoutForm) {
                const addressField = checkoutForm.querySelector('textarea[name="address"]');
                if (addressField && storedUser.address) addressField.value = storedUser.address;
            }
        } catch (_) { /* ignore */ }

        // Load chat widget for client users only
        if (isClient) {
            loadChatWidget();
        } else {
            // Hide chat widget for non-client users (admin, staff, b2b)
            hideChatWidget();
        }
    }
}

// Load Tawk.to chat widget dynamically for client users
function loadChatWidget() {
    // Check if widget is already loaded
    if (window.Tawk_API) {
        console.log('💬 Chat widget already loaded');
        return;
    }

    console.log('💬 Loading chat widget for client user');

    // Load Tawk.to script
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    (function () {
        var s1 = document.createElement("script");
        var s0 = document.getElementsByTagName("script")[0];
        s1.async = true;
        s1.src = 'https://embed.tawk.to/68ee5199ab07261951f599bc/1j7hetgge';
        s1.charset = 'UTF-8';
        s1.setAttribute('crossorigin', '*');
        s0.parentNode.insertBefore(s1, s0);
    })();

    // Configure when loaded
    window.Tawk_API.onLoad = function () {
        console.log('💬 Chat widget loaded');

        // Minimize the chat widget by default
        if (window.Tawk_API.minimize) {
            window.Tawk_API.minimize();
            console.log('💬 Chat widget minimized by default');
        }

        const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (!currentUser) return;

        // Set user attributes
        const attributes = {};
        if (currentUser.username || currentUser.business_name) {
            attributes.name = currentUser.username || currentUser.business_name;
        }
        if (currentUser.email) {
            attributes.email = currentUser.email;
        }
        if (currentUser.role) {
            attributes.role = currentUser.role;
        }
        if (currentUser._id) {
            attributes.userId = currentUser._id;
        }

        // Set attributes if available
        if (Object.keys(attributes).length > 0) {
            window.Tawk_API.setAttributes(attributes, function (error) {
                if (error) {
                    console.error('Error setting Tawk.to attributes:', error);
                } else {
                    console.log('💬 Chat widget loaded and configured');
                }
            });
        }
    };
}

// Hide chat widget for non-client users
function hideChatWidget() {
    if (window.Tawk_API && window.Tawk_API.hideWidget) {
        window.Tawk_API.hideWidget();
        console.log('💬 Chat widget hidden for non-client user');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    showLoading();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        // Try to authenticate with backend
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;

            hideLoading();
            showToast('Login successful! Welcome to your dashboard.', 'success');
            showDashboard();
            loadDashboardData();
        } else {
            const errorData = await response.json();
            hideLoading();
            showToast(errorData.message || 'Login failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        hideLoading();
        showToast('Unable to connect to server. Please check your connection and try again.', 'error');
    }
}

function logout() {
    // Close Profile & Settings modal if open
    if (typeof closeProfileSettings === 'function') {
        closeProfileSettings();
    }

    // Close user dropdown menu if open
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.style.display = 'none';
    }

    // Clear profile picture from header
    updateHeaderAvatar(null);

    // Clear profile manager's current user
    if (window.profileManager) {
        window.profileManager.currentUser = null;
    }

    // Clear global user role to prevent role persistence
    window.currentUserRole = null;

    // Hide chat widget on logout
    hideChatWidget();

    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;

    showToast('Logged out successfully.', 'success');
    showLogin();
}

// Tab management
function switchTab(tabId) {
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) activeTab.classList.add('active');

    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section - handle analytics and transactions specially for role-based routing
    let targetSectionId = tabId + 'Section';

    // If analytics tab, route to correct section based on role
    if (tabId === 'analytics') {
        const userRole = (currentUser?.role || 'client').toLowerCase();
        if (userRole === 'client') {
            targetSectionId = 'clientAnalyticsSection';
        } else {
            targetSectionId = 'analyticsSection';
        }
    }

    // If transactions tab, route to correct section based on role
    if (tabId === 'transactions') {
        const userRole = (currentUser?.role || 'client').toLowerCase();
        if (userRole === 'client') {
            targetSectionId = 'clientTransactionsSection';
        } else {
            targetSectionId = 'transactionsSection';
        }
    }

    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update section titles based on role
    updateSectionTitles(tabId);

    // Removed annoying tab switch notification - users can see the tab is active

    // Load section-specific data
    loadSectionData(tabId);
    if (tabId === 'cart') renderCart();
    if (tabId === 'wishlist') renderWishlist();
    if (tabId === 'expiry-tracker') {
        // Load expiry tracker dashboard (only for admin/staff)
        const userRole = (currentUser?.role || 'client').toLowerCase();
        if (userRole !== 'client' && typeof loadExpiryDashboard === 'function') {
            loadExpiryDashboard();
        } else if (userRole === 'client') {
            // Show message that this feature is not available for clients
            const container = document.getElementById('expiryDashboardContainer');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 4rem; color: #64748b;">
                        <i class="fas fa-lock" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                        <h3>Access Restricted</h3>
                        <p>This feature is only available for admin and staff users.</p>
                    </div>
                `;
            }
        }
    }
    if (tabId === 'analytics') {
        const userRole = (currentUser?.role || 'client').toLowerCase();
        if (userRole === 'client') {
            loadClientAnalytics();
        } else {
            loadOrderTracking();
            // Load reviews for admin to monitor
            if (typeof loadAllReviewsForAdmin === 'function') {
                loadAllReviewsForAdmin();
            }
        }
    }
    if (tabId === 'reports') {
        if (typeof loadReportsPage === 'function') {
            loadReportsPage();
        }
    }

    // Update compare button visibility when switching tabs
    if (typeof updateCompareButton === 'function') {
        updateCompareButton();
    }
}

// Alias for backward compatibility
function showTab(tabId) {
    switchTab(tabId);
}

// Update section titles based on user role (called on tab switch)
function updateSectionTitles(tabId) {
    const userRole = (currentUser?.role || 'client').toLowerCase();

    if (tabId === 'transactions') {
        const titleElement = document.getElementById('transactionSectionTitle');
        if (titleElement) {
            if (userRole === 'client') {
                titleElement.innerHTML = '<i class="fas fa-shopping-bag"></i> My Orders & Purchases';
            } else if (userRole === 'b2b') {
                titleElement.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Transaction Overview';
            } else {
                titleElement.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Transaction Management';
            }
        }
    }
}

// Update all section titles based on role (called on login)
function updateSectionTitlesForRole(role) {
    const isClient = role === 'client';
    const isAdmin = role === 'admin' || role === 'staff';
    const isB2B = role === 'b2b';

    // Update Products section title
    const productsTitle = document.querySelector('#productsSection h2');
    if (productsTitle) {
        if (isClient) {
            productsTitle.innerHTML = '<i class="fas fa-shopping-bag"></i> Available Products';
        } else if (isB2B) {
            productsTitle.innerHTML = '<i class="fas fa-box"></i> Product Catalog';
        } else {
            productsTitle.innerHTML = '<i class="fas fa-box"></i> Product Management';
        }
    }

    // Update Transactions section title
    const transactionsTitle = document.getElementById('transactionSectionTitle');
    if (transactionsTitle) {
        if (isClient) {
            transactionsTitle.innerHTML = '<i class="fas fa-shopping-bag"></i> My Orders & Purchases';
        } else if (isB2B) {
            transactionsTitle.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Transaction Overview';
        } else {
            transactionsTitle.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Transaction Management';
        }
    }
}


async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            console.log('✅ Backend connection established');
            return true;
        } else if (response.status === 401) {
            // 401 is expected on landing page before login - suppress error
            console.log('✅ Backend is online (awaiting authentication)');
            return true;
        } else {
            console.log('Backend responded with status:', response.status);
            return true; // Backend is responding
        }
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        return false;
    }
}

// Check if backend server is reachable
async function isServerReachable() {
    try {
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
            method: 'GET'
        });
        return response.ok;
    } catch (error) {
        console.error('Server health check failed:', error);
        return false;
    }
}

// Handle authentication errors consistently
function handleAuthError(message = 'Session expired. Please log in again.') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    showToast(message, 'warning');
    showLogin();
}

// Handle rate limit errors
function handleRateLimit() {
    showToast('Too many requests. Please wait a few minutes before trying again.', 'warning');
}

// Handle API response errors consistently
function handleApiError(response, defaultMessage) {
    if (response.status === 401) {
        handleAuthError();
        return true; // Error handled
    } else if (response.status === 429) {
        handleRateLimit();
        return true; // Error handled  
    } else if (!response.ok) {
        response.json().then(error => {
            showToast(error.message || defaultMessage, 'error');
        }).catch(() => {
            showToast(defaultMessage, 'error');
        });
        return true; // Error handled
    }
    return false; // No error
}

// Data loading functions
async function loadDashboardData(silent = false) {
    try {
        // Only show loading spinner if not silent refresh
        if (!silent) showLoading();
        const token = localStorage.getItem('token');

        if (!token) {
            showLogin();
            return;
        }

        // Check if server is reachable first
        const serverReachable = await isServerReachable();
        if (!serverReachable) {
            showToast('Backend server is not running. Please start the server first.', 'error');
            // Use fallback data for UI
            updateStatsGrid({
                totalProducts: 'Server Offline',
                lowStockItems: 'Server Offline',
                pendingOrders: 'Server Offline',
                todaysSales: 'Server Offline'
            });
            return;
        }

        // Update system health first
        if (typeof updateSystemHealth === 'function') updateSystemHealth();

        // Load overview statistics (skip for client users)
        const currentRole = (currentUser?.role || 'client').toLowerCase();
        if (currentRole !== 'client') {
            try {
                const statsResponse = await fetch(`${API_BASE_URL}/analytics/overview`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (handleApiError(statsResponse, 'Failed to load dashboard statistics')) {
                    // Error was handled, use fallback data
                    updateStatsGrid({
                        totalProducts: 'Error',
                        lowStockItems: 'Error',
                        pendingOrders: 'Error',
                        todaysSales: 'Error'
                    });
                } else {
                    const statsData = await statsResponse.json();
                    updateStatsGrid(statsData.data);
                }
            } catch (error) {
                console.error('Error loading stats:', error);
                updateStatsGrid({
                    totalProducts: '0',
                    lowStockItems: '0',
                    pendingOrders: '0',
                    todaysSales: '₱0'
                });
            }
        }

        // Load recent activities
        try {
            const activitiesResponse = await fetch(`${API_BASE_URL}/analytics/recent-activities`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (activitiesResponse.ok) {
                const activitiesData = await activitiesResponse.json();
                updateRecentActivities(activitiesData.data);
            } else {
                // Show empty state if API fails
                updateRecentActivities({ recentOrders: [], inventoryAlerts: [] });
            }
        } catch (error) {
            console.error('Error loading activities:', error);
            // Show empty state on error
            updateRecentActivities({ recentOrders: [], inventoryAlerts: [] });
        }

        // Load active promotions - make this optional
        try {
            const promosRes = await fetch(`${API_BASE_URL}/promotions/active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (promosRes.ok) {
                const pd = await promosRes.json();
                renderPromotions(pd.promotions || []);

                // Check for new promotions and create notifications (only for clients)
                if (currentRole === 'client' || currentRole === 'b2b') {
                    checkForPromotionNotifications(pd.promotions || []);
                }
            }
        } catch (error) {
            console.warn('Promotions endpoint not available:', error);
            // Promotions are optional, continue without them
        }

        // Load performance metrics for all users
        loadPerformanceMetrics();

        // Initialize role-specific dashboard content
        const userRole = (currentUser?.role || 'client').toLowerCase();
        if (userRole === 'admin' || userRole === 'staff') {
            // Admin/Staff dashboard - only load analytics and system health
            updateAnalyticsCharts();
            if (typeof updateSystemHealth === 'function') updateSystemHealth();

            // Update expiry alert (integrated with Expiry Tracker)
            if (typeof updateDashboardExpiryAlert === 'function') {
                updateDashboardExpiryAlert();
            }

            // Load enhanced dashboard widgets for admin/staff only
            loadEnhancedDashboardWidgets();
        } else {
            // Client-specific dashboard - load real data
            loadClientDashboard();
            // Preload client analytics
            if (typeof loadClientAnalytics === 'function') {
                loadClientAnalytics();
            }
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);

        // Check if it's a network error vs auth error
        if (error.message && error.message.includes('Failed to fetch')) {
            showToast('Backend server is not running. Please start the server first.', 'error');
        } else {
            showToast('Failed to load dashboard data', 'warning');
        }
    } finally {
        // Hide loading spinner only if it was shown (not silent)
        if (!silent) hideLoading();
    }
}

// Load client-specific dashboard with real data - ENHANCED VERSION
async function loadClientDashboard() {
    console.log('=== LOADING CLIENT DASHBOARD ===');
    const token = localStorage.getItem('token');

    if (!token) {
        console.error('No token found!');
        return;
    }

    console.log('Token found, fetching data...');

    try {
        // Load all data in parallel for better performance
        const [ordersRes, promosRes, productsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/orders?mine=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE_URL}/promotions/active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE_URL}/products`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        let myOrders = [];
        if (ordersRes.ok) {
            const ordersData = await ordersRes.json();
            myOrders = ordersData.orders || [];
            console.log(`Loaded ${myOrders.length} orders`);
        } else {
            console.error('Failed to load orders:', ordersRes.status);
        }

        let activePromotions = [];
        if (promosRes.ok) {
            const promosData = await promosRes.json();
            activePromotions = promosData.promotions || [];
            console.log(`Loaded ${activePromotions.length} promotions`);
        } else {
            console.warn('Failed to load promotions:', promosRes.status);
        }

        let allProducts = [];
        if (productsRes.ok) {
            const productsData = await productsRes.json();
            allProducts = productsData.products || [];
            console.log(`Loaded ${allProducts.length} products`);
        } else {
            console.error('Failed to load products:', productsRes.status);
        }

        // Calculate loyalty points from orders
        const loyaltyPoints = calculateLoyaltyPoints(myOrders);
        console.log(`Calculated loyalty points: ${loyaltyPoints}`);

        // Update enhanced client stats grid
        console.log('Updating stats grid...');
        updateEnhancedClientStatsGrid({
            myOrders: myOrders,
            cartItems: cart.length,
            wishlistItems: JSON.parse(localStorage.getItem('wishlist') || '[]').length,
            activePromotions: activePromotions.length,
            loyaltyPoints: loyaltyPoints
        });

        // Render all enhanced client overview sections
        console.log('Rendering enhanced client overview...');
        renderEnhancedClientOverview(myOrders, activePromotions, allProducts);
        console.log('=== CLIENT DASHBOARD LOADED ===');

    } catch (error) {
        console.error('Error loading client dashboard:', error);
        showToast('Failed to load dashboard data', 'warning');
    }
}

// Calculate loyalty points from orders (1 point per ₱10 spent)
function calculateLoyaltyPoints(orders) {
    console.log('📊 Calculating loyalty points from orders:', orders);
    const completedOrders = orders.filter(o =>
        o.status === 'delivered' || o.status === 'completed'
    );
    console.log('✅ Completed orders:', completedOrders.length);

    const totalSpent = completedOrders.reduce((sum, order) => {
        // Handle both totalAmount (camelCase) and total_amount (snake_case)
        const amount = order.totalAmount || order.total_amount || 0;
        console.log(`Order ${order.orderNumber || order._id}: ₱${amount}`);
        return sum + amount;
    }, 0);

    const points = Math.floor(totalSpent / 10);
    console.log(`💰 Total spent: ₱${totalSpent}, Points earned: ${points}`);
    return points;
}

// Update enhanced client stats grid with interactive cards
function updateEnhancedClientStatsGrid(data) {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;

    const activeOrders = data.myOrders.filter(o =>
        o.status === 'pending' || o.status === 'processing' || o.status === 'shipped'
    ).length;
    const completedOrders = data.myOrders.filter(o =>
        o.status === 'delivered' || o.status === 'completed'
    ).length;

    statsGrid.innerHTML = `
        <div class="stat-card stat-active interactive" onclick="switchTab('orders')" style="cursor: pointer;">
            <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                <i class="fas fa-truck"></i>
            </div>
            <div class="stat-details">
                <div class="stat-value">${activeOrders}</div>
                <div class="stat-label">Active Orders</div>
                <div class="stat-action">Track Now →</div>
            </div>
        </div>
        
        <div class="stat-card stat-completed interactive" onclick="switchTab('orders')" style="cursor: pointer;">
            <div class="stat-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-details">
                <div class="stat-value">${completedOrders}</div>
                <div class="stat-label">Completed</div>
                <div class="stat-action">View All →</div>
            </div>
        </div>
        
        <div class="stat-card stat-cart interactive" onclick="switchTab('cart')" style="cursor: pointer;">
            <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <i class="fas fa-shopping-cart"></i>
            </div>
            <div class="stat-details">
                <div class="stat-value">${data.cartItems}</div>
                <div class="stat-label">Cart Items</div>
                <div class="stat-action">${data.cartItems > 0 ? 'Checkout →' : 'Shop Now →'}</div>
            </div>
        </div>
        
        <div class="stat-card stat-loyalty interactive" onclick="showLoyaltyRewards()" style="cursor: pointer;">
            <div class="stat-icon" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
                <i class="fas fa-gift"></i>
            </div>
            <div class="stat-details">
                <div class="stat-value">${data.loyaltyPoints}</div>
                <div class="stat-label">Loyalty Points</div>
                <div class="stat-action">Redeem →</div>
            </div>
        </div>
    `;
}

// Render enhanced client overview with all features
function renderEnhancedClientOverview(myOrders, activePromotions, allProducts) {
    // IMPORTANT: Only run for CLIENT role
    const userRole = (currentUser?.role || 'client').toLowerCase();
    if (userRole !== 'client') {
        console.log('Not a client, skipping enhanced overview');
        return; // Exit if not a client
    }

    console.log('Rendering enhanced client overview for client role');

    // Remove any previously added enhanced sections to avoid duplicates
    const existingOrderTracking = document.querySelector('.client-order-tracking');
    if (existingOrderTracking) existingOrderTracking.remove();

    const existingQuickReorder = document.querySelector('.client-quick-reorder');
    if (existingQuickReorder) existingQuickReorder.remove();

    // Show quick search for clients
    const overviewQuickSearch = document.getElementById('overviewQuickSearch');
    if (overviewQuickSearch) {
        overviewQuickSearch.style.display = 'block';
    }

    // Hide admin-specific UI elements for clients
    const activitySearch = document.getElementById('activitySearch');
    const activityFilter = document.getElementById('activityFilter');
    if (activitySearch) activitySearch.style.display = 'none';
    if (activityFilter) activityFilter.style.display = 'none';

    // Simplify the "Recent Activities" header for clients
    const recentActivitiesHeader = document.querySelector('#overviewSection h3');
    if (recentActivitiesHeader && recentActivitiesHeader.textContent.includes('Recent Activities')) {
        recentActivitiesHeader.innerHTML = '<i class="fas fa-home"></i> My Dashboard';
    }

    // Update recent orders section
    const recentOrdersDiv = document.getElementById('recentOrders');
    if (recentOrdersDiv) {
        if (myOrders.length === 0) {
            recentOrdersDiv.innerHTML = `
                <div class="text-sm" style="color: var(--text-muted); padding: 2rem 1rem; text-align: center; background: var(--background); border-radius: 0.75rem;">
                    <i class="fas fa-shopping-bag" style="font-size: 2.5rem; opacity: 0.2; margin-bottom: 1rem; display: block;"></i>
                    <p style="margin-bottom: 1rem; font-weight: 500;">No orders yet. Start shopping!</p>
                    <button class="btn btn-primary btn-sm" onclick="switchTab('products')" style="margin-top: 0.5rem;">
                        <i class="fas fa-shopping-cart"></i> Browse Products
                    </button>
                </div>
            `;
        } else {
            const recentOrders = myOrders.slice(0, 3);
            recentOrdersDiv.innerHTML = recentOrders.map(order => `
                <div class="activity-item" style="padding: 1.5rem; background: var(--background); border-radius: 1rem; margin-bottom: 1.25rem; border-left: 5px solid ${getOrderStatusColor(order.status)}; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.2s ease;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.12)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'">
                    <!-- Order ID and Date -->
                    <div style="margin-bottom: 1rem;">
                        <strong style="color: var(--text-primary); font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">${order.order_id || order._id}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">
                            <i class="fas fa-calendar" style="margin-right: 0.35rem; opacity: 0.7;"></i>${new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                    
                    <!-- Status Badge -->
                    <div style="margin-bottom: 1rem;">
                        <span class="badge ${getOrderStatusBadge(order.status)}" style="font-size: 0.75rem; padding: 0.4rem 0.85rem; border-radius: 0.5rem; font-weight: 600;">
                            ${order.status.toUpperCase()}
                        </span>
                    </div>
                    
                    <!-- Price and Action Button - Full Width -->
                    <div style="padding-top: 1rem; border-top: 1px solid var(--border);">
                        <div style="font-size: 1.4rem; font-weight: 800; color: var(--primary); margin-bottom: 1rem;">
                            ₱${(order.totalAmount || order.total_amount || 0).toFixed(2)}
                        </div>
                        <button class="btn btn-primary" onclick="viewOrderDetails('${order._id}')" style="width: 100%; padding: 0.75rem; font-weight: 600; border-radius: 0.5rem;">
                            <i class="fas fa-eye"></i> View Order Details
                        </button>
                    </div>
                </div>
            `).join('');

            if (myOrders.length > 3) {
                recentOrdersDiv.innerHTML += `
                    <button class="btn btn-outline btn-sm" onclick="switchTab('orders')" style="width: 100%; margin-top: 1rem; padding: 0.75rem;">
                        <i class="fas fa-list"></i> View All Orders (${myOrders.length})
                    </button>
                `;
            }
        }
    }

    // Update promotions section
    const overviewPromotionsList = document.getElementById('overviewPromotionsList');
    if (overviewPromotionsList) {
        if (activePromotions.length === 0) {
            overviewPromotionsList.innerHTML = `
                <div class="text-sm" style="color: var(--text-muted); padding: 2rem 1rem; text-align: center; background: var(--background); border-radius: 0.75rem; border: 2px dashed var(--border-color);">
                    <i class="fas fa-gift" style="font-size: 3rem; opacity: 0.2; margin-bottom: 1rem; display: block;"></i>
                    <p style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">No Active Promotions</p>
                    <p style="font-size: 0.9rem;">Stay tuned for amazing special offers!</p>
                </div>
            `;
        } else {
            console.log('Displaying promotions:', activePromotions);
            overviewPromotionsList.innerHTML = activePromotions.map(promo => {
                // Use correct schema field names
                const code = promo.couponCode || promo.name || 'PROMO';
                const discountValue = promo.discount?.value || 0;
                const discountType = promo.discount?.type || 'percentage';
                const description = promo.description || 'Special discount offer';
                const validUntil = promo.validity?.endDate;

                const discountText = discountType === 'percentage'
                    ? `${discountValue}% OFF`
                    : `₱${Number(discountValue).toLocaleString()} OFF`;

                const expiry = validUntil ? new Date(validUntil) : null;
                const daysLeft = expiry ? Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)) : null;
                const isExpiringSoon = daysLeft && daysLeft <= 7;

                // Alternate colors: red and blue gradients
                const colorIndex = activePromotions.indexOf(promo) % 2;
                const gradientColors = colorIndex === 0
                    ? 'linear-gradient(135deg, #DC2626 0%, #EF4444 50%, #F87171 100%)' // Red gradient
                    : 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%)'; // Blue gradient
                const shadowColor = colorIndex === 0
                    ? 'rgba(220, 38, 38, 0.4)'
                    : 'rgba(30, 64, 175, 0.4)';
                const buttonColor = colorIndex === 0 ? '#DC2626' : '#1E40AF';

                // Format dates
                const validFrom = promo.validity?.startDate ? new Date(promo.validity.startDate) : null;
                const validFromText = validFrom ? validFrom.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Now';
                const validUntilText = expiry ? expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Limited time';

                return `
                <div class="promo-item" style="padding: 1.75rem; background: ${gradientColors}; border-radius: 1.25rem; margin-bottom: 1.5rem; color: white; position: relative; overflow: hidden; box-shadow: 0 6px 20px ${shadowColor}; transition: all 0.3s ease; border: 2px solid rgba(255,255,255,0.2);" onmouseover="this.style.transform='translateY(-6px) scale(1.02)'; this.style.boxShadow='0 12px 28px ${shadowColor}'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 6px 20px ${shadowColor}'">
                    
                    <!-- Decorative elements -->
                    <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%; filter: blur(30px);"></div>
                    <div style="position: absolute; bottom: -30px; left: -30px; width: 120px; height: 120px; background: rgba(0,0,0,0.1); border-radius: 50%; filter: blur(40px);"></div>
                    
                    <!-- Active Badge -->
                    <div style="position: absolute; top: 1rem; right: 1rem; background: rgba(16, 185, 129, 0.95); padding: 0.4rem 1rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 800; box-shadow: 0 3px 10px rgba(0,0,0,0.25); z-index: 2;">
                        <i class="fas fa-check-circle"></i> ACTIVE
                    </div>
                    
                    <!-- Promo Header -->
                    <div style="position: relative; z-index: 1; margin-bottom: 1.25rem; padding-right: 7rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                            <div style="background: rgba(255,255,255,0.25); padding: 0.75rem; border-radius: 0.75rem; backdrop-filter: blur(10px);">
                                <i class="fas fa-gift" style="font-size: 1.75rem;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 900; font-size: 1.75rem; letter-spacing: 1.5px; text-shadow: 0 3px 6px rgba(0,0,0,0.2); line-height: 1;">${code}</div>
                                <div style="font-size: 0.8rem; opacity: 0.9; margin-top: 0.25rem;">Promo Code</div>
                            </div>
                        </div>
                        <div style="font-size: 1.3rem; font-weight: 800; background: rgba(255,255,255,0.25); padding: 0.5rem 1rem; border-radius: 0.75rem; display: inline-block; backdrop-filter: blur(10px); box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                            <i class="fas fa-tag"></i> ${discountText}
                        </div>
                    </div>
                    
                    <!-- Description -->
                    <div style="position: relative; z-index: 1; font-size: 0.95rem; opacity: 0.95; margin-bottom: 1.25rem; line-height: 1.6; background: rgba(0,0,0,0.15); padding: 1rem; border-radius: 0.75rem; backdrop-filter: blur(5px);">
                        <i class="fas fa-info-circle"></i> ${description}
                    </div>
                    
                    <!-- Validity Period -->
                    <div style="position: relative; z-index: 1; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 0.75rem; margin-bottom: 1.25rem; backdrop-filter: blur(5px);">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <i class="fas fa-calendar-alt" style="font-size: 1.1rem;"></i>
                            <strong style="font-size: 0.9rem;">Valid Period:</strong>
                        </div>
                        <div style="display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.85rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-play-circle"></i>
                                <span>From: <strong>${validFromText}</strong></span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-stop-circle"></i>
                                <span>Until: <strong>${validUntilText}</strong></span>
                            </div>
                            ${isExpiringSoon ? `
                                <div style="background: rgba(255,193,7,0.95); color: #000; padding: 0.35rem 0.75rem; border-radius: 0.5rem; font-weight: 700; display: flex; align-items: center; gap: 0.35rem;">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <span>Expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}!</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- How to Avail -->
                    <div style="position: relative; z-index: 1; background: rgba(255,255,255,0.15); padding: 1rem; border-radius: 0.75rem; margin-bottom: 1.25rem; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                            <i class="fas fa-lightbulb" style="font-size: 1.1rem; color: #FCD34D;"></i>
                            <strong style="font-size: 0.95rem;">How to Avail:</strong>
                        </div>
                        <ol style="margin: 0; padding-left: 1.5rem; font-size: 0.85rem; line-height: 1.8; opacity: 0.95;">
                            <li>Browse products and add items to your cart</li>
                            <li>Proceed to checkout</li>
                            <li>Enter promo code "<strong>${code}</strong>" in the coupon field</li>
                            <li>Click "Apply" to get your discount</li>
                            <li>Complete your order and enjoy savings!</li>
                        </ol>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div style="position: relative; z-index: 1; display: flex; gap: 0.75rem; align-items: stretch;">
                        <button class="btn btn-sm" onclick="copyPromoCode('${code}')" style="background: rgba(255,255,255,0.95); color: ${buttonColor}; border: none; padding: 0.75rem 1.5rem; backdrop-filter: blur(10px); font-weight: 800; box-shadow: 0 3px 10px rgba(0,0,0,0.2); flex: 1; border-radius: 0.75rem; transition: all 0.2s;" onmouseover="this.style.background='white'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='rgba(255,255,255,0.95)'; this.style.transform='scale(1)'">
                            <i class="fas fa-copy"></i> Copy Code
                        </button>
                        <button class="btn btn-sm" onclick="switchTab('products')" style="background: rgba(255,255,255,0.2); color: white; border: 2px solid rgba(255,255,255,0.4); padding: 0.75rem 1.5rem; backdrop-filter: blur(10px); font-weight: 700; box-shadow: 0 3px 10px rgba(0,0,0,0.15); border-radius: 0.75rem; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'; this.style.transform='scale(1)'">
                            <i class="fas fa-shopping-cart"></i> Shop Now
                        </button>
                    </div>
                </div>
            `;
            }).join('');
        }
    }

    // Hide and remove admin-only sections for clients
    const adminQuickActions = document.getElementById('adminQuickActions');
    if (adminQuickActions) adminQuickActions.remove();

    const systemHealthCard = document.getElementById('systemHealthCard');
    if (systemHealthCard) systemHealthCard.remove();

    // Remove all admin widgets that might have been loaded previously
    const adminWidgets = [
        'topProductsWidget',
        'revenueGoalWidget',
        'smartInsightsWidget',
        'salesChartWidget',
        'temperatureWidget',
        'expiryTrackerWidget',
        'quickActionsWidget',
        'pendingActionsWidget'
    ];
    adminWidgets.forEach(widgetId => {
        const widget = document.getElementById(widgetId);
        if (widget) widget.remove();
    });

    // Also remove by class name for dynamically created widgets
    document.querySelectorAll('.top-products-widget, .revenue-goal-widget, .smart-insights-widget').forEach(el => el.remove());

    // DON'T hide the main Recent Activities card - it contains Recent Orders and Promotions for clients!
    // Only hide the old admin-specific recentActivities div if it exists
    const oldRecentActivitiesDiv = document.getElementById('recentActivities');
    if (oldRecentActivitiesDiv) {
        oldRecentActivitiesDiv.style.display = 'none';
    }

    // Render Order Tracking Timeline (Feature 1) - Insert after stats grid
    console.log('Attempting to render order tracking...');
    const orderTrackingHTML = renderOrderTracking(myOrders);
    if (orderTrackingHTML) {
        console.log('Order tracking HTML generated');
        const statsGrid = document.getElementById('statsGrid');
        if (statsGrid) {
            console.log('Inserting order tracking after stats grid');
            // Remove existing order tracking first
            const existingTracking = document.querySelector('.client-order-tracking');
            if (existingTracking) existingTracking.remove();
            statsGrid.insertAdjacentHTML('afterend', orderTrackingHTML);
        } else {
            console.error('Stats grid not found!');
        }
    } else {
        console.log('No active orders to track');
    }

    // Render Quick Reorder in left column (Feature 2)
    console.log('Attempting to render quick reorder...');
    const recentOrdersContainer = document.getElementById('recentOrders');
    if (recentOrdersContainer) {
        console.log('Recent orders container found');
        const quickReorderHTML = renderQuickReorder(myOrders, allProducts);
        if (quickReorderHTML) {
            console.log('Quick reorder HTML generated, inserting...');
            // Remove existing quick reorder first
            const existingReorder = document.querySelector('.client-quick-reorder');
            if (existingReorder) existingReorder.remove();
            recentOrdersContainer.insertAdjacentHTML('afterend', quickReorderHTML);
        } else {
            console.log('No quick reorder data (no order history)');
        }
    } else {
        console.error('Recent orders container not found!');
    }

    // Render Spending Summary in left column (Feature 3)
    const recentPayments = document.getElementById('recentPayments');
    if (recentPayments) {
        const spendingHTML = renderSpendingSummary(myOrders);
        if (spendingHTML) {
            // Replace the entire parent section with spending summary
            const parentDiv = recentPayments.closest('div');
            if (parentDiv) {
                const spendingContainer = document.createElement('div');
                spendingContainer.innerHTML = spendingHTML;
                parentDiv.replaceWith(spendingContainer.firstElementChild);
            }
        } else {
            recentPayments.innerHTML = `
                <div class="text-sm" style="color: var(--text-muted); padding: 2rem 1rem; text-align: center; background: var(--background); border-radius: 0.75rem; border: 2px dashed var(--border-color);">
                    <i class="fas fa-receipt" style="font-size: 3rem; opacity: 0.2; margin-bottom: 1rem; display: block;"></i>
                    <p style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">No Spending Data Yet</p>
                    <p style="font-size: 0.9rem;">Place your first order to see your spending summary!</p>
                    <button class="btn btn-primary btn-sm" onclick="switchTab('products')" style="margin-top: 1rem;">
                        <i class="fas fa-shopping-cart"></i> Start Shopping
                    </button>
                </div>
            `;
        }
    }

    // Render Recommended Products in right column (Feature 5)
    const inventoryAlerts = document.getElementById('inventoryAlerts');
    if (inventoryAlerts) {
        const recommendedHTML = renderRecommendedProducts(myOrders, allProducts);
        if (recommendedHTML) {
            // Replace the entire parent section with recommended products
            const parentDiv = inventoryAlerts.closest('div');
            if (parentDiv) {
                const recommendedContainer = document.createElement('div');
                recommendedContainer.innerHTML = recommendedHTML;
                parentDiv.replaceWith(recommendedContainer.firstElementChild);
            }
        } else {
            inventoryAlerts.innerHTML = `
                <div class="text-sm" style="color: var(--text-muted); padding: 2rem 1rem; text-align: center; background: var(--background); border-radius: 0.75rem; border: 2px dashed var(--border-color);">
                    <i class="fas fa-lightbulb" style="font-size: 3rem; opacity: 0.2; margin-bottom: 1rem; display: block;"></i>
                    <p style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">Discover Products</p>
                    <p style="font-size: 0.9rem;">Start shopping to get personalized recommendations!</p>
                    <button class="btn btn-primary btn-sm" onclick="switchTab('products')" style="margin-top: 1rem;">
                        <i class="fas fa-shopping-cart"></i> Browse Products
                    </button>
                </div>
            `;
        }
    }

    // Hide "Recently Viewed" section for clients (not implemented yet)
    const recentlyViewed = document.getElementById('recentlyViewed');
    if (recentlyViewed) {
        const recentlyViewedHeader = recentlyViewed.previousElementSibling;
        if (recentlyViewedHeader && recentlyViewedHeader.tagName === 'H4') {
            recentlyViewedHeader.style.display = 'none';
        }
        recentlyViewed.style.display = 'none';
    }

    // Update section headers to be more client-friendly
    const orderHeader = document.querySelector('h4 i.fa-shopping-cart');
    if (orderHeader && orderHeader.parentElement) {
        orderHeader.parentElement.innerHTML = '<i class="fas fa-shopping-bag"></i> My Recent Orders';
    }

    const promoHeader = document.querySelector('h4 i.fa-tags');
    if (promoHeader && promoHeader.parentElement) {
        promoHeader.parentElement.innerHTML = '<i class="fas fa-gift"></i> Special Offers for You';
    }

    // Store loyalty points in localStorage for persistence
    const loyaltyPoints = calculateLoyaltyPoints(myOrders);
    localStorage.setItem('loyaltyPoints', loyaltyPoints.toString());
}

// Helper function to get order status color
function getOrderStatusColor(status) {
    const colors = {
        'pending': '#f59e0b',
        'processing': '#3b82f6',
        'shipped': '#8b5cf6',
        'delivered': '#10b981',
        'completed': '#10b981',
        'cancelled': '#ef4444'
    };
    return colors[status] || '#6b7280';
}

// Helper function to get order status badge class
function getOrderStatusBadge(status) {
    const badges = {
        'pending': 'badge-warning',
        'processing': 'badge-info',
        'shipped': 'badge-primary',
        'delivered': 'badge-success',
        'completed': 'badge-success',
        'cancelled': 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
}

// Copy promo code to clipboard
function copyPromoCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showToast(`Promo code "${code}" copied to clipboard!`, 'success');
    }).catch(() => {
        showToast('Failed to copy promo code', 'error');
    });
}

// View order details
function viewOrderDetails(orderId) {
    switchTab('orders');
    // Optionally scroll to or highlight the specific order
    setTimeout(() => {
        const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
        if (orderElement) {
            orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            orderElement.style.animation = 'pulse 1s ease-in-out';
        }
    }, 300);
}

// ============================================================================
// ENHANCED CLIENT OVERVIEW FEATURES - ALL REAL DATA, NO DEMO, 100% FREE
// ============================================================================

// Render Order Tracking Timeline
function renderOrderTracking(myOrders) {
    const activeOrders = myOrders.filter(o =>
        o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled'
    );

    if (activeOrders.length === 0) return '';

    return `
        <div class="card client-order-tracking" style="margin-bottom: 1.5rem;">
            <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-truck"></i> Track Your Active Orders</h3>
            ${activeOrders.slice(0, 2).map(order => renderOrderTimeline(order)).join('')}
        </div>
    `;
}

// Render individual order timeline
function renderOrderTimeline(order) {
    const stages = [
        { key: 'pending', label: 'Placed', icon: 'check' },
        { key: 'processing', label: 'Confirmed', icon: 'cog' },
        { key: 'shipped', label: 'Shipped', icon: 'box' },
        { key: 'out_for_delivery', label: 'Transit', icon: 'truck' },
        { key: 'delivered', label: 'Delivered', icon: 'home' }
    ];

    const currentStageIndex = stages.findIndex(s => s.key === order.status);
    const estimatedDelivery = order.estimated_delivery ||
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString();

    return `
        <div style="padding: 1.5rem; background: var(--background); border-radius: 0.75rem; margin-bottom: 1rem; border: 1px solid var(--border);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div>
                    <strong style="font-size: 1.1rem;">${order.order_id || order._id}</strong>
                    <div style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem;">
                        ${order.items?.length || 0} items • ₱${order.total_amount?.toFixed(2) || '0.00'}
                    </div>
                </div>
                <span class="badge ${getOrderStatusBadge(order.status)}">${order.status}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 1.5rem 0; position: relative;">
                ${stages.map((stage, index) => `
                    <div style="flex: 1; text-align: center; position: relative; z-index: 1;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; margin: 0 auto 0.5rem; display: flex; align-items: center; justify-content: center; 
                            background: ${index <= currentStageIndex ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e5e7eb'}; 
                            color: ${index <= currentStageIndex ? 'white' : '#9ca3af'}; font-size: 1.2rem;">
                            <i class="fas fa-${stage.icon}"></i>
                        </div>
                        <div style="font-size: 0.75rem; color: ${index <= currentStageIndex ? 'var(--text-primary)' : 'var(--text-muted)'}; font-weight: ${index === currentStageIndex ? '600' : '400'};">
                            ${stage.label}
                        </div>
                    </div>
                    ${index < stages.length - 1 ? `
                        <div style="flex: 1; height: 3px; background: ${index < currentStageIndex ? '#10b981' : '#e5e7eb'}; margin: 0 -10px; margin-top: -30px; z-index: 0;"></div>
                    ` : ''}
                `).join('')}
            </div>
            
            <div style="background: var(--card-bg); padding: 1rem; border-radius: 0.5rem; margin-top: 1rem;">
                <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                    <i class="fas fa-clock"></i> Estimated delivery: <strong>${estimatedDelivery}</strong>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button class="btn btn-sm btn-primary" onclick="viewOrderDetails('${order._id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="switchTab('orders')">
                        <i class="fas fa-phone"></i> Contact Support
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Render Quick Reorder Section
function renderQuickReorder(myOrders, allProducts) {
    // Get most frequently ordered products
    const productCounts = {};
    myOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const productId = item.product_id || item.product;
                if (productId) {
                    productCounts[productId] = (productCounts[productId] || 0) + 1;
                }
            });
        }
    });

    // Sort by frequency and get top 3
    const topProductIds = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id);

    const topProducts = topProductIds
        .map(id => allProducts.find(p => p._id === id))
        .filter(p => p);

    if (topProducts.length === 0) return '';

    return `
        <div class="client-quick-reorder" style="margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 1rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-redo"></i> Quick Reorder
            </h4>
            ${topProducts.map(product => `
                <div style="padding: 1rem; background: var(--background); border-radius: 0.5rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${product.name}</strong>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
                            ₱${product.price?.toFixed(2) || '0.00'} • 
                            <span style="color: var(--warning);">⭐ You bought ${productCounts[product._id]}x</span>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="addToCartQuick('${product._id}', '${product.name}', ${product.price})">
                        <i class="fas fa-plus"></i> Add to Cart
                    </button>
                </div>
            `).join('')}
            <button class="btn btn-outline btn-sm" onclick="switchTab('products')" style="width: 100%; margin-top: 0.5rem;">
                <i class="fas fa-history"></i> View Order History
            </button>
        </div>
    `;
}

// Render Recommended Products
function renderRecommendedProducts(myOrders, allProducts) {
    // Get categories from past orders
    const orderedCategories = new Set();
    myOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const product = allProducts.find(p => p._id === (item.product_id || item.product));
                if (product && product.category) {
                    orderedCategories.add(product.category);
                }
            });
        }
    });

    // Get products from same categories that user hasn't ordered
    const orderedProductIds = new Set();
    myOrders.forEach(order => {
        if (order.items) {
            order.items.forEach(item => orderedProductIds.add(item.product_id || item.product));
        }
    });

    const recommended = allProducts
        .filter(p => orderedCategories.has(p.category) && !orderedProductIds.has(p._id) && p.stock > 0)
        .slice(0, 4);

    if (recommended.length === 0) return '';

    return `
        <div style="margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 1rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-lightbulb"></i> Recommended for You
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem;">
                ${recommended.map(product => `
                    <div style="padding: 1rem; background: var(--background); border-radius: 0.5rem; text-align: center; border: 1px solid var(--border);">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">${getCategoryIcon(product.category)}</div>
                        <strong style="font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">${product.name}</strong>
                        <div style="color: var(--primary); font-weight: 600; margin-bottom: 0.75rem;">₱${product.price?.toFixed(2) || '0.00'}</div>
                        <button class="btn btn-sm btn-primary" onclick="addToCartQuick('${product._id}', '${product.name}', ${product.price})" style="width: 100%; font-size: 0.8rem;">
                            <i class="fas fa-cart-plus"></i> Add
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Render Spending Summary
function renderSpendingSummary(myOrders) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate this month's spending
    const thisMonthOrders = myOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === currentMonth &&
            orderDate.getFullYear() === currentYear &&
            (order.status === 'delivered' || order.status === 'completed');
    });

    const thisMonthSpending = thisMonthOrders.reduce((sum, order) =>
        sum + (order.total_amount || 0), 0
    );

    // Calculate last 6 months
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const monthOrders = myOrders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate.getMonth() === date.getMonth() &&
                orderDate.getFullYear() === date.getFullYear() &&
                (order.status === 'delivered' || order.status === 'completed');
        });
        const total = monthOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        last6Months.push({
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            total: total
        });
    }

    const maxSpending = Math.max(...last6Months.map(m => m.total), 1);

    // Calculate category breakdown
    const categoryTotals = {};
    thisMonthOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const category = item.category || 'Other';
                categoryTotals[category] = (categoryTotals[category] || 0) + (item.price * item.quantity || 0);
            });
        }
    });

    const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    return `
        <div style="margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 1rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-chart-line"></i> Your Spending This Month
            </h4>
            <div style="padding: 1.5rem; background: var(--background); border-radius: 0.75rem; border: 1px solid var(--border);">
                <div style="font-size: 2rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">
                    ₱${thisMonthSpending.toFixed(2)}
                </div>
                <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">
                    Total spent in ${now.toLocaleDateString('en-US', { month: 'long' })}
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">Last 6 Months Trend</div>
                    <div style="display: flex; align-items: flex-end; gap: 0.5rem; height: 60px;">
                        ${last6Months.map(month => `
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                                <div style="width: 100%; background: linear-gradient(to top, var(--primary), var(--primary-light)); border-radius: 4px 4px 0 0; height: ${(month.total / maxSpending) * 100}%;"></div>
                                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.25rem;">${month.month}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${topCategories.length > 0 ? `
                    <div style="padding-top: 1rem; border-top: 1px solid var(--border);">
                        <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem;">Top Categories</div>
                        ${topCategories.map(([category, total]) => {
        const percentage = (total / thisMonthSpending * 100).toFixed(0);
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        return `
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding: 0.5rem; background: var(--card-bg); border-radius: 0.5rem;">
                                    <span style="font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas ${getCategoryIcon(category)}" style="color: var(--primary);"></i>
                                        ${categoryName}
                                    </span>
                                    <span style="font-weight: 600; color: var(--text-primary);">₱${total.toFixed(2)} <span style="color: var(--text-muted); font-size: 0.85rem;">(${percentage}%)</span></span>
                                </div>
                            `;
    }).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Show Loyalty Rewards Modal
async function showLoyaltyRewards() {
    // Recalculate loyalty points from fresh order data
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders?limit=1000`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const orders = data.orders || [];
            const freshPoints = calculateLoyaltyPoints(orders);
            localStorage.setItem('loyaltyPoints', freshPoints.toString());
            console.log('🎁 Loyalty points recalculated:', freshPoints);
        }
    } catch (error) {
        console.error('Failed to recalculate loyalty points:', error);
    }

    const loyaltyPoints = parseInt(localStorage.getItem('loyaltyPoints') || '0');

    const rewards = [
        { name: '₱50 OFF', points: 500, icon: 'ticket-alt' },
        { name: '₱100 OFF', points: 1000, icon: 'gift' },
        { name: '₱200 OFF', points: 2000, icon: 'star' },
        { name: 'Free Delivery', points: 300, icon: 'truck' }
    ];

    const modalHTML = `
        <div class="modal-overlay" id="loyaltyModal" onclick="closeLoyaltyModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-gift"></i> Your Loyalty Rewards</h2>
                    <button class="modal-close" onclick="closeLoyaltyModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; padding: 2rem; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 0.75rem; color: white; margin-bottom: 1.5rem;">
                        <div style="font-size: 3rem; font-weight: 700; margin-bottom: 0.5rem;">${loyaltyPoints}</div>
                        <div style="font-size: 1.1rem; opacity: 0.9;">Available Points</div>
                        <div style="font-size: 0.9rem; opacity: 0.75; margin-top: 0.5rem;">Earn 1 point for every ₱10 spent</div>
                    </div>
                    
                    <h3 style="margin-bottom: 1rem;">Available Rewards</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem;">
                        ${rewards.map(reward => {
        const canRedeem = loyaltyPoints >= reward.points;
        const pointsNeeded = reward.points - loyaltyPoints;
        return `
                                <div style="padding: 1.5rem; background: var(--background); border-radius: 0.75rem; text-align: center; border: 2px solid ${canRedeem ? 'var(--success)' : 'var(--border)'};">
                                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem; color: ${canRedeem ? 'var(--success)' : 'var(--text-muted)'};">
                                        <i class="fas fa-${reward.icon}"></i>
                                    </div>
                                    <div style="font-weight: 600; margin-bottom: 0.5rem;">${reward.name}</div>
                                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">${reward.points} pts</div>
                                    ${canRedeem ?
                `<button class="btn btn-sm btn-success" onclick="redeemReward('${reward.name}', ${reward.points})" style="width: 100%;">Redeem</button>` :
                `<div style="font-size: 0.75rem; color: var(--text-muted);">${pointsNeeded} more pts</div>`
            }
                                </div>
                            `;
    }).join('')}
                    </div>
                    
                    <div style="margin-top: 1.5rem; padding: 1rem; background: var(--card-bg); border-radius: 0.5rem; text-align: center;">
                        <div style="font-size: 0.9rem; color: var(--text-muted);">
                            <i class="fas fa-info-circle"></i> Points are earned on completed orders and never expire!
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeLoyaltyModal() {
    const modal = document.getElementById('loyaltyModal');
    if (modal) modal.remove();
}

function redeemReward(rewardName, points) {
    const currentPoints = parseInt(localStorage.getItem('loyaltyPoints') || '0');
    if (currentPoints >= points) {
        localStorage.setItem('loyaltyPoints', (currentPoints - points).toString());
        showToast(`Successfully redeemed ${rewardName}! Check your promotions.`, 'success');
        closeLoyaltyModal();
        loadClientDashboard(); // Refresh dashboard
    } else {
        showToast('Not enough points to redeem this reward', 'error');
    }
}

// Add to cart quick function
function addToCartQuick(productId, productName, price) {
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: price,
            quantity: 1
        });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    showToast(`${productName} added to cart!`, 'success');
    loadClientDashboard(); // Refresh to update cart count
}

// Get category icon
function getCategoryIcon(category) {
    const icons = {
        'chicken': '🍗',
        'beef': '🥩',
        'pork': '🥓',
        'seafood': '🐟',
        'vegetables': '🥦',
        'dairy': '🧀',
        'processed': '🍖',
        'other': '📦'
    };
    return icons[category?.toLowerCase()] || '📦';
}

// Load enhanced dashboard widgets (Top Products, Revenue Goal, Smart Insights)
async function loadEnhancedDashboardWidgets() {
    const role = (currentUser?.role || 'client').toLowerCase();

    // Only show for admin/staff
    if (role === 'admin' || role === 'staff' || role === 'b2b') {
        await Promise.all([
            loadSalesChart(),
            loadTemperatureMonitoring(),
            loadExpiryTracker(),
            loadQuickActions(),
            loadInventoryAlerts(),
            loadTopProducts(),
            loadRevenueGoal(),
            loadSmartInsights(),
            loadPendingActions()
        ]);
    }
}

// Load Top 5 Products Widget
async function loadTopProducts() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/analytics/detailed?days=30`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            renderTopProducts(data.data.topProducts || []);
        }
    } catch (error) {
        console.log('Top products widget not available');
    }
}

// Render Top Products Widget
function renderTopProducts(products) {
    const container = document.getElementById('topProductsWidget');
    if (!container) {
        // Create widget if it doesn't exist
        const overviewSection = document.getElementById('overviewSection');
        const statsGrid = document.getElementById('statsGrid');
        if (overviewSection && statsGrid) {
            const widget = document.createElement('div');
            widget.id = 'topProductsWidget';
            widget.className = 'top-products-widget';
            statsGrid.insertAdjacentElement('afterend', widget);
        } else {
            return;
        }
    }

    const widgetContainer = document.getElementById('topProductsWidget');
    if (!widgetContainer) return;

    if (!products || products.length === 0) {
        widgetContainer.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title"><i class="fas fa-trophy"></i> Top 5 Products</h3>
            </div>
            <p style="color: var(--text-muted); text-align: center;">No sales data available yet</p>
        `;
        return;
    }

    const topFive = products.slice(0, 5);
    widgetContainer.innerHTML = `
        <div class="widget-header">
            <h3 class="widget-title"><i class="fas fa-trophy"></i> Top 5 Products (Last 30 Days)</h3>
            <button class="export-btn" onclick="exportTopProducts()">
                <i class="fas fa-download"></i> Export
            </button>
        </div>
        ${topFive.map((product, index) => `
            <div class="product-rank-item">
                <div class="rank-badge rank-${index + 1 <= 3 ? index + 1 : 'other'}">
                    ${index + 1}
                </div>
                <div class="product-rank-info">
                    <div class="product-rank-name">${product.name || 'Unknown Product'}</div>
                    <div class="product-rank-stats">
                        ${product.unitsSold || 0} units sold
                        ${product.growth ? `<span style="color: ${product.growth >= 0 ? 'var(--success)' : 'var(--error)'}; margin-left: 0.5rem;">
                            <i class="fas fa-arrow-${product.growth >= 0 ? 'up' : 'down'}"></i> ${Math.abs(product.growth)}%
                        </span>` : ''}
                    </div>
                </div>
                <div class="product-rank-revenue">
                    ₱${(product.revenue || 0).toLocaleString()}
                </div>
            </div>
        `).join('')}
    `;
}

// Load Revenue Goal Tracker
async function loadRevenueGoal() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/analytics/detailed?days=30`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const currentRevenue = data.data.revenueMetrics?.totalRevenue || 0;
            const monthlyGoal = 100000; // Default goal, can be made configurable
            renderRevenueGoal(currentRevenue, monthlyGoal);
        }
    } catch (error) {
        console.log('Revenue goal widget not available');
    }
}

// Render Revenue Goal Widget
function renderRevenueGoal(current, goal) {
    const container = document.getElementById('revenueGoalWidget');
    if (!container) {
        // Create widget
        const topProductsWidget = document.getElementById('topProductsWidget');
        if (topProductsWidget) {
            const widget = document.createElement('div');
            widget.id = 'revenueGoalWidget';
            widget.className = 'revenue-goal-widget';
            topProductsWidget.insertAdjacentElement('afterend', widget);
        } else {
            return;
        }
    }

    const widgetContainer = document.getElementById('revenueGoalWidget');
    if (!widgetContainer) return;

    const percentage = Math.min((current / goal) * 100, 100);
    const remaining = Math.max(goal - current, 0);
    const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();

    widgetContainer.innerHTML = `
        <div class="goal-header">
            <div class="goal-title">Monthly Revenue Goal</div>
            <div style="font-size: 0.875rem; opacity: 0.8;">${daysLeft} days left</div>
        </div>
        <div class="goal-amount">₱${current.toLocaleString()}</div>
        <div class="goal-target">of ₱${goal.toLocaleString()} goal</div>
        <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="goal-stats">
            <span><i class="fas fa-check-circle"></i> ${percentage.toFixed(1)}% Complete</span>
            <span><i class="fas fa-target"></i> ₱${remaining.toLocaleString()} to go</span>
        </div>
    `;
}

// Load Smart Insights
async function loadSmartInsights() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/analytics/smart-insights`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            renderSmartInsights(data.data || []);
        }
    } catch (error) {
        console.log('Smart insights not available');
    }
}

// Render Smart Insights Widget
function renderSmartInsights(insights) {
    const container = document.getElementById('smartInsightsWidget');
    if (!container) {
        // Create widget
        const revenueGoalWidget = document.getElementById('revenueGoalWidget');
        if (revenueGoalWidget) {
            const widget = document.createElement('div');
            widget.id = 'smartInsightsWidget';
            widget.className = 'smart-insights-widget';
            revenueGoalWidget.insertAdjacentElement('afterend', widget);
        } else {
            return;
        }
    }

    const widgetContainer = document.getElementById('smartInsightsWidget');
    if (!widgetContainer) return;

    if (!insights || insights.length === 0) {
        widgetContainer.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title"><i class="fas fa-lightbulb"></i> Smart Insights</h3>
            </div>
            <p style="color: var(--text-muted); text-align: center;">No insights available yet. Start processing orders to see recommendations.</p>
        `;
        return;
    }

    widgetContainer.innerHTML = `
        <div class="widget-header">
            <h3 class="widget-title"><i class="fas fa-lightbulb"></i> Smart Insights & Recommendations</h3>
        </div>
        ${insights.slice(0, 5).map(insight => `
            <div class="insight-item insight-${insight.color || 'info'}">
                <div class="insight-icon icon-${insight.color || 'info'}">
                    <i class="fas ${insight.icon || 'fa-info-circle'}"></i>
                </div>
                <div class="insight-content">
                    <div class="insight-title">${insight.title}</div>
                    <div class="insight-message">${insight.message}</div>
                    ${insight.action ? `
                        <div class="insight-action" onclick="handleInsightAction('${insight.action}', '${insight.actionParam || ''}')">
                            ${insight.actionLabel} <i class="fas fa-arrow-right"></i>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('')}
    `;
}

// Handle insight action clicks
function handleInsightAction(action, param) {
    if (action === 'switchTab') {
        switchTab(param);
    } else if (action === 'createPurchaseOrder') {
        switchTab('inventory');
        showToast('Navigate to inventory to create purchase order', 'info');
    } else if (action === 'createWeekendPromotion') {
        switchTab('promotions');
        showToast('Create a weekend promotion to boost sales', 'info');
    }
}

// Load Pending Actions Counter
async function loadPendingActions() {
    try {
        const token = localStorage.getItem('token');
        const Order = await fetch(`${API_BASE_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (Order.ok) {
            const ordersData = await Order.json();
            const orders = ordersData.orders || [];

            const pendingOrders = orders.filter(o => o.status === 'pending').length;
            const lowStockCount = parseInt(document.querySelector('.stat-card-enhanced .stat-value')?.textContent || '0');

            renderPendingActions(pendingOrders, lowStockCount);
        }
    } catch (error) {
        console.log('Pending actions not available');
    }
}

// Render Pending Actions Widget
function renderPendingActions(pendingOrders, lowStock) {
    const totalPending = pendingOrders + lowStock;

    if (totalPending === 0) return; // Don't show if no pending actions

    const container = document.getElementById('pendingActionsWidget');
    if (!container) {
        // Create widget
        const smartInsightsWidget = document.getElementById('smartInsightsWidget');
        if (smartInsightsWidget) {
            const widget = document.createElement('div');
            widget.id = 'pendingActionsWidget';
            widget.className = 'pending-actions-widget';
            widget.onclick = () => switchTab('orders');
            smartInsightsWidget.insertAdjacentElement('afterend', widget);
        } else {
            return;
        }
    }

    const widgetContainer = document.getElementById('pendingActionsWidget');
    if (!widgetContainer) return;

    widgetContainer.innerHTML = `
        <div class="pending-count">${totalPending}</div>
        <div class="pending-label">Pending Actions Required</div>
        <div class="pending-details">
            <div class="pending-detail-item">
                <i class="fas fa-shopping-cart"></i>
                <span>${pendingOrders} Orders to Process</span>
            </div>
            <div class="pending-detail-item">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${lowStock} Low Stock Alerts</span>
            </div>
        </div>
    `;
}

// Export Top Products to CSV
function exportTopProducts() {
    const products = [];
    document.querySelectorAll('.product-rank-item').forEach((item, index) => {
        const name = item.querySelector('.product-rank-name')?.textContent || '';
        const stats = item.querySelector('.product-rank-stats')?.textContent || '';
        const revenue = item.querySelector('.product-rank-revenue')?.textContent || '';
        products.push({ rank: index + 1, name, stats, revenue });
    });

    const csv = [
        ['Rank', 'Product Name', 'Units Sold', 'Revenue'],
        ...products.map(p => [p.rank, p.name, p.stats, p.revenue])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `top-products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('Top products exported successfully!', 'success');
}

// ============================================================================
// NEW FEATURES: Sales Chart, Temperature, Expiry, Quick Actions, Inventory Alerts
// ============================================================================

// 1. SALES CHART - Visual trend of sales over time
let salesChart = null;

async function loadSalesChart() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/analytics/detailed?days=30`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            renderSalesChart(data.data.salesTrend || {});
        }
    } catch (error) {
        console.log('Sales chart not available');
    }
}

function renderSalesChart(salesData) {
    const container = document.getElementById('salesChartWidget');
    if (!container) {
        const statsGrid = document.getElementById('statsGrid');
        if (statsGrid) {
            const widget = document.createElement('div');
            widget.id = 'salesChartWidget';
            widget.className = 'sales-chart-widget';
            statsGrid.insertAdjacentElement('afterend', widget);
        } else {
            return;
        }
    }

    const widgetContainer = document.getElementById('salesChartWidget');
    if (!widgetContainer) return;

    widgetContainer.innerHTML = `
        <div class="widget-header">
            <h3 class="widget-title"><i class="fas fa-chart-line"></i> Sales Trend</h3>
            <div class="chart-controls">
                <button class="chart-btn active" onclick="changeSalesChartPeriod(7)">7 Days</button>
                <button class="chart-btn" onclick="changeSalesChartPeriod(30)">30 Days</button>
                <button class="chart-btn" onclick="changeSalesChartPeriod(90)">90 Days</button>
            </div>
        </div>
        <div class="chart-container">
            <canvas id="salesChartCanvas"></canvas>
        </div>
    `;

    const ctx = document.getElementById('salesChartCanvas');
    if (!ctx) return;

    // Destroy existing chart if any
    if (salesChart) {
        salesChart.destroy();
    }

    // Create new chart with real data
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: salesData.labels || [],
            datasets: [{
                label: 'Sales (₱)',
                data: salesData.data || [],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: function (context) {
                            return '₱' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '₱' + value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

async function changeSalesChartPeriod(days) {
    // Update button states
    document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/analytics/detailed?days=${days}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            renderSalesChart(data.data.salesTrend || {});
        }
    } catch (error) {
        console.log('Failed to update chart');
    }
}

// 2. TEMPERATURE MONITORING - Critical for frozen food business
async function loadTemperatureMonitoring() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products?isActive=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const products = data.products || [];
            renderTemperatureMonitoring(products);
        }
    } catch (error) {
        console.log('Temperature monitoring not available');
    }
}

function renderTemperatureMonitoring(products) {
    const container = document.getElementById('temperatureWidget');
    if (!container) {
        const salesChartWidget = document.getElementById('salesChartWidget');
        if (salesChartWidget) {
            const widget = document.createElement('div');
            widget.id = 'temperatureWidget';
            widget.className = 'temperature-widget';
            salesChartWidget.insertAdjacentElement('afterend', widget);
        } else {
            return;
        }
    }

    const widgetContainer = document.getElementById('temperatureWidget');
    if (!widgetContainer) return;

    // Group products by storage location and get temperature stats
    const tempData = {};
    products.forEach(product => {
        const location = product.storage?.location || 'Main Freezer';
        const temp = product.storage?.temperature || -18;

        if (!tempData[location]) {
            tempData[location] = {
                location,
                temps: [],
                products: 0
            };
        }
        tempData[location].temps.push(temp);
        tempData[location].products++;
    });

    // Calculate average temperature for each location
    const tempCards = Object.values(tempData).map(data => {
        const avgTemp = data.temps.reduce((a, b) => a + b, 0) / data.temps.length;
        const status = avgTemp <= -15 ? 'normal' : avgTemp <= -10 ? 'warning' : 'critical';
        const statusText = avgTemp <= -15 ? 'Optimal' : avgTemp <= -10 ? 'Warning' : 'Critical';

        return {
            location: data.location,
            temp: avgTemp.toFixed(1),
            status,
            statusText,
            products: data.products
        };
    });

    if (tempCards.length === 0) {
        widgetContainer.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title"><i class="fas fa-thermometer-half"></i> Temperature Monitoring</h3>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-thermometer-half"></i></div>
                <div class="empty-state-text">No temperature data available. Add storage information to products.</div>
            </div>
        `;
        return;
    }

    widgetContainer.innerHTML = `
        <div class="widget-header">
            <h3 class="widget-title"><i class="fas fa-thermometer-half"></i> Temperature Monitoring</h3>
            <span style="font-size: 0.875rem; color: var(--text-muted);">
                <i class="fas fa-sync-alt"></i> Updated just now
            </span>
        </div>
        <div class="temp-grid">
            ${tempCards.map(card => `
                <div class="temp-card temp-${card.status}">
                    <div class="temp-label">${card.location}</div>
                    <div class="temp-value temp-${card.status}">
                        <i class="fas fa-thermometer-${card.status === 'critical' ? 'full' : card.status === 'warning' ? 'half' : 'empty'}"></i>
                        ${card.temp}°C
                    </div>
                    <div class="temp-status status-${card.status}">${card.statusText}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">
                        ${card.products} products stored
                    </div>
                </div>
            `).join('')}
        </div>
        ${tempCards.some(c => c.status !== 'normal') ? `
            <div style="margin-top: 1rem; padding: 1rem; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius); border-left: 4px solid var(--error);">
                <strong style="color: var(--error);"><i class="fas fa-exclamation-triangle"></i> Alert:</strong>
                <span style="color: var(--text); margin-left: 0.5rem;">Some storage areas have temperature issues. Check immediately!</span>
            </div>
        ` : ''}
    `;
}

// 3. EXPIRY TRACKER - Reduce waste and increase profit
async function loadExpiryTracker() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products?isActive=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const products = data.products || [];
            console.log('Expiry Tracker - Total products:', products.length);
            console.log('Expiry Tracker - Products with batchInfo:', products.filter(p => p.batchInfo && p.batchInfo.length > 0).length);
            renderExpiryTracker(products);
        } else {
            console.error('Failed to load products for expiry tracker:', response.status);
        }
    } catch (error) {
        console.error('Expiry tracker error:', error);
    }
}

function renderExpiryTracker(products) {
    const container = document.getElementById('expiryTrackerWidget');
    if (!container) {
        const temperatureWidget = document.getElementById('temperatureWidget');
        if (temperatureWidget) {
            const widget = document.createElement('div');
            widget.id = 'expiryTrackerWidget';
            widget.className = 'expiry-tracker-widget';
            temperatureWidget.insertAdjacentElement('afterend', widget);
        } else {
            return;
        }
    }

    const widgetContainer = document.getElementById('expiryTrackerWidget');
    if (!widgetContainer) return;

    // Find products with expiry dates (from batchInfo OR calculated from shelf life)
    const expiringProducts = [];
    const now = new Date();

    products.forEach(product => {
        // Method 1: Check batchInfo for explicit expiry dates
        if (product.batchInfo && product.batchInfo.length > 0) {
            product.batchInfo.forEach(batch => {
                if (batch.expiryDate) {
                    const expiryDate = new Date(batch.expiryDate);
                    const daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

                    if (daysToExpiry <= 30 && daysToExpiry > 0) {
                        expiringProducts.push({
                            name: product.name,
                            batchNumber: batch.batchNumber,
                            expiryDate: expiryDate,
                            daysToExpiry: daysToExpiry,
                            quantity: batch.quantity || product.stock || 0,
                            productId: product._id,
                            severity: daysToExpiry <= 3 ? 'critical' : daysToExpiry <= 7 ? 'warning' : 'soon'
                        });
                    }
                } else if (batch.receivedDate && product.storage?.shelfLife) {
                    // Calculate expiry from received date + shelf life
                    const receivedDate = new Date(batch.receivedDate);
                    const expiryDate = new Date(receivedDate.getTime() + product.storage.shelfLife * 24 * 60 * 60 * 1000);
                    const daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

                    if (daysToExpiry <= 30 && daysToExpiry > 0) {
                        expiringProducts.push({
                            name: product.name,
                            batchNumber: batch.batchNumber || 'N/A',
                            expiryDate: expiryDate,
                            daysToExpiry: daysToExpiry,
                            quantity: batch.quantity || product.stock || 0,
                            productId: product._id,
                            severity: daysToExpiry <= 3 ? 'critical' : daysToExpiry <= 7 ? 'warning' : 'soon',
                            calculated: true
                        });
                    }
                }
            });
        }
        // Method 2: If no batchInfo, calculate from product creation date + shelf life
        else if (product.storage?.shelfLife && product.createdAt) {
            const createdDate = new Date(product.createdAt);
            const expiryDate = new Date(createdDate.getTime() + product.storage.shelfLife * 24 * 60 * 60 * 1000);
            const daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

            if (daysToExpiry <= 30 && daysToExpiry > 0) {
                expiringProducts.push({
                    name: product.name,
                    batchNumber: 'Auto',
                    expiryDate: expiryDate,
                    daysToExpiry: daysToExpiry,
                    quantity: product.stock || 0,
                    productId: product._id,
                    severity: daysToExpiry <= 3 ? 'critical' : daysToExpiry <= 7 ? 'warning' : 'soon',
                    calculated: true
                });
            }
        }
    });

    // Sort by days to expiry
    expiringProducts.sort((a, b) => a.daysToExpiry - b.daysToExpiry);

    console.log('Expiry Tracker - Expiring products found:', expiringProducts.length);

    if (expiringProducts.length === 0) {
        // Check if products have shelf life
        const productsWithShelfLife = products.filter(p => p.storage?.shelfLife);

        widgetContainer.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title"><i class="fas fa-calendar-times"></i> Expiry Tracker</h3>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-${productsWithShelfLife.length > 0 ? 'check-circle' : 'info-circle'}"></i></div>
                <div class="empty-state-text">
                    ${productsWithShelfLife.length > 0
                ? 'No products expiring in the next 30 days. Great job!'
                : 'No shelf life data found. Products need "Shelf Life (days)" to track expiry.<br><br>Your products already have this field when you add them!'
            }
                </div>
            </div>
        `;
        return;
    }

    widgetContainer.innerHTML = `
        <div class="widget-header">
            <h3 class="widget-title"><i class="fas fa-calendar-times"></i> Expiry Tracker</h3>
            <span style="font-size: 0.875rem; color: var(--error); font-weight: 600;">
                <i class="fas fa-exclamation-circle"></i> ${expiringProducts.length} items expiring soon
            </span>
        </div>
        ${expiringProducts.slice(0, 10).map(item => `
            <div class="expiry-item expiry-${item.severity}">
                <div class="expiry-icon icon-${item.severity}">
                    <i class="fas fa-${item.severity === 'critical' ? 'exclamation-triangle' : 'clock'}"></i>
                </div>
                <div class="expiry-info">
                    <div class="expiry-product-name">${item.name}</div>
                    <div class="expiry-details">
                        <span>Batch: ${item.batchNumber || 'N/A'}</span>
                        <span>Qty: ${item.quantity} units</span>
                        <span>Expires: ${item.expiryDate.toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="expiry-countdown countdown-${item.severity}">
                    ${item.daysToExpiry} day${item.daysToExpiry !== 1 ? 's' : ''}
                </div>
                <div class="expiry-actions">
                    <button class="expiry-action-btn btn-discount" onclick="createDiscountForExpiring('${item.productId}', ${item.daysToExpiry})">
                        <i class="fas fa-percentage"></i> Discount
                    </button>
                </div>
            </div>
        `).join('')}
        ${expiringProducts.length > 10 ? `
            <div style="text-align: center; margin-top: 1rem; color: var(--text-muted); font-size: 0.875rem;">
                +${expiringProducts.length - 10} more items expiring soon
            </div>
        ` : ''}
    `;
}

function createDiscountForExpiring(productId, daysToExpiry) {
    // Suggest discount based on urgency
    const discount = daysToExpiry <= 3 ? 50 : daysToExpiry <= 7 ? 30 : 20;
    showToast(`Suggested discount: ${discount}% off. Navigate to Promotions to create.`, 'info');
    setTimeout(() => switchTab('promotions'), 1500);
}

// 4. QUICK ACTIONS - Time-saving shortcuts
async function loadQuickActions() {
    try {
        const token = localStorage.getItem('token');

        // Get real counts from API
        const [ordersRes, productsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/orders`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE_URL}/products?isActive=true`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        let pendingOrders = 0;
        let lowStockCount = 0;
        let expiringCount = 0;

        if (ordersRes.ok) {
            const ordersData = await ordersRes.json();
            pendingOrders = (ordersData.orders || []).filter(o => o.status === 'pending').length;
        }

        if (productsRes.ok) {
            const productsData = await productsRes.json();
            const products = productsData.products || [];

            lowStockCount = products.filter(p => p.stock <= p.minStock).length;

            // Count expiring products
            const now = new Date();
            products.forEach(product => {
                if (product.batchInfo && product.batchInfo.length > 0) {
                    product.batchInfo.forEach(batch => {
                        if (batch.expiryDate) {
                            const daysToExpiry = Math.ceil((new Date(batch.expiryDate) - now) / (1000 * 60 * 60 * 24));
                            if (daysToExpiry <= 7 && daysToExpiry > 0) {
                                expiringCount++;
                            }
                        }
                    });
                }
            });
        }

        renderQuickActions({ pendingOrders, lowStockCount, expiringCount });
    } catch (error) {
        console.log('Quick actions not available');
    }
}

function renderQuickActions(data) {
    const container = document.getElementById('quickActionsWidget');
    if (!container) {
        const expiryTrackerWidget = document.getElementById('expiryTrackerWidget');
        if (expiryTrackerWidget) {
            const widget = document.createElement('div');
            widget.id = 'quickActionsWidget';
            widget.className = 'quick-actions-widget';
            expiryTrackerWidget.insertAdjacentElement('afterend', widget);
        } else {
            return;
        }
    }

    const widgetContainer = document.getElementById('quickActionsWidget');
    if (!widgetContainer) return;

    widgetContainer.innerHTML = `
        <div class="widget-header">
            <h3 class="widget-title"><i class="fas fa-bolt"></i> Quick Actions</h3>
        </div>
        <div class="quick-actions-grid">
            <div class="quick-action-card action-warning" onclick="switchTab('orders')" style="cursor: pointer;">
                <div class="quick-action-icon"><i class="fas fa-shopping-cart"></i></div>
                <div class="quick-action-count">${data.pendingOrders || 0}</div>
                <div class="quick-action-label">Pending Orders</div>
                <div class="quick-action-sublabel">Click to process</div>
            </div>
            
            <div class="quick-action-card action-info" onclick="switchTab('inventory')" style="cursor: pointer;">
                <div class="quick-action-icon"><i class="fas fa-boxes"></i></div>
                <div class="quick-action-count">${data.lowStockCount || 0}</div>
                <div class="quick-action-label">Low Stock Items</div>
                <div class="quick-action-sublabel">Click to restock</div>
            </div>
            
            <div class="quick-action-card action-purple" onclick="switchTab('promotions')" style="cursor: pointer;">
                <div class="quick-action-icon"><i class="fas fa-percentage"></i></div>
                <div class="quick-action-count">${data.expiringCount || 0}</div>
                <div class="quick-action-label">Expiring Soon</div>
                <div class="quick-action-sublabel">Create discounts</div>
            </div>
            
            <div class="quick-action-card action-success" onclick="switchTab('analytics')" style="cursor: pointer;">
                <div class="quick-action-icon"><i class="fas fa-chart-bar"></i></div>
                <div class="quick-action-count"><i class="fas fa-eye"></i></div>
                <div class="quick-action-label">View Analytics</div>
                <div class="quick-action-sublabel">Business insights</div>
            </div>
        </div>
    `;
}

// 5. INVENTORY ALERTS - Prevent stockouts
async function loadInventoryAlerts() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products?isActive=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const products = data.products || [];
            renderInventoryAlerts(products);
        }
    } catch (error) {
        console.log('Inventory alerts not available');
    }
}

function renderInventoryAlerts(products) {
    const container = document.getElementById('inventoryAlertsWidget');
    if (!container) {
        const quickActionsWidget = document.getElementById('quickActionsWidget');
        if (quickActionsWidget) {
            const widget = document.createElement('div');
            widget.id = 'inventoryAlertsWidget';
            widget.className = 'inventory-alerts-widget';
            quickActionsWidget.insertAdjacentElement('afterend', widget);
        } else {
            return;
        }
    }

    const widgetContainer = document.getElementById('inventoryAlertsWidget');
    if (!widgetContainer) return;

    // Categorize products
    const outOfStock = products.filter(p => p.stock === 0);
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.minStock);
    const overStock = products.filter(p => p.maxStock && p.stock > p.maxStock);

    widgetContainer.innerHTML = `
        <div class="widget-header">
            <h3 class="widget-title"><i class="fas fa-warehouse"></i> Inventory Alerts</h3>
        </div>
        <div class="alert-tabs">
            <button class="alert-tab active" onclick="switchAlertTab('outOfStock')">
                Out of Stock
                ${outOfStock.length > 0 ? `<span class="alert-tab-badge">${outOfStock.length}</span>` : ''}
            </button>
            <button class="alert-tab" onclick="switchAlertTab('lowStock')">
                Low Stock
                ${lowStock.length > 0 ? `<span class="alert-tab-badge badge-warning">${lowStock.length}</span>` : ''}
            </button>
            <button class="alert-tab" onclick="switchAlertTab('overStock')">
                Overstocked
                ${overStock.length > 0 ? `<span class="alert-tab-badge badge-info">${overStock.length}</span>` : ''}
            </button>
        </div>
        
        <div id="outOfStock" class="alert-content active">
            ${outOfStock.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-check-circle"></i></div>
                    <div class="empty-state-text">No out of stock items. Great!</div>
                </div>
            ` : outOfStock.map(product => `
                <div class="alert-item alert-critical">
                    <div class="alert-item-icon icon-critical">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <div class="alert-item-info">
                        <div class="alert-item-name">${product.name}</div>
                        <div class="alert-item-details">
                            Category: ${product.category} • Min Stock: ${product.minStock}
                        </div>
                    </div>
                    <button class="alert-item-action" onclick="restockProduct('${product._id}')">
                        <i class="fas fa-plus"></i> Restock
                    </button>
                </div>
            `).join('')}
        </div>
        
        <div id="lowStock" class="alert-content">
            ${lowStock.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-check-circle"></i></div>
                    <div class="empty-state-text">No low stock items. All good!</div>
                </div>
            ` : lowStock.map(product => `
                <div class="alert-item alert-warning">
                    <div class="alert-item-icon icon-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="alert-item-info">
                        <div class="alert-item-name">${product.name}</div>
                        <div class="alert-item-details">
                            Current: ${product.stock} • Min: ${product.minStock} • Category: ${product.category}
                        </div>
                    </div>
                    <button class="alert-item-action" onclick="restockProduct('${product._id}')">
                        <i class="fas fa-plus"></i> Restock
                    </button>
                </div>
            `).join('')}
        </div>
        
        <div id="overStock" class="alert-content">
            ${overStock.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-check-circle"></i></div>
                    <div class="empty-state-text">No overstocked items.</div>
                </div>
            ` : overStock.map(product => `
                <div class="alert-item alert-info">
                    <div class="alert-item-icon icon-info">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="alert-item-info">
                        <div class="alert-item-name">${product.name}</div>
                        <div class="alert-item-details">
                            Current: ${product.stock} • Max: ${product.maxStock} • Consider promotion
                        </div>
                    </div>
                    <button class="alert-item-action" onclick="createPromotionForProduct('${product._id}')">
                        <i class="fas fa-percentage"></i> Promote
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

function switchAlertTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.alert-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // Update content
    document.querySelectorAll('.alert-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabId)?.classList.add('active');
}

function restockProduct(productId) {
    switchTab('inventory');
    showToast('Navigate to inventory to restock this product', 'info');
}

function createPromotionForProduct(productId) {
    switchTab('promotions');
    showToast('Create a promotion for this overstocked product', 'info');
}

// ============================================================================
// END OF NEW FEATURES
// ============================================================================

async function handleCreateStaff(e) {
    e.preventDefault();
    showLoading();

    const formData = new FormData(e.target);
    const permissions = Array.from(e.target.querySelectorAll('input[name="permissions"]:checked')).map(cb => cb.value);

    const staffData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        business_name: formData.get('business_name') || '',
        role: 'staff',
        permissions: permissions
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(staffData)
        });

        if (response.ok) {
            hideLoading();
            showToast('Staff account created successfully!', 'success');
            closeCreateStaffModal();
            e.target.reset();
        } else {
            const errorData = await response.json();
            hideLoading();
            showToast(errorData.message || 'Failed to create staff account', 'error');
        }
    } catch (error) {
        console.error('Error creating staff account:', error);
        hideLoading();
        showToast('Failed to create staff account. Please try again.', 'error');
    }
}

async function loadSectionData(section) {
    const token = localStorage.getItem('token');

    try {
        switch (section) {
            case 'products':
                await loadProducts();
                break;
            case 'orders':
                await loadOrders();
                break;
            case 'transactions':
                const transRole = (currentUser?.role || 'client').toLowerCase();
                if (transRole === 'client') {
                    await loadClientTransactions();
                } else {
                    await loadTransactions();
                }
                break;
            case 'inventory':
                await loadInventoryDashboard();
                break;
            case 'analytics':
                const analyticsRole = (currentUser?.role || 'client').toLowerCase();
                if (analyticsRole === 'client') {
                    await loadClientAnalytics();
                } else {
                    await loadAnalytics();
                }
                break;
            case 'promotions':
                await loadPromotions();
                break;
            case 'checkout':
                if (typeof renderCheckoutSummary === 'function') {
                    renderCheckoutSummary();
                }
                if (typeof autoFillCheckoutAddress === 'function') {
                    autoFillCheckoutAddress();
                }
                break;
        }
    } catch (error) {
        console.error(`Error loading ${section} data:`, error);
        showToast(`Failed to load ${section} data from server`, 'error');
    }
}

async function loadProducts(params = {}) {
    const token = localStorage.getItem('token');

    try {
        const url = new URL(`${API_BASE_URL}/products`);
        if (params.category) url.searchParams.set('category', params.category);
        if (params.search) url.searchParams.set('search', params.search);
        if (params.lowStock) url.searchParams.set('lowStock', params.lowStock);
        if (params.priceMin) url.searchParams.set('priceMin', params.priceMin);
        if (params.priceMax) url.searchParams.set('priceMax', params.priceMax);
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateProductsGrid(data.products);
            populateProductDropdowns(data.products);
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Global order filters
let currentOrderFilters = {
    search: '',
    status: 'all',
    sort: '-createdAt'
};

// Enhanced load orders with search and filters
async function loadOrders() {
    const token = localStorage.getItem('token');
    const role = (currentUser?.role || 'client').toLowerCase();

    try {
        // Build query params
        const params = new URLSearchParams();

        if (role === 'client') {
            params.append('mine', 'true');
        }

        if (currentOrderFilters.status !== 'all') {
            params.append('status', currentOrderFilters.status);
        }

        if (currentOrderFilters.search) {
            params.append('search', currentOrderFilters.search);
        }

        params.append('limit', '50'); // Get more orders for filtering

        const response = await fetch(`${API_BASE_URL}/orders?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            let orders = data.orders || [];

            // Client-side search if backend doesn't support it
            if (currentOrderFilters.search && orders.length > 0) {
                const searchLower = currentOrderFilters.search.toLowerCase();
                orders = orders.filter(order => {
                    const orderNum = (order.orderNumber || order._id || '').toLowerCase();
                    const customerName = (order.customer?.username || '').toLowerCase();
                    const customerEmail = (order.customer?.email || '').toLowerCase();
                    return orderNum.includes(searchLower) ||
                        customerName.includes(searchLower) ||
                        customerEmail.includes(searchLower);
                });
            }

            // Client-side sorting
            orders = sortOrders(orders, currentOrderFilters.sort);

            renderOrders(orders);
            updateStatusCounts(orders);
        } else {
            const errorData = await response.json();
            showToast(errorData.message || 'Failed to load orders', 'error');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Failed to load orders', 'error');
    }
}

// Sort orders
function sortOrders(orders, sortBy) {
    const sorted = [...orders];

    switch (sortBy) {
        case '-createdAt':
            return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        case 'createdAt':
            return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        case '-totalAmount':
            return sorted.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
        case 'totalAmount':
            return sorted.sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0));
        default:
            return sorted;
    }
}

// Handle search with debounce
let orderSearchTimeout;
function handleOrderSearch(searchTerm) {
    clearTimeout(orderSearchTimeout);
    currentOrderFilters.search = searchTerm;
    orderSearchTimeout = setTimeout(() => {
        loadOrders();
    }, 300);
}

// Handle sort change
function handleOrderSort() {
    const sortSelect = document.getElementById('orderSort');
    if (sortSelect) {
        currentOrderFilters.sort = sortSelect.value;
        loadOrders();
    }
}

// Filter by status
function filterOrdersByStatus(status) {
    currentOrderFilters.status = status;

    // Update active button
    document.querySelectorAll('#statusFilters button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.status === status) {
            btn.classList.add('active');
        }
    });

    loadOrders();
}

// Update status counts
function updateStatusCounts(orders) {
    const counts = {
        all: orders.length,
        pending: 0,
        confirmed: 0,
        packed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0
    };

    orders.forEach(order => {
        if (counts[order.status] !== undefined) {
            counts[order.status]++;
        }
    });

    Object.keys(counts).forEach(status => {
        const badge = document.getElementById(`count-${status}`);
        if (badge) badge.textContent = counts[status];
    });
}

// Helper function to get estimated delivery display
function getEstimatedDeliveryDisplay(order) {
    let estimatedDelivery;

    if (order.estimatedDelivery) {
        estimatedDelivery = new Date(order.estimatedDelivery);
    } else if (order.delivery?.preferredDate) {
        estimatedDelivery = new Date(order.delivery.preferredDate);
    } else {
        // Calculate 3 business days from confirmation or creation
        const confirmDate = order.confirmedAt ? new Date(order.confirmedAt) : new Date(order.createdAt);
        estimatedDelivery = new Date(confirmDate.getTime() + (3 * 24 * 60 * 60 * 1000));
    }

    return estimatedDelivery.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Render orders
function renderOrders(orders) {
    const container = document.getElementById('ordersList');

    if (!container) return;

    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 3rem;">
                <i class="fas fa-inbox" style="font-size: 3rem; color: var(--text-muted); opacity: 0.3; margin-bottom: 1rem;"></i>
                <p style="color: var(--text-muted); font-size: 1.125rem;">No orders found</p>
                <p style="color: var(--text-muted); font-size: 0.875rem;">Try adjusting your filters or search terms</p>
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(order => renderOrderCard(order)).join('');
}

// Render individual order card
function renderOrderCard(order) {
    const statusColors = {
        pending: '#FEF3C7',
        confirmed: '#DBEAFE',
        packed: '#E0E7FF',
        shipped: '#DBEAFE',
        delivered: '#D1FAE5',
        cancelled: '#FEE2E2'
    };

    const statusTextColors = {
        pending: '#92400E',
        confirmed: '#1E40AF',
        packed: '#4338CA',
        shipped: '#1E40AF',
        delivered: '#065F46',
        cancelled: '#991B1B'
    };

    const orderNumber = order.orderNumber || `ORD-${order._id.slice(-8).toUpperCase()}`;
    const statusColor = statusColors[order.status] || '#E5E7EB';
    const statusTextColor = statusTextColors[order.status] || '#374151';

    return `
        <div class="card" style="margin-bottom: 1rem; border-left: 4px solid ${statusColor};">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h3 style="margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-receipt"></i>
                        #${orderNumber}
                    </h3>
                    <p style="color: var(--text-muted); margin: 0; font-size: 0.875rem;">
                        <i class="fas fa-clock"></i> ${new Date(order.createdAt).toLocaleString()}
                    </p>
                </div>
                <span style="padding: 0.5rem 1rem; background: ${statusColor}; color: ${statusTextColor}; border-radius: 1rem; font-weight: 600; font-size: 0.875rem;">
                    ${order.status.toUpperCase()}
                </span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem; padding: 1rem; background: var(--background); border-radius: 0.5rem;">
                <div>
                    <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.25rem;">
                        <i class="fas fa-user"></i> Customer
                    </div>
                    <div style="font-weight: 600;">${order.customer?.username || 'Unknown'}</div>
                    ${order.customer?.business_name ? `
                        <div style="font-size: 0.875rem; color: var(--text-muted);">${order.customer.business_name}</div>
                    ` : ''}
                </div>
                <div>
                    <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.25rem;">
                        <i class="fas fa-box"></i> Items
                    </div>
                    <div style="font-weight: 600;">${order.items?.length || 0} items</div>
                </div>
                <div>
                    <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.25rem;">
                        <i class="fas fa-money-bill-wave"></i> Total Amount
                    </div>
                    <div style="font-weight: 600; color: var(--primary); font-size: 1.125rem;">₱${(order.totalAmount || 0).toLocaleString()}</div>
                    ${order.totalDiscount && order.totalDiscount > 0 ? `
                        <div style="font-size: 0.75rem; color: var(--success); margin-top: 0.25rem;">
                            <i class="fas fa-tag"></i> Saved ₱${(order.totalDiscount || 0).toLocaleString()}
                        </div>
                    ` : ''}
                </div>
                <div>
                    <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.25rem;">
                        <i class="fas fa-credit-card"></i> Payment
                    </div>
                    <div style="font-weight: 600;">${(order.payment?.method || order.paymentMethod || 'COD').toUpperCase()}</div>
                </div>
                ${order.status !== 'cancelled' && order.status !== 'delivered' ? `
                    <div>
                        <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.25rem;">
                            <i class="fas fa-calendar-alt"></i> Est. Delivery
                        </div>
                        <div style="font-weight: 600;">${getEstimatedDeliveryDisplay(order)}</div>
                    </div>
                ` : ''}
            </div>
            
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="viewEnhancedOrderDetails('${order._id}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
                ${(currentUser?.role === 'admin' || currentUser?.role === 'staff') && order.status !== 'delivered' && order.status !== 'cancelled' ? `
                    <button class="btn btn-primary" onclick="updateOrderStatus('${order._id}'); return false;">
                        <i class="fas fa-edit"></i> Update Status
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Enhanced view order details with timeline
async function viewEnhancedOrderDetails(orderId) {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        hideLoading();

        if (!response.ok) {
            showToast('Failed to load order details', 'error');
            return;
        }

        const data = await response.json();
        const order = data.order;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';

        const orderNumber = order.orderNumber || `ORD-${order._id.slice(-8).toUpperCase()}`;

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3><i class="fas fa-receipt"></i> Order #${orderNumber}</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <!-- Status Timeline -->
                    ${renderOrderTimeline(order)}
                    
                    <!-- Customer Info -->
                    <div style="background: var(--background); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                        <h4 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-user"></i> Customer Information
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                            <div>
                                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.25rem;">Name</div>
                                <div style="font-weight: 600;">${order.customer?.username || 'N/A'}</div>
                            </div>
                            <div>
                                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.25rem;">Email</div>
                                <div>${order.customer?.email || 'N/A'}</div>
                            </div>
                            <div>
                                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.25rem;">Business</div>
                                <div>${order.customer?.business_name || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Order Items -->
                    <div style="background: var(--background); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                        <h4 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-box"></i> Order Items
                        </h4>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 2px solid var(--border);">
                                        <th style="padding: 0.75rem; text-align: left;">Product</th>
                                        <th style="padding: 0.75rem; text-align: center;">Qty</th>
                                        <th style="padding: 0.75rem; text-align: right;">Unit Price</th>
                                        <th style="padding: 0.75rem; text-align: right;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${order.items.map(item => `
                                        <tr style="border-bottom: 1px solid var(--border);">
                                            <td style="padding: 0.75rem;">${item.productName || 'Unknown Product'}</td>
                                            <td style="padding: 0.75rem; text-align: center;">${item.quantity}</td>
                                            <td style="padding: 0.75rem; text-align: right;">₱${(item.unitPrice || 0).toLocaleString()}</td>
                                            <td style="padding: 0.75rem; text-align: right; font-weight: 600;">₱${(item.totalPrice || 0).toLocaleString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot>
                                    <tr style="border-bottom: 1px solid var(--border);">
                                        <td colspan="3" style="padding: 0.75rem; text-align: right;">Subtotal:</td>
                                        <td style="padding: 0.75rem; text-align: right;">₱${(order.subtotal || order.totalAmount || 0).toLocaleString()}</td>
                                    </tr>
                                    ${order.totalDiscount && order.totalDiscount > 0 ? `
                                        <tr style="border-bottom: 1px solid var(--border); color: var(--success);">
                                            <td colspan="3" style="padding: 0.75rem; text-align: right;">
                                                <i class="fas fa-tags"></i> Total Discount:
                                            </td>
                                            <td style="padding: 0.75rem; text-align: right; font-weight: 600;">-₱${(order.totalDiscount || 0).toLocaleString()}</td>
                                        </tr>
                                    ` : ''}
                                    <tr style="font-weight: 600; font-size: 1.125rem; background: var(--card-bg);">
                                        <td colspan="3" style="padding: 1rem; text-align: right;">Total:</td>
                                        <td style="padding: 1rem; text-align: right; color: var(--primary);">₱${(order.totalAmount || 0).toLocaleString()}</td>
                                    </tr>
                                    ${order.totalDiscount && order.totalDiscount > 0 ? `
                                        <tr>
                                            <td colspan="4" style="padding: 0.75rem; text-align: center; background: var(--success); color: white; border-radius: 0.5rem;">
                                                <i class="fas fa-check-circle"></i> You saved ₱${(order.totalDiscount || 0).toLocaleString()}!
                                            </td>
                                        </tr>
                                    ` : ''}
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Delivery & Contact Information -->
                    <div style="background: var(--background); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border-left: 4px solid var(--info);">
                        <h4 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-truck"></i> Delivery Information
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
                            <div>
                                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem; font-weight: 600;">
                                    <i class="fas fa-map-marker-alt"></i> Delivery Address
                                </div>
                                <div style="padding: 0.75rem; background: var(--surface); border-radius: 0.5rem; border: 1px solid var(--border); line-height: 1.6;">
                                    ${order.delivery?.address || order.address || 'No address provided'}
                                </div>
                            </div>
                            <div>
                                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem; font-weight: 600;">
                                    <i class="fas fa-phone"></i> Contact Number
                                </div>
                                <div style="padding: 0.75rem; background: var(--surface); border-radius: 0.5rem; border: 1px solid var(--border);">
                                    ${order.delivery?.contactNumber || order.phone || order.contactNumber || 'Not provided'}
                                </div>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-top: 1rem;">
                            <div>
                                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem; font-weight: 600;">
                                    <i class="fas fa-calendar-check"></i> Preferred Delivery Date
                                </div>
                                <div style="padding: 0.75rem; background: var(--surface); border-radius: 0.5rem; border: 1px solid var(--border);">
                                    ${order.delivery?.preferredDate ? new Date(order.delivery.preferredDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Standard delivery (3 business days)'}
                                </div>
                            </div>
                            <div>
                                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem; font-weight: 600;">
                                    <i class="fas fa-calendar-alt"></i> Estimated Delivery
                                </div>
                                <div style="padding: 0.75rem; background: var(--primary); color: white; border-radius: 0.5rem; font-weight: 600;">
                                    ${getEstimatedDeliveryDisplay(order)}
                                </div>
                            </div>
                        </div>
                        ${order.trackingNumber ? `
                            <div style="margin-top: 1rem;">
                                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem; font-weight: 600;">
                                    <i class="fas fa-barcode"></i> Tracking Number
                                </div>
                                <div style="padding: 0.75rem; background: var(--success); color: white; border-radius: 0.5rem; font-family: monospace; font-size: 1.1rem; font-weight: 600;">
                                    ${order.trackingNumber}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Payment Information -->
                    <div style="background: var(--background); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border-left: 4px solid var(--success);">
                        <h4 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-credit-card"></i> Payment Information
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
                            <div>
                                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem; font-weight: 600;">Payment Method</div>
                                <div style="padding: 0.75rem; background: var(--surface); border-radius: 0.5rem; border: 1px solid var(--border); font-weight: 600;">
                                    <i class="fas fa-wallet"></i> ${(order.payment?.method || order.paymentMethod || 'COD').toUpperCase()}
                                </div>
                            </div>
                            <div>
                                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem; font-weight: 600;">Payment Status</div>
                                <div style="padding: 0.75rem; background: var(--surface); border-radius: 0.5rem; border: 1px solid var(--border);">
                                    ${(() => {
                const paymentMethod = (order.payment?.method || order.paymentMethod || 'cod').toLowerCase();
                const paymentStatus = order.payment?.status || 'pending';

                if (paymentMethod === 'cod') {
                    return `<span class="badge badge-info">PAY ON DELIVERY</span>`;
                } else if (paymentStatus === 'verified') {
                    return `<span class="badge badge-success">VERIFIED</span>`;
                } else if (paymentStatus === 'pending') {
                    return `<span class="badge badge-warning">AWAITING VERIFICATION</span>`;
                } else {
                    return `<span class="badge badge-secondary">${paymentStatus.toUpperCase()}</span>`;
                }
            })()}
                                </div>
                            </div>
                            ${order.payment?.reference ? `
                                <div>
                                    <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem; font-weight: 600;">Payment Reference</div>
                                    <div style="padding: 0.75rem; background: var(--surface); border-radius: 0.5rem; border: 1px solid var(--border); font-family: monospace;">
                                        ${order.payment.reference}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        ${order.payment?.proofUrl ? `
                            <div style="margin-top: 1.5rem;">
                                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem; font-weight: 600;">
                                    <i class="fas fa-image"></i> Payment Proof
                                </div>
                                <div style="padding: 1rem; background: var(--surface); border-radius: 0.5rem; border: 2px solid var(--border);">
                                    <img src="${order.payment.proofUrl}" style="max-width: 100%; height: auto; border-radius: 0.5rem; cursor: pointer;" onclick="window.open(this.src, '_blank')" title="Click to view full size" />
                                    <div style="margin-top: 0.5rem; text-align: center; font-size: 0.875rem; color: var(--text-muted);">
                                        Click image to view full size
                                    </div>
                                </div>
                                ${(currentUser?.role === 'admin' || currentUser?.role === 'staff') && order.payment?.status === 'pending' ? `
                                    <div class="payment-verification-section" style="margin-top: 1.5rem; padding: 1.25rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.04)); border: 2px solid var(--success); border-radius: var(--radius-lg); text-align: center;">
                                        <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-bottom: 1rem; color: var(--success);">
                                            <i class="fas fa-shield-check" style="font-size: 1.5rem;"></i>
                                            <span style="font-weight: 600; font-size: 1rem;">Payment Verification Required</span>
                                        </div>
                                        <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0 0 1rem 0; line-height: 1.5;">
                                            Please review the payment proof above and verify that the payment has been received successfully.
                                        </p>
                                        <button class="btn-verify-payment" onclick="verifyPayment('${order._id}')" style="
                                            width: 100%;
                                            padding: 1rem 2rem;
                                            background: linear-gradient(135deg, var(--success), #059669);
                                            color: white;
                                            border: none;
                                            border-radius: var(--radius);
                                            font-weight: 600;
                                            font-size: 1rem;
                                            cursor: pointer;
                                            transition: all 0.3s ease;
                                            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            gap: 0.75rem;
                                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(16, 185, 129, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)';">
                                            <i class="fas fa-check-double" style="font-size: 1.1rem;"></i>
                                            <span>Verify Payment</span>
                                        </button>
                                        <small style="display: block; margin-top: 0.75rem; color: var(--text-muted); font-size: 0.8rem;">
                                            <i class="fas fa-info-circle"></i> This action will confirm the payment and update the order status
                                        </small>
                                    </div>
                                ` : order.payment?.status === 'verified' ? `
                                    <div class="payment-verified-section" style="margin-top: 1.5rem; padding: 1.25rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.06)); border: 2px solid var(--success); border-radius: var(--radius-lg); text-align: center;">
                                        <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: var(--success);">
                                            <i class="fas fa-check-circle" style="font-size: 1.8rem;"></i>
                                            <div style="text-align: left;">
                                                <div style="font-weight: 600; font-size: 1rem;">Payment Verified</div>
                                                <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
                                                    ${order.payment?.verifiedAt ? `Verified on ${new Date(order.payment.verifiedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Payment has been confirmed'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Order Notes -->
                    ${order.notes ? `
                        <div style="background: var(--background); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border-left: 4px solid var(--warning);">
                            <h4 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-sticky-note"></i> Order Notes
                            </h4>
                            <div style="padding: 1rem; background: var(--surface); border-radius: 0.5rem; border: 1px solid var(--border); line-height: 1.6; white-space: pre-wrap;">
                                ${order.notes}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer" style="display: flex; justify-content: space-between; gap: 1rem; padding: 1.5rem; border-top: 2px solid var(--border);">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Close
                    </button>
                    ${(currentUser?.role === 'admin' || currentUser?.role === 'staff') && order.status !== 'delivered' && order.status !== 'cancelled' ? `
                        <button class="btn btn-primary" onclick="this.closest('.modal').remove(); updateOrderStatus('${order._id}');">
                            <i class="fas fa-edit"></i> Update Status
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    } catch (error) {
        hideLoading();
        console.error('Error viewing order details:', error);
        showToast('Failed to load order details', 'error');
    }
}

// Render order timeline (Shopee-style)
function renderOrderTimeline(order) {
    const statuses = [
        { key: 'pending', label: 'Order Placed', icon: 'fa-shopping-cart' },
        { key: 'confirmed', label: 'Confirmed', icon: 'fa-check-circle' },
        { key: 'packed', label: 'Packed', icon: 'fa-box' },
        { key: 'shipped', label: 'Shipped', icon: 'fa-truck' },
        { key: 'delivered', label: 'Delivered', icon: 'fa-home' }
    ];

    const statusIndex = {
        'pending': 0,
        'confirmed': 1,
        'packed': 2,
        'shipped': 3,
        'delivered': 4,
        'cancelled': -1
    };

    const currentIndex = statusIndex[order.status] !== undefined ? statusIndex[order.status] : 0;

    return `
        <div style="margin: 2rem 0; padding: 2rem; background: var(--background); border-radius: 0.5rem;">
            <h4 style="margin-bottom: 2rem; text-align: center; color: var(--text-muted);">
                <i class="fas fa-route"></i> Order Progress
            </h4>
            <div style="display: flex; justify-content: space-between; position: relative; padding: 0 1rem;">
                ${statuses.map((status, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;

        return `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; position: relative;">
                            <div style="width: 50px; height: 50px; border-radius: 50%; background: ${isCompleted ? 'var(--success)' : 'var(--background)'}; border: 3px solid ${isCompleted ? 'var(--success)' : 'var(--border)'}; display: flex; align-items: center; justify-content: center; z-index: 2; ${isCurrent ? 'animation: pulse 2s infinite;' : ''}">
                                <i class="fas ${status.icon}" style="color: ${isCompleted ? 'white' : 'var(--text-muted)'}; font-size: 1.25rem;"></i>
                            </div>
                            <div style="margin-top: 0.75rem; text-align: center; font-size: 0.875rem; font-weight: ${isCurrent ? '600' : '400'}; color: ${isCompleted ? 'var(--text)' : 'var(--text-muted)'};">
                                ${status.label}
                            </div>
                            ${order[`${status.key}At`] ? `
                                <div style="margin-top: 0.25rem; text-align: center; font-size: 0.75rem; color: var(--text-muted);">
                                    ${new Date(order[`${status.key}At`]).toLocaleString()}
                                </div>
                            ` : ''}
                            ${index < statuses.length - 1 ? `
                                <div style="position: absolute; top: 25px; left: 50%; right: -50%; height: 3px; background: ${isCompleted ? 'var(--success)' : 'var(--border)'}; z-index: 1;"></div>
                            ` : ''}
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
        <style>
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
        </style>
    `;
}

// Open update status modal (replaces prompt)
function openUpdateStatusModal(orderId, currentStatus) {
    const nextStatuses = {
        'pending': [
            { key: 'confirmed', label: 'Confirm Order' },
            { key: 'cancelled', label: 'Cancel Order' }
        ],
        'confirmed': [
            { key: 'packed', label: 'Mark as Packed' },
            { key: 'cancelled', label: 'Cancel Order' }
        ],
        'packed': [
            { key: 'shipped', label: 'Mark as Shipped' }
        ],
        'shipped': [
            { key: 'delivered', label: 'Mark as Delivered' }
        ],
        'delivered': [],
        'cancelled': []
    };

    const availableStatuses = nextStatuses[currentStatus] || [];

    if (availableStatuses.length === 0) {
        showToast('This order cannot be updated further', 'info');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Update Order Status</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Current Status</label>
                    <div style="padding: 0.75rem; background: var(--background); border-radius: 0.5rem; font-weight: 600; text-transform: uppercase;">
                        ${currentStatus}
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">New Status</label>
                    <select id="newOrderStatus" class="form-input">
                        ${availableStatuses.map(status => `
                            <option value="${status.key}">${status.label}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Notes (Optional)</label>
                    <textarea id="statusNotes" class="form-input" rows="3" placeholder="Add any notes about this status change..."></textarea>
                </div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem;">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button class="btn btn-primary" onclick="saveOrderStatus('${orderId}', document.getElementById('newOrderStatus').value, document.getElementById('statusNotes').value);">
                    <i class="fas fa-check"></i> Update Status
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Save order status
async function saveOrderStatus(orderId, newStatus, notes) {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status: newStatus,
                notes: notes || undefined
            })
        });

        hideLoading();

        if (response.ok) {
            const result = await response.json();
            showToast(`Order status updated to ${newStatus}`, 'success');

            // Close the modal
            const modal = document.querySelector('.modal');
            if (modal) {
                modal.remove();
            }

            // Send notification if enabled
            if (isNotificationsEnabled()) {
                await sendOrderStatusNotification(result.order || { _id: orderId, status: newStatus });
            }

            // Refresh the orders list
            await loadOrders();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to update status', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error updating status:', error);
        showToast('Failed to update status', 'error');
    }
}

// Reusable custom confirmation modal
function showConfirmDialog({ title, message, icon = 'question-circle', iconColor = 'var(--warning)', confirmText = 'Confirm', cancelText = 'Cancel', confirmColor = 'var(--primary)', onConfirm, onCancel }) {
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal';
    confirmModal.style.display = 'block';
    confirmModal.style.zIndex = '10001';

    confirmModal.innerHTML = `
        <div class="modal-content" style="max-width: 480px; animation: modalSlideIn 0.3s ease-out;">
            <div class="modal-body" style="padding: 2rem; text-align: center;">
                <div style="width: 80px; height: 80px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, ${iconColor}15, ${iconColor}08); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-${icon}" style="font-size: 2.5rem; color: ${iconColor};"></i>
                </div>
                <h3 style="margin: 0 0 1rem 0; color: var(--text); font-size: 1.25rem;">${title}</h3>
                <p style="color: var(--text-muted); line-height: 1.6; margin: 0; font-size: 0.95rem;">${message}</p>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: center; gap: 1rem; padding: 1.5rem; border-top: 1px solid var(--border);">
                <button class="btn btn-secondary" data-action="cancel" style="padding: 0.75rem 1.5rem; min-width: 120px;">
                    <i class="fas fa-times"></i> ${cancelText}
                </button>
                <button class="btn" data-action="confirm" style="
                    padding: 0.75rem 1.5rem;
                    min-width: 120px;
                    background: ${confirmColor};
                    color: white;
                    border: none;
                    font-weight: 600;
                ">
                    <i class="fas fa-check"></i> ${confirmText}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(confirmModal);

    // Handle button clicks
    confirmModal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
        confirmModal.remove();
        if (onConfirm) onConfirm();
    });

    confirmModal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
        confirmModal.remove();
        if (onCancel) onCancel();
    });

    // Close on outside click
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            confirmModal.remove();
            if (onCancel) onCancel();
        }
    });
}

// Verify payment (admin/staff only)
function verifyPayment(orderId) {
    // Create custom confirmation modal
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal';
    confirmModal.style.display = 'block';
    confirmModal.style.zIndex = '10001'; // Higher than other modals

    confirmModal.innerHTML = `
        <div class="modal-content" style="max-width: 480px; animation: modalSlideIn 0.3s ease-out;">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--success), #059669); color: white; border-radius: var(--radius-lg) var(--radius-lg) 0 0;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 0.75rem; color: white;">
                    <i class="fas fa-shield-check" style="font-size: 1.5rem;"></i>
                    <span>Verify Payment</span>
                </h3>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 1rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1)); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-check-double" style="font-size: 2.5rem; color: var(--success);"></i>
                    </div>
                    <h4 style="margin: 0 0 0.75rem 0; color: var(--text); font-size: 1.25rem;">Confirm Payment Verification</h4>
                    <p style="color: var(--text-muted); line-height: 1.6; margin: 0; font-size: 0.95rem;">
                        Are you sure you want to verify this payment as received and valid? This action will update the order status and notify the customer.
                    </p>
                </div>
                <div style="background: var(--background); padding: 1rem; border-radius: var(--radius); border-left: 4px solid var(--warning);">
                    <small style="color: var(--text-muted); line-height: 1.5; display: block;">
                        <i class="fas fa-exclamation-triangle" style="color: var(--warning);"></i> 
                        <strong>Important:</strong> Please ensure you have reviewed the payment proof and confirmed the payment has been received before proceeding.
                    </small>
                </div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem; padding: 1.5rem; border-top: 1px solid var(--border);">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()" style="padding: 0.75rem 1.5rem;">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button class="btn" onclick="confirmPaymentVerification('${orderId}')" style="
                    padding: 0.75rem 1.5rem;
                    background: linear-gradient(135deg, var(--success), #059669);
                    color: white;
                    border: none;
                    font-weight: 600;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                ">
                    <i class="fas fa-check-circle"></i> Yes, Verify Payment
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(confirmModal);

    // Close on outside click
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) confirmModal.remove();
    });
}

// Confirm payment verification
async function confirmPaymentVerification(orderId) {
    // Remove confirmation modal
    const confirmModal = document.querySelectorAll('.modal');
    confirmModal.forEach(m => m.remove());

    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/verify-payment`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        hideLoading();

        if (response.ok) {
            showToast('Payment verified successfully!', 'success');

            // Refresh orders list
            await loadOrders();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to verify payment', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error verifying payment:', error);
        showToast('Failed to verify payment', 'error');
    }
}

// Check if notifications are enabled
function isNotificationsEnabled() {
    // Check localStorage for notification preference
    const notifPref = localStorage.getItem('orderNotifications');
    return notifPref !== 'disabled';
}

// Send order status notification
async function sendOrderStatusNotification(order) {
    try {
        // Browser push notification
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                showBrowserNotification(order);
            } else if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    showBrowserNotification(order);
                }
            }
        }

        // Send email notification via backend
        const token = localStorage.getItem('token');
        try {
            await fetch(`${API_BASE_URL}/notifications/order-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    orderId: order._id,
                    status: order.status
                })
            });
            console.log('✅ Email notification sent');
        } catch (emailError) {
            // Email notification is optional, don't fail if it doesn't work
            console.log('⚠️  Email notification not available:', emailError.message);
        }
    } catch (error) {
        console.error('Error sending notification:', error);
        // Don't show error to user, notifications are optional
    }
}

// Show browser notification
function showBrowserNotification(order) {
    const statusMessages = {
        confirmed: 'Your order has been confirmed!',
        packed: 'Your order has been packed and is ready for shipping!',
        shipped: 'Your order is on the way!',
        delivered: 'Your order has been delivered!',
        cancelled: 'Your order has been cancelled.'
    };

    const orderNumber = order.orderNumber || `ORD-${order._id?.slice(-8).toUpperCase()}`;
    const message = statusMessages[order.status] || `Order status updated to ${order.status}`;

    new Notification('Order Status Update', {
        body: `${orderNumber}: ${message}`,
        tag: `order-${order._id}`,
        requireInteraction: false
    });
}

// Toggle notifications
function toggleOrderNotifications() {
    const currentState = localStorage.getItem('orderNotifications');
    const newState = currentState === 'disabled' ? 'enabled' : 'disabled';
    localStorage.setItem('orderNotifications', newState);

    if (newState === 'enabled' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showToast('Order notifications enabled', 'success');
            } else {
                showToast('Please allow notifications in your browser settings', 'warning');
            }
        });
    } else {
        showToast(`Order notifications ${newState}`, 'success');
    }

    // Update UI if notification toggle exists
    updateNotificationToggleUI();
}

// Update notification toggle UI
function updateNotificationToggleUI() {
    const toggle = document.getElementById('notificationToggle');
    if (toggle) {
        const isEnabled = isNotificationsEnabled();
        toggle.checked = isEnabled;
        toggle.parentElement.querySelector('span').textContent =
            isEnabled ? 'Notifications Enabled' : 'Notifications Disabled';
    }
}

// Open email settings modal for supplier orders
function openEmailSettings() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    // Get current email settings from localStorage
    const emailSettings = JSON.parse(localStorage.getItem('emailSettings') || '{}');
    const companyEmail = emailSettings.companyEmail || 'admin@crisniltrading.com';
    const adminEmail = emailSettings.adminEmail || 'admin@crisniltrading.com';
    const companyName = emailSettings.companyName || 'CRISNIL Trading Corp';
    const companyAddress = emailSettings.companyAddress || '123 Business District, Manila, Philippines';
    const companyPhone = emailSettings.companyPhone || '+63 917 123 4567';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3><i class="fas fa-envelope-open-text"></i> Email Settings</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1)); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border-left: 4px solid var(--info);">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <i class="fas fa-info-circle" style="color: var(--info);"></i>
                        <strong>Customize Email Settings</strong>
                    </div>
                    <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted);">
                        Configure the email addresses and company information used in supplier purchase orders.
                    </p>
                </div>
                
                <form id="emailSettingsForm">
                    <div class="form-group">
                        <label>Company Name</label>
                        <input type="text" name="companyName" class="form-input" value="${companyName}" required>
                        <small style="color: var(--text-muted);">Your business name shown in emails</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Company Email (From Address)</label>
                        <input type="email" name="companyEmail" class="form-input" value="${companyEmail}" required>
                        <small style="color: var(--text-muted);">Email address used to send orders to suppliers</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Admin Email (Copy Recipient)</label>
                        <input type="email" name="adminEmail" class="form-input" value="${adminEmail}" required>
                        <small style="color: var(--text-muted);">Email address to receive order copies</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Company Address</label>
                        <textarea name="companyAddress" class="form-input" rows="2" required>${companyAddress}</textarea>
                        <small style="color: var(--text-muted);">Delivery address shown in purchase orders</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Company Phone</label>
                        <input type="tel" name="companyPhone" class="form-input" value="${companyPhone}" required>
                        <small style="color: var(--text-muted);">Contact number for suppliers</small>
                    </div>
                    
                    <div style="background: var(--background-alt); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                        <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">Email Preview</h4>
                        <div style="font-size: 0.875rem; color: var(--text-muted);">
                            <div style="margin-bottom: 0.25rem;">
                                <strong>From:</strong> <span id="previewFrom">${companyEmail}</span>
                            </div>
                            <div style="margin-bottom: 0.25rem;">
                                <strong>To:</strong> supplier@example.com
                            </div>
                            <div style="margin-bottom: 0.25rem;">
                                <strong>CC:</strong> <span id="previewCC">${adminEmail}</span> (when enabled)
                            </div>
                            <div>
                                <strong>Subject:</strong> Purchase Order Request - RO-XXXXX
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-save"></i> Save Settings
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add real-time preview updates
    const form = modal.querySelector('#emailSettingsForm');
    const companyEmailInput = form.querySelector('input[name="companyEmail"]');
    const adminEmailInput = form.querySelector('input[name="adminEmail"]');

    companyEmailInput.addEventListener('input', function () {
        document.getElementById('previewFrom').textContent = this.value || 'admin@crisniltrading.com';
    });

    adminEmailInput.addEventListener('input', function () {
        document.getElementById('previewCC').textContent = this.value || 'admin@crisniltrading.com';
    });

    // Handle form submission
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(form);

        const settings = {
            companyName: formData.get('companyName'),
            companyEmail: formData.get('companyEmail'),
            adminEmail: formData.get('adminEmail'),
            companyAddress: formData.get('companyAddress'),
            companyPhone: formData.get('companyPhone'),
            updatedAt: new Date().toISOString()
        };

        // Save to localStorage
        localStorage.setItem('emailSettings', JSON.stringify(settings));

        // Show success message
        showToast('Email settings saved successfully!', 'success');

        // Close modal
        modal.remove();
    });
}

// Open notification settings modal
function openNotificationSettings() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    const isEnabled = isNotificationsEnabled();
    const browserPermission = 'Notification' in window ? Notification.permission : 'not-supported';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-bell"></i> Notification Settings</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 0.5rem;">Order Status Notifications</h4>
                    <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">
                        Get notified when order status changes (Confirmed, Packed, Shipped, Delivered)
                    </p>
                    
                    <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--background); border-radius: 0.5rem;">
                        <label class="switch" style="position: relative; display: inline-block; width: 50px; height: 24px;">
                            <input type="checkbox" id="notificationToggle" ${isEnabled ? 'checked' : ''} 
                                onchange="toggleOrderNotifications()" 
                                style="opacity: 0; width: 0; height: 0;">
                            <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${isEnabled ? 'var(--success)' : '#ccc'}; transition: .4s; border-radius: 24px;">
                                <span style="position: absolute; content: ''; height: 18px; width: 18px; left: ${isEnabled ? '26px' : '3px'}; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%;"></span>
                            </span>
                        </label>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">${isEnabled ? 'Enabled' : 'Disabled'}</div>
                            <div style="font-size: 0.875rem; color: var(--text-muted);">
                                ${isEnabled ? 'You will receive notifications' : 'Notifications are turned off'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 0.5rem;">Browser Notifications</h4>
                    <div style="padding: 1rem; background: var(--background); border-radius: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <i class="fas ${browserPermission === 'granted' ? 'fa-check-circle' : browserPermission === 'denied' ? 'fa-times-circle' : 'fa-question-circle'}" 
                                style="color: ${browserPermission === 'granted' ? 'var(--success)' : browserPermission === 'denied' ? 'var(--error)' : 'var(--warning)'};"></i>
                            <span style="font-weight: 600;">
                                ${browserPermission === 'granted' ? 'Allowed' : browserPermission === 'denied' ? 'Blocked' : 'Not Set'}
                            </span>
                        </div>
                        <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0;">
                            ${browserPermission === 'granted' ? 'Browser notifications are enabled' :
            browserPermission === 'denied' ? 'Please enable notifications in your browser settings' :
                'Click the toggle above to enable notifications'}
                        </p>
                    </div>
                </div>
                
                <div style="padding: 1rem; background: var(--background); border-radius: 0.5rem; border-left: 4px solid var(--info);">
                    <div style="display: flex; gap: 0.5rem;">
                        <i class="fas fa-info-circle" style="color: var(--info); margin-top: 0.25rem;"></i>
                        <div style="font-size: 0.875rem; color: var(--text-muted);">
                            <strong>Note:</strong> Email notifications are automatically sent to customers when you update order status. 
                            Browser notifications are for your convenience only.
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-check"></i> Done
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add CSS for toggle switch
    if (!document.getElementById('toggle-switch-style')) {
        const style = document.createElement('style');
        style.id = 'toggle-switch-style';
        style.textContent = `
            .switch input:checked + span {
                background-color: var(--success) !important;
            }
            .switch input:checked + span span {
                transform: translateX(26px);
            }
        `;
        document.head.appendChild(style);
    }
}

// Export orders to CSV
async function exportOrdersCSV() {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders?limit=1000`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        hideLoading();

        if (!response.ok) {
            showToast('Failed to export orders', 'error');
            return;
        }

        const data = await response.json();
        const orders = data.orders || [];

        // Create CSV content
        const headers = ['Order Number', 'Customer', 'Email', 'Date', 'Status', 'Items', 'Amount', 'Payment Method'];
        const rows = orders.map(order => [
            order.orderNumber || order._id.slice(-8),
            order.customer?.username || 'Unknown',
            order.customer?.email || 'N/A',
            new Date(order.createdAt).toLocaleString(),
            order.status,
            order.items?.length || 0,
            order.totalAmount || 0,
            order.paymentMethod || 'COD'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Orders exported successfully', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error exporting orders:', error);
        showToast('Failed to export orders', 'error');
    }
}

// Export dashboard data
function exportDashboardData() {
    const currentTab = document.querySelector('.nav-tab.active')?.id?.replace('tab-', '');

    switch (currentTab) {
        case 'orders':
            exportOrdersCSV();
            break;
        case 'transactions':
            exportTransactions();
            break;
        case 'analytics':
            exportAnalytics();
            break;
        default:
            showToast('Export not available for this section', 'info');
    }
}

// Add order filtering UI for admin/staff
function renderOrderFilters() {
    const section = document.getElementById('ordersSection');
    if (!section) return;

    // Check if filters already exist
    if (section.querySelector('.order-filters')) return;

    const filtersHTML = `
        <div class="order-filters card" style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 1rem;">Filter Orders</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; align-items: end;">
                <div>
                    <label class="form-label">Status</label>
                    <select id="orderStatusFilter" class="form-input">
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="packed">Packed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                <div>
                    <label class="form-label">Date From</label>
                    <input type="date" id="orderDateFrom" class="form-input">
                </div>
                <div>
                    <label class="form-label">Date To</label>
                    <input type="date" id="orderDateTo" class="form-input">
                </div>
                <div>
                    <button class="btn btn-primary" onclick="applyOrderFilters()">
                        <i class="fas fa-filter"></i> Apply Filters
                    </button>
                    <button class="btn btn-secondary" onclick="clearOrderFilters()">
                        <i class="fas fa-times"></i> Clear
                    </button>
                </div>
            </div>
        </div>
    `;

    // Insert before the first existing card
    const firstCard = section.querySelector('.card');
    if (firstCard) {
        firstCard.insertAdjacentHTML('beforebegin', filtersHTML);
    } else {
        const header = section.querySelector('div[style*="display: flex"]');
        if (header) {
            header.insertAdjacentHTML('afterend', filtersHTML);
        }
    }
}

function applyOrderFilters() {
    const filters = {
        status: document.getElementById('orderStatusFilter')?.value,
        dateFrom: document.getElementById('orderDateFrom')?.value,
        dateTo: document.getElementById('orderDateTo')?.value
    };

    // Remove empty filters
    Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
    });

    loadOrders(filters);
    showToast('Order filters applied', 'info');
}

function clearOrderFilters() {
    document.getElementById('orderStatusFilter').value = '';
    document.getElementById('orderDateFrom').value = '';
    document.getElementById('orderDateTo').value = '';
    loadOrders();
    showToast('Order filters cleared', 'info');
}

async function loadTransactions(filters = {}) {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        const role = (currentUser?.role || 'client').toLowerCase();

        // Build URL with filters
        let url = `${API_BASE_URL}/transactions`;
        if (role === 'client') {
            url = `${API_BASE_URL}/transactions/my-transactions`;
        }

        // Add filters as query parameters
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
        if (filters.type) params.append('type', filters.type);
        if (filters.amountRange) params.append('amountRange', filters.amountRange);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.search) params.append('search', filters.search);
        if (filters.page) params.append('page', filters.page);
        if (filters.limit) params.append('limit', filters.limit);

        if (params.toString()) url += '?' + params.toString();

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            const transactions = data.data?.transactions || data.transactions || [];
            const summary = data.data?.summary || calculateTransactionSummary(transactions);
            const pagination = data.data?.pagination || null;

            // Render summary widgets
            renderTransactionSummary(summary);

            // Show appropriate interface based on role
            if (role === 'admin' || role === 'staff' || role === 'b2b') {
                renderEnhancedTransactionsList(transactions, pagination, role);
            } else {
                renderClientTransactionsList(transactions);
            }
        } else {
            showToast(data.message || 'Failed to load transactions', 'error');

            // If API fails, try to load from analytics endpoint as fallback
            await loadTransactionsFallback(filters);
        }

        hideLoading();
    } catch (error) {
        console.error('Transaction loading error:', error);
        showToast('Failed to load transactions - connection error', 'error');

        // Show empty state
        renderTransactionSummary({
            totalEarnings: 0,
            pendingPayouts: 0,
            refunds: 0,
            totalFees: 0,
            completedTransactions: 0,
            pendingTransactions: 0,
            failedTransactions: 0
        });

        document.getElementById('transactionsList').innerHTML = `
            <div class="card" style="padding: 2rem; text-align: center; color: var(--text-muted);">
                <i class="fas fa-wifi" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <h3>Connection Error</h3>
                <p>Unable to connect to server. Please check your connection and try again.</p>
                <button class="btn btn-primary" onclick="loadTransactions()" style="margin-top: 1rem;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;

        hideLoading();
    }
}

// Fallback function to load transactions from analytics endpoint
async function loadTransactionsFallback(filters = {}) {
    try {
        const token = localStorage.getItem('token');

        // Use the existing analytics transactions endpoint
        let url = `${API_BASE_URL}/analytics/transactions`;

        // Add filters as query parameters
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);

        if (params.toString()) url += '?' + params.toString();

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();

            const transactions = data.data?.transactions || [];
            const summary = calculateTransactionSummary(transactions);

            // Render summary widgets
            renderTransactionSummary(summary);

            // Show enhanced interface for admin/staff
            const role = (currentUser?.role || 'client').toLowerCase();
            if (role === 'admin' || role === 'staff') {
                renderEnhancedTransactionsList(transactions, data.data?.pagination);
            } else {
                renderClientTransactionsList(transactions);
            }

            showToast('Transactions loaded successfully', 'success');
        } else {
            // Final fallback - show empty state
            renderEmptyTransactionState();
        }
    } catch (error) {
        renderEmptyTransactionState();
    }
}

// Function to render empty transaction state
function renderEmptyTransactionState() {
    renderTransactionSummary({
        totalEarnings: 0,
        pendingPayouts: 0,
        refunds: 0,
        totalFees: 0,
        completedTransactions: 0,
        pendingTransactions: 0,
        failedTransactions: 0
    });

    const transactionsList = document.getElementById('transactionsList');
    if (transactionsList) {
        transactionsList.innerHTML = `
            <div class="card" style="padding: 2rem; text-align: center; color: var(--text-muted);">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <h3>No Transactions Available</h3>
                <p>No transaction data could be loaded. This might be because:</p>
                <ul style="text-align: left; display: inline-block; margin-top: 1rem;">
                    <li>The backend server is not running</li>
                    <li>No transactions exist in the database</li>
                    <li>There's a connection issue</li>
                </ul>
                <button class="btn btn-primary" onclick="refreshTransactions()" style="margin-top: 1rem;">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
    }
}

function renderTransactionFilters() {
    const section = document.getElementById('transactionsSection');
    if (!section) return;

    // Check if filters already exist
    if (section.querySelector('.transaction-filters')) return;

    const filtersHTML = `
        <div class="transaction-filters card" style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 1rem;">Filter Transactions</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; align-items: end;">
                <div>
                    <label class="form-label">Status</label>
                    <select id="transactionStatusFilter" class="form-input">
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                <div>
                    <label class="form-label">Payment Method</label>
                    <select id="transactionPaymentFilter" class="form-input">
                        <option value="">All Methods</option>
                        <option value="cod">Cash on Delivery</option>
                        <option value="gcash">GCash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                    </select>
                </div>
                <div>
                    <label class="form-label">Date From</label>
                    <input type="date" id="transactionDateFrom" class="form-input">
                </div>
                <div>
                    <label class="form-label">Date To</label>
                    <input type="date" id="transactionDateTo" class="form-input">
                </div>
                <div>
                    <button class="btn btn-primary" onclick="applyTransactionFilters()">
                        <i class="fas fa-filter"></i> Apply Filters
                    </button>
                    <button class="btn btn-secondary" onclick="clearTransactionFilters()">
                        <i class="fas fa-times"></i> Clear
                    </button>
                </div>
            </div>
        </div>
    `;

    section.querySelector('.card').insertAdjacentHTML('beforebegin', filtersHTML);
}

function applyTransactionFilters() {
    const filters = {
        status: document.getElementById('transactionStatusFilter')?.value,
        paymentMethod: document.getElementById('transactionPaymentFilter')?.value,
        type: document.getElementById('transactionTypeFilter')?.value,
        amountRange: document.getElementById('transactionAmountFilter')?.value,
        dateFrom: document.getElementById('transactionDateFrom')?.value,
        dateTo: document.getElementById('transactionDateTo')?.value,
        search: document.getElementById('transactionSearchFilter')?.value
    };

    // Remove empty filters
    Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
    });

    loadTransactions(filters);
    showToast('Filters applied successfully', 'success');
}

function clearTransactionFilters() {
    document.getElementById('transactionStatusFilter').value = '';
    document.getElementById('transactionPaymentFilter').value = '';
    document.getElementById('transactionTypeFilter').value = '';
    document.getElementById('transactionAmountFilter').value = '';
    document.getElementById('transactionDateFrom').value = '';
    document.getElementById('transactionDateTo').value = '';
    document.getElementById('transactionSearchFilter').value = '';
    loadTransactions();
    showToast('Filters cleared', 'info');
}

function renderAdminTransactionsList(transactions, pagination) {
    const list = document.getElementById('transactionsList');
    if (!list) return;

    list.innerHTML = `
        <div style="display: grid; gap: 1rem;">
            ${transactions.map(transaction => `
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem; flex-wrap: wrap;">
                        <div>
                            <h4 style="margin-bottom: 0.5rem;">
                                <i class="fas fa-receipt"></i> 
                                Order #${transaction.orderNumber || transaction.id}
                            </h4>
                            <div style="color: var(--text-muted); margin-bottom: 0.5rem;">
                                <strong>Customer:</strong> ${transaction.customer?.username || 'N/A'} 
                                ${transaction.customer?.business_name ? `(${transaction.customer.business_name})` : ''}
                            </div>
                            <div style="color: var(--text-muted); font-size: 0.875rem;">
                                <i class="fas fa-calendar"></i> ${new Date(transaction.createdAt).toLocaleString()}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem;">
                                ₱${(transaction.totalAmount || 0).toLocaleString()}
                            </div>
                            <div style="display: flex; gap: 0.5rem; align-items: center; justify-content: flex-end; flex-wrap: wrap;">
                                <span class="badge badge-${getOrderStatusColor(transaction.status)}">
                                    ${transaction.status.toUpperCase()}
                                </span>
                                <span class="badge badge-info">
                                    ${transaction.paymentMethod.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn btn-sm btn-secondary" onclick="viewOrderDetails('${transaction.id}')">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        ${transaction.status === 'pending' ? `
                            <button class="btn btn-sm btn-success" onclick="confirmOrder('${transaction.id}')">
                                <i class="fas fa-check"></i> Confirm
                            </button>
                        ` : ''}
                        ${transaction.status === 'confirmed' ? `
                            <button class="btn btn-sm btn-primary" onclick="markOrderAsShipped('${transaction.id}')">
                                <i class="fas fa-shipping-fast"></i> Ship
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        ${pagination ? `
            <div style="display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem;">
                <button class="btn btn-secondary" onclick="loadTransactions({...getCurrentFilters(), page: ${pagination.currentPage - 1}})" 
                    ${pagination.currentPage <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
                <span>Page ${pagination.currentPage} of ${pagination.totalPages}</span>
                <button class="btn btn-secondary" onclick="loadTransactions({...getCurrentFilters(), page: ${pagination.currentPage + 1}})" 
                    ${pagination.currentPage >= pagination.totalPages ? 'disabled' : ''}>
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <div style="text-align: center; margin-top: 1rem; color: var(--text-muted);">
                Showing ${transactions.length} of ${pagination.totalTransactions} transactions
            </div>
        ` : ''}
    `;
}

function renderClientTransactionsList(transactions) {
    const list = document.getElementById('transactionsList');
    if (!list) return;

    if (transactions.length === 0) {
        list.innerHTML = `
            <div class="card" style="padding: 3rem; text-align: center; color: var(--text-muted);">
                <i class="fas fa-shopping-bag" style="font-size: 4rem; margin-bottom: 1.5rem; opacity: 0.3;"></i>
                <h3>No Orders Yet</h3>
                <p>Your order history will appear here once you make your first purchase.</p>
                <button class="btn btn-primary" onclick="switchTab('products')" style="margin-top: 1rem;">
                    <i class="fas fa-shopping-cart"></i> Start Shopping
                </button>
            </div>
        `;
        return;
    }

    list.innerHTML = transactions.map(transaction => `
        <div class="card client-transaction-card" style="margin-bottom: 1.5rem; border-left: 4px solid ${getStatusColor(transaction.status)};">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h3 style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; color: var(--text);">
                        <i class="fas fa-receipt" style="color: var(--primary);"></i>
                        Order #${transaction.orderId || transaction.id}
                    </h3>
                    <p style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">
                        <i class="fas fa-calendar-alt"></i> 
                        ${new Date(transaction.date || transaction.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}
                    </p>
                </div>
                <div style="text-align: right;">
                    <span class="badge ${getTransactionStatusBadge(transaction.status)}" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
                        ${getClientFriendlyStatus(transaction.status)}
                    </span>
                    ${transaction.totalDiscount && transaction.totalDiscount > 0 ? `
                        <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-muted); text-decoration: line-through;">
                            ₱${((transaction.amount || transaction.totalAmount || 0) + transaction.totalDiscount).toLocaleString()}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--success); margin-top: 0.25rem;">
                            <i class="fas fa-tag"></i> -₱${transaction.totalDiscount.toLocaleString()} discount
                        </div>
                    ` : ''}
                    <div style="margin-top: 0.5rem; font-size: 1.25rem; font-weight: 700; color: var(--primary);">
                        ₱${(transaction.amount || transaction.totalAmount || 0).toLocaleString()}
                    </div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: var(--background-alt); border-radius: var(--radius);">
                <div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem;">Payment Method</div>
                    <div style="font-weight: 500; color: var(--text);">
                        <i class="fas ${getPaymentIcon(transaction.paymentMethod)}"></i>
                        ${formatPaymentMethod(transaction.paymentMethod)}
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem;">Items</div>
                    <div style="font-weight: 500; color: var(--text);">
                        ${transaction.items?.length || 0} item${(transaction.items?.length || 0) !== 1 ? 's' : ''}
                    </div>
                </div>
                ${transaction.status !== 'cancelled' && transaction.status !== 'delivered' && transaction.status !== 'completed' ? `
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem;">Est. Delivery</div>
                        <div style="font-weight: 500; color: var(--text);">
                            <i class="fas fa-calendar-alt"></i> ${getEstimatedDeliveryDisplay(transaction)}
                        </div>
                    </div>
                ` : ''}
                <div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem;">Reference</div>
                    <div style="font-weight: 500; color: var(--text); font-family: monospace; font-size: 0.9rem;">
                        ${transaction.reference || 'N/A'}
                    </div>
                </div>
            </div>

            ${transaction.items && transaction.items.length > 0 ? `
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 1rem; color: var(--text); font-size: 1rem;">
                        <i class="fas fa-box" style="color: var(--accent);"></i>
                        Order Items
                    </h4>
                    <div style="display: grid; gap: 0.75rem;">
                        ${transaction.items.slice(0, 3).map(item => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border);">
                                <div>
                                    <div style="font-weight: 500; color: var(--text);">${item.name}</div>
                                    <div style="font-size: 0.85rem; color: var(--text-muted);">Qty: ${item.quantity || 0} × ₱${(item.price || 0).toLocaleString()}</div>
                                </div>
                                <div style="font-weight: 600; color: var(--primary);">
                                    ₱${((item.price || 0) * (item.quantity || 0)).toLocaleString()}
                                </div>
                            </div>
                        `).join('')}
                        ${transaction.items.length > 3 ? `
                            <div style="text-align: center; padding: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">
                                ... and ${transaction.items.length - 3} more item${transaction.items.length - 3 !== 1 ? 's' : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid var(--border);">
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                    <button class="btn btn-primary btn-sm" onclick="viewTransactionDetails('${transaction.id}')" title="View complete order details">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    ${transaction.status === 'pending' || transaction.status === 'confirmed' ? `
                        <button class="btn btn-info btn-sm" onclick="trackOrder('${transaction.orderId || transaction.id}')" title="Track your order">
                            <i class="fas fa-truck"></i> Track Order
                        </button>
                    ` : ''}
                    ${transaction.status === 'delivered' ? `
                        <button class="btn btn-success btn-sm" onclick="reorderItems('${transaction.id}')" title="Order these items again">
                            <i class="fas fa-redo"></i> Reorder
                        </button>
                    ` : ''}
                </div>
                <div style="text-align: right; color: var(--text-muted); font-size: 0.85rem;">
                    ${getOrderStatusMessage(transaction.status)}
                </div>
            </div>
        </div>
    `).join('');
}

function getCurrentFilters() {
    return {
        status: document.getElementById('transactionStatusFilter')?.value || undefined,
        paymentMethod: document.getElementById('transactionPaymentFilter')?.value || undefined,
        dateFrom: document.getElementById('transactionDateFrom')?.value || undefined,
        dateTo: document.getElementById('transactionDateTo')?.value || undefined
    };
}

// Update orders list display
function updateOrdersList(orders) {
    const ordersListContainer = document.getElementById('ordersList');
    if (!ordersListContainer) return;

    if (!orders || orders.length === 0) {
        ordersListContainer.innerHTML = `
            <div class="card" style="text-align: center; padding: 3rem;">
                <i class="fas fa-shopping-cart" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <h3 style="color: var(--text-muted);">No Orders Yet</h3>
                <p style="color: var(--text-muted);">Orders will appear here when customers place them.</p>
            </div>
        `;
        return;
    }

    ordersListContainer.innerHTML = orders.map(order => `
        <div class="card" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h3 style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <i class="fas fa-receipt"></i>
                        Order #${order.orderNumber || order._id}
                    </h3>
                    <p style="color: var(--text-muted);">Placed ${new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <span class="badge badge-${order.status === 'confirmed' ? 'success' : 'warning'}" style="padding: 0.5rem 1rem;">
                    ${order.status?.toUpperCase() || 'PENDING'}
                </span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                <div>
                    <h4 style="margin-bottom: 0.5rem; color: var(--text-muted);">Order Summary</h4>
                    <p>Total Items: ${order.items?.length || 0}</p>
                    <p>Total Amount: <strong>₱${(order.totalAmount || 0).toLocaleString()}</strong></p>
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem; flex-wrap: wrap;">
                ${(window.currentUserRole === 'admin' || window.currentUserRole === 'staff') ? `
                    ${order.status === 'pending' ? `
                        <button class="btn btn-primary" onclick="confirmOrder('${order._id}')">
                            <i class="fas fa-check"></i> Confirm Order
                        </button>
                    ` : ''}
                    ${order.status === 'confirmed' ? `
                        <button class="btn btn-success" onclick="markOrderAsShipped('${order._id}')">
                            <i class="fas fa-shipping-fast"></i> Mark Shipped
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="updateOrderStatus('${order._id}'); return false;">
                        <i class="fas fa-edit"></i> Update Status
                    </button>
                    ${(window.currentUserRole === 'admin') ? `
                        <button class="btn btn-danger" onclick="deleteOrder('${order._id}')" style="background: var(--error); color: white;">
                            <i class="fas fa-trash"></i> Delete Order
                        </button>
                    ` : ''}
                ` : `
                    <button class="btn btn-secondary" onclick="trackOrder('${order._id}')">
                        <i class="fas fa-truck"></i> Track Order
                    </button>
                `}
                <button class="btn btn-secondary" onclick="viewOrderDetails('${order._id}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        </div>
    `).join('');
}

// Enhanced Inventory Management Functions

async function loadInventory() {
    const token = localStorage.getItem('token');

    try {
        // Load inventory list
        await loadInventoryList();

        // Load low stock alerts
        await loadLowStockAlerts();

        // Update overview stats
        const response = await fetch(`${API_BASE_URL}/inventory/overview`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            updateInventoryOverview(data);
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        showToast('Failed to load inventory data', 'error');
    }
}

// Load inventory list with filters
async function loadInventoryList() {
    const token = localStorage.getItem('token');
    const category = document.getElementById('inventoryCategory')?.value || 'all';
    const status = document.getElementById('inventoryStatus')?.value || 'all';
    const sort = document.getElementById('inventorySort')?.value || 'name';
    const search = document.getElementById('inventorySearch')?.value || '';

    try {
        const params = new URLSearchParams({
            category: category !== 'all' ? category : '',
            status: status !== 'all' ? status : '',
            sort,
            search
        });

        const response = await fetch(`${API_BASE_URL}/inventory/list?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const result = await response.json();
            renderInventoryList(result.data);
        } else {
            throw new Error('Failed to load inventory');
        }
    } catch (error) {
        console.error('Error loading inventory list:', error);
        const container = document.getElementById('inventoryList');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--error);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <p>Failed to load inventory</p>
                </div>
            `;
        }
    }
}

// Render inventory list
function renderInventoryList(products) {
    const container = document.getElementById('inventoryList');
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.3;"></i>
                <p>No products found</p>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map(product => {
        const statusColor = product.stockStatus === 'out' ? 'var(--error)' :
            product.stockStatus === 'low' ? 'var(--warning)' : 'var(--success)';
        const statusText = product.stockStatus === 'out' ? 'Out of Stock' :
            product.stockStatus === 'low' ? 'Low Stock' : 'Good Stock';
        const statusIcon = product.stockStatus === 'out' ? 'fa-times-circle' :
            product.stockStatus === 'low' ? 'fa-exclamation-triangle' : 'fa-check-circle';

        // Debug: Log image data for inventory
        if (product.imageUrl) {
            console.log('📦 Inventory - Product:', product.name, 'Image URL:', product.imageUrl);
        }

        return `
            <div class="card" style="padding: 1rem; border-left: 4px solid ${statusColor};">
                <div style="display: grid; grid-template-columns: auto 1fr auto; gap: 1rem; align-items: center;">
                    <!-- Product Image -->
                    <div style="width: 60px; height: 60px; border-radius: 0.5rem; overflow: hidden; background: var(--background); display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer;" onclick="showImageUploadModal('${product._id}')" title="Click to upload/change image">
                        ${product.imageUrl ?
                `<img src="${API_BASE_URL.replace('/api', '')}${product.imageUrl}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">` :
                `<i class="fas fa-box" style="font-size: 1.5rem; color: var(--text-muted); opacity: 0.3;"></i>`
            }
                        <div style="position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.7); padding: 0.25rem; border-radius: 0.25rem 0 0 0;">
                            <i class="fas fa-camera" style="font-size: 0.75rem; color: white;"></i>
                        </div>
                    </div>
                    
                    <!-- Product Info -->
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                            <h4 style="margin: 0; font-size: 1rem;">${product.name}</h4>
                            <span style="padding: 0.125rem 0.5rem; background: var(--background); border-radius: 0.25rem; font-size: 0.75rem; color: var(--text-muted);">
                                ${product.category}
                            </span>
                        </div>
                        <div style="display: flex; gap: 1.5rem; font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem;">
                            <div>
                                <i class="fas ${statusIcon}" style="color: ${statusColor};"></i>
                                <strong style="color: ${statusColor}; margin-left: 0.25rem;">${product.stock}</strong> ${product.unit}
                            </div>
                            <div>
                                Min: <strong>${product.minStock}</strong> ${product.unit}
                            </div>
                            <div>
                                Price: <strong>₱${product.price.toLocaleString()}</strong>/${product.unit}
                            </div>
                            ${product.supplier?.name ? `
                                <div>
                                    Supplier: <strong>${product.supplier.name}</strong>
                                </div>
                            ` : ''}
                        </div>
                        <!-- Stock Level Bar -->
                        <div style="margin-top: 0.5rem; background: var(--background); height: 6px; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; background: ${statusColor}; width: ${Math.min(product.stockPercentage, 100)}%; transition: width 0.3s;"></div>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                            ${statusText}
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm btn-success" onclick="quickAdjustStock('${product._id}', 1)" title="Add 1 unit">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-sm btn-error" onclick="quickAdjustStock('${product._id}', -1)" title="Remove 1 unit" ${product.stock === 0 ? 'disabled' : ''}>
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="openStockAdjustModal('${product._id}')" title="Adjust stock">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Load low stock alerts
async function loadLowStockAlerts() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_BASE_URL}/inventory/alerts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const result = await response.json();
            renderLowStockAlerts(result.data);
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

// Render low stock alerts
function renderLowStockAlerts(alerts) {
    const card = document.getElementById('lowStockAlertsCard');
    const container = document.getElementById('lowStockAlertsList');

    if (!card || !container) return;

    if (!alerts || alerts.length === 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';

    container.innerHTML = alerts.map(alert => {
        const color = alert.severity === 'critical' ? 'var(--error)' : 'var(--warning)';
        const icon = alert.severity === 'critical' ? 'fa-times-circle' : 'fa-exclamation-triangle';

        return `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--background); border-radius: 0.5rem; border-left: 4px solid ${color};">
                <div style="width: 40px; height: 40px; border-radius: 0.25rem; overflow: hidden; background: var(--card-bg); display: flex; align-items: center; justify-content: center;">
                    ${alert.imageUrl ?
                `<img src="${API_BASE_URL.replace('/api', '')}${alert.imageUrl}" alt="${alert.name}" style="width: 100%; height: 100%; object-fit: cover;">` :
                `<i class="fas fa-box" style="color: var(--text-muted); opacity: 0.3;"></i>`
            }
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600;">${alert.name}</div>
                    <div style="font-size: 0.875rem; color: var(--text-muted);">
                        <i class="fas ${icon}" style="color: ${color};"></i>
                        ${alert.message}
                    </div>
                </div>
                <button class="btn btn-sm btn-primary" onclick="openStockAdjustModal('${alert._id}')">
                    <i class="fas fa-plus"></i> Restock
                </button>
            </div>
        `;
    }).join('');
}

// Dismiss alerts
function dismissAlerts() {
    const card = document.getElementById('lowStockAlertsCard');
    if (card) card.style.display = 'none';
}

// Filter inventory
function filterInventory() {
    loadInventoryList();
}

// Quick adjust stock (+1 or -1)
async function quickAdjustStock(productId, adjustment) {
    console.log('quickAdjustStock called:', { productId, adjustment });
    const token = localStorage.getItem('token');

    if (!token) {
        showToast('Please log in first', 'error');
        return;
    }

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/inventory/adjust`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                productId,
                adjustment,
                reason: adjustment > 0 ? 'Quick add' : 'Quick remove'
            })
        });

        hideLoading();

        if (response.ok) {
            const result = await response.json();
            console.log('Stock adjusted successfully:', result);
            showToast(`Stock ${adjustment > 0 ? 'added' : 'removed'} successfully`, 'success');
            await loadInventory();
        } else {
            const error = await response.json();
            console.error('Failed to adjust stock:', error);
            showToast(error.message || 'Failed to adjust stock', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error adjusting stock:', error);
        showToast('Failed to adjust stock - ' + error.message, 'error');
    }
}

// Open stock adjust modal
function openStockAdjustModal(productId) {
    // Create modal for custom stock adjustment
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Adjust Stock</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="adjustStockForm">
                    <input type="hidden" name="productId" value="${productId}">
                    <div class="form-group">
                        <label>Adjustment</label>
                        <input type="number" name="adjustment" class="form-input" placeholder="Enter positive or negative number" required>
                        <small style="color: var(--text-muted);">Use positive numbers to add, negative to remove</small>
                    </div>
                    <div class="form-group">
                        <label>Reason</label>
                        <textarea name="reason" class="form-input" rows="2" placeholder="Reason for adjustment" required></textarea>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-check"></i> Adjust
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#adjustStockForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
            showLoading();
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/inventory/adjust`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: formData.get('productId'),
                    adjustment: parseInt(formData.get('adjustment')),
                    reason: formData.get('reason')
                })
            });

            hideLoading();
            modal.remove();

            if (response.ok) {
                showToast('Stock adjusted successfully', 'success');
                loadInventory();
            } else {
                const error = await response.json();
                showToast(error.message || 'Failed to adjust stock', 'error');
            }
        } catch (error) {
            hideLoading();
            modal.remove();
            console.error('Error adjusting stock:', error);
            showToast('Failed to adjust stock', 'error');
        }
    });
}

// Update inventory overview display
function updateInventoryOverview(data) {
    if (!data || !data.data) return;

    const { totalProducts, lowStockProducts, outOfStock, criticalStock } = data.data;

    // Update stats grid with real inventory data
    updateStatsGrid({
        totalProducts: totalProducts || 0,
        lowStockItems: lowStockProducts || 0,
        pendingOrders: 0,
        todaysSales: '₱0'
    });
}

// Load client-specific analytics
async function loadClientAnalytics() {
    const token = localStorage.getItem('token');
    const timeRange = document.getElementById('clientAnalyticsTimeRange')?.value || '30';

    try {
        showLoading();

        // Fetch client's orders
        const ordersResponse = await fetch(`${API_BASE_URL}/orders?mine=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!ordersResponse.ok) {
            throw new Error('Failed to load orders');
        }

        const ordersData = await ordersResponse.json();
        const myOrders = ordersData.orders || [];

        // Filter orders by time range
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeRange));
        const filteredOrders = myOrders.filter(order => new Date(order.createdAt) >= cutoffDate);

        // Calculate client statistics
        const totalOrders = filteredOrders.length;
        const totalSpent = filteredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const avgOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;

        // Calculate savings from discounts
        const totalSavings = filteredOrders.reduce((sum, order) => {
            const discount = order.discount || 0;
            return sum + discount;
        }, 0);
        const savingsPercent = totalSpent > 0 ? ((totalSavings / (totalSpent + totalSavings)) * 100).toFixed(1) : 0;

        // Update stats
        document.getElementById('clientTotalOrders').textContent = totalOrders;
        document.getElementById('clientTotalSpent').textContent = `₱${totalSpent.toFixed(2)}`;
        document.getElementById('clientAvgOrder').textContent = `₱${avgOrder.toFixed(2)}`;
        document.getElementById('clientSavings').textContent = `₱${totalSavings.toFixed(2)}`;
        document.getElementById('clientSavingsPercent').textContent = `${savingsPercent}% saved`;

        // Calculate order status counts
        const statusCounts = {
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0
        };

        myOrders.forEach(order => {
            const status = (order.status || 'pending').toLowerCase();
            if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++;
            }
        });

        document.getElementById('clientPendingOrders').textContent = statusCounts.pending;
        document.getElementById('clientProcessingOrders').textContent = statusCounts.processing;
        document.getElementById('clientShippedOrders').textContent = statusCounts.shipped;
        document.getElementById('clientDeliveredOrders').textContent = statusCounts.delivered;

        // Calculate spending trend data
        const spendingByDate = {};
        filteredOrders.forEach(order => {
            const date = new Date(order.createdAt).toLocaleDateString();
            spendingByDate[date] = (spendingByDate[date] || 0) + order.totalAmount;
        });

        // Calculate category breakdown
        const categorySpending = {};
        filteredOrders.forEach(order => {
            (order.items || []).forEach(item => {
                const category = item.category || 'Other';
                categorySpending[category] = (categorySpending[category] || 0) + (item.price * item.quantity);
            });
        });

        // Calculate top products
        const productCounts = {};
        filteredOrders.forEach(order => {
            (order.items || []).forEach(item => {
                const key = item.productId || item.name;
                if (!productCounts[key]) {
                    productCounts[key] = {
                        name: item.name,
                        quantity: 0,
                        spent: 0
                    };
                }
                productCounts[key].quantity += item.quantity;
                productCounts[key].spent += item.price * item.quantity;
            });
        });

        const topProducts = Object.values(productCounts)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        // Render top products
        renderClientTopProducts(topProducts);

        // Render charts
        renderClientSpendingChart(spendingByDate);
        renderClientCategoryChart(categorySpending);

        // Generate insights
        generateClientInsights(filteredOrders, topProducts, categorySpending);

        // NEW: Render activity timeline and recent orders
        renderActivityTimeline(filteredOrders);
        renderRecentOrders(myOrders);

        // NEW: Calculate and display additional metrics
        // Shopping frequency
        const daysInRange = parseInt(timeRange);
        const ordersPerWeek = (totalOrders / (daysInRange / 7)).toFixed(1);
        document.getElementById('clientShoppingFrequency').textContent = `${ordersPerWeek}x`;

        // Best shopping day
        const dayCount = {};
        filteredOrders.forEach(order => {
            const day = new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
            dayCount[day] = (dayCount[day] || 0) + 1;
        });
        const bestDay = Object.keys(dayCount).length > 0
            ? Object.keys(dayCount).reduce((a, b) => dayCount[a] > dayCount[b] ? a : b)
            : 'N/A';
        document.getElementById('clientBestDay').textContent = bestDay;

        // Loyalty status - Based on loyalty points
        const loyaltyPoints = parseInt(localStorage.getItem('loyaltyPoints') || '0');
        let loyaltyStatus = 'New Customer 🌱';
        let loyaltyTier = 'new';

        if (loyaltyPoints >= 5000) {
            loyaltyStatus = 'VIP 👑';
            loyaltyTier = 'vip';
        } else if (loyaltyPoints >= 2500) {
            loyaltyStatus = 'Gold ⭐';
            loyaltyTier = 'gold';
        } else if (loyaltyPoints >= 1000) {
            loyaltyStatus = 'Silver 🥈';
            loyaltyTier = 'silver';
        } else if (loyaltyPoints >= 500) {
            loyaltyStatus = 'Bronze 🥉';
            loyaltyTier = 'bronze';
        }

        const loyaltyStatusElement = document.getElementById('clientLoyaltyStatus');
        if (loyaltyStatusElement) {
            loyaltyStatusElement.textContent = loyaltyStatus;
            // Add points info as subtitle
            const loyaltyCardSubtitle = loyaltyStatusElement.parentElement?.querySelector('.loyalty-points-info');
            if (loyaltyCardSubtitle) {
                loyaltyCardSubtitle.textContent = `${loyaltyPoints} points`;
            }
        }

        // Top category
        if (Object.keys(categorySpending).length > 0) {
            const topCat = Object.keys(categorySpending).reduce((a, b) =>
                categorySpending[a] > categorySpending[b] ? a : b
            );
            document.getElementById('clientTopCategory').textContent = `Top: ${topCat}`;
        } else {
            document.getElementById('clientTopCategory').textContent = 'No data yet';
        }

        // Spending trend
        const trend = totalSpent > 0 ? '📈 Active Shopper' : '📊 Getting Started';
        document.getElementById('clientSpendingTrend').textContent = trend;

        hideLoading();
        showToast('Your shopping insights loaded successfully', 'success');

    } catch (error) {
        console.error('Error loading client analytics:', error);
        hideLoading();
        showToast('Unable to load your shopping insights', 'error');
    }
}

// Render client top products
function renderClientTopProducts(products) {
    const container = document.getElementById('clientTopProducts');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
                <i class="fas fa-shopping-bag" style="font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem;"></i>
                <p>No purchase history yet. Start shopping to see your favorites!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map((product, index) => `
        <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--background); border-radius: 0.75rem; margin-bottom: 0.75rem;">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.25rem;">
                ${index + 1}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 0.25rem;">${product.name}</div>
                <div style="font-size: 0.875rem; color: var(--text-muted);">
                    Purchased ${product.quantity} times • Total: ₱${product.spent.toFixed(2)}
                </div>
            </div>
            <button class="btn btn-sm btn-primary" onclick="searchAndViewProduct('${product.name}')">
                <i class="fas fa-eye"></i> View
            </button>
        </div>
    `).join('');
}

// Render client spending chart
function renderClientSpendingChart(spendingByDate) {
    const canvas = document.getElementById('clientSpendingChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dates = Object.keys(spendingByDate).sort();
    const amounts = dates.map(date => spendingByDate[date]);

    // Simple chart rendering (you can use Chart.js for better visuals)
    canvas.width = canvas.offsetWidth;
    canvas.height = 250;

    if (dates.length === 0) {
        ctx.fillStyle = '#888';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No spending data available', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Draw simple bar chart
    const barWidth = canvas.width / dates.length - 10;
    const maxAmount = Math.max(...amounts);

    amounts.forEach((amount, index) => {
        const barHeight = (amount / maxAmount) * (canvas.height - 40);
        const x = index * (barWidth + 10) + 5;
        const y = canvas.height - barHeight - 20;

        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.fillStyle = '#888';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`₱${amount.toFixed(0)}`, x + barWidth / 2, y - 5);
    });
}

// Render client category chart
function renderClientCategoryChart(categorySpending) {
    const canvas = document.getElementById('clientCategoryChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const categories = Object.keys(categorySpending);
    const amounts = Object.values(categorySpending);

    canvas.width = canvas.offsetWidth;
    canvas.height = 250;

    if (categories.length === 0) {
        ctx.fillStyle = '#888';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No category data available', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Draw simple pie chart
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    const total = amounts.reduce((sum, amt) => sum + amt, 0);

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    let currentAngle = -Math.PI / 2;

    amounts.forEach((amount, index) => {
        const sliceAngle = (amount / total) * 2 * Math.PI;

        ctx.fillStyle = colors[index % colors.length];
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();

        currentAngle += sliceAngle;
    });

    // Draw legend
    let legendY = 10;
    categories.forEach((category, index) => {
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(10, legendY, 15, 15);

        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${category}: ₱${amounts[index].toFixed(0)}`, 30, legendY + 12);

        legendY += 20;
    });
}

// Generate client insights
function generateClientInsights(orders, topProducts, categorySpending) {
    const container = document.getElementById('clientInsights');
    if (!container) return;

    const insights = [];

    // Shopping pattern insight
    if (orders.length > 0) {
        const avgOrdersPerWeek = (orders.length / (parseInt(document.getElementById('clientAnalyticsTimeRange')?.value || 30) / 7)).toFixed(1);
        insights.push({
            icon: 'fa-shopping-cart',
            color: 'var(--success)',
            title: 'Shopping Pattern',
            message: `You shop about ${avgOrdersPerWeek} times per week. ${avgOrdersPerWeek > 2 ? 'You\'re a frequent shopper!' : 'Consider shopping more often for fresher products.'}`
        });
    }

    // Savings opportunity
    const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalSavings = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
    if (totalSavings > 0) {
        insights.push({
            icon: 'fa-percentage',
            color: 'var(--warning)',
            title: 'Savings Opportunity',
            message: `You've saved ₱${totalSavings.toFixed(2)} so far! Check our promotions tab for more deals.`
        });
    } else {
        insights.push({
            icon: 'fa-percentage',
            color: 'var(--warning)',
            title: 'Savings Opportunity',
            message: 'You haven\'t used any discounts yet. Check our promotions for great deals!'
        });
    }

    // Recommendations
    if (topProducts.length > 0) {
        const topCategory = Object.keys(categorySpending).reduce((a, b) =>
            categorySpending[a] > categorySpending[b] ? a : b
        );
        insights.push({
            icon: 'fa-star',
            color: 'var(--info)',
            title: 'Recommendations',
            message: `You love ${topCategory} products! We have new items in this category you might enjoy.`
        });
    }

    container.innerHTML = insights.map(insight => `
        <div style="padding: 1.5rem; background: linear-gradient(135deg, ${insight.color}15, ${insight.color}10); border-radius: 0.75rem; border: 1px solid ${insight.color}30;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                <i class="fas ${insight.icon}" style="color: ${insight.color}; font-size: 1.5rem;"></i>
                <h4>${insight.title}</h4>
            </div>
            <p style="color: var(--text-muted);">${insight.message}</p>
        </div>
    `).join('');
}

// Render activity timeline
function renderActivityTimeline(orders) {
    const container = document.getElementById('clientActivityTimeline');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
                <i class="fas fa-calendar-alt" style="font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem;"></i>
                <p>No activity yet. Start shopping to see your timeline!</p>
            </div>
        `;
        return;
    }

    // Sort orders by date (newest first)
    const sortedOrders = [...orders].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    ).slice(0, 10); // Show last 10

    container.innerHTML = sortedOrders.map((order, index) => {
        const date = new Date(order.createdAt);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const statusColors = {
            pending: 'var(--warning)',
            processing: 'var(--info)',
            shipped: 'var(--primary)',
            delivered: 'var(--success)',
            cancelled: 'var(--error)'
        };

        const statusColor = statusColors[order.status] || 'var(--text-muted)';

        return `
            <div style="display: flex; gap: 1rem; padding: 1rem; background: var(--background); border-radius: 0.75rem; margin-bottom: 0.75rem; border-left: 4px solid ${statusColor};">
                <div style="flex-shrink: 0; text-align: center; min-width: 60px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: ${statusColor};">${date.getDate()}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">${date.toLocaleDateString('en-US', { month: 'short' })}</div>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">Order #${order._id.slice(-6)}</div>
                    <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                        ${order.items.length} item(s) • ₱${order.totalAmount.toFixed(2)}
                    </div>
                    ${order.status !== 'cancelled' && order.status !== 'delivered' ? `
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                            <i class="fas fa-calendar-alt"></i> Est: ${getEstimatedDeliveryDisplay(order)}
                        </div>
                    ` : ''}
                    <div style="display: inline-block; padding: 0.25rem 0.75rem; background: ${statusColor}20; color: ${statusColor}; border-radius: 1rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize;">
                        ${order.status}
                    </div>
                </div>
                <div style="flex-shrink: 0;">
                    <button class="btn btn-sm btn-secondary" onclick="switchTab('orders')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Render recent orders
function renderRecentOrders(orders) {
    const container = document.getElementById('clientRecentOrders');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
                <i class="fas fa-receipt" style="font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem;"></i>
                <p>No orders yet</p>
            </div>
        `;
        return;
    }

    const recentOrders = [...orders].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    ).slice(0, 5);

    container.innerHTML = recentOrders.map(order => {
        const date = new Date(order.createdAt).toLocaleDateString();
        const statusColors = {
            pending: 'var(--warning)',
            processing: 'var(--info)',
            shipped: 'var(--primary)',
            delivered: 'var(--success)'
        };
        const statusColor = statusColors[order.status] || 'var(--text-muted)';

        return `
            <div style="padding: 1rem; background: var(--background); border-radius: 0.5rem; margin-bottom: 0.75rem; border-left: 3px solid ${statusColor};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <div>
                        <div style="font-weight: 600;">Order #${order._id.slice(-6)}</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted);">${date}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: var(--success);">₱${order.totalAmount.toFixed(2)}</div>
                        <div style="font-size: 0.75rem; color: ${statusColor}; text-transform: capitalize;">${order.status}</div>
                    </div>
                </div>
                <div style="font-size: 0.875rem; color: var(--text-muted);">
                    ${order.items.length} item(s)
                    ${order.status !== 'cancelled' && order.status !== 'delivered' ? `
                        • Est: ${getEstimatedDeliveryDisplay(order)}
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Helper function to search and view product
function searchAndViewProduct(productName) {
    switchTab('products');
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        searchInput.value = productName;
        loadProducts({ search: productName });
    }
}

// ============================================
// CLIENT TRANSACTIONS FUNCTIONS
// ============================================

let clientOrdersData = [];
let clientOrdersFilter = 'all';

// Load client transactions
async function loadClientTransactions() {
    const token = localStorage.getItem('token');
    const dateRange = document.getElementById('clientOrderDateRange')?.value || '30';

    try {
        showLoading();

        // Fetch client's orders
        const response = await fetch(`${API_BASE_URL}/orders?mine=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load orders');
        }

        const data = await response.json();
        clientOrdersData = data.orders || [];

        // Filter by date range if not "all"
        if (dateRange !== 'all') {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - parseInt(dateRange));
            clientOrdersData = clientOrdersData.filter(order =>
                new Date(order.createdAt) >= cutoffDate
            );
        }

        // Update summary cards
        updateClientTransactionsSummary(clientOrdersData);

        // Render orders
        renderClientOrders(clientOrdersData);

        hideLoading();
        showToast('Orders loaded successfully', 'success');

    } catch (error) {
        console.error('Error loading client transactions:', error);
        hideLoading();
        showToast('Unable to load orders', 'error');
    }
}

// Update summary cards
function updateClientTransactionsSummary(orders) {
    if (!orders || orders.length === 0) {
        // Set all to 0 if no orders
        const completedEl = document.getElementById('clientCompletedOrders');
        const pendingEl = document.getElementById('clientPendingOrdersCount');
        const purchasesEl = document.getElementById('clientTotalPurchases');
        const discountsEl = document.getElementById('clientTotalDiscounts');

        if (completedEl) completedEl.textContent = '0';
        if (pendingEl) pendingEl.textContent = '0';
        if (purchasesEl) purchasesEl.textContent = '₱0.00';
        if (discountsEl) discountsEl.textContent = '₱0.00';
        return;
    }

    // Get current month orders
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthOrders = orders.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });

    // Completed orders this month
    const completedOrders = monthOrders.filter(o => o.status === 'delivered').length;
    const completedEl = document.getElementById('clientCompletedOrders');
    if (completedEl) completedEl.textContent = completedOrders;

    // Pending orders
    const pendingOrders = orders.filter(o =>
        o.status === 'pending' || o.status === 'processing' || o.status === 'shipped'
    ).length;
    const pendingEl = document.getElementById('clientPendingOrdersCount');
    if (pendingEl) pendingEl.textContent = pendingOrders;

    // Total purchases - ensure we have valid numbers
    const totalPurchases = orders.reduce((sum, order) => {
        const amount = parseFloat(order.totalAmount) || 0;
        return sum + amount;
    }, 0);
    const purchasesEl = document.getElementById('clientTotalPurchases');
    if (purchasesEl) purchasesEl.textContent = `₱${totalPurchases.toFixed(2)}`;

    // Total discounts - ensure we have valid numbers
    const totalDiscounts = orders.reduce((sum, order) => {
        // Try both totalDiscount and discount fields
        const discount = parseFloat(order.totalDiscount || order.discount || 0);
        return sum + discount;
    }, 0);
    const discountsEl = document.getElementById('clientTotalDiscounts');
    if (discountsEl) discountsEl.textContent = `₱${totalDiscounts.toFixed(2)}`;
}

// Render client orders
function renderClientOrders(orders) {
    const container = document.getElementById('clientOrdersList');
    const emptyState = document.getElementById('clientOrdersEmpty');

    if (!container) return;

    // Filter orders based on current filter
    let filteredOrders = orders;
    if (clientOrdersFilter !== 'all') {
        filteredOrders = orders.filter(order => order.status === clientOrdersFilter);
    }

    // Check if empty
    if (filteredOrders.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    // Sort by date (newest first)
    filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    container.innerHTML = filteredOrders.map(order => {
        const date = new Date(order.createdAt);
        const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const statusColors = {
            pending: { bg: 'rgba(245, 158, 11, 0.1)', border: 'var(--warning)', text: 'var(--warning)' },
            processing: { bg: 'rgba(6, 182, 212, 0.1)', border: 'var(--info)', text: 'var(--info)' },
            shipped: { bg: 'rgba(59, 130, 246, 0.1)', border: 'var(--primary)', text: 'var(--primary)' },
            delivered: { bg: 'rgba(16, 185, 129, 0.1)', border: 'var(--success)', text: 'var(--success)' },
            cancelled: { bg: 'rgba(239, 68, 68, 0.1)', border: 'var(--error)', text: 'var(--error)' }
        };

        const statusStyle = statusColors[order.status] || statusColors.pending;

        const statusIcons = {
            pending: 'fa-clock',
            processing: 'fa-cog fa-spin',
            shipped: 'fa-shipping-fast',
            delivered: 'fa-check-circle',
            cancelled: 'fa-times-circle'
        };

        const statusIcon = statusIcons[order.status] || 'fa-clock';

        return `
            <div class="card" style="margin-bottom: 1.5rem; background: ${statusStyle.bg}; border-left: 4px solid ${statusStyle.border};">
                <!-- Order Header -->
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                            <h3 style="margin: 0;">Order #${order._id.slice(-8).toUpperCase()}</h3>
                            <div style="display: inline-block; padding: 0.375rem 0.75rem; background: ${statusStyle.bg}; color: ${statusStyle.text}; border-radius: 1rem; font-size: 0.875rem; font-weight: 600; text-transform: capitalize; border: 2px solid ${statusStyle.border};">
                                <i class="fas ${statusIcon}"></i> ${order.status}
                            </div>
                        </div>
                        <div style="color: var(--text-muted); font-size: 0.95rem;">
                            <i class="fas fa-calendar"></i> ${dateStr}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 2rem; font-weight: bold; color: ${statusStyle.text};">₱${(parseFloat(order.totalAmount) || 0).toFixed(2)}</div>
                        ${(parseFloat(order.totalDiscount || order.discount) || 0) > 0 ? `
                            <div style="font-size: 0.875rem; color: var(--success);">
                                <i class="fas fa-tag"></i> Saved ₱${(parseFloat(order.totalDiscount || order.discount) || 0).toFixed(2)}
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Order Items -->
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-box"></i> Items (${(order.items || []).length})
                    </h4>
                    <div style="display: grid; gap: 0.75rem;">
                        ${(order.items || []).slice(0, 3).map(item => `
                            <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--background); border-radius: 0.5rem;">
                                <div style="width: 48px; height: 48px; background: var(--background-alt); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-box" style="color: var(--text-muted);"></i>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600;">${item.productName || item.name || 'Unknown Item'}</div>
                                    <div style="font-size: 0.875rem; color: var(--text-muted);">
                                        Qty: ${item.quantity || 0} × ₱${(parseFloat(item.unitPrice || item.price) || 0).toFixed(2)}
                                    </div>
                                </div>
                                <div style="font-weight: 600; color: var(--primary);">
                                    ₱${(parseFloat(item.totalPrice) || ((item.quantity || 0) * (parseFloat(item.unitPrice || item.price) || 0))).toFixed(2)}
                                </div>
                            </div>
                        `).join('')}
                        ${(order.items || []).length > 3 ? `
                            <div style="text-align: center; padding: 0.5rem; color: var(--text-muted); font-size: 0.875rem;">
                                + ${(order.items || []).length - 3} more item(s)
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Price Breakdown -->
                ${order.subtotal || order.totalDiscount || order.platformFee ? `
                    <div style="padding: 1rem; background: var(--background); border-radius: 0.5rem; margin-bottom: 1rem; border: 1px solid var(--border);">
                        <h4 style="margin-bottom: 0.75rem; font-size: 0.95rem; color: var(--text-muted);">
                            <i class="fas fa-receipt"></i> Price Breakdown
                        </h4>
                        ${order.subtotal ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
                                <span style="color: var(--text-muted);">Subtotal:</span>
                                <span style="color: var(--text);">₱${(parseFloat(order.subtotal) || 0).toFixed(2)}</span>
                            </div>
                        ` : ''}
                        ${order.totalDiscount && parseFloat(order.totalDiscount) > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
                                <span style="color: var(--success);">Discount:</span>
                                <span style="color: var(--success); font-weight: 600;">-₱${(parseFloat(order.totalDiscount) || 0).toFixed(2)}</span>
                            </div>
                        ` : ''}
                        ${order.platformFee && parseFloat(order.platformFee) > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
                                <span style="color: var(--text-muted);">
                                    <i class="fas fa-shipping-fast"></i> Shipping Fee:
                                </span>
                                <span style="color: var(--text);">₱${(parseFloat(order.platformFee) || 0).toFixed(2)}</span>
                            </div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 1px solid var(--border); margin-top: 0.5rem;">
                            <span style="font-weight: 600;">Total:</span>
                            <span style="font-weight: 700; color: var(--primary); font-size: 1.1rem;">₱${(parseFloat(order.totalAmount) || 0).toFixed(2)}</span>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Order Details -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; padding: 1rem; background: var(--background); border-radius: 0.5rem; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.25rem;">Payment Method</div>
                        <div style="font-weight: 600; text-transform: capitalize;">
                            <i class="fas fa-credit-card"></i> ${(order.payment?.method || order.paymentMethod || 'Cash on Delivery').replace(/_/g, ' ')}
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.25rem;">Delivery Address</div>
                        <div style="font-weight: 600;">
                            <i class="fas fa-map-marker-alt"></i> ${(order.delivery?.address || order.address) ? (order.delivery?.address || order.address).substring(0, 30) + '...' : 'N/A'}
                        </div>
                    </div>
                    ${order.status !== 'cancelled' && order.status !== 'delivered' ? `
                        <div>
                            <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.25rem;">Estimated Delivery</div>
                            <div style="font-weight: 600;">
                                <i class="fas fa-calendar-alt"></i> ${getEstimatedDeliveryDisplay(order)}
                            </div>
                        </div>
                    ` : ''}
                    ${order.reference ? `
                        <div>
                            <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.25rem;">Reference</div>
                            <div style="font-weight: 600;">
                                <i class="fas fa-hashtag"></i> ${order.reference}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Actions -->
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="viewOrderDetails('${order._id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    ${order.status === 'delivered' ? `
                        <button class="btn btn-secondary" onclick="reorderItems('${order._id}')">
                            <i class="fas fa-redo"></i> Reorder
                        </button>
                    ` : ''}
                    ${order.status === 'pending' ? `
                        <button class="btn btn-error" onclick="cancelOrder('${order._id}')">
                            <i class="fas fa-times"></i> Cancel Order
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="downloadInvoice('${order._id}')">
                        <i class="fas fa-download"></i> Invoice
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Filter client orders
function filterClientOrders(status) {
    clientOrdersFilter = status;

    // Update button styles
    ['All', 'Pending', 'Processing', 'Shipped', 'Delivered'].forEach(s => {
        const btn = document.getElementById(`filter${s}`);
        if (btn) {
            if (s.toLowerCase() === status || (s === 'All' && status === 'all')) {
                btn.style.background = 'var(--primary)';
                btn.style.color = 'white';
                btn.classList.remove('btn-secondary');
            } else {
                btn.style.background = '';
                btn.style.color = '';
                btn.classList.add('btn-secondary');
            }
        }
    });

    renderClientOrders(clientOrdersData);
}

// Search client orders
function searchClientOrders() {
    const searchTerm = document.getElementById('clientOrderSearch')?.value.toLowerCase() || '';

    if (!searchTerm) {
        renderClientOrders(clientOrdersData);
        return;
    }

    const filtered = clientOrdersData.filter(order => {
        const orderId = order._id.toLowerCase();
        const items = order.items.map(i => i.name.toLowerCase()).join(' ');
        const status = order.status.toLowerCase();

        return orderId.includes(searchTerm) ||
            items.includes(searchTerm) ||
            status.includes(searchTerm);
    });

    renderClientOrders(filtered);
}

// View order details (redirect to orders tab)
function viewOrderDetails(orderId) {
    switchTab('orders');
    // The orders tab will show the full details
}

// Reorder items
async function reorderItems(orderId) {
    const order = clientOrdersData.find(o => o._id === orderId);
    if (!order) return;

    // Add all items to cart
    for (const item of order.items) {
        await addToCart(item.productId, item.quantity);
    }

    showToast('Items added to cart!', 'success');
    switchTab('cart');
}

// Cancel order
function cancelOrder(orderId) {
    showConfirmDialog({
        title: 'Cancel Order',
        message: 'Are you sure you want to cancel this order? This action cannot be undone.',
        icon: 'exclamation-triangle',
        iconColor: 'var(--error)',
        confirmText: 'Yes, Cancel Order',
        confirmColor: 'var(--error)',
        onConfirm: async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        reason: 'Cancelled by customer'
                    })
                });

                if (response.ok) {
                    showToast('Order cancelled successfully', 'success');
                    loadClientTransactions();
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Failed to cancel order');
                }
            } catch (error) {
                console.error('Error cancelling order:', error);
                showToast(error.message || 'Unable to cancel order', 'error');
            }
        }
    });
}

// Download invoice
async function downloadInvoice(orderId) {
    try {
        showLoading();
        const token = localStorage.getItem('token');

        // Fetch fresh order data from API
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        hideLoading();

        if (!response.ok) {
            showToast('Failed to load order details', 'error');
            return;
        }

        const data = await response.json();
        const order = data.order;

        if (!order) {
            showToast('Order not found', 'error');
            return;
        }

        const orderNumber = order.orderNumber || `ORD-${order._id.slice(-8).toUpperCase()}`;
        const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Create a professional invoice HTML
        const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice - ${orderNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 40px; 
            background: #f5f5f5;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
        }
        .company-info h1 {
            color: #2563eb;
            font-size: 28px;
            margin-bottom: 5px;
        }
        .company-info p {
            color: #666;
            font-size: 14px;
        }
        .invoice-details {
            text-align: right;
        }
        .invoice-details h2 {
            color: #333;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .invoice-details p {
            color: #666;
            font-size: 14px;
            margin: 5px 0;
        }
        .customer-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .customer-info h3 {
            color: #333;
            font-size: 16px;
            margin-bottom: 10px;
        }
        .customer-info p {
            color: #666;
            font-size: 14px;
            margin: 5px 0;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table thead {
            background: #2563eb;
            color: white;
        }
        .items-table th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        .items-table th:last-child,
        .items-table td:last-child {
            text-align: right;
        }
        .items-table tbody tr {
            border-bottom: 1px solid #e5e7eb;
        }
        .items-table td {
            padding: 12px;
            color: #333;
        }
        .totals {
            margin-left: auto;
            width: 300px;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .totals-row.total {
            border-top: 2px solid #2563eb;
            border-bottom: 2px solid #2563eb;
            font-weight: bold;
            font-size: 18px;
            color: #2563eb;
            margin-top: 10px;
        }
        .payment-info {
            background: #f0fdf4;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #10b981;
            margin-top: 30px;
        }
        .payment-info h3 {
            color: #065f46;
            font-size: 16px;
            margin-bottom: 10px;
        }
        .payment-info p {
            color: #047857;
            font-size: 14px;
            margin: 5px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        @media print {
            body { padding: 0; background: white; }
            .invoice-container { box-shadow: none; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="company-info">
                <h1>FrozenFlow Trading</h1>
                <p>Frozen Goods & Supplies</p>
                <p>Email: info@frozenflow.com</p>
                <p>Phone: +63 917 123 4567</p>
            </div>
            <div class="invoice-details">
                <h2>INVOICE</h2>
                <p><strong>Invoice #:</strong> ${orderNumber}</p>
                <p><strong>Date:</strong> ${orderDate}</p>
                <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
            </div>
        </div>

        <div class="customer-info">
            <h3>Bill To:</h3>
            <p><strong>${order.customer?.username || 'Customer'}</strong></p>
            ${order.customer?.email ? `<p>Email: ${order.customer.email}</p>` : ''}
            ${order.customer?.business_name ? `<p>Business: ${order.customer.business_name}</p>` : ''}
            ${order.delivery?.address || order.address ? `<p>Address: ${order.delivery?.address || order.address}</p>` : ''}
            ${order.delivery?.contactNumber ? `<p>Phone: ${order.delivery.contactNumber}</p>` : ''}
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${order.items.map(item => `
                    <tr>
                        <td>${item.productName || item.name || 'Unknown Product'}</td>
                        <td style="text-align: center;">${item.quantity}</td>
                        <td style="text-align: right;">₱${(item.unitPrice || item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style="text-align: right;">₱${(item.totalPrice || (item.quantity * (item.unitPrice || item.price || 0)) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals">
            <div class="totals-row">
                <span>Subtotal:</span>
                <span>₱${(order.subtotal || order.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            ${order.totalDiscount && order.totalDiscount > 0 ? `
                <div class="totals-row" style="color: #10b981;">
                    <span>Discount:</span>
                    <span>-₱${order.totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            ` : ''}
            <div class="totals-row total">
                <span>Total:</span>
                <span>₱${(order.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        </div>

        <div class="payment-info">
            <h3>Payment Information</h3>
            <p><strong>Payment Method:</strong> ${(order.payment?.method || order.paymentMethod || 'COD').toUpperCase()}</p>
            <p><strong>Payment Status:</strong> ${order.payment?.status === 'verified' ? 'PAID' : order.payment?.status === 'pending' ? 'PENDING' : 'UNPAID'}</p>
            ${order.payment?.reference ? `<p><strong>Reference:</strong> ${order.payment.reference}</p>` : ''}
        </div>

        <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
            <p>For any questions, please contact us at info@frozenflow.com</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 30px;">
            <button onclick="window.print()" style="
                background: #2563eb;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 6px;
                font-size: 16px;
                cursor: pointer;
                margin-right: 10px;
            ">
                Print Invoice
            </button>
            <button onclick="window.close()" style="
                background: #6b7280;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 6px;
                font-size: 16px;
                cursor: pointer;
            ">
                Close
            </button>
        </div>
    </div>
</body>
</html>
        `;

        // Open invoice in new window
        const invoiceWindow = window.open('', '_blank');
        if (invoiceWindow) {
            invoiceWindow.document.write(invoiceHTML);
            invoiceWindow.document.close();
        } else {
            showToast('Please allow popups to view invoice', 'warning');
        }

    } catch (error) {
        console.error('Error generating invoice:', error);
        hideLoading();
        showToast('Failed to generate invoice', 'error');
    }
}

async function loadAnalytics() {
    const token = localStorage.getItem('token');
    const role = (currentUser?.role || 'client').toLowerCase();
    const timeRange = document.getElementById('analyticsTimeRange')?.value || '30';

    try {
        showLoading();

        const endpoint = `${API_BASE_URL}/analytics/detailed?days=${timeRange}`;

        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            const data = result.data;

            // Update all analytics components
            updateSalesTrendChart(data.salesTrend);
            updateTopProductsList(data.topProducts);
            updateCategoryChart(data.categoryBreakdown);
            updateOrderStatusChart(data.orderStatusDistribution);
            updateRevenueMetrics(data.revenueMetrics);
            updateInsights(data.insights);

            // Also update performance metrics
            loadPerformanceMetrics();

            hideLoading();
            showToast('Analytics loaded successfully', 'success');
        } else {
            hideLoading();
            const error = await response.json().catch(() => ({ message: 'Failed to load analytics' }));
            showToast(error.message || 'Failed to load analytics', 'error');
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
        hideLoading();
        showToast('Unable to load analytics. Please check your connection.', 'error');
    }
}

// Update analytics charts display
function updateAnalyticsCharts(data) {
    try {
        const ctx = document.getElementById('salesChart');
        if (ctx) {
            // Destroy existing chart if it exists
            if (window.salesChart && typeof window.salesChart.destroy === 'function') {
                window.salesChart.destroy();
            }

            const series = data?.sales?.series || [12, 19, 3, 5, 2, 3, 9];
            const labels = data?.sales?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            window.salesChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Sales',
                        data: series,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.2)',
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
        const topEl = document.getElementById('topProducts');
        if (topEl && data?.topProducts) {
            topEl.innerHTML = data.topProducts.map((p, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--background); border-radius: 0.5rem; margin-bottom: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; color: white;">${idx + 1}</div>
                        <div>
                            <div style="font-weight: 600;">${p.name}</div>
                            <div style="font-size: 0.875rem; color: var(--text-muted);">${p.units} units sold</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600;">₱${p.revenue.toLocaleString()}</div>
                        <div style="font-size: 0.875rem; color: var(--success);">${p.growth || '+0%'}
                    </div>
                </div>
            `).join('');
        }
        showToast('Analytics charts loaded successfully!', 'success');
    } catch (e) {
        console.warn('Chart render failed', e);
    }
}

// Update client-focused analytics
function updateClientAnalytics(data) {
    if (!data) return;

    const analyticsSection = document.getElementById('analyticsSection');
    if (!analyticsSection) return;

    // Replace the admin analytics content with client-friendly content
    analyticsSection.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h2 style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-chart-bar"></i>
                Insights & Trends
            </h2>
            <button class="btn btn-primary" onclick="loadAnalytics()">
                <i class="fas fa-sync-alt"></i> Refresh
            </button>
        </div>
        
        <!-- Best Selling Products -->
        <div class="card" style="margin-bottom: 2rem;">
            <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-fire" style="color: var(--error);"></i>
                Best Selling Products
            </h3>
            <div id="bestSellingProducts" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                ${data.bestSellingProducts?.slice(0, 6).map((product, index) => `
                    <div style="padding: 1rem; background: var(--background); border-radius: 0.5rem; border-left: 4px solid var(--primary);">
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                            <div style="width: 32px; height: 32px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${index + 1}</div>
                            <div>
                                <div style="font-weight: 600;">${product.name || 'Product'}</div>
                                <div style="font-size: 0.875rem; color: var(--text-muted);">${product.totalSold || 0} units sold</div>
                            </div>
                        </div>
                        <div style="text-align: center;">
                            <button class="btn btn-sm btn-primary" onclick="switchTab('products'); searchProducts('${product.name}')">
                                <i class="fas fa-eye"></i> View Product
                            </button>
                        </div>
                    </div>
                `).join('') || '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No best selling products data available</p>'}
            </div>
        </div>
        
        <!-- Stock Insights -->
        <div class="card" style="margin-bottom: 2rem;">
            <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-boxes" style="color: var(--warning);"></i>
                Stock Insights
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                <div>
                    <h4 style="margin-bottom: 1rem; color: var(--warning);">Low Stock Items</h4>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${data.stockInsights?.lowStock?.length ? data.stockInsights.lowStock.map(item => `
                            <div style="padding: 0.75rem; background: rgba(245, 158, 11, 0.1); border-radius: 0.5rem; margin-bottom: 0.5rem; border-left: 4px solid var(--warning);">
                                <div style="font-weight: 600; color: var(--warning);">${item.name}</div>
                                <div style="font-size: 0.875rem; color: var(--text-muted);">${item.category} • ${item.status}</div>
                            </div>
                        `).join('') : '<p style="color: var(--text-muted); padding: 1rem; text-align: center;">No low stock items</p>'}
                    </div>
                </div>
                <div>
                    <h4 style="margin-bottom: 1rem; color: var(--error);">Almost Sold Out</h4>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${data.stockInsights?.almostSoldOut?.length ? data.stockInsights.almostSoldOut.map(item => `
                            <div style="padding: 0.75rem; background: rgba(239, 68, 68, 0.1); border-radius: 0.5rem; margin-bottom: 0.5rem; border-left: 4px solid var(--error);">
                                <div style="font-weight: 600; color: var(--error);">${item.name}</div>
                                <div style="font-size: 0.875rem; color: var(--text-muted);">${item.category} • ${item.status}</div>
                            </div>
                        `).join('') : '<p style="color: var(--text-muted); padding: 1rem; text-align: center;">All items well stocked</p>'}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Category Popularity & Delivery Performance -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
            <div class="card">
                <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-chart-pie" style="color: var(--info);"></i>
                    Category Popularity
                </h3>
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${data.categoryPopularity?.map((cat, index) => {
        const percentage = Math.max(10, (cat.productCount || 1) * 10);
        return `
                            <div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                    <span style="font-weight: 600; text-transform: capitalize;">${cat.category}</span>
                                    <span style="color: var(--text-muted);">${cat.productCount} products</span>
                                </div>
                                <div style="background: var(--background); border-radius: 1rem; overflow: hidden;">
                                    <div style="width: ${percentage}%; height: 8px; background: linear-gradient(90deg, var(--primary), var(--info)); transition: width 0.3s;"></div>
                                </div>
                            </div>
                        `;
    }).join('') || '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">No category data available</p>'}
                </div>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-truck" style="color: var(--success);"></i>
                    Delivery Performance
                </h3>
                <div style="text-align: center;">
                    <div style="font-size: 3rem; font-weight: bold; color: var(--success); margin-bottom: 0.5rem;">
                        ${data.deliveryPerformance?.averageDeliveryTime || 2}
                    </div>
                    <div style="color: var(--text-muted); margin-bottom: 2rem;">Average delivery time (days)</div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: center;">
                        <div style="padding: 1rem; background: var(--background); border-radius: 0.5rem;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">
                                ${data.deliveryPerformance?.totalDelivered || 0}
                            </div>
                            <div style="color: var(--text-muted); font-size: 0.875rem;">Orders Delivered</div>
                        </div>
                        <div style="padding: 1rem; background: var(--background); border-radius: 0.5rem;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--success);">
                                98.5%
                            </div>
                            <div style="color: var(--text-muted); font-size: 0.875rem;">Success Rate</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Active Promotions -->
        <div class="card">
            <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-tags" style="color: var(--primary);"></i>
                Active Promotions & Discounts
            </h3>
            <div id="clientActivePromotions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem;">
                ${data.activePromotions?.length ? data.activePromotions.map(promo => `
                    <div style="padding: 1.5rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1)); border-radius: 0.75rem; border: 2px solid rgba(16, 185, 129, 0.3); position: relative;">
                        <div style="position: absolute; top: -8px; right: 15px; background: var(--success); color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-weight: bold; font-size: 0.75rem;">
                            ${promo.discountPercentage || 'SALE'}% OFF
                        </div>
                        <h4 style="margin-bottom: 0.5rem; color: var(--success);">${promo.title}</h4>
                        <p style="color: var(--text-muted); margin-bottom: 1rem; font-size: 0.875rem;">${promo.description || 'Special limited-time offer!'}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="color: var(--text-muted); font-size: 0.875rem;">
                                <i class="fas fa-clock"></i> 
                                ${promo.endDate ?
            `Ends ${new Date(promo.endDate).toLocaleDateString()}` :
            'Limited time offer'
        }
                            </div>
                            <button class="btn btn-success btn-sm" onclick="switchTab('products')">
                                <i class="fas fa-shopping-cart"></i> Shop Now
                            </button>
                        </div>
                    </div>
                `).join('') : `
                    <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        <i class="fas fa-tag" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <h4>No Active Promotions</h4>
                        <p>Check back soon for amazing deals and discounts!</p>
                    </div>
                `}
            </div>
        </div>
    `;

    showToast('Client insights loaded successfully!', 'success');
}

// Product management
async function handleAddProduct(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const productData = {
        name: formData.get('name'),
        description: formData.get('description'),
        brand: formData.get('brand'),
        category: formData.get('category'),
        price: parseFloat(formData.get('price')),
        unit: formData.get('unit'),
        stock: parseInt(formData.get('stock')),
        minStock: parseInt(formData.get('minStock')),
        maxStock: parseInt(formData.get('maxStock')) || 1000,
        storage: {
            temperature: parseInt(formData.get('temperature')) || -18,
            shelfLife: parseInt(formData.get('shelfLife')) || 365
        }
    };

    // Add batch information if provided (for expiry tracking)
    const batchNumber = formData.get('batchNumber');
    const expiryDate = formData.get('expiryDate');
    const receivedDate = formData.get('receivedDate');

    if (batchNumber && expiryDate) {
        const batchQuantity = parseInt(formData.get('stock'));
        productData.batchInfo = [{
            batchNumber: batchNumber,
            expiryDate: new Date(expiryDate),
            quantity: batchQuantity,
            remainingQuantity: batchQuantity, // Set remaining quantity same as initial quantity
            receivedDate: receivedDate ? new Date(receivedDate) : new Date()
        }];
    }

    // Validate required fields
    if (!productData.name || !productData.category || !productData.price || !productData.unit || productData.stock === undefined || productData.minStock === undefined) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    try {
        showLoading();
        const token = localStorage.getItem('token');

        // Create product first
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });

        if (response.ok) {
            const data = await response.json();
            const newProductId = data.product._id;

            // Check if there's an image to upload
            const imageFile = formData.get('image');
            if (imageFile && imageFile.size > 0) {
                console.log('📤 Uploading image for new product:', newProductId);
                const imageFormData = new FormData();
                imageFormData.append('image', imageFile);
                imageFormData.append('alt', productData.name);

                const imageResponse = await fetch(`${API_BASE_URL}/products/${newProductId}/images`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: imageFormData
                });

                if (imageResponse.ok) {
                    console.log('✅ Image uploaded successfully');
                } else {
                    console.warn('⚠️ Image upload failed, but product was created');
                }
            }

            hideLoading();
            showToast('Product created successfully!', 'success');
            closeAddProductModal();
            loadProducts(); // Refresh products list
            if (typeof loadInventory === 'function') {
                loadInventory(); // Refresh inventory data
            }
        } else {
            const errorData = await response.json();
            hideLoading();
            showToast(errorData.message || 'Error creating product', 'error');
        }
    } catch (error) {
        console.error('Error creating product:', error);
        hideLoading();
        showToast('Failed to create product - server error', 'error');
    }
}

// Stock management
async function handleAddStock(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const stockData = {
        productId: formData.get('product'),
        quantity: parseInt(formData.get('quantity')),
        reason: formData.get('reason')
    };

    // Validate required fields
    if (!stockData.productId || !stockData.quantity || !stockData.reason) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    if (stockData.quantity <= 0) {
        showToast('Quantity must be greater than 0', 'error');
        return;
    }

    showLoading();

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/inventory/add-stock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(stockData)
        });

        const responseData = await response.json();

        if (response.ok) {
            showToast('Stock added successfully!', 'success');
            e.target.reset();
            loadInventory(); // Refresh inventory data
            loadProducts(); // Refresh products list to show updated stock
        } else {
            showToast(responseData.message || 'Error adding stock', 'error');
        }
    } catch (error) {
        console.error('Error adding stock:', error);
        showToast('Failed to add stock - connection error', 'error');
    }

    hideLoading();
}

async function handleRemoveStock(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const stockData = {
        productId: formData.get('product'),
        quantity: parseInt(formData.get('quantity')),
        reason: formData.get('reason')
    };

    // Validate required fields
    if (!stockData.productId || !stockData.quantity || !stockData.reason) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    if (stockData.quantity <= 0) {
        showToast('Quantity must be greater than 0', 'error');
        return;
    }

    showLoading();

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/inventory/remove-stock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(stockData)
        });

        const responseData = await response.json();

        if (response.ok) {
            showToast('Stock removed successfully!', 'success');
            e.target.reset();
            loadInventory(); // Refresh inventory data
            loadProducts(); // Refresh products list to show updated stock
        } else {
            showToast(responseData.message || 'Error removing stock', 'error');
        }
    } catch (error) {
        console.error('Error removing stock:', error);
        showToast('Failed to remove stock - connection error', 'error');
    }

    hideLoading();
}

// UI Update functions
function updateStatsGrid(data) {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid || !data) return;

    // If client-focused metrics are present, render those; otherwise fall back to admin metrics
    const role = (currentUser?.role || 'client').toLowerCase();
    if (role === 'client' && (data.myOrders !== undefined || data.cartItems !== undefined)) {
        const stats = [
            { value: data.myOrders?.pending ?? 0, label: 'My Orders (Pending)', icon: 'fa-clock', color: 'warning' },
            { value: data.myOrders?.completed ?? 0, label: 'My Orders (Completed)', icon: 'fa-check-circle', color: 'success' },
            { value: data.cartItems ?? 0, label: 'My Cart (Items)', icon: 'fa-shopping-cart', color: 'info' },
            { value: data.discountsAvailable ?? 0, label: 'Available Discounts', icon: 'fa-tags', color: 'purple' }
        ];
        statsGrid.innerHTML = stats.map(stat => `
            <div class="stat-card stat-card-enhanced">
                <div class="stat-icon stat-icon-${stat.color}">
                    <i class="fas ${stat.icon}"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                </div>
            </div>
        `).join('');
        return;
    }

    // Clean, simple stats cards matching the design
    const stats = [
        {
            value: data.totalProducts || '0',
            label: 'TOTAL PRODUCTS',
            icon: 'fa-box',
            iconBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            growth: data.productsGrowth || null
        },
        {
            value: data.lowStockItems || '0',
            label: 'LOW STOCK ITEMS',
            icon: 'fa-exclamation-triangle',
            iconBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            growth: null
        },
        {
            value: data.pendingOrders || '0',
            label: 'PENDING ORDERS',
            icon: 'fa-clock',
            iconBg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            growth: null
        },
        {
            value: data.todaysSales || '₱0',
            label: 'TODAY\'S SALES',
            icon: 'fa-chart-line',
            iconBg: 'linear-gradient(135deg, #ffa751 0%, #ffe259 100%)',
            growth: data.salesGrowth || null,
            comparison: data.yesterdaySales ? `Yesterday: ${data.yesterdaySales}` : null
        }
    ];

    statsGrid.innerHTML = stats.map(stat => `
        <div class="stat-card" style="background: white; border-radius: 12px; padding: 2rem 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.08); border: 1px solid #f1f5f9; transition: all 0.2s ease; text-align: center;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.08)'">
            <div style="width: 64px; height: 64px; background: ${stat.iconBg}; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem;">
                <i class="fas ${stat.icon}" style="font-size: 1.75rem; color: white;"></i>
            </div>
            <div style="font-size: 2.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem; line-height: 1;">${stat.value}</div>
            <div style="color: #94a3b8; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">${stat.label}</div>
            ${stat.comparison ? `<div style="color: #cbd5e1; font-size: 0.75rem; margin-top: 0.5rem;">${stat.comparison}</div>` : ''}
        </div>
    `).join('');
}

function updateRecentActivities(data) {
    // Update recent orders with enhanced display
    const recentOrdersContainer = document.getElementById('recentOrders');
    if (recentOrdersContainer) {
        const orders = data?.recentOrders || getRecentActivities('orders');
        if (!orders || orders.length === 0) {
            recentOrdersContainer.innerHTML = '<div class="text-sm" style="color: var(--text-muted);">No recent orders.</div>';
        } else {
            recentOrdersContainer.innerHTML = orders.slice(0, 5).map(order => `
                <div class="activity-item" style="padding: 1rem; border-left: 3px solid var(--${getOrderStatusColor(order.status)}); margin-bottom: 0.5rem; background: var(--background); border-radius: 0.5rem; cursor:pointer; transition: all 0.2s;" onclick="switchTab('transactions'); viewOrderDetails('${order._id || order.id}');" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${order.orderNumber || order._id}</strong>
                            <span class="badge badge-${getOrderStatusColor(order.status)}" style="margin-left: 0.5rem; font-size: 0.75rem;">${order.status}</span>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 600;">₱${(order.totalAmount || 0).toLocaleString()}</div>
                            <small style="color: var(--text-muted);">${order.timeAgo || formatTimeAgo(order.createdAt)}</small>
                        </div>
                    </div>
                    <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-muted);">
                        ${order.items?.length || 0} items • ${order.customerName || currentUser?.business_name || 'Customer'}
                        ${order.status !== 'cancelled' && order.status !== 'delivered' ? `
                            • Est: ${getEstimatedDeliveryDisplay(order)}
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }
    }

    // Update inventory alerts with enhanced display
    const inventoryAlertsContainer = document.getElementById('inventoryAlerts');
    if (inventoryAlertsContainer) {
        const alerts = data?.inventoryAlerts || getRecentActivities('alerts');
        if (!alerts || alerts.length === 0) {
            inventoryAlertsContainer.innerHTML = '<div class="text-sm" style="color: var(--text-muted);">No inventory alerts.</div>';
        } else {
            inventoryAlertsContainer.innerHTML = alerts.slice(0, 5).map(alert => `
                <div class="activity-item" style="padding: 1rem; border-left: 3px solid var(--${alert.severity || 'warning'}); margin-bottom: 0.5rem; background: var(--background); border-radius: 0.5rem; cursor:pointer; transition: all 0.2s;" onclick="switchTab('products'); filterProducts({search: '${alert.productName}'});" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${alert.productName}</strong>
                            <div style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">${alert.message}</div>
                        </div>
                        <div style="text-align: right;">
                            <i class="fas fa-${alert.severity === 'error' ? 'exclamation-triangle' : 'info-circle'}" style="color: var(--${alert.severity || 'warning'});"></i>
                        </div>
                    </div>
                    <small style="color: var(--text-muted);">${alert.action || 'Check inventory'}</small>
                </div>
            `).join('');
        }
    }

    // Update recently viewed products with enhanced display
    const viewedEl = document.getElementById('recentlyViewed');
    if (viewedEl) {
        const viewed = getRecentlyViewed();
        if (!viewed.length) {
            viewedEl.innerHTML = '<div class="text-sm" style="color: var(--text-muted);">No viewed products yet.</div>';
        } else {
            viewedEl.innerHTML = viewed.slice(0, 5).map(v => `
                <div class="activity-item" style="padding: 0.75rem; border-left: 3px solid var(--info); margin-bottom: 0.5rem; background: var(--background); border-radius: 0.5rem; cursor:pointer; transition: all 0.2s;" onclick="switchTab('products'); focusProduct('${v.productId}')" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${v.name}</strong>
                            <div style="font-size: 0.875rem; color: var(--text-muted);">₱${v.price.toFixed(2)} / ${v.unit}</div>
                        </div>
                        <div style="text-align: right;">
                            <i class="fas fa-eye" style="color: var(--info);"></i>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Update payments/transactions section
    const paymentsEl = document.getElementById('recentPayments');
    if (paymentsEl) {
        const payments = data?.recentPayments || getRecentActivities('payments');
        if (!payments || payments.length === 0) {
            paymentsEl.innerHTML = '<div class="text-sm" style="color: var(--text-muted);">No recent payments.</div>';
        } else {
            paymentsEl.innerHTML = payments.slice(0, 5).map(payment => `
                <div class="activity-item" style="padding: 1rem; border-left: 3px solid var(--${payment.status === 'completed' ? 'success' : 'warning'}); margin-bottom: 0.5rem; background: var(--background); border-radius: 0.5rem; cursor:pointer; transition: all 0.2s;" onclick="switchTab('transactions');" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${payment.method || 'Payment'}</strong>
                            <div style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">${payment.reference || 'No reference'}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 600;">₱${(payment.amount || 0).toLocaleString()}</div>
                            <small style="color: var(--text-muted);">${payment.timeAgo || formatTimeAgo(payment.createdAt)}</small>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
}

function renderPromotions(promotions) {
    const container = document.getElementById('overviewPromotionsList');
    if (!container) return;

    // For clients, skip this render - renderEnhancedClientOverview handles it
    const role = (currentUser?.role || 'client').toLowerCase();
    if (role === 'client') {
        // Don't render here, let renderEnhancedClientOverview handle it
        return;
    }

    // Admin/Staff view - simple list
    if (!promotions.length) {
        container.innerHTML = '<div class="text-sm" style="color: var(--text-muted);">No active promotions.</div>';
        return;
    }
    container.innerHTML = promotions.map(p => `
        <div style="padding: 1rem; border-left: 3px solid var(--primary); margin-bottom: 0.5rem; background: var(--background); border-radius: 0.5rem; cursor:pointer;" onclick="filterByPromotion('${p._id}')">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
                <div>
                    <strong>${p.name}</strong>
                    <div class="text-sm" style="color: var(--text-muted);">${p.description || ''}</div>
                </div>
                <button class="btn btn-primary" onclick="event.stopPropagation(); buyPromotion('${p._id}')"><i class="fas fa-cart-plus"></i> Buy</button>
            </div>
        </div>
    `).join('');
}

function filterByPromotion(promoId) {
    switchTab('products');
    // In absence of promo-product mapping here, just focus the grid and show toast
    showToast('Showing products. Promotion will apply on applicable items at checkout.', 'info');
}

function renderClientPromotions(promotions) {
    const container = document.getElementById('clientPromotionsList');
    if (!container) return;

    if (promotions.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <i class="fas fa-tag" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h4>No Special Offers Right Now</h4>
                <p>Check back soon for amazing deals!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = promotions.map(promo => {
        const discountValue = promo.discount?.value || 0;
        const discountType = promo.discount?.type || 'percentage';
        const discountText = discountType === 'percentage'
            ? `${discountValue}% OFF`
            : `₱${Number(discountValue).toLocaleString()} OFF`;

        return `
        <div style="padding: 1.5rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1)); border-radius: 0.75rem; border: 2px solid rgba(16, 185, 129, 0.3); position: relative; overflow: hidden;">
            <div style="position: absolute; top: -10px; right: -10px; background: var(--success); color: white; padding: 0.5rem 1rem; border-radius: 0 0 0 1rem; font-weight: bold; font-size: 0.875rem;">
                ${discountText}
            </div>
            <h4 style="margin-bottom: 0.5rem; color: var(--success); font-size: 1.25rem;">${promo.name}</h4>
            <p style="color: var(--text-muted); margin-bottom: 1rem; line-height: 1.5;">${promo.description || 'Special offer for our valued customers!'}</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 0.875rem; color: var(--text-muted);">
                    <i class="fas fa-clock"></i> Limited time offer
                </div>
                <button class="btn btn-success" onclick="buyPromotion('${promo._id}')" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                    <i class="fas fa-shopping-cart"></i> Shop Now
                </button>
            </div>
        </div>
        `;
    }).join('');
}

async function buyPromotion(promoId) {
    try {
        // For simplicity, apply promotion to all cart items or add first applicable product
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/promotions/active`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        const promo = (data.promotions || []).find(x => x._id === promoId);
        if (!promo) return;
        // If promo has specific products, add the first one to cart
        if (promo.rules?.products?.length) {
            const prod = promo.rules.products[0];
            addToCart(prod._id, prod.name, prod.price, prod.unit);
            showToast('Added promotional product to cart', 'success');
            switchTab('cart');
        } else {
            // Otherwise just show the cart (discounts will apply on checkout)
            showToast('Promotion will apply at checkout', 'info');
            switchTab('cart');
        }
    } catch (e) {
        console.error('Buy promotion error', e);
        showToast('Failed to apply promotion', 'error');
    }
}

// Update products grid display
function updateProductsGrid(products) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    if (!products || products.length === 0) {
        productsGrid.innerHTML = `
            <div class="card" style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                <i class="fas fa-box" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <h3 style="color: var(--text-muted);">No Products Found</h3>
                <p style="color: var(--text-muted);">Products will appear here when they are added to the system.</p>
            </div>
        `;
        return;
    }
    const role = window.currentUserRole || (currentUser?.role || 'client').toLowerCase();
    const isAdmin = role === 'admin';
    const isStaff = role === 'staff';
    const isClient = role === 'client';

    productsGrid.innerHTML = products.map(product => {
        const stockStatus = getStockStatus(product.stock, product.minStock);
        const statusBadge = getStockStatusBadge(product.stock, product.minStock);
        const icon = getProductIcon(product.category);

        // DEBUG: Log product data
        console.log('🔍 Product:', product.name);
        console.log('📦 Images array:', product.images);
        console.log('🔢 Images count:', product.images ? product.images.length : 0);

        // Check for uploaded image
        const imageUrl = product.images && product.images.length > 0
            ? `${API_BASE_URL.replace('/api', '')}${product.images[0].url}`
            : null;

        console.log('🖼️ Image URL:', imageUrl);

        return `
            <div class="product-card interactive" onclick="addToRecentlyViewed('${product._id}', '${product.name}', ${product.price}, '${product.unit}')">
                <div class="product-image">
                    ${imageUrl ?
                `<img src="${imageUrl}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">` :
                `<i class="fas fa-${icon}"></i>`
            }
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price">₱${product.price.toFixed(2)}/${product.unit}</div>
                    <div class="product-badges">
                        <span class="badge badge-${statusBadge}">${stockStatus}</span>
                        ${product.promotions && product.promotions.length > 0 ?
                `<span class="badge badge-info">${product.promotions[0].name}</span>` : ''}
                        <span class="badge badge-success" style="background: var(--success); color: white;" onclick="event.stopPropagation(); checkDiscountForProduct('${product._id}', ${product.price})">
                            <i class="fas fa-percentage"></i> Check Discounts
                        </span>
                    </div>
                    <p style="color: var(--text-muted); margin-bottom: 1rem;">${product.description || 'No description available'}</p>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${(isAdmin || isStaff) ? `
                            <button class="btn btn-primary" style="flex: 1;" onclick="event.stopPropagation(); openEditProductModal('${product._id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-secondary" style="flex: 1;" onclick="event.stopPropagation(); viewProductAnalytics('${product._id}')">
                                <i class="fas fa-chart-line"></i> Analytics
                            </button>
                            <button class="btn btn-info" style="flex: 1;" onclick="event.stopPropagation(); showImageUploadModal('${product._id}')">
                                <i class="fas fa-image"></i> Images
                            </button>
                        ` : `
                            <button class="btn btn-primary" style="flex: 1;" onclick="event.stopPropagation(); addToCart('${product._id}', '${product.name}', ${product.price}, '${product.unit}')" ${product.stock <= 0 ? 'disabled' : ''}>
                                <i class="fas fa-cart-plus"></i> ${product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                            </button>
                            <button class="btn btn-secondary" onclick="event.stopPropagation(); addToWishlist('${product._id}', '${product.name}', ${product.price}, '${product.unit}')">
                                <i class="fas fa-heart"></i>
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function buyNow(productId, name, price, unit) {
    addToCart(productId, name, price, unit);
    goToCheckout();
}

// Wishlist support (localStorage)
function getWishlist() {
    try { return JSON.parse(localStorage.getItem('wishlist') || '[]'); } catch { return []; }
}

function addToWishlist(productId, name, price, unit) {
    const wishlist = getWishlist();
    const existing = wishlist.find(i => i.productId === productId);
    if (existing) {
        showToast('Item already in wishlist', 'info');
        return;
    }
    wishlist.push({ productId, name, price, unit, addedAt: new Date().toISOString() });
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    showToast(`${name} added to wishlist`, 'success');
    renderWishlist();
}

function removeFromWishlist(productId) {
    const wishlist = getWishlist().filter(i => i.productId !== productId);
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    showToast('Item removed from wishlist', 'success');
    renderWishlist();
}

function renderWishlist() {
    const container = document.getElementById('wishlistItems');
    if (!container) return;

    const wishlist = getWishlist();
    if (wishlist.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-heart" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>Your wishlist is empty</h3>
                <p>Add products you love to keep track of them</p>
            </div>
        `;
        return;
    }

    container.innerHTML = wishlist.map(item => `
        <div class="card" style="padding: 1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 1rem;">
            <div style="flex: 1;">
                <div style="font-weight: 600;">${item.name}</div>
                <div style="color: var(--text-muted); font-size: 0.875rem;">₱${item.price.toFixed(2)} / ${item.unit}</div>
                <div style="color: var(--text-muted); font-size: 0.75rem;">Added ${new Date(item.addedAt).toLocaleDateString()}</div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-primary" onclick="addToCart('${item.productId}', '${item.name}', ${item.price}, '${item.unit}')">
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
                <button class="btn" style="background: var(--error); color: white;" onclick="removeFromWishlist('${item.productId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function moveWishlistToCart() {
    const wishlist = getWishlist();
    wishlist.forEach(item => {
        addToCart(item.productId, item.name, item.price, item.unit);
    });
    localStorage.setItem('wishlist', '[]');
    renderWishlist();
    showToast('All wishlist items moved to cart', 'success');
}

function saveWishlist(list) {
    localStorage.setItem('wishlist', JSON.stringify(list));
}

function toggleWishlist(productId, name, price, unit) {
    const list = getWishlist();
    const idx = list.findIndex(i => i.productId === productId);
    if (idx >= 0) {
        list.splice(idx, 1);
        showToast('Removed from wishlist', 'info');
    } else {
        list.push({ productId, name, price, unit, addedAt: new Date().toISOString() });
        showToast('Added to wishlist', 'success');
    }
    saveWishlist(list);
}

// Order tracking functionality
async function loadOrderTracking() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            renderOrderTracking(data.orders || []);
        } else {
            renderOrderTracking([]);
        }
    } catch (error) {
        console.error('Error loading order tracking:', error);
        renderOrderTracking([]);
    }
}

function renderOrderTracking(orders) {
    const container = document.getElementById('orderTrackingList');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <i class="fas fa-shipping-fast" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No recent orders to track</p>
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(order => {
        const statusColor = getOrderStatusColor(order.status);
        const progress = getOrderProgress(order.status);

        return `
            <div class="card" style="padding: 1rem; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div>
                        <strong>Order #${order.orderNumber || order._id}</strong>
                        <div style="color: var(--text-muted); font-size: 0.875rem;">
                            ${new Date(order.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                    <span class="badge badge-${statusColor}">${order.status}</span>
                </div>
                
                <div style="background: var(--background); border-radius: 0.5rem; padding: 0.5rem; margin-bottom: 1rem;">
                    <div style="width: ${progress}%; height: 4px; background: var(--${statusColor}); border-radius: 2px; transition: width 0.3s;"></div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="color: var(--text-muted); font-size: 0.875rem;">
                        ${order.items?.length || 0} items • ₱${order.totalAmount?.toFixed(2) || '0.00'}
                    </div>
                    <button class="btn btn-sm" onclick="viewOrderDetails('${order._id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getOrderStatusColor(status) {
    const statusMap = {
        'pending': 'warning',
        'confirmed': 'info',
        'packed': 'info',
        'shipped': 'primary',
        'delivered': 'success',
        'cancelled': 'error'
    };
    return statusMap[status] || 'secondary';
}

function getOrderProgress(status) {
    const progressMap = {
        'pending': 20,
        'confirmed': 40,
        'packed': 60,
        'shipped': 80,
        'delivered': 100,
        'cancelled': 0
    };
    return progressMap[status] || 0;
}

// Admin Order Management Functions
async function confirmOrder(orderId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('No authentication token found. Please login again.', 'error');
            return;
        }

        const notes = prompt('Add confirmation notes (optional):');

        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/confirm`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ notes: notes || '' })
        });

        if (response.ok) {
            showToast('Order confirmed successfully!', 'success');

            // Close any open modals
            const modal = document.querySelector('.modal');
            if (modal) {
                modal.remove();
            }

            // Refresh orders list
            await loadOrders();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to confirm order', 'error');
        }
    } catch (error) {
        console.error('Error confirming order:', error);
        showToast('Failed to confirm order - connection error', 'error');
    }
}

// Delete Order Function (Admin Only)
function deleteOrder(orderId) {
    showConfirmDialog({
        title: 'Delete Order Permanently',
        message: 'Are you sure you want to permanently DELETE this order? This action cannot be undone. The product stock will be automatically restored to inventory.',
        icon: 'trash-alt',
        iconColor: 'var(--error)',
        confirmText: 'Yes, Delete Permanently',
        confirmColor: 'var(--error)',
        onConfirm: async () => {
            console.log('🗑️ Starting order deletion for ID:', orderId);

            try {
                showLoading();
                const token = localStorage.getItem('token');
                if (!token) {
                    hideLoading();
                    showToast('No authentication token found. Please login again.', 'error');
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                console.log('🗑️ Delete response status:', response.status);
                hideLoading();

                if (response.ok) {
                    showToast('Order deleted successfully! Stock has been restored.', 'success');

                    // Close any open modals
                    const modal = document.querySelector('.modal');
                    if (modal) {
                        modal.remove();
                    }

                    // Refresh orders list
                    await loadOrders();
                } else {
                    const error = await response.json();
                    showToast(error.message || 'Failed to delete order', 'error');
                }
            } catch (error) {
                hideLoading();
                console.error('❌ Exception in deleteOrder:', error);
                showToast('Failed to delete order - connection error: ' + error.message, 'error');
            }
        }
    });
}

async function markOrderAsShipped(orderId) {
    try {
        const token = localStorage.getItem('token');
        const trackingNumber = prompt('Enter tracking number (optional):');
        const notes = prompt('Add shipping notes (optional):');

        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/ship`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                trackingNumber: trackingNumber || undefined,
                notes: notes || ''
            })
        });

        if (response.ok) {
            showToast('Order marked as shipped successfully!', 'success');
            loadOrders(); // Refresh orders list
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to mark order as shipped', 'error');
        }
    } catch (error) {
        console.error('Error marking order as shipped:', error);
        showToast('Failed to mark order as shipped - connection error', 'error');
    }
}

async function updateOrderStatus(orderId, status = null) {
    try {
        const token = localStorage.getItem('token');

        // If status is provided, do a direct update (for quick actions like confirmOrder)
        if (status) {
            const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                showToast(`Order ${status} successfully`, 'success');

                // Close any open modals
                const modal = document.querySelector('.modal');
                if (modal) {
                    modal.remove();
                }

                // Refresh orders list
                await loadOrders();
            } else {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to update order status', 'error');
            }
            return;
        }

        // Otherwise, open the modal for manual status selection
        // Fetch current order details
        const orderResponse = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!orderResponse.ok) {
            showToast('Failed to fetch order details', 'error');
            return;
        }

        const orderData = await orderResponse.json();
        const order = orderData.order;

        // Calculate default estimated delivery (3 business days from now)
        const defaultEstimatedDelivery = new Date();
        defaultEstimatedDelivery.setDate(defaultEstimatedDelivery.getDate() + 3);
        const defaultEstimatedDeliveryStr = defaultEstimatedDelivery.toISOString().split('T')[0];

        // Get current estimated delivery if exists
        let currentEstimatedDelivery = '';
        if (order.delivery?.preferredDate) {
            currentEstimatedDelivery = new Date(order.delivery.preferredDate).toISOString().split('T')[0];
        } else if (order.estimatedDelivery) {
            currentEstimatedDelivery = new Date(order.estimatedDelivery).toISOString().split('T')[0];
        } else {
            currentEstimatedDelivery = defaultEstimatedDeliveryStr;
        }

        // Create modal for status update
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 560px;">
                <div class="modal-header">
                    <h3 style="display:flex;align-items:center;gap:.5rem;margin:0;">
                        <span class="status-badge" aria-hidden="true"><i class="fas fa-edit"></i></span>
                        Update Order Status
                    </h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body status-update-modal">
                    <p class="modal-subtitle">
                        Make changes to the order progress and optionally set delivery date or tracking.
                    </p>
                    <form id="updateOrderStatusForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="orderStatus">
                                    <i class="fas fa-flag-checkered"></i> New Status <span style="color: var(--error);">*</span>
                                </label>
                                <select id="orderStatus" class="form-input" required>
                                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="confirmed" ${order.status === 'confirmed' || !order.status ? 'selected' : ''}>Confirmed</option>
                                    <option value="packed" ${order.status === 'packed' ? 'selected' : ''}>Packed</option>
                                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="estimatedDelivery">
                                    <i class="fas fa-calendar-alt"></i> Estimated Delivery Date
                                </label>
                                <input 
                                    type="date" 
                                    id="estimatedDelivery" 
                                    class="form-input" 
                                    value="${currentEstimatedDelivery}"
                                    min="${new Date().toISOString().split('T')[0]}"
                                />
                                <small class="field-help">
                                    Leave blank to auto-calculate (3 business days from confirmation)
                                </small>
                            </div>
                        </div>

                        <div class="form-group" id="trackingNumberGroup" style="display: ${order.status === 'shipped' ? 'block' : 'none'};">
                            <label class="form-label" for="trackingNumber">
                                <i class="fas fa-barcode"></i> Tracking Number (for shipped status)
                            </label>
                            <input 
                                type="text" 
                                id="trackingNumber" 
                                class="form-input" 
                                placeholder="Enter courier tracking number"
                                value="${order.trackingNumber || ''}"
                            />
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="statusNotes">
                                <i class="fas fa-sticky-note"></i> Notes (Optional)
                            </label>
                            <textarea 
                                id="statusNotes" 
                                class="form-input" 
                                rows="3" 
                                placeholder="Add notes about this status change..."
                            ></textarea>
                        </div>

                        <div class="status-hint" id="trackingHint" style="display: ${order.status === 'shipped' ? 'flex' : 'none'};">
                            <i class="fas fa-info-circle"></i>
                            Adding a tracking number helps customers follow their package.
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button class="btn btn-primary" onclick="submitOrderStatusUpdate('${orderId}')">
                        <i class="fas fa-check"></i> Update Status
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listener to show/hide tracking number field based on status
        const statusSelect = document.getElementById('orderStatus');
        const trackingNumberGroup = document.getElementById('trackingNumberGroup');
        const trackingHint = document.getElementById('trackingHint');

        statusSelect.addEventListener('change', (e) => {
            const selectedStatus = e.target.value;
            if (selectedStatus === 'shipped') {
                trackingNumberGroup.style.display = 'block';
                trackingHint.style.display = 'flex';
            } else {
                trackingNumberGroup.style.display = 'none';
                trackingHint.style.display = 'none';
            }
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

    } catch (error) {
        console.error('Error in updateOrderStatus:', error);
        if (error.message && error.message.includes('Failed to fetch')) {
            showToast('Backend server is not running. Please start the server first.', 'error');
        } else {
            showToast('Failed to update order status', 'error');
        }
    }
}

async function submitOrderStatusUpdate(orderId) {
    try {
        const form = document.getElementById('updateOrderStatusForm');
        const newStatus = document.getElementById('orderStatus')?.value;
        const estimatedDelivery = document.getElementById('estimatedDelivery')?.value;
        const trackingNumber = document.getElementById('trackingNumber')?.value;
        const notes = document.getElementById('statusNotes')?.value;

        console.log('Submitting order status update:', { orderId, newStatus, estimatedDelivery, trackingNumber, notes });

        if (!newStatus || newStatus.trim() === '') {
            showToast('Please select a valid status', 'error');
            return;
        }

        const token = localStorage.getItem('token');
        const payload = {
            status: newStatus,
            notes: notes || ''
        };

        // Add tracking number if provided
        if (trackingNumber && trackingNumber.trim()) {
            payload.trackingNumber = trackingNumber.trim();
        }

        // Add estimated delivery date if provided
        if (estimatedDelivery) {
            payload.estimatedDelivery = estimatedDelivery;
        }

        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast(`Order status updated to ${newStatus} successfully!`, 'success');

            // Close all modals
            document.querySelectorAll('.modal').forEach(m => m.remove());

            // Refresh orders list
            await loadOrders();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to update order status', 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showToast('Failed to update order status - connection error', 'error');
    }
}

async function viewOrderDetails(orderId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            showOrderDetailsModal(data.order);
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to fetch order details', 'error');
        }
    } catch (error) {
        console.error('Error fetching order details:', error);
        showToast('Failed to fetch order details - connection error', 'error');
    }
}

function showOrderDetailsModal(order) {
    // Create a modal to show detailed order information
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-receipt"></i> Order Details #${order.orderNumber || order._id}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                    <div>
                        <h4 style="margin-bottom: 0.5rem; color: var(--text-muted);">Order Information</h4>
                        <p><strong>Status:</strong> <span class="badge badge-${getOrderStatusColor(order.status)}">${order.status}</span></p>
                        <p><strong>Created:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                        ${order.confirmedAt ? `<p><strong>Confirmed:</strong> ${new Date(order.confirmedAt).toLocaleString()}</p>` : ''}
                        ${order.shippedAt ? `<p><strong>Shipped:</strong> ${new Date(order.shippedAt).toLocaleString()}</p>` : ''}
                        ${order.trackingNumber ? `<p><strong>Tracking:</strong> ${order.trackingNumber}</p>` : ''}
                    </div>
                    <div>
                        <h4 style="margin-bottom: 0.5rem; color: var(--text-muted);">Customer Details</h4>
                        <p><strong>Name:</strong> ${order.customer?.username || 'N/A'}</p>
                        <p><strong>Email:</strong> ${order.customer?.email || 'N/A'}</p>
                        <p><strong>Business:</strong> ${order.customer?.business_name || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 style="margin-bottom: 0.5rem; color: var(--text-muted);">Payment & Delivery</h4>
                        <p><strong>Payment Method:</strong> ${order.payment?.method || 'COD'}</p>
                        <p><strong>Payment Status:</strong> ${order.payment?.status || 'pending'}</p>
                        <p><strong>Total Amount:</strong> <strong>₱${(order.totalAmount || 0).toLocaleString()}</strong></p>
                        ${order.delivery?.address ? `<p><strong>Delivery Address:</strong> ${order.delivery.address}</p>` : ''}
                        ${order.delivery?.contactNumber ? `<p><strong>Contact Number:</strong> ${order.delivery.contactNumber}</p>` : ''}
                        ${order.delivery?.preferredDate ? `<p><strong>Preferred Delivery Date:</strong> ${new Date(order.delivery.preferredDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>` : ''}
                        ${order.notes ? `<p><strong>Order Notes:</strong> ${order.notes}</p>` : ''}
                    </div>
                </div>
                <div>
                    <h4 style="margin-bottom: 1rem; color: var(--text-muted);">Order Items</h4>
                    <div style="background: var(--background); border-radius: 0.5rem; padding: 1rem;">
                        ${order.items?.map(item => `
                            <div style="display: flex; justify-content: between; padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
                                <span>${item.productName} - ${item.quantity} x ₱${(item.unitPrice || 0).toFixed(2)}</span>
                                <span style="margin-left: auto;"><strong>₱${(item.totalPrice || 0).toFixed(2)}</strong></span>
                            </div>
                        `).join('') || '<p>No items found</p>'}
                    </div>
                </div>
                ${order.statusHistory && order.statusHistory.length > 0 ? `
                    <div style="margin-top: 1.5rem;">
                        <h4 style="margin-bottom: 1rem; color: var(--text-muted);">Status History</h4>
                        <div style="background: var(--background); border-radius: 0.5rem; padding: 1rem;">
                            ${order.statusHistory.map(entry => `
                                <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span class="badge badge-${getOrderStatusColor(entry.status)}">${entry.status}</span>
                                        <small style="color: var(--text-muted);">${new Date(entry.timestamp).toLocaleString()}</small>
                                    </div>
                                    ${entry.notes ? `<div style="margin-top: 0.25rem; color: var(--text-muted); font-size: 0.875rem;">${entry.notes}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                ${(currentUser?.role === 'admin' || currentUser?.role === 'staff') && order.status !== 'delivered' && order.status !== 'cancelled' ? `
                    <button class="btn btn-primary" onclick="updateOrderStatus('${order._id}');">
                        <i class="fas fa-edit"></i> Update Status
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Enhanced product reviews system
function addProductReview(productId, rating, comment) {
    const reviews = getProductReviews(productId);
    const newReview = {
        id: Date.now(),
        userId: currentUser?.id || 'anonymous',
        username: currentUser?.username || 'Anonymous',
        rating: parseInt(rating),
        comment: comment.trim(),
        createdAt: new Date().toISOString()
    };

    // TODO: Implement backend review system
    showToast('Review system coming soon - backend integration needed', 'info');
    return newReview;
}

// Missing helper functions
function searchProducts(query) {
    const params = {};
    if (query) params.search = query;
    loadProducts(params);
}

function applyProductFilters() {
    const category = document.getElementById('productCategory')?.value;
    const stockStatus = document.getElementById('stockStatus')?.value;
    const priceMin = document.getElementById('priceMin')?.value;
    const priceMax = document.getElementById('priceMax')?.value;
    const search = document.getElementById('productSearch')?.value;

    const params = {};
    if (category) params.category = category;
    if (stockStatus) params.stockStatus = stockStatus;
    if (priceMin) params.priceMin = priceMin;
    if (priceMax) params.priceMax = priceMax;
    if (search) params.search = search;

    loadProducts(params);
}

function getStockStatus(stock, minStock) {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= minStock) return 'Low Stock';
    return 'In Stock';
}

function getStockStatusBadge(stock, minStock) {
    if (stock <= 0) return 'error';
    if (stock <= minStock) return 'warning';
    return 'success';
}

function getProductIcon(category) {
    const icons = {
        'chicken': 'drumstick-bite',
        'beef': 'hamburger',
        'seafood': 'fish',
        'vegetables': 'carrot',
        'pork': 'bacon',
        'dairy': 'cheese'
    };
    return icons[category?.toLowerCase()] || 'box';
}

function addToRecentlyViewed(productId, name, price, unit) {
    const viewed = getRecentlyViewed();
    const existing = viewed.findIndex(v => v.productId === productId);

    if (existing >= 0) {
        viewed.splice(existing, 1);
    }

    viewed.unshift({ productId, name, price, unit, viewedAt: new Date().toISOString() });
    const trimmed = viewed.slice(0, 10);
    // TODO: Track viewed products in backend user profile

    // Update the display if we're on the overview tab
    if (document.getElementById('overviewSection')?.classList.contains('active')) {
        updateRecentActivities({});
    }
}

function getRecentlyViewed() {
    // TODO: Fetch recently viewed from backend user profile
    return [];
}

function getProductReviews(productId) {
    // TODO: Fetch reviews from backend
    return [];
}

// Recent Activities Helper Functions
function getRecentActivities(type) {
    // TODO: Fetch recent activities from backend
    return [];
}

function addRecentActivity(type, activity) {
    try {
        const activities = getRecentActivities(type);
        activities.unshift({
            ...activity,
            id: Date.now(),
            createdAt: new Date().toISOString()
        });
        // TODO: Save activity to backend
        console.log(`Activity logged: ${activity.action}`);
    } catch (e) {
        console.warn('Failed to log activity:', e);
    }
}

function formatTimeAgo(dateString) {
    if (!dateString) return 'Just now';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function filterProducts(params) {
    loadProducts(params);
}

function focusProduct(productId) {
    // Scroll to product or highlight it
    const productEl = document.querySelector(`[data-product-id="${productId}"]`);
    if (productEl) {
        productEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        productEl.style.boxShadow = '0 0 20px var(--primary)';
        setTimeout(() => {
            productEl.style.boxShadow = '';
        }, 2000);
    }
}

function viewOrderDetails(orderId) {
    // Show order details modal or navigate to order view
    showToast(`Viewing order ${orderId}`, 'info');
    // Implementation would show a modal with order details
}

// Notifications System
function initializeNotifications() {
    // Clean up duplicate welcome notifications first
    cleanupDuplicateNotifications();

    // Load existing notifications from localStorage
    renderNotifications();

    // Check for new promotions every minute (only for clients/B2B)
    // Mock promotion checker is disabled - real promotions come from backend
    // setInterval(checkForNewPromotions, 60000);

    // Initialize notification mode selector if on settings page
    initializeNotificationMode();
}

// Clean up duplicate notifications (especially welcome messages)
function cleanupDuplicateNotifications() {
    let notifications = getNotifications();
    let cleanupCount = 0;

    // Remove duplicate welcome notifications, keep only the most recent one
    const welcomeNotifs = notifications.filter(n => n.title === 'Welcome Back!');
    if (welcomeNotifs.length > 1) {
        // Sort by creation date (newest first)
        welcomeNotifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Keep only the newest welcome notification
        const toKeep = welcomeNotifs[0].id;
        const toRemove = welcomeNotifs.slice(1).map(n => n.id);

        // Remove duplicates
        notifications = notifications.filter(n => !toRemove.includes(n.id));
        cleanupCount += toRemove.length;

        console.log(`Cleaned up ${toRemove.length} duplicate welcome notifications`);
    }

    // Remove promotional notifications for admin/staff users (they shouldn't receive them)
    if (currentUser) {
        const userRole = (currentUser.role || 'client').toLowerCase();
        if (userRole === 'admin' || userRole === 'staff') {
            const promoNotifs = notifications.filter(n => n.type === 'promotion');
            if (promoNotifs.length > 0) {
                notifications = notifications.filter(n => n.type !== 'promotion');
                cleanupCount += promoNotifs.length;
                console.log(`Removed ${promoNotifs.length} promotional notifications (admin/staff user)`);
            }
        }
    }

    // Save cleaned notifications if any were removed
    if (cleanupCount > 0) {
        saveNotifications(notifications);
    }

    // Also limit total notifications to 20 (remove oldest ones)
    if (notifications.length > 20) {
        const sorted = notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const limited = sorted.slice(0, 20);
        saveNotifications(limited);
        console.log(`Limited notifications to 20 (removed ${notifications.length - 20} old ones)`);
    }
}

// Initialize notification mode selector with current preference
function initializeNotificationMode() {
    const currentMode = localStorage.getItem('notificationPreference') || 'all';
    const selector = document.getElementById('notificationModeSelect');
    if (selector) {
        selector.value = currentMode;
    }
}

// Update notification mode when user changes preference
function updateNotificationMode() {
    const selector = document.getElementById('notificationModeSelect');
    if (!selector) return;

    const newMode = selector.value;
    localStorage.setItem('notificationPreference', newMode);

    // Show confirmation toast based on mode (exempt from silent mode itself)
    const container = document.getElementById('toastContainer');
    if (container) {
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>Notification mode changed to: ${newMode === 'all' ? 'All Notifications' : newMode === 'important' ? 'Important Only' : 'Silent Mode'}</span>
            <span class="toast-close" onclick="this.parentElement.remove()">&times;</span>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    }

    console.log('Notification mode updated to:', newMode);
}

function getNotifications() {
    try {
        return JSON.parse(localStorage.getItem('notifications') || '[]');
    } catch {
        return [];
    }
}

function saveNotifications(notifications) {
    localStorage.setItem('notifications', JSON.stringify(notifications));
}

// Track recent notifications to prevent duplicates
const recentNotifications = new Map();
const DUPLICATE_THRESHOLD = 3000; // 3 seconds

function addNotification(notification) {
    // Check for duplicate notifications within threshold
    const notifKey = `${notification.title}:${notification.message}`;
    const lastShown = recentNotifications.get(notifKey);
    const now = Date.now();

    if (lastShown && (now - lastShown) < DUPLICATE_THRESHOLD) {
        console.log('Duplicate notification blocked:', notification.message);
        return; // Skip duplicate notification
    }

    recentNotifications.set(notifKey, now);

    // Cleanup old entries
    if (recentNotifications.size > 50) {
        const entries = Array.from(recentNotifications.entries());
        entries.sort((a, b) => a[1] - b[1]);
        recentNotifications.delete(entries[0][0]);
    }

    const notifications = getNotifications();
    const newNotification = {
        id: Date.now(),
        ...notification,
        createdAt: new Date().toISOString(),
        read: false
    };

    notifications.unshift(newNotification);
    // Keep only last 20 notifications to prevent clutter
    const trimmed = notifications.slice(0, 20);
    saveNotifications(trimmed);
    renderNotifications();

    // Show toast for new notification only if not silenced
    const notifPreference = localStorage.getItem('notificationPreference') || 'all';
    if (notifPreference === 'all' ||
        (notifPreference === 'important' && (notification.type === 'error' || notification.type === 'alert'))) {
        showToast(notification.message, notification.type || 'info');
    }
}

function renderNotifications() {
    const container = document.getElementById('notificationsContainer');
    const badge = document.getElementById('notificationBadge');
    if (!container) return;

    const notifications = getNotifications();
    const unreadCount = notifications.filter(n => !n.read).length;

    // Update notification badge on bell icon
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="no-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}" onclick="markNotificationRead('${notification.id}')">
            <div class="notification-icon ${notification.type}">
                <i class="fas ${notification.type === 'promotion' ? 'fa-tag' :
            notification.type === 'alert' ? 'fa-exclamation-triangle' :
                notification.type === 'info' ? 'fa-info-circle' : 'fa-bell'
        }"></i>
            </div>
            <div class="notification-content">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
                <small>${formatTimeAgo(notification.createdAt)}</small>
            </div>
        </div>
    `).join('');
}

// Toggle notification panel visibility
function toggleNotificationPanel() {
    const panel = document.getElementById('notificationsPanel');

    if (panel) {
        const isVisible = panel.style.display === 'block';

        if (isVisible) {
            // Hide panel
            panel.style.display = 'none';
        } else {
            // Show panel
            panel.style.display = 'block';
            renderNotifications(); // Refresh notifications when opening

            // Auto-hide after 30 seconds if no interaction
            setTimeout(() => {
                if (panel.style.display === 'block') {
                    panel.style.display = 'none';
                }
            }, 30000);
        }
    }
}

// Close notification panel when clicking outside
document.addEventListener('click', function (event) {
    const panel = document.getElementById('notificationsPanel');
    const toggleBtn = document.getElementById('notificationToggle');

    if (panel && toggleBtn) {
        const isClickInside = panel.contains(event.target) || toggleBtn.contains(event.target);

        if (!isClickInside && panel.style.display === 'block') {
            panel.style.display = 'none';
        }
    }
});

function getNotificationColor(type) {
    const colors = {
        'promotion': 'success',
        'alert': 'warning',
        'error': 'error',
        'info': 'info',
        'order': 'primary'
    };
    return colors[type] || 'info';
}

function getNotificationIcon(type) {
    const icons = {
        'promotion': 'tag',
        'alert': 'exclamation-triangle',
        'error': 'exclamation-circle',
        'info': 'info-circle',
        'order': 'shopping-cart'
    };
    return icons[type] || 'bell';
}

function markNotificationRead(notificationId) {
    const notifications = getNotifications();
    const notification = notifications.find(n => n.id == notificationId);
    if (notification) {
        notification.read = true;
        saveNotifications(notifications);
        renderNotifications();
    }
}

function dismissNotification(notificationId) {
    const notifications = getNotifications().filter(n => n.id != notificationId);
    saveNotifications(notifications);
    renderNotifications();
}

// Removed demo mode notification - system uses backend only

function markAllNotificationsRead() {
    const notifications = getNotifications();
    notifications.forEach(n => n.read = true);
    saveNotifications(notifications);
    renderNotifications();
    showToast('All notifications marked as read', 'success');
}

function clearAllNotifications() {
    showConfirmDialog({
        title: 'Clear All Notifications',
        message: 'Are you sure you want to clear all notifications? This will permanently remove all notification history.',
        icon: 'trash-alt',
        iconColor: 'var(--warning)',
        confirmText: 'Yes, Clear All',
        confirmColor: 'var(--warning)',
        onConfirm: () => {
            saveNotifications([]);
            renderNotifications();
            showToast('All notifications cleared', 'success');
        }
    });
}

function checkForNewPromotions() {
    // Only send promotion notifications to clients and B2B users
    const userRole = (currentUser?.role || 'client').toLowerCase();
    if (userRole !== 'client' && userRole !== 'b2b') {
        console.log('Skipping promotion check - user is admin/staff');
        return;
    }

    // Check for new promotions and create notifications
    const lastCheck = localStorage.getItem('lastPromotionCheck');
    const now = new Date().toISOString();

    // Simulate checking for new promotions (in real app, this would be an API call)
    const mockPromotions = [
        {
            name: 'Weekend Special',
            discount: 20,
            description: '20% off on all seafood products this weekend!'
        },
        {
            name: 'Bulk Order Discount',
            discount: 15,
            description: 'Order 10kg or more and get 15% discount'
        }
    ];

    // Only add notifications if it's been more than 1 hour since last check
    if (!lastCheck || (new Date(now) - new Date(lastCheck)) > 3600000) {
        const randomPromo = mockPromotions[Math.floor(Math.random() * mockPromotions.length)];

        if (Math.random() > 0.8) { // 20% chance of new promotion
            addNotification({
                type: 'promotion',
                title: 'New Promotion Available!',
                message: `${randomPromo.name}: ${randomPromo.description}`,
                action: () => switchTab('products')
            });
        }

        localStorage.setItem('lastPromotionCheck', now);
    }
}

function checkForPromotionNotifications(promotions) {
    // Only send promotion notifications to clients and B2B users
    const userRole = (currentUser?.role || 'client').toLowerCase();
    if (userRole !== 'client' && userRole !== 'b2b') {
        console.log('Skipping promotion notifications - user is admin/staff');
        // Still update lastPromotions to track them, but don't notify
        localStorage.setItem('lastPromotions', JSON.stringify(promotions));
        return;
    }

    const lastPromotions = JSON.parse(localStorage.getItem('lastPromotions') || '[]');
    const newPromotions = promotions.filter(promo =>
        !lastPromotions.find(last => last._id === promo._id)
    );

    // Only notify about new promotions, not existing ones
    if (newPromotions.length > 0) {
        console.log(`Found ${newPromotions.length} new promotion(s) for client`);
        newPromotions.forEach(promo => {
            addNotification({
                type: 'promotion',
                title: 'New Promotion Available!',
                message: `${promo.name}: ${promo.description || 'Special offer just for you!'}`
            });
        });
    }

    localStorage.setItem('lastPromotions', JSON.stringify(promotions));
}

// Activity Filtering Functions
function filterActivities(searchTerm) {
    const filter = document.getElementById('activityFilter')?.value || 'all';
    const search = searchTerm || document.getElementById('activitySearch')?.value || '';

    // Get all activity items
    const activityItems = document.querySelectorAll('.activity-item');

    activityItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        const matchesSearch = !search || text.includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || item.closest(`#recent${filter.charAt(0).toUpperCase() + filter.slice(1)}`);

        item.style.display = matchesSearch && matchesFilter ? '' : 'none';
    });
}

// System Health Monitoring
function updateSystemHealth() {
    const dbStatus = document.getElementById('dbStatus');
    const apiStatus = document.getElementById('apiStatus');
    const dataMode = document.getElementById('dataMode');
    const activeUsers = document.getElementById('activeUsers');
    const systemIndicator = document.getElementById('systemStatusIndicator');

    // Check backend health
    fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        timeout: 5000
    })
        .then(res => {
            if (res.ok) {
                if (dbStatus) dbStatus.textContent = 'Connected and healthy';
                if (apiStatus) apiStatus.textContent = 'All endpoints operational';
                if (dataMode) dataMode.textContent = 'Live Data Active';
                if (systemIndicator) {
                    systemIndicator.className = 'badge badge-success';
                    systemIndicator.innerHTML = '<i class="fas fa-check-circle"></i> System Online';
                }

                // Backend is online - clear any connection error notifications
                const notifications = getNotifications();
                const filteredNotifications = notifications.filter(n =>
                    !n.message.includes('Backend connection') && !n.message.includes('server error')
                );
                if (filteredNotifications.length !== notifications.length) {
                    saveNotifications(filteredNotifications);
                    renderNotifications();
                }
            }
        })
        .catch(() => {
            if (dbStatus) dbStatus.textContent = 'Connection failed';
            if (apiStatus) apiStatus.textContent = 'Backend not reachable';
            if (dataMode) dataMode.textContent = 'Backend Offline';
            if (systemIndicator) {
                systemIndicator.className = 'badge badge-error';
                systemIndicator.innerHTML = '<i class="fas fa-times-circle"></i> Backend Offline';
            }
        });

    // Mock active users count
    if (activeUsers) {
        const count = Math.floor(Math.random() * 20) + 1;
        activeUsers.textContent = `${count} users online`;
    }
}

function getAverageRating(productId) {
    const reviews = getProductReviews(productId);
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
}

// Bulk order functionality for business customers
function createBulkOrder() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Create Bulk Order</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="bulkOrderForm">
                    <div class="form-group">
                        <label>Order Description</label>
                        <textarea name="description" class="form-input" placeholder="Describe your bulk order requirements..." required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Estimated Quantity</label>
                        <input type="number" name="quantity" class="form-input" min="10" required>
                    </div>
                    <div class="form-group">
                        <label>Preferred Delivery Date</label>
                        <input type="date" name="deliveryDate" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label>Contact Information</label>
                        <input type="text" name="contact" class="form-input" placeholder="Phone number or email" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Submit Bulk Order Request</button>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#bulkOrderForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // In a real app, this would send to backend
        showToast('Bulk order request submitted! We will contact you soon.', 'success');
        modal.remove();
    });
}

// Inventory alerts and notifications
async function checkInventoryAlerts() {
    // Only send inventory alerts to admin and staff users
    const userRole = (currentUser?.role || 'client').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'staff') {
        console.log('Skipping inventory alerts - user is not admin/staff');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/inventory/overview`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.data.lowStockProducts > 0) {
                addNotification({
                    title: 'Low Stock Alert',
                    message: `${data.data.lowStockProducts} products are running low on stock`,
                    type: 'alert' // Changed from 'warning' to 'alert' for better categorization
                });
            }
        }
    } catch (error) {
        console.error('Error checking inventory alerts:', error);
    }
}

// Old promotional code functions removed - use new promotion system instead

// Recently viewed utilities - backend integration needed
function getRecentlyViewed() {
    // TODO: Fetch from backend user profile
    return [];
}

function trackViewedProduct(productId, name, price, unit) {
    // TODO: Track in backend user profile
    console.log(`Tracking viewed product: ${name}`);
}

function focusProduct(productId) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll('.product-card'));
    const card = cards.find(c => c.innerHTML.includes(productId));
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('interactive');
    }
}

// Utility functions
function getProductIcon(category) {
    const iconMap = {
        'chicken': 'drumstick-bite',
        'beef': 'bacon',
        'pork': 'ham',
        'seafood': 'fish',
        'vegetables': 'carrot',
        'dairy': 'cheese',
        'other': 'box'
    };
    return iconMap[category] || 'box';
}

function getStockStatus(current, minimum) {
    if (current <= 0) return 'Out of Stock';
    if (current <= minimum) return 'Low Stock';
    return 'In Stock';
}

function getStockStatusBadge(current, minimum) {
    if (current <= 0) return 'error';
    if (current <= minimum) return 'warning';
    return 'success';
}

// Utility functions
function showLoading() {
    document.getElementById('loading').classList.add('show');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('show');
}

// Password toggle function for login
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('passwordToggleIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Password toggle functions for registration form
function toggleRegPassword() {
    const passwordInput = document.getElementById('regPassword');
    const toggleIcon = document.getElementById('regPasswordToggleIcon');

    if (passwordInput && toggleIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    }
}

function toggleRegConfirmPassword() {
    const passwordInput = document.getElementById('regConfirmPassword');
    const toggleIcon = document.getElementById('regConfirmPasswordToggleIcon');

    if (passwordInput && toggleIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    }
}

// Password toggle functions for main registration modal (modern UI)
function toggleRegPasswordMain() {
    const passwordInput = document.getElementById('regPasswordMain');
    const toggleIcon = document.getElementById('regPasswordMainToggleIcon');

    if (passwordInput && toggleIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    }
}

function toggleRegConfirmPasswordMain() {
    const passwordInput = document.getElementById('regConfirmPasswordMain');
    const toggleIcon = document.getElementById('regConfirmPasswordMainToggleIcon');

    if (passwordInput && toggleIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    }
}

// Make toggle functions globally accessible
window.togglePassword = togglePassword;
window.toggleRegPassword = toggleRegPassword;
window.toggleRegConfirmPassword = toggleRegConfirmPassword;
window.toggleRegPasswordMain = toggleRegPasswordMain;
window.toggleRegConfirmPasswordMain = toggleRegConfirmPasswordMain;

// Complete order placement system
async function placeOrder() {
    if (cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }

    const deliveryAddress = document.getElementById('deliveryAddress')?.value;
    const paymentMethod = document.getElementById('paymentMethod')?.value || 'cod';

    if (!deliveryAddress) {
        showToast('Please enter a delivery address', 'error');
        return;
    }

    showLoading();

    try {
        // Calculate totals
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalAmount = subtotal;

        const orderData = {
            items: cart.map(item => ({
                product: item.id,
                quantity: item.quantity
            })),
            paymentMethod,
            address: deliveryAddress,
            deliveryDate: document.getElementById('deliveryDate')?.value,
            totalAmount: totalAmount
        };

        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            const data = await response.json();

            // Clear cart
            cart = [];
            localStorage.removeItem('cart');
            renderCart();

            // Add success notification
            addNotification({
                title: 'Order Placed Successfully',
                message: `Order ${data.order.orderNumber} has been placed. Total: ₱${data.order.totalAmount.toFixed(2)}`,
                type: 'success'
            });

            // Show success message
            showToast('Order placed successfully!', 'success');

            // Switch to transactions tab to show the new order
            switchTab('transactions');
            loadTransactions();

        } else {
            const errorData = await response.json();
            showToast(errorData.message || 'Failed to place order', 'error');
        }
    } catch (error) {
        console.error('Order placement error:', error);
        showToast('Unable to place order. Please check your connection and try again.', 'error');
    }

    hideLoading();
}

// Missing handleCheckout function
async function handleCheckout(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const address = formData.get('address');
    const paymentMethod = formData.get('paymentMethod') || 'cod';
    const deliveryDate = formData.get('deliveryDate');

    if (cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }

    if (!address) {
        showToast('Please enter a delivery address', 'error');
        return;
    }

    showLoading();

    try {
        const orderData = {
            items: cart.map(item => ({
                product: item.id,
                quantity: item.quantity
            })),
            paymentMethod,
            address,
            deliveryDate
        };

        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            const data = await response.json();

            // Clear cart
            cart = [];
            localStorage.removeItem('cart');
            renderCart();

            // Add success notification
            addNotification({
                title: 'Order Placed Successfully',
                message: `Order ${data.order.orderNumber || data.order._id} has been placed. Total: ₱${data.order.totalAmount.toFixed(2)}`,
                type: 'success'
            });

            showToast('Order placed successfully!', 'success');

            // Switch to transactions tab
            switchTab('transactions');
            loadTransactions();
        } else {
            const errorData = await response.json();
            showToast(errorData.message || 'Failed to place order', 'error');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showToast('Unable to place order. Please check your connection and try again.', 'error');
    }

    hideLoading();
}

// Enhanced checkout function
function proceedToCheckout() {
    if (cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }

    switchTab('checkout');

    // Always use the same render function (handles both promotions and coupons)
    renderCheckoutSummary();
}

// renderCheckoutSummary moved to client-shopping.js

// Check available discounts for a specific product
async function checkDiscountForProduct(productId, price) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Please log in to check discounts', 'warning');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/promotions/available/${productId}?quantity=10`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.data && result.data.length > 0) {
                const productDiscounts = result.data[0];
                if (productDiscounts.discounts.length > 0) {
                    let discountInfo = `🎯 Available Discounts for ${productDiscounts.productName}:\n\n`;
                    productDiscounts.discounts.forEach((discount, index) => {
                        discountInfo += `${index + 1}. ${discount.description}\n   💰 Save ₱${discount.potentialSavings.toFixed(2)} with 10 units\n\n`;
                    });
                    discountInfo += 'Add more items to your cart to unlock these discounts!';
                    alert(discountInfo);
                } else {
                    showToast('No special discounts available for this product', 'info');
                }
            } else {
                showToast('No special discounts available for this product', 'info');
            }
        } else {
            showToast('Unable to check discounts at the moment', 'warning');
        }
    } catch (error) {
        console.error('Error checking product discounts:', error);
        showToast('Unable to check discounts. Please try again later.', 'error');
    }
}

// Toast deduplication and queue management
const activeToasts = new Map();
const TOAST_DEBOUNCE_TIME = 2000; // 2 seconds
const MAX_TOASTS = 3; // Maximum simultaneous toasts

function showToast(message, type = 'info') {
    // Check notification preference
    const notifPreference = localStorage.getItem('notificationPreference') || 'all';
    if (notifPreference === 'silent') {
        console.log(`[Toast suppressed] ${type}: ${message}`);
        return; // Don't show any toasts in silent mode
    }
    if (notifPreference === 'important' && type !== 'error' && type !== 'warning') {
        console.log(`[Toast filtered] ${type}: ${message}`);
        return; // Only show errors and warnings
    }

    // Prevent duplicate toasts
    const toastKey = `${type}:${message}`;
    const lastShown = activeToasts.get(toastKey);
    const now = Date.now();

    if (lastShown && (now - lastShown) < TOAST_DEBOUNCE_TIME) {
        console.log('Duplicate toast blocked:', message);
        return;
    }

    activeToasts.set(toastKey, now);

    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Limit number of visible toasts
    const existingToasts = container.querySelectorAll('.toast');
    if (existingToasts.length >= MAX_TOASTS) {
        // Remove oldest toast
        existingToasts[0].remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('data-toast-key', toastKey);

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
        <span class="toast-close" onclick="this.parentElement.remove()">&times;</span>
    `;

    container.appendChild(toast);

    // Add animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-remove with fade out
    const duration = type === 'error' ? 7000 : 4000; // Errors stay longer
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                    // Clean up tracking
                    activeToasts.delete(toastKey);
                }
            }, 300);
        }
    }, duration);
}

// Registration functions
function showRegister() {
    document.getElementById('registerModal').style.display = 'block';
    document.body.classList.add('modal-open');
    // Scroll to top
    setTimeout(() => {
        document.getElementById('registerModal').scrollTop = 0;
    }, 0);
}

function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
    document.getElementById('registerForm').reset();
    document.body.classList.remove('modal-open');
}

// Show success modal
function showSuccessModal(title, message, onClose) {
    console.log('🎉 Showing success modal:', title);
    
    // Remove existing modal if any
    const existingModal = document.getElementById('successModal');
    if (existingModal) {
        console.log('Removing existing success modal');
        existingModal.remove();
    }

    // Create modal HTML with clean CSS classes
    const modalHTML = `
        <div id="successModal" class="modal">
            <div class="modal-content">
                <!-- Success Icon -->
                <div class="success-icon">
                    <i class="fas fa-check"></i>
                </div>
                
                <!-- Title -->
                <h2 class="success-title">${title}</h2>
                
                <!-- Message -->
                <div class="success-message">
                    ${message}
                </div>
                
                <!-- Button -->
                <button class="success-button" onclick="closeSuccessModal()">
                    <i class="fas fa-arrow-right"></i> Continue to Login
                </button>
                
                <!-- Decorative Elements -->
                <div class="success-decoration-1"></div>
                <div class="success-decoration-2"></div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('✅ Success modal added to DOM');

    // Store callback
    window.successModalCallback = onClose;
    
    // Ensure modal is visible
    setTimeout(() => {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('✅ Success modal display set to flex');
        } else {
            console.error('❌ Success modal not found in DOM');
        }
    }, 100);
}

// Close success modal
function closeSuccessModal() {
    console.log('Closing success modal');
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.remove();
        console.log('✅ Success modal removed');
    }
    if (window.successModalCallback) {
        console.log('Executing success modal callback');
        window.successModalCallback();
        window.successModalCallback = null;
    }
}

function toggleBusinessNameField(role) {
    const businessNameGroup = document.getElementById('businessNameGroup');
    const businessNameRequired = document.getElementById('businessNameRequired');
    const businessNameInput = document.querySelector('input[name="business_name"]');

    if (businessNameGroup && businessNameRequired && businessNameInput) {
        if (role === 'b2b') {
            businessNameRequired.style.display = 'inline';
            businessNameInput.required = true;
            businessNameInput.placeholder = 'Enter your business name (required)';
        } else {
            businessNameRequired.style.display = 'none';
            businessNameInput.required = false;
            businessNameInput.placeholder = 'Enter business name (optional)';
        }
    }
}

// Make function globally accessible
window.toggleBusinessNameField = toggleBusinessNameField;

// Order tracking notification system
function initializeOrderTracking() {
    // Check for order updates every 2 minutes for active orders (silent background check)
    setInterval(checkForOrderUpdates, 120000); // 2 minutes instead of 30 seconds
}

async function checkForOrderUpdates() {
    if (!currentUser) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders?mine=true&status=pending,confirmed,shipped`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const activeOrders = data.orders || [];

            // Check for status changes
            activeOrders.forEach(order => {
                checkOrderStatusChange(order);
            });
        }
    } catch (error) {
        console.error('Error checking order updates:', error);
    }
}

function checkOrderStatusChange(order) {
    const storageKey = `order_status_${order._id}`;
    const lastKnownStatus = localStorage.getItem(storageKey);
    const currentStatus = order.status;

    if (lastKnownStatus && lastKnownStatus !== currentStatus) {
        // Status changed, show notification
        showOrderStatusNotification(order, lastKnownStatus, currentStatus);
    }

    // Update stored status
    localStorage.setItem(storageKey, currentStatus);
}

function showOrderStatusNotification(order, oldStatus, newStatus) {
    const statusMessages = {
        confirmed: 'Your order has been confirmed and is being prepared!',
        shipped: 'Great news! Your order is on its way to you!',
        delivered: 'Your order has been delivered successfully!'
    };

    const message = statusMessages[newStatus] || `Your order status has been updated to ${newStatus}`;
    const orderNumber = order.orderNumber || order._id;

    // Create notification toast
    const toast = document.createElement('div');
    toast.className = 'order-notification-toast';
    toast.style.cssText = `
        position: fixed;
        top: 5rem;
        right: 1rem;
        background: var(--surface);
        color: var(--text);
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: var(--shadow-lg);
        border-left: 4px solid var(--success);
        min-width: 300px;
        z-index: 9999;
        animation: slideInRight 0.3s ease-out;
        cursor: pointer;
    `;

    toast.innerHTML = `
        <div style="display: flex; align-items: start; gap: 1rem;">
            <div style="background: var(--success); color: white; width: 2.5rem; height: 2.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i class="fas fa-truck"></i>
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 0.25rem;">Order Update</div>
                <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">Order #${orderNumber}</div>
                <div style="font-size: 0.9rem;">${message}</div>
                <div style="margin-top: 0.75rem;">
                    <button onclick="trackOrder('${order._id}')" style="background: var(--primary); color: white; border: none; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.8rem; cursor: pointer;">
                        Track Order
                    </button>
                </div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.25rem;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }
    }, 10000);

    // Click to track order
    toast.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'I') {
            trackOrder(order._id);
            toast.remove();
        }
    });
}

// Initialize order tracking when user logs in
document.addEventListener('DOMContentLoaded', function () {
    // Add to existing initialization
    setTimeout(initializeOrderTracking, 2000);
});





// Product creation functions
function showAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (!modal) {
        console.error('Add Product Modal not found in DOM');
        showToast('Error: Modal not found. Please refresh the page.', 'error');
        return;
    }

    modal.style.display = 'flex';

    // Set today's date as default for received date
    const receivedDateInput = document.getElementById('addProductReceivedDate');
    if (receivedDateInput) {
        const today = new Date().toISOString().split('T')[0];
        receivedDateInput.value = today;
    }

    // Prevent modal from being removed by click outside
    modal.onclick = function (event) {
        if (event.target === modal) {
            closeAddProductModal();
        }
    };
}

function closeAddProductModal() {
    const modal = document.getElementById('addProductModal');
    const form = document.getElementById('addProductForm');

    if (modal) {
        modal.style.display = 'none';
    }
    if (form) {
        form.reset();
    }
}

// Restock with Batch Modal Functions
async function openRestockBatchModal() {
    document.getElementById('restockBatchModal').style.display = 'flex';

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('#restockBatchForm input[name="receivedDate"]').value = today;

    // Load products into select dropdown
    await loadProductsForRestock();
}

function closeRestockBatchModal() {
    document.getElementById('restockBatchModal').style.display = 'none';
    document.getElementById('restockBatchForm').reset();
}

async function loadProductsForRestock() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const select = document.getElementById('restockProductSelect');
            select.innerHTML = '<option value="">Select a product...</option>';

            data.products.forEach(product => {
                const option = document.createElement('option');
                option.value = product._id;
                option.textContent = `${product.name} (Current stock: ${product.stock} ${product.unit})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Failed to load products', 'error');
    }
}

async function handleRestockWithBatch(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const batchData = {
        batchNumber: formData.get('batchNumber'),
        quantity: parseInt(formData.get('quantity')),
        receivedDate: formData.get('receivedDate'),
        expiryDate: formData.get('expiryDate')
    };

    const productId = formData.get('productId');

    if (!productId) {
        showToast('Please select a product', 'error');
        return;
    }

    try {
        showLoading();
        const token = localStorage.getItem('token');

        // Add batch via expiry API
        const response = await fetch(`${API_BASE_URL}/expiry/products/${productId}/batches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(batchData)
        });

        if (response.ok) {
            hideLoading();
            showToast('Batch added successfully! Stock updated.', 'success');
            closeRestockBatchModal();

            // Refresh inventory and expiry tracker
            if (typeof loadInventory === 'function') {
                loadInventory();
            }
            if (typeof loadProducts === 'function') {
                loadProducts();
            }
            if (typeof updateDashboardExpiryAlert === 'function') {
                updateDashboardExpiryAlert();
            }
        } else {
            const errorData = await response.json();
            hideLoading();
            showToast(errorData.message || 'Failed to add batch', 'error');
        }
    } catch (error) {
        console.error('Error adding batch:', error);
        hideLoading();
        showToast('Failed to add batch - server error', 'error');
    }
}

function searchProducts(query) {
    if (!query.trim()) {
        loadProducts(); // Show all products if search is empty
        return;
    }

    loadProducts({ search: query });
}

function applyProductFilters() {
    const category = document.getElementById('productCategory')?.value || '';
    const stock = document.getElementById('stockStatus')?.value || '';
    const priceMin = document.getElementById('priceMin')?.value || '';
    const priceMax = document.getElementById('priceMax')?.value || '';
    const params = {};
    if (category) params.category = category;
    if (stock === 'low') params.lowStock = 'true';
    if (stock === 'out') params.isActive = 'true'; // rely on stock=0 client-side later
    if (priceMin) params.priceMin = priceMin;
    if (priceMax) params.priceMax = priceMax;
    const query = document.getElementById('productSearch')?.value || '';
    if (query) params.search = query;
    loadProducts(params);
}

function editProduct(productId) {
    // For now, show a toast. In the future, this would open an edit modal
    showToast(`Edit product: ${productId} - Feature coming soon!`, 'info');

    // Here you would:
    // 1. Fetch product details
    // 2. Open edit modal with pre-filled data
    // 3. Handle form submission for updates
}

function viewProductAnalytics(productId) {
    showToast(`View analytics for product: ${productId}`, 'info');
}

// Order management functions
function confirmOrder(orderId) {
    updateOrderStatus(orderId, 'confirmed');
}

async function trackOrder(orderId) {
    try {
        // Validate inputs
        if (!orderId || orderId.trim() === '') {
            showToast('Invalid order ID', 'error');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Please log in to track orders', 'error');
            return;
        }

        showLoading();

        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            hideLoading();

            if (data.order) {
                showOrderTrackingModal(data.order);
            } else {
                showToast('Order data not found', 'error');
            }
        } else {
            // Try transactions endpoint as fallback for any error
            console.log(`Order endpoint failed with status ${response.status}, trying transactions...`);
            await trackOrderFromTransactions(orderId);
        }
    } catch (error) {
        console.error('Error tracking order:', error);
        hideLoading();

        // If there's a network error, try the transactions endpoint
        try {
            await trackOrderFromTransactions(orderId);
        } catch (fallbackError) {
            showToast('Unable to load order tracking. Please check your connection and try again.', 'error');
        }
    }
}

// Fallback: Try to get order data from transactions endpoint
async function trackOrderFromTransactions(orderId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/transactions/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const transaction = data.data?.transaction || data.transaction;

            if (transaction) {
                // Convert transaction to order format
                const order = {
                    _id: transaction.id,
                    orderNumber: transaction.orderId || transaction.id,
                    status: transaction.status === 'completed' ? 'delivered' : transaction.status,
                    totalAmount: transaction.amount,
                    createdAt: transaction.date,
                    items: transaction.items || [],
                    customer: {
                        username: transaction.customer,
                        email: transaction.customerEmail
                    },
                    delivery: {
                        address: transaction.deliveryAddress
                    }
                };

                showOrderTrackingModal(order);
                return;
            }
        }

        throw new Error('Order not found in transactions');

    } catch (error) {
        console.error('Error tracking from transactions:', error);
        hideLoading();
        showToast('Order not found or unable to load tracking information', 'error');
    }
}

// updateOrderStatus function integrated above (line ~7211) handles both:
// - updateOrderStatus(orderId) - opens modal for manual selection
// - updateOrderStatus(orderId, 'confirmed') - direct status update for quick actions

function viewOrderDetails(orderId) {
    trackOrder(orderId);
}

// Product edit modal handlers
async function openEditProductModal(productId) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/products/${productId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch product');
        const data = await res.json();
        const product = data.product;
        const modal = document.getElementById('editProductModal');
        const form = document.getElementById('editProductForm');
        form.elements['id'].value = product._id;
        form.elements['name'].value = product.name || '';
        form.elements['description'].value = product.description || '';
        form.elements['category'].value = product.category || 'other';
        form.elements['unit'].value = product.unit || 'kg';
        form.elements['price'].value = product.price || 0;
        form.elements['stock'].value = product.stock || 0;
        form.elements['minStock'].value = product.minStock || 0;
        form.elements['maxStock'].value = product.maxStock || 0;
        modal.style.display = 'block';
        form.onsubmit = handleEditProductSubmit;
    } catch (e) {
        console.error('Open edit product error', e);
        showToast('Failed to open product', 'error');
    }
}

function closeEditProductModal() {
    const modal = document.getElementById('editProductModal');
    modal.style.display = 'none';
}

async function handleEditProductSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.elements['id'].value;
    const payload = {
        name: form.elements['name'].value,
        description: form.elements['description'].value,
        category: form.elements['category'].value,
        unit: form.elements['unit'].value,
        price: parseFloat(form.elements['price'].value),
        stock: parseInt(form.elements['stock'].value),
        minStock: parseInt(form.elements['minStock'].value),
        maxStock: parseInt(form.elements['maxStock'].value) || 0
    };
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Product updated', 'success');
            closeEditProductModal();
            loadProducts();
        } else {
            showToast(data.message || 'Update failed', 'error');
        }
    } catch (e) {
        console.error('Edit product submit error', e);
        showToast('Update failed. Backend not connected.', 'warning');
    }
}

// Remove duplicate simplistic loadProducts (kept the parameterized version above)

function addToCart(productId, name, price, unit) {
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            productId,
            name,
            price,
            unit,
            quantity: 1
        });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    showToast(`${name} added to cart`, 'success');

    // Add to recent activities
    addRecentActivity('cart', {
        action: 'added',
        productName: name,
        quantity: 1,
        price: price
    });
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    showToast('Item removed from cart', 'info');
}

// Cart functions moved to cart-integration.js and client-shopping.js

// Populate product dropdowns for inventory management
function populateProductDropdowns(products) {
    const addStockSelect = document.querySelector('#addStockForm select[name="product"]');
    const removeStockSelect = document.querySelector('#removeStockForm select[name="product"]');

    if (!products || products.length === 0) return;

    const options = products.map(product =>
        `<option value="${product._id}">${product.name} (Current: ${product.stock || 0} ${product.unit || 'units'})</option>`
    ).join('');

    if (addStockSelect) {
        addStockSelect.innerHTML = '<option value="">Select Product</option>' + options;
    }

    if (removeStockSelect) {
        removeStockSelect.innerHTML = '<option value="">Select Product</option>' + options;
    }
}

// Helper functions for enhanced cart display
function getQuantityDisplayText(quantity, unit, productName) {
    // Create more descriptive quantity text based on product name and unit
    const lowerName = productName.toLowerCase();
    const lowerUnit = unit.toLowerCase();

    // Special cases for common products
    if (lowerName.includes('rice')) {
        if (lowerUnit === 'kg' && quantity > 1) {
            return `${quantity} sacks of rice`;
        } else if (lowerUnit === 'kg') {
            return `${quantity} sack of rice`;
        }
    }

    if (lowerName.includes('chicken') && lowerUnit === 'kg') {
        return quantity > 1 ? `${quantity} kilos of chicken` : `${quantity} kilo of chicken`;
    }

    if (lowerName.includes('fish') || lowerName.includes('salmon') || lowerName.includes('tuna')) {
        if (lowerUnit === 'kg') {
            return quantity > 1 ? `${quantity} kilos of fish` : `${quantity} kilo of fish`;
        } else if (lowerUnit === 'piece' || lowerUnit === 'pc') {
            return quantity > 1 ? `${quantity} pieces of fish` : `${quantity} piece of fish`;
        }
    }

    if (lowerName.includes('egg') && (lowerUnit === 'piece' || lowerUnit === 'pc')) {
        return quantity > 1 ? `${quantity} eggs` : `${quantity} egg`;
    }

    if (lowerName.includes('milk') || lowerName.includes('yogurt')) {
        if (lowerUnit === 'bottle' || lowerUnit === 'btl') {
            return quantity > 1 ? `${quantity} bottles` : `${quantity} bottle`;
        } else if (lowerUnit === 'carton') {
            return quantity > 1 ? `${quantity} cartons` : `${quantity} carton`;
        }
    }

    // Default format with proper pluralization
    if (quantity > 1) {
        // Handle units that need special pluralization
        let pluralUnit = lowerUnit;
        if (lowerUnit === 'box') pluralUnit = 'boxes';
        else if (lowerUnit === 'piece' || lowerUnit === 'pc') pluralUnit = 'pieces';
        else if (lowerUnit === 'bottle' || lowerUnit === 'btl') pluralUnit = 'bottles';
        else if (lowerUnit === 'pack') pluralUnit = 'packs';
        else if (lowerUnit === 'kg') pluralUnit = 'kilos';
        else if (lowerUnit === 'g') pluralUnit = 'grams';
        else if (lowerUnit === 'lb' || lowerUnit === 'lbs') pluralUnit = 'pounds';
        else if (!lowerUnit.endsWith('s')) pluralUnit = lowerUnit + 's';

        return `${quantity} ${pluralUnit}`;
    } else {
        return `${quantity} ${unit}`;
    }
}

function getCategoryFromName(productName) {
    // Guess category from product name for better icons
    const lowerName = productName.toLowerCase();

    if (lowerName.includes('chicken') || lowerName.includes('wings') || lowerName.includes('drumstick')) {
        return 'chicken';
    }
    if (lowerName.includes('beef') || lowerName.includes('steak') || lowerName.includes('ground beef')) {
        return 'beef';
    }
    if (lowerName.includes('pork') || lowerName.includes('bacon') || lowerName.includes('ham')) {
        return 'pork';
    }
    if (lowerName.includes('fish') || lowerName.includes('salmon') || lowerName.includes('tuna') || lowerName.includes('seafood')) {
        return 'seafood';
    }
    if (lowerName.includes('carrot') || lowerName.includes('vegetable') || lowerName.includes('broccoli') || lowerName.includes('potato')) {
        return 'vegetables';
    }
    if (lowerName.includes('milk') || lowerName.includes('cheese') || lowerName.includes('yogurt') || lowerName.includes('dairy')) {
        return 'dairy';
    }
    if (lowerName.includes('rice') || lowerName.includes('grain')) {
        return 'other'; // Will show box icon
    }

    return 'other';
}

// Order Confirmation Functions
function showOrderConfirmation(order) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    modal.innerHTML = `
        <div class="card" style="max-width: 500px; margin: 1rem; animation: slideIn 0.3s ease;">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <i class="fas fa-check-circle" style="color: #10b981; font-size: 3rem; margin-bottom: 1rem;"></i>
                <h2 style="color: #10b981; margin-bottom: 0.5rem;">Order Confirmed!</h2>
                <p style="color: #6b7280;">Thank you for your order. We'll process it shortly.</p>
            </div>
            <div style="background: #f9fafb; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <h3 style="margin-bottom: 0.5rem;">Order Details</h3>
                <p><strong>Order Number:</strong> ${order.orderNumber || 'N/A'}</p>
                <p><strong>Total Amount:</strong> ₱${order.totalAmount || 'N/A'}</p>
                <p><strong>Status:</strong> ${order.status || 'Pending'}</p>
            </div>
            <div style="display: flex; gap: 0.5rem; justify-content: center;">
                <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-primary">
                    Continue Shopping
                </button>
                <button onclick="this.closest('.modal-overlay').remove(); switchTab('orders')" class="btn btn-secondary">
                    View Orders
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Auto-close after 5 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.remove();
        }
    }, 5000);
}

// Helper function to format time ago
function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// Analytics Functions
// Reload analytics when time range changes
function updateAnalyticsCharts() {
    loadAnalytics();
}

// Load and update performance metrics
async function loadPerformanceMetrics() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/analytics/detailed?days=30`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const result = await response.json();
            const data = result.data;

            // Update Total Revenue
            const totalRevenue = data.revenueMetrics?.totalRevenue || 0;
            const revenueEl = document.getElementById('perfTotalRevenue');
            if (revenueEl) {
                revenueEl.textContent = `₱${totalRevenue.toLocaleString()}`;
            }

            // Update Orders Processed
            const totalOrders = data.revenueMetrics?.totalOrders || 0;
            const ordersEl = document.getElementById('perfOrdersProcessed');
            if (ordersEl) {
                ordersEl.textContent = totalOrders.toLocaleString();
            }

            // Update Average Order Value
            const avgOrderValue = data.revenueMetrics?.averageOrderValue || 0;
            const avgEl = document.getElementById('perfAvgOrderValue');
            if (avgEl) {
                avgEl.textContent = `₱${Math.round(avgOrderValue).toLocaleString()}`;
            }

            // Calculate customer satisfaction based on order status
            const orderStatus = data.orderStatusDistribution || {};
            const delivered = orderStatus.delivered || 0;
            const cancelled = orderStatus.cancelled || 0;
            const total = Object.values(orderStatus).reduce((sum, count) => sum + count, 0);
            const satisfaction = total > 0 ? ((delivered / total) * 100).toFixed(1) : 0;

            const satEl = document.getElementById('perfCustomerSat');
            if (satEl) {
                satEl.textContent = `${satisfaction}%`;
            }

            // Calculate growth percentages (comparing to previous period would require more data)
            // For now, show positive indicators if metrics are good
            const revenueChangeEl = document.getElementById('perfRevenueChange');
            if (revenueChangeEl && totalRevenue > 0) {
                revenueChangeEl.textContent = 'Last 30 days';
                revenueChangeEl.style.color = 'var(--success)';
            }

            const ordersChangeEl = document.getElementById('perfOrdersChange');
            if (ordersChangeEl && totalOrders > 0) {
                ordersChangeEl.textContent = 'Last 30 days';
                ordersChangeEl.style.color = 'var(--success)';
            }

            const avgChangeEl = document.getElementById('perfAvgChange');
            if (avgChangeEl && avgOrderValue > 0) {
                avgChangeEl.textContent = 'Last 30 days';
                avgChangeEl.style.color = 'var(--success)';
            }

            const satChangeEl = document.getElementById('perfSatChange');
            if (satChangeEl) {
                if (satisfaction >= 90) {
                    satChangeEl.textContent = 'Excellent';
                    satChangeEl.style.color = 'var(--success)';
                } else if (satisfaction >= 75) {
                    satChangeEl.textContent = 'Good';
                    satChangeEl.style.color = 'var(--info)';
                } else if (satisfaction >= 60) {
                    satChangeEl.textContent = 'Fair';
                    satChangeEl.style.color = 'var(--warning)';
                } else {
                    satChangeEl.textContent = 'Needs Improvement';
                    satChangeEl.style.color = 'var(--error)';
                }
            }
        }
    } catch (error) {
        console.error('Error loading performance metrics:', error);
        // Fail silently - metrics will show default values
    }
}

function refreshAnalytics() {
    loadAnalytics();
}

// Update sales trend chart with real data
function updateSalesTrendChart(salesData) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded');
        return;
    }

    if (window.salesChart && typeof window.salesChart.destroy === 'function') {
        window.salesChart.destroy();
    }

    try {
        window.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: salesData.labels || [],
                datasets: [{
                    label: 'Daily Sales (₱)',
                    data: salesData.data || [],
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return 'Sales: ₱' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '₱' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating sales chart:', error);
    }
}

// Update top products list with real data
function updateTopProductsList(products) {
    const container = document.getElementById('topProducts');
    if (!container || !products || products.length === 0) return;

    const colors = [
        'linear-gradient(135deg, var(--primary), var(--primary-dark))',
        'linear-gradient(135deg, var(--secondary), #475569)',
        'linear-gradient(135deg, #dc2626, #b91c1c)',
        'linear-gradient(135deg, #16a34a, #15803d)',
        'linear-gradient(135deg, #ea580c, #c2410c)'
    ];

    container.innerHTML = products.slice(0, 5).map((product, index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--background); border-radius: 0.5rem; margin-bottom: 0.5rem; transition: all 0.2s;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 40px; height: 40px; background: ${colors[index] || colors[0]}; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700;">${index + 1}</div>
                <div>
                    <div style="font-weight: 600; color: var(--text);">${product.name}</div>
                    <div style="font-size: 0.875rem; color: var(--text-muted);">${product.unitsSold} units sold</div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 600; color: var(--text);">₱${product.revenue.toLocaleString()}</div>
                <div style="font-size: 0.875rem; color: ${product.growth >= 0 ? 'var(--success)' : 'var(--error)'};">
                    ${product.growth >= 0 ? '+' : ''}${product.growth}%
                </div>
            </div>
        </div>
    `).join('');
}

// Update revenue metrics
function updateRevenueMetrics(metrics) {
    if (!metrics) return;

    // Create or update metrics display
    const metricsContainer = document.getElementById('revenueMetrics');
    if (metricsContainer) {
        metricsContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                <div style="padding: 1rem; background: var(--background-alt); border-radius: var(--radius); border-left: 4px solid var(--primary);">
                    <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem;">Total Revenue</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">₱${(metrics.totalRevenue || 0).toLocaleString()}</div>
                </div>
                <div style="padding: 1rem; background: var(--background-alt); border-radius: var(--radius); border-left: 4px solid var(--success);">
                    <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem;">Avg Order Value</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">₱${Math.round(metrics.averageOrderValue || 0).toLocaleString()}</div>
                </div>
                <div style="padding: 1rem; background: var(--background-alt); border-radius: var(--radius); border-left: 4px solid var(--info);">
                    <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem;">Total Orders</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--info);">${(metrics.totalOrders || 0).toLocaleString()}</div>
                </div>
            </div>
        `;
    }
}

// Update insights section
function updateInsights(insights) {
    const container = document.getElementById('insightsContainer');
    if (!container || !insights || insights.length === 0) return;

    container.innerHTML = insights.map(insight => `
        <div class="insight-card" style="padding: 1rem; background: var(--background-alt); border-radius: var(--radius); border-left: 4px solid var(--${insight.type === 'success' ? 'success' : 'info'}); margin-bottom: 1rem;">
            <div style="display: flex; align-items: start; gap: 1rem;">
                <div style="width: 40px; height: 40px; background: var(--${insight.type === 'success' ? 'success' : 'info'}); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
                    <i class="fas ${insight.icon}"></i>
                </div>
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 0.5rem 0; color: var(--text); font-size: 1rem;">${insight.title}</h4>
                    <p style="margin: 0; color: var(--text-muted); font-size: 0.9rem;">${insight.message}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// Load smart insights with real data
async function loadSmartInsights() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('smartInsightsContainer');

    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/analytics/smart-insights`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            const insights = result.data;

            if (insights && insights.length > 0) {
                container.innerHTML = insights.map(insight => {
                    const colorMap = {
                        success: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)' },
                        warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', color: 'var(--warning)' },
                        info: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)', color: 'var(--info)' },
                        purple: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.2)', color: '#a855f7' }
                    };

                    const colors = colorMap[insight.color] || colorMap.info;

                    let actionButton = '';
                    if (insight.action && insight.actionLabel) {
                        let onclick = '';
                        if (insight.action === 'switchTab') {
                            onclick = `switchTab('${insight.actionParam}')`;
                        } else if (insight.action === 'createPurchaseOrder') {
                            onclick = `createPurchaseOrder('${insight.productId || ''}')`;
                        } else if (insight.action === 'createWeekendPromotion') {
                            onclick = `createWeekendPromotion()`;
                        }

                        actionButton = `
                            <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.875rem; margin-top: 0.5rem;" onclick="${onclick}">
                                ${insight.actionLabel}
                            </button>
                        `;
                    }

                    return `
                        <div style="padding: 1.5rem; background: linear-gradient(135deg, ${colors.bg}, ${colors.bg}); border-radius: 0.75rem; border: 1px solid ${colors.border};">
                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                                <i class="fas ${insight.icon}" style="color: ${colors.color}; font-size: 1.5rem;"></i>
                                <h4 style="margin: 0; color: var(--text);">${insight.title}</h4>
                            </div>
                            <p style="color: var(--text-muted); margin: 0;">${insight.message}</p>
                            ${actionButton}
                        </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = `
                    <div style="padding: 2rem; text-align: center; color: var(--text-muted); grid-column: 1 / -1;">
                        <i class="fas fa-info-circle" style="font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem;"></i>
                        <p>No insights available yet. Start processing orders to see recommendations.</p>
                    </div>
                `;
            }
        } else {
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--text-muted); grid-column: 1 / -1;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem;"></i>
                    <p>Unable to load insights. Please try again.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Smart insights error:', error);
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--text-muted); grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem;"></i>
                <p>Failed to load insights.</p>
            </div>
        `;
    }
}

async function exportAnalytics() {
    const timeRange = document.getElementById('analyticsTimeRange')?.value || '30';
    const token = localStorage.getItem('token');

    try {
        showLoading();
        showToast('Generating analytics report...', 'info');

        const response = await fetch(`${API_BASE_URL}/analytics/detailed?days=${timeRange}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const result = await response.json();
            const data = result.data;

            // Generate CSV content
            let csvContent = "CRISNIL Trading Corp Analytics Report\\n";
            csvContent += `Generated: ${new Date().toLocaleString()}\\n`;
            csvContent += `Period: Last ${timeRange} days\\n\\n`;

            // Revenue Metrics
            csvContent += "REVENUE METRICS\\n";
            csvContent += `Total Revenue,₱${(data.revenueMetrics?.totalRevenue || 0).toLocaleString()}\\n`;
            csvContent += `Average Order Value,₱${Math.round(data.revenueMetrics?.averageOrderValue || 0).toLocaleString()}\\n`;
            csvContent += `Total Orders,${(data.revenueMetrics?.totalOrders || 0).toLocaleString()}\\n\\n`;

            // Top Products
            csvContent += "TOP PRODUCTS\\n";
            csvContent += "Rank,Product Name,Units Sold,Revenue,Growth\\n";
            (data.topProducts || []).forEach((product, index) => {
                csvContent += `${index + 1},${product.name},${product.unitsSold},₱${product.revenue.toLocaleString()},${product.growth}%\\n`;
            });

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            hideLoading();
            showToast('Analytics report exported successfully!', 'success');
        } else {
            hideLoading();
            showToast('Failed to export analytics report', 'error');
        }
    } catch (error) {
        console.error('Export error:', error);
        hideLoading();
        showToast('Failed to export analytics report', 'error');
    }
}

function updateSalesChart(timeRange = 30) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded, skipping sales chart update');
        return;
    }

    // Destroy existing chart if it exists
    if (window.salesChart && typeof window.salesChart.destroy === 'function') {
        window.salesChart.destroy();
    }

    const labels = [];
    const data = [];

    // Generate sample data based on time range
    for (let i = timeRange - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        data.push(Math.floor(Math.random() * 5000) + 1000);
    }

    try {
        window.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Sales (₱)',
                    data: data,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '₱' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating sales chart:', error);
    }
}

function updateCategoryChart(timeRange = 30) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded, skipping category chart update');
        return;
    }

    if (window.categoryChart && typeof window.categoryChart.destroy === 'function') {
        window.categoryChart.destroy();
    }

    try {
        window.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Chicken', 'Beef', 'Seafood', 'Vegetables', 'Dairy'],
                datasets: [{
                    data: [35, 25, 20, 15, 5],
                    backgroundColor: [
                        'rgb(59, 130, 246)',
                        'rgb(239, 68, 68)',
                        'rgb(16, 185, 129)',
                        'rgb(245, 158, 11)',
                        'rgb(168, 85, 247)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating category chart:', error);
    }
}

function updateOrderStatusChart(timeRange = 30) {
    const ctx = document.getElementById('orderStatusChart');
    if (!ctx) return;

    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded, skipping order status chart update');
        return;
    }

    if (window.orderStatusChart && typeof window.orderStatusChart.destroy === 'function') {
        window.orderStatusChart.destroy();
    }

    try {
        window.orderStatusChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'],
                datasets: [{
                    label: 'Orders',
                    data: [12, 45, 23, 18, 58],
                    backgroundColor: [
                        'rgb(245, 158, 11)',
                        'rgb(59, 130, 246)',
                        'rgb(168, 85, 247)',
                        'rgb(16, 185, 129)',
                        'rgb(34, 197, 94)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating order status chart:', error);
    }
}

// Staff Management Functions
function showCreateStaffModal() {
    const modal = document.getElementById('createStaffModal');
    if (modal) modal.style.display = 'block';
}

function closeCreateStaffModal() {
    const modal = document.getElementById('createStaffModal');
    if (modal) modal.style.display = 'none';
}

// Open add stock modal
function openAddStockModal() {
    console.log('openAddStockModal called');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-plus-circle"></i> Add Stock</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="addStockModalForm">
                    <div class="form-group">
                        <label>Product</label>
                        <select name="product" class="form-input" required id="addStockProductSelect">
                            <option value="">Loading products...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Quantity</label>
                        <input name="quantity" type="number" class="form-input" min="1" required>
                    </div>
                    <div class="form-group">
                        <label>Reason</label>
                        <textarea name="reason" class="form-input" rows="3" placeholder="New stock arrival, restock, etc." required></textarea>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-plus"></i> Add Stock
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Load products into select
    loadProductsIntoSelect('addStockProductSelect');

    modal.querySelector('#addStockModalForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
            showLoading();
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/inventory/add-stock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: formData.get('product'),
                    quantity: parseInt(formData.get('quantity')),
                    reason: formData.get('reason')
                })
            });

            hideLoading();
            modal.remove();

            if (response.ok) {
                showToast('Stock added successfully', 'success');
                loadInventory();
            } else {
                const error = await response.json();
                showToast(error.message || 'Failed to add stock', 'error');
            }
        } catch (error) {
            hideLoading();
            modal.remove();
            console.error('Error adding stock:', error);
            showToast('Failed to add stock', 'error');
        }
    });
}

// Open remove stock modal
function openRemoveStockModal() {
    console.log('openRemoveStockModal called');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-minus-circle"></i> Remove Stock</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="removeStockModalForm">
                    <div class="form-group">
                        <label>Product</label>
                        <select name="product" class="form-input" required id="removeStockProductSelect">
                            <option value="">Loading products...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Quantity</label>
                        <input name="quantity" type="number" class="form-input" min="1" required>
                    </div>
                    <div class="form-group">
                        <label>Reason</label>
                        <select name="reason" class="form-input" required>
                            <option value="">Select Reason</option>
                            <option value="expired">Expired</option>
                            <option value="damaged">Damaged</option>
                            <option value="returned">Customer Return</option>
                            <option value="quality_issue">Quality Issue</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" class="btn" style="background: var(--error); color: white; flex: 1;">
                            <i class="fas fa-minus"></i> Remove Stock
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Load products into select
    loadProductsIntoSelect('removeStockProductSelect');

    modal.querySelector('#removeStockModalForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
            showLoading();
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/inventory/remove-stock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: formData.get('product'),
                    quantity: parseInt(formData.get('quantity')),
                    reason: formData.get('reason')
                })
            });

            hideLoading();
            modal.remove();

            if (response.ok) {
                showToast('Stock removed successfully', 'success');
                loadInventory();
            } else {
                const error = await response.json();
                showToast(error.message || 'Failed to remove stock', 'error');
            }
        } catch (error) {
            hideLoading();
            modal.remove();
            console.error('Error removing stock:', error);
            showToast('Failed to remove stock', 'error');
        }
    });
}

// Load products into select dropdown
async function loadProductsIntoSelect(selectId) {
    const token = localStorage.getItem('token');
    const select = document.getElementById(selectId);

    if (!select) return;

    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const result = await response.json();
            const products = result.products || result.data || [];

            select.innerHTML = '<option value="">Select Product</option>' +
                products.map(p => `<option value="${p._id}">${p.name} (${p.stock} ${p.unit})</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        select.innerHTML = '<option value="">Error loading products</option>';
    }
}

// View restock history
async function viewRestockHistory() {
    const token = localStorage.getItem('token');

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/inventory/history?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        hideLoading();

        if (response.ok) {
            const result = await response.json();
            showRestockHistoryModal(result.data);
        } else {
            showToast('Failed to load restock history', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error loading history:', error);
        showToast('Failed to load restock history', 'error');
    }
}

// Show restock history modal
function showRestockHistoryModal(logs) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
            <div class="modal-header">
                <h3><i class="fas fa-history"></i> Restock History</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body" style="overflow-y: auto; flex: 1;">
                ${logs.length === 0 ? `
                    <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.3;"></i>
                        <p>No restock history found</p>
                    </div>
                ` : `
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--border); text-align: left;">
                                <th style="padding: 0.75rem;">Date</th>
                                <th style="padding: 0.75rem;">Product</th>
                                <th style="padding: 0.75rem;">Action</th>
                                <th style="padding: 0.75rem;">Quantity</th>
                                <th style="padding: 0.75rem;">Previous</th>
                                <th style="padding: 0.75rem;">New</th>
                                <th style="padding: 0.75rem;">Reason</th>
                                <th style="padding: 0.75rem;">By</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.map(log => `
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 0.75rem; font-size: 0.875rem;">
                                        ${new Date(log.createdAt).toLocaleDateString()}<br>
                                        <span style="color: var(--text-muted); font-size: 0.75rem;">
                                            ${new Date(log.createdAt).toLocaleTimeString()}
                                        </span>
                                    </td>
                                    <td style="padding: 0.75rem;">
                                        ${log.product?.name || 'Unknown'}
                                        <br>
                                        <span style="color: var(--text-muted); font-size: 0.75rem;">
                                            ${log.product?.category || ''}
                                        </span>
                                    </td>
                                    <td style="padding: 0.75rem;">
                                        <span style="padding: 0.25rem 0.5rem; background: ${log.action === 'add' ? 'var(--success)' : 'var(--error)'}; color: white; border-radius: 0.25rem; font-size: 0.75rem;">
                                            ${log.action === 'add' ? 'ADD' : 'REMOVE'}
                                        </span>
                                    </td>
                                    <td style="padding: 0.75rem; font-weight: 600; color: ${log.action === 'add' ? 'var(--success)' : 'var(--error)'};">
                                        ${log.action === 'add' ? '+' : '-'}${log.quantity}
                                    </td>
                                    <td style="padding: 0.75rem;">${log.previousStock}</td>
                                    <td style="padding: 0.75rem; font-weight: 600;">${log.newStock}</td>
                                    <td style="padding: 0.75rem; font-size: 0.875rem;">${log.reason || '-'}</td>
                                    <td style="padding: 0.75rem; font-size: 0.875rem;">${log.performedBy?.username || 'System'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
            <div style="padding: 1rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                    Close
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Export inventory to CSV
async function exportInventoryCSV() {
    const token = localStorage.getItem('token');

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/inventory/list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        hideLoading();

        if (response.ok) {
            const result = await response.json();
            const products = result.data;

            // Create CSV content
            const headers = ['Name', 'Category', 'SKU', 'Stock', 'Min Stock', 'Unit', 'Price', 'Status', 'Supplier'];
            const rows = products.map(p => [
                p.name,
                p.category,
                p._id.slice(-8),
                p.stock,
                p.minStock,
                p.unit,
                p.price,
                p.stockStatus,
                p.supplier?.name || 'N/A'
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('Inventory exported successfully', 'success');
        } else {
            showToast('Failed to export inventory', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error exporting inventory:', error);
        showToast('Failed to export inventory', 'error');
    }
}

// Analytics Insight Functions

// Supplier database with contact info
const SUPPLIERS = {
    seafood: [
        { name: 'Ocean Fresh Suppliers', contact: '+63 917 123 4567', email: 'orders@oceanfresh.ph', rating: 4.8 },
        { name: 'Manila Bay Seafood Co.', contact: '+63 918 234 5678', email: 'sales@manilabayseafood.com', rating: 4.6 },
        { name: 'Pacific Marine Products', contact: '+63 919 345 6789', email: 'info@pacificmarine.ph', rating: 4.7 }
    ],
    meat: [
        { name: 'Prime Meat Distributors', contact: '+63 920 456 7890', email: 'orders@primemeat.ph', rating: 4.9 },
        { name: 'Quality Meats Inc.', contact: '+63 921 567 8901', email: 'sales@qualitymeats.com', rating: 4.5 },
        { name: 'Fresh Cuts Wholesale', contact: '+63 922 678 9012', email: 'info@freshcuts.ph', rating: 4.7 }
    ],
    vegetables: [
        { name: 'Farm Fresh Vegetables', contact: '+63 923 789 0123', email: 'orders@farmfresh.ph', rating: 4.8 },
        { name: 'Green Valley Produce', contact: '+63 924 890 1234', email: 'sales@greenvalley.com', rating: 4.6 },
        { name: 'Organic Harvest Co.', contact: '+63 925 901 2345', email: 'info@organicharvest.ph', rating: 4.9 }
    ],
    dairy: [
        { name: 'Dairy Best Suppliers', contact: '+63 926 012 3456', email: 'orders@dairybest.ph', rating: 4.7 },
        { name: 'Fresh Milk Products', contact: '+63 927 123 4567', email: 'sales@freshmilk.com', rating: 4.5 },
        { name: 'Premium Dairy Inc.', contact: '+63 928 234 5678', email: 'info@premiumdairy.ph', rating: 4.8 }
    ]
};

function createPurchaseOrder(productId) {
    // Open enhanced restock modal with multiple supplier selection
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h3><i class="fas fa-truck"></i> Smart Supplier Restock System</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1)); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border-left: 4px solid var(--info);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-info-circle" style="color: var(--info);"></i>
                            <strong>Enhanced Supplier Management</strong>
                        </div>
                        <button type="button" class="btn btn-secondary" onclick="openEmailSettings()" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;">
                            <i class="fas fa-cog"></i> Email Settings
                        </button>
                    </div>
                    <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted);">
                        Choose from multiple suppliers, compare ratings, and send real email notifications automatically.
                    </p>
                </div>
                
                <form id="restockOrderForm">
                    <div class="form-group">
                        <label>Product to Restock</label>
                        <select name="productId" id="restockProductSelect" class="form-input" required onchange="updateSupplierList(this.value)">
                            <option value="">Loading products...</option>
                        </select>
                    </div>
                    
                    <div id="productInfoCard" style="display: none; background: var(--background-alt); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; text-align: center;">
                            <div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Current Stock</div>
                                <div id="currentStock" style="font-size: 1.5rem; font-weight: bold; color: var(--error);">0</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Min Stock</div>
                                <div id="minStock" style="font-size: 1.5rem; font-weight: bold; color: var(--warning);">10</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Suggested Order</div>
                                <div id="suggestedQty" style="font-size: 1.5rem; font-weight: bold; color: var(--success);">50</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Stock Status</div>
                                <div id="stockStatus" style="font-size: 1rem; font-weight: bold;">
                                    <span id="stockStatusBadge" class="badge badge-danger">Critical</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Available Suppliers (Choose Best Option)</label>
                        <div id="supplierCards" style="display: grid; gap: 1rem; margin-top: 0.5rem;">
                            <!-- Supplier cards will be populated here -->
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Quantity to Order</label>
                        <div style="display: flex; gap: 1rem; align-items: center;">
                            <input type="number" name="quantity" id="orderQuantity" class="form-input" min="1" value="50" required style="flex: 1;">
                            <button type="button" class="btn btn-secondary" onclick="useRecommendedQuantity()" style="white-space: nowrap;">
                                Use Recommended
                            </button>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-top: 0.5rem; font-size: 0.875rem;">
                            <span style="color: var(--text-muted);">
                                <i class="fas fa-lightbulb"></i> 
                                Recommended: <span id="recommendedQty">50</span> units
                            </span>
                            <span style="color: var(--text-muted);">
                                <i class="fas fa-calculator"></i> 
                                Total Cost: ₱<span id="estimatedCost">2,500</span>
                            </span>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Expected Delivery Date</label>
                        <input type="date" name="deliveryDate" class="form-input" required>
                        <small style="color: var(--text-muted);">Typical delivery: 3-7 business days</small>
                    </div>
                    
                    <div class="form-group">
                        <label style="display: flex; justify-content: space-between; align-items: center;">
                            <span>Email Notification Options</span>
                            <button type="button" onclick="openEmailSettings()" style="background: none; border: none; color: var(--primary); cursor: pointer; font-size: 0.875rem; text-decoration: underline;">
                                <i class="fas fa-envelope-open-text"></i> Configure Emails
                            </button>
                        </label>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <label style="display: flex; align-items: center; gap: 0.5rem;">
                                <input type="checkbox" name="sendEmail" id="sendEmailCheck" checked> 
                                <span>Send email to selected supplier</span>
                                <span style="background: var(--success); color: white; padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-left: 0.5rem;">FREE</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem;">
                                <input type="checkbox" name="sendCopy" id="sendCopyCheck"> 
                                <span>Send copy to admin email</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem;">
                                <input type="checkbox" name="autoReorder" id="autoReorderCheck"> 
                                <span>Enable auto-reorder when stock reaches minimum</span>
                            </label>
                        </div>
                        <div id="emailPreviewInfo" style="margin-top: 0.5rem; padding: 0.75rem; background: var(--background-alt); border-radius: 0.5rem; font-size: 0.875rem; color: var(--text-muted);">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                <i class="fas fa-info-circle" style="color: var(--info);"></i>
                                <strong>Current Email Settings:</strong>
                            </div>
                            <div style="margin-left: 1.5rem;">
                                <div>From: <span id="currentFromEmail">${JSON.parse(localStorage.getItem('emailSettings') || '{}').companyEmail || 'admin@crisniltrading.com'}</span></div>
                                <div>Admin Copy: <span id="currentAdminEmail">${JSON.parse(localStorage.getItem('emailSettings') || '{}').adminEmail || 'admin@crisniltrading.com'}</span></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Additional Notes (Optional)</label>
                        <textarea name="notes" class="form-input" rows="2" placeholder="Special instructions for supplier (e.g., delivery time preferences, quality requirements)..."></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-paper-plane"></i> Create Order & Send Email
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Load low stock products - with a small delay to ensure DOM is ready
    setTimeout(() => {
        loadLowStockProductsForRestock(productId);
    }, 100);

    // Set minimum date to today
    const dateInput = modal.querySelector('input[name="deliveryDate"]');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default 5 days

    // Add quantity input listener for real-time cost updates
    const quantityInput = modal.querySelector('#orderQuantity');
    quantityInput.addEventListener('input', function () {
        const selectedCard = modal.querySelector('.supplier-card input[type="radio"]:checked')?.closest('.supplier-card');
        if (selectedCard) {
            const supplier = JSON.parse(selectedCard.dataset.supplier);
            updateEstimatedCost(parseInt(this.value) || 0, supplier);
        }
    });

    modal.querySelector('#restockOrderForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Get selected supplier from radio buttons
        const selectedSupplierRadio = modal.querySelector('input[name="selectedSupplier"]:checked');
        if (!selectedSupplierRadio) {
            showToast('Please select a supplier', 'error');
            return;
        }

        const supplierData = JSON.parse(selectedSupplierRadio.value);

        // Get email settings from localStorage
        const emailSettings = JSON.parse(localStorage.getItem('emailSettings') || '{}');

        const orderData = {
            id: 'RO-' + Date.now(),
            productId: formData.get('productId'),
            productName: modal.querySelector('#restockProductSelect option:checked').text,
            quantity: parseInt(formData.get('quantity')),
            supplier: supplierData,
            expectedDelivery: formData.get('deliveryDate'),
            notes: formData.get('notes'),
            sendEmail: formData.get('sendEmail') === 'on',
            sendCopy: formData.get('sendCopy') === 'on',
            autoReorder: formData.get('autoReorder') === 'on',
            status: 'pending',
            createdAt: new Date().toISOString(),
            estimatedCost: document.getElementById('estimatedCost').textContent,
            // Include custom email settings
            companyName: emailSettings.companyName || 'CRISNIL Trading Corp',
            companyEmail: emailSettings.companyEmail || 'admin@crisniltrading.com',
            adminEmail: emailSettings.adminEmail || 'admin@crisniltrading.com',
            companyAddress: emailSettings.companyAddress || '123 Business District, Manila, Philippines',
            companyPhone: emailSettings.companyPhone || '+63 917 123 4567'
        };

        try {
            showLoading();

            // Send to backend API
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/restock/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                const { order, emailResults } = result.data;

                // Also save to localStorage for offline access
                const orders = JSON.parse(localStorage.getItem('restockOrders') || '[]');
                orders.push(order);
                localStorage.setItem('restockOrders', JSON.stringify(orders));

                // Create admin notification
                createAdminNotification({
                    type: 'restock',
                    title: 'Purchase Order Created',
                    message: `Order ${order.id} for ${order.productName} (${order.quantity} units) sent to ${order.supplier.name}. Est. cost: ₱${order.estimatedCost}`,
                    priority: 'medium',
                    timestamp: new Date().toISOString()
                });

                hideLoading();
                modal.remove();

                // Show success message
                if (emailResults.supplier?.success) {
                    showToast('Purchase order created and email sent successfully!', 'success');
                } else if (orderData.sendEmail) {
                    showToast('Purchase order created but email failed to send', 'warning');
                } else {
                    showToast('Purchase order created successfully!', 'success');
                }

                // Show detailed confirmation with email status
                showRestockConfirmation(order, emailResults);

            } else {
                throw new Error(result.message || 'Failed to create purchase order');
            }

        } catch (error) {
            hideLoading();
            console.error('Error creating restock order:', error);
            showToast('Failed to create restock order', 'error');
        }
    });
}

// Enhanced supplier list with card-based selection
window.updateSupplierList = function (productId) {
    const select = document.getElementById('restockProductSelect');
    const supplierCards = document.getElementById('supplierCards');
    const productInfo = document.getElementById('productInfoCard');

    if (!productId) {
        // Show default suppliers (seafood) even if no product selected
        console.log('No product selected, showing default seafood suppliers');
        productInfo.style.display = 'none';

        // Use default category (seafood) and show suppliers
        const defaultSuppliers = SUPPLIERS.seafood || [];
        const suggested = 50;

        supplierCards.innerHTML = defaultSuppliers.map((supplier, index) => {
            const isRecommended = index === 0;
            return `
                <div class="supplier-card" data-supplier='${JSON.stringify(supplier)}' onclick="selectSupplier(this)" style="
                    border: 2px solid ${isRecommended ? 'var(--success)' : 'var(--border)'};
                    border-radius: 0.75rem;
                    padding: 1rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: ${isRecommended ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))' : 'var(--background-alt)'};
                    position: relative;
                ">
                    ${isRecommended ? `
                        <div style="position: absolute; top: -8px; right: 1rem; background: var(--success); color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: bold;">
                            RECOMMENDED
                        </div>
                    ` : ''}
                    
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                        <div>
                            <h4 style="margin: 0 0 0.25rem 0; color: var(--text);">${supplier.name}</h4>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="color: var(--warning); font-weight: bold;">
                                    ${'★'.repeat(Math.floor(supplier.rating))}${'☆'.repeat(5 - Math.floor(supplier.rating))}
                                </span>
                                <span style="font-weight: bold; color: var(--text);">${supplier.rating}</span>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Delivery</div>
                            <div style="font-weight: bold; color: var(--success);">${3 + index} days</div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.875rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted);">
                            <i class="fas fa-phone"></i>
                            <span>${supplier.contact}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted);">
                            <i class="fas fa-envelope"></i>
                            <span>${supplier.email}</span>
                        </div>
                    </div>
                    
                    <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.875rem; color: var(--text-muted);">Est. Cost (${suggested} units):</span>
                            <span style="font-weight: bold; color: var(--success);">₱${(suggested * (45 + index * 5)).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <input type="radio" name="selectedSupplier" value='${JSON.stringify(supplier)}' style="display: none;" ${isRecommended ? 'checked' : ''}>
                </div>
            `;
        }).join('');

        return;
    }

    // Get product details
    const option = select.querySelector(`option[value="${productId}"]`);
    if (!option) return;

    const productData = JSON.parse(option.dataset.product || '{}');
    const category = productData.category || 'seafood';
    const currentStock = productData.stock || 0;
    const minStock = productData.minStock || 10;

    // Calculate suggested quantity and stock status
    const suggested = Math.max(50, minStock * 5);
    const stockPercentage = (currentStock / minStock) * 100;
    let stockStatus = 'Good';
    let stockBadgeClass = 'badge-success';

    if (stockPercentage <= 25) {
        stockStatus = 'Critical';
        stockBadgeClass = 'badge-danger';
    } else if (stockPercentage <= 50) {
        stockStatus = 'Low';
        stockBadgeClass = 'badge-warning';
    } else if (stockPercentage <= 100) {
        stockStatus = 'Fair';
        stockBadgeClass = 'badge-info';
    }

    // Show product info
    productInfo.style.display = 'block';
    document.getElementById('currentStock').textContent = currentStock;
    document.getElementById('minStock').textContent = minStock;
    document.getElementById('suggestedQty').textContent = suggested;
    document.getElementById('recommendedQty').textContent = suggested;
    document.getElementById('orderQuantity').value = suggested;
    document.getElementById('stockStatusBadge').textContent = stockStatus;
    document.getElementById('stockStatusBadge').className = `badge ${stockBadgeClass}`;

    // Update estimated cost
    updateEstimatedCost(suggested);

    // Get suppliers for category
    const suppliers = SUPPLIERS[category] || SUPPLIERS.seafood;

    // Create supplier cards
    supplierCards.innerHTML = suppliers.map((supplier, index) => {
        const isRecommended = index === 0; // First supplier is recommended
        return `
            <div class="supplier-card" data-supplier='${JSON.stringify(supplier)}' onclick="selectSupplier(this)" style="
                border: 2px solid ${isRecommended ? 'var(--success)' : 'var(--border)'};
                border-radius: 0.75rem;
                padding: 1rem;
                cursor: pointer;
                transition: all 0.2s ease;
                background: ${isRecommended ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))' : 'var(--background-alt)'};
                position: relative;
            ">
                ${isRecommended ? `
                    <div style="position: absolute; top: -8px; right: 1rem; background: var(--success); color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: bold;">
                        RECOMMENDED
                    </div>
                ` : ''}
                
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                    <div>
                        <h4 style="margin: 0 0 0.25rem 0; color: var(--text);">${supplier.name}</h4>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="color: var(--warning); font-weight: bold;">
                                ${'★'.repeat(Math.floor(supplier.rating))}${'☆'.repeat(5 - Math.floor(supplier.rating))}
                            </span>
                            <span style="font-weight: bold; color: var(--text);">${supplier.rating}</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Delivery</div>
                        <div style="font-weight: bold; color: var(--success);">${3 + index} days</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.875rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted);">
                        <i class="fas fa-phone"></i>
                        <span>${supplier.contact}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted);">
                        <i class="fas fa-envelope"></i>
                        <span>${supplier.email}</span>
                    </div>
                </div>
                
                <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.875rem; color: var(--text-muted);">Est. Cost (${suggested} units):</span>
                        <span style="font-weight: bold; color: var(--success);">₱${(suggested * (45 + index * 5)).toLocaleString()}</span>
                    </div>
                </div>
                
                <input type="radio" name="selectedSupplier" value='${JSON.stringify(supplier)}' style="display: none;" ${isRecommended ? 'checked' : ''}>
            </div>
        `;
    }).join('');

    // Auto-select first (recommended) supplier
    if (suppliers.length > 0) {
        const firstCard = supplierCards.querySelector('.supplier-card');
        if (firstCard) {
            firstCard.style.borderColor = 'var(--success)';
            firstCard.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))';
        }
    }
};

// Enhanced supplier selection with card interface
window.selectSupplier = function (cardElement) {
    // Remove selection from all cards
    document.querySelectorAll('.supplier-card').forEach(card => {
        card.style.borderColor = 'var(--border)';
        card.style.background = 'var(--background-alt)';
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = false;
    });

    // Select clicked card
    cardElement.style.borderColor = 'var(--success)';
    cardElement.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))';
    const radio = cardElement.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;

    // Update estimated cost based on selected supplier
    const supplier = JSON.parse(cardElement.dataset.supplier);
    const quantity = parseInt(document.getElementById('orderQuantity').value) || 50;
    updateEstimatedCost(quantity, supplier);
};

// Calculate and update estimated cost
window.updateEstimatedCost = function (quantity, supplier = null) {
    const costElement = document.getElementById('estimatedCost');
    if (!costElement) return;

    // Base cost calculation (varies by supplier)
    let unitCost = 50; // Default cost per unit
    if (supplier) {
        // Different suppliers have different pricing
        const supplierIndex = Object.values(SUPPLIERS).flat().findIndex(s => s.name === supplier.name);
        unitCost = 45 + (supplierIndex % 3) * 5; // Varies between ₱45-55
    }

    const totalCost = quantity * unitCost;
    costElement.textContent = totalCost.toLocaleString();
};

// Use recommended quantity
window.useRecommendedQuantity = function () {
    const recommended = document.getElementById('recommendedQty').textContent;
    const quantityInput = document.getElementById('orderQuantity');
    quantityInput.value = recommended;

    // Update cost
    const selectedCard = document.querySelector('.supplier-card input[type="radio"]:checked')?.closest('.supplier-card');
    if (selectedCard) {
        const supplier = JSON.parse(selectedCard.dataset.supplier);
        updateEstimatedCost(parseInt(recommended), supplier);
    }

    // Visual feedback
    quantityInput.style.background = 'rgba(16, 185, 129, 0.1)';
    setTimeout(() => {
        quantityInput.style.background = '';
    }, 1000);
};

// Enhanced email notification system
async function sendSupplierNotification(orderData) {
    return new Promise(async (resolve, reject) => {
        try {
            // Show sending progress
            showToast('Sending email to supplier...', 'info');

            // Simulate email sending with realistic delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Create professional email content
            const emailContent = {
                to: orderData.supplier.email,
                subject: `Purchase Order Request - ${orderData.id}`,
                body: `
Dear ${orderData.supplier.name} Team,

We would like to place a purchase order for the following:

ORDER DETAILS:
- Order ID: ${orderData.id}
- Product: ${orderData.productName}
- Quantity: ${orderData.quantity} units
- Expected Delivery: ${new Date(orderData.expectedDelivery).toLocaleDateString()}

DELIVERY ADDRESS:
CRISNIL Trading Corp
123 Business District, Manila
Philippines

${orderData.notes ? `SPECIAL INSTRUCTIONS:\n${orderData.notes}\n\n` : ''}

Please confirm receipt of this order and provide:
1. Order confirmation
2. Estimated delivery schedule
3. Invoice details

Contact us at admin@crisniltrading.com for any questions.

Best regards,
CRISNIL Trading Corp Admin Team
                `.trim()
            };

            // Log email details (in production, this would integrate with email service)
            console.log('📧 EMAIL SENT SUCCESSFULLY');
            console.log('To:', emailContent.to);
            console.log('Subject:', emailContent.subject);
            console.log('Body:', emailContent.body);

            // Store email log
            const emailLogs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
            emailLogs.unshift({
                ...emailContent,
                sentAt: new Date().toISOString(),
                orderId: orderData.id,
                status: 'sent'
            });
            localStorage.setItem('emailLogs', JSON.stringify(emailLogs.slice(0, 100))); // Keep last 100

            resolve({
                success: true,
                messageId: 'msg_' + Date.now(),
                sentAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('Email sending failed:', error);
            reject(error);
        }
    });
}

// Send copy to admin email
async function sendAdminCopy(orderData) {
    return new Promise(async (resolve) => {
        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            const adminEmailContent = {
                to: 'admin@crisniltrading.com',
                subject: `Order Copy - ${orderData.id} sent to ${orderData.supplier.name}`,
                body: `
Admin Copy: Purchase order ${orderData.id} has been sent to ${orderData.supplier.name}.

Order Summary:
- Product: ${orderData.productName}
- Quantity: ${orderData.quantity} units
- Supplier: ${orderData.supplier.name}
- Contact: ${orderData.supplier.contact}
- Email: ${orderData.supplier.email}
- Expected Delivery: ${new Date(orderData.expectedDelivery).toLocaleDateString()}
- Auto-reorder: ${orderData.autoReorder ? 'Enabled' : 'Disabled'}

Monitor this order in the admin dashboard.
                `.trim()
            };

            console.log('📧 ADMIN COPY SENT');
            console.log('Admin Email:', adminEmailContent);

            resolve({ success: true });
        } catch (error) {
            console.error('Admin copy failed:', error);
            resolve({ success: false, error });
        }
    });
}

// Create admin notification
function createAdminNotification(notification) {
    const notifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
    notifications.unshift(notification);
    localStorage.setItem('adminNotifications', JSON.stringify(notifications.slice(0, 50))); // Keep last 50

    // Show toast notification
    showToast(notification.message, notification.priority === 'high' ? 'warning' : 'info');
}

async function loadLowStockProductsForRestock(selectedProductId) {
    const select = document.getElementById('restockProductSelect');
    if (!select) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const result = await response.json();
            // Handle different response formats
            const products = result.products || result.data || result || [];

            console.log('API Response:', result);
            console.log('Total products:', products.length);
            console.log('Products data:', products);

            // If no products, show error
            if (products.length === 0) {
                select.innerHTML = '<option value="">No products available</option>';
                return;
            }

            // Filter low stock products (stock <= 20 or stock <= minStock)
            // More lenient filter to catch products that need restocking
            let lowStock = products.filter(p => {
                const minStockLevel = p.minStock || 20;
                const hasStock = typeof p.stock === 'number';
                return hasStock && p.stock <= minStockLevel;
            });

            // If no low stock products found, show ALL products so user can still create orders
            if (lowStock.length === 0) {
                console.log('No low stock products found, showing all products');
                lowStock = products.filter(p => p.isActive !== false); // Show all active products
            }

            console.log('Products to show:', lowStock.length);

            if (lowStock.length === 0) {
                select.innerHTML = '<option value="">No products available</option>';
                return;
            }

            select.innerHTML = '<option value="">Select a product...</option>' + lowStock.map(p => `
                <option value="${p._id}" 
                        data-product='${JSON.stringify({ stock: p.stock, minStock: p.minStock, category: p.category })}' 
                        ${p._id === selectedProductId ? 'selected' : ''}>
                    ${p.name} (Stock: ${p.stock}/${p.minStock || 10})
                </option>
            `).join('');

            // Trigger initial update if product is pre-selected
            if (selectedProductId) {
                updateSupplierList(selectedProductId);
            } else if (lowStock.length > 0) {
                // Auto-select first product
                select.value = lowStock[0]._id;
                updateSupplierList(lowStock[0]._id);
            }
        } else {
            console.error('Failed to fetch products:', response.status, response.statusText);
            const errorData = await response.json().catch(() => ({}));
            console.error('Error details:', errorData);
            select.innerHTML = '<option value="">Failed to load products</option>';
        }
    } catch (error) {
        console.error('Error loading products:', error);
        select.innerHTML = '<option value="">Error loading products</option>';
    }
}

function showRestockConfirmation(orderData, emailResults = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1001;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px;">
            <div style="padding: 2rem; text-align: center;">
                <div style="width: 80px; height: 80px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                    <i class="fas fa-check-circle" style="font-size: 2.5rem; color: white;"></i>
                </div>
                <h3 style="margin-bottom: 0.5rem;">Purchase Order Created Successfully!</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.9rem;">
                    Order ID: <strong>${orderData.id}</strong>
                </p>
                
                <div style="background: var(--background-alt); padding: 1.5rem; border-radius: 0.75rem; text-align: left; margin-bottom: 1.5rem;">
                    <h4 style="margin: 0 0 1rem 0; color: var(--text); text-align: center;">Order Summary</h4>
                    <div style="display: grid; gap: 1rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Product:</span>
                            <strong>${orderData.productName}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Quantity:</span>
                            <strong>${orderData.quantity} units</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Supplier:</span>
                            <strong>${orderData.supplier.name}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Contact:</span>
                            <strong>${orderData.supplier.contact}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Email:</span>
                            <strong>${orderData.supplier.email}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Expected Delivery:</span>
                            <strong>${new Date(orderData.expectedDelivery).toLocaleDateString()}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Estimated Cost:</span>
                            <strong style="color: var(--success);">₱${orderData.estimatedCost}</strong>
                        </div>
                    </div>
                </div>
                
                <!-- Email Status Section -->
                <div style="margin-bottom: 1.5rem;">
                    ${orderData.sendEmail ? `
                        <div style="background: ${emailResults.supplier?.success ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))' : 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))'}; padding: 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem; border: 1px solid ${emailResults.supplier?.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'};">
                            <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
                                <i class="fas ${emailResults.supplier?.success ? 'fa-envelope-circle-check' : 'fa-exclamation-triangle'}" style="color: ${emailResults.supplier?.success ? 'var(--success)' : 'var(--warning)'};"></i>
                                <span style="font-size: 0.9rem;">
                                    ${emailResults.supplier?.success ? 'Email sent to supplier successfully' : 'Email to supplier failed (order still created)'}
                                </span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${orderData.sendCopy && emailResults.admin?.success ? `
                        <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1)); padding: 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem; border: 1px solid rgba(59, 130, 246, 0.2);">
                            <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
                                <i class="fas fa-copy" style="color: var(--info);"></i>
                                <span style="font-size: 0.9rem;">Admin copy sent successfully</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${orderData.autoReorder ? `
                        <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.1)); padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(168, 85, 247, 0.2);">
                            <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
                                <i class="fas fa-rotate" style="color: #a855f7;"></i>
                                <span style="font-size: 0.9rem;">Auto-reorder enabled for future low stock</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-check"></i> Perfect!
                    </button>
                    <button class="btn btn-secondary" onclick="viewEmailLogs()">
                        <i class="fas fa-envelope"></i> View Email Log
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Auto-close after 12 seconds
    setTimeout(() => {
        if (modal.parentElement) modal.remove();
    }, 12000);
}

// View email logs function
window.viewEmailLogs = async function () {
    try {
        showLoading();

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/restock/email-logs`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        hideLoading();

        if (!response.ok) {
            throw new Error('Failed to fetch email logs');
        }

        const result = await response.json();
        const logs = result.data || [];

        if (logs.length === 0) {
            showToast('No email logs found', 'info');
            return;
        }
    } catch (error) {
        hideLoading();
        console.error('Error fetching email logs:', error);
        showToast('Failed to load email logs', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1002;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header">
                <h3><i class="fas fa-envelope"></i> Email Activity Log</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 1rem;">
                    <span style="color: var(--text-muted); font-size: 0.9rem;">
                        Showing last ${logs.length} email${logs.length > 1 ? 's' : ''} sent
                    </span>
                </div>
                
                ${logs.slice(0, 10).map(log => `
                    <div style="background: var(--background-alt); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; border-left: 4px solid var(--success);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                            <strong style="color: var(--text);">${log.subject}</strong>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">
                                ${new Date(log.sentAt).toLocaleString()}
                            </span>
                        </div>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                            <i class="fas fa-envelope"></i> To: ${log.to}
                        </div>
                        <div style="font-size: 0.875rem; color: var(--text-muted);">
                            <i class="fas fa-tag"></i> Order: ${log.orderId}
                        </div>
                    </div>
                `).join('')}
                
                <div style="text-align: center; margin-top: 1rem;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

function createWeekendPromotion() {
    // Create a weekend-specific promotion
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    // Get next weekend dates
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + daysUntilSaturday);
    const nextSunday = new Date(nextSaturday);
    nextSunday.setDate(nextSaturday.getDate() + 1);

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-calendar-weekend"></i> Create Weekend Promotion</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="weekendPromoForm">
                    <div class="form-group">
                        <label>Promotion Name</label>
                        <input type="text" name="name" class="form-input" value="Weekend Special" required>
                    </div>
                    <div class="form-group">
                        <label>Discount Percentage</label>
                        <input type="number" name="discount" class="form-input" min="5" max="50" value="15" required>
                        <small style="color: var(--text-muted);">Recommended: 10-20% for weekends</small>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Start Date (Saturday)</label>
                            <input type="date" name="startDate" class="form-input" value="${nextSaturday.toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label>End Date (Sunday)</label>
                            <input type="date" name="endDate" class="form-input" value="${nextSunday.toISOString().split('T')[0]}" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Apply to Category</label>
                        <select name="category" class="form-input">
                            <option value="all">All Products</option>
                            <option value="seafood">Seafood</option>
                            <option value="meat">Meat</option>
                            <option value="vegetables">Vegetables</option>
                            <option value="dairy">Dairy</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Minimum Purchase (Optional)</label>
                        <input type="number" name="minPurchase" class="form-input" min="0" step="0.01" placeholder="e.g., 500">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" class="form-input" rows="2" placeholder="Weekend special discount on selected items!"></textarea>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-check"></i> Create Promotion
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#weekendPromoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const promoData = {
            name: formData.get('name'),
            type: 'seasonal',
            description: formData.get('description') || 'Weekend special discount',
            discount: {
                type: 'percentage',
                value: parseFloat(formData.get('discount'))
            },
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            conditions: {
                minOrderAmount: parseFloat(formData.get('minPurchase')) || 0,
                category: formData.get('category') !== 'all' ? formData.get('category') : undefined
            },
            isActive: true
        };

        try {
            showLoading();
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/promotions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(promoData)
            });

            hideLoading();
            modal.remove();

            if (response.ok) {
                showToast('Weekend promotion created successfully!', 'success');
                if (typeof loadSmartInsights === 'function') {
                    loadSmartInsights(); // Refresh insights
                }
            } else {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to create promotion', 'error');
            }
        } catch (error) {
            hideLoading();
            modal.remove();
            console.error('Error creating weekend promotion:', error);
            showToast('Failed to create promotion - server error', 'error');
        }
    });
}

/**
 * Create Direct Promo (without coupon code)
 * Focus on automatic promotions that apply to products
 */
async function createDirectPromo() {
    // Show loading while fetching products
    showLoading();

    // Fetch products first
    let products = [];
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            products = data.products || [];
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }

    hideLoading();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    const today = new Date();
    const defaultEndDate = new Date(today);
    defaultEndDate.setDate(today.getDate() + 30);

    // Build product options HTML
    let productOptionsHTML = '<option value="">Select product(s) to apply discount</option>';
    let productCheckboxesHTML = '';

    products.forEach(product => {
        const stockInfo = product.stock ? `Stock: ${product.stock}` : 'Out of Stock';
        const productText = `${product.name} (${stockInfo}) - ₱${product.price.toFixed(2)}`;
        productOptionsHTML += `<option value="${product._id}">${productText}</option>`;

        // Get product image
        const productImage = product.images && product.images.length > 0
            ? `${API_BASE_URL.replace('/api', '')}${product.images[0].url}`
            : null;

        productCheckboxesHTML += `
            <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--background); border-radius: 8px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--surface-hover)'" onmouseout="this.style.background='var(--background)'">
                <input type="checkbox" name="products" value="${product._id}" style="cursor: pointer; width: 18px; height: 18px;">
                ${productImage ? `
                    <img src="${productImage}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 2px solid var(--border);">
                    <div style="display: none; width: 50px; height: 50px; background: var(--background-alt); border-radius: 6px; align-items: center; justify-content: center; color: var(--text-muted); font-size: 1.5rem;">
                        <i class="fas fa-box"></i>
                    </div>
                ` : `
                    <div style="width: 50px; height: 50px; background: var(--background-alt); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 1.5rem; border: 2px solid var(--border);">
                        <i class="fas fa-box"></i>
                    </div>
                `}
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; color: var(--text); margin-bottom: 0.25rem;">${product.name}</div>
                    <div style="font-size: 0.875rem; color: var(--text-muted);">${stockInfo}</div>
                </div>
                <span style="color: var(--primary); font-size: 0.95rem; font-weight: 700;">₱${product.price.toFixed(2)}</span>
            </label>
        `;
    });

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h3><i class="fas fa-percentage"></i> Create Direct Promo</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div style="padding: 1rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1)); border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #6366f1;">
                    <p style="margin: 0; color: var(--text); font-size: 0.95rem;">
                        <i class="fas fa-info-circle" style="color: #6366f1;"></i>
                        <strong>Direct Promo:</strong> Automatically applies discount to selected products without requiring a coupon code. Perfect for product-specific sales and promotions.
                    </p>
                </div>
                
                <form id="directPromoForm">
                    <div class="form-group">
                        <label>Promotion Name *</label>
                        <input type="text" name="name" class="form-input" placeholder="e.g., Weekend Flash Sale, Holiday Special" required>
                    </div>

                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" class="form-input" rows="2" 
                            placeholder="Describe your promotion (shown to customers)..."></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Discount Type *</label>
                            <select name="discountType" class="form-input" onchange="toggleDirectPromoDiscountInput(this)" required>
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed_amount">Fixed Amount (₱)</option>
                                <option value="per_unit">Per Unit Discount (₱)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Discount Value *</label>
                            <input type="number" name="discountValue" class="form-input" 
                                min="1" max="100" step="0.01" placeholder="e.g., 20" required>
                            <small id="directPromoDiscountHint" style="color: var(--text-muted);">Maximum 100%</small>
                        </div>
                    </div>

                    <div class="form-group" id="directPromoMinQuantityField" style="display: none;">
                        <label>Minimum Quantity Required (Optional)</label>
                        <input type="number" name="minQuantityForDiscount" class="form-input" 
                            min="1" placeholder="e.g., 10" step="1">
                        <small style="color: var(--text-muted);">Customer must buy at least this many units to get the per-unit discount (e.g., "Buy 10+ units, get ₱30 off per unit")</small>
                    </div>

                    <div class="form-group">
                        <label>Product Selection *</label>
                        <div style="margin-bottom: 0.75rem; display: flex; gap: 0.5rem;">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="document.querySelectorAll('#directPromoForm [name=products]').forEach(cb => cb.checked = true)">
                                <i class="fas fa-check-double"></i> Select All
                            </button>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="document.querySelectorAll('#directPromoForm [name=products]').forEach(cb => cb.checked = false)">
                                <i class="fas fa-times"></i> Deselect All
                            </button>
                        </div>
                        <div style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                            ${productCheckboxesHTML || '<p style="color: var(--text-muted); text-align: center; margin: 2rem 0;">No products available</p>'}
                        </div>
                        <small style="color: var(--text-muted);">Select products that will have this discount applied automatically</small>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Start Date *</label>
                            <input type="date" name="startDate" class="form-input" 
                                value="${today.toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label>End Date *</label>
                            <input type="date" name="endDate" class="form-input" 
                                value="${defaultEndDate.toISOString().split('T')[0]}" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Usage Limit (Optional)</label>
                        <input type="number" name="usageLimit" class="form-input" 
                            min="1" placeholder="Leave empty for unlimited">
                        <small style="color: var(--text-muted);">Maximum number of times this promotion can be used across all customers</small>
                    </div>

                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" name="isActive" checked>
                            <span>Active (Discount applies immediately)</span>
                        </label>
                    </div>

                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-plus"></i> Create Direct Promo
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#directPromoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Get selected products
        const selectedProducts = [];
        document.querySelectorAll('#directPromoForm [name="products"]:checked').forEach(cb => {
            selectedProducts.push(cb.value);
        });

        if (selectedProducts.length === 0) {
            showToast('Please select at least one product', 'error');
            return;
        }

        // Get discount type and min quantity
        const discountType = formData.get('discountType');
        const minQuantityForDiscount = formData.get('minQuantityForDiscount');

        // For per_unit discount, use the custom min quantity if provided
        const minQuantity = (discountType === 'per_unit' && minQuantityForDiscount)
            ? parseInt(minQuantityForDiscount)
            : 1;

        const promoData = {
            name: formData.get('name'),
            description: formData.get('description') || '',
            category: 'special', // Default category
            discount: {
                type: discountType,
                value: parseFloat(formData.get('discountValue'))
            },
            validity: {
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate')
            },
            rules: {
                minAmount: 0,
                minQuantity: minQuantity,
                products: selectedProducts,
                customerTypes: ['all']
            },
            limits: {
                totalUses: formData.get('usageLimit') ? parseInt(formData.get('usageLimit')) : null,
                perCustomer: null
            },
            status: formData.get('isActive') ? 'active' : 'draft',
            autoApply: true, // Direct promo auto-applies
            isStackable: false,
            priority: 5
        };

        try {
            showLoading();
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/promotions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(promoData)
            });

            hideLoading();

            if (response.ok) {
                modal.remove();
                showToast('Direct Promo created successfully!', 'success');
                loadPromotions(); // Refresh the promotions list
            } else {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to create direct promo', 'error');
            }
        } catch (error) {
            hideLoading();
            console.error('Error creating direct promo:', error);
            showToast('Failed to create direct promo - server error', 'error');
        }
    });
}

// Helper function to toggle discount input for direct promo
function toggleDirectPromoDiscountInput(select) {
    const hintElement = document.getElementById('directPromoDiscountHint');
    const valueInput = select.closest('.form-row').querySelector('[name="discountValue"]');
    const minQuantityField = document.getElementById('directPromoMinQuantityField');

    if (select.value === 'percentage') {
        valueInput.max = '100';
        valueInput.placeholder = 'e.g., 20';
        if (hintElement) hintElement.textContent = 'Maximum 100%';
        if (minQuantityField) minQuantityField.style.display = 'none';
    } else if (select.value === 'fixed_amount') {
        valueInput.max = '999999';
        valueInput.placeholder = 'e.g., 100';
        if (hintElement) hintElement.textContent = 'Fixed amount in ₱';
        if (minQuantityField) minQuantityField.style.display = 'none';
    } else if (select.value === 'per_unit') {
        valueInput.max = '999999';
        valueInput.placeholder = 'e.g., 50';
        if (hintElement) hintElement.textContent = '₱ discount per unit (e.g., ₱50 off per kg/box)';
        if (minQuantityField) minQuantityField.style.display = 'block';
    }
}

async function createCustomPromotion() {
    // Show loading while fetching products
    showLoading();

    // Fetch products first
    let products = [];
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            products = data.products || [];
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }

    hideLoading();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    const today = new Date();
    const defaultEndDate = new Date(today);
    defaultEndDate.setDate(today.getDate() + 30);

    // Build product options HTML
    let productOptionsHTML = '<option value="all">All Products (Cart-wide discount)</option>';
    products.forEach(product => {
        const stockInfo = product.stock ? `Stock: ${product.stock}` : 'Out of Stock';
        const productText = `${product.name} (${stockInfo}) - ₱${product.price.toFixed(2)}`;
        productOptionsHTML += `<option value="${product._id}">${productText}</option>`;
    });

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h3><i class="fas fa-ticket-alt"></i> Create Custom Promotion</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="customPromoForm">
                    <div class="form-group">
                        <label>Promotion Name *</label>
                        <input type="text" name="name" class="form-input" placeholder="e.g., Summer Sale 2024" required>
                    </div>

                    <div class="form-group">
                        <label>Coupon Code *</label>
                        <input type="text" name="couponCode" class="form-input" 
                            placeholder="e.g., SUMMER2024" 
                            style="text-transform: uppercase;"
                            pattern="[A-Za-z0-9]+"
                            title="Only letters and numbers allowed (no spaces or special characters)"
                            required
                            oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '')">
                        <small style="color: var(--text-muted);">Customers will use this code at checkout (letters and numbers only)</small>
                    </div>

                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" class="form-input" rows="2" 
                            placeholder="Describe your promotion..."></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Discount Type *</label>
                            <select name="discountType" class="form-input" onchange="toggleDiscountInput(this)" required>
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed_amount">Fixed Amount (₱)</option>
                                <option value="per_unit">Per Unit Discount (₱)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Discount Value *</label>
                            <input type="number" name="discountValue" class="form-input" 
                                min="1" max="100" step="0.01" placeholder="e.g., 15" required>
                            <small id="discountHint" style="color: var(--text-muted);">Maximum 100%</small>
                        </div>
                    </div>

                    <div class="form-group" id="customPromoMinQuantityField" style="display: none;">
                        <label>Minimum Quantity Required (Optional)</label>
                        <input type="number" name="minQuantityForDiscount" class="form-input" 
                            min="1" placeholder="e.g., 10" step="1">
                        <small style="color: var(--text-muted);">Customer must buy at least this many units to get the per-unit discount (e.g., "Buy 10+ units, get ₱30 off per unit")</small>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Start Date *</label>
                            <input type="date" name="startDate" class="form-input" 
                                value="${today.toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label>End Date *</label>
                            <input type="date" name="endDate" class="form-input" 
                                value="${defaultEndDate.toISOString().split('T')[0]}" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Apply to Product (Optional)</label>
                        <select name="productId" class="form-input">
                            ${productOptionsHTML}
                        </select>
                        <small style="color: var(--text-muted);">Select a specific product or leave as "All Products" to apply discount to entire cart</small>
                    </div>

                    <div class="form-group">
                        <label>Minimum Purchase Amount (Optional)</label>
                        <input type="number" name="minPurchase" class="form-input" 
                            min="0" step="0.01" placeholder="e.g., 1000">
                        <small style="color: var(--text-muted);">Minimum cart value required to use this coupon</small>
                    </div>

                    <div class="form-group">
                        <label>Usage Limit (Optional)</label>
                        <input type="number" name="usageLimit" class="form-input" 
                            min="1" placeholder="Leave empty for unlimited">
                        <small style="color: var(--text-muted);">Maximum number of times this coupon can be used</small>
                    </div>

                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" name="isActive" checked>
                            <span>Active (Available for use immediately)</span>
                        </label>
                    </div>

                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-plus"></i> Create Promotion
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#customPromoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Get selected product
        const selectedProduct = formData.get('productId');
        const applyToAllProducts = !selectedProduct || selectedProduct === 'all';

        // Get discount type and min quantity
        const discountType = formData.get('discountType');
        const minQuantityForDiscount = formData.get('minQuantityForDiscount');

        // For per_unit discount, use the custom min quantity if provided
        const minQuantity = (discountType === 'per_unit' && minQuantityForDiscount)
            ? parseInt(minQuantityForDiscount)
            : 1;

        const promoData = {
            name: formData.get('name'),
            description: formData.get('description') || '',
            category: 'special',
            couponCode: formData.get('couponCode').toUpperCase(),
            discount: {
                type: discountType,
                value: parseFloat(formData.get('discountValue'))
            },
            validity: {
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate')
            },
            rules: {
                minAmount: parseFloat(formData.get('minPurchase')) || 0,
                minQuantity: minQuantity,
                products: applyToAllProducts ? [] : [selectedProduct],
                customerTypes: ['all']
            },
            limits: {
                totalUses: formData.get('usageLimit') ? parseInt(formData.get('usageLimit')) : null,
                perCustomer: 1
            },
            status: formData.get('isActive') ? 'active' : 'draft',
            autoApply: false, // Requires coupon code
            isStackable: false,
            priority: 0
        };

        try {
            showLoading();
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/promotions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(promoData)
            });

            hideLoading();

            if (response.ok) {
                modal.remove();
                showToast('Promotion created successfully!', 'success');
                loadPromotions(); // Refresh the promotions list
            } else {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to create promotion', 'error');
            }
        } catch (error) {
            hideLoading();
            console.error('Error creating promotion:', error);
            showToast('Failed to create promotion - server error', 'error');
        }
    });
}

// Helper function to toggle discount input based on type
function toggleDiscountInput(select) {
    const hintElement = document.getElementById('discountHint');
    const valueInput = select.closest('.form-row').querySelector('[name="discountValue"]');
    const minQuantityField = document.getElementById('customPromoMinQuantityField');

    if (select.value === 'percentage') {
        valueInput.max = '100';
        valueInput.placeholder = 'e.g., 15';
        hintElement.textContent = 'Maximum 100%';
        if (minQuantityField) minQuantityField.style.display = 'none';
    } else if (select.value === 'per_unit') {
        valueInput.max = '999999';
        valueInput.placeholder = 'e.g., 50';
        hintElement.textContent = '₱ discount per unit (e.g., ₱50 off per kg/box)';
        if (minQuantityField) minQuantityField.style.display = 'block';
    } else {
        valueInput.max = '999999';
        valueInput.placeholder = 'e.g., 100';
        hintElement.textContent = 'Fixed amount in ₱';
        if (minQuantityField) minQuantityField.style.display = 'none';
    }
}

// Load promotions
async function loadPromotions() {
    const token = localStorage.getItem('token');

    try {
        showLoading();
        console.log('Loading promotions from:', `${API_BASE_URL}/promotions`);

        const response = await fetch(`${API_BASE_URL}/promotions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Promotions response status:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('Promotions data received:', result);

            // Handle different response formats
            let promotions = [];
            if (Array.isArray(result)) {
                promotions = result;
            } else if (result.data && Array.isArray(result.data)) {
                promotions = result.data;
            } else if (result.promotions && Array.isArray(result.promotions)) {
                promotions = result.promotions;
            }

            console.log('Processed promotions:', promotions);

            // Separate current, scheduled, and expired promotions
            const now = new Date();

            // Current promotions: active or paused, within date range
            const current = promotions.filter(p => {
                const startDate = new Date(p.validity.startDate);
                const endDate = new Date(p.validity.endDate);
                const isWithinDateRange = startDate <= now && endDate >= now;
                const isCurrentStatus = p.status === 'active' || p.status === 'paused';
                return isCurrentStatus && isWithinDateRange;
            });

            // Scheduled & Expired: future or past promotions
            const scheduledOrExpired = promotions.filter(p => {
                const startDate = new Date(p.validity.startDate);
                const endDate = new Date(p.validity.endDate);
                const isScheduled = startDate > now;
                const isExpired = endDate < now;
                return isScheduled || isExpired || p.status === 'expired' || p.status === 'draft';
            });

            // Count only truly active promotions for stats
            const activeCount = current.filter(p => p.status === 'active').length;

            console.log('Current promotions (active + paused):', current.length);
            console.log('Scheduled/Expired promotions:', scheduledOrExpired.length);
            console.log('Active count:', activeCount);

            // Update stats
            const activeCountEl = document.getElementById('activePromosCount');
            const totalDiscountEl = document.getElementById('totalDiscountGiven');

            if (activeCountEl) activeCountEl.textContent = activeCount;

            // Calculate total discount given (only from active promotions)
            const totalDiscount = current.filter(p => p.status === 'active').reduce((sum, p) => {
                const value = p.discount?.value || 0;
                return sum + (value * 100);
            }, 0);

            if (totalDiscountEl) totalDiscountEl.textContent = `₱${totalDiscount.toLocaleString()}`;

            // Update lists - show current promotions (active + paused) in main section
            renderPromotionsList(current, 'overviewPromotionsList'); // Overview section
            renderPromotionsList(current, 'activePromotionsList'); // Promotions tab (renamed but shows current)
            renderPromotionsList(scheduledOrExpired, 'scheduledExpiredPromotionsList', true);

            hideLoading();
            showToast(`Loaded ${promotions.length} promotion(s)`, 'success');
        } else {
            const errorText = await response.text();
            console.error('Failed to load promotions:', response.status, errorText);
            hideLoading();
            showToast(`Failed to load promotions (${response.status})`, 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error loading promotions:', error);
        showToast('Failed to load promotions - ' + error.message, 'error');
    }
}

function renderPromotionsList(promotions, containerId, isInactive = false) {
    const container = document.getElementById(containerId);
    console.log('renderPromotionsList called:', { containerId, promotions: promotions.length, container: !!container });

    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }

    if (!promotions || promotions.length === 0) {
        console.log('No promotions to display');
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
                <i class="fas ${isInactive ? 'fa-clock' : 'fa-tags'}" style="font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem;"></i>
                <p>${isInactive ? 'No scheduled or expired promotions' : 'No active promotions. Create one to get started!'}</p>
            </div>
        `;
        return;
    }

    console.log('Rendering', promotions.length, 'promotion(s)');

    try {
        const html = promotions.map(promo => {
            console.log('Rendering promo:', promo.name, promo);
            const now = new Date();
            const startDate = new Date(promo.validity.startDate);
            const endDate = new Date(promo.validity.endDate);
            const isActive = promo.status === 'active';
            const isExpired = endDate < now;
            const isScheduled = startDate > now;
            const statusColor = isExpired ? 'var(--error)' : isScheduled ? 'var(--warning)' : isActive ? 'var(--success)' : 'var(--text-muted)';
            const statusText = isExpired ? 'Expired' : isScheduled ? 'Scheduled' : isActive ? 'Active' : 'Inactive';

            return `
                <div class="card" style="margin-bottom: 1rem; border-left: 4px solid ${statusColor};">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                                <h4 style="margin: 0;">${promo.name || promo.title || 'Promotion'}</h4>
                                <span style="padding: 0.25rem 0.75rem; background: ${statusColor}; color: white; border-radius: 1rem; font-size: 0.75rem; font-weight: bold;">
                                    ${statusText}
                                </span>
                            </div>
                            <p style="color: var(--text-muted); margin: 0.5rem 0; font-size: 0.9rem;">
                                ${promo.description || 'No description'}
                            </p>
                            <div style="display: flex; gap: 2rem; margin-top: 1rem; font-size: 0.875rem;">
                                <div>
                                    <span style="color: var(--text-muted);">Discount:</span>
                                    <strong style="color: var(--success); margin-left: 0.5rem;">
                                        ${promo.discount?.type === 'percentage' ? `${promo.discount.value}%` : `₱${promo.discount?.value || 0}`}
                                    </strong>
                                </div>
                                <div>
                                    <span style="color: var(--text-muted);">Valid:</span>
                                    <strong style="margin-left: 0.5rem;">
                                        ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
                                    </strong>
                                </div>
                                ${promo.rules?.minAmount ? `
                                    <div>
                                        <span style="color: var(--text-muted);">Min Order:</span>
                                        <strong style="margin-left: 0.5rem;">₱${promo.rules.minAmount}</strong>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            ${!isExpired && !isScheduled && isActive ? `
                                <button class="btn btn-secondary" onclick="togglePromotion('${promo._id}', false)" style="padding: 0.5rem 1rem;">
                                    <i class="fas fa-pause"></i>
                                </button>
                            ` : !isExpired && !isScheduled ? `
                                <button class="btn btn-success" onclick="togglePromotion('${promo._id}', true)" style="padding: 0.5rem 1rem;">
                                    <i class="fas fa-play"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-error" onclick="deletePromotion('${promo._id}')" style="padding: 0.5rem 1rem;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        console.log('Setting innerHTML, length:', html.length);
        container.innerHTML = html;
        console.log('Render complete!');
    } catch (error) {
        console.error('Error rendering promotions:', error);
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--error);">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                <p>Error displaying promotions</p>
            </div>
        `;
    }
}

async function togglePromotion(promoId, activate) {
    const token = localStorage.getItem('token');

    try {
        showLoading();
        console.log('Toggling promotion:', promoId, 'to', activate ? 'active' : 'paused');

        const response = await fetch(`${API_BASE_URL}/promotions/${promoId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: activate ? 'active' : 'paused' })
        });

        const result = await response.json();
        console.log('Toggle response:', result);

        hideLoading();

        if (response.ok) {
            showToast(`Promotion ${activate ? 'activated' : 'paused'} successfully!`, 'success');
            // Reload promotions to reflect the change
            await loadPromotions();
        } else {
            console.error('Failed to toggle promotion:', result);
            showToast(result.message || 'Failed to update promotion', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error toggling promotion:', error);
        showToast('Failed to update promotion', 'error');
    }
}

function deletePromotion(promoId) {
    showConfirmDialog({
        title: 'Delete Promotion',
        message: 'Are you sure you want to delete this promotion? This action cannot be undone and will permanently remove the promotion from the system.',
        icon: 'trash-alt',
        iconColor: 'var(--error)',
        confirmText: 'Yes, Delete Promotion',
        confirmColor: 'var(--error)',
        onConfirm: async () => {
            const token = localStorage.getItem('token');

            try {
                showLoading();
                const response = await fetch(`${API_BASE_URL}/promotions/${promoId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                hideLoading();

                if (response.ok) {
                    showToast('Promotion deleted successfully!', 'success');
                    loadPromotions();
                } else {
                    showToast('Failed to delete promotion', 'error');
                }
            } catch (error) {
                hideLoading();
                console.error('Error deleting promotion:', error);
                showToast('Failed to delete promotion', 'error');
            }
        }
    });
}

// Quick create functions
function createClearanceSale() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7); // 1 week sale

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-fire"></i> Create Clearance Sale</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="clearancePromoForm">
                    <div class="form-group">
                        <label>Promotion Name</label>
                        <input type="text" name="name" class="form-input" value="Clearance Sale" required>
                    </div>
                    <div class="form-group">
                        <label>Discount Percentage</label>
                        <input type="number" name="discount" class="form-input" min="10" max="70" value="30" required>
                        <small style="color: var(--text-muted);">Recommended: 25-50% for clearance</small>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Start Date</label>
                            <input type="date" name="startDate" class="form-input" value="${today.toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label>End Date</label>
                            <input type="date" name="endDate" class="form-input" value="${endDate.toISOString().split('T')[0]}" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" class="form-input" rows="2" placeholder="Clear out inventory with amazing discounts!">Clearance sale - Limited time offer on selected items!</textarea>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" class="btn btn-warning" style="flex: 1;">
                            <i class="fas fa-check"></i> Create Sale
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#clearancePromoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const promoData = {
            name: formData.get('name'),
            type: 'clearance',
            description: formData.get('description'),
            discount: {
                type: 'percentage',
                value: parseFloat(formData.get('discount'))
            },
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            isActive: true
        };

        await createPromotion(promoData, modal, 'Clearance sale created successfully!');
    });
}

function createBulkDiscount() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30); // 1 month

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-boxes"></i> Create Bulk Discount</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="bulkPromoForm">
                    <div class="form-group">
                        <label>Promotion Name</label>
                        <input type="text" name="name" class="form-input" value="Bulk Purchase Discount" required>
                    </div>
                    <div class="form-group">
                        <label>Discount Percentage</label>
                        <input type="number" name="discount" class="form-input" min="5" max="30" value="10" required>
                        <small style="color: var(--text-muted);">Recommended: 10-20% for bulk orders</small>
                    </div>
                    <div class="form-group">
                        <label>Minimum Order Amount (₱)</label>
                        <input type="number" name="minPurchase" class="form-input" min="500" step="100" value="2000" required>
                        <small style="color: var(--text-muted);">Minimum purchase to qualify for discount</small>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Start Date</label>
                            <input type="date" name="startDate" class="form-input" value="${today.toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label>End Date</label>
                            <input type="date" name="endDate" class="form-input" value="${endDate.toISOString().split('T')[0]}" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" class="form-input" rows="2" placeholder="Save more when you buy in bulk!">Get discount on bulk purchases - Perfect for businesses and restaurants!</textarea>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" class="btn btn-info" style="flex: 1;">
                            <i class="fas fa-check"></i> Create Discount
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#bulkPromoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const promoData = {
            name: formData.get('name'),
            type: 'bulk_discount',
            description: formData.get('description'),
            discount: {
                type: 'percentage',
                value: parseFloat(formData.get('discount'))
            },
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            conditions: {
                minOrderAmount: parseFloat(formData.get('minPurchase'))
            },
            isActive: true
        };

        await createPromotion(promoData, modal, 'Bulk discount created successfully!');
    });
}

function createVIPOffer() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 14); // 2 weeks

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-crown"></i> Create VIP Offer</h3>
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="vipPromoForm">
                    <div class="form-group">
                        <label>Promotion Name</label>
                        <input type="text" name="name" class="form-input" value="VIP Exclusive Offer" required>
                    </div>
                    <div class="form-group">
                        <label>Discount Percentage</label>
                        <input type="number" name="discount" class="form-input" min="10" max="40" value="20" required>
                        <small style="color: var(--text-muted);">Recommended: 15-25% for VIP customers</small>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Start Date</label>
                            <input type="date" name="startDate" class="form-input" value="${today.toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label>End Date</label>
                            <input type="date" name="endDate" class="form-input" value="${endDate.toISOString().split('T')[0]}" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Minimum Purchase (Optional)</label>
                        <input type="number" name="minPurchase" class="form-input" min="0" step="100" placeholder="e.g., 1000">
                        <small style="color: var(--text-muted);">Leave empty for no minimum</small>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" class="form-input" rows="2" placeholder="Exclusive offer for our valued VIP customers!">VIP exclusive discount - Thank you for your loyalty!</textarea>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" class="btn btn-dark" style="flex: 1;">
                            <i class="fas fa-check"></i> Create Offer
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#vipPromoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const promoData = {
            name: formData.get('name'),
            type: 'seasonal',
            description: formData.get('description'),
            discount: {
                type: 'percentage',
                value: parseFloat(formData.get('discount'))
            },
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            conditions: {
                minOrderAmount: parseFloat(formData.get('minPurchase')) || 0,
                customerType: 'vip'
            },
            isActive: true
        };

        await createPromotion(promoData, modal, 'VIP offer created successfully!');
    });
}

// Helper function to create promotion
async function createPromotion(promoData, modal, successMessage) {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/promotions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(promoData)
        });

        hideLoading();
        modal.remove();

        if (response.ok) {
            showToast(successMessage, 'success');
            // Reload promotions if on promotions tab
            if (document.getElementById('promotionsSection').classList.contains('active')) {
                loadPromotions();
            }
            // Reload dashboard data to update overview
            loadDashboardData();
        } else {
            const errorData = await response.json();
            showToast(errorData.message || 'Failed to create promotion', 'error');
        }
    } catch (error) {
        hideLoading();
        modal.remove();
        console.error('Error creating promotion:', error);
        showToast('Failed to create promotion. Please try again.', 'error');
    }
}

function createBulkDiscountPromotion() {
    switchTab('promotions');
    setTimeout(() => {
        switchTab('promotions');
    }, 1000);
}

// Product Analytics Functions
function viewProductAnalytics(productId) {
    showToast('Product analytics feature coming soon!', 'info');
    // TODO: Implement product-specific analytics
}

// New functions for modern UI
function showLandingPage() {
    document.getElementById('landingPage').classList.add('active');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').classList.remove('active');
    document.body.classList.remove('modal-open');
}

function scrollToFeatures() {
    document.getElementById('featuresSection').scrollIntoView({
        behavior: 'smooth'
    });
}

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    const isVisible = menu.style.display === 'block';
    menu.style.display = isVisible ? 'none' : 'block';

    // Close menu when clicking outside
    if (!isVisible) {
        document.addEventListener('click', function closeMenu(e) {
            if (!e.target.closest('.user-profile')) {
                menu.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            }
        });
    }
}

function updateUserAvatar() {
    if (currentUser) {
        // Update initials
        const initialsElement = document.getElementById('userInitials');
        if (initialsElement) {
            const name = currentUser.business_name || currentUser.username || 'User';
            const initials = name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
            initialsElement.textContent = initials;
        }

        // Update username display
        const usernameElement = document.getElementById('userDisplayName');
        if (usernameElement) {
            usernameElement.textContent = currentUser.business_name || currentUser.username || 'User';
        }

        // Update role badge color and text based on role
        const roleBadge = document.getElementById('userRole');
        if (roleBadge && currentUser.role) {
            const role = currentUser.role.toLowerCase();
            roleBadge.className = `role-badge role-${role}`;
            roleBadge.textContent = currentUser.role.toUpperCase();
        }

        // Load user-specific profile picture
        loadUserProfilePicture();
    }
}

// ===== ENHANCED TRANSACTION MANAGEMENT FUNCTIONS =====

// Calculate transaction summary
function calculateTransactionSummary(transactions) {
    const summary = {
        totalEarnings: 0,
        pendingPayouts: 0,
        refunds: 0,
        totalFees: 0,
        totalDiscounts: 0,
        completedTransactions: 0,
        pendingTransactions: 0,
        failedTransactions: 0
    };

    transactions.forEach(transaction => {
        const amount = transaction.amount || transaction.totalAmount || 0;
        const netAmount = transaction.netAmount || (amount - (transaction.fee || 0));
        const paymentMethod = transaction.payment?.method || transaction.paymentMethod || 'cod';
        const paymentStatus = transaction.payment?.status || 'pending';
        const orderStatus = transaction.status;

        // Add discount to total (from all orders, not just completed)
        const discount = parseFloat(transaction.totalDiscount || transaction.discount || 0);
        if (discount > 0) {
            summary.totalDiscounts += discount;
        }

        // Determine if payment should be counted as earnings
        let isEarned = false;

        if (orderStatus === 'completed' || orderStatus === 'delivered') {
            // COD: Only count as earned when delivered (payment collected)
            if (paymentMethod === 'cod') {
                isEarned = (orderStatus === 'delivered');
            }
            // GCash/Bank: Count as earned when payment is verified OR order is delivered
            else if (paymentMethod === 'gcash' || paymentMethod === 'bank_transfer' || paymentMethod === 'bank') {
                isEarned = (paymentStatus === 'verified' || orderStatus === 'delivered');
            }
            // Other payment methods: count as earned when completed/delivered
            else {
                isEarned = true;
            }
        }

        if (isEarned) {
            if (transaction.type === 'sale' || !transaction.type) {
                summary.totalEarnings += netAmount;
                summary.completedTransactions++;
                summary.totalFees += (transaction.fee || 0);
            } else if (transaction.type === 'refund') {
                summary.refunds += Math.abs(amount);
            } else if (transaction.type === 'fee') {
                summary.totalFees += amount;
            }
        } else if (orderStatus === 'refunded') {
            // Handle refunded transactions
            summary.refunds += Math.abs(amount);
        } else if (orderStatus === 'pending' || orderStatus === 'confirmed' || orderStatus === 'packed' || orderStatus === 'shipped') {
            // Pending payouts: orders that are in progress but payment not yet earned
            summary.pendingPayouts += netAmount;
            summary.pendingTransactions++;
        } else if (orderStatus === 'failed' || orderStatus === 'cancelled') {
            summary.failedTransactions++;
        }
    });

    return summary;
}

// Render transaction summary widgets
function renderTransactionSummary(summary) {
    const summaryContainer = document.getElementById('transactionSummary');
    if (!summaryContainer) {
        return;
    }

    // Ensure all values are numbers and not undefined
    const safeSum = {
        totalEarnings: Number(summary.totalEarnings || 0),
        pendingPayouts: Number(summary.pendingPayouts || 0),
        refunds: Number(summary.refunds || 0),
        totalFees: Number(summary.totalFees || 0),
        completedTransactions: Number(summary.completedTransactions || 0),
        pendingTransactions: Number(summary.pendingTransactions || 0),
        failedTransactions: Number(summary.failedTransactions || 0)
    };

    summaryContainer.innerHTML = `
        <div class="card" style="background: linear-gradient(135deg, var(--success), #28a745);">
            <div style="color: white;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <i class="fas fa-money-bill-wave" style="font-size: 1.5rem;"></i>
                    <h4 style="margin: 0;">Total Earnings</h4>
                </div>
                <div style="font-size: 2rem; font-weight: bold;">₱${safeSum.totalEarnings.toLocaleString()}</div>
                <div style="opacity: 0.9; font-size: 0.9rem;">${safeSum.completedTransactions} completed transactions</div>
            </div>
        </div>
        <div class="card" style="background: linear-gradient(135deg, var(--warning), #ffc107);">
            <div style="color: white;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <i class="fas fa-clock" style="font-size: 1.5rem;"></i>
                    <h4 style="margin: 0;">Pending Payouts</h4>
                </div>
                <div style="font-size: 2rem; font-weight: bold;">₱${safeSum.pendingPayouts.toLocaleString()}</div>
                <div style="opacity: 0.9; font-size: 0.9rem;">${safeSum.pendingTransactions} pending transactions</div>
            </div>
        </div>
        <div class="card refunds-widget" style="background: linear-gradient(135deg, #ef4444, #dc3545) !important; color: white !important;">
            <div style="color: white !important;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <i class="fas fa-undo" style="font-size: 1.5rem; color: white !important;"></i>
                    <h4 style="margin: 0; color: white !important;">Refunds</h4>
                </div>
                <div style="font-size: 2rem; font-weight: bold; color: white !important;">₱${safeSum.refunds.toLocaleString()}</div>
                <div style="opacity: 0.9; font-size: 0.9rem; color: white !important;">Total refunded amount</div>
            </div>
        </div>
        <div class="card" style="background: linear-gradient(135deg, var(--info), #17a2b8);">
            <div style="color: white;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <i class="fas fa-receipt" style="font-size: 1.5rem;"></i>
                    <h4 style="margin: 0;">Platform Fees</h4>
                </div>
                <div style="font-size: 2rem; font-weight: bold;">₱${safeSum.totalFees.toLocaleString()}</div>
                <div style="opacity: 0.9; font-size: 0.9rem;">Total fees charged</div>
            </div>
        </div>
    `;
}

// Render enhanced transactions list (mirroring Order Management design)
function renderEnhancedTransactionsList(transactions, pagination, userRole = 'admin') {
    const list = document.getElementById('transactionsList');
    if (!list) return;

    if (transactions.length === 0) {
        list.innerHTML = '<div class="card" style="padding: 2rem; text-align: center; color: var(--text-muted);"><i class="fas fa-file-invoice-dollar" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i><h3>No transactions found</h3><p>Try adjusting your filters or check back later.</p></div>';
        return;
    }

    list.innerHTML = transactions.map(transaction => `
        <div class="card" style="margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h3 style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <i class="fas fa-receipt"></i>
                        ${transaction.id || transaction._id}
                        ${transaction.orderId ? `<span style="color: var(--text-muted); font-size: 0.9rem;">(${transaction.orderId})</span>` : ''}
                    </h3>
                    <p style="color: var(--text-muted); margin: 0;">${formatTransactionDate(transaction.date || transaction.createdAt)}</p>
                </div>
                <span class="badge ${getTransactionStatusBadge(transaction.status)}" style="padding: 0.5rem 1rem;">
                    ${(transaction.status || 'pending').toUpperCase()}
                </span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                <div>
                    <h4 style="margin-bottom: 0.5rem; color: var(--text-muted);">Transaction Details</h4>
                    <p><strong>Type:</strong> ${(transaction.type || 'sale').charAt(0).toUpperCase() + (transaction.type || 'sale').slice(1)}</p>
                    <p><strong>Payment:</strong> ${formatPaymentMethod(transaction.paymentMethod)}</p>
                    <p><strong>Reference:</strong> ${transaction.reference || transaction.paymentReference || 'N/A'}</p>
                </div>
                <div>
                    <h4 style="margin-bottom: 0.5rem; color: var(--text-muted);">Customer Information</h4>
                    <p><strong>${transaction.customer || transaction.customerName || transaction.userId?.business_name || 'Unknown Customer'}</strong></p>
                    ${transaction.customerEmail || transaction.userId?.email ? `<p>${transaction.customerEmail || transaction.userId?.email}</p>` : ''}
                    ${transaction.type === 'fee' ? '<p style="color: var(--text-muted);">System Transaction</p>' : ''}
                </div>
                <div>
                    <h4 style="margin-bottom: 0.5rem; color: var(--text-muted);">Financial Summary</h4>
                    <p><strong>Amount:</strong> ₱${(transaction.amount || transaction.totalAmount || 0).toLocaleString()}</p>
                    <p><strong>Fee:</strong> ₱${(transaction.fee || transaction.processingFee || 0).toLocaleString()}</p>
                    <p><strong>Net Amount:</strong> <span style="color: ${(transaction.netAmount || (transaction.amount - (transaction.fee || 0))) >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: bold;">₱${(transaction.netAmount || (transaction.amount - (transaction.fee || 0)) || 0).toLocaleString()}</span></p>
                </div>
            </div>

            ${transaction.items && transaction.items.length > 0 ? `
                <div>
                    <h4 style="margin-bottom: 1rem; color: var(--text-muted);">Transaction Items</h4>
                    <div style="display: grid; gap: 0.5rem;">
                        ${transaction.items.map(item => {
                            const itemPrice = parseFloat(item.price || item.product?.price || 0);
                            const itemQuantity = parseInt(item.quantity || 0);
                            const itemTotal = itemPrice * itemQuantity;
                            return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-secondary); border-radius: 4px;">
                                <span><strong>${item.name || 'Unknown Product'}</strong> × ${itemQuantity}</span>
                                <span style="font-weight: bold;">₱${itemTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary btn-sm" onclick="viewTransactionDetails('${transaction.id}')" title="View full details">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    ${transaction.orderId ? `
                        <button class="btn btn-secondary btn-sm" onclick="trackOrder('${transaction.orderId}')" title="Track related order">
                            <i class="fas fa-truck"></i> Track Order
                        </button>
                    ` : ''}
                    ${transaction.status === 'completed' && transaction.type === 'sale' && (userRole === 'admin' || userRole === 'staff') ? `
                        <button class="btn btn-secondary btn-sm" onclick="initiateRefund('${transaction.id}')" title="Process refund">
                            <i class="fas fa-undo"></i> Refund
                        </button>
                    ` : ''}
                </div>
                <div style="color: var(--text-muted); font-size: 0.9rem;">
                    <i class="fas fa-clock"></i> ${formatTransactionTime(transaction.date)}
                </div>
            </div>
        </div>
    `).join('') + (pagination ? `
        <div style="display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem;">
            <button class="btn btn-secondary" onclick="loadTransactions({...getCurrentTransactionFilters(), page: ${pagination.currentPage - 1}})" 
                ${pagination.currentPage <= 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Previous
            </button>
            <span>Page ${pagination.currentPage} of ${pagination.totalPages}</span>
            <button class="btn btn-secondary" onclick="loadTransactions({...getCurrentTransactionFilters(), page: ${pagination.currentPage + 1}})" 
                ${pagination.currentPage >= pagination.totalPages ? 'disabled' : ''}>
                Next <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div style="text-align: center; margin-top: 1rem; color: var(--text-muted);">
            Showing ${transactions.length} of ${pagination.totalTransactions} transactions
        </div>
    ` : '');
}

// Helper functions for transaction display
function getTransactionStatusBadge(status) {
    const badges = {
        completed: 'badge-success',
        pending: 'badge-warning',
        failed: 'badge-danger',
        refunded: 'badge-info',
        cancelled: 'badge-secondary'
    };
    return badges[status] || 'badge-secondary';
}

function getStatusColor(status) {
    const colors = {
        completed: 'var(--success)',
        pending: 'var(--warning)',
        failed: 'var(--error)',
        refunded: 'var(--info)',
        cancelled: 'var(--secondary)'
    };
    return colors[status] || 'var(--border)';
}

function getClientFriendlyStatus(status) {
    const statusMap = {
        completed: 'Delivered',
        pending: 'Processing',
        failed: 'Failed',
        refunded: 'Refunded',
        cancelled: 'Cancelled'
    };
    return statusMap[status] || status?.toUpperCase() || 'UNKNOWN';
}

function getPaymentIcon(method) {
    const icons = {
        gcash: 'fa-mobile-alt',
        cod: 'fa-money-bill-wave',
        bank: 'fa-university',
        card: 'fa-credit-card',
        paypal: 'fa-paypal'
    };
    return icons[method] || 'fa-credit-card';
}

function getOrderStatusMessage(status) {
    const messages = {
        completed: 'Order delivered successfully',
        pending: 'Order is being processed',
        failed: 'Order failed to process',
        refunded: 'Order has been refunded',
        cancelled: 'Order was cancelled'
    };
    return messages[status] || 'Status unknown';
}

function formatPaymentMethod(method) {
    const methods = {
        gcash: 'GCash',
        cod: 'Cash on Delivery',
        bank: 'Bank Transfer',
        card: 'Credit/Debit Card',
        paypal: 'PayPal',
        auto: 'Automatic'
    };
    return methods[method] || method.toUpperCase();
}

function formatTransactionDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTransactionTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Additional helper functions for client transaction display
function getCurrentTransactionFilters() {
    return {
        status: document.getElementById('transactionStatusFilter')?.value || undefined,
        paymentMethod: document.getElementById('transactionPaymentFilter')?.value || undefined,
        type: document.getElementById('transactionTypeFilter')?.value || undefined,
        amountRange: document.getElementById('transactionAmountFilter')?.value || undefined,
        dateFrom: document.getElementById('transactionDateFrom')?.value || undefined,
        dateTo: document.getElementById('transactionDateTo')?.value || undefined,
        search: document.getElementById('transactionSearchFilter')?.value || undefined
    };
}

// System health function (placeholder)
function updateSystemHealth() {
    // This is a placeholder function to prevent errors
    // Real implementation would check system status
    console.log('System health check - placeholder function');
}

// Safe number formatting function
function safeToLocaleString(value, defaultValue = 0) {
    const num = Number(value);
    return isNaN(num) ? defaultValue.toLocaleString() : num.toLocaleString();
}

// Safe property access for objects
function safeGet(obj, path, defaultValue = '') {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
}

// Enhanced filter functions
function getCurrentTransactionFilters() {
    return {
        status: document.getElementById('transactionStatusFilter')?.value,
        paymentMethod: document.getElementById('transactionPaymentFilter')?.value,
        type: document.getElementById('transactionTypeFilter')?.value,
        amountRange: document.getElementById('transactionAmountFilter')?.value,
        dateFrom: document.getElementById('transactionDateFrom')?.value,
        dateTo: document.getElementById('transactionDateTo')?.value,
        search: document.getElementById('transactionSearchFilter')?.value
    };
}

// Export and Print functions
async function exportTransactions() {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        const role = (currentUser?.role || 'client').toLowerCase();
        const filters = getCurrentTransactionFilters();

        // Build URL for export
        let url = `${API_BASE_URL}/transactions/export`;
        if (role === 'client') {
            url = `${API_BASE_URL}/transactions/my-transactions/export`;
        }

        // Add filters as query parameters
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) params.append(key, filters[key]);
        });
        if (params.toString()) url += '?' + params.toString();

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const transactions = data.data?.transactions || data.transactions || [];

            // Create CSV content
            const csvContent = [
                ['Transaction ID', 'Order ID', 'Customer', 'Amount', 'Status', 'Payment Method', 'Type', 'Reference', 'Date', 'Fee', 'Net Amount'].join(','),
                ...transactions.map(t => [
                    t.id || t._id,
                    t.orderId || '',
                    t.customer || t.customerName || '',
                    t.amount || 0,
                    t.status || '',
                    t.paymentMethod || '',
                    t.type || '',
                    t.reference || '',
                    new Date(t.date || t.createdAt).toLocaleDateString(),
                    t.fee || 0,
                    t.netAmount || (t.amount - (t.fee || 0))
                ].join(','))
            ].join('\\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

            showToast('Transactions exported successfully', 'success');
        } else {
            const errorData = await response.json();
            showToast(errorData.message || 'Failed to export transactions', 'error');
        }

        hideLoading();
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export transactions - connection error', 'error');
        hideLoading();
    }
}

async function printTransactions() {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        const role = (currentUser?.role || 'client').toLowerCase();
        const filters = getCurrentTransactionFilters();

        // Build URL for print data
        let url = `${API_BASE_URL}/transactions`;
        if (role === 'client') {
            url = `${API_BASE_URL}/transactions/my-transactions`;
        }

        // Add filters as query parameters
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) params.append(key, filters[key]);
        });
        if (params.toString()) url += '?' + params.toString();

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const transactions = data.data?.transactions || data.transactions || [];
            const summary = data.data?.summary || calculateTransactionSummary(transactions);

            generatePrintReport(transactions, summary);
        } else {
            showToast('Failed to load data for printing', 'error');
        }

        hideLoading();
    } catch (error) {
        console.error('Print error:', error);
        showToast('Failed to prepare print report - connection error', 'error');
        hideLoading();
    }
}

function generatePrintReport(transactions, summary) {

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Transaction Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
                .summary-card { border: 1px solid #ddd; padding: 15px; text-align: center; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .status-completed { color: green; }
                .status-pending { color: orange; }
                .status-failed { color: red; }
                .status-refunded { color: blue; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Transaction Report</h1>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="summary">
                <div class="summary-card">
                    <h3>Total Earnings</h3>
                    <p>₱${summary.totalEarnings.toLocaleString()}</p>
                </div>
                <div class="summary-card">
                    <h3>Pending Payouts</h3>
                    <p>₱${summary.pendingPayouts.toLocaleString()}</p>
                </div>
                <div class="summary-card">
                    <h3>Refunds</h3>
                    <p>₱${summary.refunds.toLocaleString()}</p>
                </div>
                <div class="summary-card">
                    <h3>Platform Fees</h3>
                    <p>₱${summary.totalFees.toLocaleString()}</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Transaction ID</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Payment Method</th>
                        <th>Date</th>
                        <th>Net Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(t => `
                        <tr>
                            <td>${t.id}</td>
                            <td>${t.customer}</td>
                            <td>₱${t.amount.toLocaleString()}</td>
                            <td class="status-${t.status}">${t.status.toUpperCase()}</td>
                            <td>${formatPaymentMethod(t.paymentMethod)}</td>
                            <td>${new Date(t.date).toLocaleDateString()}</td>
                            <td>₱${t.netAmount.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();

    showToast('Print dialog opened', 'info');
}

function refreshTransactions() {
    const filters = getCurrentTransactionFilters();
    loadTransactions(filters);
    showToast('Transactions refreshed', 'success');
}


// Transaction detail functions
async function viewTransactionDetails(transactionId) {
    try {
        showLoading();
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const transaction = data.data?.transaction || data.transaction;

            if (!transaction) {
                showToast('Transaction not found', 'error');
                hideLoading();
                return;
            }

            displayTransactionModal(transaction);
        } else {
            const errorData = await response.json();
            showToast(errorData.message || 'Failed to load transaction details', 'error');
        }

        hideLoading();
    } catch (error) {
        console.error('Transaction detail error:', error);
        showToast('Failed to load transaction details - connection error', 'error');
        hideLoading();
    }
}

function displayTransactionModal(transaction) {
    // Create detailed view modal with enhanced design
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.7); display: flex; align-items: center; 
        justify-content: center; z-index: 10000; backdrop-filter: blur(8px);
        animation: fadeIn 0.3s ease;
    `;

    const userRole = (currentUser?.role || 'client').toLowerCase();
    const isClient = userRole === 'client';
    
    // Safely get values with fallbacks
    const transactionId = transaction.id || transaction._id || 'N/A';
    const orderId = transaction.orderId || transaction.orderNumber || transactionId;
    const amount = parseFloat(transaction.amount || transaction.totalAmount || 0);
    const fee = parseFloat(transaction.fee || 0);
    const netAmount = parseFloat(transaction.netAmount || (amount - fee));
    const status = transaction.status || 'pending';
    const statusColor = getStatusColor(status);
    const customer = transaction.customer || transaction.customerName || 'Unknown';
    const customerEmail = transaction.customerEmail || transaction.email || '';
    const paymentMethod = transaction.paymentMethod || transaction.payment?.method || 'cod';
    const reference = transaction.reference || transaction.payment?.reference || 'N/A';
    const transactionDate = transaction.date || transaction.createdAt || new Date();
    const items = transaction.items || [];

    modal.innerHTML = `
        <div class="modal-content card" style="max-width: 800px; width: 92%; max-height: 85vh; overflow-y: auto; background: #ffffff; color: #1f2937; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); border-radius: 12px; animation: slideUp 0.3s ease;">
            <!-- Header -->
            <div style="background: ${statusColor}; padding: 1.5rem; color: white; position: relative; display: flex; justify-content: space-between; align-items: center; border-radius: 12px 12px 0 0;">
                <div>
                    <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 0.25rem;">
                        <i class="fas fa-receipt"></i> ${isClient ? 'Order' : 'Transaction'} #${orderId}
                    </div>
                    <h2 style="margin: 0; font-size: 1.75rem; font-weight: 700;">
                        ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                    <div style="font-size: 0.85rem; opacity: 0.95; margin-top: 0.5rem;">
                        ${status.toUpperCase()} • ${new Date(transactionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${new Date(transactionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
                <button onclick="this.closest('.modal-overlay').remove()" style="background: rgba(255,255,255,0.2); border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; color: white; font-size: 1.1rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'" title="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body" style="padding: 1.5rem; display: grid; gap: 1.25rem;">
                <!-- Customer & Payment Info Grid -->
                <div style="display: grid; grid-template-columns: ${!isClient ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr'}; gap: 1rem;">
                    ${!isClient ? `
                    <div style="background: #f8fafc; padding: 1.25rem; border-radius: 8px; border-left: 3px solid #3b82f6;">
                        <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.75rem; font-weight: 600;">
                            <i class="fas fa-user-circle"></i> Customer
                        </div>
                        <div style="font-weight: 700; color: #1e293b; margin-bottom: 0.25rem;">${customer}</div>
                        ${customerEmail ? `<div style="font-size: 0.875rem; color: #64748b;">${customerEmail}</div>` : ''}
                    </div>
                    ` : ''}
                    <div style="background: #f0fdf4; padding: 1.25rem; border-radius: 8px; border-left: 3px solid #22c55e;">
                        <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.75rem; font-weight: 600;">
                            <i class="fas fa-credit-card"></i> Payment
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <span style="color: #64748b; font-size: 0.875rem;">Method:</span>
                            <span style="font-weight: 700; color: #1e293b;">${formatPaymentMethod(paymentMethod)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-size: 0.875rem;">Reference:</span>
                            <span style="font-weight: 600; color: #475569; font-family: monospace; font-size: 0.85rem;">${reference}</span>
                        </div>
                        ${!isClient ? `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed #cbd5e1;">
                            <span style="color: #64748b; font-size: 0.875rem;">Fee:</span>
                            <span style="font-weight: 700; color: #f59e0b;">₱${fee.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5rem;">Net Amount</div>
                            <div style="font-weight: 700; color: ${netAmount >= 0 ? 'var(--success)' : 'var(--error)'}; font-size: 1.1rem;">₱${netAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Order Items -->
                ${items && items.length > 0 ? `
                <div>
                    <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.75rem; font-weight: 600;">
                        <i class="fas fa-shopping-bag"></i> Order Items (${items.length})
                    </div>
                    <div style="background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                        ${items.map((item, index) => {
                            const itemName = item.name || item.product?.name || 'Unknown Product';
                            const itemQuantity = parseInt(item.quantity) || 0;
                            const itemPrice = parseFloat(item.price || item.product?.price || 0);
                            const itemTotal = itemPrice * itemQuantity;
                            
                            return `
                            <div style="padding: 1rem; ${index > 0 ? 'border-top: 1px solid #e2e8f0;' : ''} display: flex; justify-content: space-between; align-items: center;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: #1e293b; margin-bottom: 0.25rem;">${itemName}</div>
                                    <div style="font-size: 0.875rem; color: #64748b;">
                                        <i class="fas fa-box"></i> Qty: ${itemQuantity} × ₱${itemPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div style="font-weight: 700; color: #6366f1; font-size: 1.1rem;">₱${itemTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Order Summary -->
                ${items && items.length > 0 ? `
                <div style="background: #fffbeb; padding: 1.25rem; border-radius: 8px; border-left: 3px solid #f59e0b;">
                    <div style="font-size: 0.75rem; color: #78350f; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1rem; font-weight: 600;">
                        <i class="fas fa-calculator"></i> Order Summary
                    </div>
                    <div style="display: grid; gap: 0.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-size: 0.9rem;">Subtotal</span>
                            <span style="font-weight: 600; color: #1e293b;">₱${(transaction.subtotal || items.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 0)), 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        ${transaction.totalDiscount > 0 ? `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #16a34a; font-size: 0.9rem;"><i class="fas fa-tag"></i> Discount</span>
                            <span style="font-weight: 700; color: #16a34a;">-₱${parseFloat(transaction.totalDiscount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        ` : ''}
                        ${transaction.appliedPromotions && transaction.appliedPromotions.length > 0 ? `
                        <div style="padding: 0.75rem; background: #dcfce7; border-radius: 6px; margin: 0.5rem 0;">
                            <div style="font-size: 0.8rem; font-weight: 600; color: #166534; margin-bottom: 0.5rem;">
                                <i class="fas fa-gift"></i> Promotions Applied
                            </div>
                            ${transaction.appliedPromotions.map(promo => `
                                <div style="font-size: 0.8rem; color: #166534; display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                    <span>• ${promo.name || promo.promotionName || 'Promotion'}</span>
                                    ${promo.discountAmount ? `<span style="font-weight: 700;">-₱${parseFloat(promo.discountAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                        ${transaction.platformFee > 0 ? `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-size: 0.9rem;">Platform Fee</span>
                            <span style="font-weight: 600; color: #1e293b;">₱${parseFloat(transaction.platformFee || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        ` : ''}
                        ${transaction.deliveryFee > 0 ? `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-size: 0.9rem;"><i class="fas fa-truck"></i> Delivery</span>
                            <span style="font-weight: 600; color: #1e293b;">₱${parseFloat(transaction.deliveryFee || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f59e0b; border-radius: 6px; margin-top: 0.5rem;">
                            <span style="font-weight: 700; font-size: 1.05rem; color: white;">Total</span>
                            <span style="font-weight: 800; font-size: 1.25rem; color: white;">₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        ${transaction.totalDiscount > 0 ? `
                        <div style="text-align: center; padding: 0.625rem; background: #dcfce7; border-radius: 6px; margin-top: 0.5rem;">
                            <span style="color: #166534; font-weight: 700; font-size: 0.875rem;">
                                <i class="fas fa-piggy-bank"></i> You saved ₱${parseFloat(transaction.totalDiscount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}!
                            </span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}

                <!-- Action Buttons -->
                <div class="modal-actions" style="display: flex; gap: 0.625rem; justify-content: flex-end; padding-top: 1.25rem; border-top: 1px solid #e2e8f0; flex-wrap: wrap;">
                    ${!isClient && (status === 'completed' || status === 'delivered') ? `
                        <button class="btn btn-warning" onclick="initiateRefund('${transactionId}'); this.closest('.modal-overlay').remove();" style="padding: 0.625rem 1.25rem; font-weight: 600; background: #f59e0b; border: none; color: white; border-radius: 6px; font-size: 0.875rem; transition: all 0.2s;" onmouseover="this.style.background='#d97706'" onmouseout="this.style.background='#f59e0b'" title="Process refund">
                            <i class="fas fa-undo"></i> Refund
                        </button>
                    ` : ''}
                    ${orderId && orderId !== 'N/A' ? `
                        <button class="btn btn-info" onclick="trackOrder('${orderId}'); this.closest('.modal-overlay').remove();" style="padding: 0.625rem 1.25rem; font-weight: 600; background: #3b82f6; border: none; color: white; border-radius: 6px; font-size: 0.875rem; transition: all 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'" title="Track order">
                            <i class="fas fa-truck"></i> Track
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="padding: 0.625rem 1.25rem; font-weight: 600; background: #64748b; border: none; color: white; border-radius: 6px; font-size: 0.875rem; transition: all 0.2s;" onmouseover="this.style.background='#475569'" onmouseout="this.style.background='#64748b'">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => modal.remove(), 200);
        }
    });

    // Close modal with Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => modal.remove(), 200);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Order tracking modal implementation
function showOrderTrackingModal(order) {
    // Validate order data
    if (!order) {
        showToast('Order data not available', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.6); display: flex; align-items: center; 
        justify-content: center; z-index: 10000; backdrop-filter: blur(4px);
    `;

    const orderStatus = order.status || 'pending';
    const orderNumber = order.orderNumber || order._id || 'Unknown';
    const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();

    // Use estimated delivery from backend if available, otherwise calculate
    let estimatedDelivery;
    if (order.estimatedDelivery) {
        estimatedDelivery = new Date(order.estimatedDelivery);
    } else if (order.delivery?.preferredDate) {
        estimatedDelivery = new Date(order.delivery.preferredDate);
    } else {
        // Default: 3 business days from confirmation or creation
        const confirmDate = order.confirmedAt ? new Date(order.confirmedAt) : createdAt;
        estimatedDelivery = new Date(confirmDate.getTime() + (3 * 24 * 60 * 60 * 1000));
    }

    // Calculate tracking progress
    const trackingSteps = [
        {
            key: 'pending',
            label: 'Order Placed',
            icon: 'fa-shopping-cart',
            description: 'Your order has been received and is being processed',
            completed: true,
            timestamp: order.createdAt
        },
        {
            key: 'confirmed',
            label: 'Order Confirmed',
            icon: 'fa-check-circle',
            description: 'Your order has been confirmed and is being prepared',
            completed: ['confirmed', 'shipped', 'delivered'].includes(orderStatus),
            timestamp: order.confirmedAt
        },
        {
            key: 'shipped',
            label: 'Order Shipped',
            icon: 'fa-truck',
            description: 'Your order is on its way to you',
            completed: ['shipped', 'delivered'].includes(orderStatus),
            timestamp: order.shippedAt
        },
        {
            key: 'delivered',
            label: 'Delivered',
            icon: 'fa-home',
            description: 'Your order has been delivered successfully',
            completed: orderStatus === 'delivered',
            timestamp: order.deliveredAt
        }
    ];

    const currentStepIndex = trackingSteps.findIndex(step => step.key === orderStatus);

    modal.innerHTML = `
        <div class="modal-content card" style="max-width: 800px; width: 90%; max-height: 90%; overflow-y: auto; margin: 2rem; background: var(--surface); color: var(--text);">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
                <h2 style="margin: 0; color: var(--text); display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-truck" style="color: var(--primary);"></i>
                    Track Your Order
                </h2>
                <button onclick="this.closest('.modal-overlay').remove()" class="btn-close" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); padding: 0.5rem; border-radius: var(--radius);" title="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body">
                <!-- Order Summary -->
                <div class="order-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; padding: 1.5rem; background: var(--background-alt); border-radius: var(--radius); border-left: 4px solid var(--primary);">
                    <div>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.25rem;">Order Number</div>
                        <div style="font-weight: 600; color: var(--text); font-family: monospace;">#${orderNumber}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.25rem;">Order Date</div>
                        <div style="font-weight: 500; color: var(--text);">${createdAt.toLocaleDateString()}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.25rem;">Total Amount</div>
                        <div style="font-weight: 700; font-size: 1.1rem; color: var(--primary);">₱${(order.totalAmount || 0).toFixed(2)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.25rem;">Estimated Delivery</div>
                        <div style="font-weight: 500; color: var(--text);">${estimatedDelivery.toLocaleDateString()}</div>
                    </div>
                </div>

                <!-- Tracking Timeline -->
                <div class="tracking-timeline" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1.5rem; color: var(--text); display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-route" style="color: var(--info);"></i>
                        Order Progress
                    </h3>
                    <div class="timeline" style="position: relative;">
                        ${trackingSteps.map((step, index) => `
                            <div class="timeline-item" style="display: flex; align-items: flex-start; margin-bottom: ${index === trackingSteps.length - 1 ? '0' : '2rem'}; position: relative;">
                                ${index < trackingSteps.length - 1 ? `
                                    <div class="timeline-line" style="position: absolute; left: 1.5rem; top: 3rem; width: 2px; height: 2rem; background: ${step.completed ? 'var(--success)' : 'var(--border)'};"></div>
                                ` : ''}
                                <div class="timeline-icon" style="width: 3rem; height: 3rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 1rem; flex-shrink: 0; background: ${step.completed ? 'var(--success)' : (index === currentStepIndex ? 'var(--warning)' : 'var(--border)')}; color: white;">
                                    <i class="fas ${step.icon}"></i>
                                </div>
                                <div class="timeline-content" style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                        <h4 style="margin: 0; color: var(--text); font-size: 1.1rem;">${step.label}</h4>
                                        ${step.timestamp ? `
                                            <span style="font-size: 0.875rem; color: var(--text-muted);">
                                                ${new Date(step.timestamp).toLocaleString()}
                                            </span>
                                        ` : ''}
                                    </div>
                                    <p style="margin: 0; color: var(--text-muted); font-size: 0.9rem;">${step.description}</p>
                                    ${step.completed ? `
                                        <div style="margin-top: 0.5rem;">
                                            <span class="badge badge-success" style="font-size: 0.75rem;">Completed</span>
                                        </div>
                                    ` : (index === currentStepIndex ? `
                                        <div style="margin-top: 0.5rem;">
                                            <span class="badge badge-warning" style="font-size: 0.75rem;">In Progress</span>
                                        </div>
                                    ` : '')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Order Items -->
                ${order.items && order.items.length > 0 ? `
                    <div class="order-items" style="margin-bottom: 2rem;">
                        <h3 style="margin-bottom: 1rem; color: var(--text); display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-box" style="color: var(--accent);"></i>
                            Items in this Order
                        </h3>
                        <div style="background: var(--background-alt); border-radius: var(--radius); overflow: hidden;">
                            ${order.items.map((item, index) => {
        // Get price - check multiple possible fields
        const unitPrice = item.unitPrice || item.price || 0;
        const totalPrice = item.totalPrice || (unitPrice * (item.quantity || 0));
        const itemName = item.product?.name || item.productName || item.name || 'Unknown Product';

        return `
                                <div style="padding: 1rem; ${index > 0 ? 'border-top: 1px solid var(--border);' : ''} display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-weight: 500; color: var(--text);">${itemName}</div>
                                        <div style="font-size: 0.875rem; color: var(--text-muted);">Quantity: ${item.quantity || 0}</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-weight: 600; color: var(--text);">₱${totalPrice.toFixed(2)}</div>
                                        <div style="font-size: 0.875rem; color: var(--text-muted);">₱${unitPrice.toFixed(2)} each</div>
                                    </div>
                                </div>
                                `;
    }).join('')}
                        </div>
                        
                        <!-- Order Total Breakdown -->
                        ${order.subtotal || order.totalDiscount || order.platformFee ? `
                            <div style="margin-top: 1rem; padding: 1rem; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border);">
                                ${order.subtotal ? `
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                        <span style="color: var(--text-muted);">Subtotal:</span>
                                        <span style="color: var(--text); font-weight: 500;">₱${order.subtotal.toFixed(2)}</span>
                                    </div>
                                ` : ''}
                                ${order.totalDiscount && order.totalDiscount > 0 ? `
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                        <span style="color: var(--success);">Discount:</span>
                                        <span style="color: var(--success); font-weight: 500;">-₱${order.totalDiscount.toFixed(2)}</span>
                                    </div>
                                ` : ''}
                                ${order.platformFee && order.platformFee > 0 ? `
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                        <span style="color: var(--text-muted); font-size: 0.9rem;">
                                            <i class="fas fa-shipping-fast"></i> Shipping Fee:
                                        </span>
                                        <span style="color: var(--text); font-weight: 500;">₱${order.platformFee.toFixed(2)}</span>
                                    </div>
                                ` : ''}
                                ${order.delivery?.fee && order.delivery.fee > 0 ? `
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                        <span style="color: var(--text-muted);">Delivery Fee:</span>
                                        <span style="color: var(--text); font-weight: 500;">₱${order.delivery.fee.toFixed(2)}</span>
                                    </div>
                                ` : ''}
                                <div style="display: flex; justify-content: space-between; padding-top: 0.75rem; border-top: 1px solid var(--border); margin-top: 0.5rem;">
                                    <span style="color: var(--text); font-weight: 600; font-size: 1.1rem;">Total:</span>
                                    <span style="color: var(--primary); font-weight: 700; font-size: 1.2rem;">₱${(order.totalAmount || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <!-- Delivery Information -->
                ${order.delivery?.address ? `
                    <div class="delivery-info" style="margin-bottom: 2rem;">
                        <h3 style="margin-bottom: 1rem; color: var(--text); display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-map-marker-alt" style="color: var(--error);"></i>
                            Delivery Address
                        </h3>
                        <div style="padding: 1rem; background: var(--background-alt); border-radius: var(--radius); border-left: 4px solid var(--error);">
                            <p style="margin: 0; color: var(--text); line-height: 1.5;">${order.delivery.address}</p>
                        </div>
                    </div>
                ` : ''}

                <!-- Contact Information -->
                <div class="contact-info" style="padding: 1.5rem; background: var(--background-alt); border-radius: var(--radius); border: 1px solid var(--border);">
                    <h4 style="margin-bottom: 1rem; color: var(--text);">Need Help?</h4>
                    <p style="margin-bottom: 1rem; color: var(--text-muted); font-size: 0.9rem;">
                        If you have any questions about your order, please contact our customer support team.
                    </p>
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button class="btn btn-info btn-sm" onclick="contactSupport('${orderNumber}')">
                            <i class="fas fa-phone"></i> Contact Support
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="refreshOrderTracking('${order._id || order.id}')">
                            <i class="fas fa-sync-alt"></i> Refresh Status
                        </button>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="modal-actions" style="display: flex; gap: 1rem; justify-content: flex-end; padding-top: 1.5rem; border-top: 1px solid var(--border); margin-top: 2rem;">
                    ${orderStatus === 'delivered' ? `
                        <button class="btn btn-success" onclick="reorderItems('${order._id || order.id}')" title="Order these items again">
                            <i class="fas fa-redo"></i> Reorder Items
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Close modal with Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Helper functions for order tracking
function contactSupport(orderNumber) {
    // Create support contact modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.6); display: flex; align-items: center; 
        justify-content: center; z-index: 10000; backdrop-filter: blur(4px);
    `;

    modal.innerHTML = `
        <div class="modal-content card" style="max-width: 500px; width: 90%; background: var(--surface); color: var(--text);">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
                <h3 style="margin: 0; color: var(--text); display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-headset" style="color: var(--primary);"></i>
                    Contact Support
                </h3>
                <button onclick="this.closest('.modal-overlay').remove()" class="btn-close" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 1rem; color: var(--text);">Need help with order <strong>#${orderNumber}</strong>?</p>
                <div style="display: grid; gap: 1rem;">
                    <a href="mailto:support@crisniltrading.com?subject=Order Support - ${orderNumber}" class="btn btn-primary" style="text-decoration: none;">
                        <i class="fas fa-envelope"></i> Email Support
                    </a>
                    <a href="tel:+1234567890" class="btn btn-secondary" style="text-decoration: none;">
                        <i class="fas fa-phone"></i> Call Support
                    </a>
                    <button class="btn btn-info" onclick="openLiveChat('${orderNumber}')">
                        <i class="fas fa-comments"></i> Live Chat
                    </button>
                </div>
                <div style="margin-top: 1.5rem; padding: 1rem; background: var(--background-alt); border-radius: var(--radius); font-size: 0.9rem; color: var(--text-muted);">
                    <strong>Support Hours:</strong><br>
                    Monday - Friday: 9:00 AM - 6:00 PM<br>
                    Saturday: 10:00 AM - 4:00 PM<br>
                    Sunday: Closed
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function openLiveChat(orderNumber) {
    // Open Tawk.to live chat
    if (typeof Tawk_API !== 'undefined' && Tawk_API.maximize) {
        // Maximize the chat window
        Tawk_API.maximize();

        // Add order context to the chat
        if (orderNumber) {
            Tawk_API.addEvent('order-inquiry', {
                orderNumber: orderNumber,
                timestamp: new Date().toISOString()
            }, function (error) {
                if (!error) {
                    // Optionally send a pre-filled message
                    Tawk_API.addTags(['order-inquiry'], function (error) { });
                }
            });
        }

        showToast('Opening live chat...', 'success');
    } else {
        // Fallback if Tawk.to is not loaded yet
        showToast('Live chat is loading... Please try again in a moment.', 'info');

        // Try again after 2 seconds
        setTimeout(() => {
            if (typeof Tawk_API !== 'undefined' && Tawk_API.maximize) {
                Tawk_API.maximize();
            }
        }, 2000);
    }
}

async function refreshOrderTracking(orderId) {
    showToast('Refreshing order status...', 'info');

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();

            // Close current modal
            const currentModal = document.querySelector('.modal-overlay');
            if (currentModal) currentModal.remove();

            // Show updated tracking
            showOrderTrackingModal(data.order);
            showToast('Order status updated!', 'success');
        } else {
            showToast('Failed to refresh order status', 'error');
        }
    } catch (error) {
        console.error('Error refreshing order:', error);
        showToast('Failed to refresh order status', 'error');
    }
}

async function reorderItems(transactionId) {
    try {
        showLoading();
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const transaction = data.data?.transaction || data.transaction;

            if (transaction?.items) {
                // Add items to cart
                transaction.items.forEach(item => {
                    addToCart({
                        id: item.productId || item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity
                    });
                });

                showToast(`${transaction.items.length} items added to cart!`, 'success');
                switchTab('cart');
            } else {
                showToast('No items found to reorder', 'warning');
            }
        } else {
            // Fallback to orders endpoint
            try {
                const orderResponse = await fetch(`${API_BASE_URL}/orders/${transactionId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (orderResponse.ok) {
                    const orderData = await orderResponse.json();
                    const order = orderData.order;

                    if (order?.items && order.items.length > 0) {
                        let addedCount = 0;

                        order.items.forEach(item => {
                            if (item.name && item.price) {
                                addToCart({
                                    id: item.productId || item.product?.id || item.id || `reorder-${Date.now()}-${Math.random()}`,
                                    name: item.name,
                                    price: item.price,
                                    quantity: item.quantity || 1
                                });
                                addedCount++;
                            }
                        });

                        if (addedCount > 0) {
                            showToast(`${addedCount} items added to cart!`, 'success');
                            switchTab('cart');
                        } else {
                            showToast('No valid items found to reorder', 'warning');
                        }
                    } else {
                        showToast('No items found in this order', 'warning');
                    }
                } else {
                    showToast('Failed to load order items', 'error');
                }
            } catch (orderError) {
                console.error('Order fallback error:', orderError);
                showToast('Failed to load order items', 'error');
            }
        }

        hideLoading();
    } catch (error) {
        console.error('Reorder error:', error);
        showToast('Failed to reorder items. Please try again.', 'error');
        hideLoading();
    }
}

async function initiateRefund(transactionId) {
    // Fetch transaction details first
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            showToast('Failed to fetch transaction details', 'error');
            return;
        }

        const data = await response.json();
        const transaction = data.data.transaction;

        // Show refund modal
        showRefundModal(transaction);
    } catch (error) {
        console.error('Error fetching transaction:', error);
        showToast('Failed to load transaction details', 'error');
    }
}

function showRefundModal(transaction) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3><i class="fas fa-undo"></i> Process Refund</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0; color: #92400e;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Warning:</strong> This action cannot be undone. Please verify all details before processing.
                    </p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Transaction Details</label>
                    <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
                        <p style="margin: 5px 0;"><strong>Order ID:</strong> ${transaction.orderId}</p>
                        <p style="margin: 5px 0;"><strong>Customer:</strong> ${transaction.customer}</p>
                        <p style="margin: 5px 0;"><strong>Amount:</strong> ₱${transaction.amount.toFixed(2)}</p>
                        <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${transaction.paymentMethod}</p>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Refund Type</label>
                    <select id="refundType" class="form-input" onchange="togglePartialRefundAmount()">
                        <option value="full">Full Refund (₱${transaction.amount.toFixed(2)})</option>
                        <option value="partial">Partial Refund</option>
                    </select>
                </div>
                
                <div class="form-group" id="partialAmountGroup" style="display: none;">
                    <label class="form-label">Refund Amount</label>
                    <input type="number" id="refundAmount" class="form-input" 
                           min="0" max="${transaction.amount}" step="0.01" 
                           placeholder="Enter refund amount">
                    <small style="color: #64748b;">Maximum: ₱${transaction.amount.toFixed(2)}</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Refund Reason <span style="color: red;">*</span></label>
                    <textarea id="refundReason" class="form-input" rows="3" 
                              placeholder="Enter reason for refund (required)" required></textarea>
                </div>
                
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="restoreStock" checked>
                        <span>Restore product stock (only for full refunds)</span>
                    </label>
                    <small style="color: #64748b; display: block; margin-top: 5px;">
                        If checked, product quantities will be added back to inventory
                    </small>
                </div>
                
                <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #0891b2;">
                    <h4 style="margin: 0 0 10px 0; color: #0c4a6e;">
                        <i class="fas fa-info-circle"></i> What happens next?
                    </h4>
                    <ul style="margin: 0; padding-left: 20px; color: #0c4a6e;">
                        <li>Transaction status will be updated to "Refunded"</li>
                        <li>Customer will receive an email notification</li>
                        <li>Refund will be processed within 5-10 business days</li>
                        <li>Stock will be restored (if selected)</li>
                    </ul>
                </div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem;">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button class="btn btn-danger" onclick="processRefund('${transaction.id}'); this.closest('.modal').remove();">
                    <i class="fas fa-check"></i> Process Refund
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function togglePartialRefundAmount() {
    const refundType = document.getElementById('refundType').value;
    const partialAmountGroup = document.getElementById('partialAmountGroup');
    const restoreStockCheckbox = document.getElementById('restoreStock');

    if (refundType === 'partial') {
        partialAmountGroup.style.display = 'block';
        restoreStockCheckbox.checked = false;
        restoreStockCheckbox.disabled = true;
    } else {
        partialAmountGroup.style.display = 'none';
        restoreStockCheckbox.disabled = false;
    }
}

async function processRefund(transactionId) {
    const refundType = document.getElementById('refundType').value;
    const refundReason = document.getElementById('refundReason').value.trim();
    const restoreStock = document.getElementById('restoreStock').checked;

    // Validation
    if (!refundReason) {
        showToast('Please provide a reason for the refund', 'error');
        return;
    }

    let refundAmount = null;
    if (refundType === 'partial') {
        refundAmount = parseFloat(document.getElementById('refundAmount').value);
        if (!refundAmount || refundAmount <= 0) {
            showToast('Please enter a valid refund amount', 'error');
            return;
        }
    }

    try {
        showLoading();
        const token = localStorage.getItem('token');

        const requestBody = {
            reason: refundReason,
            refundType: refundType,
            restoreStock: restoreStock
        };

        if (refundType === 'partial') {
            requestBody.amount = refundAmount;
        }

        const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}/refund`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (response.ok) {
            showToast(`Refund processed successfully! Amount: ₱${data.data.refundAmount.toFixed(2)}`, 'success');
            // Refresh the transactions to show updated status
            setTimeout(() => {
                if (typeof refreshTransactions === 'function') {
                    refreshTransactions();
                } else if (typeof loadTransactions === 'function') {
                    loadTransactions();
                }
            }, 1000);
        } else {
            showToast(data.message || 'Failed to process refund', 'error');
        }

        hideLoading();
    } catch (error) {
        console.error('Refund error:', error);
        showToast('Failed to process refund - connection error', 'error');
        hideLoading();
    }
}


// ===== PROFILE PICTURE MANAGEMENT (USER-SPECIFIC) =====

function initializeProfilePictureUpload() {
    const uploadArea = document.getElementById('profilePictureUpload');
    const fileInput = document.getElementById('profilePictureInput');
    const preview = document.getElementById('profilePicturePreview');
    const placeholder = document.getElementById('profilePicturePlaceholder');

    if (!uploadArea || !fileInput) return;

    // Load existing profile picture for current user
    loadUserProfilePicture();

    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleProfilePictureUpload(file);
        }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary)';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = 'var(--border)';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--border)';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleProfilePictureUpload(file);
        }
    });
}

function handleProfilePictureUpload(file) {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image size must be less than 5MB', 'error');
        return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target.result;

        // Save to user-specific storage
        saveUserProfilePicture(imageData);

        // Update preview
        displayProfilePicture(imageData);

        showToast('Profile picture updated successfully', 'success');
    };
    reader.readAsDataURL(file);
}

async function saveUserProfilePicture(imageData) {
    if (!currentUser) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/profile/picture`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ imageData })
        });

        const data = await response.json();

        if (response.ok) {
            // Update current user object
            currentUser.profilePicture = imageData;
            localStorage.setItem('user', JSON.stringify(currentUser));
            showToast('Profile picture saved successfully', 'success');
        } else {
            showToast(data.message || 'Failed to save profile picture', 'error');
        }
    } catch (error) {
        console.error('Save profile picture error:', error);
        showToast('Failed to save profile picture', 'error');
    }
}

function loadUserProfilePicture() {
    if (!currentUser) return;

    // Load profile picture from user object (from database)
    const imageData = currentUser.profilePicture;

    if (imageData) {
        displayProfilePicture(imageData);
    }
}

function displayProfilePicture(imageData) {
    const preview = document.getElementById('profilePicturePreview');
    const placeholder = document.getElementById('profilePicturePlaceholder');

    if (preview && placeholder) {
        preview.src = imageData;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
    }

    // Also update the avatar in the header if it exists
    updateHeaderAvatar(imageData);
}

function updateHeaderAvatar(imageData) {
    const userAvatar = document.querySelector('.user-avatar');
    const userInitials = document.getElementById('userInitials');

    if (userAvatar && userInitials) {
        // Check if avatar image already exists
        let avatarImg = userAvatar.querySelector('img');

        if (imageData) {
            if (!avatarImg) {
                avatarImg = document.createElement('img');
                avatarImg.style.width = '100%';
                avatarImg.style.height = '100%';
                avatarImg.style.objectFit = 'cover';
                avatarImg.style.borderRadius = '50%';
                userAvatar.appendChild(avatarImg);
            }
            avatarImg.src = imageData;
            userInitials.style.display = 'none';
        } else {
            if (avatarImg) {
                avatarImg.remove();
            }
            userInitials.style.display = 'flex';
        }
    }
}

async function clearUserProfilePicture() {
    if (!currentUser) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/profile/picture`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            // Update current user object
            currentUser.profilePicture = null;
            localStorage.setItem('user', JSON.stringify(currentUser));

            const preview = document.getElementById('profilePicturePreview');
            const placeholder = document.getElementById('profilePicturePlaceholder');

            if (preview && placeholder) {
                preview.style.display = 'none';
                placeholder.style.display = 'block';
            }

            updateHeaderAvatar(null);
            showToast('Profile picture removed', 'success');
        } else {
            showToast(data.message || 'Failed to remove profile picture', 'error');
        }
    } catch (error) {
        console.error('Clear profile picture error:', error);
        showToast('Failed to remove profile picture', 'error');
    }
}



// ============================================
// LANDING PAGE DYNAMIC DATA LOADER
// ============================================

// Category icons mapping for landing page
const landingCategoryIcons = {
    chicken: 'fa-drumstick-bite',
    beef: 'fa-bacon',
    pork: 'fa-ham',
    seafood: 'fa-fish',
    vegetables: 'fa-carrot',
    dairy: 'fa-cheese',
    other: 'fa-box'
};

// Load featured products from database
async function loadLandingFeaturedProducts() {
    try {
        console.log('[Landing] Fetching featured products from:', `${API_BASE_URL}/landing/featured-products`);
        const response = await fetch(`${API_BASE_URL}/landing/featured-products`);
        console.log('[Landing] Response status:', response.status);
        const data = await response.json();
        console.log('[Landing] Featured products data:', data);

        if (data.success && data.products.length > 0) {
            console.log(`[Landing] Rendering ${data.products.length} featured products`);
            renderLandingFeaturedProducts(data.products);
        } else {
            console.warn('[Landing] No featured products found, keeping demo data');
        }
    } catch (error) {
        console.error('[Landing] Error loading featured products:', error);
        console.warn('[Landing] Using demo data as fallback');
    }
}

// Load active promotions from database
async function loadLandingPromotions() {
    try {
        console.log('[Landing] Fetching promotions from:', `${API_BASE_URL}/landing/promotions`);
        const response = await fetch(`${API_BASE_URL}/landing/promotions`);
        console.log('[Landing] Response status:', response.status);
        const data = await response.json();
        console.log('[Landing] Promotions data:', data);

        if (data.success && data.promotions && data.promotions.length > 0) {
            console.log(`[Landing] Rendering ${data.promotions.length} promotions`);
            renderLandingPromotions(data.promotions);
        } else {
            console.warn('[Landing] No active promotions found');
            // Show a message instead of demo data
            const container = document.querySelector('.discounts-grid');
            if (container) {
                container.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #64748b;">
                        <i class="fas fa-tags" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                        <h3 style="margin-bottom: 0.5rem;">No Active Promotions</h3>
                        <p>Check back soon for exciting deals and discounts!</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('[Landing] Error loading promotions:', error);
        const container = document.querySelector('.discounts-grid');
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #ef4444;">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Unable to Load Promotions</h3>
                    <p>Please check your connection and try again.</p>
                </div>
            `;
        }
    }
}

// Render featured products
function renderLandingFeaturedProducts(products) {
    const container = document.querySelector('.featured-products-grid');
    console.log('[Landing] Featured products container:', container);
    if (!container) {
        console.error('[Landing] Featured products grid not found!');
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-preview-card">
            <div class="product-image-preview">
                ${product.badge ? `<div class="product-badge ${product.badge.toLowerCase()}">${product.badge}</div>` : ''}
                ${product.image && product.image !== 'null' && product.image !== '' ?
            `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <i class="fas ${landingCategoryIcons[product.category] || 'fa-box'}" style="display: none; font-size: 4rem; color: #C41E3A;"></i>` :
            `<i class="fas ${landingCategoryIcons[product.category] || 'fa-box'}" style="font-size: 4rem; color: #C41E3A;"></i>`
        }
            </div>
            <div class="product-info-preview">
                <h3>${product.name}</h3>
                <p class="product-desc">${product.description || 'Premium quality product'}</p>
                <div class="product-specs">
                    <span><i class="fas fa-weight"></i> Per ${product.unit}</span>
                    <span><i class="fas fa-snowflake"></i> -18°C</span>
                    ${product.rating > 0 ? `<span><i class="fas fa-star"></i> ${product.rating.toFixed(1)}</span>` : ''}
                </div>
                <div class="product-price-preview">
                    <span class="price">₱${product.price.toLocaleString()}/${product.unit}</span>
                    <span class="stock ${product.isLowStock ? 'low-stock' : 'in-stock'}">
                        <i class="fas ${product.isLowStock ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
                        ${product.isLowStock ? 'Low Stock' : 'In Stock'}
                    </span>
                </div>
                <button class="btn btn-primary btn-block" onclick="showLogin()" aria-label="Add ${product.name} to cart">
                    <i class="fas fa-cart-plus" aria-hidden="true"></i>
                    Add to Cart
                </button>
            </div>
        </div>
    `).join('');
    console.log('[Landing] Featured products rendered successfully');
}

// Render promotions/discounts
function renderLandingPromotions(promotions) {
    const container = document.querySelector('.discounts-grid');
    console.log('[Landing] Promotions container:', container);
    if (!container) {
        console.error('[Landing] Discounts grid not found!');
        return;
    }

    container.innerHTML = promotions.map((promo, index) => `
        <div class="discount-card ${index === 0 ? 'featured' : ''}">
            ${index === 0 ? '<div class="discount-ribbon">BEST SELLER</div>' : ''}
            <div class="discount-badge">-${promo.discountPercentage}%</div>
            <div class="discount-icon">
                ${promo.image && promo.image !== 'null' && promo.image !== '' ?
            `<img src="${promo.image}" alt="${promo.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 1rem;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <i class="fas ${landingCategoryIcons[promo.category] || 'fa-box'}" style="display: none;"></i>` :
            `<i class="fas ${landingCategoryIcons[promo.category] || 'fa-box'}"></i>`
        }
            </div>
            <h3>${promo.name}</h3>
            <p class="discount-description">${promo.description || 'Special bulk discount offer'}</p>
            <div class="price-container">
                <span class="old-price">₱${promo.originalPrice.toLocaleString()}/${promo.unit}</span>
                <span class="new-price">₱${promo.discountedPrice.toLocaleString()}/${promo.unit}</span>
            </div>
            <div class="discount-details">
                <div class="detail-item">
                    <i class="fas fa-box"></i>
                    <span>Min. ${promo.minQuantity}${promo.unit}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>Ends in ${promo.daysRemaining} days</span>
                </div>
            </div>
            <button class="btn btn-primary btn-block" onclick="showLogin()" aria-label="Order ${promo.name}">
                <i class="fas fa-shopping-cart" aria-hidden="true"></i>
                Order Now
            </button>
        </div>
    `).join('');
    console.log('[Landing] Promotions rendered successfully');
}

// Initialize landing page data - wait for DOM to be fully loaded
function initLandingPageData() {
    // Small delay to ensure all elements are rendered
    setTimeout(() => {
        const landingPage = document.querySelector('.landing-page');
        console.log('[Landing] Checking for landing page...', landingPage ? 'Found!' : 'Not found');

        if (landingPage) {
            // Check if containers exist
            const featuredGrid = document.querySelector('.featured-products-grid');
            const discountsGrid = document.querySelector('.discounts-grid');

            console.log('[Landing] Featured grid:', featuredGrid ? 'Found' : 'Not found');
            console.log('[Landing] Discounts grid:', discountsGrid ? 'Found' : 'Not found');

            if (featuredGrid && discountsGrid) {
                console.log('[Landing] Loading dynamic landing page data...');
                console.log('[Landing] API URL:', API_BASE_URL);
                loadLandingFeaturedProducts();
                loadLandingPromotions();
            } else {
                console.warn('[Landing] Containers not found, retrying in 500ms...');
                setTimeout(initLandingPageData, 500);
            }
        } else {
            console.log('[Landing] Not on landing page, skipping dynamic data load');
        }
    }, 100);
}

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLandingPageData);
} else {
    // DOM already loaded
    initLandingPageData();
}

// Export function for manual refresh
window.refreshLandingData = function () {
    console.log('[Landing] Manual refresh triggered');
    loadLandingFeaturedProducts();
    loadLandingPromotions();
};

console.log('[Landing] Landing page module loaded');
