import { Router } from 'express';
import collectionRoutes from './collectionRoutes';
import backupRoutes from './backupRoutes';
import resetRoutes from './resetRoutes';
import healthRoutes from './healthRoutes';
import { notFoundHandler } from '../middlewares/errorHandler';

const router = Router();

router.use('/collection', collectionRoutes);
router.use('/backup', backupRoutes);
router.use('/reset', resetRoutes);
router.use('/health', healthRoutes);
router.use(notFoundHandler);

export default router;