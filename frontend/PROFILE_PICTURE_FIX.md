# Profile Picture Upload & Display Fix

## Problem
Profile pictures are showing 404 errors because the frontend is trying to load them as URLs instead of displaying the base64 data stored in the database.

## Solution

### 1. Backend (Already Working)
The backend correctly stores profile pictures as base64 strings in the User model and has these endpoints:
- `POST /api/users/profile/picture` - Upload profile picture
- `DELETE /api/users/profile/picture` - Delete profile picture

### 2. Frontend JavaScript (Fixed)
Updated `frontend/profile-settings.js` with:
- `handleProfilePictureUpload()` - Handles file selection and upload
- `handleProfilePictureDelete()` - Handles picture deletion
- `displayProfilePicture()` - Displays base64 image correctly

### 3. HTML Updates Needed

Add these elements to your profile settings HTML:

```html
<!-- In the profile form section -->
<div class="form-group">
    <label for="profilePictureInput">
        <i class="fas fa-camera"></i> Profile Picture
    </label>
    
    <!-- Preview -->
    <div class="profile-picture-container">
        <img id="profilePicturePreview" 
             src="" 
             alt="Profile Picture" 
             style="display: none; max-width: 150px; max-height: 150px; border-radius: 50%; object-fit: cover; margin-bottom: 1rem;">
        
        <div class="profile-picture-placeholder" id="profilePicturePlaceholder" style="width: 150px; height: 150px; border-radius: 50%; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
            <i class="fas fa-user" style="font-size: 3rem; color: var(--text-muted);"></i>
        </div>
    </div>
    
    <!-- Upload button -->
    <input type="file" 
           id="profilePictureInput" 
           accept="image/*" 
           style="display: none;">
    
    <button type="button" 
            class="btn btn-secondary" 
            onclick="document.getElementById('profilePictureInput').click()">
        <i class="fas fa-upload"></i> Upload Picture
    </button>
    
    <!-- Delete button (hidden by default) -->
    <button type="button" 
            id="deleteProfilePictureBtn" 
            class="btn btn-danger" 
            style="display: none; margin-left: 0.5rem;">
        <i class="fas fa-trash"></i> Delete Picture
    </button>
    
    <small class="form-text">
        Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
    </small>
</div>
```

### 4. Display Profile Picture in Header/Sidebar

```html
<!-- In your header or sidebar user info section -->
<div class="user-avatar">
    <img id="profilePictureDisplay" 
         src="" 
         alt="User Avatar" 
         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
         style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
    
    <div class="avatar-placeholder" style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary); color: white; display: none; align-items: center; justify-content: center; font-weight: bold;">
        <span id="userInitials"></span>
    </div>
</div>
```

### 5. CSS Styling

Add to your CSS file:

```css
.profile-picture-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 1rem 0;
}

#profilePicturePreview {
    border: 3px solid var(--primary);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.profile-picture-placeholder {
    border: 2px dashed var(--border);
    transition: all 0.3s ease;
}

.profile-picture-placeholder:hover {
    border-color: var(--primary);
    background: var(--bg-hover);
}

.user-avatar {
    position: relative;
    display: inline-block;
}

.user-avatar img {
    border: 2px solid var(--primary);
}

.avatar-placeholder {
    font-size: 1rem;
}
```

### 6. Testing

1. **Upload a picture:**
   - Click "Upload Picture" button
   - Select an image file (< 5MB)
   - Picture should display immediately
   - Check browser console for any errors

2. **Delete a picture:**
   - Click "Delete Picture" button
   - Confirm deletion
   - Picture should be removed and placeholder shown

3. **Verify storage:**
   - Open browser DevTools > Application > Local Storage
   - Check the `user` object has `profilePicture` field with base64 data

### 7. Common Issues

**Issue:** 404 error for `/api/products/...`
**Cause:** Frontend trying to load profile picture as a product image URL
**Fix:** Ensure you're using `<img src="{{base64data}}">` not `<img src="/api/products/{{id}}">`

**Issue:** Image not displaying
**Cause:** Base64 data not properly formatted
**Fix:** Ensure base64 string starts with `data:image/...;base64,`

**Issue:** Image too large
**Cause:** File size > 5MB
**Fix:** Compress image before upload or increase size limit in backend

### 8. API Endpoints

```javascript
// Upload profile picture
POST /api/users/profile/picture
Headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
}
Body: {
    "imageData": "data:image/png;base64,iVBORw0KG..."
}

// Delete profile picture
DELETE /api/users/profile/picture
Headers: {
    'Authorization': 'Bearer <token>'
}
```

## Verification Checklist

- [ ] Profile picture upload button exists in HTML
- [ ] File input has `accept="image/*"` attribute
- [ ] Preview image element has correct ID
- [ ] Delete button is wired up correctly
- [ ] JavaScript event listeners are attached
- [ ] Base64 data is stored in localStorage
- [ ] Image displays correctly after upload
- [ ] Image persists after page refresh
- [ ] Delete functionality works
- [ ] No 404 errors in console
