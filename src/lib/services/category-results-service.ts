import __logger from '../logger';
import HtmlHelper from '../parsers/htmlHelper';
import { Receiver } from '../../models/receiver';

export interface CategoryResultsService {
	returnCategoryResultsTable(results: Receiver[], categories: string[]): string
}

export class DefaultCategoryResultsService implements CategoryResultsService {

	constructor() {}

	returnCategoryResultsTable(results: Receiver[], categories: string[]): string {
		var tables = '';
		categories.forEach(category => {
			tables += `
			<h2>Category: ${HtmlHelper.uppercaseFirstChar(category)}</h2>
`;
			const categoryResults: Receiver[] = this.sortCategoryWinners(results, category);
			tables += HtmlHelper.generateTable(categoryResults);
		});
		return tables;
	}

	sortCategoryWinners(results: Receiver[], category: string): Receiver[] {
		var categoryResults: Receiver[] = JSON.parse(JSON.stringify(results));
		categoryResults.forEach(result => {
			result.pegs = result.pegs.filter(x => x.categories.includes(category));
		});
		categoryResults = categoryResults.filter(x => x.pegs.length > 0);
		categoryResults.sort((a, b) => b.pegs.length - a.pegs.length); //sort from most to least pegs
		return categoryResults;
	}
}
