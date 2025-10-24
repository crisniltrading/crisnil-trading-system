// Product Reviews & Ratings System

// Global state for reviews
let currentProductReviews = [];
let userReviews = [];

/**
 * Display product reviews on product detail view
 */
async function displayProductReviews(productId) {
  try {
    const response = await fetch(`${API_BASE_URL}/reviews/product/${productId}`);

    // Check if response is ok before parsing
    if (!response.ok) {
      console.log('Reviews endpoint not available or product has no reviews yet');
      // Show a placeholder message
      const ratingSummary = document.getElementById('ratingSummary');
      const reviewsList = document.getElementById('reviewsList');
      if (ratingSummary) {
        ratingSummary.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">No reviews yet</p>';
      }
      if (reviewsList) {
        reviewsList.innerHTML = '';
      }
      return;
    }

    const data = await response.json();

    if (data.success) {
      currentProductReviews = data.data.reviews;
      const stats = data.data.stats;

      // Display rating summary
      displayRatingSummary(stats);

      // Display reviews list
      displayReviewsList(data.data.reviews);
    }
  } catch (error) {
    console.log('Reviews feature not available:', error.message);
    // Silently handle the error with a graceful fallback
    const ratingSummary = document.getElementById('ratingSummary');
    const reviewsList = document.getElementById('reviewsList');
    if (ratingSummary) {
      ratingSummary.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">Reviews are currently unavailable</p>';
    }
    if (reviewsList) {
      reviewsList.innerHTML = '';
    }
  }
}

/**
 * Display rating summary with stars and distribution
 */
function displayRatingSummary(stats) {
  const summaryHTML = `
    <div class="rating-summary" style="background: var(--card-bg); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
      <div style="display: flex; gap: 2rem; align-items: center; flex-wrap: wrap;">
        <div style="text-align: center;">
          <div style="font-size: 3rem; font-weight: bold; color: var(--primary);">
            ${stats.averageRating.toFixed(1)}
          </div>
          <div style="margin: 0.5rem 0;">
            ${generateStars(stats.averageRating)}
          </div>
          <div style="color: var(--text-muted); font-size: 0.9rem;">
            ${stats.totalReviews} ${stats.totalReviews === 1 ? 'review' : 'reviews'}
          </div>
        </div>
        
        <div style="flex: 1; min-width: 200px;">
          ${generateRatingDistribution(stats.distribution, stats.totalReviews)}
        </div>
      </div>
    </div>
  `;

  const container = document.getElementById('ratingSummary');
  if (container) {
    container.innerHTML = summaryHTML;
  }
}

/**
 * Generate star rating display
 */
function generateStars(rating, size = '1rem') {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let starsHTML = '';

  // Full stars
  for (let i = 0; i < fullStars; i++) {
    starsHTML += `<i class="fas fa-star" style="color: #ffc107; font-size: ${size};"></i>`;
  }

  // Half star
  if (hasHalfStar) {
    starsHTML += `<i class="fas fa-star-half-alt" style="color: #ffc107; font-size: ${size};"></i>`;
  }

  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += `<i class="far fa-star" style="color: #ffc107; font-size: ${size};"></i>`;
  }

  return starsHTML;
}

/**
 * Generate rating distribution bars
 */
function generateRatingDistribution(distribution, total) {
  let html = '';

  for (let i = 5; i >= 1; i--) {
    const count = distribution[i] || 0;
    const percentage = total > 0 ? (count / total) * 100 : 0;

    html += `
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <span style="width: 60px; font-size: 0.9rem;">${i} stars</span>
        <div style="flex: 1; height: 8px; background: var(--background); border-radius: 4px; overflow: hidden;">
          <div style="width: ${percentage}%; height: 100%; background: #ffc107; transition: width 0.3s;"></div>
        </div>
        <span style="width: 40px; text-align: right; font-size: 0.9rem; color: var(--text-muted);">${count}</span>
      </div>
    `;
  }

  return html;
}

/**
 * Display reviews list
 */
function displayReviewsList(reviews) {
  const container = document.getElementById('reviewsList');
  if (!container) return;

  if (reviews.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <i class="fas fa-comment-slash" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <p>No reviews yet. Be the first to review this product!</p>
      </div>
    `;
    return;
  }

  const reviewsHTML = reviews.map(review => `
    <div class="review-item" style="background: var(--card-bg); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <strong>${review.user?.username || 'Anonymous'}</strong>
            ${review.isVerifiedPurchase ? '<span class="badge badge-success" style="font-size: 0.75rem;"><i class="fas fa-check-circle"></i> Verified Purchase</span>' : ''}
          </div>
          <div style="margin-bottom: 0.5rem;">
            ${generateStars(review.rating, '0.9rem')}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            ${new Date(review.createdAt).toLocaleDateString()}
          </div>
        </div>
        ${currentUser && currentUser._id === review.user?._id ? `
          <div class="dropdown">
            <button class="btn btn-sm btn-ghost" onclick="toggleReviewMenu('${review._id}')">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <div class="dropdown-menu" id="reviewMenu-${review._id}" style="display: none;">
              <a href="#" onclick="editReview('${review._id}'); return false;">
                <i class="fas fa-edit"></i> Edit
              </a>
              <a href="#" onclick="deleteReview('${review._id}'); return false;">
                <i class="fas fa-trash"></i> Delete
              </a>
            </div>
          </div>
        ` : ''}
      </div>
      
      ${review.title ? `<h4 style="margin-bottom: 0.5rem;">${review.title}</h4>` : ''}
      <p style="color: var(--text); margin-bottom: 1rem;">${review.comment || ''}</p>
      
      <div style="display: flex; gap: 1rem; align-items: center;">
        <button class="btn btn-sm btn-ghost" onclick="markReviewHelpful('${review._id}')" ${review.helpfulBy?.includes(currentUser?._id) ? 'disabled' : ''}>
          <i class="fas fa-thumbs-up"></i> Helpful (${review.helpful || 0})
        </button>
      </div>
      
      ${review.response ? `
        <div style="margin-top: 1rem; padding: 1rem; background: var(--background); border-left: 3px solid var(--primary); border-radius: 0.25rem;">
          <strong style="color: var(--primary);">
            <i class="fas fa-reply"></i> Response from seller:
          </strong>
          <p style="margin-top: 0.5rem;">${review.response.comment}</p>
        </div>
      ` : ''}
    </div>
  `).join('');

  container.innerHTML = reviewsHTML;
}

/**
 * Show write review modal
 */
async function showWriteReviewModal(productId, productName) {
  // Check if user is logged in and is a client
  if (!currentUser) {
    showToast('Please login to write a review', 'error');
    return;
  }

  const userRole = (currentUser.role || 'client').toLowerCase();
  if (userRole !== 'client') {
    showToast('Only customers can write reviews', 'error');
    return;
  }

  // Check if user already reviewed this product
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/reviews/user/my-reviews`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      const existingReview = data.data?.find(r => r.product._id === productId || r.product === productId);

      if (existingReview) {
        showToast('You have already reviewed this product', 'warning');
        return;
      }
    }
  } catch (error) {
    console.log('Could not check existing reviews:', error);
    // Continue to show modal even if check fails
  }

  const modal = document.getElementById('writeReviewModal');
  if (!modal) {
    createWriteReviewModal();
  }

  document.getElementById('reviewProductId').value = productId;
  document.getElementById('reviewProductName').textContent = productName;
  document.getElementById('writeReviewModal').style.display = 'flex';
}

/**
 * Create write review modal
 */
function createWriteReviewModal() {
  const modalHTML = `
    <div id="writeReviewModal" class="modal" style="display: none;">
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3><i class="fas fa-star"></i> Write a Review</h3>
          <button class="close-btn" onclick="closeWriteReviewModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 1rem;">
            Reviewing: <strong id="reviewProductName"></strong>
          </p>
          
          <form id="writeReviewForm" onsubmit="submitReview(event)">
            <input type="hidden" id="reviewProductId">
            
            <div class="form-group">
              <label class="form-label">Rating *</label>
              <div id="starRating" style="font-size: 2rem; cursor: pointer;">
                <i class="far fa-star" data-rating="1" onclick="setRating(1)"></i>
                <i class="far fa-star" data-rating="2" onclick="setRating(2)"></i>
                <i class="far fa-star" data-rating="3" onclick="setRating(3)"></i>
                <i class="far fa-star" data-rating="4" onclick="setRating(4)"></i>
                <i class="far fa-star" data-rating="5" onclick="setRating(5)"></i>
              </div>
              <input type="hidden" id="reviewRating" required>
            </div>
            
            <div class="form-group">
              <label class="form-label">Title (Optional)</label>
              <input type="text" class="form-input" id="reviewTitle" placeholder="Sum up your review" maxlength="100">
            </div>
            
            <div class="form-group">
              <label class="form-label">Review (Optional)</label>
              <textarea class="form-input" id="reviewComment" rows="5" placeholder="Share your experience with this product" maxlength="1000"></textarea>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
              <button type="button" class="btn btn-secondary" onclick="closeWriteReviewModal()">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-paper-plane"></i> Submit Review
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Set star rating
 */
function setRating(rating) {
  document.getElementById('reviewRating').value = rating;

  const stars = document.querySelectorAll('#starRating i');
  stars.forEach((star, index) => {
    if (index < rating) {
      star.className = 'fas fa-star';
      star.style.color = '#ffc107';
    } else {
      star.className = 'far fa-star';
      star.style.color = '#ffc107';
    }
  });
}

/**
 * Submit review
 */
async function submitReview(event) {
  event.preventDefault();

  const productId = document.getElementById('reviewProductId').value;
  const rating = document.getElementById('reviewRating').value;
  const title = document.getElementById('reviewTitle').value;
  const comment = document.getElementById('reviewComment').value;

  if (!rating) {
    showToast('Please select a rating', 'error');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        productId,
        rating: parseInt(rating),
        title,
        comment
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showToast('Review submitted successfully!', 'success');
      closeWriteReviewModal();
      displayProductReviews(productId);
    } else {
      console.error('Review submission failed:', data);
      showToast(data.message || 'Failed to submit review', 'error');
    }
  } catch (error) {
    console.error('Error submitting review:', error);
    showToast('Error submitting review. Please try again.', 'error');
  }
}

/**
 * Close write review modal
 */
function closeWriteReviewModal() {
  document.getElementById('writeReviewModal').style.display = 'none';
  document.getElementById('writeReviewForm').reset();
  setRating(0);
}

/**
 * Mark review as helpful
 */
async function markReviewHelpful(reviewId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/helpful`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      showToast('Marked as helpful', 'success');
      // Reload reviews
      const productId = document.getElementById('reviewProductId')?.value;
      if (productId) {
        displayProductReviews(productId);
      }
    }
  } catch (error) {
    console.error('Error marking review as helpful:', error);
  }
}

/**
 * Delete review
 */
async function deleteReview(reviewId) {
  if (!confirm('Are you sure you want to delete this review?')) return;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      showToast('Review deleted successfully', 'success');
      // Reload reviews
      const productId = document.getElementById('reviewProductId')?.value;
      if (productId) {
        displayProductReviews(productId);
      }
    }
  } catch (error) {
    console.error('Error deleting review:', error);
    showToast('Error deleting review', 'error');
  }
}

/**
 * Toggle review menu
 */
function toggleReviewMenu(reviewId) {
  const menu = document.getElementById(`reviewMenu-${reviewId}`);
  if (menu) {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function (event) {
  if (!event.target.closest('.dropdown')) {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
      menu.style.display = 'none';
    });
  }
});

/**
 * Load all reviews for admin to monitor in Analytics
 */
async function loadAllReviewsForAdmin() {
  const container = document.getElementById('adminReviewsList');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
      <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
      <p>Loading reviews...</p>
    </div>
  `;

  try {
    const token = localStorage.getItem('token');
    const filter = document.getElementById('reviewsFilter')?.value || 'all';

    let url = `${API_BASE_URL}/reviews`;
    if (filter !== 'all') {
      url += `?rating=${filter}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success && data.data && data.data.length > 0) {
      const reviewsHTML = data.data.map(review => `
        <div class="card" style="margin-bottom: 0.75rem; padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <strong style="font-size: 0.95rem;">${review.user?.username || 'Anonymous'}</strong>
                ${review.isVerifiedPurchase ? '<span class="badge badge-success" style="font-size: 0.7rem; padding: 0.15rem 0.4rem;"><i class="fas fa-check"></i></span>' : ''}
                <span style="color: var(--text-muted); font-size: 0.8rem;">• ${new Date(review.createdAt).toLocaleDateString()}</span>
              </div>
              <div style="color: var(--text-muted); font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${review.product?.name || 'Unknown Product'}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="badge badge-info" style="font-size: 0.85rem;">${review.rating} ⭐</span>
              ${!review.response ? `
                <button class="btn btn-sm btn-primary" onclick="respondToReview('${review._id}', '${review.product?._id}')" style="padding: 0.35rem 0.75rem; font-size: 0.85rem;">
                  <i class="fas fa-reply"></i>
                </button>
              ` : '<span style="color: var(--success); font-size: 0.85rem;"><i class="fas fa-check-circle"></i></span>'}
            </div>
          </div>
          
          ${review.title || review.comment ? `
            <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border);">
              ${review.title ? `<strong style="font-size: 0.9rem; color: var(--primary);">${review.title}</strong>` : ''}
              <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${review.comment || ''}</p>
            </div>
          ` : ''}
        </div>
      `).join('');

      container.innerHTML = `
        <div style="margin-bottom: 0.75rem; padding: 0.75rem 1rem; background: var(--background); border-radius: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600; font-size: 0.9rem;">
            <i class="fas fa-chart-bar"></i> ${data.data.length} review${data.data.length !== 1 ? 's' : ''}
          </span>
          <span style="color: var(--text-muted); font-size: 0.9rem;">
            Avg: ${calculateAverageRating(data.data).toFixed(1)} <i class="fas fa-star" style="color: #ffc107;"></i>
          </span>
        </div>
        <div style="max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
          ${reviewsHTML}
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
          <i class="fas fa-comment-slash" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem; display: block;"></i>
          <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">No Reviews Yet</p>
          <p>Customer reviews will appear here once they start rating products.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading reviews:', error);
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--error);">
        <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
        <p>Error loading reviews. Please try again.</p>
        <button class="btn btn-primary" onclick="loadAllReviewsForAdmin()" style="margin-top: 1rem;">
          <i class="fas fa-sync-alt"></i> Retry
        </button>
      </div>
    `;
  }
}

/**
 * Calculate average rating from reviews array
 */
function calculateAverageRating(reviews) {
  if (!reviews || reviews.length === 0) return 0;
  const total = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
  return total / reviews.length;
}

/**
 * Respond to a review (admin function)
 */
function respondToReview(reviewId, productId) {
  const response = prompt('Enter your response to this review:');
  if (!response || response.trim() === '') return;

  fetch(`${API_BASE_URL}/reviews/${reviewId}/response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ comment: response.trim() })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast('Response posted successfully', 'success');
        loadAllReviewsForAdmin();
      } else {
        showToast(data.message || 'Error posting response', 'error');
      }
    })
    .catch(error => {
      console.error('Error posting response:', error);
      showToast('Error posting response', 'error');
    });
}
