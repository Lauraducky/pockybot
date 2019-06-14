import Trigger from '../../models/trigger';
import constants from '../../constants';
import { PockyDB}  from '../database/db-interfaces';
import Config from '../config';
import { MessageObject, CiscoSpark } from 'ciscospark/env';
import { PegGiven, Role } from '../../models/database';
import { PegGivenData } from '../../models/peg-given-data';
import { Command } from '../../models/command';
import Utilities from '../utilities';
import xmlMessageParser from '../parsers/xmlMessageParser';

export default class Status extends Trigger {
	spark : CiscoSpark;
	database : PockyDB;
	config : Config;
	utilities : Utilities;

	constructor(sparkService : CiscoSpark, databaseService : PockyDB, config : Config, utilities : Utilities) {
		super();

		this.spark = sparkService;
		this.database = databaseService;
		this.config = config;
		this.utilities = utilities;
	}

	isToTriggerOn(message : MessageObject) : boolean {
		let parsedMessage = xmlMessageParser.parseXmlMessage(message);
		return parsedMessage.length === 2 && parsedMessage[0].name() === 'spark-mention'
		&& xmlMessageParser.getPersonId(parsedMessage[0].attr('data-object-id').value()) === constants.botId
			&& parsedMessage[1].text().trim().toLowerCase() === Command.Status;
	}

	isToTriggerOnPM(message : MessageObject) : boolean {
		return message.text.toLowerCase().trim() === Command.Status;
	}

	async createMessage(message : MessageObject) : Promise<MessageObject> {
		let fromPerson = message.personId;

		let pegs : PegGiven[] = await this.database.getPegsGiven(fromPerson);
		let map : PegGivenData[] = await this.mapIdToName(pegs);
		let mapped = await this.mapData(map, fromPerson);

		let response : string = `You have ${mapped.remaining} pegs left to give.`;

		if (mapped.hasPegged) {
			response += `

Here's the pegs you've given so far...
${mapped.goodPegs}`;
		} else {
			response += `

You have not given any pegs so far.`;
		}

		if (mapped.hasPenalised) {
			response += `

Here are the penalties you have received...
${mapped.penaltyPegs}`
		}

		return {
			markdown: response,
			toPersonId: fromPerson,
			roomId: null // Do this to over-write default
		};
	}

	mapIdToName(data : PegGiven[]) : Promise<PegGivenData[]> {
		const mapToDisplayNameAsync = data.reduce((promises : Promise<PegGivenData>[], item : PegGiven) => {
			return [...promises,
				Promise.all([
					this.spark.people.get(item.receiver),
					item.comment])
				.then(([receiver, comment]) => ({receiver: receiver.displayName, comment}))];
		}, []);
		return Promise.all(mapToDisplayNameAsync);
	}

	mapData(data : PegGivenData[], fromPerson : string) :
		{ goodPegs : string, penaltyPegs : string, remaining : string,
			hasPegged : boolean, hasPenalised : boolean } {
		let remaining = '';

		const keywords = this.config.getStringConfig('keyword');
		const penaltyKeywords = this.config.getStringConfig('penaltyKeyword');

		const nonPenaltyPegs = this.utilities.getNonPenaltyPegs(data, keywords, penaltyKeywords);

		const penaltyPegs = this.utilities.getPenaltyPegs(data, keywords, penaltyKeywords);

		const givenPegs = nonPenaltyPegs.length;

		if (this.config.checkRole(fromPerson, Role.Unmetered)) {
			remaining = 'unlimited';
		} else {
			remaining = (this.config.getConfig('limit') - givenPegs).toString();
		}

		const pegMessageReducer = (msg, p) => msg + `* **${p.receiver}** — "_${p.comment}_"\n`;

		return {
			goodPegs: nonPenaltyPegs.reduce(pegMessageReducer, ''),
			penaltyPegs: penaltyPegs.reduce(pegMessageReducer, ''),
			remaining: remaining,
			hasPegged: nonPenaltyPegs.length > 0,
			hasPenalised: penaltyPegs.length > 0
		};
	}
}
