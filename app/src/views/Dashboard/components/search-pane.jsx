import React from 'react';
import {connect} from 'react-redux';
import {Button, Input, Radio} from 'antd';
import {
	CheckOutlined,
	ClearOutlined,
	DeleteOutlined,
	HistoryOutlined,
	LeftOutlined,
	RightOutlined,
	SaveOutlined,
	SearchOutlined,
	SendOutlined
} from '@ant-design/icons';
import moment from 'moment';
import _ from 'lodash';
import {Notif} from '../../../atomic/notification.jsx';
import {
	clearSearchResults,
	deleteSavedQuery,
	loadQuery,
	loadQueryFromHistory,
	runAutocomplete,
	runSearch,
	saveQuery,
	setQueryCombination,
	setQueryMatching,
	setQueryTerms
} from '../../../store/actions/searchActions';
import {displayPopin, removePopin} from '../../../store/actions/uiActions';
import {PopinOrientation, SearchQueryCombination, SearchQueryMatching} from '../../../store/defs';
import '../../../styles/search.css';
import {PmsiDocument} from './Documents/pmsi-document.jsx';
import {DocumentsDocument} from './Documents/documents-document.jsx';
import {QrDocument} from './Documents/qr-document.jsx';
import {BacteriologyDocument} from './Documents/bacteriology-document.jsx';
import {LrDocument} from './Documents/lr-document.jsx';
import {LrTransverseDocument} from './Documents/lr-transverse-document.jsx';
import {MedicationDocument} from './Documents/medication-document.jsx';
import {MedicationTransverseDocument} from './Documents/medication-transverse-document.jsx';

const grep = (terms, ncw) => text => {
    if (!(isNaN(text))) text = String(text);
	const stext = text.split(' ').filter(a => a && a !== 'NEWLINESEP').join(' ').normalize('NFC');
	const ntext = stext.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');

	return terms.split(',').filter(a => a).map(a => a.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')).map((term, i) => {
		const l = ntext.indexOf(term);

		return l > -1 ? [
			stext.slice(0, l).split(' ').filter(a => a).slice(-ncw).join(' '),
			stext.slice(l, l + term.length),
			stext.slice(l + term.length).split(' ').filter(a => a).slice(0, ncw).join(' '),
			i
		] : null;
	}).filter(a => a);
}

const flattenQrList = a => [a.title, ...(a.children || []).reduce((a, b) => [...a, ...flattenQrList(b)], [])];

class SaveQueryPopin extends React.PureComponent {
	constructor(props) {
		super(props);

		this.state = {
			name: ''
		}
	}

	setName = e => this.setState({name: e.target.value});
	submit = () => this.props.onSubmit && this.props.onSubmit(this.state.name);

	render = () => <div className="frow">
		<Input value={this.state.name} onChange={this.setName} onPressEnter={this.submit} placeholder="Nom" />
		<Button onClick={this.submit} disabled={!this.state.name} icon={<CheckOutlined />} type="primary" />
	</div>;
}

const LoadQueryPopin = connect(state => ({
	queries: state.search.savedQueries
}), {deleteSavedQuery})(class LoadQueryPopin extends React.PureComponent {
	constructor(props) {
		super(props);

		this.state = {
			delete: null
		};
	}

	loadQuery = i => () => this.props.onLoadQuery && this.props.onLoadQuery(i);
	cancelDeleteQuery = i => () => this.state.delete === i && this.setState({delete: null});

	deleteQuery = i => () => {
		if (this.state.delete === i) {
			this.props.deleteSavedQuery(i);
			this.setState({delete: null});
		} else
			this.setState({delete: i});
	};

	render = () => <div className="fcol search-lpqi">
		{(this.props.queries || []).map(({name, query}, i) =>
			<div key={`${name}:${query.combination}:${query.matching}:${query.terms}`}
				className="frow fjspace facenter search-lpqi-query">
				<div className="fcol">
					<div className="search-lqpi-query-name">{name}</div>
					<div className="frow fgaph search-lqpi-query-details">
						<div>{{[SearchQueryCombination.AND]: '&', [SearchQueryCombination.OR]: '|'}[query.combination]}</div>
						<div>{{[SearchQueryMatching.EQUAL]: '=', [SearchQueryMatching.LIKE]: '~'}[query.matching]}</div>
						<div>{query.terms}</div>
					</div>
				</div>

				<div className="frow fgap">
					<Button onClick={this.deleteQuery(i)} onBlur={this.cancelDeleteQuery(i)}
						icon={this.state.delete === i ? <CheckOutlined /> : <DeleteOutlined />}
						danger={this.state.delete === i} type={this.state.delete === i ? "primary" : "ghost"} />
					<Button onClick={this.loadQuery(i)} icon={<SendOutlined />} type="primary" />
				</div>
			</div>)}
	</div>;
})

class SearchPane extends React.PureComponent {
	constructor(props) {
		super(props);

		this.autocompleteTimeout = null;

		this.state = {
			selectedSuggestion: {in: null, key: 0}
		};
	}

	setQueryMatching = e => {
		this.props.setQueryMatching(e.target.value);

		if (this.props.queryTerms)
			this.props.runSearch(this.props.patientId, this.props.searchStartDate, this.props.searchEndDate);
	}

	setQueryCombination = e => {
		this.props.setQueryCombination(e.target.value);

		if (this.props.queryTerms)
			this.props.runSearch(this.props.patientId, this.props.searchStartDate, this.props.searchEndDate);
	}

	runSearch = () => this.props.queryTerms ? this.props.runSearch(this.props.patientId, this.props.searchStartDate, this.props.searchEndDate, this.onSearchError) : this.props.clearSearchResults();

	onSearchError = e => {
		if (e.name === 'HttpError') {
			if (e.code !== 401)
				Notif('error', `Erreur ${e.code}`,
					`La recherche a échoué. Le serveur a répondu: ${(e.response && e.response.data && (e.response.data.message || e.response.data.error)) || `${e.code} ${e.message}.`}`);
		} else
			Notif('error', 'Service indisponible',
				`Une erreur inattendue s'est produite lors de la recherche. Vérifiez votre connexion et réessayez.`);
	}

	onTermsInput = e => {
		this.props.setQueryTerms(e.target.value);

		if (this.autocompleteTimeout)
			clearTimeout(this.autocompleteTimeout);

		this.autocompleteTimeout = setTimeout(() => this.props.runAutocomplete(this.props.patientId), 200);
	}

	onTermsKeyDown = e => {
		// eslint-disable-next-line default-case
		switch (e.key) {
			case 'ArrowUp':
				if (this.props.autocomplete.length > 0) {
					e.preventDefault();

					this.setState({selectedSuggestion: {
						in: this.props.autocomplete,
						key: this.state.selectedSuggestion.in === this.props.autocomplete && this.state.selectedSuggestion.key >= 1
							? this.state.selectedSuggestion.key - 1 : this.props.autocomplete.length - 1
					}});
				}
				break;

			case 'ArrowDown':
				if (this.props.autocomplete.length > 0) {
					e.preventDefault();

					this.setState({selectedSuggestion: {
						in: this.props.autocomplete,
						key: this.state.selectedSuggestion.in === this.props.autocomplete && this.state.selectedSuggestion.key < this.props.autocomplete.length - 1
							? this.state.selectedSuggestion.key + 1 : 0
					}});
				}
				break;

			case 'Tab':
				if (this.props.autocomplete.length > 0) {
					e.preventDefault();

					this.acceptAutocomplete(this.state.selectedSuggestion.in === this.props.autocomplete
						? this.props.autocomplete[this.state.selectedSuggestion.key] : this.props.autocomplete[0])();
				}
				break;

			case 'Enter':
				e.preventDefault();

				if (this.props.autocomplete.length > 0 && this.state.selectedSuggestion.in === this.props.autocomplete)
					this.acceptAutocomplete(this.props.autocomplete[this.state.selectedSuggestion.key])();
				else
					this.runSearch();
				break;
		}
	}

	acceptAutocomplete = term => () => {
		this.props.setQueryTerms([...this.props.queryTerms.split(',').slice(0, -1), term].join(','));
	}

	clearSearch = () => {
		this.props.setQueryTerms('');
		this.props.clearSearchResults();
	}

	doSaveQuery = name => {
		this.props.saveQuery(name);
		this.props.removePopin();
	};

	startSaveQuery = e => {
		const box = e.target.getBoundingClientRect();

		this.props.displayPopin(<SaveQueryPopin onSubmit={this.doSaveQuery} />,
			[box.x + box.width / 2, box.y + box.height / 2], [250, 32], PopinOrientation.HORIZONTAL);
	};

	doLoadQuery = i => {
		this.props.loadQuery(i);
		this.props.runSearch(this.props.patientId, this.props.searchStartDate, this.props.searchEndDate);
		this.props.removePopin();
	};

	startLoadQuery = e => {
		const box = e.target.getBoundingClientRect();

		this.props.displayPopin(<LoadQueryPopin onLoadQuery={this.doLoadQuery} />,
			[box.x + box.width / 2, box.y + box.height / 2], [350, 250], PopinOrientation.VERTICAL);
	};

	loadPreviousQuery = () => this.props.loadQueryFromHistory(this.props.historyPosition > 0 ? this.props.historyPosition - 1 : this.props.historyLength - 1);
	loadNextQuery = () => this.props.loadQueryFromHistory(this.props.historyPosition + 1);

	openDocument = (title, content) => () => this.props.onOpenDocument && this.props.onOpenDocument(title, content);

    generatePMSIResults = (pmsis) => (
        this.props.getTimelineVisibleFunction("PMSI") && pmsis && pmsis.subTimelines && pmsis.subTimelines.length ?
            pmsis.subTimelines.reduce((t, sub, s) =>
                this.props.getTimelineVisibleFunction("PMSI", sub.name) ?
                    [...t, ...sub?.points.reduce((a, [_, b], i) =>
                        [...a, ...b.map(({date, type, documents}, j) => ({
                        key: `${this.props.queryCombination}:${this.props.queryMatching}:${this.props.queryTerms}:pmsi:${s}:${i}:${j}`,
                        date: date,
                        title: `PMSI${sub.name !== 'PMSI' ? '/' + sub.name : ''}`,
                        excerpts: documents.reduce((a, {diagnosisCode, diagnosisDisplay}) => [...a, diagnosisCode, diagnosisDisplay], [])
                            .filter(a => a).reduce((a, b) => [...a, ...grep(this.props.executedQuery.terms, 5)(b)], []),
                        open: this.openDocument(
                            `PMSI${type !== 'PMSI' ? '/' + type : ''} - ${moment(date).format('DD/MM/YYYY')}`,
                            <PmsiDocument pmsiDocDiag={documents} />)
                    }))], [])] : [...t],
                []) :
            [])

    generateCRResults = (clinicalReports) => (
        this.props.getTimelineVisibleFunction("Comptes Rendus") && clinicalReports && clinicalReports.subTimelines && clinicalReports.subTimelines.length ?
            clinicalReports.subTimelines.reduce((t, sub, s) =>
                this.props.getTimelineVisibleFunction("Comptes Rendus", sub.name) ?
                    [...t, ...sub?.points.reduce((a, [_, b], i) => [...a, ...b.map((a, j) => ({
                        key: `${this.props.queryCombination}:${this.props.queryMatching}:${this.props.queryTerms}:clinicalReport:${s}:${i}:${j}`,
                        date: a.date,
                        title: `CR${sub.name !== 'Comptes Rendus' ? '/' + sub.name : ''}:    ` + a.display,
                        excerpts: grep(this.props.executedQuery.terms, 5)(a.conclusion),
                        open: this.openDocument(
                            `${moment(a.date).format('DD/MM/YYYY')} - ${a.display}`,
                            <DocumentsDocument data={a}></DocumentsDocument>)
                    }))], [])] : [...t],
                []) :
            [])

    generateQRResults = (qrTimeline, qrName, baseTitle) => (
        this.props.getTimelineVisibleFunction(qrName) && qrTimeline && qrTimeline.subTimelines && qrTimeline.subTimelines.length ?
            qrTimeline.subTimelines.reduce((t, sub, s) =>
                this.props.getTimelineVisibleFunction(qrName, sub.name) ?
                    [...t, ...sub?.points.reduce((a, [_, b], i) => [...a, ...b.map((a, j) => ({
                        key: `${this.props.queryCombination}:${this.props.queryMatching}:${this.props.queryTerms}:${baseTitle}:${s}${i}:${j}`,
                        date: a.date,
                        title: `${baseTitle}${sub.name !== qrName ? '/' + sub.name : ''}    : ${a.qrList && a.qrList.children && a.qrList.children[0] && a.qrList.children[0].title}`,
                        excerpts: flattenQrList(a.qrList).filter(a => a).reduce((a, b) => [...a, ...grep(this.props.executedQuery.terms, 5)(b)], []),
                        open: this.openDocument(
                            `QR:${moment(a.date).format("DD/MM/YYYY")}-${a.qrList && a.qrList.children && a.qrList.children[0] && a.qrList.children[0].title}`,
                            <QrDocument qrDoc={a}></QrDocument>)
                    }))], [])] : [...t],
                []) :
            [])

    generateBiologieResults = (labResults) => (
        this.props.getTimelineVisibleFunction("Biologie") && labResults && labResults.subTimelines && labResults.subTimelines.length ?
            labResults.subTimelines.filter(a => a.name && a.name.toLowerCase() !== "bacteriologie").reduce((t, sub, s) =>
                this.props.getTimelineVisibleFunction("Biologie", sub.name) ?
                    [...t, ...sub?.points.reduce((a, [_, b], i) => [...a, ...b.map(({date, type, documents}, j) => ({
                        key: `${this.props.queryCombination}:${this.props.queryMatching}:${this.props.queryTerms}:labResults:${s}:${i}:${j}`,
                        date: date,
                        title: `Biologie${sub.name !== 'Biologie' ? '/' + sub.name  : ''}`,
                        excerpts: documents.reduce((a, {label, valueQuantity, referenceRange}) =>
                                [...a, label, valueQuantity ? `${valueQuantity.value} ${valueQuantity.unit}` : '', referenceRange !== 'None' ? referenceRange : ''], [])
                            .filter(a => a).reduce((a, b) => [...a, ...grep(this.props.executedQuery.terms, 5)(b)], []),
                        open: this.openDocument(
                            `${moment(date).format('DD/MM/YYYY')}- Biologie${sub.name  !== 'Biologie' ? '/' + sub.name  : ''}`,
                            <LrDocument labResults={documents} />)
                    }))], [])] : [...t],
                []) :
            [])

    generateBiologieTransverseResults = (labResults) => (
        this.props.getTimelineVisibleFunction("Biologie") && labResults && labResults.subTimelines && labResults.subTimelines.length ?
            labResults.subTimelines.filter(a => a.name && a.name.toLowerCase() !== "bacteriologie").reduce((t, sub, s) => {
                    if (this.props.getTimelineVisibleFunction("Biologie", sub.name)) {
                        const documents = sub.points.reduce((pts, p) => [...pts, ...p[1].reduce((docs, d) => [...docs, ...d.documents], [])], []);
                        console.log(documents);
                        const codeToLabel = {};
                        const counts = documents.reduce( (counts, d) => {
                            if (!(d.code in counts)) {
                                counts[d.code] = 0;
                                codeToLabel[d.code] = d.label;
                            };
                            counts[d.code] += 1;
                            return counts
                        }, {})
                        console.log(counts);
                        const mostFreqCodes = Object.keys(counts).sort( (a, b) => counts[a] - counts[b])
                        console.log(mostFreqCodes);
                        return mostFreqCodes.map( (code, i) => {
                            const newTimeline = _.cloneDeep(sub);
                            newTimeline.points = newTimeline.points.map((pt) => {
                                pt[1] = pt[1].map( (d) => {
                                    d.documents = d.documents.filter((d) => d.code === code);
                                    return d;
                                }).filter( (d) => d.documents.length > 0);
                                return pt;
                            }).filter( (pt) => pt[1].length > 0);

                            console.log(newTimeline.points);
                            const newResearchDoc = {
                                key: `${this.props.queryCombination}:${this.props.queryMatching}:${this.props.queryTerms}:labResultsTransverse:${s}:${i}`,
                                date: undefined,
                                title: `Biologie - ${codeToLabel[code]}`,
                                excerpts: [],
                                open: this.openDocument(
                                    sub.name + ' - ' + (codeToLabel[code] ? codeToLabel[code]  : code),
                                    <LrTransverseDocument labResults={newTimeline}></LrTransverseDocument>
                                )
                            }
                            return newResearchDoc;
                        });
                    } else {
                        return t;
                    }
                }, []) :
            [])

    generateBacterioResults = (labResults) => (
        (this.props.getTimelineVisibleFunction("Biologie", "Bacteriologie") && labResults && labResults.subTimelines
            && labResults.subTimelines.find(a => a.name && a.name.toLowerCase() === "bacteriologie")) || {points: []}).points
                .reduce((a, [_, b], i) => [...a, ...b.map((a, j) => ({
                    key: `${this.props.queryCombination}:${this.props.queryMatching}:${this.props.queryTerms}:bacteriology:${i}:${j}`,
                    date: a.date,
                    title: 'Bacterio',
                    excerpts: [...a.examens, ...a.results, ...a.observations.reduce((a, {code, interpretation, value}) => [...a, code, interpretation, value], [])]
                        .filter(a => a).reduce((a, b) => [...a, ...grep(this.props.executedQuery.terms, 5)(b)], []),
                    open: this.openDocument(
                        `${moment(a.date).format('DD/MM/YYYY')}- Bacterio`,
                        <BacteriologyDocument bacteriology={a} />)
                }))], [])

    generateTraitementsTransverseResults = (medicationAdministrations) => {
        if (this.props.getTimelineVisibleFunction("Traitements") && medicationAdministrations && medicationAdministrations.mainTimeline && medicationAdministrations.mainTimeline.points) {
            const documents = medicationAdministrations.mainTimeline.points.reduce((pts, p) => [...pts, ...p[1].reduce((docs, d) => [...docs, ...d.documents], [])], []);
            console.log(documents);
            const codeToLabel = {};
            const counts = documents.reduce( (counts, d) => {
                if (!(d.medicaments[0].medCode in counts)) {
                    counts[d.medicaments[0].medCode] = 0;
                    codeToLabel[d.medicaments[0].medCode] = d.medicaments[0].medName;
                };
                counts[d.medicaments[0].medCode] += 1;
                return counts
            }, {})
            console.log(counts);
            const mostFreqCodes = Object.keys(counts).sort( (a, b) => counts[a] - counts[b])
            console.log(mostFreqCodes);
            return mostFreqCodes.map( (code, i) => {
                const newTimeline = _.cloneDeep(medicationAdministrations.mainTimeline);
                newTimeline.points = newTimeline.points.map((pt) => {
                    pt[1] = pt[1].map( (d) => {
                        d.documents = d.documents.filter((d) => d.medicaments[0].medCode === code);
                        return d;
                    }).filter( (d) => d.documents.length > 0);
                    return pt;
                }).filter( (pt) => pt[1].length > 0);

                console.log(newTimeline.points);
                const newResearchDoc = {
                    key: `${this.props.queryCombination}:${this.props.queryMatching}:${this.props.queryTerms}:TraitementsTransverse:${i}`,
                    date: undefined,
                    title: `Traitements - ${codeToLabel[code]}`,
                    excerpts: [],
                    open: this.openDocument(
                        'Traitements - ' + (codeToLabel[code] ? codeToLabel[code]  : code),
                        <MedicationTransverseDocument data={newTimeline}></MedicationTransverseDocument>
                    )
                }
                return newResearchDoc;
            });
        } else return []; }

    generateTraitementsResults = ( medicationAdministrations ) => (
        this.props.getTimelineVisibleFunction("Traitements") && medicationAdministrations && medicationAdministrations.mainTimeline && medicationAdministrations.mainTimeline.points ?
            medicationAdministrations.mainTimeline.points.reduce((a, [_, b], i) => [...a, ...b.map((a, j) => ({
                key: `${this.props.queryCombination}:${this.props.queryMatching}:${this.props.queryTerms}:medicationAdministrations:${i}:${j}`,
                date: a.date,
                title: 'Traitements',
                excerpts: a.documents.reduce((a, {medicaments, medicationTime}) => [...a,
                    `${medicationTime.split(':')[0].padStart(2, '0')}:${medicationTime.split(':')[1].padStart(2, '0')}`,
                    ...medicaments.map(a => a.medName)
                ], []).filter(a => a).reduce((a, b) => [...a, ...grep(this.props.executedQuery.terms, 5)(b)], []),
                open: this.openDocument(
                    `${moment(a.date).format('DD/MM/YYYY')} - Traitements`,
                    <MedicationDocument data={a} />)
            }))], []) :
        [])

	render = () => {
		const results = this.props.results ? [
            ...this.generateBiologieTransverseResults(this.props.results.labResults),
            ...this.generateTraitementsTransverseResults(this.props.results.medicationAdministrations),
			...this.generatePMSIResults(this.props.results.pmsis),
			...this.generateCRResults(this.props.results.clinicalReports),
            ...this.generateQRResults(this.props.results.qrMedical, "questionnaires médicaux", "QRMed"),
            ...this.generateQRResults(this.props.results.qrParamedical, "questionnaires paramédicaux", "QRPara"),
            ...this.generateBacterioResults(this.props.results.labResults),
		] : [];

		return <div className="fcol fexpand fgaph search-container">
			<div className="frow fgap">
				<div className="frow fexpand fgap fwrap">
					<div className="fcol fexpand">
						<Input value={this.props.queryTerms} onChange={this.onTermsInput} onKeyDown={this.onTermsKeyDown}
							prefix={<SearchOutlined />} placeholder="Rechercher dans les documents" />

						{this.props.autocomplete.length > 0 && <div className="search-autocomplete">
							{this.props.autocomplete.map((term, i) => <div key={term}
								className={this.state.selectedSuggestion.in === this.props.autocomplete && i === this.state.selectedSuggestion.key ? "search-autocomplete-selected" : ""}
								onClick={this.acceptAutocomplete(term)}>{term}</div>)}
						</div>}
					</div>

					<div className="frow fgap">
						<Radio.Group value={this.props.queryMatching} onChange={this.setQueryMatching}
							optionType="button" buttonStyle="solid" options={[
								{value: SearchQueryMatching.EQUAL, label: "Exact"},
								{value: SearchQueryMatching.LIKE, label: "Approx."}
							]} />

						<Radio.Group value={this.props.queryCombination} onChange={this.setQueryCombination}
							optionType="button" buttonStyle="solid" options={[
								{value: SearchQueryCombination.AND, label: "ET"},
								{value: SearchQueryCombination.OR, label: "OU"}
							]} />
					</div>
				</div>

				<div className="frow fgap">
					<Button onClick={this.loadPreviousQuery} disabled={this.props.historyLength <= 0 || this.props.historyPosition === 0} icon={<LeftOutlined />} />
					<Button onClick={this.loadNextQuery} disabled={this.props.historyPosition < 0 || this.props.historyPosition + 1 >= this.props.historyLength} icon={<RightOutlined />} />
					<Button onClick={this.startSaveQuery} disabled={!this.props.queryTerms || this.props.isCurrentQuerySaved} icon={<SaveOutlined />} />
					<Button onClick={this.startLoadQuery} disabled={this.props.savedQueries.length <= 0} icon={<HistoryOutlined />} />
					{this.props.results && this.props.queryTerms && <Button onClick={this.clearSearch} icon={<ClearOutlined />} />}
					<Button onClick={this.runSearch} disabled={!this.props.queryTerms && !this.props.results}
						icon={this.props.results && !this.props.queryTerms ? <ClearOutlined /> : <SearchOutlined />} type="primary" />
				</div>
			</div>

			{this.props.results && <div className="search-results-count">{results.length} résultats</div>}

			<div className="fcol fexpand fgaph search-results">
				{results.map(result => <div className="fcol search-result" onClick={result.open}
					key={result.key}>
					<div className="frow fexpand fjspace">
						<div className="search-result-title">{result.title}</div>
						<div className="search-result-date">{moment(result.date).format("DD/MM/YYYY")}</div>
					</div>
					{result.excerpts.length > 0 && <div className="search-result-excerpt">
						{result.excerpts[0][0] + " "}
						<span className={`search-result-hl-${result.excerpts[0][3] % 10}`}>{result.excerpts[0][1]}</span>
						{" " + result.excerpts[0][2]}
					</div>}
				</div>)}
			</div>
		</div>;
	};
}

export default connect(state => ({
	queryTerms: state.search.query.terms,
	queryMatching: state.search.query.matching,
	queryCombination: state.search.query.combination,
	results: state.search.results ? state.search.results.results : null,
	savedQueries: state.search.savedQueries,
	isCurrentQuerySaved: state.search.savedQueries.some(a => a.query === state.search.query),
	autocomplete: state.search.autocomplete,
	executedQuery: state.search.results ? state.search.results.query : null,
	historyPosition: state.search.history.indexOf(state.search.query),
	historyLength: state.search.history.length
}), {
	clearSearchResults,
	displayPopin,
	loadQuery,
	loadQueryFromHistory,
	removePopin,
	runAutocomplete,
	runSearch,
	saveQuery,
	setQueryCombination,
	setQueryMatching,
	setQueryTerms
})(SearchPane);
