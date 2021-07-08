import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import TableDocument from './table-document';

class BacteriologyDocument extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: props,
        };
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

    render() {
        const { data } = this.state;
        const columns = [
            {
                title: 'Examens',
                dataIndex: 'examens',
                key: 'examens',
            },
            {
                title: 'Resultats',
                dataIndex: 'results',
                key: 'results',
            },
            {
                title: 'Unit',
                dataIndex: 'unit',
                key: 'unnit',
            },

        ];

        const unit = [];
        const results = [];

        data.bacteriology.results.length > 0 &&
        data.bacteriology.results.forEach((e) => {
            if (e.valueQuantity) {
                unit.push(`${e.valueQuantity.value} ${e.valueQuantity.unit}`);
            }
            if (e.interpretation && (e.interpretation.length > 0)) {
                results.push(e.interpretation.toString());
            }
        });

        const dataSource = [{
            examens : data.bacteriology.examens,
            results : data.bacteriology.results,
            unit : unit,
        }];

        return (
					<div style={{display: "flex", width: "100%", height: "100%", overflow: "hidden"}}>
						<TableDocument columns={columns} data={dataSource} />
					</div>
        );
    }
}

export { BacteriologyDocument };
