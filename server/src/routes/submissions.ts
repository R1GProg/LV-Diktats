import { IAction, IMistake } from './../models/mistake';
import { Logger } from 'yatsl';
import express, { Request, response, Response } from 'express';
import { parse } from 'csv-parse';
import { Submission, SubmissionStates } from '../models/submission';
import mongoose from 'mongoose';
import { Template } from '../models/template';
import { Mistake } from '../models/mistake';
import cors from 'cors';
import { processString } from '@shared/normalization';
import { Diff_ONP } from '@shared/diff-engine';

const logger = new Logger();
const router = express.Router();
router.use(cors());

type Submission = {
	id: number;
	created_at: string;
	message: string;
	age: number;
	language: string;
	language_other: string;
	level: string;
	degree: string;
	country: string;
	city: string;
};

// Takes a CSV and loads it into the DB
router.post('/api/loadCSV', async (req: Request, res: Response) => {
	logger.info("Loading CSV...");
	let csv = req.body;
	parse(csv, {
		delimiter: ',',
		from_line: 2,
		columns: ["id", "created_at", "message", "age", "language", "language_other", "level", "degree", "country", "city"]
	}, (err, records: Submission[], info) => {
		if (err) {
			logger.error(err);
			return;
		}

		logger.info("Removing previous records...");
		mongoose.connection.db.dropCollection("submissions");


		Template.find().exec((err, result) => {
			if (err) {
				logger.error(err);
				return;
			}

			let template = result![0].message;
			records.forEach(async (val) => {
				// logger.debug(`Writing submission #${val.id}...`);
				// TODO: generate diff and categorise mistakes
				val.message = processString(val.message);
				const diff = new Diff_ONP(val.message, template);
				diff.calc();
				let mistakes = diff.getMistakes();
				let mistakesDb: any[] = [];
				mistakes.forEach(async (val2) => {
					let results = Mistake.find({ "actions.hash": val2.actions[0].hash });
					if (await results.count() === 0) {
						let final: IMistake = {
							actions: await Promise.all(val2.actions.map(async (x) => {
								let actionFinal: IAction = {
									id: x.id,
									type: x.type,
									subtype: x.subtype,
									indexCheck: x.indexCheck,
									indexCorrect: x.indexCorrect,
									indexDiff: x.indexDiff,
									char: x.char,
									charBefore: x.charBefore,
									hash: await x.hash
								};
								return actionFinal;
							})),
							type: val2.type,
							registerId: val2.registerId,
							boundsCorrect: val2.boundsCorrect,
							boundsCheck: val2.boundsCheck,
							boundsDiff: val2.boundsDiff
						};
						mistakesDb.push(final);
					} else {
						results.exec((err, res) => {
							if (err) {
								logger.error(err);
								return;
							}

							mistakesDb.push(res[0]);
						});
					}
				})
				let record = Submission.build({ ...val, ...{ state: SubmissionStates.UNGRADED, mistakes: mistakesDb } });
				await record.save();
			});

			logger.info("Done!");
		});
	});
	return res.send("Loaded!");
});

// Lists submission IDs
router.get('/api/listSubmissions', (req: Request, res: Response) => {
	Submission.find({}).exec((err, data) => {
		if (err) {
			logger.error(err);
			return;
		}

		let ids = data.map((a) => a.id);
		res.send(ids);
	});
});

// Gets a submission by ID
router.get('/api/getSubmission', (req: Request, res: Response) => {
	if (req.query.id === undefined || (req.query.id! as string).match(/\D/)) return res.send("Invalid ID!");
	let id: number = parseInt(req.query.id! as string);
	Submission.findOne({ id: id }).exec((err, result) => {
		if (err) {
			logger.error(err);
			return;
		}

		res.send(result!.message);
	});
});

// Submits a template to check against
router.post('/api/submitTemplate', async (req: Request, res: Response) => {
	mongoose.connection.db.dropCollection("templates");
	let template = Template.build({ message: req.body });
	await template.save();
	return res.send("Loaded!");
});

// Gets the template
router.get('/api/getTemplate', async (req: Request, res: Response) => {
	Template.find().exec((err, result) => {
		if (err) {
			logger.error(err);
			return;
		}

		res.send(result![0].message);
	});
});

// Submits an mistake
router.post('/api/submitMistake', async (req: Request, res: Response) => {
	let mistake = Mistake.build(req.body);
	await mistake.save();
	return res.send("Loaded!");
});

// Gets the mistake
router.get('/api/getMistake', async (req: Request, res: Response) => {
	if (await Mistake.find({ "actions.hash": req.query.hash }).count() === 0) return res.send("null");
	Mistake.findOne({ hash: req.query.hash }).exec((err, result) => {
		if (err) {
			logger.error(err);
			return;
		}

		res.send(JSON.stringify(result));
	});
});

// Gets the mistake
router.delete('/api/deleteMistake', async (req: Request, res: Response) => {
	Mistake.findOneAndDelete({ "actions.hash": req.query.hash });
	res.send("Gone.");
});

// Lists submission IDs
router.get('/api/listMistakes', (req: Request, res: Response) => {
	Mistake.find({}).exec((err, data) => {
		if (err) {
			logger.error(err);
			return;
		}

		let ids = data.map((a) => a.actions[0].hash);
		res.send(ids);
	});
});

// Shows number of mistakes in a submission
router.get('/api/getMistakeCount', (req: Request, res: Response) => {
	if (req.query.id === undefined || (req.query.id! as string).match(/\D/)) return res.send("Invalid ID!");
	let id: number = parseInt(req.query.id! as string);
	Submission.find({ id: id }).exec((err, data) => {
		if (err) {
			logger.error(err);
			return;
		}
		if (data.length === 0) return res.send("Invalid ID!");

		res.send(data[0].mistakes.length);
	});
});


export { router as submissionRouter };