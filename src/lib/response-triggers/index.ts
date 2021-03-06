/* NOTE: Import all triggers here
		 to be use as factory.
		 This will allow responder to just import one file
		 and manage it all from one file.
*/

import { Logger } from '../logger';

// Triggers
import Trigger from '../../models/trigger';
import Results from './results';
import Winners from './winners';
import Reset from './reset';
import Peg from './peg';
import Unpeg from './unpeg';
import Status from './status';
import Update from './update';
import Finish from './finish';
import Welcome from './welcome';
import Help from './help';
import Ping from './ping';
import Keywords from './keywords';
import Rotation from './rotation';
import NumberConfig from './numberconfig';
import StringConfig from './stringconfig';
import RoleConfig from './roleconfig';
import LocationConfig from './locationconfig';
import UserLocation from './userlocation';
import RemoveUser from './removeuser';
import LocationWeight from './locationweight';
import Default from './default';

// Services
import { MessageObject } from 'webex/env';
const webex = require('webex/env');
import { Client } from 'pg';
import Utilities from '../utilities';
import Config from '../config';
import QueryHandler from '../database/query-handler';

import PockyDB from '../database/pocky-db';
import DbUsers from '../database/db-users';
import DbConfig from '../database/db-config';
import DbLocation from '../database/db-location';
import { DefaultWinnersService } from '../services/winners-service';
import { DefaultResultsService } from '../services/results-service';
import { DefaultPmResultsService } from '../services/pm-results-service';
import { DefaultFormatResultsService } from '../services/format-results-service';
import { DefaultCategoryResultsService } from '../services/category-results-service';
import { DefaultPegService } from '../services/peg-service';
import { DefaultGetUserLocationService } from '../services/get-user-location-service';
import { DefaultSetUserLocationService } from '../services/set-user-location-service';
import { DefaultDeleteUserLocationService } from '../services/delete-user-location-service';

// Service instantiation
const queryHandler = new QueryHandler(new Client());
const dbConfig = new DbConfig(queryHandler);
const config = new Config(dbConfig);
const utilities = new Utilities(config);
const dbUsers = new DbUsers(webex, queryHandler);
const dbLocation = new DbLocation(queryHandler);
const pockyDb = new PockyDB(queryHandler, dbUsers, utilities);
const pegService = new DefaultPegService(config, utilities, dbLocation);
const categoryResultsService = new DefaultCategoryResultsService();
const winnersService = new DefaultWinnersService(pockyDb, config, utilities, pegService);
const formatResultsService = new DefaultFormatResultsService(config, categoryResultsService);
const resultsService = new DefaultResultsService(pockyDb, formatResultsService, pegService, winnersService);
const pmResultsService = new DefaultPmResultsService(pockyDb, webex, utilities, pegService, resultsService);
const getUserLocationService = new DefaultGetUserLocationService(dbLocation, dbUsers);
const setUserLocationService = new DefaultSetUserLocationService(dbLocation, dbUsers);
const deleteUserLocationService = new DefaultDeleteUserLocationService(dbLocation);

pockyDb.loadConfig(config);
config.updateAll();

// Trigger instantiation
const peg = new Peg(webex, pockyDb, dbUsers, config);
const unpeg = new Unpeg(webex, dbUsers, utilities);
const reset = new Reset(pockyDb, config);
const winners = new Winners(winnersService, config);
const results = new Results(resultsService, config);
const status = new Status(webex, pockyDb, config, utilities);
const update = new Update(webex, dbUsers, config);
const finish = new Finish(winnersService, resultsService, pmResultsService, reset, config, webex);
const welcome = new Welcome(config);
const keywords = new Keywords(config);
const numberConfig = new NumberConfig(config);
const stringConfig = new StringConfig(config);
const roleConfig = new RoleConfig(dbUsers, config);
const help = new Help(config);
const ping = new Ping();
const rotation = new Rotation(config);
const locationConfig = new LocationConfig(dbLocation, config);
const userLocation = new UserLocation(config, getUserLocationService, setUserLocationService, deleteUserLocationService);
const removeUser = new RemoveUser(config, dbUsers, dbLocation, pockyDb);
const locationWeight = new LocationWeight(dbLocation, config);
const defaultTrigger = new Default();

const triggers : Trigger[] = [
	peg,
	welcome,
	help,
	ping,
	results,
	winners,
	reset,
	status,
	update,
	finish,
	unpeg,
	keywords,
	rotation,
	numberConfig,
	stringConfig,
	roleConfig,
	locationConfig,
	locationWeight,
	userLocation,
	removeUser,
	defaultTrigger,
];

/**
 * Returns a response Object that allows to create a message.
 * @param {string} message - message from room or user.
 * @param {string} room - the id of the room in which the message was received.
 * @return {SparkMessage} sparkMessage - use in conjunction with messages.create
 *                                       contains text or markdown field.
 */
export default async (message : MessageObject, room : string) => {
	try {
		const responder : Trigger = triggers.find(x => x.isToTriggerOn(message));
		if(responder) {
			Logger.information(`[Index.default] Found a trigger: ${responder.constructor.name}`);
			return await responder.createMessage(message, room);
		} else {
			Logger.information(`[Index.default] No trigger found.`);
			return null;
		}
	} catch (e) {
		Logger.error(`[Index.default] Error selecting trigger: ${e.message}`);
		return {
			markdown: 'An error occurred in selecting the trigger.',
		};
	}
};
