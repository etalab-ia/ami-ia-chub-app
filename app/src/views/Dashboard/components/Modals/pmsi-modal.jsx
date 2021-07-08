import React from "react";
import { Modal, Button } from "antd";
import { UnorderedListOutlined } from "@ant-design/icons";
import PropTypes from "prop-types";
import _ from "lodash";
import moment from "moment";

class PmsiModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data,
      visible: props.visible,
    };
    this.onButtonDiagnosisChild = this.onButtonDiagnosisChild.bind(this);
    this.handleCloseModalChild = this.handleCloseModalChild.bind(this);
  }

  static propTypes = {
    data: PropTypes.object.isRequired,
    visible: PropTypes.bool.isRequired,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const keys = ["data", "visible"];
    const mutableProps = _.pick(nextProps, keys);
    const stateToCompare = _.pick(prevState, keys);
    if (!_.isEqual(mutableProps, stateToCompare)) {
      return mutableProps;
    }
    return null;
  }

  onButtonDiagnosisChild(title, data) {
    this.props.onButtonDiagnosis(title, data);
  }

  handleCloseModalChild() {
    this.props.handleCloseModal(false);
  }

  render() {
    const { visible, data } = this.state;
    if (data && data.pmsis && data && data.pmsis.length === 1) {
        this.onButtonDiagnosisChild(
            "PMSI" + ((data.pmsis[0]?.type !== 'PMSI') ? '/' + data.pmsis[0]?.type : '') + ' - ' + moment(data.pmsis[0]?.date).format("DD/MM/YYYY"),
            data.pmsis[0].documents
        )
        return null;
    }
    return (
      <Modal
        title={"Diagnosis Type disponible(s) :"}
        visible={visible}
        width={750}
        onCancel={this.handleCloseModalChild}
        footer={null}
      >
        {data && data.pmsis &&
          data?.pmsis.map((e, idx) => {
            return (
              <p>
                <b>Date :</b> {moment(e?.date).format("DD/MM/YYYY")} &nbsp;
                &nbsp;
                <b>Type :</b> {e?.type} &nbsp; &nbsp;
                <Button
                  type="primary"
                  icon={<UnorderedListOutlined />}
                  onClick={() =>
                    this.onButtonDiagnosisChild(
                      "PMSI" + ((e?.type !== 'PMSI') ? '/' + e?.type : '') + ' - ' + moment(e?.date).format("DD/MM/YYYY"),
                      e.documents
                    )
                  }
                >
                  Diagnostiques : {e?.documents ? e?.documents?.length : 0}
                </Button>{" "}
                &nbsp; &nbsp;
              </p>
            );
          })}
      </Modal>
    );
  }
}

export { PmsiModal };
