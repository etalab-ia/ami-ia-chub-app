import React from "react";
import {connect} from 'react-redux';
import _ from "lodash";
import hlwords from '../../../../utils/hlwords.jsx';
import TableDocument from './table-document';

const PmsiDocument = connect(state => ({
	hlwords: state.search.results ? hlwords(state.search.results.query.terms.split(','), i => `search-result-hl-${i}`) : a => a
}))(class PmsiDocument extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props,
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

  render() {
    const { data } = this.state;
    const diagnosis = data.pmsiDocDiag;

    const columns = [
      {
        title: "Diagnosis Code",
        dataIndex: "diagnosisCode",
        key: "diagnosisCode",
      },
      {
        title: "Display",
        dataIndex: "display",
        key: "display",
      },
    //   {
    //     title: "Sequence",
    //     dataIndex: "sequence",
    //     key: "sequence",
    //   },
    ];

    const dataSource = diagnosis.map((e) => {
      return {
        diagnosisCode: this.props.hlwords(e?.diagnosisCode),
        display: this.props.hlwords(e?.diagnosisDisplay),
        //sequence: e?.sequence,
      };
    });

    return (
			<div style={{display: "flex", width: "100%", height: "100%", overflow: "hidden"}}>
				<TableDocument columns={columns} data={dataSource} />
			</div>
    );
  }
});

export { PmsiDocument };
