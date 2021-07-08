import React from "react";
import {connect} from 'react-redux';
import hlwords from '../../../../utils/hlwords.jsx';
import _ from "lodash";

const DocumentsDocument = connect(state => ({
	hlwords: state.search.results ? hlwords(state.search.results.query.terms.split(','), i => `search-result-hl-${i}`) : a => a
}))(class DocumentsDocument extends React.Component {
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
  onSelect(keys, info) {
    // console.log('Trigger Select', keys, info);
  }

  onExpand() {
    // console.log('Trigger Expand');
  }
  render() {
    const { data } = this.state;

    return (
        <div style={{width: "100%", height: "100%", overflow: "auto", padding: "8px"}}>
            {data.conclusion.split('NEWLINESEP').map( (paragraph) => {
                return <p>{this.props.hlwords(paragraph)}</p>
            })}
      </div>
    );
  }
});

export { DocumentsDocument };
