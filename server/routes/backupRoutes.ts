import { Router } from 'express';
import { triggerBackup } from '../controllers/backupController';

const router = Router();

router.post('/', triggerBackup);

export default router;