import React from "react";
import {connect} from "react-redux";
import PropTypes from "prop-types";
import _ from "lodash";
import {
  Charts,
  ChartContainer,
  ChartRow,
  EventChart,
} from "react-timeseries-charts";
import moment from "moment";
import { TimeRange, TimeSeries } from "pondjs";
import {brighten, cssrgb, darken} from "../../../../utils/color.js";
import sizeAware from "../../../../utils/sizeAware.jsx";
import {displayTooltip, removeTooltip} from "../../../../store/actions/uiActions";
import { DocumentsModal } from "../Modals/documents-modal";
import { DocumentsDocument } from "../Documents/documents-document.jsx";
import { getTooltipValue } from "./utils.jsx";

const DocumentsTimelineBase = class DocumentsTimeline extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      startDate: props.startDate,
      endDate: props.endDate,
      timeline: props.timeline,
      visibleSubTimelines: props.visibleSubTimelines,
      openDocumentCallback: props.openDocumentCallback,
      openModal: false,
      openModalBandeau: false,
      modalData: undefined,
      displaySubTimelines: false,
    };
    this.refreshSubTimelines = this.refreshSubTimelines.bind(this);
    this.handleOpenModal = this.handleOpenModal.bind(this);
    this.handleCloseModal = this.handleCloseModal.bind(this);
    this.handleOpenDoc = this.handleOpenDoc.bind(this);
    this.onButtonBandeau = this.onButtonBandeau.bind(this);
  }

  static propTypes = {
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    timeline: PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired,
    visibleSubTimelines: PropTypes.array.isRequired,
    openDocumentCallback: PropTypes.func.isRequired,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const keys = [
      "startDate",
      "endDate",
      "timeline",
      "visibleSubTimelines",
    ];
    const mutableProps = _.pick(nextProps, keys);
    const stateToCompare = _.pick(prevState, keys);
    if (!_.isEqual(mutableProps, stateToCompare)) {
      return mutableProps;
    }
    return null;
  }

  handleMouseOver = e => {
		this.props.displayTooltip(
			<div style={{fontSize: "0.85em", paddingBottom: 4}}>
				<div style={{fontSize: "1.2em", fontWeight: "bold", marginBottom: 4}}>
					Liste de {e.get("clinicalReports")[0].type} ({getTooltipValue(e.get("clinicalReports"))})
				</div>

				{(a => a && <ul style={{margin: 0, padding: 0, listStyle: "none inside"}}>
					{a.slice(0, 10).map((a, i) => <li key={i}>
						<span style={{fontWeight: "bold"}}>Date: </span>
						{a.date && moment(a.date).format("DD/MM/YYYY")}
						<span style={{fontWeight: "bold", marginLeft: 8}}>Titre: </span>
						{a.display}
					</li>)}
					{a.length > 10 && <li style={{fontSize: "0.8em", opacity: 0.8}}>{a.length - 10} éléments de plus non affichés</li>}
				</ul>)(e.get("clinicalReports"))}
			</div>
		);
  }

	handleMouseLeave = () => {
		this.props.removeTooltip();
	}

  handleOpenModal(e) {
    const jsonEvent = e.toJSON();
    this.setState({
      openModal: true,
      modalData: jsonEvent.data,
    });
  }

  handleCloseModal = (value) => {
    this.setState({
      openModal: false,
      openModalBandeau: false,
      modalData: undefined,
    });
  };

  handleOpenDoc(title, data) {
    // console.log(data);
    this.setState({
      openModal: false,
      openModalBandeau: false,
      modalData: undefined,
    });
    this.state.openDocumentCallback(
      title,
      <DocumentsDocument data={data}></DocumentsDocument>
    );
  }

  refreshSubTimelines = () => {
    const timelinesTemp = [];
    const { visibleSubTimelines } = this.state;

    this.state.timeline.subTimelines.filter(a => a).forEach( (sub) => {
        if (visibleSubTimelines.includes(sub.name)) {
            const pmsiTypeTimeSeries = new TimeSeries(sub);
            pmsiTypeTimeSeries.setName(`${sub.name}`);
            timelinesTemp.push(pmsiTypeTimeSeries);
        }
    });
    return timelinesTemp;
  };

  onButtonBandeau() {
    this.setState({
      openModal: null,
      openModalBandeau: null,
      pmsiDocProc: false,
    });

    this.refreshSubTimelines();

    this.setState((prevState) => ({
      displaySubTimelines: !prevState.displaySubTimelines,
    }));
  }

  eventStyleFunc = (baseColor, tweak) => (event, state) => {
		const color = tweak ? tweak(baseColor) : baseColor;

		switch (state) {
      case "normal":
        return {
          fill: cssrgb(color),
          stroke: cssrgb(darken(.6)(color)),
          strokeWidth: "1px",
					clipPath: "inset(1px 1px 1px 0)",
					transform: "translate(0, -1px)"
        };
      case "hover":
        return {
          fill: cssrgb(color),
          stroke: cssrgb(darken(.6)(color)),
          strokeWidth: "1px",
					clipPath: "inset(1px 1px 1px 0)",
					transform: "translate(0, -1px)"
        };
      case "selected":
        return {
          fill: cssrgb(color),
          stroke: cssrgb(darken(.6)(color)),
          strokeWidth: "1px",
					clipPath: "inset(1px 1px 1px 0)",
					transform: "translate(0, -1px)"
        };
      default:
      //pass
    }
  }

  render() {
    const {
      startDate,
      endDate,
      timeline,
      openModal,
      openModalBandeau,
      modalData,
    } = this.state;
    const timeSeries = new TimeSeries(timeline.mainTimeline);

    const fmt = "YYYY-MM-DD HH:mm";
    const beginTime = moment(startDate, fmt);
    const endTime = moment(endDate, fmt);
    const timeRange = new TimeRange(beginTime, endTime);
    return (
      <>
				<ChartContainer
					timeRange={timeRange}
					enablePanZoom={true}
					enableDragZoom={false}
					hideTimeAxis={true}
					timeAxisHeight={0}
					width={this.props.containerWidth}>
					<ChartRow key="Documents" height="16" axisMargin={0}>
						<Charts>
							<EventChart
								series={timeSeries}
								size={18}
								hoverMarkerWidth={0}
								style={this.eventStyleFunc(this.props.color)}
								onMouseOver={this.handleMouseOver}
								onMouseLeave={this.handleMouseLeave}
								onSelectionChange={this.handleOpenModal} />
						</Charts>
					</ChartRow>

					{(a => a !== null && a.map((e, i) => (
						<ChartRow
							key={`${e.name()}`}
							height="16"
							axisMargin={0}>
							<Charts>
								<EventChart
									series={e}
									size={18}
									hoverMarkerWidth={0}
									style={this.eventStyleFunc(this.props.subcolor,
										this.props.subcolorTweakFn ? this.props.subcolorTweakFn(i) : brighten(i * .2))}
									onMouseOver={this.handleMouseOver}
									onMouseLeave={this.handleMouseLeave}
									onSelectionChange={this.handleOpenModal} />
							</Charts>
						</ChartRow>
					)))(this.refreshSubTimelines())}
				</ChartContainer>
        <DocumentsModal
          type={0}
          visible={openModal}
          data={modalData || {clinicalReports: []}}
          handleCloseModal={this.handleCloseModal}
          handleOpenDoc={this.handleOpenDoc}
        ></DocumentsModal>
        <DocumentsModal
          type={1}
          visible={openModalBandeau}
          data={modalData || {clinicalReports: []}}
          handleCloseModal={this.handleCloseModal}
          handleOpenDoc={this.handleOpenDoc}
        ></DocumentsModal>
      </>
    );
  }
}

export const DocumentsTimeline = sizeAware(connect(undefined, {displayTooltip, removeTooltip})(DocumentsTimelineBase));
