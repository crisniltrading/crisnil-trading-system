// Profile Settings Initialization Script
// Connects enhanced profile system with existing application

(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProfileSettings);
    } else {
        // Delay initialization to ensure all scripts are loaded
        setTimeout(initProfileSettings, 100);
    }

    function initProfileSettings() {
        console.log('🎨 Initializing Profile Settings...');

        // Skip enhanced manager for now - use existing profile-settings.js
        console.log('✅ Using existing ProfileSettingsManager');

        // Add profile button to header if not exists
        try {
            addProfileButtonToHeader();
        } catch (error) {
            console.error('Error adding profile button:', error);
        }

        // Setup keyboard shortcuts
        try {
            setupKeyboardShortcuts();
        } catch (error) {
            console.error('Error setting up keyboard shortcuts:', error);
        }

        console.log('✅ Profile Settings ready!');
    }

    function addProfileButtonToHeader() {
        // Check if user is logged in
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user) return;

        // Find user menu or header
        const userMenu = document.querySelector('.user-profile, .user-menu, .header-right');
        if (!userMenu) return;

        // Check if button already exists
        if (document.getElementById('openProfileBtn')) return;

        // Create profile button
        const profileBtn = document.createElement('button');
        profileBtn.id = 'openProfileBtn';
        profileBtn.className = 'icon-btn';
        profileBtn.title = 'Profile & Settings';
        profileBtn.innerHTML = '<i class="fas fa-user-cog"></i>';
        profileBtn.onclick = openEnhancedProfile;

        // Add to header
        userMenu.appendChild(profileBtn);
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + K to open profile (if function exists)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (typeof openProfileSettings === 'function') {
                    openProfileSettings();
                }
            }

            // Escape to close profile
            if (e.key === 'Escape') {
                if (typeof closeProfileSettings === 'function') {
                    closeProfileSettings();
                }
            }
        });
    }

})();

// Global functions for opening/closing profile panel
// These will be defined by profile-settings-tabs.js
// This file just ensures they're called correctly

// Compatibility layer for old profile functions
if (typeof openProfileSettings === 'undefined') {
    window.openProfileSettings = function() {
        // Will be implemented by profile-settings-tabs.js
        console.log('Opening profile settings...');
    };
}

if (typeof closeProfileSettings === 'undefined') {
    window.closeProfileSettings = function() {
        // Will be implemented by profile-settings-tabs.js
        console.log('Closing profile settings...');
    };
}
