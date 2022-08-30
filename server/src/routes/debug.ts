import { Logger } from 'yatsl';
import express, { Request, Response } from 'express';

const logger = new Logger();
const router = express.Router();

router.get('/api/test', (req: Request, res: Response) => {
	logger.log("Test!");
	return res.send("Hello world!");
});

export { router as debugRouter };