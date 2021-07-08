// eslint-disable-next-line no-unused-vars
import React from 'react';
import {  notification } from 'antd';

const Notif = (t, m, d) => notification[t]({
    key: t,
    message: m,
    description: d,
    duration: t === 'info' ? null : 6,
    placement: 'bottomRight'
})

export { Notif };
