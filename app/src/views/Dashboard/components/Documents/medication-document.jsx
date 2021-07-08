import React from "react";
import {connect} from 'react-redux';
import _ from "lodash";
import {Notif} from '../../../../atomic/notification.jsx';
import hlwords from '../../../../utils/hlwords.jsx';
import TableDocument from './table-document';
import { Button } from 'antd';

import { MedicationTransverseDocument } from './medication-transverse-document.jsx';

const MedicationDocument = connect(state => ({
	hlwords: state.search.results ? hlwords(state.search.results.query.terms.split(','), i => `search-result-hl-${i}`) : a => a
}))(class MedicationDocument extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props,
      openDocCallback: props.openDocCallback,
      transversalSearchCallback: props.transversalSearchCallback,
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const keys = ["data"];
    const mutableProps = _.pick(nextProps, keys);
    const stateToCompare = _.pick(prevState, keys);
    if (!_.isEqual(mutableProps, stateToCompare)) {
      return mutableProps;
    }
    return null;
  }

  openTransverseDoc = async (medCode, medLabel, allTime = false) => {
    let { openDocCallback, transversalSearchCallback } = this.state;

    let transverse;
		try {
			transverse = await transversalSearchCallback('medicationAdministrations', medCode, allTime);
		} catch(e) {
			if (e.name === 'HttpError') {
				if (e.code !== 401)
					Notif('error', `Erreur ${e.code}`,
						`Le chargement du document pour '${medLabel || medCode}' a échoué. Le serveur a répondu: ${(e.response && e.response.data && (e.response.data.message || e.response.data.error)) || `${e.code} ${e.message}.`}`);
			} else
				Notif('error', 'Service indisponible',
					`Une erreur inattendue s'est produite lors du chargement du document pour '${medLabel || medCode}'. Vérifiez votre connexion et réessayez.`);

			return;
		}
    let data = transverse.results.medicationAdministrations;
    openDocCallback(
        data.mainTimeline.name + ' - ' + (medLabel ? medLabel : medCode),
      <MedicationTransverseDocument data={data.mainTimeline}
				patientName={transverse.patientName}
				startDate={transverse.startDate}
				endDate={transverse.endDate}></MedicationTransverseDocument>
    );
}

  render() {
    const { data } = this.state;

    const columns = [
    //   {
    //     title: "Code Médicament",
    //     dataIndex: "codeMed",
    //     key: "codeMed",
    //   },
      {
        title: "Nom Médicament",
        dataIndex: "display",
        key: "display",
      },
      {
        title: "heure prise",
        dataIndex: "hour",
        key: "hour",
        width: "20%"
      },
      {
        title: 'voir tout',
        dataIndex: 'button',
        key: 'button',
    },
    ];

    const dataSource = []
    if (data) {
        data.documents.sort((a, b) => {
            var a_hour = Number(a.medicationTime.split(':')[0]);
            var a_minutes = Number(a.medicationTime.split(':')[1]);
            var b_hour = Number(b.medicationTime.split(':')[0]);
            var b_minutes = Number(b.medicationTime.split(':')[1]);
            if (a_hour !== b_hour) return a_hour - b_hour;
            return a_minutes - b_minutes;
        });
        data.documents.forEach((medicament) => {
            if (medicament.medicaments.length === 1) {
                dataSource.push({
                    codeMed: this.props.hlwords(medicament.medicaments[0].medCode),
                    display: this.props.hlwords(medicament.medicaments[0].medName),
                    hour: this.props.hlwords(`${medicament.medicationTime.split(':')[0].padStart(2, '0')}:${medicament.medicationTime.split(':')[1].padStart(2, '0')}`),
                    color: "#fff",
                    button: <div className="frow fgap">
											<Button size="small" onClick={() => {this.openTransverseDoc(medicament.medicaments[0].medCode, medicament.medicaments[0].medName);}}>Période affichée</Button>
											<Button size="small" onClick={() => {this.openTransverseDoc(medicament.medicaments[0].medCode, medicament.medicaments[0].medName, true);}}>Tout</Button>
										</div>
                });
            } else {
                dataSource.push({
                    codeMed: this.props.hlwords("Administration conjointe"),
                    display: "",
                    hour: this.props.hlwords(`${medicament.medicationTime.split(':')[0].padStart(2, '0')}:${medicament.medicationTime.split(':')[1].padStart(2, '0')}`),
                    color: "#fff"
                });
                medicament.medicaments.forEach( (med) => {
                    dataSource.push({
                        codeMed: this.props.hlwords("+              " + med.medCode),
                        display: this.props.hlwords("+              " + med.medName),
                        hour: "",
                        color: "#eee",
                        button: <div className="frow fgap">
													<Button size="small" onClick={() => {this.openTransverseDoc(med.medCode, med.medName);}} >Période affichée</Button>
													<Button size="small" onClick={() => {this.openTransverseDoc(med.medCode, med.medName, true);}} >Tout</Button>
												</div>
                    });
                });
            };
        });
    }

    return (
			<div style={{display: "flex", width: "100%", height: "100%", overflow: "hidden"}}>
				<TableDocument columns={columns} data={dataSource}
					rowStyle={record => ({background: record.color})} />
			</div>
		);/*<div>
            <Table
                dataSource={dataSource}
                columns={columns}
                rowClassName={(record) => record.color.replace('#', '')}
                pagination={{ pageSize: 50 }}
                scroll={{ y: 550 }}
            />
        </div>*/
  }
});

export { MedicationDocument };
