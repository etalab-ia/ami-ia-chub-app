import React from "react";
import { Table, Modal } from "antd";
import PropTypes from "prop-types";
import _ from "lodash";
import moment from "moment";

class QrModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props,
      visible: props.visible,
    };
    this.handleCloseModalChild = this.handleCloseModalChild.bind(this);
    this.handleOpenDocChild = this.handleOpenDocChild.bind(this);
  }

  static propTypes = {
    data: PropTypes.array.isRequired,
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

  handleCloseModalChild() {
    this.props.handleCloseModal(false);
  }

  handleOpenDocChild(title, data) {
    this.props.handleOpenDoc(title, data);
  }

  render() {
    const { data, visible } = this.state;

    const columns = [
      {
        title: "Date",
        dataIndex: "date",
        key: "date",
      },
      {
        title: "Titre",
        dataIndex: "title",
        key: "title",
      },
      {
        title: "Action",
        key: "action",
        render: (text) => (
          <p size="middle">
            <a>Consulter </a>
          </p>
        ),
      },
    ];

    const dataSource = data?.map((e) => {
      return {
        date: moment(e?.date).format("DD/MM/YYYY"),
        title: e?.qrList.children[0].title,
        action: "x",
      };
    });

    if (dataSource && dataSource.length === 1) {
        this.handleOpenDocChild(
            "QR:" + dataSource[0].date + "-" + dataSource[0].title,
            data[0]
        )
        return null;
    }

    return (
      visible && (
        <Modal
          title={"Liste de questionnaires :"}
          visible={visible}
          width={750}
          onCancel={this.handleCloseModalChild}
          footer={null}
        >
          {
            <Table
              dataSource={dataSource}
              columns={columns}
              pagination={{ pageSize: 50 }}
              scroll={{ y: 550 }}
              onRow={(record, rowIndex) => {
                return {
                  onClick: (event) => {
                    this.handleOpenDocChild(
                      "QR:" + record.date + "-" + record.title,
                      data[rowIndex]
                    );
                  }, // click row
                  onDoubleClick: (event) => {}, // double click row
                  onContextMenu: (event) => {}, // right button click row
                  onMouseEnter: (event) => {}, // mouse enter row
                  onMouseLeave: (event) => {}, // mouse leave row
                };
              }}
            />
          }
        </Modal>
      )
    );
  }
}

export { QrModal };
