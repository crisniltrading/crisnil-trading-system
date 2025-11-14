// Loyalty Rewards Module

// Load available rewards
async function loadLoyaltyRewards() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Please login to view rewards', 'error');
            return;
        }

        // Check if user is a client
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const userRole = (currentUser?.role || 'client').toLowerCase();
        
        if (userRole !== 'client') {
            const container = document.getElementById('loyaltyRewardsContainer');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-shield"></i>
                        <h3>Admin/Staff Account</h3>
                        <p>Loyalty rewards are only available for client accounts.</p>
                        <p>Use the "Loyalty Management" option to manage the rewards system.</p>
                    </div>
                `;
            }
            return;
        }

        const response = await fetch(`${API_BASE_URL}/rewards/available`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to load rewards');
        }

        const data = await response.json();
        renderLoyaltyRewards(data);
    } catch (error) {
        console.error('Error loading rewards:', error);
        showToast(error.message || 'Failed to load rewards', 'error');
    }
}

// Render loyalty rewards
function renderLoyaltyRewards(data) {
    const container = document.getElementById('loyaltyRewardsContainer');
    if (!container) return;

    const { userPoints, rewards } = data;

    container.innerHTML = `
        <div class="loyalty-header">
            <div class="points-display">
                <div class="points-circle">
                    <div class="points-value">${userPoints}</div>
                    <div class="points-label">Available Points</div>
                </div>
                <p class="points-info">Earn 1 point for every ₱10 spent</p>
            </div>
        </div>

        <div class="rewards-section">
            <h3>Available Rewards</h3>
            <div class="rewards-grid">
                ${rewards.map(reward => `
                    <div class="reward-card ${reward.canClaim ? 'can-claim' : 'locked'}">
                        <div class="reward-icon">
                            <i class="fas fa-${reward.icon}"></i>
                        </div>
                        <h4>${reward.name}</h4>
                        <p class="reward-description">${reward.description}</p>
                        <div class="reward-points">
                            <span class="points-required">${reward.pointsRequired} pts</span>
                            ${!reward.canClaim && reward.pointsNeeded > 0 ? `
                                <span class="points-needed">${reward.pointsNeeded} more pts</span>
                            ` : ''}
                        </div>
                        ${reward.maxRedemptions !== null ? `
                            <p class="reward-limit">Claimed ${reward.timesClaimed}/${reward.maxRedemptions} times</p>
                        ` : ''}
                        <button 
                            class="btn ${reward.canClaim ? 'btn-primary' : 'btn-disabled'}" 
                            onclick="claimReward('${reward._id}')"
                            ${!reward.canClaim ? 'disabled' : ''}
                        >
                            ${reward.canClaim ? 'Claim Reward' : 'Locked'}
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="my-rewards-section">
            <h3>My Claimed Rewards</h3>
            <div id="myClaimsContainer">
                <p class="loading-text">Loading your rewards...</p>
            </div>
        </div>
    `;

    // Load user's claimed rewards
    loadMyClaims();
}

// Claim a reward
async function claimReward(rewardId) {
    try {
        showLoading();
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/rewards/claim`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rewardId })
        });

        const data = await response.json();
        hideLoading();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to claim reward');
        }

        // Show success animation
        showSuccessAnimation(data.claim);
        
        // Update user points in localStorage
        if (window.currentUser) {
            window.currentUser.loyaltyPoints = data.remainingPoints;
            localStorage.setItem('user', JSON.stringify(window.currentUser));
        }

        // Reload rewards after a short delay
        setTimeout(() => {
            loadLoyaltyRewards();
        }, 1500);
    } catch (error) {
        hideLoading();
        console.error('Error claiming reward:', error);
        showToast(error.message, 'error');
    }
}

// Show success animation
function showSuccessAnimation(claim) {
    const animationHTML = `
        <div id="rewardSuccessAnimation" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        ">
            <div style="
                background: white;
                padding: 3rem;
                border-radius: 20px;
                text-align: center;
                max-width: 400px;
                animation: scaleIn 0.5s ease;
            ">
                <div style="
                    width: 100px;
                    height: 100px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                    animation: bounce 0.6s ease;
                ">
                    <i class="fas fa-check" style="font-size: 3rem; color: white;"></i>
                </div>
                <h2 style="color: #2d3748; margin-bottom: 1rem;">Reward Claimed!</h2>
                <p style="color: #718096; margin-bottom: 1rem;">${claim.reward.name}</p>
                <div style="
                    background: #f7fafc;
                    padding: 1rem;
                    border-radius: 10px;
                    font-family: 'Courier New', monospace;
                    font-weight: 600;
                    color: #667eea;
                    margin-bottom: 1rem;
                ">
                    ${claim.voucherCode}
                </div>
                <p style="color: #718096; font-size: 0.9rem;">
                    Your voucher code has been saved to "My Claimed Rewards"
                </p>
            </div>
        </div>
        <style>
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes scaleIn {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            @keyframes bounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
        </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', animationHTML);
    
    // Auto-close after 3 seconds
    setTimeout(() => {
        const animation = document.getElementById('rewardSuccessAnimation');
        if (animation) {
            animation.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => animation.remove(), 300);
        }
    }, 3000);
    
    // Click to close
    document.getElementById('rewardSuccessAnimation').addEventListener('click', function() {
        this.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => this.remove(), 300);
    });
}

// Load user's claimed rewards
async function loadMyClaims() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/rewards/my-claims`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load claims');

        const data = await response.json();
        renderMyClaims(data.claims);
    } catch (error) {
        console.error('Error loading claims:', error);
        const container = document.getElementById('myClaimsContainer');
        if (container) {
            container.innerHTML = '<p class="error-text">Failed to load your rewards</p>';
        }
    }
}

// Render user's claimed rewards
function renderMyClaims(claims) {
    const container = document.getElementById('myClaimsContainer');
    if (!container) return;

    if (!claims || claims.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-gift"></i>
                <p>You haven't claimed any rewards yet</p>
            </div>
        `;
        return;
    }

    const activeClaims = claims.filter(c => c.status === 'active');
    const usedClaims = claims.filter(c => c.status === 'used');
    const expiredClaims = claims.filter(c => c.status === 'expired');

    container.innerHTML = `
        ${activeClaims.length > 0 ? `
            <div class="claims-group">
                <h4>Active Rewards</h4>
                <div class="claims-list">
                    ${activeClaims.map(claim => renderClaimCard(claim)).join('')}
                </div>
            </div>
        ` : ''}
        
        ${usedClaims.length > 0 ? `
            <div class="claims-group">
                <h4>Used Rewards</h4>
                <div class="claims-list">
                    ${usedClaims.map(claim => renderClaimCard(claim)).join('')}
                </div>
            </div>
        ` : ''}
        
        ${expiredClaims.length > 0 ? `
            <div class="claims-group">
                <h4>Expired Rewards</h4>
                <div class="claims-list">
                    ${expiredClaims.map(claim => renderClaimCard(claim)).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

// Render individual claim card
function renderClaimCard(claim) {
    const expiresAt = new Date(claim.expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    
    return `
        <div class="claim-card ${claim.status}">
            <div class="claim-header">
                <h5>${claim.reward.name}</h5>
                <span class="claim-status status-${claim.status}">${claim.status}</span>
            </div>
            <p class="claim-description">${claim.reward.description}</p>
            <div class="claim-details">
                <div class="claim-code">
                    <strong>Code:</strong> ${claim.voucherCode}
                    <button class="btn-copy" onclick="copyVoucherCode('${claim.voucherCode}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                ${claim.status === 'active' ? `
                    <p class="claim-expiry ${daysLeft <= 3 ? 'expiring-soon' : ''}">
                        <i class="fas fa-clock"></i>
                        Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}
                    </p>
                ` : claim.status === 'used' ? `
                    <p class="claim-used">
                        <i class="fas fa-check-circle"></i>
                        Used on ${new Date(claim.usedAt).toLocaleDateString()}
                    </p>
                ` : `
                    <p class="claim-expired">
                        <i class="fas fa-times-circle"></i>
                        Expired on ${expiresAt.toLocaleDateString()}
                    </p>
                `}
            </div>
        </div>
    `;
}

// Copy voucher code
function copyVoucherCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showToast('Voucher code copied!', 'success');
    }).catch(() => {
        showToast('Failed to copy code', 'error');
    });
}

// Show loyalty rewards modal
function showLoyaltyRewardsModal() {
    const modalHTML = `
        <div id="loyaltyRewardsModal" class="modal" style="display: flex;">
            <div class="modal-content loyalty-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-gift"></i> Your Loyalty Rewards</h3>
                    <button class="close-btn" onclick="closeLoyaltyRewardsModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div id="loyaltyRewardsContainer"></div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('loyaltyRewardsModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    loadLoyaltyRewards();
}

// Close loyalty rewards modal
function closeLoyaltyRewardsModal() {
    const modal = document.getElementById('loyaltyRewardsModal');
    if (modal) modal.remove();
}

// Make functions globally available
window.showLoyaltyRewardsModal = showLoyaltyRewardsModal;
window.closeLoyaltyRewardsModal = closeLoyaltyRewardsModal;
window.claimReward = claimReward;
window.copyVoucherCode = copyVoucherCode;
