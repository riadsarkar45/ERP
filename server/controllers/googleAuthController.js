import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Google OAuth Success
export const googleAuthSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=authentication_failed`);
    }

    // Generate JWT token
    const token = generateToken(req.user.id);

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }))}`);
  } catch (error) {
    console.error('Google auth success error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/auth?error=server_error`);
  }
};

// Google OAuth Failure
export const googleAuthFailure = (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/auth?error=google_auth_failed`);
};