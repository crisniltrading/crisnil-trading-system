const User = require('../models/User');
const { generateToken } = require('../config/jwt');
const crypto = require('crypto');

// Register new user
const register = async (req, res) => {
  try {
    const { username, email, password, role, businessInfo } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email or username already exists'
      });
    }

    // Create new user
    // Allow user to choose their role (client or b2b)
    // Admin and staff roles can only be created by existing admins
    const allowedRoles = ['client', 'b2b'];
    const userRole = allowedRoles.includes(role) ? role : 'client';
    
    const user = await User.create({
      username,
      email,
      password,
      role: userRole,
      businessInfo: businessInfo || {}
    });

    // Generate token
    const token = generateToken(user._id);

    // Send welcome email
    try {
      await sendWelcomeEmail(user);
      console.log('✅ Welcome email sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️  Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        business_name: user.businessInfo?.business_name,
        phone: user.businessInfo?.phone,
        address: user.businessInfo?.address,
        profilePicture: user.profilePicture,
        bio: user.bio,
        loyaltyPoints: user.loyaltyPoints || 0,
        cart: user.cart || [],
        wishlist: user.wishlist || [],
        preferences: user.preferences || {
          currency: 'PHP',
          timezone: 'Asia/Manila',
          taxRate: 12,
          notifications: {
            orders: true,
            promotions: true,
            inventory: true,
            system: false
          }
        },
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user and include password field
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    }).select('+password');

    // Check if user exists and password is correct
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        business_name: user.businessInfo?.business_name,
        phone: user.businessInfo?.phone,
        address: user.businessInfo?.address,
        profilePicture: user.profilePicture,
        bio: user.bio,
        loyaltyPoints: user.loyaltyPoints || 0,
        cart: user.cart || [],
        wishlist: user.wishlist || [],
        preferences: user.preferences || {},
        isActive: user.isActive,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed'
    });
  }
};

// Get current user profile
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      status: 'success',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        businessInfo: user.businessInfo,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { username, email, businessInfo, bio, profilePicture } = req.body;
    
    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (businessInfo) updates.businessInfo = businessInfo;
    if (bio !== undefined) updates.bio = bio;
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    console.log('✅ Profile updated for user:', user.username);

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        businessInfo: user.businessInfo,
        bio: user.bio,
        profilePicture: user.profilePicture,
        business_name: user.businessInfo?.business_name,
        phone: user.businessInfo?.phone,
        address: user.businessInfo?.address,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile'
    });
  }
};

// Request password change verification code
const requestPasswordChangeVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save code and expiry to user (expires in 10 minutes)
    user.passwordChangeVerificationCode = verificationCode;
    user.passwordChangeVerificationExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Send verification email
    try {
      await sendPasswordChangeVerificationEmail(user, verificationCode);
      console.log('✅ Password change verification code sent to:', user.email);
    } catch (emailError) {
      // Reset verification fields if email fails
      user.passwordChangeVerificationCode = undefined;
      user.passwordChangeVerificationExpires = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('❌ Failed to send verification email:', emailError);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send verification code. Please try again.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Verification code sent to your email address'
    });
  } catch (error) {
    console.error('Request verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to request verification code'
    });
  }
};

// Change password with verification
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, verificationCode } = req.body;

    if (!verificationCode) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification code is required'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    if (!(await user.correctPassword(currentPassword, user.password))) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Verify the code
    if (!user.passwordChangeVerificationCode || 
        user.passwordChangeVerificationCode !== verificationCode) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification code'
      });
    }

    // Check if code expired
    if (user.passwordChangeVerificationExpires < Date.now()) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification code has expired. Please request a new one.'
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordChangeVerificationCode = undefined;
    user.passwordChangeVerificationExpires = undefined;
    await user.save();

    // Send confirmation email
    try {
      await sendPasswordChangeConfirmationEmail(user);
      console.log('✅ Password change confirmation sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️  Failed to send confirmation email:', emailError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password'
    });
  }
};

// Admin: Get all users
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .select('-password');

    const total = await User.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: users.length,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users'
    });
  }
};

// Admin: Update user status
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, role } = req.body;

    const updates = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (role) updates.role = role;

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'User status updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user status'
    });
  }
};

// Forgot password - Send reset email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide your email address'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        status: 'success',
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save hashed token and expiry to user
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password.html?token=${resetToken}`;

    // Send email
    try {
      await sendPasswordResetEmail(user, resetURL, resetToken);
      console.log('✅ Password reset email sent to:', user.email);
    } catch (emailError) {
      // Reset token fields if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('❌ Failed to send password reset email:', emailError);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send password reset email. Please try again later.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Password reset link has been sent to your email address.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process password reset request'
    });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Token and new password are required'
      });
    }

    // Hash the token from URL
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired password reset token'
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Send confirmation email
    try {
      await sendPasswordResetConfirmationEmail(user);
      console.log('✅ Password reset confirmation sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️  Failed to send confirmation email:', emailError);
      // Don't fail the request if confirmation email fails
    }

    // Generate new token for auto-login
    const authToken = generateToken(user._id);

    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully',
      token: authToken
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset password'
    });
  }
};

// Helper: Send password reset email
async function sendPasswordResetEmail(user, resetURL, resetToken) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Email not configured');
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const emailContent = {
    from: `"FrozenFlow Trading" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: '🔐 Password Reset Request - FrozenFlow Trading',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">FrozenFlow Trading</h1>
            <p style="color: #64748b; margin: 5px 0 0 0;">Password Reset Request</p>
          </div>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
            <h2 style="color: #92400e; margin: 0 0 10px 0; font-size: 20px;">
              🔐 Reset Your Password
            </h2>
            <p style="margin: 0; color: #92400e;">We received a request to reset your password.</p>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <p style="margin: 0 0 15px 0; color: #1e293b;">
              <strong>Account:</strong> ${user.username}<br>
              <strong>Email:</strong> ${user.email}
            </p>
            <p style="margin: 0; color: #64748b;">
              Click the button below to reset your password. This link will expire in 30 minutes.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetURL}" style="display: inline-block; background: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0891b2; margin-bottom: 25px;">
            <h3 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px;">
              <i class="fas fa-info-circle"></i> Security Tips
            </h3>
            <ul style="margin: 0; padding-left: 20px; color: #0c4a6e;">
              <li>Never share your password with anyone</li>
              <li>Use a strong, unique password</li>
              <li>If you didn't request this, ignore this email</li>
              <li>Your password won't change until you click the link</li>
            </ul>
          </div>
          
          <div style="background: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 25px;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">
              <strong>⚠️ Didn't request this?</strong><br>
              If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.
            </p>
          </div>
          
          <div style="text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px; margin-top: 25px;">
            <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="margin: 0; color: #2563eb; font-size: 12px; word-break: break-all;">
              ${resetURL}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #64748b; margin: 0 0 10px 0;">Need help?</p>
            <p style="color: #2563eb; font-weight: bold; margin: 0;">
              📧 ${process.env.GMAIL_USER || 'support@frozenflow.com'}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated message from FrozenFlow Trading<br>
              Generated on ${new Date().toLocaleString()}<br>
              This link expires in 30 minutes
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
Password Reset Request - FrozenFlow Trading

We received a request to reset your password.

ACCOUNT DETAILS:
- Username: ${user.username}
- Email: ${user.email}

Click the link below to reset your password (expires in 30 minutes):
${resetURL}

SECURITY TIPS:
- Never share your password with anyone
- Use a strong, unique password
- If you didn't request this, ignore this email
- Your password won't change until you click the link

DIDN'T REQUEST THIS?
If you didn't request a password reset, please ignore this email or contact support.

Need help? Contact us at ${process.env.GMAIL_USER || 'support@frozenflow.com'}

---
This is an automated message from FrozenFlow Trading
Generated on ${new Date().toLocaleString()}
This link expires in 30 minutes
    `.trim()
  };

  await transporter.sendMail(emailContent);
}

// Helper: Send password reset confirmation email
async function sendPasswordResetConfirmationEmail(user) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return; // Skip if email not configured
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const emailContent = {
    from: `"FrozenFlow Trading" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: '✅ Password Reset Successful - FrozenFlow Trading',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">FrozenFlow Trading</h1>
            <p style="color: #64748b; margin: 5px 0 0 0;">Password Reset Confirmation</p>
          </div>
          
          <div style="background: #10b98115; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 25px;">
            <h2 style="color: #10b981; margin: 0 0 10px 0; font-size: 24px;">
              ✅ Password Reset Successful
            </h2>
            <p style="margin: 0; color: #1e293b; font-size: 16px;">Your password has been changed successfully.</p>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Account Details</h3>
            <p style="margin: 0; color: #64748b;">
              <strong>Username:</strong> ${user.username}<br>
              <strong>Email:</strong> ${user.email}<br>
              <strong>Changed:</strong> ${new Date().toLocaleString()}
            </p>
          </div>
          
          <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0891b2; margin-bottom: 25px;">
            <h3 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px;">
              🔒 Security Reminder
            </h3>
            <ul style="margin: 0; padding-left: 20px; color: #0c4a6e;">
              <li>You can now login with your new password</li>
              <li>Keep your password secure and don't share it</li>
              <li>Use a unique password for this account</li>
              <li>Enable two-factor authentication if available</li>
            </ul>
          </div>
          
          <div style="background: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 25px;">
            <p style="margin: 0; color: #991b1b;">
              <strong>⚠️ Didn't change your password?</strong><br>
              If you didn't make this change, your account may be compromised. Please contact support immediately.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #64748b; margin: 0 0 10px 0;">Questions or concerns?</p>
            <p style="color: #2563eb; font-weight: bold; margin: 0;">
              📧 ${process.env.GMAIL_USER || 'support@frozenflow.com'}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated security notification from FrozenFlow Trading<br>
              Generated on ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
Password Reset Successful - FrozenFlow Trading

Your password has been changed successfully.

ACCOUNT DETAILS:
- Username: ${user.username}
- Email: ${user.email}
- Changed: ${new Date().toLocaleString()}

SECURITY REMINDER:
- You can now login with your new password
- Keep your password secure and don't share it
- Use a unique password for this account
- Enable two-factor authentication if available

DIDN'T CHANGE YOUR PASSWORD?
If you didn't make this change, your account may be compromised. Please contact support immediately.

Questions? Contact us at ${process.env.GMAIL_USER || 'support@frozenflow.com'}

---
This is an automated security notification from FrozenFlow Trading
Generated on ${new Date().toLocaleString()}
    `.trim()
  };

  await transporter.sendMail(emailContent);
}

// Helper: Send welcome email on registration
async function sendWelcomeEmail(user) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return; // Skip if email not configured
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const emailContent = {
    from: `"FrozenFlow Trading" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: '🎉 Welcome to FrozenFlow Trading!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">🎉 Welcome to FrozenFlow Trading!</h1>
            <p style="color: #64748b; margin: 5px 0 0 0;">Your account has been created successfully</p>
          </div>
          
          <div style="background: #10b98115; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 25px;">
            <h2 style="color: #10b981; margin: 0 0 10px 0; font-size: 20px;">
              ✅ Account Created Successfully
            </h2>
            <p style="margin: 0; color: #1e293b;">Thank you for joining FrozenFlow Trading! Your account is now active and ready to use.</p>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Your Account Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Username:</td>
                <td style="padding: 8px 0; color: #1e293b;">${user.username}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0; color: #1e293b;">${user.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Account Type:</td>
                <td style="padding: 8px 0; color: #2563eb; font-weight: bold; text-transform: uppercase;">${user.role}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Created:</td>
                <td style="padding: 8px 0; color: #1e293b;">${new Date().toLocaleDateString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; border-left: 4px solid #0891b2; margin-bottom: 25px;">
            <h3 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 16px;">
              🚀 Get Started
            </h3>
            <ul style="margin: 0; padding-left: 20px; color: #0c4a6e;">
              <li>Browse our wide selection of frozen products</li>
              <li>Add items to your cart and wishlist</li>
              <li>Track your orders in real-time</li>
              <li>Enjoy exclusive promotions and discounts</li>
              <li>Manage your account settings and preferences</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}" style="display: inline-block; background: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Start Shopping Now
            </a>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">
              💡 Pro Tips
            </h3>
            <ul style="margin: 0; padding-left: 20px; color: #92400e;">
              <li>Complete your profile for a personalized experience</li>
              <li>Enable notifications to stay updated on your orders</li>
              <li>Check out our promotions page for special deals</li>
              <li>Contact support if you need any assistance</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #64748b; margin: 0 0 10px 0;">Need help getting started?</p>
            <p style="color: #2563eb; font-weight: bold; margin: 0;">
              📧 ${process.env.GMAIL_USER || 'support@frozenflow.com'} | 📞 +63 917 123 4567
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated welcome message from FrozenFlow Trading<br>
              Generated on ${new Date().toLocaleString()}<br>
              <br>
              Follow us on social media for updates and exclusive offers!
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
Welcome to FrozenFlow Trading!

Your account has been created successfully.

ACCOUNT DETAILS:
- Username: ${user.username}
- Email: ${user.email}
- Account Type: ${user.role.toUpperCase()}
- Created: ${new Date().toLocaleDateString()}

GET STARTED:
- Browse our wide selection of frozen products
- Add items to your cart and wishlist
- Track your orders in real-time
- Enjoy exclusive promotions and discounts
- Manage your account settings and preferences

PRO TIPS:
- Complete your profile for a personalized experience
- Enable notifications to stay updated on your orders
- Check out our promotions page for special deals
- Contact support if you need any assistance

Visit us at: ${process.env.FRONTEND_URL || 'http://localhost:8080'}

Need help? Contact us at:
📧 ${process.env.GMAIL_USER || 'support@frozenflow.com'}
📞 +63 917 123 4567

Best regards,
FrozenFlow Trading Team

---
This is an automated welcome message from FrozenFlow Trading
Generated on ${new Date().toLocaleString()}
    `.trim()
  };

  await transporter.sendMail(emailContent);
}

// Helper: Send password change verification email
async function sendPasswordChangeVerificationEmail(user, verificationCode) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return;
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const emailContent = {
    from: `"FrozenFlow Trading" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: '🔐 Password Change Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">FrozenFlow Trading</h1>
            <p style="color: #64748b; margin: 5px 0 0 0;">Password Change Verification</p>
          </div>
          
          <div style="background: #2563eb15; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 25px;">
            <h2 style="color: #2563eb; margin: 0 0 10px 0; font-size: 20px;">
              🔐 Verify Your Identity
            </h2>
            <p style="margin: 0; color: #1e293b;">You requested to change your password. Please use the verification code below.</p>
          </div>
          
          <div style="background: #f1f5f9; padding: 30px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
            <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px;">Your Verification Code:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 2px dashed #2563eb; display: inline-block;">
              <span style="font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${verificationCode}
              </span>
            </div>
            <p style="margin: 15px 0 0 0; color: #64748b; font-size: 14px;">
              <strong>Valid for 10 minutes</strong>
            </p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">
              ⚠️ Security Notice
            </h3>
            <ul style="margin: 0; padding-left: 20px; color: #92400e;">
              <li>Never share this code with anyone</li>
              <li>This code expires in 10 minutes</li>
              <li>If you didn't request this, ignore this email</li>
              <li>Your password won't change without this code</li>
            </ul>
          </div>
          
          <div style="background: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 25px;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">
              <strong>⚠️ Didn't request this?</strong><br>
              If you didn't try to change your password, please ignore this email or contact support immediately if you're concerned about your account security.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #64748b; margin: 0 0 10px 0;">Need help?</p>
            <p style="color: #2563eb; font-weight: bold; margin: 0;">
              📧 ${process.env.GMAIL_USER || 'support@frozenflow.com'}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated security message from FrozenFlow Trading<br>
              Generated on ${new Date().toLocaleString()}<br>
              Code expires in 10 minutes
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
Password Change Verification Code - FrozenFlow Trading

You requested to change your password. Please use the verification code below.

VERIFICATION CODE: ${verificationCode}

Valid for 10 minutes

SECURITY NOTICE:
- Never share this code with anyone
- This code expires in 10 minutes
- If you didn't request this, ignore this email
- Your password won't change without this code

DIDN'T REQUEST THIS?
If you didn't try to change your password, please ignore this email or contact support.

Need help? Contact us at ${process.env.GMAIL_USER || 'support@frozenflow.com'}

---
This is an automated security message from FrozenFlow Trading
Generated on ${new Date().toLocaleString()}
Code expires in 10 minutes
    `.trim()
  };

  await transporter.sendMail(emailContent);
}

// Helper: Send password change confirmation email
async function sendPasswordChangeConfirmationEmail(user) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return;
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const emailContent = {
    from: `"FrozenFlow Trading" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: '✅ Password Changed Successfully',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">FrozenFlow Trading</h1>
            <p style="color: #64748b; margin: 5px 0 0 0;">Password Change Confirmation</p>
          </div>
          
          <div style="background: #10b98115; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 25px;">
            <h2 style="color: #10b981; margin: 0 0 10px 0; font-size: 24px;">
              ✅ Password Changed Successfully
            </h2>
            <p style="margin: 0; color: #1e293b; font-size: 16px;">Your password has been changed successfully.</p>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Account Details</h3>
            <p style="margin: 0; color: #64748b;">
              <strong>Username:</strong> ${user.username}<br>
              <strong>Email:</strong> ${user.email}<br>
              <strong>Changed:</strong> ${new Date().toLocaleString()}
            </p>
          </div>
          
          <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0891b2; margin-bottom: 25px;">
            <h3 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px;">
              🔒 Security Reminder
            </h3>
            <ul style="margin: 0; padding-left: 20px; color: #0c4a6e;">
              <li>You can now login with your new password</li>
              <li>Keep your password secure and don't share it</li>
              <li>Use a unique password for this account</li>
              <li>Change your password regularly for security</li>
            </ul>
          </div>
          
          <div style="background: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 25px;">
            <p style="margin: 0; color: #991b1b;">
              <strong>⚠️ Didn't change your password?</strong><br>
              If you didn't make this change, your account may be compromised. Please contact support immediately and reset your password.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #64748b; margin: 0 0 10px 0;">Questions or concerns?</p>
            <p style="color: #2563eb; font-weight: bold; margin: 0;">
              📧 ${process.env.GMAIL_USER || 'support@frozenflow.com'}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated security notification from FrozenFlow Trading<br>
              Generated on ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
Password Changed Successfully - FrozenFlow Trading

Your password has been changed successfully.

ACCOUNT DETAILS:
- Username: ${user.username}
- Email: ${user.email}
- Changed: ${new Date().toLocaleString()}

SECURITY REMINDER:
- You can now login with your new password
- Keep your password secure and don't share it
- Use a unique password for this account
- Change your password regularly for security

DIDN'T CHANGE YOUR PASSWORD?
If you didn't make this change, your account may be compromised. Please contact support immediately.

Questions? Contact us at ${process.env.GMAIL_USER || 'support@frozenflow.com'}

---
This is an automated security notification from FrozenFlow Trading
Generated on ${new Date().toLocaleString()}
    `.trim()
  };

  await transporter.sendMail(emailContent);
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  requestPasswordChangeVerification,
  changePassword,
  getAllUsers,
  updateUserStatus,
  forgotPassword,
  resetPassword
};
