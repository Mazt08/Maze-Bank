import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
} from '../controllers/authController.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.post('/logout', sessionMiddleware, logoutUser);
router.get('/me', sessionMiddleware, getCurrentUser);

export default router;
