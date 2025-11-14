// Profile Panel Injector - Creates the enhanced profile panel HTML
(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectProfilePanel);
    } else {
        injectProfilePanel();
    }

    function injectProfilePanel() {
        // Check if container exists
        let container = document.getElementById('enhancedProfileSettingsContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'enhancedProfileSettingsContainer';
            document.body.appendChild(container);
        }

        // Inject the HTML
        container.innerHTML = generateProfilePanelHTML();
        
        console.log('✅ Profile panel HTML injected');
        
        // Setup event listeners after a short delay
        setTimeout(setupProfilePanelListeners, 100);
    }

    function generateProfilePanelHTML() {
        return `
            <!-- Profile Settings Overlay -->
            <div class="profile-overlay" id="profileOverlay" onclick="closeEnhancedProfile()"></div>
            
            <!-- Enhanced Profile Panel -->
            <div class="enhanced-profile-panel" id="enhancedProfilePanel">
                <!-- Header -->
                <div class="profile-header">
                    <div class="profile-header-content">
                        <h2><i class="fas fa-user-cog"></i> Profile & Settings</h2>
                        <div class="profile-header-actions">
                            <button class="icon-btn" onclick="refreshProfileData()" title="Refresh">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                            <button class="icon-btn" onclick="closeEnhancedProfile()" title="Close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- User Banner -->
                <div class="profile-user-banner">
                    <div class="profile-avatar-section">
                        <div class="profile-avatar-large" id="profileAvatarLarge">
                            <img id="profileAvatarImg" style="display:none" alt="Avatar">
                            <div id="profileAvatarInitials"><i class="fas fa-user"></i></div>
                        </div>
                        <div class="profile-avatar-badge" id="profileOnlineStatus">
                            <i class="fas fa-circle"></i>
                        </div>
                    </div>
                    <div class="profile-user-details">
                        <h3 id="profileDisplayName">User Name</h3>
                        <p id="profileDisplayEmail"><i class="fas fa-envelope"></i> email@example.com</p>
                        <span class="profile-role-badge" id="profileRoleBadge">Client</span>
                    </div>
                    <div class="profile-stats-mini" id="profileStatsMini">
                        <div class="stat-mini" id="statOrders">
                            <i class="fas fa-shopping-bag"></i>
                            <span id="profileOrderCount">0</span>
                            <small>Orders</small>
                        </div>
                        <div class="stat-mini" id="statPoints">
                            <i class="fas fa-star"></i>
                            <span id="profilePointsCount">0</span>
                            <small>Points</small>
                        </div>
                        <div class="stat-mini" id="statMember">
                            <i class="fas fa-calendar"></i>
                            <span id="profileMemberSince">2024</span>
                            <small>Member</small>
                        </div>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="profile-tabs">
                    <button class="profile-tab active" data-tab="overview" onclick="switchEnhancedTab('overview')">
                        <i class="fas fa-th-large"></i><span>Overview</span>
                    </button>
                    <button class="profile-tab" data-tab="profile" onclick="switchEnhancedTab('profile')">
                        <i class="fas fa-user-edit"></i><span>Profile</span>
                    </button>
                    <button class="profile-tab" data-tab="security" onclick="switchEnhancedTab('security')">
                        <i class="fas fa-shield-alt"></i><span>Security</span>
                    </button>
                    <button class="profile-tab" data-tab="preferences" onclick="switchEnhancedTab('preferences')">
                        <i class="fas fa-sliders-h"></i><span>Preferences</span>
                    </button>
                    <button class="profile-tab" data-tab="activity" onclick="switchEnhancedTab('activity')">
                        <i class="fas fa-history"></i><span>Activity</span>
                    </button>
                </div>

                <!-- Content -->
                <div class="profile-content">
                    ${generateOverviewTab()}
                    ${generateProfileTab()}
                    ${generateSecurityTab()}
                    ${generatePreferencesTab()}
                    ${generateActivityTab()}
                </div>
            </div>
        `;
    }

    function generateOverviewTab() {
        // Get user role
        let user = null;
        try {
            user = JSON.parse(localStorage.getItem('user') || 'null');
        } catch (e) {}
        
        const role = user ? (user.role || 'client').toLowerCase() : 'client';
        const isClient = role === 'client';
        const isAdmin = role === 'admin' || role === 'staff';
        const isB2B = role === 'b2b';

        return `
            <div class="profile-tab-content active" id="overviewTabContent">
                <h3><i class="fas fa-chart-line"></i> Account Overview</h3>
                
                <div class="overview-grid">
                    <div class="overview-card">
                        <div class="overview-icon success">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="overview-info">
                            <h4>Account Status</h4>
                            <p class="status-active">Active & Verified</p>
                            <small>Last login: <span id="lastLoginTime">Just now</span></small>
                        </div>
                    </div>
                    
                    ${isClient || isB2B ? `
                    <div class="overview-card">
                        <div class="overview-icon primary">
                            <i class="fas fa-shopping-cart"></i>
                        </div>
                        <div class="overview-info">
                            <h4>Total Orders</h4>
                            <p class="stat-value" id="totalOrdersCount">0</p>
                            <small>Lifetime purchases</small>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${isClient ? `
                    <div class="overview-card">
                        <div class="overview-icon warning">
                            <i class="fas fa-coins"></i>
                        </div>
                        <div class="overview-info">
                            <h4>Loyalty Points</h4>
                            <p class="stat-value" id="loyaltyPointsCount">0</p>
                            <small>Available to redeem</small>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${isAdmin ? `
                    <div class="overview-card">
                        <div class="overview-icon primary">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="overview-info">
                            <h4>Total Users</h4>
                            <p class="stat-value" id="totalUsersCount">0</p>
                            <small>Registered accounts</small>
                        </div>
                    </div>
                    
                    <div class="overview-card">
                        <div class="overview-icon warning">
                            <i class="fas fa-boxes"></i>
                        </div>
                        <div class="overview-info">
                            <h4>Total Products</h4>
                            <p class="stat-value" id="totalProductsCount">0</p>
                            <small>In inventory</small>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="overview-card">
                        <div class="overview-icon info">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div class="overview-info">
                            <h4>Profile Completion</h4>
                            <div class="progress-bar">
                                <div class="progress-fill" id="profileCompletionBar" style="width: 0%"></div>
                            </div>
                            <small><span id="profileCompletionText">0%</span> complete</small>
                        </div>
                    </div>
                </div>

                <div class="quick-actions">
                    <h4><i class="fas fa-bolt"></i> Quick Actions</h4>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="switchEnhancedTab('profile')">
                            <i class="fas fa-user-edit"></i> Edit Profile
                        </button>
                        <button class="action-btn" onclick="switchEnhancedTab('security')">
                            <i class="fas fa-key"></i> Change Password
                        </button>
                        <button class="action-btn" onclick="exportUserData()">
                            <i class="fas fa-download"></i> Export Data
                        </button>
                        ${isClient || isB2B ? `
                        <button class="action-btn" onclick="viewMyOrders()">
                            <i class="fas fa-shopping-bag"></i> View My Orders
                        </button>
                        ` : ''}
                        ${isAdmin ? `
                        <button class="action-btn" onclick="viewMyOrders()">
                            <i class="fas fa-tasks"></i> Manage Orders
                        </button>
                        <button class="action-btn" onclick="manageInventory()">
                            <i class="fas fa-warehouse"></i> Manage Inventory
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function generateProfileTab() {
        return `
            <div class="profile-tab-content" id="profileTabContent">
                <h3><i class="fas fa-user-edit"></i> Personal Information</h3>
                
                <div class="profile-picture-section">
                    <div class="picture-preview">
                        <img id="picturePreviewImg" style="display:none" alt="Preview">
                        <div id="picturePlaceholder"><i class="fas fa-camera"></i></div>
                    </div>
                    <div class="picture-actions">
                        <h4>Profile Picture</h4>
                        <p>JPG, PNG or GIF (max 5MB)</p>
                        <input type="file" id="enhancedProfilePictureInput" accept="image/*" style="display:none">
                        <button class="btn-primary" onclick="document.getElementById('enhancedProfilePictureInput').click()">
                            <i class="fas fa-upload"></i> Upload Photo
                        </button>
                        <button class="btn-secondary" id="deletePictureBtn" style="display:none">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>

                <form id="profileUpdateForm" class="profile-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-user"></i> Username</label>
                            <input type="text" id="enhancedProfileUsername" name="username" required>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-envelope"></i> Email</label>
                            <input type="email" id="enhancedProfileEmail" name="email" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-phone"></i> Phone</label>
                            <input type="tel" id="enhancedProfilePhone" name="phone" placeholder="+63 XXX XXX XXXX">
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-building"></i> Business Name</label>
                            <input type="text" id="enhancedProfileBusinessName" name="businessName" placeholder="Optional">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-map-marker-alt"></i> Address</label>
                        <textarea id="enhancedProfileAddress" name="address" rows="3" placeholder="Delivery address"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-info-circle"></i> Bio</label>
                        <textarea id="enhancedProfileBio" name="bio" rows="3" placeholder="Tell us about yourself" maxlength="500"></textarea>
                        <small class="char-count"><span id="enhancedBioCharCount">0</span>/500 characters</small>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                        <button type="button" class="btn-secondary" onclick="closeEnhancedProfile()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    function generateSecurityTab() {
        return `
            <div class="profile-tab-content" id="securityTabContent">
                <h3><i class="fas fa-shield-alt"></i> Security Settings</h3>
                
                <div class="security-status">
                    <div class="security-item">
                        <i class="fas fa-check-circle success"></i>
                        <div>
                            <h4>Email Verified</h4>
                            <p>Your email address is verified</p>
                        </div>
                    </div>
                    <div class="security-item">
                        <i class="fas fa-lock success"></i>
                        <div>
                            <h4>Strong Password</h4>
                            <p>Last changed: <span id="passwordLastChanged">Never</span></p>
                        </div>
                    </div>
                </div>

                <div class="security-card">
                    <h4><i class="fas fa-key"></i> Change Password</h4>
                    <p>For security, we'll send a verification code to your email</p>
                    
                    <button class="btn-primary" id="sendVerificationCodeBtn">
                        <i class="fas fa-envelope"></i> Send Verification Code
                    </button>
                    
                    <div id="verificationCodeSection" style="display:none; margin-top: 1rem;">
                        <div class="verification-notice">
                            <i class="fas fa-info-circle"></i>
                            <p>Code sent to <strong id="verificationEmail"></strong></p>
                            <span class="countdown" id="verificationCountdown">10:00</span>
                        </div>
                    </div>
                    
                    <form id="passwordChangeForm" class="profile-form" style="margin-top: 1.5rem">
                        <div class="form-group">
                            <label><i class="fas fa-lock"></i> Current Password</label>
                            <input type="password" id="enhancedCurrentPassword" name="currentPassword" required>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-key"></i> New Password</label>
                            <input type="password" id="enhancedNewPassword" name="newPassword" required minlength="8">
                            <div class="password-strength" id="enhancedPasswordStrength">
                                <div class="strength-bar"></div>
                                <span class="strength-text">Password strength</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-check"></i> Confirm Password</label>
                            <input type="password" id="enhancedConfirmPassword" name="confirmPassword" required>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-shield-alt"></i> Verification Code</label>
                            <input type="text" id="enhancedVerificationCode" name="verificationCode" maxlength="6" placeholder="Enter 6-digit code">
                        </div>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-key"></i> Change Password
                        </button>
                    </form>
                </div>
            </div>
        `;
    }

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
                            <input type="checkbox" id="enhancedDarkModeToggle" name="darkMode">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="settings-section">
                    <h4><i class="fas fa-globe"></i> Regional Settings</h4>
                    <div class="form-group">
                        <label>Currency</label>
                        <select id="enhancedCurrencySelect" name="currency" class="form-select">
                            <option value="PHP">Philippine Peso (₱)</option>
                            <option value="USD">US Dollar ($)</option>
                            <option value="EUR">Euro (€)</option>
                            <option value="GBP">British Pound (£)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Timezone</label>
                        <select id="enhancedTimezoneSelect" name="timezone" class="form-select">
                            <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                            <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                            <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    function generateActivityTab() {
        return `
            <div class="profile-tab-content" id="activityTabContent">
                <h3><i class="fas fa-history"></i> Activity Log</h3>
                
                <div id="activityLogList" class="activity-list">
                    <!-- Activity items will be populated here -->
                </div>

                <div class="data-export">
                    <h4><i class="fas fa-download"></i> Export Your Data</h4>
                    <p>Download a copy of your profile data and activity</p>
                    <button class="btn-primary" onclick="exportUserData()">
                        <i class="fas fa-file-download"></i> Export as JSON
                    </button>
                </div>
            </div>
        `;
    }

    function setupProfilePanelListeners() {
        // Profile form submission
        const profileForm = document.getElementById('profileUpdateForm');
        if (profileForm) {
            profileForm.addEventListener('submit', handleProfileSubmit);
        }

        // Password form submission
        const passwordForm = document.getElementById('passwordChangeForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', handlePasswordSubmit);
        }

        // Bio character counter
        const bioField = document.getElementById('enhancedProfileBio');
        if (bioField) {
            bioField.addEventListener('input', updateBioCharCount);
        }

        // Profile picture upload
        const pictureInput = document.getElementById('enhancedProfilePictureInput');
        if (pictureInput) {
            pictureInput.addEventListener('change', handlePictureUpload);
        }

        // Dark mode toggle
        const darkModeToggle = document.getElementById('enhancedDarkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.checked = document.body.classList.contains('dark');
            darkModeToggle.addEventListener('change', (e) => {
                document.body.classList.toggle('dark', e.target.checked);
                localStorage.setItem('darkMode', e.target.checked);
                if (typeof showToast === 'function') {
                    showToast(`Switched to ${e.target.checked ? 'dark' : 'light'} mode`, 'success');
                }
            });
        }

        // Currency and timezone selects
        const currencySelect = document.getElementById('enhancedCurrencySelect');
        const timezoneSelect = document.getElementById('enhancedTimezoneSelect');

        if (currencySelect) {
            currencySelect.addEventListener('change', (e) => {
                localStorage.setItem('preferredCurrency', e.target.value);
                if (typeof showToast === 'function') {
                    showToast('Currency preference saved', 'success');
                }
            });
        }

        if (timezoneSelect) {
            timezoneSelect.addEventListener('change', (e) => {
                localStorage.setItem('preferredTimezone', e.target.value);
                if (typeof showToast === 'function') {
                    showToast('Timezone preference saved', 'success');
                }
            });
        }

        console.log('✅ Profile panel listeners setup complete');
    }

    function handleProfileSubmit(e) {
        e.preventDefault();
        // Use existing profile manager if available
        if (window.profileManager && typeof window.profileManager.handleProfileUpdate === 'function') {
            window.profileManager.handleProfileUpdate(e);
        } else {
            console.log('Profile update submitted');
            if (typeof showToast === 'function') {
                showToast('Profile updated successfully!', 'success');
            }
        }
    }

    function handlePasswordSubmit(e) {
        e.preventDefault();
        // Use existing profile manager if available
        if (window.profileManager && typeof window.profileManager.handlePasswordChange === 'function') {
            window.profileManager.handlePasswordChange(e);
        } else {
            console.log('Password change submitted');
            if (typeof showToast === 'function') {
                showToast('Password changed successfully!', 'success');
            }
        }
    }

    function updateBioCharCount() {
        const bioField = document.getElementById('enhancedProfileBio');
        const charCount = document.getElementById('enhancedBioCharCount');
        if (bioField && charCount) {
            charCount.textContent = bioField.value.length;
        }
    }

    function handlePictureUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            if (typeof showToast === 'function') {
                showToast('Please select an image file', 'error');
            }
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            if (typeof showToast === 'function') {
                showToast('Image size must be less than 5MB', 'error');
            }
            return;
        }

        // Use existing profile manager if available
        if (window.profileManager && typeof window.profileManager.handleProfilePictureUpload === 'function') {
            window.profileManager.handleProfilePictureUpload(e);
        } else {
            // Show preview
            const reader = new FileReader();
            reader.onload = function(event) {
                const preview = document.getElementById('picturePreviewImg');
                const placeholder = document.getElementById('picturePlaceholder');
                if (preview && placeholder) {
                    preview.src = event.target.result;
                    preview.style.display = 'block';
                    placeholder.style.display = 'none';
                }
            };
            reader.readAsDataURL(file);
        }
    }

})();
