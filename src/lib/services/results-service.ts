import constants from '../../constants';
import __logger from '../logger';
import * as fs from 'fs';
import { FormatResultsService } from './format-results-service';
const storage = require('@google-cloud/storage');

export interface ResultsService {
	returnResultsMarkdown() : Promise<string>
}

export class DefaultResultsService implements ResultsService {
	formatResultsService: FormatResultsService;

	constructor(formatResultsService: FormatResultsService) {
		this.formatResultsService = formatResultsService;
	}

	async returnResultsMarkdown() : Promise<string> {
		const now = new Date();
		const todayString = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate()
		 + '-' + now.getHours() + '-' + now.getMinutes() + '-' + now.getSeconds();

		const filePath = `${__dirname}/../../../pegs-${todayString}`;
		if (fs.existsSync(filePath + '.txt')) {
			fs.unlinkSync(filePath + '.txt');
		}
		__logger.information("[ResultsService.returnResultsMarkdown] File path: " + filePath);

		const html = await this.formatResultsService.returnResultsHtml();

		fs.writeFileSync(filePath + '.html', html);

		const client = new storage.Storage();
		let response = await client.bucket(process.env.GCLOUD_BUCKET_NAME).upload(filePath + '.html');
		let file = response[0];
		await file.makePublic();

		const fileUrl = `${constants.googleUrl}${process.env.GCLOUD_BUCKET_NAME}/pegs-${todayString}.html`;
		const markdown = `[Here are all pegs given this cycle](${fileUrl})`;

		return markdown;
	}
}