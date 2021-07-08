import React from 'react';
import {connect} from 'react-redux';
import _ from 'lodash';
import { Tree } from "antd";
import hlwords from '../../../../utils/hlwords.jsx';
const DirectoryTree = Tree;

const BacteriologyDocument = connect(state => ({
	hlwords: state.search.results ? hlwords(state.search.results.query.terms.split(','), i => `search-result-hl-${i}`) : a => a
}))(class BacteriologyDocument extends React.Component {
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
    onSelect(keys, info) {
        // console.log('Trigger Select', keys, info);
    }

    onExpand() {
    // console.log('Trigger Expand');
    }
    render() {
    const { data } = this.state;
    const treeData = [
        {
          title: 'Examens',
          key: '0',
          children: data.bacteriology.examens.map((v, idx) => {return {title: v.replaceAll('NEWLINESEP', ' '), key: `0-${idx}`, children: []};})
        },
        {
            title: 'Resultats',
            key: '1',
            children: data.bacteriology.results.map((v, idx) => {return {title: v.replaceAll('NEWLINESEP', ' '), key: `1-${idx}`, children: []};})
        },
        {
            title: 'Observations',
            key: '2',
            children: data.bacteriology.observations.map((v, idx) => {
                return {
                    title: v.code.replaceAll('NEWLINESEP', ' '),
                    key: `2-${idx}-0`,
                    children: [{
                        title: (v.interpretation + (v.value ? '( ' + v.value + ' )': '')).replaceAll('NEWLINESEP', ' '),
                        key: `2-${idx}-0-0`,
                        children: []
                    }]
                };
            })
        },
    ]

    return (
            <div style={{width: "100%", height: "100%", overflow: "auto"}}>
            <DirectoryTree
            multiple
            defaultExpandAll
            onSelect={this.onSelect}
            onExpand={this.onExpand}
            treeData={treeData}
						titleRender={({title}) => this.props.hlwords(title)} />
            </div>
        );
    }
});

export { BacteriologyDocument };
