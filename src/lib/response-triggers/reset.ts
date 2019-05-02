import Trigger from '../../models/trigger';
import constants from '../../constants';
import { PockyDB } from '../database/db-interfaces';
import Config from '../config';
import __logger from '../logger';
import { MessageObject } from 'ciscospark/env';
import { Role } from '../../models/database';
import { Command } from '../../models/command';

const resetCommand = `(?: )*${Command.Reset}(?: )*`;

export default class Reset extends Trigger {
	database : PockyDB;
	config : Config;

	constructor(databaseService : PockyDB, config : Config) {
		super();

		this.database = databaseService
		this.config = config;
	}

	isToTriggerOn(message : MessageObject) : boolean {
		if (!(this.config.checkRole(message.personId, Role.Admin) || this.config.checkRole(message.personId, Role.Reset))) {
			return false;
		}

		let pattern = new RegExp('^' + constants.optionalMarkdownOpening + constants.mentionMe + resetCommand, 'ui');
		return pattern.test(message.html);
	}

	async createMessage() : Promise<MessageObject> {
		try {
			await this.database.reset();
			return {
				markdown: `Pegs cleared`
			};
		} catch (e) {
			__logger.error(`[Reset.createMessage] Error clearing pegs: ${e.message}`);
			return {
				markdown: `Error clearing pegs`
			};
		}
	}
}
