import * as fs from 'fs';
const storage = require('@google-cloud/storage');

import sinon = require('sinon');
import { Substitute } from '@fluffy-spoon/substitute';
import { DefaultResultsService, ResultsService } from '../lib/services/results-service';
import { FormatResultsService } from '../lib/services/format-results-service';
import { PegService } from '../lib/services/peg-service';
import { WinnersService } from '../lib/services/winners-service';
import { PockyDB } from '../lib/database/db-interfaces';
import { Peg } from '../models/peg';
import { Result } from '../models/result';
import TestEqualityService from './services/test-equality-services';

class ResultsServiceSpec {
	private clock: sinon.SinonFakeTimers;
	private now: Date;
	private todayString: string;
	private pegs: Peg[];

	private fakeExistsSync;
	private fakeWriteFileSync;
	private fakeStorage;

	private readonly database;
	private readonly formatResultsService;
	private readonly pegService;
	private readonly winnersService;
	private resultsService: ResultsService;

	private response: string;
	private results: Result[];

	public constructor() {
		this.database = Substitute.for<PockyDB>();
		this.pegService = Substitute.for<PegService>();
		this.winnersService = Substitute.for<WinnersService>();
		this.formatResultsService = Substitute.for<FormatResultsService>();

		this.resultsService = new DefaultResultsService(this.database, this.formatResultsService, this.pegService, this.winnersService);
	}

	public runTests() {
		describe('results service', () => {
			it('should return results markdown', async (done: DoneFn) => {
				this.givenTimerWorks();
				this.givenStorageWorks();
				this.givenResultsArrayExist();
				await this.whenReturnResultsMarkdownIsCalled();
				this.thenTheFileUrlShouldBeReturned();
				done();
			});

			it('should return results array', (done: DoneFn) => {
				this.givenTimerWorks();
				this.givenStorageWorks();
				this.givenPegsExist();
				this.whenGetResultsIsCalled();
				this.thenTheResultsShouldBeReturned();
				done();
			});

			afterEach(() => {
				sinon.restore();
				this.clock.restore();
			});
		});
	}

	private givenTimerWorks() {
		this.now = new Date();
		this.clock = sinon.useFakeTimers({
			now: this.now,
			shouldAdvanceTime: true
		});
		this.todayString = this.now.getFullYear() + '-' + (this.now.getMonth() + 1) + '-' + this.now.getDate()
			+ '-' + this.now.getHours() + '-' + this.now.getMinutes() + '-' + this.now.getSeconds();
	}

	private givenStorageWorks() {
		this.fakeExistsSync = sinon.fake.returns(false);
		this.fakeWriteFileSync = sinon.fake();

		sinon.replace(fs, 'existsSync', this.fakeExistsSync);
		sinon.replace(fs, 'writeFileSync', this.fakeWriteFileSync);

		this.fakeStorage = sinon.fake.returns({
			bucket: (name: string) => {
				return {
					upload: (name: string) => {
						return new Promise((resolve, reject) => {
							resolve([{
								makePublic: () => {
									return new Promise((resolve, reject) => { resolve(); })
								}
							}]);
						});
					}
				}
			}
		});

		sinon.stub(storage, 'Storage').callsFake(this.fakeStorage);

		process.env.GCLOUD_BUCKET_NAME = 'pocky-bot';
	}

	private givenResultsArrayExist() {
		this.database.returnResults().returns(this.promiseResolvingTo([]));
		this.formatResultsService.returnResultsHtml(null, null).returns(this.promiseResolvingTo(''));
		this.pegService.getPegs(null).returns([]);
		this.winnersService.getWinners(null).returns([]);
	}

	private givenPegsExist() {
		this.pegs = [
			this.createPeg('p2', 'Gillian', 'p3', 'Dula', '', [], true),
			this.createPeg('p2', 'Gillian', 'p1', 'Luke', '', [], true),
			this.createPeg('p1', 'Luke', 'p2', 'Gillian', '', [], true),
			this.createPeg('p1', 'Luke', 'p3', 'Dula', '', [], true),
			this.createPeg('p1', 'Luke', 'p2', 'Gillian', '', [], true),
			this.createPeg('p3', 'Dula', 'p2', 'Gillian', '', [], true),
			this.createPeg('b1', 'Gif', 'p1', 'Luke', '', [], false),
			this.createPeg('b1', 'Gif', 'p4', 'Jim', '', [], false),
			this.createPeg('p1', 'Luke', 'p3', 'Dula', '', [], true)
		];
	}

	private async whenReturnResultsMarkdownIsCalled() {
		this.response = await this.resultsService.returnResultsMarkdown();
	}

	private whenGetResultsIsCalled() {
		this.results = this.resultsService.getResults(this.pegs);
	}

	private thenTheFileUrlShouldBeReturned() {
		let expected = `[Here are all pegs given this cycle](https://storage.googleapis.com/pocky-bot/pegs-${this.todayString}.html)`;
		expect(this.response).toBe(expected);
	}

	private thenTheResultsShouldBeReturned() {
		let expected = [
			{
				personId: 'p1',
				personName: 'Luke',
				weightedPegsReceived: 3,
				validPegsReceived: [
					this.createPeg('p1', 'Luke', 'p2', 'Gillian', '', [], true),
					this.createPeg('p1', 'Luke', 'p3', 'Dula', '', [], true),
					this.createPeg('p1', 'Luke', 'p3', 'Dula', '', [], true),
					this.createPeg('p1', 'Luke', 'p2', 'Gillian', '', [], true),
				],
				penaltyPegsGiven: [
					this.createPeg('b1', 'Gif', 'p1', 'Luke', '', [], false)
				]
			},
			{
				personId: 'p2',
				personName: 'Gillian',
				weightedPegsReceived: 2,
				validPegsReceived: [
					this.createPeg('p2', 'Gillian', 'p3', 'Dula', '', [], true),
					this.createPeg('p2', 'Gillian', 'p1', 'Luke', '', [], true),
				],
				penaltyPegsGiven: []
			},
			{
				personId: 'p3',
				personName: 'Dula',
				weightedPegsReceived: 1,
				validPegsReceived: [
					this.createPeg('p3', 'Dula', 'p2', 'Gillian', '', [], true),
				],
				penaltyPegsGiven: []
			},
			{
				personId: 'p4',
				personName: 'Jim',
				weightedPegsReceived: -1,
				validPegsReceived: [],
				penaltyPegsGiven: [
					this.createPeg('b1', 'Gif', 'p1', 'Luke', '', [], false),
				]
			}
		];
		expect(TestEqualityService.resultArrayIsEqual(this.results, expected)).toBe(true);
	}

	private promiseResolvingTo(response: any) {
		return new Promise((resolve) => {
			resolve(response);
		});
	}

	private createPeg(receiverId: string, receiverName: string, senderId: string, senderName: string, comment: string, categories: string[], isValid: boolean): Peg {
		return {
			receiverId, receiverName, senderId, senderName, comment, categories, isValid
		};
	}


}

let spec = new ResultsServiceSpec();
spec.runTests();
