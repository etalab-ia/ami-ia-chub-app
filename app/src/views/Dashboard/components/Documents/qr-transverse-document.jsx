import React from 'react';
import {Button} from 'antd';
import {DownloadOutlined} from '@ant-design/icons';
import {TimeRange, TimeSeries} from 'pondjs';
import {ChartContainer, ChartRow, Charts, EventMarker, LineChart, ScatterChart, YAxis} from 'react-timeseries-charts';
import moment from 'moment';
import {brighten, cssrgb, darken} from "../../../../utils/color.js";
import {renderDocumentPdf} from '../../../../utils/pdf.js';
import TableDocument from './table-document';

class TableQrTransverseDocument extends React.PureComponent {
	render = () =>
		<div style={{display: "flex", width: "100%", height: "100%", overflow: "hidden"}}>
			<TableDocument columns={[{title: 'Date', key: 0}, {title: 'Valeur', key: 1}]}
				data={this.props.data.map(([date, value]) => [date.format('DD/MM/YYYY - hh:mm'), value])} />
		</div>;
}

class ChartQrTransverseDocument extends React.PureComponent {
	constructor(props) {
		super(props);

		this.chartContainerRef = React.createRef();

		this.state = {
			timerange: null,
			marker: null
		};
	}

	onTimeRangeChange = timerange => this.setState({timerange});

	onTrackerChange = data => time => {
		this.setState({marker: time ? data.atTime(time) : null});
	}

	describeEvent = event => `${moment(event.timestamp()).format('DD/MM/YYYY')}: ${event.get('value')}`;

	getRenderedSvgCode = () => {
		if (!this.chartContainerRef.current || !this.chartContainerRef.current.svg)
			return;

		const svg = this.chartContainerRef.current.svg.cloneNode(true);
		svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

		return '<?xml version="1.0" encoding="UTF-8"?>' + svg.outerHTML;
	}

	render = () => {
		const data = new TimeSeries({
			columns: ["time", "value"],
			points: this.props.data.map(([date, value]) => [date.valueOf(), parseInt(value, 10)])
		});

		const timerange = (([b, e]) => new TimeRange(b - 172800000, e + 172800000))(data.timerange().toJSON());

		const style = (c => ({
			marker: {value: {
				normal: {fill: cssrgb(c), stroke: cssrgb(darken(.6)(c)), strokeWidth: '1px'},
				highlighted: {fill: cssrgb(brighten(.4)(c)), stroke: cssrgb(darken(.6)(c)), strokeWidth: '1px'}}},
			label: {fill: cssrgb(c)}
		}))([200, .85, .5]);

		return <ChartContainer ref={this.chartContainerRef} timeRange={this.state.timerange || timerange} minTime={timerange.begin()} maxTime={timerange.end()}
			enableDragZoom={true} onTimeRangeChanged={this.onTimeRangeChange} onTrackerChanged={this.onTrackerChange(data)}
			width={this.props.containerWidth} timeAxisHeight={35}>
			<ChartRow height={this.props.containerHeight - 35}>
				<YAxis id="y" min={data.min("value")} max={data.max("value")} />
				<Charts>
					<LineChart axis="y" columns={["value"]} series={data} />
					<ScatterChart axis="y" columns={["value"]} series={data} style={style.marker} radius={4} />

					{this.state.marker ? <EventMarker type="point" axis="y" column="value" markerRadius={4}
						markerStyle={style.marker.value.highlighted} markerLabelStyle={style.label}
						event={this.state.marker} markerLabel={this.describeEvent(this.state.marker)} /> : <></>}
				</Charts>
			</ChartRow>
		</ChartContainer>
	}
}

class QrTransverseDocument extends React.Component {
	constructor(props) {
		super(props);

		this.chartRef = React.createRef();

		this.state = {
			activeTab: 'table',
			contentWidth: 0,
			contentHeight: 0
		};
	}

	componentDidMount = () => {
		window.addEventListener('resize', this.updateContentSize);
	}

	componentWillUnmount = () => {
		window.removeEventListener('resize', this.updateContentSize);
	}

	setContentRef = contentRef => {
		this.contentRef = contentRef;
		this.updateContentSize();
	}

	updateContentSize = () => {
		if (this.contentRef)
			this.setState({
				contentWidth: this.contentRef.offsetWidth,
				contentHeight: this.contentRef.offsetHeight
			});
	}

	setActiveTab = tab => {
		this.setState({activeTab: tab});
	}

	findCodeValue = (node, code) => {
			if (node?.code && node.code === code) {
					if (node.isLeaf) {return [node.title];}
					if (node?.children) {
							return node.children.reduce( (acc, curr) => {return acc.concat([curr.title]);}, [])
					}
					return [node.title];
			}
			if (node?.children) {
					return node.children.reduce( (acc, curr) => {return acc.concat(this.findCodeValue(curr, code));}, [])
			}
			return []
	}

	downloadPdf = async () => {
		if (!this.chartRef.current)
			return;

		const svg = this.chartRef.current.getRenderedSvgCode();

		if (!svg)
			return;

		const table = [[['Date', .4], ['Valeur', .6]], ...this.props.data.points.reduce((a, [_, b]) => [...a,
			...b.reduce((a, {date, qrList}) => [...a,
				...this.findCodeValue(qrList, this.props.code).map(a => [
					moment(date).format('DD/MM/YYYY - hh:mm'), a])], [])], [])];

		const pdf = await renderDocumentPdf(svg, table, this.props.patientName, this.props.documentTitle,
			this.props.startDate && this.props.endDate ? [this.props.startDate, this.props.endDate] : null);
		const a = document.createElement('a');
		a.style.display = 'none';
		a.setAttribute('download', pdf.filename);
		a.setAttribute('href', pdf.data);
		a.click();
	}

	render = () => {
		const data = this.props.data.points.reduce((a, [_, b]) => [...a,
			...b.reduce((a, {date, qrList}) => [...a,
				...this.findCodeValue(qrList, this.props.code).map(a => [moment(date), a])
			], [])
		], []);

		const chartAvailable = data.some(([_, a]) => !isNaN(parseInt(a, 10)));

		return <div className="tabs-container horizontal right">
			{chartAvailable && <div className="tabs">
				<div className={this.state.activeTab === "table" ? "tab active fjcenter" : "tab fjcenter"} onClick={() => this.setActiveTab("table")}>
					<div className="tab-title">Liste</div>
				</div>

				<div className={this.state.activeTab === "chart" ? "tab active fjcenter" : "tab fjcenter"} onClick={() => this.setActiveTab("chart")}>
					<div className="tab-title">Courbe</div>
				</div>
			</div>}

			<div className="tab-content" ref={this.setContentRef}>
		 		<div hidden={chartAvailable && this.state.activeTab !== "table"} style={{display: "flex", width: "100%", height: "100%", overflow: "hidden"}}>
					<TableQrTransverseDocument data={data} />
				</div>

				{chartAvailable && <div hidden={this.state.activeTab !== "chart"} className="chart-tab">
					<div className="chart-tab-download-button">
						<Button onClick={this.downloadPdf} icon={<DownloadOutlined />} type="text" />
					</div>

					<ChartQrTransverseDocument ref={this.chartRef} key={this.props.data} data={data}
						containerWidth={this.state.contentWidth}
						containerHeight={this.state.contentHeight} />
				</div>}
			</div>
		</div>;
	};
}

export { QrTransverseDocument };
