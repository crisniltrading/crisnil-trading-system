// ============================================
// SHOPEE-STYLE ADVERTISEMENT POPUP
// ============================================

class AdPopup {
    constructor() {
        this.overlay = null;
        this.currentAd = null;
        this.allAds = [];
        this.currentIndex = 0;
        this.dontShowAgain = false;
        this.init();
    }

    init() {
        // Check if user has disabled popups
        const disabled = localStorage.getItem('adPopupDisabled');
        if (disabled === 'true') {
            return;
        }

        // Load popup after page loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.loadAd());
        } else {
            this.loadAd();
        }
    }

    async loadAd() {
        try {
            // Check if API_BASE_URL is defined
            if (typeof API_BASE_URL === 'undefined' || !API_BASE_URL) {
                console.error('❌ API_BASE_URL is not defined! Ad popup cannot load.');
                console.log('💡 Make sure script.js loads before ad-popup.js');
                return;
            }

            console.log('🎯 Ad Popup: Attempting to load products and promotions...');
            console.log('🌐 API URL:', API_BASE_URL);

            this.products = [];
            this.promotions = [];

            // Fetch promotions
            try {
                const promoResponse = await fetch(`${API_BASE_URL}/landing/promotions`);
                console.log('📡 Promotions response status:', promoResponse.status);
                
                if (promoResponse.ok) {
                    const promoData = await promoResponse.json();
                    console.log('🎉 Raw promotion data:', promoData);
                    console.log('🎉 Promotions count:', promoData.promotions?.length || 0);

                    if (promoData.promotions && promoData.promotions.length > 0) {
                        this.promotions = promoData.promotions.map(promo => {
                            console.log('Processing promo:', promo);
                            
                            // Calculate days remaining
                            let daysRemaining = promo.daysRemaining;
                            if (!daysRemaining && promo.validUntil) {
                                const now = new Date();
                                const endDate = new Date(promo.validUntil);
                                daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                            }
                            
                            // Calculate valid until date
                            let validUntil = promo.validUntil;
                            if (!validUntil && daysRemaining) {
                                validUntil = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
                            }
                            
                            return {
                                _id: promo.id || promo.promoId || promo._id,
                                name: promo.name,
                                description: promo.description || 'Special discount offer',
                                price: promo.discountedPrice,
                                originalPrice: promo.originalPrice,
                                discount: promo.discountPercentage,
                                images: promo.image ? [{ url: promo.image }] : [],
                                isPromotion: true,
                                validUntil: validUntil,
                                promotionId: promo.promoId,
                                minQuantity: promo.minQuantity || 1,
                                daysRemaining: daysRemaining
                            };
                        });
                        console.log('✅ Loaded', this.promotions.length, 'promotions');
                        console.log('✅ Formatted promotions:', this.promotions);
                    } else {
                        console.warn('⚠️ No promotions in response');
                    }
                } else {
                    console.error('❌ Promotions response not OK:', promoResponse.status);
                }
            } catch (promoError) {
                console.error('❌ Could not load promotions:', promoError);
                console.error('Error details:', promoError.message);
            }

            // Fetch featured products
            const response = await fetch(`${API_BASE_URL}/products?isActive=true&limit=5&sortBy=createdAt&sortOrder=desc`);
            console.log('📡 Response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('📦 Products received:', data.products?.length || 0);

                if (data.products && data.products.length > 0) {
                    // Filter products with images and stock
                    this.products = data.products.filter(p =>
                        p.stock > 0 &&
                        p.images &&
                        p.images.length > 0
                    );
                    console.log('✅ Loaded', this.products.length, 'products');
                }
            }

            // Check if we have any content to show
            if (this.products.length > 0 || this.promotions.length > 0) {
                console.log(`✨ Loaded ${this.products.length} products and ${this.promotions.length} promotions`);
                setTimeout(() => this.show(), 3000);
                return;
            }

            console.warn('⚠️ No products or promotions found');
            this.showTestAd();
        } catch (error) {
            console.error('❌ Failed to load advertisement:', error);
            console.error('Error details:', error.message);
            console.log('🧪 Showing test ad as fallback...');
            this.showTestAd();
        }
    }

    showTestAd() {
        // Fallback test data if API fails
        this.products = [
            {
                _id: 'test-product-1',
                name: 'Premium Frozen Chicken',
                description: 'Fresh frozen chicken breast, perfect for any meal.',
                price: 450,
                originalPrice: 500,
                images: [{
                    url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800&h=600&fit=crop'
                }]
            }
        ];
        
        this.promotions = [
            {
                _id: 'test-promo-1',
                name: 'Weekend Special - Frozen Chicken',
                description: 'Get 20% off on all frozen items this weekend!',
                discount: 20,
                price: 360,
                originalPrice: 450,
                isPromotion: true,
                validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                daysRemaining: 3
            },
            {
                _id: 'test-promo-2',
                name: 'Buy 2 Get 1 Free - Sausages',
                description: 'Purchase any 2 items and get 1 free on selected products.',
                discount: 33,
                price: 300,
                originalPrice: 450,
                isPromotion: true,
                validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                daysRemaining: 5
            },
            {
                _id: 'test-promo-3',
                name: 'Flash Sale - All Products',
                description: 'Limited time flash sale - up to 50% off!',
                discount: 50,
                price: 225,
                originalPrice: 450,
                isPromotion: true,
                validUntil: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
                daysRemaining: 0
            },
            {
                _id: 'test-promo-4',
                name: 'New Customer Discount',
                description: 'First time shopping? Get 15% off your first order.',
                discount: 15,
                price: 382,
                originalPrice: 450,
                isPromotion: true,
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                daysRemaining: 30
            }
        ];
        
        setTimeout(() => this.show(), 3000);
    }

    formatPromotionAsAd(promotion) {
        // Format promotion data to match product structure
        return {
            _id: promotion._id,
            name: promotion.name,
            description: promotion.description,
            images: promotion.image ? [{ url: promotion.image }] : [],
            price: promotion.discountValue || 0,
            originalPrice: promotion.minPurchase || 0,
            discount: promotion.discountPercentage || promotion.discountValue,
            isPromotion: true,
            validUntil: promotion.validUntil
        };
    }

    show() {
        // Create overlay if it doesn't exist
        if (!this.overlay) {
            this.createOverlay();
        }

        // Populate both sections
        this.populateProductSection();
        this.populatePromotionSection();

        // Show overlay with persistent class to keep it visible during navigation
        setTimeout(() => {
            this.overlay.classList.add('active');
            this.overlay.classList.add('persistent');
        }, 100);

        // Track view
        this.trackAdView();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'ad-popup-overlay';
        this.overlay.innerHTML = `
            <div class="ad-popup-container">
                <button class="ad-popup-close" aria-label="Close advertisement">
                    <i class="fas fa-times"></i>
                </button>
                <div class="ad-popup-content">
                    <!-- PRODUCTS SECTION -->
                    <div class="ad-section products-section">
                        <div class="ad-section-header">
                            <i class="fas fa-box"></i>
                            <span>Featured Products</span>
                        </div>
                        <div class="ad-popup-image">
                            <div class="ad-popup-sparkles">
                                <div class="sparkle"></div>
                                <div class="sparkle"></div>
                                <div class="sparkle"></div>
                            </div>
                            <img src="" alt="Product" id="productImage">
                            <div class="ad-promo-badge">
                                <i class="fas fa-fire"></i> NEW
                            </div>
                        </div>
                        <div class="ad-popup-info">
                            <h2 class="ad-popup-title" id="productTitle"></h2>
                            <p class="ad-popup-description" id="productDescription"></p>
                            <div class="ad-popup-price-section">
                                <span class="ad-popup-price" id="productPrice"></span>
                                <span class="ad-popup-original-price" id="productOriginalPrice"></span>
                            </div>
                            <div class="ad-popup-actions">
                                <button class="ad-popup-btn ad-popup-btn-primary" onclick="adPopup.shopProduct()">
                                    <i class="fas fa-shopping-cart"></i>
                                    Shop Now
                                </button>
                                <button class="ad-popup-btn ad-popup-btn-secondary" onclick="adPopup.viewProductDetails()">
                                    <i class="fas fa-info-circle"></i>
                                    Details
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- PROMOTIONS SECTION -->
                    <div class="ad-section promotions-section">
                        <div class="ad-section-header promotions">
                            <i class="fas fa-tags"></i>
                            <span>Special Offers</span>
                        </div>
                        <div class="ad-popup-info">
                            <div class="promotions-list" id="promotionsList">
                                <!-- Promotions will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ad-popup-footer">
                    <label class="ad-popup-checkbox">
                        <input type="checkbox" id="dontShowAgainCheckbox">
                        <span>Don't show for 10 minutes</span>
                    </label>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Event listeners
        this.overlay.querySelector('.ad-popup-close').addEventListener('click', () => this.close());
        // Removed click-outside-to-close behavior to keep popup persistent
        // Users must click the X button to close

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.overlay || !this.overlay.classList.contains('active')) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }
        });

        document.getElementById('dontShowAgainCheckbox').addEventListener('change', (e) => {
            this.dontShowAgain = e.target.checked;
        });
    }

    populateProductSection() {
        const product = this.products && this.products.length > 0 ? this.products[0] : null;
        
        if (!product) {
            // Show empty state
            const section = this.overlay.querySelector('.products-section .ad-popup-info');
            section.innerHTML = `
                <div class="ad-section-empty">
                    <i class="fas fa-box-open"></i>
                    <p>No products available</p>
                </div>
            `;
            return;
        }

        this.currentProduct = product;

        console.log('=== PRODUCT SECTION DEBUG ===');
        console.log('Product:', product);
        console.log('Images:', product.images);

        // Image
        const img = this.overlay.querySelector('#productImage');
        let imageUrl = this.getImageUrl(product);

        if (imageUrl) {
            img.src = imageUrl;
            img.onload = () => console.log('✅ Product image loaded');
            img.onerror = () => {
                console.error('❌ Product image failed to load');
                img.src = this.getFallbackImage();
            };
        } else {
            img.src = this.getFallbackImage();
        }

        // Title & Description
        this.overlay.querySelector('#productTitle').textContent = product.name;
        this.overlay.querySelector('#productDescription').textContent = 
            product.description || 'Check out this amazing product!';

        // Price
        this.overlay.querySelector('#productPrice').textContent = `₱${product.price?.toFixed(2) || '0.00'}`;
        
        const originalPriceEl = this.overlay.querySelector('#productOriginalPrice');
        if (product.originalPrice && product.originalPrice > product.price) {
            originalPriceEl.textContent = `₱${product.originalPrice.toFixed(2)}`;
            originalPriceEl.style.display = 'inline';
        } else {
            originalPriceEl.style.display = 'none';
        }
    }

    populatePromotionSection() {
        const listContainer = this.overlay.querySelector('#promotionsList');
        
        if (!this.promotions || this.promotions.length === 0) {
            // Show empty state
            listContainer.innerHTML = `
                <div class="ad-section-empty">
                    <i class="fas fa-tags"></i>
                    <p>No promotions available</p>
                </div>
            `;
            return;
        }

        console.log('=== PROMOTIONS LIST DEBUG ===');
        console.log('Total promotions:', this.promotions.length);

        // Create list of promotions
        listContainer.innerHTML = this.promotions.map((promo, index) => {
            const discountText = promo.discount ? `${promo.discount}% OFF` : 'SPECIAL OFFER';
            const timerText = promo.validUntil ? this.getTimeRemaining(new Date(promo.validUntil)) : '';
            
            return `
                <div class="promotion-item" onclick="adPopup.selectPromotion(${index})">
                    <div class="promotion-header">
                        <div class="promotion-name">
                            <i class="fas fa-gift"></i>
                            ${promo.name}
                        </div>
                        <div class="promotion-badge">${discountText}</div>
                    </div>
                    <div class="promotion-description">
                        ${promo.description || 'Limited time offer!'}
                    </div>
                    ${timerText ? `
                        <div class="promotion-details">
                            <div class="promotion-discount">${discountText}</div>
                            <div class="promotion-timer">
                                <i class="fas fa-clock"></i>
                                ${timerText}
                            </div>
                        </div>
                    ` : `
                        <div class="promotion-details">
                            <div class="promotion-discount">${discountText}</div>
                        </div>
                    `}
                </div>
            `;
        }).join('');

        console.log('✅ Populated', this.promotions.length, 'promotions');
    }

    getTimeRemaining(endDate) {
        const now = new Date();
        const diff = endDate - now;

        if (diff <= 0) {
            return 'Expired';
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
            return `${days}d ${hours}h left`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m left`;
        } else {
            return `${minutes}m left`;
        }
    }

    selectPromotion(index) {
        if (!this.promotions || index < 0 || index >= this.promotions.length) return;
        
        this.currentPromotion = this.promotions[index];
        console.log('Selected promotion:', this.currentPromotion);
        
        // Navigate to shop with promotion
        this.shopPromotion();
    }

    getImageUrl(item) {
        if (!item.images || !Array.isArray(item.images) || item.images.length === 0) {
            return null;
        }

        // Use ImageHelper if available, otherwise fallback to manual handling
        if (typeof ImageHelper !== 'undefined' && ImageHelper.getImageUrl) {
            return ImageHelper.getImageUrl(item.images[0]);
        }

        // Fallback for when ImageHelper is not loaded
        const firstImage = item.images[0];
        
        // Handle object format (new schema: {data, contentType, filename, alt})
        let imageUrl = firstImage;
        if (typeof firstImage === 'object') {
            imageUrl = firstImage.data || firstImage.url || null;
        }
        
        if (!imageUrl) return null;
        
        // Base64 image
        if (imageUrl.startsWith('data:')) {
            return imageUrl;
        }
        
        // File path
        if (imageUrl.startsWith('http')) {
            return imageUrl;
        }
        
        const path = imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl;
        return `${API_BASE_URL.replace('/api', '')}${path}`;
    }

    getFallbackImage(type = 'product') {
        if (type === 'promotion') {
            return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Cdefs%3E%3ClinearGradient id="grad" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23667eea;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23764ba2;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill="url(%23grad)" width="400" height="300"/%3E%3Cg transform="translate(200,150)"%3E%3Ccircle fill="white" opacity="0.2" r="60"/%3E%3Ctext x="0" y="10" text-anchor="middle" font-family="Arial" font-size="48" fill="white" font-weight="bold"%3E🎁%3C/text%3E%3Ctext x="0" y="50" text-anchor="middle" font-family="Arial" font-size="18" fill="white"%3ESpecial Offer%3C/text%3E%3C/g%3E%3C/svg%3E';
        }
        return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Cdefs%3E%3ClinearGradient id="grad" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23ff6b6b;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23C41E3A;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill="url(%23grad)" width="400" height="300"/%3E%3Cg transform="translate(200,150)"%3E%3Ccircle fill="white" opacity="0.2" r="60"/%3E%3Ctext x="0" y="10" text-anchor="middle" font-family="Arial" font-size="48" fill="white" font-weight="bold"%3E📦%3C/text%3E%3Ctext x="0" y="50" text-anchor="middle" font-family="Arial" font-size="18" fill="white"%3EProduct%3C/text%3E%3C/g%3E%3C/svg%3E';
    }

    populateContent() {
        const ad = this.currentAd;

        console.log('=== AD POPUP DEBUG ===');
        console.log('API_BASE_URL:', typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'NOT DEFINED');
        console.log('Full ad object:', ad);
        console.log('Images array:', ad.images);

        // Image
        const img = this.overlay.querySelector('.ad-popup-image img');
        const imageContainer = this.overlay.querySelector('.ad-popup-image');
        let imageUrl = null;

        // Handle different image formats from backend
        if (ad.images && Array.isArray(ad.images) && ad.images.length > 0) {
            const firstImage = ad.images[0];
            console.log('First image object:', firstImage);
            console.log('Image type:', typeof firstImage);

            // Handle string URL directly
            if (typeof firstImage === 'string') {
                // Check if it's a full URL or relative path
                if (firstImage.startsWith('http')) {
                    imageUrl = firstImage;
                } else {
                    // Relative path - use same format as client-shopping.js
                    imageUrl = `${API_BASE_URL.replace('/api', '')}${firstImage}`;
                }
                console.log('Image is string:', imageUrl);
            }
            // Handle object with url property (your Product model format)
            else if (firstImage && typeof firstImage === 'object') {
                if (firstImage.url) {
                    // Check if URL is full or relative
                    if (firstImage.url.startsWith('http')) {
                        imageUrl = firstImage.url;
                    } else {
                        // Relative path - use same format as client-shopping.js
                        imageUrl = `${API_BASE_URL.replace('/api', '')}${firstImage.url}`;
                    }
                    console.log('Image has url property:', imageUrl);
                } else if (firstImage.path) {
                    // Handle path format
                    if (firstImage.path.startsWith('http')) {
                        imageUrl = firstImage.path;
                    } else {
                        imageUrl = `${API_BASE_URL.replace('/api', '')}${firstImage.path}`;
                    }
                    console.log('Image has path property:', imageUrl);
                } else if (firstImage.filename) {
                    // Handle filename format
                    imageUrl = `${API_BASE_URL.replace('/api', '')}/uploads/products/${firstImage.filename}`;
                    console.log('Image has filename property:', imageUrl);
                }
            }
        }

        console.log('Final resolved image URL:', imageUrl);

        // Set image or fallback
        if (imageUrl && imageUrl.trim() !== '') {
            // Add loading class
            imageContainer.classList.add('loading');
            img.style.opacity = '0';
            img.src = imageUrl;

            img.onload = () => {
                imageContainer.classList.remove('loading');
                img.style.opacity = '1';
                img.style.transition = 'opacity 0.5s ease';
                console.log('✅ Image loaded successfully!');
            };

            img.onerror = (error) => {
                console.error('❌ Image failed to load:', imageUrl);
                console.error('Error details:', error);
                imageContainer.classList.remove('loading');
                // Fallback if image fails to load
                img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Cdefs%3E%3ClinearGradient id="grad" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23ff6b6b;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23C41E3A;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill="url(%23grad)" width="400" height="300"/%3E%3Cg transform="translate(200,150)"%3E%3Ccircle fill="white" opacity="0.2" r="60"/%3E%3Ctext x="0" y="10" text-anchor="middle" font-family="Arial" font-size="48" fill="white" font-weight="bold"%3E🎁%3C/text%3E%3Ctext x="0" y="50" text-anchor="middle" font-family="Arial" font-size="18" fill="white"%3ESpecial Offer%3C/text%3E%3C/g%3E%3C/svg%3E';
                img.style.opacity = '1';
            };
        } else {
            console.warn('⚠️ No valid image URL found, using fallback');
            imageContainer.classList.remove('loading');
            // No image available - use attractive fallback
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Cdefs%3E%3ClinearGradient id="grad" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23ff6b6b;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23C41E3A;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill="url(%23grad)" width="400" height="300"/%3E%3Cg transform="translate(200,150)"%3E%3Ccircle fill="white" opacity="0.2" r="60"/%3E%3Ctext x="0" y="10" text-anchor="middle" font-family="Arial" font-size="48" fill="white" font-weight="bold"%3E🎁%3C/text%3E%3Ctext x="0" y="50" text-anchor="middle" font-family="Arial" font-size="18" fill="white"%3ESpecial Offer%3C/text%3E%3C/g%3E%3C/svg%3E';
            img.style.opacity = '1';
        }

        img.alt = ad.name || 'Product advertisement';
        console.log('=== END DEBUG ===');

        // Update badge based on type
        const badge = this.overlay.querySelector('.ad-promo-badge');
        if (ad.isPromotion) {
            badge.innerHTML = '<i class="fas fa-tags"></i> PROMOTION';
            badge.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        } else if (ad.discount && ad.discount > 0) {
            badge.innerHTML = '<i class="fas fa-percent"></i> DISCOUNT';
            badge.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        } else {
            badge.innerHTML = '<i class="fas fa-fire"></i> SPECIAL OFFER';
            badge.style.background = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
        }

        // Title
        this.overlay.querySelector('.ad-popup-title').textContent = ad.name;

        // Description
        this.overlay.querySelector('.ad-popup-description').textContent =
            ad.description || 'Limited time offer! Get this amazing product at a special price.';

        // Price
        const priceEl = this.overlay.querySelector('.ad-popup-price');
        const originalPriceEl = this.overlay.querySelector('.ad-popup-original-price');
        const discountEl = this.overlay.querySelector('.ad-popup-discount');

        if (ad.isPromotion) {
            // Show promotion discount
            if (ad.price && ad.originalPrice) {
                priceEl.textContent = `₱${ad.price?.toFixed(2)}`;
                originalPriceEl.textContent = `₱${ad.originalPrice.toFixed(2)}`;
                originalPriceEl.style.display = 'inline';
                discountEl.textContent = `-${ad.discount}%`;
                discountEl.style.display = 'inline';
            } else {
                priceEl.textContent = `${ad.discount}% OFF`;
                originalPriceEl.style.display = 'none';
                discountEl.textContent = 'Limited Time';
                discountEl.style.display = 'inline';
            }
        } else {
            priceEl.textContent = `₱${ad.price?.toFixed(2) || '0.00'}`;

            if (ad.originalPrice && ad.originalPrice > ad.price) {
                originalPriceEl.textContent = `₱${ad.originalPrice.toFixed(2)}`;
                const discountPercent = Math.round(((ad.originalPrice - ad.price) / ad.originalPrice) * 100);
                discountEl.textContent = `-${discountPercent}%`;
            } else {
                originalPriceEl.style.display = 'none';
                discountEl.style.display = 'none';
            }
        }

        // Timer
        if (ad.validUntil) {
            this.startTimer(new Date(ad.validUntil));
        }
    }

    startPromotionTimer(endDate) {
        const timerEl = document.getElementById('promotionTimerText');
        if (!timerEl) return;

        const updateTimer = () => {
            const now = new Date();
            const diff = endDate - now;

            if (diff <= 0) {
                timerEl.textContent = 'Offer has ended';
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) {
                timerEl.textContent = `Ends in ${days}d ${hours}h`;
            } else if (hours > 0) {
                timerEl.textContent = `Ends in ${hours}h ${minutes}m`;
            } else {
                timerEl.textContent = `Ends in ${minutes} min`;
            }
        };

        updateTimer();
        setInterval(updateTimer, 60000); // Update every minute
    }

    startTimer(endDate) {
        this.startPromotionTimer(endDate);
    }

    close() {
        this.overlay.classList.remove('active');

        // Save preference if checkbox is checked - now for 10 minutes instead of 1 day
        if (this.dontShowAgain) {
            const tenMinutesLater = new Date();
            tenMinutesLater.setMinutes(tenMinutesLater.getMinutes() + 10);
            localStorage.setItem('adPopupDisabled', 'true');
            localStorage.setItem('adPopupDisabledUntil', tenMinutesLater.getTime());
        }

        // Track close
        this.trackAdClose();
    }

    shopProduct() {
        if (!this.currentProduct) return;
        
        this.close();
        
        // Add to cart
        if (typeof addToCart === 'function') {
            addToCart(this.currentProduct._id, 1);
        } else if (typeof showClientShopping === 'function') {
            showClientShopping();
        } else {
            window.location.href = '#shop';
        }
    }

    viewProductDetails() {
        if (!this.currentProduct) return;
        
        this.close();

        // Try multiple methods to show product details
        if (typeof viewProductDetails === 'function') {
            viewProductDetails(this.currentProduct._id);
        } else if (typeof showProductDetails === 'function') {
            showProductDetails(this.currentProduct._id);
        } else if (typeof showClientShopping === 'function') {
            showClientShopping();
            setTimeout(() => {
                if (typeof viewProductDetails === 'function') {
                    viewProductDetails(this.currentProduct._id);
                }
            }, 500);
        } else {
            window.location.hash = '#shop';
        }
    }

    shopPromotion() {
        this.close();
        
        // Navigate to shop with promotion filter
        if (typeof showClientShopping === 'function') {
            showClientShopping();
        } else {
            window.location.href = '#shop';
        }
    }

    viewPromotionDetails() {
        this.close();
        
        // Navigate to shop to see promotion details
        if (typeof showClientShopping === 'function') {
            showClientShopping();
        } else {
            window.location.hash = '#shop';
        }
    }

    // Legacy methods for backward compatibility
    shopNow() {
        if (this.currentAd && this.currentAd.isPromotion) {
            this.shopPromotion();
        } else {
            this.shopProduct();
        }
    }

    viewDetails() {
        if (this.currentAd && this.currentAd.isPromotion) {
            this.viewPromotionDetails();
        } else {
            this.viewProductDetails();
        }
    }

    trackAdView() {
        // Track advertisement view for analytics (completely silent)
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            // Track product view
            if (this.currentProduct) {
                fetch(`${API_BASE_URL}/analytics/ad-view`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        adId: this.currentProduct._id,
                        type: 'product',
                        timestamp: new Date()
                    })
                }).then(() => { }).catch(() => { });
            }

            // Track promotion view
            if (this.currentPromotion) {
                fetch(`${API_BASE_URL}/analytics/ad-view`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        adId: this.currentPromotion._id,
                        type: 'promotion',
                        timestamp: new Date()
                    })
                }).then(() => { }).catch(() => { });
            }
        } catch (error) {
            // Completely silent - no logging
        }
    }

    trackAdClose() {
        // Track advertisement close for analytics (completely silent)
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            // Use fetch with no-cors to prevent console errors
            fetch(`${API_BASE_URL}/analytics/ad-close`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    adId: this.currentAd._id,
                    type: this.currentAd.isPromotion ? 'promotion' : 'product',
                    dontShowAgain: this.dontShowAgain,
                    timestamp: new Date()
                })
            }).then(() => { }).catch(() => { }); // Completely silent
        } catch (error) {
            // Completely silent - no logging
        }
    }

    // Navigation methods removed - showing both sections simultaneously
}

// Initialize popup
let adPopup;

// Check if popup should be shown today
function shouldShowAdPopup() {
    const disabled = localStorage.getItem('adPopupDisabled');
    const disabledUntil = localStorage.getItem('adPopupDisabledUntil');

    if (disabled === 'true' && disabledUntil) {
        const now = new Date().getTime();
        if (now < parseInt(disabledUntil)) {
            return false;
        } else {
            // Reset for new day
            localStorage.removeItem('adPopupDisabled');
            localStorage.removeItem('adPopupDisabledUntil');
        }
    }

    return true;
}

// Initialize on page load - ONLY FOR CLIENT USERS AND ONLY IN DASHBOARD
console.log('🎪 Ad Popup Script Loaded');

// Wait for DOM to be ready before checking
function initializeAdPopup() {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = (user?.role || '').toLowerCase();
    const isLoggedIn = !!localStorage.getItem('token') && !!userRole;

    // Check if we're on the landing page or dashboard
    const landingPage = document.querySelector('.landing-page');
    const dashboard = document.getElementById('dashboard');
    const isOnLandingPage = landingPage && landingPage.classList.contains('active');
    const isOnDashboard = dashboard && dashboard.classList.contains('active');

    console.log('=== AD POPUP DEBUG ===');
    console.log('👤 Full user object:', user);
    console.log('👤 User role from localStorage:', user?.role);
    console.log('👤 User role (lowercase):', userRole);
    console.log('🔐 Is logged in:', isLoggedIn);
    console.log('🏠 Landing page exists:', !!landingPage, 'Active:', isOnLandingPage);
    console.log('📊 Dashboard exists:', !!dashboard, 'Active:', isOnDashboard);
    console.log('📋 Should show popup:', shouldShowAdPopup());
    console.log('🔒 Disabled status:', localStorage.getItem('adPopupDisabled'));
    console.log('🌐 API_BASE_URL available:', typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'NOT DEFINED');
    console.log('✅ All conditions check:');
    console.log('  - isLoggedIn:', isLoggedIn);
    console.log('  - userRole === "client":', userRole === 'client');
    console.log('  - isOnDashboard:', isOnDashboard);
    console.log('  - !isOnLandingPage:', !isOnLandingPage);
    console.log('  - shouldShowAdPopup():', shouldShowAdPopup());
    console.log('======================');

    // Show ads ONLY for client users on the dashboard (NOT on landing page)
    // Exclude admin, staff, and b2b to avoid interrupting their work
    const showForRole = userRole === 'client';

    if (isLoggedIn && showForRole && isOnDashboard && !isOnLandingPage && shouldShowAdPopup()) {
        console.log('✅ Initializing Ad Popup for logged-in user in dashboard...');
        adPopupInitialized = true;
        adPopup = new AdPopup();
    } else {
        adPopupInitialized = true; // Mark as initialized even if we don't show it
        if (isOnLandingPage) {
            console.log('⏸️ Ad Popup disabled - User is on landing page');
        } else if (!isLoggedIn) {
            console.log('⏸️ Ad Popup disabled - User not logged in');
        } else if (!isOnDashboard) {
            console.log('⏸️ Ad Popup disabled - Dashboard not active yet');
        } else if (!showForRole) {
            console.log('⏸️ Ad Popup disabled - User role is "' + userRole + '" (ads only for client)');
            console.log('💡 Admins, staff, and B2B users don\'t see ads to avoid interrupting their work');
        } else {
            console.log('⏸️ Ad Popup disabled by user preference');
            console.log('💡 To re-enable: localStorage.removeItem("adPopupDisabled"); localStorage.removeItem("adPopupDisabledUntil"); location.reload();');
        }
    }
}

// Track if we've already initialized to prevent duplicates
let adPopupInitialized = false;

// Initialize when DOM is ready - with delay to ensure dashboard is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for dashboard to initialize
        setTimeout(() => {
            if (!adPopupInitialized) {
                initializeAdPopup();
            }
        }, 1500);
    });
} else {
    // DOM already loaded - wait a bit for dashboard
    setTimeout(() => {
        if (!adPopupInitialized) {
            initializeAdPopup();
        }
    }, 1500);
}

// Manual trigger function (for testing)
function showAdPopupManually() {
    console.log('🧪 Manual trigger - forcing ad popup...');
    localStorage.removeItem('adPopupDisabled');
    localStorage.removeItem('adPopupDisabledUntil');
    if (!adPopup) {
        adPopup = new AdPopup();
    }
    adPopup.loadAd().then(() => {
        setTimeout(() => adPopup.show(), 500);
    });
}

// Make it globally accessible for console testing
window.showAdPopupManually = showAdPopupManually;

// Force initialize for testing (bypass all checks)
function forceInitAdPopup() {
    console.log('⚡ FORCE INIT - Bypassing all checks...');
    localStorage.removeItem('adPopupDisabled');
    localStorage.removeItem('adPopupDisabledUntil');
    adPopupInitialized = false; // Reset flag
    if (adPopup && adPopup.overlay) {
        adPopup.overlay.remove(); // Remove existing popup
    }
    adPopup = new AdPopup();
    adPopupInitialized = true;
    console.log('✅ Ad popup initialized. It should show in 3 seconds...');
}

// Make functions globally available for console testing
window.showAdPopupManually = showAdPopupManually;
window.forceInitAdPopup = forceInitAdPopup;
window.initializeAdPopup = initializeAdPopup;

// ============================================
// SUCCESS CONFIRMATION MODAL
// ============================================

class SuccessConfirmation {
    constructor(options = {}) {
        this.username = options.username || 'User';
        this.email = options.email || '';
        this.accountType = options.accountType || 'Client';
        this.onContinue = options.onContinue || (() => { });
        this.show();
    }

    show() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'success-confirmation-overlay active';
        overlay.innerHTML = `
            <div class="success-confirmation-container">
                <div class="success-icon-wrapper">
                    <div class="success-checkmark">
                        <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                            <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                            <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                        </svg>
                    </div>
                </div>
                
                <div class="success-content">
                    <h2 class="success-title">
                        🎉 Account Created Successfully!
                    </h2>
                    
                    <p class="success-welcome">
                        Welcome to Crisnil Trading, <strong>${this.username}</strong>!
                    </p>
                    
                    <p class="success-message">
                        Your account has been created successfully. You can now log in and start shopping.
                    </p>
                    
                    <div class="success-details">
                        <div class="success-detail-item">
                            <div class="detail-icon">📧</div>
                            <div class="detail-content">
                                <span class="detail-label">Email</span>
                                <span class="detail-value">${this.email}</span>
                            </div>
                        </div>
                        
                        <div class="success-detail-item">
                            <div class="detail-icon">👤</div>
                            <div class="detail-content">
                                <span class="detail-label">Username</span>
                                <span class="detail-value">${this.username}</span>
                            </div>
                        </div>
                        
                        <div class="success-detail-item">
                            <div class="detail-icon">🏷️</div>
                            <div class="detail-content">
                                <span class="detail-label">Account Type</span>
                                <span class="detail-value">${this.accountType}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="success-email-notice">
                        <i class="fas fa-envelope"></i>
                        A welcome email has been sent to your email address.
                    </div>
                    
                    <button class="success-continue-btn" onclick="successConfirmation.close()">
                        <i class="fas fa-check"></i>
                        Continue to Login
                    </button>
                </div>
                
                <div class="success-confetti">
                    ${Array.from({ length: 50 }, (_, i) => `<div class="confetti-piece" style="--delay: ${i * 0.05}s; --x: ${Math.random() * 100}%; --rotation: ${Math.random() * 360}deg;"></div>`).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlay = overlay;

        // Add event listener to button
        const btn = overlay.querySelector('.success-continue-btn');
        btn.addEventListener('click', () => this.close());

        // Auto-close after 10 seconds
        this.autoCloseTimer = setTimeout(() => this.close(), 10000);
    }

    close() {
        if (this.autoCloseTimer) {
            clearTimeout(this.autoCloseTimer);
        }

        this.overlay.classList.remove('active');
        setTimeout(() => {
            this.overlay.remove();
            this.onContinue();
        }, 400);
    }
}

// Global function to show success confirmation
window.showSuccessConfirmation = function (options) {
    window.successConfirmation = new SuccessConfirmation(options);
};

// Example usage (call this after successful registration):
// showSuccessConfirmation({
//     username: 'Aeron',
//     email: 'aeronjay81@gmail.com',
//     accountType: 'Client',
//     onContinue: () => {
//         // Navigate to login or dashboard
//         console.log('User clicked continue');
//     }
// });
