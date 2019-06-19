import Trigger from '../../models/trigger';
import Config from '../config-interface';
import constants from '../../constants';
import TableHelper from '../parsers/tableHelper';
import { MessageObject } from 'webex/env';
import { Role } from '../../models/database';
import { ConfigAction } from '../../models/config-action';
import xmlMessageParser from '../parsers/xmlMessageParser';
import DbUsers from '../database/db-users';
import { Element } from 'libxmljs';
import tableHelper from '../parsers/tableHelper';
import { Command } from '../../models/command';

export default class RoleConfig extends Trigger {
	dbUsers : DbUsers;
	config : Config;

	constructor(dbUsers : DbUsers, config : Config) {
		super();

		this.dbUsers = dbUsers;
		this.config = config;
	}

	isToTriggerOn(message : MessageObject) : boolean {
		if (!(this.config.checkRole(message.personId, Role.Admin) || this.config.checkRole(message.personId, Role.Config))) {
			return false;
		}

		let parsedMessage = xmlMessageParser.parseNonPegMessage(message);
		return parsedMessage.botId === constants.botId && parsedMessage.command.toLowerCase().startsWith(Command.RoleConfig);
	}

	async createMessage(message : MessageObject) : Promise<MessageObject> {
		const parsedMessage = xmlMessageParser.parseXmlMessage(message);

		let response : string;

		if (parsedMessage.length < 2) {
			return { markdown: `Please specify a command. Possible values are ${Object.values(ConfigAction).join(', ')}` };
		}

		let pattern = new RegExp('^' + Command.RoleConfig, 'ui');
		const command = parsedMessage[1].text().toLowerCase().trim().replace(pattern, '').trim();

		try {
			switch (command) {
				case ConfigAction.Get:
					response = await this.getConfigMessage();
					break;
				case ConfigAction.Set: {
					const { userId, username, role } = this.parseSetDeleteMessage(message, parsedMessage);

					if (this.config.getRoles(userId).includes(role)) {
						response = `Role "${role}" is already set for user "${username}".`;
						break;
					}

					this.config.setRole(userId, role);
					response = 'Role has been set';
					break;
				}
				case ConfigAction.Refresh:
					this.config.updateRoles();
					response = 'Roles has been updated';
					break;
				case ConfigAction.Delete: {
					const { userId, username, role } = this.parseSetDeleteMessage(message, parsedMessage);

					if (!this.config.getRoles(userId).includes(role)) {
						response = `Role "${role}" is not set for user "${username}"`;
						break;
					}

					this.config.deleteRole(userId, role);
					response = 'Role has been deleted';
					break;
				}
				default:
					response = 'Unknown config command';
					break;
			}
		} catch (error) {
			return { markdown : error.message };
		}

		return {
			markdown: response
		};
	}

	private parseSetDeleteMessage(message: MessageObject, parsedMessage : Element[]) : { userId : string, username : string, role : Role } {
		if (parsedMessage.length < 4) {
			throw new Error('You must specify a user and a role to set/delete.');
		}

		if (!xmlMessageParser.isMentionOfPerson(parsedMessage[2])) {
			throw new Error('Please mention a user you want to set/delete a role for');
		}

		let role = parsedMessage[3].text().toUpperCase().trim();
		if (!Object.values(Role).includes(role)) {
			throw new Error(`Invalid role ${role}. Valid values are: ${Object.values(Role).join(', ')}`);
		}

		const userId = xmlMessageParser.getPersonId(parsedMessage[2].attr('data-object-id').value());
		const username = parsedMessage[2].text();

		try {
			let exists = this.dbUsers.existsOrCanBeCreated(userId);
			if (!exists) {
				throw new Error(`User ${username} could not be found or created. Exiting.`);
			}
		} catch (error) {
			throw new Error(`Error: User ${username} could not be found or created. Exiting.`);
		}

		return {
			userId : userId,
			username : username,
			role : role as Role
		};
	}

	private async getConfigMessage() : Promise<string> {
		const roles = this.config.getAllRoles();

		let columnWidths = tableHelper.getRolesColumnWidths(roles);

		let message = 'Here is the current config:\n```\n';

		message += TableHelper.padString('Name', columnWidths.name) + ' | Value\n';

		for (const config of roles) {
			const user = await this.dbUsers.getUser(config.userid);
			message += config.role.padEnd(columnWidths.name) + ' | ' + user.username + '\n';
		}

		message += '```';

		return message;
	}
}
