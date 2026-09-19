import { Router } from 'express';
import { resetAll } from '../controllers/resetController';

const router = Router();

router.post('/', resetAll);

export default router;