import express from 'express';
import {
  checkAdminRole,
  getAllUsers,
  getAllAccounts,
  getUserDetails,
  updateAccountBalance,
  getSystemStats,
  createAccount,
} from '../controllers/adminController.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(sessionMiddleware);
router.use(checkAdminRole);

router.get('/users', getAllUsers);
router.get('/accounts', getAllAccounts);
router.get('/users/:userId', getUserDetails);
router.put('/accounts/:accountId/balance', updateAccountBalance);
router.post('/accounts', createAccount);
router.get('/stats', getSystemStats);

export default router;
