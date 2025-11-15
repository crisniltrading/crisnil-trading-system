/**
 * Image Helper Utility
 * Handles both base64 (database) and file path (disk) images
 * 
 * Usage:
 *   const imageUrl = ImageHelper.getImageUrl(product.images[0].url);
 *   <img src="${imageUrl}" />
 */

(function() {
  'use strict';

  /**
   * Get proper image URL regardless of storage type
   * @param {string|object} imageInput - Image URL/data from database (can be string or object with data/url field)
   * @param {string} fallbackIcon - Optional fallback icon class (e.g., 'fa-box')
   * @returns {string|null} - Proper URL for img src or null
   */
  function getImageUrl(imageInput, fallbackIcon = null) {
    if (!imageInput) return null;
    
    // Handle object format (database schema: {data, contentType, filename, alt})
    if (typeof imageInput === 'object') {
      // Base64 format (stored in database)
      if (imageInput.data && imageInput.contentType) {
        return `data:${imageInput.contentType};base64,${imageInput.data}`;
      }
      // URL format (if it exists)
      if (imageInput.url) {
        const imageUrl = imageInput.url;
        if (imageUrl.startsWith('data:') || imageUrl.startsWith('http')) {
          return imageUrl;
        }
        // Relative path
        const path = imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl;
        const baseUrl = window.API_BASE_URL 
          ? window.API_BASE_URL.replace('/api', '')
          : (window.location.protocol + '//' + window.location.hostname + 
             (window.location.port ? ':' + window.location.port : ''));
        return `${baseUrl}${path}`;
      }
    }
    
    // Handle string format
    if (typeof imageInput === 'string') {
      // Already a data URL
      if (imageInput.startsWith('data:')) {
        return imageInput;
      }
      // HTTP URL
      if (imageInput.startsWith('http')) {
        return imageInput;
      }
      // Relative path
      const path = imageInput.startsWith('/') ? imageInput : '/' + imageInput;
      const baseUrl = window.API_BASE_URL 
        ? window.API_BASE_URL.replace('/api', '')
        : (window.location.protocol + '//' + window.location.hostname + 
           (window.location.port ? ':' + window.location.port : ''));
      return `${baseUrl}${path}`;
    }
    
    return null;
  }

  /**
   * Check if image is base64 encoded
   * @param {string} imageUrl - Image URL
   * @returns {boolean}
   */
  function isBase64Image(imageUrl) {
    return imageUrl && imageUrl.startsWith('data:');
  }

  /**
   * Check if image is file path
   * @param {string} imageUrl - Image URL
   * @returns {boolean}
   */
  function isFilePathImage(imageUrl) {
    return imageUrl && !imageUrl.startsWith('data:') && 
           (imageUrl.startsWith('/') || imageUrl.startsWith('uploads/'));
  }

  /**
   * Get image size estimate (for base64 only)
   * @param {string} imageUrl - Image URL
   * @returns {number} - Size in bytes (approximate)
   */
  function getImageSize(imageUrl) {
    if (!imageUrl) return 0;
    
    if (isBase64Image(imageUrl)) {
      // Base64 size = (length * 3/4) - padding
      const base64Data = imageUrl.split(',')[1] || '';
      const padding = (base64Data.match(/=/g) || []).length;
      return Math.floor((base64Data.length * 3) / 4) - padding;
    }
    
    // File-based images - size unknown without fetching
    return 0;
  }

  /**
   * Get image format from URL
   * @param {string} imageUrl - Image URL
   * @returns {string} - Format (jpeg, png, gif, webp, etc.)
   */
  function getImageFormat(imageUrl) {
    if (!imageUrl) return 'unknown';
    
    if (isBase64Image(imageUrl)) {
      // Extract format from data URL
      const match = imageUrl.match(/^data:image\/(\w+);/);
      return match ? match[1] : 'unknown';
    }
    
    // Extract from file extension
    const match = imageUrl.match(/\.(\w+)(?:\?|$)/);
    return match ? match[1].toLowerCase() : 'unknown';
  }

  /**
   * Create image element with proper error handling
   * @param {string} imageUrl - Image URL
   * @param {string} alt - Alt text
   * @param {string} fallbackIcon - Fallback icon class
   * @returns {string} - HTML string
   */
  function createImageElement(imageUrl, alt = '', fallbackIcon = 'fa-image') {
    const url = getImageUrl(imageUrl);
    
    if (!url) {
      return `<div class="image-placeholder"><i class="fas ${fallbackIcon}"></i></div>`;
    }
    
    return `
      <img src="${url}" 
           alt="${alt}" 
           onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'image-placeholder\\'><i class=\\'fas ${fallbackIcon}\\'></i></div>';"
           loading="lazy">
    `;
  }

  /**
   * Preload image
   * @param {string} imageUrl - Image URL
   * @returns {Promise} - Resolves when image is loaded
   */
  function preloadImage(imageUrl) {
    return new Promise((resolve, reject) => {
      const url = getImageUrl(imageUrl);
      if (!url) {
        reject(new Error('Invalid image URL'));
        return;
      }
      
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  /**
   * Get image dimensions
   * @param {string} imageUrl - Image URL
   * @returns {Promise<{width: number, height: number}>}
   */
  async function getImageDimensions(imageUrl) {
    try {
      const img = await preloadImage(imageUrl);
      return {
        width: img.naturalWidth,
        height: img.naturalHeight
      };
    } catch (error) {
      console.error('Failed to get image dimensions:', error);
      return { width: 0, height: 0 };
    }
  }

  /**
   * Convert file to base64
   * @param {File} file - File object
   * @returns {Promise<string>} - Base64 string
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate image file
   * @param {File} file - File object
   * @param {Object} options - Validation options
   * @returns {Object} - {valid: boolean, error: string}
   */
  function validateImageFile(file, options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    } = options;
    
    // Check if file exists
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }
    
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` 
      };
    }
    
    // Check file size
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `File too large. Max size: ${(maxSize / 1024 / 1024).toFixed(2)}MB` 
      };
    }
    
    return { valid: true, error: null };
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} - Formatted size
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Export to global scope
  window.ImageHelper = {
    getImageUrl,
    isBase64Image,
    isFilePathImage,
    getImageSize,
    getImageFormat,
    createImageElement,
    preloadImage,
    getImageDimensions,
    fileToBase64,
    validateImageFile,
    formatFileSize
  };

  // Log initialization
  if (window.CONFIG && window.CONFIG.IS_DEVELOPMENT) {
    console.log('✅ ImageHelper initialized');
  }

})();
