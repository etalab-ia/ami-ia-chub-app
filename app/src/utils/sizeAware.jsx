import React from 'react';

export default InnerComponent => class SizeAware extends React.Component {
	constructor(props) {
		super(props);
		this.state = {width: 0, height: 0};
	}

	componentDidMount = () => {
		window.addEventListener("resize", this.updateSize);
	}

	componentWillUnmount = () => {
		window.removeEventListener("resize", this.updateSize);
	}

	setContainerRef = container => {
		this.container = container;
		this.updateSize();
	}

	updateSize = () => {
		if (this.container)
			this.setState({width: this.container.offsetWidth, height: this.container.offsetHeight});
	}

	render() {
		return (
			<div style={{width: "100%", height: "100%"}} ref={this.setContainerRef}>
				<InnerComponent {...this.props} containerWidth={this.state.width} containerHeight={this.state.height} />
			</div>
		);
	}
}
