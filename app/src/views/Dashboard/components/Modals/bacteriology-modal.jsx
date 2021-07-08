import React from 'react';
import { Modal, Button } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import _ from 'lodash';
import moment from 'moment';

class BacteriologyModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: props.data,
            type: props.type,
            visible: props.visible,
        };
        this.onButtonBacteriologyChild = this.onButtonBacteriologyChild.bind(this);
        this.handleCloseModalChild = this.handleCloseModalChild.bind(this);
    }

  static propTypes = {
      data: PropTypes.object.isRequired,
      type: PropTypes.number,
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

  onButtonBacteriologyChild(title, data) {
      this.props.onButtonBacteriology(title, data);
  }

  handleCloseModalChild() {
      this.props.handleCloseModal(false);
  }

  render() {
      const { visible, data } = this.state;
      if (data && data.bacteriology && data && data.bacteriology.length === 1) {
        this.onButtonBacteriologyChild(
            moment(data.bacteriology[0].date).format('DD/MM/YYYY') + '- Bacterio',
            data.bacteriology[0]
        )
        return null;
      }
      return (
          <Modal
              title={'Résultat(s) bactériologie disponible(s) :'}
              visible={visible}
              width={750}
              onCancel={this.handleCloseModalChild}
              footer={null}
          >
              {visible && data.bacteriology.map((e) =>{
                return(
                    <p>
                        <b>Date :</b> {moment(e.date).format('DD/MM/YYYY')} &nbsp; &nbsp;
                        <b>{e.examens ? e.examens.length : 0} Examen(s)</b>  &nbsp; &nbsp;
                        <b>{e.results ? e.results.length : 0} Résultat(s)</b> &nbsp; &nbsp;
                        <b>{e.observations ? e.observations.length : 0} Observations(s)</b> &nbsp; &nbsp;
                        <Button
                            type="primary"
                            icon={<UnorderedListOutlined />}
                            onClick={() =>
                                this.onButtonBacteriologyChild(
                                    moment(e.date).format('DD/MM/YYYY') + '- Bacterio',
                                    e
                                )
                            }
                        >
                            Consulter
                        </Button>{' '}
                    &nbsp; &nbsp;
                    </p>
                );
            })}
          </Modal>
      );
  }
}

export { BacteriologyModal };
