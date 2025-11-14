// Profile Settings - Additional Tabs and Features

// Generate Preferences Tab
function generatePreferencesTab() {
    return `
        <div class="profile-tab-content" id="preferencesTabContent">
            <h3><i class="fas fa-sliders-h"></i> System Preferences</h3>
            
            <div class="settings-section">
                <h4><i class="fas fa-palette"></i> Appearance</h4>
                <div class="setting-item">
                    <div class="setting-info">
                        <strong>Dark Mode</strong>
                        <p>Enable dark theme for better viewing</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="darkModeToggle">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <div class="setting-info">
                        <strong>Compact View</strong>
                        <p>Reduce spacing for more content</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="compactViewToggle">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div class="settings-section">
                <h4><i class="fas fa-globe"></i> Regional Settings</h4>
                <div class="form-group">
                    <label>Currency</label>
                    <select id="currencySelect" class="form-select">
                        <option value="PHP">Philippine Peso (₱)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="GBP">British Pound (£)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Timezone</label>
                    <select id="timezoneSelect" class="form-select">
                        <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                        <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                        <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Date Format</label>
                    <select id="dateFormatSelect" class="form-select">
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Language</label>
                    <select id="languageSelect" class="form-select">
                        <option value="en">English</option>
                        <option value="fil">Filipino</option>
                        <option value="es">Español</option>
                    </select>
                </div>
            </div>

            <div class="settings-section">
                <h4><i class="fas fa-briefcase"></i> Business Settings</h4>
                <div class="form-group">
                    <label>Tax Rate (%)</label>
                    <input type="number" id="taxRateInput" min="0" max="100" step="0.01" value="12">
                    <small>Default: 12% (Philippines VAT)</small>
                </div>
            </div>
        </div>
    `;
}

// Generate Notifications Tab
function generateNotificationsTab() {
    return `
        <div class="profile-tab-content" id="notificationsTabContent">
            <h3><i class="fas fa-bell"></i> Notification Preferences</h3>
            
            <div class="settings-section">
                <h4><i class="fas fa-paper-plane"></i> Channels</h4>
                <div class="setting-item">
                    <div class="setting-info">
                        <strong>Email Notifications</strong>
                        <p>Receive updates via email</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" class="notif-toggle" data-type="email" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <div class="setting-info">
                        <strong>Push Notifications</strong>
                        <p>Browser notifications</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" class="notif-toggle" data-type="push" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <div class="setting-info">
                        <strong>SMS Notifications</strong>
                        <p>Text messages for critical alerts</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" class="notif-toggle" data-type="sms">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div class="settings-section">
                <h4><i class="fas fa-list-check"></i> Notification Types</h4>
                <div class="setting-item">
                    <div class="setting-info">
                        <strong>Order Updates</strong>
                        <p>Status changes and delivery</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" class="notif-toggle" data-type="orders" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <div class="setting-info">
                        <strong>Promotions & Offers</strong>
                        <p>Special deals and discounts</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" class="notif-toggle" data-type="promotions" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <div class="setting-info">
                        <strong>Low Stock Alerts</strong>
                        <p>Inventory warnings (Admin only)</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" class="notif-toggle" data-type="lowstock" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

// Generate Sessions Tab
function generateSessionsTab() {
    return `
        <div class="profile-tab-content" id="sessionsTabContent">
            <h3><i class="fas fa-laptop"></i> Active Sessions</h3>
            
            <div class="sessions-info">
                <p>Manage your active sessions across different devices</p>
            </div>

            <div id="sessionsList" class="sessions-list">
                <!-- Sessions will be populated here -->
            </div>

            <div class="danger-zone">
                <h4><i class="fas fa-exclamation-triangle"></i> Danger Zone</h4>
                <button class="btn-danger" onclick="logoutAllSessions()">
                    <i class="fas fa-sign-out-alt"></i> Logout All Other Sessions
                </button>
            </div>
        </div>
    `;
}

// Generate Activity Tab
function generateActivityTab() {
    return `
        <div class="profile-tab-content" id="activityTabContent">
            <h3><i class="fas fa-history"></i> Activity Log</h3>
            
            <div class="activity-filters">
                <select id="activityFilter" class="form-select">
                    <option value="all">All Activity</option>
                    <option value="login">Logins</option>
                    <option value="profile">Profile Changes</option>
                    <option value="orders">Orders</option>
                    <option value="security">Security</option>
                </select>
                <button class="btn-secondary" onclick="window.profileManager?.clearActivityLog()">
                    <i class="fas fa-trash"></i> Clear Log
                </button>
            </div>

            <div id="activityLogList" class="activity-list">
                <!-- Activity items will be populated here -->
            </div>

            <div class="data-export">
                <h4><i class="fas fa-download"></i> Export Your Data</h4>
                <p>Download a copy of your profile data and activity</p>
                <button class="btn-primary" onclick="window.profileManager?.exportUserData()">
                    <i class="fas fa-file-download"></i> Export as JSON
                </button>
            </div>
        </div>
    `;
}

// Global Functions
function openEnhancedProfile() {
    const panel = document.getElementById('enhancedProfilePanel');
    const overlay = document.getElementById('profileOverlay');
    
    if (panel && overlay) {
        // Show panel first
        overlay.classList.add('active');
        setTimeout(() => panel.classList.add('active'), 10);
        document.body.style.overflow = 'hidden';
        
        // Load user data after panel is visible
        setTimeout(() => {
            loadProfileData();
        }, 100);
    } else {
        console.error('Profile panel not found. Make sure profile-panel-inject.js is loaded.');
    }
}

function closeEnhancedProfile() {
    const panel = document.getElementById('enhancedProfilePanel');
    const overlay = document.getElementById('profileOverlay');
    
    if (panel && overlay) {
        panel.classList.remove('active');
        setTimeout(() => overlay.classList.remove('active'), 400);
        document.body.style.overflow = '';
    }
}

function loadProfileData() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user) {
            console.warn('No user data found in localStorage');
            return;
        }

        console.log('Loading profile data for:', user.username);

        // Update user info in banner
        const displayName = document.getElementById('profileDisplayName');
        const displayEmail = document.getElementById('profileDisplayEmail');
        const roleBadge = document.getElementById('profileRoleBadge');
        const avatarInitials = document.getElementById('profileAvatarInitials');
        
        if (displayName) {
            displayName.textContent = user.business_name || user.username || 'User';
        }
        
        if (displayEmail) {
            displayEmail.innerHTML = `<i class="fas fa-envelope"></i> ${user.email || 'email@example.com'}`;
        }
        
        if (roleBadge) {
            const role = (user.role || 'client').toLowerCase();
            roleBadge.textContent = role.charAt(0).toUpperCase() + role.slice(1);
            roleBadge.className = `profile-role-badge role-${role}`;
        }

        // Update avatar initials
        if (avatarInitials) {
            const name = user.business_name || user.username || 'U';
            avatarInitials.innerHTML = name.charAt(0).toUpperCase();
        }

        // Update profile picture if exists
        if (user.profilePicture) {
            const avatarImg = document.getElementById('profileAvatarImg');
            const picturePreviewImg = document.getElementById('picturePreviewImg');
            const picturePlaceholder = document.getElementById('picturePlaceholder');
            
            if (avatarImg) {
                avatarImg.src = user.profilePicture;
                avatarImg.style.display = 'block';
                if (avatarInitials) avatarInitials.style.display = 'none';
            }
            
            if (picturePreviewImg && picturePlaceholder) {
                picturePreviewImg.src = user.profilePicture;
                picturePreviewImg.style.display = 'block';
                picturePlaceholder.style.display = 'none';
            }
        }

        // Update profile form fields
        const fields = {
            'enhancedProfileUsername': user.username || '',
            'enhancedProfileEmail': user.email || '',
            'enhancedProfilePhone': user.phone || '',
            'enhancedProfileBusinessName': user.business_name || '',
            'enhancedProfileAddress': user.address || '',
            'enhancedProfileBio': user.bio || ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const field = document.getElementById(id);
            if (field) {
                field.value = value;
                console.log(`Set ${id} to:`, value);
            }
        });

        // Update bio character count
        const bioField = document.getElementById('enhancedProfileBio');
        const charCount = document.getElementById('enhancedBioCharCount');
        if (bioField && charCount) {
            charCount.textContent = bioField.value.length;
        }

        // Update stats
        updateProfileStats(user);

        // Calculate profile completion
        calculateProfileCompletion(user);

        // Update overview based on role
        updateOverviewForRole(user);

        console.log('✅ Profile data loaded successfully');

    } catch (error) {
        console.error('Error loading profile data:', error);
    }
}

function updateProfileStats(user) {
    // Update order count
    const orderCount = document.getElementById('profileOrderCount');
    if (orderCount) {
        orderCount.textContent = user.totalOrders || '0';
    }

    // Update points count
    const pointsCount = document.getElementById('profilePointsCount');
    if (pointsCount) {
        pointsCount.textContent = user.loyaltyPoints || '0';
    }

    // Update member since
    const memberSince = document.getElementById('profileMemberSince');
    if (memberSince) {
        const year = user.createdAt ? new Date(user.createdAt).getFullYear() : '2024';
        memberSince.textContent = year;
    }

    // Update overview stats
    const totalOrdersCount = document.getElementById('totalOrdersCount');
    if (totalOrdersCount) {
        totalOrdersCount.textContent = user.totalOrders || '0';
    }

    const loyaltyPointsCount = document.getElementById('loyaltyPointsCount');
    if (loyaltyPointsCount) {
        loyaltyPointsCount.textContent = user.loyaltyPoints || '0';
    }
}

function updateOverviewForRole(user) {
    const role = (user.role || 'client').toLowerCase();
    const isClient = role === 'client';
    const isAdmin = role === 'admin' || role === 'staff';
    const isB2B = role === 'b2b';

    // Hide/show loyalty points in overview
    const loyaltyCard = document.querySelector('.overview-card:has(#loyaltyPointsCount)');
    if (loyaltyCard) {
        loyaltyCard.style.display = isClient ? 'flex' : 'none';
    }

    // Hide/show points stat in banner
    const pointsStat = document.getElementById('statPoints');
    if (pointsStat) {
        pointsStat.style.display = isClient ? 'flex' : 'none';
    }

    // Hide/show orders stat in banner (admin/staff don't need this)
    const ordersStat = document.getElementById('statOrders');
    if (ordersStat) {
        ordersStat.style.display = (isClient || isB2B) ? 'flex' : 'none';
    }

    // Update quick actions based on role
    const viewOrdersBtn = document.querySelector('.action-btn[onclick*="viewMyOrders"]');
    if (viewOrdersBtn && isAdmin) {
        viewOrdersBtn.innerHTML = '<i class="fas fa-shopping-bag"></i> Manage Orders';
    }
}

function calculateProfileCompletion(user) {
    const fields = ['username', 'email', 'phone', 'address', 'bio', 'profilePicture'];
    const completed = fields.filter(field => user[field] && user[field].length > 0).length;
    const percentage = Math.round((completed / fields.length) * 100);

    const progressBar = document.getElementById('profileCompletionBar');
    const progressText = document.getElementById('profileCompletionText');

    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${percentage}%`;
}

function switchEnhancedTab(tabName) {
    // Remove active from all tabs and contents
    document.querySelectorAll('.profile-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.profile-tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active to selected
    const tab = document.querySelector(`[data-tab="${tabName}"]`);
    const content = document.getElementById(`${tabName}TabContent`);
    
    if (tab) tab.classList.add('active');
    if (content) content.classList.add('active');
}

function refreshProfileData() {
    if (window.enhancedProfileManager) {
        window.enhancedProfileManager.loadUserData();
        window.enhancedProfileManager.calculateProfileStats();
        showToast('Profile data refreshed', 'success');
    }
}

function viewMyOrders() {
    closeEnhancedProfile();
    if (typeof switchTab === 'function') {
        switchTab('orders');
    }
}

function logoutAllSessions() {
    if (confirm('Are you sure you want to logout from all other devices?')) {
        // Implementation for logging out all sessions
        showToast('All other sessions have been terminated', 'success');
    }
}


function refreshProfileData() {
    loadProfileData();
    if (typeof showToast === 'function') {
        showToast('Profile data refreshed', 'success');
    }
}

function viewMyOrders() {
    closeEnhancedProfile();
    if (typeof switchTab === 'function') {
        switchTab('orders');
    }
}

function exportUserData() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user) {
            if (typeof showToast === 'function') {
                showToast('No user data to export', 'warning');
            }
            return;
        }

        const exportData = {
            profile: user,
            preferences: JSON.parse(localStorage.getItem(`profilePreferences_${user._id || user.username}`) || '{}'),
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `user-data-${user.username || 'export'}-${Date.now()}.json`;
        link.click();

        URL.revokeObjectURL(url);
        
        if (typeof showToast === 'function') {
            showToast('User data exported successfully', 'success');
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to export data', 'error');
        }
    }
}

// Make openProfileSettings use the new enhanced profile
window.openProfileSettings = function() {
    openEnhancedProfile();
};

window.closeProfileSettings = function() {
    closeEnhancedProfile();
};


function manageInventory() {
    closeEnhancedProfile();
    if (typeof switchTab === 'function') {
        switchTab('inventory');
    }
}

// Initialize profile data when panel opens
window.addEventListener('profilePanelOpened', function() {
    loadProfileData();
});
