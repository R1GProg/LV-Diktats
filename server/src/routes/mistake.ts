import { Logger } from 'yatsl';
import express, { Request, Response } from 'express';
import { requestWorkspaceData, requestWorkspaceList } from '../services/NetworkingService';

const logger = new Logger();
const router = express.Router();

// Routes concerning mistakes

// POST /api/mistakes - Returns mistake objects from hashes
router.post('/api/mistakes', (req: Request, res: Response) => {
	return res.sendStatus(200);
});

export { router as workspaceRouter };