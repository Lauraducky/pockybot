import Trigger from '../../models/trigger';
import Config from '../config';
import constants from '../../constants';
import TableHelper from '../parsers/tableHelper';
import { MessageObject } from 'ciscospark/env';
import { Role, ConfigRow } from '../../models/database';
import { ConfigAction } from '../../models/config-action';

export default class NumberConfig extends Trigger {
	readonly commandText : string = 'numberconfig';
	readonly numberConfigCommand : string = `(?: )*${this.commandText}(?: )*`;

	config : Config;

	constructor(config : Config) {
		super();

		this.config = config;
	}

	isToTriggerOn(message : MessageObject) : boolean {
		if (!(this.config.checkRole(message.personId, Role.Admin) || this.config.checkRole(message.personId, Role.Config))) {
			return false;
		}
		let pattern = new RegExp('^' + constants.optionalMarkdownOpening + constants.mentionMe + this.numberConfigCommand, 'ui');
		return pattern.test(message.html);
	}

	isToTriggerOnPM(message : MessageObject) : boolean {
		if (!(this.config.checkRole(message.personId, Role.Admin) || this.config.checkRole(message.personId, Role.Config))) {
			return false;
		}
		return message.text.toLowerCase().trim().startsWith(this.commandText);
	}

	async createMessage(message : MessageObject) : Promise<MessageObject> {
		message.text = message.text.toLowerCase();
		message.text = message.text.trim();

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

				const value = Number(words[3])

				if (isNaN(value)) {
					newMessage = 'Config must be set to a number';
					break;
				}

				this.config.setConfig(words[2], value);
				newMessage = 'Config has been set';
				break;
			case ConfigAction.Refresh:
				this.config.updateConfig();
				newMessage = 'Config has been updated';
				break;
			case ConfigAction.Delete:
				if (words.length < 3) {
					newMessage = 'You must specify a config to be deleted';
					break;
				}

				if (this.config.getConfig(words[2]) == null) {
					newMessage = `Config value "${words[2]}" does not exist`;
					break;
				}

				this.config.deleteConfig(words[2]);
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
		const numberConfig = this.config.getAllConfig();

		let columnWidths = this.getColumnWidths(numberConfig);

		let message = 'Here is the current config:\n';

		message += TableHelper.padString('Name', columnWidths.name) + ' | Value\n';

		numberConfig.forEach((config : ConfigRow) => {
			message += config.name.padEnd(columnWidths.name) + ' | ' + config.value + '\n';
		});

		return message;
	}

	private getColumnWidths(configValues : ConfigRow[]) : { name : number, value : number } {
		const stringWidth = require('string-width');

		let longestname = stringWidth('name');
		let longestvalue = stringWidth('value');

		configValues.forEach((value : ConfigRow) => {
			if (stringWidth(value.name) > longestname) {
				longestname = stringWidth(value.name);
			}

			if (stringWidth(value.value) > longestvalue) {
				longestvalue = stringWidth(value.value);
			}
		});

		return {
			name: longestname,
			value: longestvalue
		}
	}
}
