import React from 'react';
import { Table } from 'antd';
import PropTypes from 'prop-types';
import _ from 'lodash';
import moment from 'moment';

class HeaderInfo extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: props.data,
        };
    }

    static propTypes = {
        data: PropTypes.array.isRequired,
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        const keys = [
            'data',
        ];
        const mutableProps = _.pick(nextProps, keys);
        const stateToCompare = _.pick(prevState, keys);
        if (!_.isEqual(mutableProps, stateToCompare)) {
            return mutableProps;
        }
        return null;
    }

    render() {

        const { data } = this.state;

        return (
            <Table
                size="small"
                columns={[
                    {
                        title: 'Nom',
                        dataIndex: 'lastName',
                        key: 'lastName',
                    },
                    {
                        title: 'Prénom',
                        dataIndex: 'firstName',
                        key: 'firstName',
                    },
                    {
                        title: 'Date de naissance',
                        dataIndex: 'birthDate',
                        key: 'birthDate',
                        render: (text) => {
                            if (text) {
                                return moment(text).format('DD/MM/YYYY');
                            } else {
                                return null;
                            }
                        },
                    },
                    {
                        title: 'Date de décès',
                        dataIndex: 'deceasedDateTime',
                        key: 'deceasedDateTime',
                        render: (text) => {
                            if (text) {
                                return moment(text).format('DD/MM/YYYY');
                            } else {
                                return null;
                            }
                        },
                    },
                    {
                        title: 'Sexe',
                        dataIndex: 'gender',
                        key: 'gender',
                    }]}
                dataSource={data}
                pagination={false}
            />
        );
    }
}

export { HeaderInfo };
