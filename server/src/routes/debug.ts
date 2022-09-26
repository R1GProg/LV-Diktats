import express, { Request, Response } from 'express';
import { logger } from '..';

const router = express.Router();

router.get('/api/test', (req: Request, res: Response) => {
	logger.log("Test!");
	return res.send("Hello world!");
});

export { router as debugRouter };