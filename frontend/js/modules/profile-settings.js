// Profile & Settings Management System - Cleaned & Optimized
// Removed outdated functions, fixed non-working features

class ProfileSettingsManager {
    constructor() {
        this.currentUser = null;
        this.activityLog = [];
        this.preferences = this.loadPreferences();
        this.isSubmitting = false;
        this.init();
    }

    init() {
        this.loadUserData();
        this.setupEventListeners();
        this.loadActivityLog();
        this.applyThemePreference();
    }

    loadUserData() {
        try {
            const userData = localStorage.getItem('user');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                this.preferences = this.loadPreferences();
                this.populateProfileForm();

                // Display user email in verification section
                const emailDisplay = document.getElementById('userEmailDisplay');
                if (emailDisplay && this.currentUser.email) {
                    emailDisplay.textContent = this.currentUser.email;
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    setupEventListeners() {
        // Profile form submission
        const profileForm = document.getElementById('enhancedProfileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }

        // Password change form
        const passwordForm = document.getElementById('enhancedPasswordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
        }

        // Profile picture upload
        const profilePictureInput = document.getElementById('profilePictureInput');
        if (profilePictureInput) {
            console.log('Profile picture input found, attaching change listener');
            profilePictureInput.addEventListener('change', (e) => this.handleProfilePictureUpload(e));
        } else {
            console.warn('Profile picture input not found');
        }

        // Upload area click
        const uploadAreaClick = document.getElementById('uploadAreaClick');
        if (uploadAreaClick) {
            console.log('Upload area found, attaching click listener');
            uploadAreaClick.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Upload area clicked, triggering file input');
                const fileInput = document.getElementById('profilePictureInput');
                if (fileInput) {
                    fileInput.click();
                } else {
                    console.error('File input not found when trying to click');
                }
            });
        } else {
            console.warn('Upload area not found');
        }

        // Upload button click
        const uploadPictureBtn = document.getElementById('uploadPictureBtn');
        if (uploadPictureBtn) {
            console.log('Upload button found, attaching click listener');
            uploadPictureBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Upload button clicked, triggering file input');
                const fileInput = document.getElementById('profilePictureInput');
                if (fileInput) {
                    fileInput.click();
                } else {
                    console.error('File input not found when trying to click');
                }
            });
        } else {
            console.warn('Upload button not found');
        }

        // Profile picture delete
        const deleteProfilePictureBtn = document.getElementById('deleteProfilePictureBtn');
        if (deleteProfilePictureBtn) {
            console.log('Delete button found, attaching click listener');
            deleteProfilePictureBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleProfilePictureDelete();
            });
        } else {
            console.log('Delete button not found (this is normal if no picture is uploaded)');
        }

        // Dark mode toggle
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', (e) => this.toggleDarkMode(e.target.checked));
        }

        // System preferences
        const currencySelect = document.getElementById('currencySelect');
        const timezoneSelect = document.getElementById('timezoneSelect');
        const taxRateInput = document.getElementById('taxRateInput');
        const languageSelect = document.getElementById('languageSelect');
        const dateFormatSelect = document.getElementById('dateFormatSelect');

        if (currencySelect) {
            currencySelect.addEventListener('change', (e) => {
                this.updatePreference('currency', e.target.value);
                this.showToast(`Currency changed to ${e.target.options[e.target.selectedIndex].text}`, 'success');
                this.logActivity(`Changed currency to ${e.target.value}`);
            });
        }

        if (timezoneSelect) {
            timezoneSelect.addEventListener('change', (e) => {
                this.updatePreference('timezone', e.target.value);
                this.showToast(`Timezone changed to ${e.target.options[e.target.selectedIndex].text}`, 'success');
                this.logActivity(`Changed timezone to ${e.target.value}`);
            });
        }

        if (taxRateInput) {
            taxRateInput.addEventListener('change', (e) => {
                this.updatePreference('taxRate', e.target.value);
                this.showToast(`Tax rate set to ${e.target.value}%`, 'success');
                this.logActivity(`Changed tax rate to ${e.target.value}%`);
            });
        }

        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.updatePreference('language', e.target.value);
                this.showToast(`Language changed to ${e.target.options[e.target.selectedIndex].text}`, 'success');
                this.logActivity(`Changed language to ${e.target.value}`);
            });
        }

        if (dateFormatSelect) {
            dateFormatSelect.addEventListener('change', (e) => {
                this.updatePreference('dateFormat', e.target.value);
                this.showToast(`Date format changed to ${e.target.value}`, 'success');
                this.logActivity(`Changed date format to ${e.target.value}`);
            });
        }

        // Notification preferences
        const notificationToggles = document.querySelectorAll('.notification-toggle');
        notificationToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.updateNotificationPreference(e.target.dataset.type, e.target.checked);
            });
        });
    }

    populateProfileForm() {
        if (!this.currentUser) return;

        // Basic profile fields
        const fields = {
            'profileName': this.currentUser.username || '',
            'profileEmail': this.currentUser.email || '',
            'profilePhone': this.currentUser.phone || '',
            'profileAddress': this.currentUser.address || '',
            'profileBusinessName': this.currentUser.business_name || '',
            'profileBio': this.currentUser.bio || ''
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) field.value = value;
        });

        // Update sidebar user info
        const nameElement = document.getElementById('profileUserName');
        const roleElement = document.getElementById('profileUserRole');

        if (nameElement) {
            nameElement.textContent = this.currentUser.business_name || this.currentUser.username || 'User';
        }
        if (roleElement && this.currentUser.role) {
            const role = this.currentUser.role.toLowerCase();
            roleElement.textContent = role.charAt(0).toUpperCase() + role.slice(1);
            roleElement.className = `user-role role-${role}`;
        }

        // Display profile picture
        this.displayProfilePicture();

        // Populate system preferences
        this.populatePreferences();
    }

    displayProfilePicture() {
        const profilePicturePreview = document.getElementById('profilePicturePreview');
        const profilePictureDisplay = document.getElementById('profilePictureDisplay');
        const headerProfilePicture = document.getElementById('headerProfilePicture');
        const deleteBtn = document.getElementById('deleteProfilePictureBtn');
        const placeholder = document.getElementById('profilePicturePlaceholder');
        const avatarInitials = document.getElementById('userAvatarInitials');
        const headerInitials = document.getElementById('userInitials');

        if (this.currentUser && this.currentUser.profilePicture) {
            // Display in form preview
            if (profilePicturePreview) {
                profilePicturePreview.src = this.currentUser.profilePicture;
                profilePicturePreview.style.display = 'block';
            }

            // Hide placeholder
            if (placeholder) {
                placeholder.style.display = 'none';
            }

            // Display in sidebar
            if (profilePictureDisplay) {
                profilePictureDisplay.src = this.currentUser.profilePicture;
                profilePictureDisplay.style.display = 'block';
            }

            // Hide sidebar initials
            if (avatarInitials) {
                avatarInitials.style.display = 'none';
            }

            // Display in header
            if (headerProfilePicture) {
                headerProfilePicture.src = this.currentUser.profilePicture;
                headerProfilePicture.style.display = 'block';
            }

            // Hide header initials
            if (headerInitials) {
                headerInitials.style.display = 'none';
            }

            // Show delete button
            if (deleteBtn) {
                deleteBtn.style.display = 'inline-block';
            }
        } else {
            // Show default avatar/placeholder
            if (profilePicturePreview) {
                profilePicturePreview.style.display = 'none';
            }

            if (placeholder) {
                placeholder.style.display = 'flex';
            }

            if (profilePictureDisplay) {
                profilePictureDisplay.style.display = 'none';
            }

            if (avatarInitials) {
                avatarInitials.style.display = 'flex';
            }

            if (headerProfilePicture) {
                headerProfilePicture.style.display = 'none';
            }

            if (headerInitials) {
                headerInitials.style.display = 'flex';
            }

            if (deleteBtn) {
                deleteBtn.style.display = 'none';
            }
        }
    }

    async handleProfilePictureUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            this.showToast('Image size must be less than 5MB', 'error');
            return;
        }

        try {
            this.showLoading(true);

            // Convert to base64
            const reader = new FileReader();
            reader.onload = async (event) => {
                const imageData = event.target.result;

                // Upload to server
                const token = localStorage.getItem('token');
                const response = await fetch(`${window.API_BASE_URL}/user/profile/picture`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ imageData })
                });

                const data = await response.json();

                if (data.success) {
                    // Update local storage
                    this.currentUser.profilePicture = imageData;
                    localStorage.setItem('user', JSON.stringify(this.currentUser));

                    // Update display
                    this.displayProfilePicture();

                    this.showToast('Profile picture uploaded successfully!', 'success');
                    this.logActivity('Updated profile picture');
                } else {
                    this.showToast(data.message || 'Failed to upload profile picture', 'error');
                }

                this.showLoading(false);
            };

            reader.onerror = () => {
                this.showToast('Failed to read image file', 'error');
                this.showLoading(false);
            };

            reader.readAsDataURL(file);

        } catch (error) {
            console.error('Profile picture upload error:', error);
            this.showToast('Failed to upload profile picture', 'error');
            this.showLoading(false);
        }
    }

    async handleProfilePictureDelete() {
        if (!confirm('Are you sure you want to delete your profile picture?')) {
            return;
        }

        try {
            this.showLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`${window.API_BASE_URL}/user/profile/picture`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                // Update local storage
                this.currentUser.profilePicture = null;
                localStorage.setItem('user', JSON.stringify(this.currentUser));

                // Update display
                this.displayProfilePicture();

                // Clear file input
                const fileInput = document.getElementById('profilePictureInput');
                if (fileInput) {
                    fileInput.value = '';
                }

                this.showToast('Profile picture deleted successfully!', 'success');
                this.logActivity('Deleted profile picture');
            } else {
                this.showToast(data.message || 'Failed to delete profile picture', 'error');
            }

        } catch (error) {
            console.error('Profile picture delete error:', error);
            this.showToast('Failed to delete profile picture', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    populatePreferences() {
        // Currency
        const currencySelect = document.getElementById('currencySelect');
        if (currencySelect && this.preferences.currency) {
            currencySelect.value = this.preferences.currency;
        }

        // Timezone
        const timezoneSelect = document.getElementById('timezoneSelect');
        if (timezoneSelect && this.preferences.timezone) {
            timezoneSelect.value = this.preferences.timezone;
        }

        // Tax Rate
        const taxRateInput = document.getElementById('taxRateInput');
        if (taxRateInput && this.preferences.taxRate) {
            taxRateInput.value = this.preferences.taxRate;
        }

        // Language
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect && this.preferences.language) {
            languageSelect.value = this.preferences.language;
        }

        // Date Format
        const dateFormatSelect = document.getElementById('dateFormatSelect');
        if (dateFormatSelect && this.preferences.dateFormat) {
            dateFormatSelect.value = this.preferences.dateFormat;
        }

        // Notification preferences
        if (this.preferences.notifications) {
            Object.entries(this.preferences.notifications).forEach(([type, enabled]) => {
                const toggle = document.querySelector(`.notification-toggle[data-type="${type}"]`);
                if (toggle) {
                    toggle.checked = enabled;
                }
            });
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        e.stopPropagation();

        // Prevent double submission
        if (this.isSubmitting) {
            console.log('Form already submitting, please wait...');
            return;
        }

        this.isSubmitting = true;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : '';

        const formData = new FormData(e.target);
        const updateData = {
            username: formData.get('name'),
            email: formData.get('email'),
            businessInfo: {
                phone: formData.get('phone'),
                address: formData.get('address'),
                business_name: formData.get('businessName')
            },
            bio: formData.get('bio')
        };

        try {
            this.showLoading(true);

            // Disable button and show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            }

            const token = localStorage.getItem('token');

            const response = await fetch(`${window.API_BASE_URL}/auth/update-profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();

            if (data.status === 'success') {
                // Update local storage with the user data from backend response
                const updatedUser = data.user || { ...this.currentUser, ...updateData };
                // Ensure flat structure for easy access
                updatedUser.phone = updatedUser.businessInfo?.phone || updatedUser.phone;
                updatedUser.address = updatedUser.businessInfo?.address || updatedUser.address;
                updatedUser.business_name = updatedUser.businessInfo?.business_name || updatedUser.business_name;
                
                localStorage.setItem('user', JSON.stringify(updatedUser));
                this.currentUser = updatedUser;

                this.showToast('Profile updated successfully!', 'success');
                this.logActivity('Profile information updated');

                // Update header display
                this.updateHeaderDisplay();

                // Show success state on button
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
                    setTimeout(() => {
                        submitBtn.innerHTML = originalBtnText;
                    }, 2000);
                }
            } else {
                this.showToast(data.message || 'Failed to update profile', 'error');
                if (submitBtn) {
                    submitBtn.innerHTML = originalBtnText;
                }
            }

        } catch (error) {
            console.error('Profile update error:', error);
            this.showToast('Failed to update profile', 'error');
            if (submitBtn) {
                submitBtn.innerHTML = originalBtnText;
            }
        } finally {
            this.showLoading(false);
            if (submitBtn) {
                submitBtn.disabled = false;
            }
            this.isSubmitting = false;
        }
    }

    async requestPasswordChangeVerification() {
        try {
            this.showLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`${window.API_BASE_URL}/auth/request-password-change-verification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.status === 'success') {
                this.showToast('✅ Verification code sent to your email!', 'success');

                // Show verification code input section
                const verificationSection = document.getElementById('verificationCodeSection');
                if (verificationSection) {
                    verificationSection.style.display = 'block';
                    verificationSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                // Start countdown timer
                this.startVerificationTimer();

                // Disable send button temporarily
                const sendBtn = document.getElementById('sendVerificationBtn');
                if (sendBtn) {
                    sendBtn.disabled = true;
                    sendBtn.innerHTML = '<i class="fas fa-check"></i> Code Sent';
                }

                this.logActivity('Requested password change verification');
            } else {
                this.showToast(data.message || 'Failed to send verification code', 'error');
            }

        } catch (error) {
            console.error('Verification request error:', error);
            this.showToast('Failed to send verification code', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    startVerificationTimer() {
        let timeLeft = 600; // 10 minutes in seconds
        const timerElement = document.getElementById('verificationTimer');
        const sendBtn = document.getElementById('sendVerificationBtn');

        if (!timerElement) return;

        const timer = setInterval(() => {
            timeLeft--;

            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            if (timeLeft <= 0) {
                clearInterval(timer);
                timerElement.textContent = 'Code expired';
                timerElement.style.color = 'var(--error)';

                // Re-enable send button
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = '<i class="fas fa-envelope"></i> Resend Code';
                }
            } else if (timeLeft <= 60) {
                timerElement.style.color = 'var(--warning)';
            }
        }, 1000);
    }

    async handlePasswordChange(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');
        const verificationCode = formData.get('verificationCode');

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showToast('All password fields are required', 'error');
            return;
        }

        if (!verificationCode) {
            this.showToast('Please request and enter the verification code sent to your email', 'error');

            // Highlight the send verification button
            const sendBtn = document.getElementById('sendVerificationBtn');
            if (sendBtn) {
                sendBtn.style.animation = 'pulse 0.5s ease-in-out 3';
                setTimeout(() => {
                    sendBtn.style.animation = '';
                }, 1500);
            }
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showToast('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 8) {
            this.showToast('New password must be at least 8 characters long', 'error');
            return;
        }

        // Password strength validation
        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasNumbers = /\d/.test(newPassword);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            this.showToast('Password must contain uppercase, lowercase, and numbers', 'error');
            return;
        }

        try {
            this.showLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`${window.API_BASE_URL}/auth/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    verificationCode
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                this.showToast('✅ Password changed successfully! Check your email for confirmation.', 'success');
                this.logActivity('Password changed');
                e.target.reset();

                // Hide verification section
                const verificationSection = document.getElementById('verificationCodeSection');
                if (verificationSection) {
                    verificationSection.style.display = 'none';
                }

                // Reset send button
                const sendBtn = document.getElementById('sendVerificationBtn');
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = '<i class="fas fa-envelope"></i> Send Verification Code';
                }

                // Show success message with email confirmation
                setTimeout(() => {
                    this.showToast('📧 Confirmation email sent to ' + this.currentUser.email, 'info');
                }, 2000);
            } else {
                this.showToast(data.message || 'Failed to change password', 'error');
            }

        } catch (error) {
            console.error('Password change error:', error);
            this.showToast('Failed to change password', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    toggleDarkMode(enabled) {
        const body = document.body;
        const themeIcon = document.querySelector('#themeToggle i');

        if (enabled) {
            body.classList.add('dark');
            if (themeIcon) themeIcon.className = 'fas fa-sun';
        } else {
            body.classList.remove('dark');
            if (themeIcon) themeIcon.className = 'fas fa-moon';
        }

        this.updatePreference('darkMode', enabled);
        localStorage.setItem('darkMode', enabled);
        this.logActivity(`Switched to ${enabled ? 'dark' : 'light'} mode`);
    }

    updatePreference(key, value) {
        this.preferences[key] = value;
        const userId = this.currentUser?.id || this.currentUser?.username || 'default';
        const prefsKey = `profilePreferences_${userId}`;
        localStorage.setItem(prefsKey, JSON.stringify(this.preferences));
    }

    updateNotificationPreference(type, enabled) {
        if (!this.preferences.notifications) {
            this.preferences.notifications = {};
        }
        this.preferences.notifications[type] = enabled;
        this.updatePreference('notifications', this.preferences.notifications);
        this.logActivity(`${enabled ? 'Enabled' : 'Disabled'} ${type} notifications`);
    }

    loadPreferences() {
        try {
            const userId = this.currentUser?.id || this.currentUser?.username || 'default';
            const prefsKey = `profilePreferences_${userId}`;
            const saved = localStorage.getItem(prefsKey);

            const defaults = {
                darkMode: false,
                currency: 'PHP',
                timezone: 'Asia/Manila',
                taxRate: 12,
                language: 'en',
                dateFormat: 'MM/DD/YYYY',
                notifications: {
                    email: true,
                    push: true,
                    sms: false,
                    orderUpdates: true,
                    promotions: true,
                    lowStock: true
                }
            };

            if (saved) {
                const savedPrefs = JSON.parse(saved);
                // Merge with defaults to ensure all keys exist
                return { ...defaults, ...savedPrefs };
            }

            return defaults;
        } catch (error) {
            console.error('Error loading preferences:', error);
            return {
                darkMode: false,
                currency: 'PHP',
                timezone: 'Asia/Manila',
                taxRate: 12,
                language: 'en',
                dateFormat: 'MM/DD/YYYY',
                notifications: {}
            };
        }
    }

    applyThemePreference() {
        const darkMode = this.preferences.darkMode || localStorage.getItem('darkMode') === 'true';
        const toggle = document.getElementById('darkModeToggle');

        if (toggle) {
            toggle.checked = darkMode;
        }

        if (darkMode) {
            document.body.classList.add('dark');
        }
    }

    logActivity(action) {
        const activity = {
            id: Date.now(),
            action,
            timestamp: new Date().toISOString(),
            user: this.currentUser?.username || 'Unknown'
        };

        this.activityLog.unshift(activity);

        // Keep only last 50 activities
        if (this.activityLog.length > 50) {
            this.activityLog = this.activityLog.slice(0, 50);
        }

        // Save to localStorage
        const userId = this.currentUser?.id || this.currentUser?.username || 'default';
        const logKey = `activityLog_${userId}`;
        localStorage.setItem(logKey, JSON.stringify(this.activityLog));

        this.renderActivityLog();
    }

    loadActivityLog() {
        try {
            const userId = this.currentUser?.id || this.currentUser?.username || 'default';
            const logKey = `activityLog_${userId}`;
            const saved = localStorage.getItem(logKey);
            this.activityLog = saved ? JSON.parse(saved) : [];
            this.renderActivityLog();
        } catch (error) {
            console.error('Error loading activity log:', error);
            this.activityLog = [];
        }
    }

    renderActivityLog() {
        const container = document.getElementById('activityLogList');
        if (!container) return;

        if (this.activityLog.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i class="fas fa-history" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p>No activity recorded yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.activityLog.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${this.getActivityIcon(activity.action)}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-action">${activity.action}</div>
                    <div class="activity-time">${this.formatActivityTime(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(action) {
        const iconMap = {
            'login': 'fa-sign-in-alt',
            'logout': 'fa-sign-out-alt',
            'Profile information updated': 'fa-user-edit',
            'Password changed': 'fa-key',
            'Switched to dark mode': 'fa-moon',
            'Switched to light mode': 'fa-sun',
            'Requested password change verification': 'fa-envelope'
        };
        return iconMap[action] || 'fa-circle';
    }

    formatActivityTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    }

    clearActivityLog() {
        if (confirm('Are you sure you want to clear your activity log? This action cannot be undone.')) {
            this.activityLog = [];
            const userId = this.currentUser?.id || this.currentUser?.username || 'default';
            const logKey = `activityLog_${userId}`;
            localStorage.removeItem(logKey);
            this.renderActivityLog();
            this.showToast('Activity log cleared', 'success');
        }
    }

    exportUserData() {
        const exportData = {
            profile: this.currentUser,
            preferences: this.preferences,
            activityLog: this.activityLog,
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `user-data-${this.currentUser?.username || 'export'}-${Date.now()}.json`;
        link.click();

        URL.revokeObjectURL(url);
        this.showToast('User data exported successfully', 'success');
        this.logActivity('Exported user data');
    }

    updateHeaderDisplay() {
        // Update header username display
        const headerUsername = document.querySelector('.user-info .user-name');
        if (headerUsername && this.currentUser) {
            headerUsername.textContent = this.currentUser.business_name || this.currentUser.username;
        }
    }

    showToast(message, type = 'info') {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    showLoading(show) {
        if (show) {
            if (typeof showLoading === 'function') {
                showLoading();
            }
        } else {
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
        }
    }

    // Helper methods to use preferences
    getCurrency() {
        return this.preferences.currency || 'PHP';
    }

    getCurrencySymbol() {
        const symbols = {
            'PHP': '₱',
            'USD': '$',
            'EUR': '€',
            'GBP': '£'
        };
        return symbols[this.getCurrency()] || '₱';
    }

    getTimezone() {
        return this.preferences.timezone || 'Asia/Manila';
    }

    getTaxRate() {
        return parseFloat(this.preferences.taxRate) || 12;
    }

    getLanguage() {
        return this.preferences.language || 'en';
    }

    getDateFormat() {
        return this.preferences.dateFormat || 'MM/DD/YYYY';
    }

    formatCurrency(amount) {
        const symbol = this.getCurrencySymbol();
        const formatted = parseFloat(amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return `${symbol}${formatted}`;
    }

    formatDate(date) {
        const d = new Date(date);
        const format = this.getDateFormat();

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        switch (format) {
            case 'DD/MM/YYYY':
                return `${day}/${month}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'MM/DD/YYYY':
            default:
                return `${month}/${day}/${year}`;
        }
    }

    calculateTax(amount) {
        const taxRate = this.getTaxRate();
        return (parseFloat(amount) * taxRate) / 100;
    }

    calculateTotal(subtotal) {
        const tax = this.calculateTax(subtotal);
        return parseFloat(subtotal) + tax;
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('profileSettingsPanel')) {
        window.profileSettingsManager = new ProfileSettingsManager();
        window.profileManager = window.profileSettingsManager; // Backward compatibility
    }
});

// Global UI functions
function openProfileSettings() {
    const panel = document.getElementById('profileSettingsPanel');
    if (panel) {
        panel.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Refresh user data
        if (window.profileManager) {
            window.profileManager.loadUserData();
        }
    }
}

function closeProfileSettings() {
    const panel = document.getElementById('profileSettingsPanel');
    if (panel) {
        panel.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function switchProfileTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.profile-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all tabs
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab content
    const targetContent = document.getElementById(`${tabName}Tab`);
    if (targetContent) {
        targetContent.classList.add('active');
    }

    // Add active class to clicked tab
    const targetTab = document.querySelector(`[onclick="switchProfileTab('${tabName}')"]`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

function togglePasswordVisibility(fieldId) {
    const field = document.getElementById(fieldId);
    const toggle = field?.nextElementSibling?.querySelector('i');

    if (field && toggle) {
        if (field.type === 'password') {
            field.type = 'text';
            toggle.className = 'fas fa-eye-slash';
        } else {
            field.type = 'password';
            toggle.className = 'fas fa-eye';
        }
    }
}
