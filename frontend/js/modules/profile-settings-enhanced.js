// Enhanced Profile & Settings Manager with Advanced Features
// Version 2.0 - Modern, Feature-Rich Profile Management

class EnhancedProfileManager {
    constructor() {
        this.currentUser = null;
        this.activityLog = [];
        this.preferences = {};
        this.sessions = [];
        this.isSubmitting = false;
        this.profileStats = {};
        
        // Don't initialize immediately, wait for DOM
        setTimeout(() => this.init(), 200);
    }

    init() {
        try {
            this.loadUserData();
            this.loadActivityLog();
            this.loadSessions();
            this.applyThemePreference();
            this.calculateProfileStats();
            console.log('✅ Enhanced Profile Manager initialized successfully');
        } catch (error) {
            console.error('Error initializing Enhanced Profile Manager:', error);
        }
    }

    loadUserData() {
        try {
            const userData = localStorage.getItem('user');
            if (userData) {
                this.currentUser = JSON.parse(userData);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    loadActivityLog() {
        try {
            const userId = this.currentUser?._id || this.currentUser?.username || 'default';
            const logKey = `activityLog_${userId}`;
            const saved = localStorage.getItem(logKey);
            this.activityLog = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading activity log:', error);
            this.activityLog = [];
        }
    }

    loadSessions() {
        // Placeholder for session loading
        this.sessions = [{
            id: 1,
            device: 'Current Device',
            location: 'Unknown',
            lastActive: new Date().toISOString(),
            current: true
        }];
    }

    applyThemePreference() {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark');
        }
    }

    calculateProfileStats() {
        // Placeholder for stats calculation
        this.profileStats = {
            totalOrders: 0,
            loyaltyPoints: 0,
            memberSince: '2024',
            profileCompletion: 50
        };
    }

    generateHeaderHTML() {
        return `
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
        `;
    }

    generateUserSectionHTML() {
        return `
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
                <div class="profile-stats-mini">
                    <div class="stat-mini">
                        <i class="fas fa-shopping-bag"></i>
                        <span id="profileOrderCount">0</span>
                        <small>Orders</small>
                    </div>
                    <div class="stat-mini">
                        <i class="fas fa-star"></i>
                        <span id="profilePointsCount">0</span>
                        <small>Points</small>
                    </div>
                    <div class="stat-mini">
                        <i class="fas fa-calendar"></i>
                        <span id="profileMemberSince">2024</span>
                        <small>Member</small>
                    </div>
                </div>
            </div>
        `;
    }

    generateTabsHTML() {
        return `
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
                <button class="profile-tab" data-tab="notifications" onclick="switchEnhancedTab('notifications')">
                    <i class="fas fa-bell"></i><span>Notifications</span>
                </button>
                <button class="profile-tab" data-tab="sessions" onclick="switchEnhancedTab('sessions')">
                    <i class="fas fa-laptop"></i><span>Sessions</span>
                </button>
                <button class="profile-tab" data-tab="activity" onclick="switchEnhancedTab('activity')">
                    <i class="fas fa-history"></i><span>Activity</span>
                </button>
            </div>
        `;
    }

    generateContentHTML() {
        return `
            <div class="profile-content">
                ${this.generateOverviewTab()}
                ${this.generateProfileTab()}
                ${this.generateSecurityTab()}
                ${this.generatePreferencesTab()}
                ${this.generateNotificationsTab()}
                ${this.generateSessionsTab()}
                ${this.generateActivityTab()}
            </div>
        `;
    }

    generateOverviewTab() {
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
                        <button class="action-btn" onclick="window.profileManager?.exportUserData()">
                            <i class="fas fa-download"></i> Export Data
                        </button>
                        <button class="action-btn" onclick="viewMyOrders()">
                            <i class="fas fa-shopping-bag"></i> View Orders
                        </button>
                    </div>
                </div>

                <div class="recent-activity-preview">
                    <h4><i class="fas fa-clock"></i> Recent Activity</h4>
                    <div id="recentActivityPreview"></div>
                    <button class="btn-link" onclick="switchEnhancedTab('activity')">
                        View All Activity <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    }

    generateProfileTab() {
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
                        <input type="file" id="profilePictureInput" accept="image/*" style="display:none">
                        <button class="btn-primary" onclick="document.getElementById('profilePictureInput').click()">
                            <i class="fas fa-upload"></i> Upload Photo
                        </button>
                        <button class="btn-secondary" id="deletePictureBtn" style="display:none" onclick="window.profileManager?.handleProfilePictureDelete()">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>

                <form id="profileUpdateForm" class="profile-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-user"></i> Username</label>
                            <input type="text" id="profileUsername" required>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-envelope"></i> Email</label>
                            <input type="email" id="profileEmail" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-phone"></i> Phone</label>
                            <input type="tel" id="profilePhone" placeholder="+63 XXX XXX XXXX">
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-building"></i> Business Name</label>
                            <input type="text" id="profileBusinessName" placeholder="Optional">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-map-marker-alt"></i> Address</label>
                        <textarea id="profileAddress" rows="3" placeholder="Delivery address"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-info-circle"></i> Bio</label>
                        <textarea id="profileBio" rows="3" placeholder="Tell us about yourself"></textarea>
                        <small class="char-count"><span id="bioCharCount">0</span>/500 characters</small>
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

    generateSecurityTab() {
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
                    
                    <button class="btn-primary" id="sendVerificationCodeBtn" onclick="window.profileManager?.requestPasswordChangeVerification()">
                        <i class="fas fa-envelope"></i> Send Verification Code
                    </button>
                    
                    <div id="verificationCodeSection" style="display:none">
                        <div class="verification-notice">
                            <i class="fas fa-info-circle"></i>
                            <p>Code sent to <strong id="verificationEmail"></strong></p>
                            <span class="countdown" id="verificationCountdown">10:00</span>
                        </div>
                    </div>
                    
                    <form id="passwordChangeForm" class="profile-form" style="margin-top: 1.5rem">
                        <div class="form-group">
                            <label><i class="fas fa-lock"></i> Current Password</label>
                            <input type="password" id="currentPassword" required>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-key"></i> New Password</label>
                            <input type="password" id="newPassword" required minlength="8">
                            <div class="password-strength" id="passwordStrength">
                                <div class="strength-bar"></div>
                                <span class="strength-text">Password strength</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-check"></i> Confirm Password</label>
                            <input type="password" id="confirmPassword" required>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-shield-alt"></i> Verification Code</label>
                            <input type="text" id="verificationCode" maxlength="6" placeholder="Enter 6-digit code">
                        </div>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-key"></i> Change Password
                        </button>
                    </form>
                </div>
            </div>
        `;
    }
