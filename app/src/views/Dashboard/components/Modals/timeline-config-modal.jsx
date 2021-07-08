import React from "react";
import { Tree, Modal } from "antd";
import PropTypes from "prop-types";
import _ from "lodash";

class TimelineConfigModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      timelineDisplayConfig: props.timelineDisplayConfig,
      visible: props.visible,
      updateConfigCallback: props.updateConfigCallback,
    };
    this.handleCloseModalChild = this.handleCloseModalChild.bind(this);
    this.onCheck = this.onCheck.bind(this);
    this.getChecked = this.getChecked.bind(this);
  }

  static propTypes = {
    timelineDisplayConfig: PropTypes.array.isRequired,
    visible: PropTypes.bool.isRequired,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const keys = ["timelineDisplayConfig", "visible"];
    const mutableProps = _.pick(nextProps, keys);
    const stateToCompare = _.pick(prevState, keys);
    if (!_.isEqual(mutableProps, stateToCompare)) {
      return mutableProps;
    }
    return null;
  }

  handleCloseModalChild() {
    this.props.handleCloseModal(false);
  }

  onCheck = (checkedKeys: React.Key[], info: any) => {
    // console.log("onCheck", checkedKeys, info);
    let { timelineDisplayConfig, updateConfigCallback } = this.state;
    timelineDisplayConfig = timelineDisplayConfig.map((tl) => {
      let anychild = false;
      if ("children" in tl) {
        tl.children = tl.children.map((tl_c) => {
          tl_c.checked = checkedKeys.checked.includes(tl_c.key);
          anychild |= tl_c.checked;
          return tl_c;
        });
      } else {
          anychild = true;
      }
      const newChecked = checkedKeys.checked.includes(tl.key);
      if (tl.checked && !newChecked) {
        tl.checked = false;
      } else {
        tl.checked = anychild || tl.checked;
      }
      return tl;
    });

    updateConfigCallback(timelineDisplayConfig);
  };

  getChecked = () => {
    const { timelineDisplayConfig } = this.state;
    let checked = [];
    timelineDisplayConfig.forEach((tl) => {
      if (tl.checked) {
        checked.push(tl.key);
      }
      if ("children" in tl) {
        tl.children.forEach((tl_c) => {
          if (tl_c.checked) {
            checked.push(tl_c.key);
          }
        });
      }
    });
    return checked;
  };

  render() {
    const { timelineDisplayConfig, visible } = this.state;

    return (
      visible && (
        <Modal
          title={"Liste de questionnaires :"}
          visible={visible}
          width={750}
          onCancel={this.handleCloseModalChild}
          footer={null}
        >
          <Tree
            checkable
            checkStrictly={true}
            checkedKeys={this.getChecked()}
            onCheck={this.onCheck}
            treeData={timelineDisplayConfig}
          />
        </Modal>
      )
    );
  }
}

export { TimelineConfigModal };
