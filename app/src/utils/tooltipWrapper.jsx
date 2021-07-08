import React from 'react';
import {connect} from 'react-redux';

export default InnerComponent => connect(state => ({
	tooltip: state.ui.tooltip
}))(class TooltipWrapper extends React.PureComponent {
	constructor(props) {
		super(props);

		this.state = {
			mouseX: 0,
			mouseY: 0,
			lastUpdated: 0
		};
	}

	setMousePosition = e => {
		let now = Date.now();

		if (now < this.state.lastUpdated + 32 || !this.props.tooltip)
			return;

		this.setState({mouseX: e.clientX, mouseY: e.clientY, lastUpdated: now});
	}

	render() {
		return (
			<div onMouseMove={this.setMousePosition}>
				{this.props.tooltip && <div style={{
					position: 'fixed',
					left: this.state.mouseX + 12,
					top: this.state.mouseY + 12,
					backgroundColor: "#efefef",
					border: "1px solid #dfdfdf",
					borderRadius: 4,
					padding: "0 4px",
					zIndex: 1000
				}}>{this.props.tooltip}</div>}

				<InnerComponent {...this.props} />
			</div>
		);
	}
});
