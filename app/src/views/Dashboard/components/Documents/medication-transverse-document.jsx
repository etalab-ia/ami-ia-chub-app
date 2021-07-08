import React from "react";
import {Button} from 'antd';
import {DownloadOutlined} from '@ant-design/icons';
import {TimeRange, TimeSeries, sum} from 'pondjs';
import {BarChart, ChartContainer, ChartRow, Charts, YAxis} from 'react-timeseries-charts';
import _ from "lodash";
import moment from 'moment';
import {cssrgb} from "../../../../utils/color.js";
import {renderDocumentPdf} from '../../../../utils/pdf.js';
import TableDocument from './table-document';

class TableMedicationTransverseDocument extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props,
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const keys = ["data"];
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
    //   {
    //     title: "Code Médicament",
    //     dataIndex: "codeMed",
    //     key: "codeMed",
    //   },
    //   {
    //     title: "Nom Médicament",
    //     dataIndex: "display",
    //     key: "display",
    //   },
      {
        title: "Date prise",
        dataIndex: "date",
        key: "date",
        width: "40%"
      },
    ];

    let documents = [];
    data.points.forEach((points) => {
        points[1].forEach((point) => {
            documents = documents.concat(point.documents);
        });
    });
    documents.sort((a, b) => {
        var dateA = moment(a.date).toDate();
        var dateB = moment(b.date).toDate();
        if (dateA !== dateB) return dateA - dateB;

        var a_hour = Number(a.medicationTime.split(':')[0]);
        var a_minutes = Number(a.medicationTime.split(':')[1]);
        var b_hour = Number(b.medicationTime.split(':')[0]);
        var b_minutes = Number(b.medicationTime.split(':')[1]);
        if (a_hour !== b_hour) return a_hour - b_hour;
        return a_minutes - b_minutes;
    });

    const dataSource = []

    documents.forEach((medicament) => {
        if (medicament.medicaments.length === 1) {
            dataSource.push({
                codeMed: medicament.medicaments[0].medCode,
                display: medicament.medicaments[0].medName,
                hour: `${medicament.medicationTime.split(':')[0].padStart(2, '0')}:${medicament.medicationTime.split(':')[1].padStart(2, '0')}`,
                date: moment(new Date(medicament.date)).format('DD/MM/YYYY') + ` - ${medicament.medicationTime.split(':')[0].padStart(2, '0')}:${medicament.medicationTime.split(':')[1].padStart(2, '0')}`,
                color: "#fff"
            });
        } else {
            dataSource.push({
                codeMed: "Administration conjointe",
                display: "",
                hour: `${medicament.medicationTime.split(':')[0].padStart(2, '0')}:${medicament.medicationTime.split(':')[1].padStart(2, '0')}`,
                date: moment(new Date(medicament.date)).format('DD/MM/YYYY') + ` - ${medicament.medicationTime.split(':')[0].padStart(2, '0')}:${medicament.medicationTime.split(':')[1].padStart(2, '0')}`,
                color: "#fff"
            });
            medicament.medicaments.forEach( (med) => {
                dataSource.push({
                    codeMed: "+              " + med.medCode,
                    display: "+              " + med.medName,
                    hour: "",
                    color: "#eee"
                });
            });
        };
    });

    return (
			<div style={{display: "flex", width: "100%", height: "100%", overflow: "hidden"}}>
				<TableDocument columns={columns} data={dataSource}
					rowStyle={record => ({background: record.color})} />
			</div>
		);/*<div>
            <Table
                dataSource={dataSource}
                columns={columns}
                rowClassName={(record) => record.color.replace('#', '')}
                pagination={{ pageSize: 50 }}
                scroll={{ y: 550 }}
            />
        </div>*/
  }
}

class ChartMedicationTransverseDocument extends React.PureComponent {
	constructor(props) {
		super(props);

		this.chartContainerRef = React.createRef();

		this.state = {
			timerange: null
		};
	}

	onTimeRangeChange = timerange => this.setState({timerange});

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
			points: Object.entries(this.props.data.points.reduce((a, [_, b]) => [...a,
				...b.reduce((a, {documents}) => [...a, ...documents.reduce((a, {date, medicaments}) =>
					[...a, [moment(date).valueOf(), medicaments.length]], [])
				], [])
			], []).reduce((a, [k, v]) => ({...a, [k]: k in a ? a[k] + v : v}), {}))
		}).dailyRollup({aggregation: {value: {value: sum()}}});

		const timerange = (([b, e]) => new TimeRange(b - 172800000, e + 172800000))(data.timerange().toJSON());

		return <ChartContainer ref={this.chartContainerRef} timeRange={this.state.timerange || timerange} minTime={timerange.begin()} maxTime={timerange.end()}
			enableDragZoom={true} onTimeRangeChanged={this.onTimeRangeChange}
			width={this.props.containerWidth} timeAxisHeight={35}>
			<ChartRow height={this.props.containerHeight - 35}>
				<YAxis id="y" min={data.min("value")} max={data.max("value")} />
				<Charts>
					<BarChart axis="y" columns={["value"]} series={data} style={{value: {normal: {fill: cssrgb([200, .85, .5])}}}} />
				</Charts>
			</ChartRow>
		</ChartContainer>
	}
}

class MedicationTransverseDocument extends React.Component {
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

		const table = [[['Date prise', 1]], ...this.props.data.points.reduce((a, [_, points]) => [...a,
			...points.reduce((a, {documents}) => [...a, ...documents], [])], []).sort((a, b) => {
	        var dateA = moment(a.date).toDate();
	        var dateB = moment(b.date).toDate();
	        if (dateA !== dateB) return dateA - dateB;

	        var a_hour = Number(a.medicationTime.split(':')[0]);
	        var a_minutes = Number(a.medicationTime.split(':')[1]);
	        var b_hour = Number(b.medicationTime.split(':')[0]);
	        var b_minutes = Number(b.medicationTime.split(':')[1]);
	        if (a_hour !== b_hour) return a_hour - b_hour;
	        return a_minutes - b_minutes;
	    }).map(({date, medicationTime}) => [
				`${moment(new Date(date)).format('DD/MM/YYYY')} - ${medicationTime.split(':')[0].padStart(2, '0')}:${medicationTime.split(':')[1].padStart(2, '0')}`
			])];

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
				<div className="tab-title">Nombre/j.</div>
			</div>
		</div>

		<div className="tab-content" ref={this.setContentRef}>
		 	<div hidden={this.state.activeTab !== "table"} style={{display: "flex", width: "100%", height: "100%", overflow: "hidden"}}>
				<TableMedicationTransverseDocument data={this.props.data} />
			</div>

			<div hidden={this.state.activeTab !== "chart"} className="chart-tab">
				<div className="chart-tab-download-button">
					<Button onClick={this.downloadPdf} icon={<DownloadOutlined />} type="text" />
				</div>

				<ChartMedicationTransverseDocument ref={this.chartRef} key={this.props.data} data={this.props.data}
					containerWidth={this.state.contentWidth}
					containerHeight={this.state.contentHeight} />
			</div>
		</div>
	</div>;
}

export { MedicationTransverseDocument };
