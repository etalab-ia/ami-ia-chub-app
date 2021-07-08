import React from 'react';
import {connect} from 'react-redux';
import {Button, Radio} from 'antd';
import {RightOutlined} from '@ant-design/icons';
import {setQueryTerms} from '../../../store/actions/searchActions';
import makeEnum from '../../../utils/enum';
import TableDocument from './Documents/table-document';
import '../../../styles/suggestions.css';

const SortKey = makeEnum({
	WEIGHT: 'weight',
	PURE_RESULTS: 'pureSearchMatchesCount',
	COMBINED_RESULTS: 'combinedSearchMatchCount'
});

const SortDirection = makeEnum({
	ASCENDING: 1,
	DESCENDING: -1
});

export default connect(state => ({
	queryTerms: state.search.query.terms
}), {setQueryTerms})(class SuggestionsTab extends React.PureComponent {
	constructor(props) {
		super(props);

		const allSections = Object.entries(this.props.suggestions).reduce((a, [k, v]) => [...a, k,
			...Object.entries(v).reduce((a, [k, v]) => [...a, k,
				...v.reduce((a, {label, linkedConcepts}) => [...a, label,
					...Object.keys(linkedConcepts).map(a => `${label}.${a}`)
				], []).map(a => `${k}.${a}`)
			], []).map(a => `${k}.${a}`)
		], []);

		const commonTreeSections = (a => a.length === 1 ? [a[0][0],
			...(b => b.length === 1 ? [`${a[0][0]}.${b[0][0]}`,
				...(b[0][1].length === 1 ? [`${a[0][0]}.${b[0][0]}.${b[0][1][0].label}`,
					...(c => c.length === 1 ? [`${a[0][0]}.${b[0][0]}.${b[0][1][0].label}.${c}`
					] : [])(Object.keys(b[0][1][0].linkedConcepts))
				] : [])
			] : [])(Object.entries(a[0][1]))
		] : [])(Object.entries(this.props.suggestions || {}));

		const noSections = [];

		this.state = {
			allSections, commonTreeSections, noSections, openSections: commonTreeSections,
			sortBy: SortKey.WEIGHT,
			sortDirection: SortDirection.DESCENDING,
			showEmpty: false
		}
	}

	isSectionOpen = id => this.state.openSections.includes(id);

	toggleSection = id => this.setState({openSections: this.isSectionOpen(id) ?
		this.state.openSections.filter(a => a !== id) : [...this.state.openSections, id]});

	setSortBy = e => this.setState({sortBy: e.target.value});

	setSortDirection = e => this.setState({sortDirection: e.target.value});

	setOpenSections = e => this.setState({openSections: e.target.value});

	setShowEmpty = e => this.setState({showEmpty: e.target.value});

	search = (term, combined) => {
		this.props.setQueryTerms(combined && this.props.queryTerms.trim().length > 0 ?
			this.props.queryTerms + (!this.props.queryTerms.trim().endsWith(',') ? ',' : '') + term : term);
	}

	renderSection = (id, title, content) => <div key={id} className="suggestions-tab-section">
		<div className="suggestions-tab-section-title" onClick={() => this.toggleSection(id)}>
			{title}
			<div className="suggestions-tab-section-toggle-button"><RightOutlined rotate={this.isSectionOpen(id) ? 90 : 0} /></div>
		</div>

		<div className="suggestions-tab-section-content" hidden={!this.isSectionOpen(id)}>{content}</div>
	</div>;

	render = () => {
		const suggestions = this.props.suggestions && !this.state.showEmpty ?
			Object.entries(this.props.suggestions).reduce((a, [k, v]) => {
				const m = Object.entries(v).reduce((a, [k, v]) => {
					const m = v.reduce((a, v) => {
						const m = Object.entries(v.linkedConcepts).reduce((a, [k, v]) => {
							const m = v.reduce((a, v) => {
								return v.combinedSearchMatchCount + v.pureSearchMatchesCount > 0 ? [...a, v] : a;}, []);
							return m.length > 0 ? {...a, [k]: m} : a;
						}, {});
						return Object.keys(m).length > 0 ? [...a, {...v, linkedConcepts: m}] : a;
					}, []);
					return m.length > 0 ? {...a, [k]: m} : a;
				}, {});
				return Object.keys(m).length > 0 ? {...a, [k]: m} : a;
			}, {}) : this.props.suggestions;

		return <div className="suggestions-tab">
			<div className="suggestions-tab-sort-line">
				<div className="suggestions-tab-sort-label">Trier par :</div>
				<Radio.Group value={this.state.sortBy} onChange={this.setSortBy}
					optionType="button" buttonStyle="solid" size="small" options={[
						{value: SortKey.WEIGHT, label: "Poids"},
						{value: SortKey.PURE_RESULTS, label: "Rech. seul"},
						{value: SortKey.COMBINED_RESULTS, label: "Rech. combiné"},
					]} />
				<Radio.Group value={this.state.sortDirection} onChange={this.setSortDirection}
					optionType="button" buttonStyle="solid" size="small" options={[
						{value: SortDirection.ASCENDING, label: "Asc."},
						{value: SortDirection.DESCENDING, label: "Desc."}
					]} />

				<div className="suggestions-tab-sort-label">Ouvrir :</div>
				<Radio.Group value={this.state.openSections} onChange={this.setOpenSections}
					optionType="button" buttonStyle="solid" size="small" options={[
						{value: this.state.allSections, label: "Tout"},
						{value: this.state.commonTreeSections, label: "Commun"},
						{value: this.state.noSections, label: "Rien"}
					]} />

				<div className="suggestions-tab-sort-label">Résultats vides :</div>
				<Radio.Group value={this.state.showEmpty} onChange={this.setShowEmpty}
					optionType="button" buttonStyle="solid" size="small" options={[
						{value: true, label: "Afficher"},
						{value: false, label: "Cacher"}
					]} />
			</div>

			<div className="suggestions-tab-list">
				{suggestions && Object.entries(suggestions).map(([term, a]) => this.renderSection(term, term,
					Object.entries(a).map(([ctype, a]) => this.renderSection(`${term}.${ctype}`, ctype,
						a.map(({label, linkedConcepts}) => {
                            let sectionContent = []
                            const linkedConceptsKeys = [...Object.keys(linkedConcepts)];
                            const variationsLabel = {
                                'SYNONYMS': 'Synonymes',
                                'ABBREVIATIONS': 'Abbréviations'
                            }
                            for (var variation of Object.keys(variationsLabel)) {
                                if (linkedConceptsKeys.includes(variation)) {
                                    sectionContent.push(
                                        this.renderSection(`${term}.${ctype}.${label}.${variation}`.replace(' ', '_'), `${variationsLabel[variation]}`,
                                            <TableDocument columns={[
                                                {key: "label", title: "Label"},
                                                {key: "buttons", title: "Rechercher"}
                                            ]} data={linkedConcepts[variation].map(a => ({...a,
                                                buttons: <span className="frow fgap">
                                                <Button onClick={() => this.search(a.searchTerm, false)} size="small">Seul ({a.pureSearchMatchesCount})</Button>
                                                <Button onClick={() => this.search(a.searchTerm, true)} size="small">Combiné ({a.combinedSearchMatchCount})</Button>
                                            </span>}))} />)
                                    );
                                    linkedConceptsKeys.splice(linkedConceptsKeys.indexOf(variation), 1);
                                }
                            }
                            sectionContent = sectionContent.concat(linkedConceptsKeys.map((relation) => {
                                const concepts = linkedConcepts[relation];
                                return this.renderSection(`${term}.${ctype}.${label}.${relation}`.replace(' ', '_'), relation.replaceAll('_', ' '),
                                    <TableDocument columns={[
                                        {key: "label", title: "Label"},
                                        {key: "type", title: "Type"},
                                        {key: "roundedWeight", title: "Poids"},
                                        {key: "buttons", title: "Rechercher"}
                                    ]} data={concepts.sort((a, b) => (a[this.state.sortBy] - b[this.state.sortBy]) * this.state.sortDirection).map(a => ({...a,
                                        roundedWeight: Math.round(a.weight * 1000) / 1000, buttons: <span className="frow fgap">
                                        <Button onClick={() => this.search(a.searchTerm, false)} size="small">Seul ({a.pureSearchMatchesCount})</Button>
                                        <Button onClick={() => this.search(a.searchTerm, true)} size="small">Combiné ({a.combinedSearchMatchCount})</Button>
                                    </span>}))} />
                                )}
                            ))

                            return this.renderSection(`${term}.${ctype}.${label}`, label, sectionContent);
                        })

                    ))))}
			</div>
		</div>
	};
});
