const AuthService = require('../services/auth.service');
const RepositoryFactory = require('../repositories/repository.factory');
const authService = new AuthService();
const roleRepo = RepositoryFactory.getRoleRepository();
const userRepo = RepositoryFactory.getUserRepository();

class AuthController {
  async register(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'unknown';

      const user = await authService.register(req.body, ipAddress, userAgent);
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: { user }
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'unknown';

      const result = await authService.login(email, password, ipAddress, userAgent);

      // Set Refresh Token as an HTTP-only secure cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: result.accessToken,
          user: result.user
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const userId = req.user.userId;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'unknown';

      await authService.logout(userId, ipAddress, userAgent);

      // Clear cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const token = req.cookies.refreshToken;
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is missing'
        });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'unknown';

      const result = await authService.refreshToken(token, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'unknown';

      const result = await authService.forgotPassword(email, ipAddress, userAgent);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'unknown';

      await authService.resetPassword(token, password, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req, res, next) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'unknown';

      await authService.changePassword(userId, currentPassword, newPassword, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const userId = req.user.userId;
      const user = await userRepo.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (err) {
      next(err);
    }
  }

  async getMetadata(req, res, next) {
    try {
      const roles = await roleRepo.findAll();
      const departments = await roleRepo.findAllDepartments();
      res.status(200).json({
        success: true,
        data: {
          roles: roles.map(r => ({ id: r.id, name: r.name })),
          departments: departments.map(d => ({ id: d.id, name: d.name }))
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async updateTheme(req, res, next) {
    try {
      const userId = req.user.userId;
      const { theme } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'unknown';

      await authService.updateTheme(userId, theme, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: 'Theme preference updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
