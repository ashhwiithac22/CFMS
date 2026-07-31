const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RepositoryFactory = require('../repositories/repository.factory');
const { sendResetMail } = require('../config/mailer');
const { AuthError, ValidationError, NotFoundError } = require('../utils/errors');

const userRepo = RepositoryFactory.getUserRepository();
const roleRepo = RepositoryFactory.getRoleRepository();
const auditRepo = RepositoryFactory.getAuditRepository();

class AuthService {
  generateAccessToken(user) {
    return jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role || user.role_name, 
        warehouseId: user.warehouse_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { userId: user.id },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  }

  async login(email, password, ipAddress, userAgent) {
    const user = await userRepo.findByEmail(email);
    if (!user) {
      throw new AuthError('Invalid email or password');
    }

    if (user.status !== 'Active') {
      throw new AuthError('Your account has been suspended');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AuthError('Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Save refresh token to user record
    await userRepo.updateRefreshToken(user.id, refreshToken);

    // Log audit log
    await auditRepo.create({
      userId: user.id,
      action: 'LOGIN',
      ipAddress,
      userAgent,
      details: 'User logged in successfully'
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role || user.role_name,
        warehouseId: user.warehouse_id,
        warehouseName: user.warehouse_name
      }
    };
  }

  async register(userData, ipAddress, userAgent) {
    const existingUser = await userRepo.findByEmail(userData.email);
    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    const validRoles = ['Sales Executive', 'Warehouse Team', 'Warehouse Manager', 'Administrator'];
    const role = userData.role || userData.roleId || 'Sales Executive';
    if (!validRoles.includes(role)) {
      throw new ValidationError('Invalid role selected');
    }

    const passwordHash = await bcrypt.hash(userData.password, 10);
    const username = userData.username || userData.email.split('@')[0] + Math.floor(Math.random() * 1000);

    const userId = await userRepo.create({
      username,
      email: userData.email,
      passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role,
      warehouseId: userData.warehouseId || null,
      status: 'Active'
    });

    await auditRepo.create({
      userId,
      action: 'REGISTER',
      ipAddress,
      userAgent,
      details: `User registered with role: ${role}`
    });

    const user = await userRepo.findById(userId);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      warehouseName: user.warehouse_name
    };
  }

  async logout(userId, ipAddress, userAgent) {
    await userRepo.updateRefreshToken(userId, null);
    await auditRepo.create({
      userId,
      action: 'LOGOUT',
      ipAddress,
      userAgent,
      details: 'User logged out'
    });
  }

  async refreshToken(token, ipAddress, userAgent) {
    try {
      const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
      const user = await userRepo.findById(decoded.userId);
      
      if (!user) {
        throw new AuthError('User not found');
      }

      // Fetch the full record to verify the refresh token still matches
      const fullUser = await userRepo.findByEmail(user.email);
      if (!fullUser || fullUser.refresh_token !== token) {
        throw new AuthError('Invalid refresh token');
      }

      if (user.status !== 'Active') {
        throw new AuthError('Your account has been suspended');
      }

      const accessToken = this.generateAccessToken(fullUser);
      return { accessToken };
    } catch (err) {
      if (err instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid or expired refresh token');
      }
      throw err;
    }
  }

  async forgotPassword(email, ipAddress, userAgent) {
    const user = await userRepo.findByEmail(email);
    
    // Security: Do not confirm if a user exists or not. Simply return success.
    if (!user) {
      console.log(`Forgot password requested for non-existent email: ${email}`);
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await userRepo.setResetToken(email, resetToken, resetTokenExpiry);

    await sendResetMail(email, resetToken);

    await auditRepo.create({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUEST',
      ipAddress,
      userAgent,
      details: 'Password reset link sent via mailer'
    });

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(token, newPassword, ipAddress, userAgent) {
    const user = await userRepo.findByResetToken(token);
    if (!user) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepo.updatePassword(user.id, passwordHash);

    await auditRepo.create({
      userId: user.id,
      action: 'PASSWORD_RESET',
      ipAddress,
      userAgent,
      details: 'Password reset completed'
    });
  }

  async changePassword(userId, currentPassword, newPassword, ipAddress, userAgent) {
    const user = await userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const fullUser = await userRepo.findByEmail(user.email);
    const isMatch = await bcrypt.compare(currentPassword, fullUser.password_hash);
    if (!isMatch) {
      throw new ValidationError('Incorrect current password');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await userRepo.updatePassword(userId, newPasswordHash);

    await auditRepo.create({
      userId,
      action: 'PASSWORD_CHANGE',
      ipAddress,
      userAgent,
      details: 'Password changed by authenticated user'
    });
  }

  async updateTheme(userId, theme, ipAddress, userAgent) {
    if (theme !== 'light' && theme !== 'dark') {
      throw new ValidationError('Invalid theme preference');
    }
    await userRepo.updateThemePreference(userId, theme);

    await auditRepo.create({
      userId,
      action: 'THEME_PREFERENCE_UPDATE',
      ipAddress,
      userAgent,
      details: `Theme preference updated to: ${theme}`
    });
  }
}

module.exports = AuthService;
