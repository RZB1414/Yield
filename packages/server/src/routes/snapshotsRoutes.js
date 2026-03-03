import express from 'express';
import SnapshotController from '../controllers/snapshotController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /auth/snapshots?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=500
router.get('/auth/snapshots', authenticateToken, SnapshotController.getUserSnapshots);

// GET /auth/users/:userId/snapshots (permite enviar userId pelo path)
router.get('/auth/users/:userId/snapshots', authenticateToken, SnapshotController.getUserSnapshots);

export default router;
