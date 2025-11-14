// Admin Loyalty Management Module

// Load loyalty statistics
async function loadLoyaltyStats() {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/rewards/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load stats');

        const data = await response.json();
        hideLoading();
        renderLoyaltyStats(data.stats);
    } catch (error) {
        hideLoading();
        console.error('Error loading loyalty stats:', error);
        showToast('Failed to load loyalty statistics', 'error');
    }
}

// Render loyalty statistics
function renderLoyaltyStats(stats) {
    const container = document.getElementById('loyaltyStatsContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="stats-overview">
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-users"></i></div>
                <div class="stat-info">
                    <div class="stat-value">${stats.totalUsers}</div>
                    <div class="stat-label">Total Clients</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-star"></i></div>
                <div class="stat-info">
                    <div class="stat-value">${stats.usersWithPoints}</div>
                    <div class="stat-label">Clients with Points</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-coins"></i></div>
                <div class="stat-info">
                    <div class="stat-value">${stats.totalPointsDistributed.toLocaleString()}</div>
                    <div class="stat-label">Total Points</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-gift"></i></div>
                <div class="stat-info">
                    <div class="stat-value">${stats.totalClaims}</div>
                    <div class="stat-label">Total Claims</div>
                </div>
            </div>
        </div>

        <div class="loyalty-sections">
            <div class="section">
                <h3>Top Clients by Points</h3>
                <p style="color: #718096; font-size: 0.9rem; margin-bottom: 1rem;">
                    <i class="fas fa-info-circle"></i> Only client accounts participate in the loyalty program
                </p>
                <div class="top-users-list">
                    ${stats.topUsers.map((user, index) => `
                        <div class="top-user-item">
                            <span class="rank">#${index + 1}</span>
                            <div class="user-info">
                                <strong>${user.username}</strong>
                                <small>${user.email}</small>
                            </div>
                            <span class="user-points">${user.loyaltyPoints} pts</span>
                            <button class="btn btn-sm btn-secondary" onclick="showAdjustPointsModal('${user._id}', '${user.username}', ${user.loyaltyPoints})">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="section">
                <h3>Reward Statistics</h3>
                <div class="reward-stats-list">
                    ${stats.rewardStats.map(stat => `
                        <div class="reward-stat-item">
                            <div class="reward-name">${stat.rewardInfo.name}</div>
                            <div class="reward-metrics">
                                <span><i class="fas fa-gift"></i> ${stat.totalClaims} claims</span>
                                <span><i class="fas fa-coins"></i> ${stat.totalPointsSpent} pts spent</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="actions-section">
            <button class="btn btn-primary" onclick="showManageRewardsModal()">
                <i class="fas fa-cog"></i> Manage Rewards
            </button>
            <button class="btn btn-secondary" onclick="showAllClaimsModal()">
                <i class="fas fa-list"></i> View All Claims
            </button>
            <button class="btn btn-info" onclick="loadLoyaltyStats()">
                <i class="fas fa-sync"></i> Refresh
            </button>
        </div>
    `;
}

// Show adjust points modal
function showAdjustPointsModal(userId, username, currentPoints) {
    const modalHTML = `
        <div id="adjustPointsModal" class="modal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-coins"></i> Adjust Points for ${username}</h3>
                    <button class="close-btn" onclick="closeAdjustPointsModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Current Points: <strong>${currentPoints}</strong></p>
                    <form id="adjustPointsForm" onsubmit="handleAdjustPoints(event, '${userId}')">
                        <div class="form-group">
                            <label>Points to Add/Remove</label>
                            <input type="number" name="points" required placeholder="Use negative for removal">
                            <small>Example: 100 to add, -50 to remove</small>
                        </div>
                        <div class="form-group">
                            <label>Reason</label>
                            <textarea name="reason" rows="3" required placeholder="Why are you adjusting points?"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-check"></i> Adjust Points
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="closeAdjustPointsModal()">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('adjustPointsModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close adjust points modal
function closeAdjustPointsModal() {
    const modal = document.getElementById('adjustPointsModal');
    if (modal) modal.remove();
}

// Handle adjust points
async function handleAdjustPoints(event, userId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const points = parseInt(formData.get('points'));
    const reason = formData.get('reason');

    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/rewards/admin/adjust-points`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, points, reason })
        });

        const data = await response.json();
        hideLoading();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to adjust points');
        }

        showToast(data.message, 'success');
        closeAdjustPointsModal();
        loadLoyaltyStats();
    } catch (error) {
        hideLoading();
        console.error('Error adjusting points:', error);
        showToast(error.message, 'error');
    }
}

// Show manage rewards modal
async function showManageRewardsModal() {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/rewards/admin/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load rewards');

        const data = await response.json();
        hideLoading();

        const modalHTML = `
            <div id="manageRewardsModal" class="modal" style="display: flex;">
                <div class="modal-content large-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-cog"></i> Manage Rewards</h3>
                        <button class="close-btn" onclick="closeManageRewardsModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <button class="btn btn-primary mb-3" onclick="showCreateRewardForm()">
                            <i class="fas fa-plus"></i> Create New Reward
                        </button>
                        
                        <div class="rewards-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Points</th>
                                        <th>Type</th>
                                        <th>Value</th>
                                        <th>Status</th>
                                        <th>Claims</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.rewards.map(reward => `
                                        <tr>
                                            <td>${reward.name}</td>
                                            <td>${reward.pointsRequired}</td>
                                            <td>${reward.rewardType}</td>
                                            <td>₱${reward.rewardValue}</td>
                                            <td>
                                                <span class="badge ${reward.isActive ? 'badge-success' : 'badge-danger'}">
                                                    ${reward.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td>${reward.totalClaimed}</td>
                                            <td>
                                                <button class="btn btn-sm btn-secondary" onclick="editReward('${reward._id}')">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-sm btn-danger" onclick="deleteReward('${reward._id}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('manageRewardsModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } catch (error) {
        hideLoading();
        console.error('Error loading rewards:', error);
        showToast('Failed to load rewards', 'error');
    }
}

// Close manage rewards modal
function closeManageRewardsModal() {
    const modal = document.getElementById('manageRewardsModal');
    if (modal) modal.remove();
}

// Show all claims modal
async function showAllClaimsModal() {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/rewards/admin/claims`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load claims');

        const data = await response.json();
        hideLoading();

        const modalHTML = `
            <div id="allClaimsModal" class="modal" style="display: flex;">
                <div class="modal-content large-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-list"></i> All Reward Claims</h3>
                        <button class="close-btn" onclick="closeAllClaimsModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="claims-filters" style="margin-bottom: 1.5rem;">
                            <button class="btn btn-sm ${!window.claimsFilter ? 'btn-primary' : 'btn-secondary'}" onclick="filterClaims('')">
                                All (${data.claims.length})
                            </button>
                            <button class="btn btn-sm ${window.claimsFilter === 'active' ? 'btn-primary' : 'btn-secondary'}" onclick="filterClaims('active')">
                                Active (${data.claims.filter(c => c.status === 'active').length})
                            </button>
                            <button class="btn btn-sm ${window.claimsFilter === 'used' ? 'btn-primary' : 'btn-secondary'}" onclick="filterClaims('used')">
                                Used (${data.claims.filter(c => c.status === 'used').length})
                            </button>
                            <button class="btn btn-sm ${window.claimsFilter === 'expired' ? 'btn-primary' : 'btn-secondary'}" onclick="filterClaims('expired')">
                                Expired (${data.claims.filter(c => c.status === 'expired').length})
                            </button>
                        </div>
                        
                        <div class="claims-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Reward</th>
                                        <th>Voucher Code</th>
                                        <th>Points Spent</th>
                                        <th>Status</th>
                                        <th>Claimed</th>
                                        <th>Expires</th>
                                    </tr>
                                </thead>
                                <tbody id="claimsTableBody">
                                    ${renderClaimsTable(data.claims)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('allClaimsModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        window.allClaimsData = data.claims;
    } catch (error) {
        hideLoading();
        console.error('Error loading claims:', error);
        showToast('Failed to load claims', 'error');
    }
}

// Render claims table
function renderClaimsTable(claims) {
    if (!claims || claims.length === 0) {
        return '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #a0aec0;">No claims found</td></tr>';
    }

    return claims.map(claim => {
        const expiresAt = new Date(claim.expiresAt);
        const claimedAt = new Date(claim.claimedAt);
        
        return `
            <tr>
                <td>
                    <strong>${claim.user?.username || 'Unknown'}</strong><br>
                    <small style="color: #718096;">${claim.user?.email || ''}</small>
                </td>
                <td>${claim.reward?.name || 'Unknown'}</td>
                <td>
                    <code style="background: #f7fafc; padding: 0.25rem 0.5rem; border-radius: 4px;">
                        ${claim.voucherCode}
                    </code>
                </td>
                <td>${claim.pointsSpent} pts</td>
                <td>
                    <span class="badge badge-${claim.status}">
                        ${claim.status}
                    </span>
                </td>
                <td>${claimedAt.toLocaleDateString()}</td>
                <td>${expiresAt.toLocaleDateString()}</td>
            </tr>
        `;
    }).join('');
}

// Filter claims
function filterClaims(status) {
    window.claimsFilter = status;
    const allClaims = window.allClaimsData || [];
    const filtered = status ? allClaims.filter(c => c.status === status) : allClaims;
    
    const tbody = document.getElementById('claimsTableBody');
    if (tbody) {
        tbody.innerHTML = renderClaimsTable(filtered);
    }
    
    // Update button states
    document.querySelectorAll('.claims-filters .btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    });
    event.target.classList.remove('btn-secondary');
    event.target.classList.add('btn-primary');
}

// Close all claims modal
function closeAllClaimsModal() {
    const modal = document.getElementById('allClaimsModal');
    if (modal) modal.remove();
    window.allClaimsData = null;
    window.claimsFilter = null;
}

// Show create reward form
function showCreateRewardForm() {
    const formHTML = `
        <div id="createRewardForm" style="margin-top: 2rem; padding: 1.5rem; background: #f7fafc; border-radius: 10px;">
            <h4>Create New Reward</h4>
            <form onsubmit="handleCreateReward(event)">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Reward Name *</label>
                        <input type="text" name="name" required placeholder="e.g., ₱50 OFF">
                    </div>
                    <div class="form-group">
                        <label>Points Required *</label>
                        <input type="number" name="pointsRequired" required min="1" placeholder="500">
                    </div>
                    <div class="form-group">
                        <label>Reward Type *</label>
                        <select name="rewardType" required>
                            <option value="discount">Discount</option>
                            <option value="free_delivery">Free Delivery</option>
                            <option value="product">Product</option>
                            <option value="voucher">Voucher</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Reward Value (₱) *</label>
                        <input type="number" name="rewardValue" required min="0" placeholder="50">
                    </div>
                    <div class="form-group">
                        <label>Icon</label>
                        <input type="text" name="icon" placeholder="gift, star, trophy, etc.">
                    </div>
                    <div class="form-group">
                        <label>Expiry Days *</label>
                        <input type="number" name="expiryDays" required min="1" value="30">
                    </div>
                    <div class="form-group">
                        <label>Max Redemptions per User</label>
                        <input type="number" name="maxRedemptions" min="1" placeholder="Leave empty for unlimited">
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select name="isActive">
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Description *</label>
                    <textarea name="description" required rows="3" placeholder="Describe the reward..."></textarea>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Create Reward
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="hideCreateRewardForm()">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `;
    
    const existingForm = document.getElementById('createRewardForm');
    if (existingForm) {
        existingForm.remove();
    } else {
        const container = document.querySelector('#manageRewardsModal .modal-body');
        if (container) {
            container.insertAdjacentHTML('afterbegin', formHTML);
        }
    }
}

// Hide create reward form
function hideCreateRewardForm() {
    const form = document.getElementById('createRewardForm');
    if (form) form.remove();
}

// Handle create reward
async function handleCreateReward(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const rewardData = {
        name: formData.get('name'),
        description: formData.get('description'),
        pointsRequired: parseInt(formData.get('pointsRequired')),
        rewardType: formData.get('rewardType'),
        rewardValue: parseFloat(formData.get('rewardValue')),
        icon: formData.get('icon') || 'gift',
        expiryDays: parseInt(formData.get('expiryDays')),
        maxRedemptions: formData.get('maxRedemptions') ? parseInt(formData.get('maxRedemptions')) : null,
        isActive: formData.get('isActive') === 'true'
    };

    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/rewards/admin/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rewardData)
        });

        const data = await response.json();
        hideLoading();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to create reward');
        }

        showToast(data.message, 'success');
        hideCreateRewardForm();
        closeManageRewardsModal();
        showManageRewardsModal(); // Refresh the list
    } catch (error) {
        hideLoading();
        console.error('Error creating reward:', error);
        showToast(error.message, 'error');
    }
}

// Edit reward
async function editReward(rewardId) {
    showToast('Edit reward feature - Coming soon!', 'info');
}

// Delete reward
async function deleteReward(rewardId) {
    if (!confirm('Are you sure you want to delete this reward? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/rewards/admin/${rewardId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        hideLoading();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete reward');
        }

        showToast(data.message, 'success');
        closeManageRewardsModal();
        showManageRewardsModal(); // Refresh the list
    } catch (error) {
        hideLoading();
        console.error('Error deleting reward:', error);
        showToast(error.message, 'error');
    }
}

// Show admin loyalty panel (full screen)
function showAdminLoyaltyPanel() {
    const modalHTML = `
        <div id="adminLoyaltyPanel" class="modal" style="display: flex;">
            <div class="modal-content large-modal" style="max-width: 1200px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3><i class="fas fa-chart-line"></i> Loyalty Management Dashboard</h3>
                    <button class="close-btn" onclick="closeAdminLoyaltyPanel()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div id="loyaltyStatsContainer">
                        <p class="loading-text">Loading loyalty statistics...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingPanel = document.getElementById('adminLoyaltyPanel');
    if (existingPanel) existingPanel.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    loadLoyaltyStats();
}

// Close admin loyalty panel
function closeAdminLoyaltyPanel() {
    const panel = document.getElementById('adminLoyaltyPanel');
    if (panel) panel.remove();
}

// Make functions globally available
window.showAdminLoyaltyPanel = showAdminLoyaltyPanel;
window.closeAdminLoyaltyPanel = closeAdminLoyaltyPanel;
window.loadLoyaltyStats = loadLoyaltyStats;
window.showAdjustPointsModal = showAdjustPointsModal;
window.closeAdjustPointsModal = closeAdjustPointsModal;
window.handleAdjustPoints = handleAdjustPoints;
window.showManageRewardsModal = showManageRewardsModal;
window.closeManageRewardsModal = closeManageRewardsModal;
window.showAllClaimsModal = showAllClaimsModal;
window.closeAllClaimsModal = closeAllClaimsModal;
window.filterClaims = filterClaims;
window.showCreateRewardForm = showCreateRewardForm;
window.hideCreateRewardForm = hideCreateRewardForm;
window.handleCreateReward = handleCreateReward;
window.editReward = editReward;
window.deleteReward = deleteReward;
