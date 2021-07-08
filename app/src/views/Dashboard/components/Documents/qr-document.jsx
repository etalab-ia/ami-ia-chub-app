import React from "react";
import {connect} from 'react-redux';
import { Tree } from "antd";
import {Notif} from '../../../../atomic/notification.jsx';
import hlwords from '../../../../utils/hlwords.jsx';
import { QrTransverseDocument } from './qr-transverse-document.jsx'
import _ from "lodash";
const DirectoryTree = Tree;

const QrDocument = connect(state => ({
	hlwords: state.search.results ? hlwords(state.search.results.query.terms.split(','), i => `search-result-hl-${i}`) : a => a
}))(class QrDocument extends React.Component {
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
    const keys = ["data"];
    const mutableProps = _.pick(nextProps, keys);
    const stateToCompare = _.pick(prevState, keys);
    if (!_.isEqual(mutableProps, stateToCompare)) {
      return mutableProps;
    }
    return null;
  }

  findCodeTitle = (node, code) => {
    if (node?.code && node.code === code) {
        return [node.title];
    }
    if (node?.children) {
        let childHasCode = false;
        node.children.forEach( (child) => {
            if (child?.code && child.code === code && child.isLeaf) {childHasCode = true;}
        })
        if (childHasCode) { return [node.title];};
        return node.children.reduce( (acc, curr) => {return acc.concat(this.findCodeTitle(curr, code));}, [])
    }
    return []
  }

  openTransverseDoc = async (qrCode, qrLabel) => {
    const { data } = this.state;

    let { openDocCallback, transversalSearchCallback } = this.state;

    let transverse;
		try {
			transverse = await transversalSearchCallback('questionnaireResponses', qrCode);
		} catch(e) {
			if (e.name === 'HttpError') {
				if (e.code !== 401)
					Notif('error', `Erreur ${e.code}`,
						`Le chargement du document pour '${qrLabel || qrCode}' a échoué. Le serveur a répondu: ${(e.response && e.response.data && (e.response.data.message || e.response.data.error)) || `${e.code} ${e.message}.`}`);
			} else
				Notif('error', 'Service indisponible',
					`Une erreur inattendue s'est produite lors du chargement du document pour '${qrLabel || qrCode}'. Vérifiez votre connexion et réessayez.`);

			return;
		}
    const newData = transverse.results.qrMedical.mainTimeline ? transverse.results.qrMedical.mainTimeline : transverse.results.qrParamedical.mainTimeline;
    openDocCallback(
        'Question - ' + this.findCodeTitle(data.qrDoc.qrList, qrCode),
      <QrTransverseDocument data={newData} code={qrCode}
				patientName={transverse.patientName}
				startDate={transverse.startDate}
				endDate={transverse.endDate}></QrTransverseDocument>
    );
  }

  onSelect = async (keys, info) => {
    if (info.node?.code) {
        this.openTransverseDoc(info.node.code, info.node.title)
    }
  }

  colorClickableNodes = (node) => {
		const title = this.props.hlwords(node.title);

		return node.code ? <span className='clickable-qr-element'>{title}</span> : title;
  }

  onExpand() {
    // console.log('Trigger Expand');
  }
  render() {
    const { data } = this.state;
    const treeData = [];
    treeData.push(data.qrDoc.qrList);

    return (
			<div style={{width: "100%", height: "100%", overflow: "auto"}}>
      	<DirectoryTree
        	multiple
        	defaultExpandAll
					selectedKeys={[]}
        	onSelect={this.onSelect}
        	onExpand={this.onExpand}
        	treeData={treeData}
			titleRender={(node) => this.colorClickableNodes(node)} />
			</div>
    );
  }
});

export { QrDocument };
