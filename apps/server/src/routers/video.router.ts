import { Router } from "express";
import { handleECSTrigger, handleS3Trigger } from "../controllers/transcoder.js";
import { getAllVideos, getUserAllVideos, getVideo, getVideoStatus, updateViewsCount, uploadVideoToS3 } from "../controllers/video.js";
import { protect } from "../controllers/auth.js";

const router = Router();

router.post('/s3-trigger', handleS3Trigger);
router.post('/ecs-trigger', handleECSTrigger);

router.use(protect);

router.post('/upload', uploadVideoToS3);
router.get('/getAllVideos', getAllVideos);
router.get('/', getUserAllVideos);
router.get('/status/:id', getVideoStatus);
router.get('/updateViews/:id', updateViewsCount);
router.get('/:id', getVideo);

export default router;