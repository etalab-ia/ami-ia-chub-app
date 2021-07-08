import React from 'react';
import {Button} from 'antd';
import {DownloadOutlined} from '@ant-design/icons';
import {TimeRange, TimeSeries} from 'pondjs';
import {ChartContainer, ChartRow, Charts, EventMarker, LineChart, ScatterChart, YAxis} from 'react-timeseries-charts';
import _ from 'lodash';
import moment from 'moment';
import {brighten, cssrgb, darken} from "../../../../utils/color.js";
import {renderDocumentPdf} from '../../../../utils/pdf.js';
import TableDocument from './table-document';

class TableLrTransverseDocument extends React.Component {
	constructor(props) {
			super(props);
			this.state = {
					data: props,
					openDocCallback: props.openDocCallback,
					transversalSearchCallback: props.transversalSearchCallback,
			};
	}

	static getDerivedStateFromProps(nextProps, prevState) {
			const keys = ['data'];
			const mutableProps = _.pick(nextProps, keys);
			const stateToCompare = _.pick(prevState, keys);
			if (!_.isEqual(mutableProps, stateToCompare)) {
					return mutableProps;
			}
			return null;
	}

	render() {
		const { data } = this.state;
		const columns = [
				{
						title: 'Date',
						dataIndex: 'date',
						key: 'date',
				},
				// {
				//     title: 'Label',
				//     dataIndex: 'label',
				//     key: 'label',
				// },
				{
						title: 'Valeur',
						dataIndex: 'value',
						key: 'value',
						style: record => record.refRange.includes("H") ? {fontWeight: "bold"} : {}
				},
				{
						title: 'Commentaire',
						dataIndex: 'refRange',
						key: 'refRange',
				}
		];

		let documents = [];
		data.labResults.points.forEach((points) => {
				points[1].forEach((point) => {
						documents = documents.concat(point.documents);
				});
		});

		const dataSource = documents.map((e) => {
				let refRange = e?.referenceRange;
				if (refRange === 'None') refRange = '';
				return {
						date : moment(e?.date).format('DD/MM/YYYY - hh:mm'),
						label: e?.label,
						code : e?.code,
						value : `${e?.valueQuantity.value} ${e?.valueQuantity.unit}`,
						refRange: refRange,
				};
		});

		return (
			<div style={{display: "flex", width: "100%", height: "100%", overflow: "hidden"}}>
				<TableDocument columns={columns} data={dataSource} />
			</div>
		);
	}
}

class ChartLrTransverseDocument extends React.PureComponent {
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

	describeEvent = event => {
		const date = moment(event.timestamp()).format('DD/MM/YYYY');
		const value = event.get('value');
		const unit = event.get('unit');
		const comment = event.get('refRange');

		return `${date}: ${value} ${unit}${comment && comment !== 'NONE' ? ` (${comment})` : ''}`;
	}

	markerStyle = (_, event) => {
		const color = [200 + ({'HH': -200, 'H': -170, 'L': 30, 'LL': 60}[event.get('refRange')] || 0), .85, .5];
		return {
			normal: {fill: cssrgb(color), stroke: cssrgb(darken(.6)(color)), strokeWidth: '1px'},
			highlighted: {fill: cssrgb(brighten(.4)(color)), stroke: cssrgb(darken(.6)(color)), strokeWidth: '1px'}
		};
	}

	labelStyle = event => {
		const color = [200 + ({'HH': -200, 'H': -170, 'L': 30, 'LL': 60}[event.get('refRange')] || 0), .85, .5];
		return {fill: cssrgb(color)};
	}

	getRenderedSvgCode = () => {
		if (!this.chartContainerRef.current || !this.chartContainerRef.current.svg)
			return;

		const svg = this.chartContainerRef.current.svg.cloneNode(true);
		svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

		return '<?xml version="1.0" encoding="UTF-8"?>' + svg.outerHTML;
	}

	render = () => {
		const data = new TimeSeries({
			columns: ["time", "value", "unit", "refRange"],
			points: this.props.data.points.reduce((a, [_, b]) => [...a,
				...b.reduce((a, {documents}) => [...a,
					...documents.map(({date, valueQuantity, referenceRange}) =>
						[moment(date).valueOf(), valueQuantity.value, valueQuantity.unit, referenceRange.trim().toUpperCase()])
				], [])
			], [])
		});

		const timerange = (([b, e]) => new TimeRange(b - 172800000, e + 172800000))(data.timerange().toJSON());

		return <ChartContainer ref={this.chartContainerRef} timeRange={this.state.timerange || timerange} minTime={timerange.begin()} maxTime={timerange.end()}
			enableDragZoom={true} onTimeRangeChanged={this.onTimeRangeChange} onTrackerChanged={this.onTrackerChange(data)}
			width={this.props.containerWidth} timeAxisHeight={35}>
			<ChartRow height={this.props.containerHeight - 35}>
				<YAxis id="y" min={data.min("value")} max={data.max("value")} />
				<Charts>
					<LineChart axis="y" columns={["value"]} series={data} />
					<ScatterChart axis="y" columns={["value"]} series={data} style={this.markerStyle} radius={4} />

					{this.state.marker ? <EventMarker type="point" axis="y" column="value" markerRadius={4}
						markerStyle={this.markerStyle(null, this.state.marker).highlighted} markerLabelStyle={this.labelStyle(this.state.marker)}
						event={this.state.marker} markerLabel={this.describeEvent(this.state.marker)} /> : <></>}
				</Charts>
			</ChartRow>
		</ChartContainer>
	}
}

class LrTransverseDocument extends React.Component {
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

	downloadPdf = async () => {
		if (!this.chartRef.current)
			return;

		const svg = this.chartRef.current.getRenderedSvgCode();

		if (!svg)
			return;

		const table = [[['Date', .3], ['Valeur', .5], ['Commentaire', .2]], ...this.props.labResults.points.reduce((a, [_, points]) => [...a,
			...points.reduce((a, {documents}) => [...a,
				...documents.map(({date, valueQuantity, referenceRange}) => [
					moment(date).format('DD/MM/YYYY - hh:mm'),
					`${valueQuantity.value} ${valueQuantity.unit}`,
					referenceRange !== 'None' ? referenceRange : ' '
				])], [])], [])];

		const pdf = await renderDocumentPdf(svg, table, this.props.patientName, this.props.documentTitle,
			this.props.startDate && this.props.endDate ? [this.props.startDate, this.props.endDate] : null);
		const a = document.createElement('a');
		a.style.display = 'none';
		a.setAttribute('download', pdf.filename);
		a.setAttribute('href', pdf.data);
		a.click();
	}

	render = () => <div className="tabs-container horizontal right">
		<div className="tabs">
			<div className={this.state.activeTab === "table" ? "tab active fjcenter" : "tab fjcenter"} onClick={() => this.setActiveTab("table")}>
				<div className="tab-title">Liste</div>
			</div>

			<div className={this.state.activeTab === "chart" ? "tab active fjcenter" : "tab fjcenter"} onClick={() => this.setActiveTab("chart")}>
				<div className="tab-title">Courbe</div>
			</div>
		</div>

		<div className="tab-content" ref={this.setContentRef}>
		 	<div hidden={this.state.activeTab !== "table"} style={{display: "flex", width: "100%", height: "100%", overflow: "hidden"}}>
				<TableLrTransverseDocument labResults={this.props.labResults} />
			</div>

			<div hidden={this.state.activeTab !== "chart"} className="chart-tab">
				<div className="chart-tab-download-button">
					<Button onClick={this.downloadPdf} icon={<DownloadOutlined />} type="text" />
				</div>

				<ChartLrTransverseDocument ref={this.chartRef} key={this.props.labResults} data={this.props.labResults}
					containerWidth={this.state.contentWidth}
					containerHeight={this.state.contentHeight} />
			</div>
		</div>
	</div>;
}

export { LrTransverseDocument };
