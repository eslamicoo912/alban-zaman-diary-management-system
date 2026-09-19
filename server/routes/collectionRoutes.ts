import { Router } from 'express';
import * as collection from '../controllers/collectionController';
import { validateJsonBody } from '../middlewares/validateBody';

const router = Router();

router.get('/:name', collection.getCollection);
router.get('/:name/:id', collection.getCollectionItem);
router.put('/:name', validateJsonBody, collection.replaceCollection);
router.post('/:name/save', validateJsonBody, collection.upsertItem);
router.delete('/:name/:id', collection.removeItem);

/**
 * NOTE: `GET /:name` must never consume a nested path segment that belongs to
 * a more specific route. Express routing is method + path exact here, so the
 * `/save` and `/:id` suffixes are matched before the single-segment GET.
 */

export default router;