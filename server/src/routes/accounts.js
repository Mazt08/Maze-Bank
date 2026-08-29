import express from 'express';
import {
  getAccountInfo,
  getAccountBalance,
  searchTransactions,
  getTransactionHistory,
} from '../controllers/accountController.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(sessionMiddleware);

// Account routes
router.get('/', getAccountInfo);
router.get('/:accountId', getAccountBalance);
router.get('/:accountId/history', getTransactionHistory);

// Search with VULN: SQL Injection
router.get('/:accountId/search', searchTransactions);

export default router;
