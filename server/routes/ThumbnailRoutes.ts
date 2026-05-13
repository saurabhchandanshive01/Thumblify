import express from 'express';
import { deleteThumbnail, generateThumbnail } from '../controllers/ThumnailController.js';
import protect from '../middleware/auth.js';



const ThumbnailRouter = express.Router();

ThumbnailRouter.post('/generate', protect, generateThumbnail);

ThumbnailRouter.delete('/delete/:id', protect, deleteThumbnail);

export default ThumbnailRouter;