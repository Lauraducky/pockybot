import Trigger from '../../models/trigger';
import Reset from './reset';
import Config from '../config-interface';
import constants from '../../constants';
import { Logger } from '../logger';
import { MessageObject, Webex } from 'webex/env';
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
	webex : Webex;

	constructor(winnersService : WinnersService, resultsService : ResultsService, pmResultsService: PmResultsService,
		resetService : Reset, config : Config, webex : Webex) {
		super();

		this.winnersService = winnersService;
		this.resultsService = resultsService;
		this.pmResultsService = pmResultsService;
		this.reset = resetService;
		this.config = config;
		this.webex = webex;
	}

	isToTriggerOn(message : MessageObject) : boolean {
		if (!(this.config.checkRole(message.personId, Role.Admin) || this.config.checkRole(message.personId, Role.Finish))) {
			return false;
		}

		let parsedMessage = xmlMessageParser.parseNonPegMessage(message);
		return parsedMessage.botId === constants.botId && parsedMessage.command.toLowerCase() === Command.Finish;
	}

	async createMessage(commandMessage: MessageObject, room: string): Promise<MessageObject> {
		let results: string;

		try {
			results = await this.resultsService.returnResultsMarkdown();
			Logger.debug('[Finish.createMessage] Got results');
		} catch (error) {
			Logger.error(`[Finish.createMessage] Error returning results: ${error.message}`);
			return { markdown: 'error returning results' };
		}

		this.webex.messages.create({
			markdown: results,
			roomId: room
		});

		try {
			await this.pmResultsService.pmResults();
			Logger.information(`[Finish.createMessage] Finished sending PMs.`);
		} catch(error) {
			Logger.error(`[Finish.createMessage] Error PMing results: ${error.message}`);
			return { markdown: `Error while trying to PM results` };
		}

		return undefined;
	}
}
