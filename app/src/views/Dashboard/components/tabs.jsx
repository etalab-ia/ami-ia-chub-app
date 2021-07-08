import React from "react";
import PropTypes from "prop-types";
import _ from "lodash";
import { CloseOutlined } from "@ant-design/icons";
import "../../../styles/tabs.css";
import SuggestionsTab from './suggestions-tab';

class DocumentTabs extends React.Component {
  constructor(props) {
    super(props);

		this.state = {
      openDocuments: props.openDocuments,
      activeKey: props.openDocuments ? props.openDocuments.length - 1 : -1,
      currentNbDoc: props.openDocuments?.length || 0,
      tabJustClosed: false,
      addDocCallback: props.addDocCallback,
      removeDocCallback: props.removeDocCallback,
      transversalSearchCallback: props.transversalSearchCallback,
    };
  }

  static propTypes = {
    openDocuments: PropTypes.array.isRequired,
    currentNbDoc: PropTypes.number,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const keys = ["openDocuments", "currentNbDoc", "tabJustClosed"];
    const mutableProps = _.pick(nextProps, keys);
    const stateToCompare = _.pick(prevState, keys);
    if (!_.isEqual(mutableProps, stateToCompare)) {
      if (
        mutableProps.currentNbDoc > stateToCompare.currentNbDoc &&
        !stateToCompare.tabJustClosed
      ) {
        mutableProps.activeKey = mutableProps.openDocuments ? mutableProps.openDocuments.length - 1 : -1;
      }
      mutableProps.tabJustClosed = false;
      return mutableProps;
    }
    return null;
  }

	setActiveTab = key => () => {
		this.setState({activeKey: key});
	}

	closeTab = targetKey => e => {
		e.stopPropagation();

		let { openDocuments, activeKey, removeDocCallback } = this.state;

		if (activeKey > targetKey)
			activeKey = activeKey - 1;

		activeKey = Math.min(openDocuments.length - 2, activeKey);
		this.setState({activeKey, tabJustClosed: true});
		removeDocCallback(targetKey);
	}

	clearSuggestions = () => this.props.clearSuggestionsCallback && this.props.clearSuggestionsCallback();

  render() {
    const { activeKey, openDocuments, addDocCallback, transversalSearchCallback } = this.state;

		return (
			<div className="tabs-container">
				<div className="tabs">
					{this.props.suggestions && <div className={activeKey === -1 ? "tab active" : "tab"} onClick={this.setActiveTab(-1)}>
						<div className="tab-title" title="Recommandations">Recommandations</div>
						<button className="tab-close-btn" onClick={this.clearSuggestions}><CloseOutlined /></button>
					</div>}

					{openDocuments.map(([title], i) =>
						<div key={i} className={i === activeKey ? "tab active" : "tab"} onClick={this.setActiveTab(i)}>
							<div className="tab-title" title={title}>{title}</div>
							<button className="tab-close-btn" onClick={this.closeTab(i)}><CloseOutlined /></button>
						</div>)}
				</div>

				{this.props.suggestions && <div className="tab-content" hidden={activeKey !== -1}>
					<SuggestionsTab key={this.props.suggestions} suggestions={this.props.suggestions} />
				</div>}

				{openDocuments.map(([documentTitle, doc], i) =>
					<div key={i} className="tab-content" hidden={i !== activeKey}>
                        {React.cloneElement(doc, {openDocCallback: addDocCallback, transversalSearchCallback: transversalSearchCallback, documentTitle})}
                    </div>)}
			</div>
    );
  }
}

export { DocumentTabs };
