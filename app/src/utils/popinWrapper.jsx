import React from 'react';
import {connect} from 'react-redux';
import {removePopin} from '../store/actions/uiActions';
import {PopinOrientation} from '../store/defs';

export default InnerComponent => connect(state => ({
	popin: state.ui.popin
}), {
	removePopin
})(class PopinWrapper extends React.PureComponent {
	constructor(props) {
		super(props);

		this.state = {
			width: window.innerWidth
		};
	}

	componentDidMount = () => {
		window.addEventListener("resize", this.updateSize);
	}

	componentWillUnmount = () => {
		window.removeEventListener("resize", this.updateSize);
	}

	updateSize = () => {
		this.setState({width: window.innerWidth});
	}

	dismissPopin = () => {
		if (this.props.popin.onDismiss && this.props.popin.onDismiss() === false)
			return;

		this.props.removePopin();
	}

	renderPopin = () => {
		const size = [this.props.popin.size[0] + 16, this.props.popin.size[1] + 16];

		const orientation = this.props.popin.orientation === PopinOrientation.UNSPECIFIED
			? (size[0] > size[1]
				?	PopinOrientation.HORIZONTAL : PopinOrientation.VERTICAL)
			: this.props.popin.orientation;

		const rposition = orientation === PopinOrientation.HORIZONTAL
			? (this.props.popin.anchor[0] + size[0] + 32 > this.state.width ? 'left' : 'right')
			: (size[1] + 32 > this.props.popin.anchor[1] ? 'down' : 'up');

		const [position, clip, arrowSize, arrowPosition, arrowClip, arrowBorderSize, arrowBorderPosition, arrowBorderClip] = {
			left: ([x, y], [w, h]) => [[x - w - 11, y - h / 2],
				`path("M0,0 L${w},0 L${w},${h/2-16} L${w-1},${h/2-16} L${w-1},${h/2+16} L${w},${h/2+16} L${w},${h} L0,${h} Z")`,
				[11, 30], [x - 12, y - 15], 'path("M0,0 L0,30 L11,15 Z")',
				[12, 32], [x - 12, y - 16], 'path("M0,0 L0,2 L10,16 L0,30 L0,32 L12,16 Z")'],

			right: ([x, y], [w, h]) => [[x + 11, y - h / 2],
				`path("M0,0 L${w},0 L${w},${h} L0,${h} L0,${h/2+16} L1,${h/2+16} L1,${h/2-16} L0,${h/2-16} Z")`,
				[11, 30], [x + 1, y - 15], 'path("M11,0 L11,30 L0,15 Z")',
				[12, 32], [x, y - 16], 'path("M12,0 L12,2 L2,16 L12,30 L12,32 L0,16 Z")'],

			up: ([x, y], [w, h]) => [[x - w / 2, y - h - 11],
				`path("M0,0 L${w},0 L${w},${h} L${w/2+16},${h} L${w/2+16},${h-1} L${w/2-16},${h-1} L${w/2-16},${h} L0,${h} Z")`,
				[30, 11], [x - 15, y - 12], 'path("M0,0 L30,0 L15,11 Z")',
				[32, 12], [x - 16, y - 12], 'path("M0,0 L2,0 L16,10 L30,0 L32,0 L16,12 Z")'],

			down: ([x, y], [w, h]) => [[x - w / 2, y + 11],
				`path("M0,0 L${w/2-16},0 L${w/2-16},1 L${w/2+16},1 L${w/2+16},0 L${w},0 L${w},${h} L0,${h} Z")`,
				[30, 11], [x - 15, y + 1], 'path("M0,11 L30,11 L15,0 Z")',
				[32, 12], [x - 16, y], 'path("M0,12 L2,12 L16,2 L30,12 L32,12 L16,0 Z")']
		}[rposition](this.props.popin.anchor, size);

		return <>
			<div style={{
				position: 'fixed',
				left: 0,
				top: 0,
				width: '100vw',
				height: '100vh',
				zIndex: 98
			}} onClick={this.dismissPopin} />

			<div style={{
				position: 'fixed',
				left: arrowPosition[0],
				top: arrowPosition[1],
				width: arrowSize[0],
				height: arrowSize[1],
				zIndex: 99,
				background: "rgba(248, 248, 248, 0.85)",
				backdropFilter: "blur(6px)",
				clipPath: arrowClip
			}} />

			<div style={{
				position: 'fixed',
				left: arrowBorderPosition[0],
				top: arrowBorderPosition[1],
				width: arrowBorderSize[0],
				height: arrowBorderSize[1],
				zIndex: 99,
				background: "#e0e0e0",
				clipPath: arrowBorderClip
			}} />

			<div style={{
				position: 'fixed',
				left: position[0],
				top: position[1],
				width: size[0],
				height: size[1],
				zIndex: 99,
				background: "rgba(248, 248, 248, 0.85)",
				backdropFilter: "blur(6px)",
				border: "1px solid #e0e0e0",
				borderRadius: 4,
				padding: 8,
				clipPath: clip
			}}>{this.props.popin.content}</div>
		</>;
	}

	render = () => <>
		{this.props.popin && this.renderPopin()}

		<InnerComponent {...this.props} />
	</>;
});
