import { Result } from '../../models/result';
import { Peg } from '../../models/peg';

function generateTable(receivers: Result[], section: string = null) : string {
	let htmlTable =
'					<table class="table pb-3">';
	if(section) {
		htmlTable =
`					<table id="section-${section}" class="table pb-3 collapse">`;
	}

	receivers.forEach((result: Result, index: number) => {
		const subsectionId = section ? `section-${section}-${index}` : null;

		htmlTable += `
						<thead class="thead-light ${section ? `clickable" data-toggle="collapse" data-target="#${subsectionId}" aria-expanded="true" aria-controls="${subsectionId}`:''}">
							<tr><th colspan="5">${section ? '<i class="fas fa-plus"></i><i class="fas fa-minus"></i>' : ''} ${result.personName}${result.personLocation ? ` (${result.personLocation})` : ''} &mdash; ${pegsReceived(result.weightedPegsReceived, result.validPegsReceived, section)}</th></tr>
						</thead>
						<tbody ${section ? `id="${subsectionId}" class="collapse show"` : ''}>`;

		result.validPegsReceived.sort((a, b) => a.senderName.localeCompare(b.senderName));

		result.validPegsReceived.forEach((peg: Peg) => {
			htmlTable += `
							<tr><td>${peg.senderName}</td><td>${peg.pegWeighting}</td><td>${peg.comment}</td><td>${peg.categories.join(', ')}</td><td>${peg.senderLocation ? peg.senderLocation : ''}</td></tr>
`;
		});

		htmlTable +=
`						</tbody>
`;
	});
	htmlTable +=
`					</table>`;

	return htmlTable;
}

function generateCategoryResultsTable(receivers: Result[], section: string = null) : string {
	let htmlTable =
'					<table class="table pb-3">';
	if(section) {
		htmlTable =
`					<table id="section-${section}" class="table pb-3 collapse">`;
	}

	receivers.forEach((result: Result, index: number) => {
		const subsectionId = section ? `section-${section}-${index}` : null;

		htmlTable += `
						<thead class="thead-light ${section ? `clickable" data-toggle="collapse" data-target="#${subsectionId}" aria-expanded="true" aria-controls="${subsectionId}`:''}">
							<tr><th colspan="3">${section ? '<i class="fas fa-plus"></i><i class="fas fa-minus"></i>' : ''} ${result.personName} &mdash; ${pegsReceived(result.weightedPegsReceived, result.validPegsReceived, section)}</th></tr>
						</thead>
						<tbody ${section ? `id="${subsectionId}" class="collapse show"` : ''}>`;

		result.validPegsReceived.sort((a, b) => a.senderName.localeCompare(b.senderName));

		result.validPegsReceived.forEach((peg: Peg) => {
			htmlTable += `
							<tr><td>${peg.senderName}</td><td>${peg.comment}</td><td>${peg.categories.join(', ')}</td></tr>
`;
		});

		htmlTable +=
`						</tbody>
`;
	});
	htmlTable +=
`					</table>`;

	return htmlTable;
}

function generatePenaltyTable(receivers: Result[]): string {
	let htmlTable =
		`					<table id="section-penalties" class="table pb-3 collapse">`;

	receivers.forEach((result: Result, index: number) => {
		if (result.penaltyPegsGiven.length !== 0) {
			const subsectionId = `section-penalties-${index}`;

			htmlTable += `

						<thead class="thead-light clickable" data-toggle="collapse" data-target="#${subsectionId}" aria-expanded="true" aria-controls="${subsectionId}">
							<tr><th colspan="3"><i class="fas fa-plus"></i><i class="fas fa-minus"></i> ${result.personName ? result.personName : 'somebody shameful'} &mdash; ${result.penaltyPegsGiven.length}</th></tr>
						</thead>
						<tbody id="${subsectionId}" class="collapse show">`;

			result.penaltyPegsGiven.sort((a, b) => a.receiverName.localeCompare(b.receiverName));

			result.penaltyPegsGiven.forEach((peg: Peg) => {
				htmlTable += `
							<tr><td>${peg.receiverName}</td><td>${peg.comment}</td><td></td></tr>
`;
			});

			htmlTable +=
				`						</tbody>
`;
		}
	});
	htmlTable +=
		`					</table>`;

	return htmlTable;

}

function uppercaseFirstChar(word: string) : string {
	return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Return a string describing how many pegs the user received, both weighted and unweighted
 * appropriately pluralising (or not) the word 'peg'
 */
function pegsReceived(weightedPegs: number, validPegsReceived: Peg[], section: string): string {
	const validPegs = validPegsReceived.length;

	const numberOfPegs = (weightedPegs: number, validPegs: number): string => {
		if (weightedPegs === validPegs) {
			return `${weightedPegs}`;
		} else {
			return `${weightedPegs} (${validPegs})`
		}
	};

	if (!(['winners', 'losers'].includes(section))) {
		weightedPegs = validPegs;
	}

	if (Math.abs(weightedPegs) === 1 && validPegs === 1) {
		return `${numberOfPegs(weightedPegs, validPegs)} peg total`;
	}

	if (Math.abs(weightedPegs) === 1 || validPegs === 1) {
		return `${numberOfPegs(weightedPegs, validPegs)} peg(s) total`;
	}

	return `${numberOfPegs(weightedPegs, validPegs)} pegs total`
}

export default {
	generateTable,
	generatePenaltyTable,
	generateCategoryResultsTable,
	uppercaseFirstChar
}
