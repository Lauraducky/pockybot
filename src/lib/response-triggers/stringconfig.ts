import Trigger from '../../models/trigger';
import Config from '../config';
import constants from '../../constants';
import TableHelper from '../parsers/tableHelper';
import { MessageObject } from 'ciscospark/env';
import { Role, StringConfigRow } from '../../models/database';
import { ConfigAction } from '../../models/config-action';
import tableHelper from '../parsers/tableHelper';

export default class StringConfig extends Trigger {
	readonly commandText : string = 'stringconfig';
	readonly stringConfigCommand : string = `(?: )*${this.commandText}(?: )*`;

	config : Config;

	constructor(config : Config) {
		super();

		this.config = config;
	}

	isToTriggerOn(message : MessageObject) : boolean {
		if (!(this.config.checkRole(message.personId, Role.Admin) || this.config.checkRole(message.personId, Role.Config))) {
			return false;
		}
		let pattern = new RegExp('^' + constants.optionalMarkdownOpening + constants.mentionMe + this.stringConfigCommand, 'ui');
		return pattern.test(message.html);
	}

	async createMessage(message : MessageObject) : Promise<MessageObject> {
		message.text = message.text.toLowerCase();
		const pattern = new RegExp('^' + constants.botName, 'ui');
		message.text = message.text.trim().replace(pattern, '').trim();

		let words = message.text.split(' ');

		let newMessage : string;

		if (words.length < 2) {
			return { markdown: `Please specify a command. Possible values are ${Object.values(ConfigAction).join(', ')}` };
		}

		switch (words[1]) {
			case ConfigAction.Get:
				newMessage = this.getConfigMessage();
				break;
			case ConfigAction.Set:
				if (words.length < 4) {
					newMessage = 'You must specify a config name and value to set';
					break;
				}

				if (this.config.getStringConfig(words[2]).includes(words[3])) {
					newMessage = `Config value "${words[3]}" already exists in string config under name "${words[2]}".`;
					break;
				}

				this.config.setStringConfig(words[2], words[3]);
				newMessage = 'Config has been set';
				break;
			case ConfigAction.Refresh:
				this.config.updateStringConfig();
				newMessage = 'Config has been updated';
				break;
			case ConfigAction.Delete:
				if (words.length < 4) {
					newMessage = 'You must specify a config name and value to be deleted';
					break;
				}

				if (!this.config.getStringConfig(words[2]).includes(words[3])) {
					newMessage = `Value "${words[3]}" does not exist in string config under name "${words[2]}"`;
					break;
				}

				this.config.deleteStringConfig(words[2], words[3]);
				newMessage = 'Config has been deleted';
				break;
			default:
				newMessage = 'Unknown config command';
				break;
		}

		return {
				markdown: newMessage
		};
	}

	private getConfigMessage() : string {
		const stringConfig = this.config.getAllStringConfig();

		let columnWidths = tableHelper.getStringConfigColumnWidths(stringConfig);

		let message = 'Here is the current config:\n```\n';

		message += TableHelper.padString('Name', columnWidths.name) + ' | Value\n';

		stringConfig.forEach((config : StringConfigRow) => {
			message += config.name.padEnd(columnWidths.name) + ' | ' + config.value + '\n';
		});

		message += '```';

		return message;
	}
}