import React from 'react';
import { Modal, Button } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import _ from 'lodash';
import moment from 'moment';

class LrModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: props.data,
            visible: props.visible,
        };
        this.onButtonLabResultChild = this.onButtonLabResultChild.bind(this);
        this.handleCloseModalChild = this.handleCloseModalChild.bind(this);
    }

  static propTypes = {
      data: PropTypes.object.isRequired,
      visible: PropTypes.bool.isRequired,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
      const keys = ['data', 'visible'];
      const mutableProps = _.pick(nextProps, keys);
      const stateToCompare = _.pick(prevState, keys);
      if (!_.isEqual(mutableProps, stateToCompare)) {
          return mutableProps;
      }
      return null;
  }

  onButtonLabResultChild(title, data) {
      this.props.onButtonLabResult(title, data);
  }

  handleCloseModalChild() {
      this.props.handleCloseModal(false);
  }

  render() {
      const { visible, data } = this.state;
      if (data && data.labResults && data && data.labResults.length === 1) {
        this.onButtonLabResultChild(
            moment(data.labResults[0].date).format('DD/MM/YYYY') + '- Biologie' + ((data.labResults[0].type === "Biologie") ? "" : "/"+ data.labResults[0].type),
            data.labResults[0].documents
        )
        return null;
    }

      return (
          visible &&
          <Modal
              title={`Résultat(s) de Biologie disponible(s) :`}
              visible={visible}
              width={750}
              onCancel={this.handleCloseModalChild}
              footer={null}
          >
              {data?.labResults && data.labResults.map( (e, idx) => {
                  return (
                      <p>
                          <b>Date :</b> {moment(e.date).format('DD/MM/YYYY')} &nbsp; &nbsp;
                          <b>Type :</b> {e.type} &nbsp; &nbsp;
                          <Button
                              type="primary"
                              icon={<UnorderedListOutlined />}
                              onClick={() =>
                                  this.onButtonLabResultChild(
                                      moment(e.date).format('DD/MM/YYYY') + '- Biologie' + ((e.type === "Biologie") ? "" : "/"+ e.type),
                                      e.documents
                                  )
                              }
                          >
                             Consulter : {e ? e.documents.length : 0}
                          </Button>{' '}
                    &nbsp; &nbsp;
                      </p>
                  );
              })}

          </Modal>
      );
  }
}

export { LrModal };
