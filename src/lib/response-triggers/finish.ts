import Trigger from '../../models/trigger';
import Reset from './reset';
import Config from '../config';
import constants from '../../constants';
import __logger from '../logger';
import { MessageObject, CiscoSpark } from 'ciscospark/env';
import { Role } from '../../models/database';
import { PmResultsService } from '../services/pm-results-service';
import { ResultsService } from '../services/results-service';
import { WinnersService } from '../services/winners-service';
import { Command } from '../../models/command';
import xmlMessageParser from '../parsers/xmlMessageParser';

export default class Finish extends Trigger {
	winnersService: WinnersService;
	resultsService: ResultsService;
	pmResultsService: PmResultsService;
	reset : Reset;
	config : Config;
	spark : CiscoSpark;

	constructor(winnersService : WinnersService, resultsService : ResultsService, pmResultsService: PmResultsService,
		resetService : Reset, config : Config, spark : CiscoSpark) {
		super();

		this.winnersService = winnersService;
		this.resultsService = resultsService;
		this.pmResultsService = pmResultsService;
		this.reset = resetService;
		this.config = config;
		this.spark = spark;
	}

	isToTriggerOn(message : MessageObject) : boolean {
		if (!(this.config.checkRole(message.personId, Role.Admin) || this.config.checkRole(message.personId, Role.Finish))) {
			return false;
		}

		let parsedMessage = xmlMessageParser.parseXmlMessage(message);
		return parsedMessage.length === 2 && parsedMessage[0].name() === 'spark-mention'
			&& xmlMessageParser.getPersonId(parsedMessage[0].attr('data-object-id').value()) === constants.botId
			&& parsedMessage[1].text().trim().toLowerCase() === Command.Finish;
	}

	async createMessage(commandMessage : MessageObject, room : string) : Promise<MessageObject> {
		let winnersMarkdown: string;
		let resultsMarkdown: string;

		const winnersPromise = this.winnersService.returnWinnersResponse();
		const resultsPromise = this.resultsService.returnResultsMarkdown();
		await Promise.all([winnersPromise, resultsPromise])
			.then(function(values) {
				winnersMarkdown = values[0];
				resultsMarkdown = values[1];
			}).catch(function(error){
				__logger.error(`[Finish.createMessage] Error returning winners or results: ${error.message}`);
				return { markdown: `error returning winners or results` };
			});
		__logger.debug('[Finish.createMessage] Got winners and responses');

		let message = `## Winners\n\n` + winnersMarkdown + '\n\n';
		message += resultsMarkdown;

		this.spark.messages.create({
			markdown: message,
			roomId: room
		});

		try {
			await this.pmResultsService.pmResults();
			__logger.information(`[Finish.createMessage] Finished sending PMs.`);
		} catch(error) {
			__logger.error(`[Finish.createMessage] Error PMing results: ${error.message}`);
			return { markdown: `Error while trying to PM results` };
		}

		return undefined;
	}
}
