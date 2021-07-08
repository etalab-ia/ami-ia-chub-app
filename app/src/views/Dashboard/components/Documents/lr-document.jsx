import React from 'react';
import {connect} from 'react-redux';
import _ from 'lodash';
import moment from 'moment';
import {Notif} from '../../../../atomic/notification.jsx';
import hlwords from '../../../../utils/hlwords.jsx';
import TableDocument from './table-document';
import { Button } from 'antd';
import { LrTransverseDocument } from './lr-transverse-document.jsx';


const LrDocument = connect(state => ({
	hlwords: state.search.results ? hlwords(state.search.results.query.terms.split(','), i => `search-result-hl-${i}`) : a => a
}))(class LrDocument extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: props,
            openDocCallback: props.openDocCallback,
            transversalSearchCallback: props.transversalSearchCallback,
        };
        this.openTransverseDoc = this.openTransverseDoc.bind(this);
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        const keys = ['data'];
        const mutableProps = _.pick(nextProps, keys);
        const stateToCompare = _.pick(prevState, keys);
        if (!_.isEqual(mutableProps, stateToCompare)) {
            return mutableProps;
        }
        return null;
    }

    openTransverseDoc = async (lrCode, lrLabel, allTime = false) => {
        let { openDocCallback, transversalSearchCallback } = this.state;

        let transverse;
				try {
					transverse = await transversalSearchCallback('labResults', lrCode, allTime);
				} catch(e) {
					if (e.name === 'HttpError') {
						if (e.code !== 401)
							Notif('error', `Erreur ${e.code}`,
								`Le chargement du document pour '${lrLabel || lrCode}' a échoué. Le serveur a répondu: ${(e.response && e.response.data && (e.response.data.message || e.response.data.error)) || `${e.code} ${e.message}.`}`);
					} else
						Notif('error', 'Service indisponible',
							`Une erreur inattendue s'est produite lors du chargement du document pour '${lrLabel || lrCode}'. Vérifiez votre connexion et réessayez.`);

					return;
				}
        let data = transverse.results.labResults;
        openDocCallback(
            data.mainTimeline.name + ' - ' + (lrLabel ? lrLabel : lrCode),
          <LrTransverseDocument labResults={data.mainTimeline}
						patientName={transverse.patientName}
						startDate={transverse.startDate}
						endDate={transverse.endDate}></LrTransverseDocument>
        );
    }

    render() {
        const { data } = this.state;
        const columns = [
            // {
            //     Date: 'Date',
            //     dataIndex: 'date',
            //     key: 'date',
            // },
            {
                title: 'Label',
                dataIndex: 'label',
                key: 'label',
            },
            // {
            //     title: 'Code',
            //     dataIndex: 'code',
            //     key: 'code',
            // },
            {
                title: 'Valeur',
                dataIndex: 'value',
                key: 'value',
								style: record => record.refRangeRaw.includes("H") ? {fontWeight: "bold"} : {}
            },
            {
                title: 'Commentaire',
                dataIndex: 'refRange',
                key: 'refRange',
            },
            {
                title: 'voir tout',
                dataIndex: 'button',
                key: 'button',
            },

        ];

        const dataSource = data.labResults.map((e) => {
            let refRange = e?.referenceRange;
            if (refRange === 'None') refRange = '';
            return {
                date : this.props.hlwords(moment(e?.date).format('DD/MM/YYYY')),
                label: this.props.hlwords(e?.label),
                code : this.props.hlwords(e?.code),
                value : this.props.hlwords(`${e?.valueQuantity.value} ${e?.valueQuantity.unit}`),
                refRange: this.props.hlwords(refRange),
				refRangeRaw: refRange,
                button: <div className="frow fgap">
									<Button size="small" onClick={() => {this.openTransverseDoc(e?.code, e?.label);}}>Période affichée</Button>
									<Button size="small" onClick={() => {this.openTransverseDoc(e?.code, e?.label, true);}}>Tout</Button>
								</div>
            };
        });

        return (
					<div style={{display: "flex", width: "100%", height: "100%", overflow: "hidden"}}>
						<TableDocument columns={columns} data={dataSource} />
					</div>
        );
    }
});

export { LrDocument };
