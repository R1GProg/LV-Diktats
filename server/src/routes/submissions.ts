import DiffONP from '@shared/diff-engine';
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
import { Register } from '../models/register';

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
	}, async (err, records: Submission[], info) => {
		if (err) {
			logger.error(err);
			return;
		}

		logger.info("Removing previous records...");
		mongoose.connection.db.dropCollection("submissions");


		let result = await Template.find();

		let template = result![0].message;
		for (let val of records) {
			logger.info(`Beginning processing of submission #${val.id}...`);
			// TODO: generate diff and categorise mistakes
			val.message = processString(val.message);
			const diff = new DiffONP(val.message, template);
			diff.calc();
			let mistakes = diff.getMistakes();
			let mistakesProcessed = 0;
			let mistakesDb: any[] = [];
			for (let val2 of mistakes) {
				let hash = await val2.genHash();
				let results = await Mistake.find({ hash: hash });
				// logger.log(results.length);
				if (results.length === 0) {
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
						registerId: undefined,
						boundsCorrect: val2.boundsCorrect,
						boundsCheck: val2.boundsCheck,
						boundsDiff: val2.boundsDiff,
						hash: hash
					};
					let res = Mistake.build(final);
					await res.save();

					mistakesDb.push(res._id);
				} else {
					mistakesDb.push(results[0]._id);
				}
				mistakesProcessed++;
				logger.info(`Processing of submission #${val.id}... (${mistakesProcessed}/${mistakes.length})`);
			}
			let record = Submission.build({ ...val, ...{ state: SubmissionStates.UNGRADED, mistakes: mistakesDb } });
			await record.save();
			logger.info(`Processed submission #${val.id}!`);
		}

		logger.info("CSV loaded into database!");
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
	let results = await Mistake.find({});
	logger.log(results.length);
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

// Submits a registry entry
router.post('/api/submitRegister', async (req: Request, res: Response) => {
	if (await Mistake.find({ "hash": req.query.hash }).count() === 0) return res.send("null");
	let mistake = await Mistake.findOne({ hash: req.query.hash });
	if (mistake === null) return res.send("null");
	let register = Register.build(req.body);
	await register.save();
	mistake!.registerId = register._id;
	await mistake!.save();
	return res.send("Submitted!");
});

// Gets a list of registry entries
router.get('/api/getRegisters', async (req: Request, res: Response) => {
	let registers = await Register.find({});
	return res.send(registers.map(x => x._id));
});

// Gets a registry entry
router.get('/api/getRegister', async (req: Request, res: Response) => {
	let register = await Register.findById(req.query.id);
	return res.send(JSON.stringify(register));
});

// Gets a registry entry
router.get('/api/getRegisterByMistake', async (req: Request, res: Response) => {
	if (await Mistake.find({ "hash": req.query.hash }).count() === 0) return res.send("null");
	let mistake = await Mistake.find({hash: req.query.hash});
	let register = await Register.findById(mistake[0].registerId);
	return res.send(JSON.stringify(register));
});

// Gets the mistake
router.get('/api/getMistake', async (req: Request, res: Response) => {
	if (await Mistake.find({ "hash": req.query.hash }).count() === 0) return res.send("null");
	Mistake.findOne({ hash: req.query.hash }).exec((err, result) => {
		if (err) {
			logger.error(err);
			return;
		}

		res.send(JSON.stringify(result));
	});
});

// Gets the mistake
router.get('/api/getMistakesInSubmission', async (req: Request, res: Response) => {
	if (req.query.id === undefined || (req.query.id! as string).match(/\D/)) return res.send("Invalid ID!");
	let id: number = parseInt(req.query.id! as string);
	let result = await Submission.findOne({ id: id });

	let mistakesPromises = result!.mistakes.map(async x => {
		return await Mistake.findById(x);
	});
	let mistakes = await Promise.all(mistakesPromises);

	res.send(JSON.stringify(mistakes));
});

// Gets the mistake
router.delete('/api/deleteMistake', async (req: Request, res: Response) => {
	Mistake.findOneAndDelete({ hash: req.query.hash });
	res.send("Gone.");
});

// Lists submission IDs
router.get('/api/listMistakes', async (req: Request, res: Response) => {
	let data = await Mistake.find({});
	let ids = data.map((a) => a.hash);
	res.send(ids);
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

		res.send(data[0].mistakes.length.toString());
	});
});


export { router as submissionRouter };