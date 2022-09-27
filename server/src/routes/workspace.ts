import { Logger } from 'yatsl';
import express, { Request, Response } from 'express';
import { requestWorkspaceData, requestWorkspaceList } from '../services/NetworkingService';

const logger = new Logger();
const router = express.Router();

// Routes concerning workspaces

// GET / - Returns 200, used to check if the server is alive
router.get('/', (req: Request, res: Response) => {
	return res.sendStatus(200);
});

// GET /api/workspaces - Returns a list of available workspaces
router.get('/api/workspaces', (req: Request, res: Response) => {
	requestWorkspaceList((workspaces) => {
		return res.send(workspaces);
	})
});

// GET /api/workspace/[ID] - Returns a workspace
router.get('/api/workspace/*+', async (req: Request, res: Response) => {
	const route = req.url.split('/');
	const workspaceId = route[route.length - 1];
	requestWorkspaceData(workspaceId, (workspace) => {
		if (!workspace) return res.sendStatus(404);
		return res.send(workspace);
	})
});

export { router as workspaceRouter };