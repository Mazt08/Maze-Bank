import express from 'express';
import {
  transferFunds,
  getTransferOptions,
} from '../controllers/transferController.js';
import { sessionMiddleware } from '../middleware/sessionMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(sessionMiddleware);

router.get('/options', getTransferOptions);
router.post('/', transferFunds);

export default router;
