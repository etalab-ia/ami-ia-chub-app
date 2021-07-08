import React from "react";
import {connect} from "react-redux";
import PropTypes from "prop-types";
import { Modal } from "antd";
import _ from "lodash";
import moment from "moment";
import {
  Charts,
  ChartContainer,
  ChartRow,
  EventChart,
} from "react-timeseries-charts";
import { TimeSeries, TimeRange } from "pondjs";
import {displayTooltip, removeTooltip} from "../../../../store/actions/uiActions";
import sizeAware from "../../../../utils/sizeAware.jsx";

const SejoursTimelineBase = class SejoursTimeline extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      startDate: props.startDate,
      endDate: props.endDate,
      hospitalisationTimeline: props.hospitalisationTimeline,
      consultationTimeline: props.consultationTimeline,
      openModal: null,
      titleModal: null
    };
    this.handleOpenModal = this.handleOpenModal.bind(this);
    this.handleCloseModal = this.handleCloseModal.bind(this);
  }

  static propTypes = {
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    hospitalisationTimeline: PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired,
    consultationTimeline: PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired,
    handleTimelineZoomCallback: PropTypes.func,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const keys = [
      "startDate",
      "endDate",
      "hospitalisationTimeline",
      "consultationTimeline",
    ];
    const mutableProps = _.pick(nextProps, keys);
    const stateToCompare = _.pick(prevState, keys);
    if (!_.isEqual(mutableProps, stateToCompare)) {
      return mutableProps;
    }
    return null;
  }

	computeModalTitleFromEvent = e => {
    if (e.get("hospitalisation")) {
      if (e.get("oneDay")) {
				return `Hospitalisation d'une journée au ${moment(
            e.get("start")
          ).format("DD/MM/YYYY")}`;
      } else {
				return `Hospitalisation du ${moment(e.get("start")).format(
            "DD/MM/YYYY"
          )} - ${moment(e.get("end")).format("DD/MM/YYYY")}`;
      }
    } else if (e.get("consultation") && e.get("sameDayEvents")) {
      return `Consultations du ${moment(e.get("start")).format(
          "DD/MM/YYYY"
        )}  - ${moment(e.get("end")).format("DD/MM/YYYY")}`;
    } else if (e.get("consultation")) {
      if (e.get("oneDay")) {
        return `Consultations effectuées le même jour au ${moment(
            e.get("start")
          ).format("DD/MM/YYYY")}`;
      } else {
        return `Consultation du ${moment(e.get("start")).format(
            "DD/MM/YYYY"
          )} - ${moment(e.get("end")).format("DD/MM/YYYY")}`;
      }
    }
	}

	computeLabel = e => e.get("display");

  handleOpenModal(e) {
    this.setState({
			titleModal: this.computeModalTitleFromEvent(e),
      openModal: e.toJSON()
    });
  }

  handleCloseModal() {
    this.setState({
      openModal: null,
    });
  }

	handleSelectEvent = e => {
		console.log(e, e.toJSON(), e.timerange());
		this.props.onChangeTimeRange && this.props.onChangeTimeRange(e.timerange());
	}

  handleMouseOver = e => {
		this.props.displayTooltip(
			<div style={{fontSize: "0.85em", paddingBottom: 4}}>
				<div style={{fontSize: "1.2em", fontWeight: "bold", marginBottom: 4}}>
					{this.computeModalTitleFromEvent(e)}
				</div>

				{[
					["start", "Date de début", () => true, a => moment(a).format("DD/MM/YYYY")],
					["end", "Date de fin", d => !d.get("oneDay"), a => moment(a).format("DD/MM/YYYY")],
					["type", "Type de séjour", d => d.get("hospitalisation")],
					["display", "Service", d => d.get("hospitalisation")],
					["type", "Type", d => d.get("consultation")],
					["sameDayEvents", "Liste des services", d => !!d.get("sameDayEvents"),
						a => a && <ul style={{margin: 0, paddingLeft: 8, listStyle: '"- " inside'}}>
							{a.toArray().map((a, i) => a && <li key={i}>{a.get("reference")}</li>)}
						</ul>]
				].map((d => ([k, l, c = () => true, m = a => a], i) => d.has(k) && c(d, k) &&
					<div key={i}>
						<span style={{fontWeight: "bold"}}>{l}: </span>
						{m(d.get(k))}
					</div>)(e.data()))}
			</div>
		);

    if (e.get("hospitalisation")) {
			//this.props.displayTooltip(e.get("type"));
      return e.get("type");
    } else if (e.get("consultation")) {
			//this.props.displayTooltip(e.get("display"));
      return e.get("type");
    }
  }

	handleMouseLeave = () => {
		this.props.removeTooltip();
	}

  eventStyleFunc(event, state) {
		let color, dcolor, lcolor;
		if (event.get("hospitalisation")) {
      color = "#998ec3";
			dcolor = "#372e58";
			lcolor = "#d6d1e6";
    } else if (event.get("consultation")) {
      color = "#f1a340";
			dcolor = "#714308";
			lcolor = "#f9dab2";
    } else if (event.get("sameDayEvents")) {
      color = "#006600";
			dcolor = "#002800";
			lcolor = "#5bff5b";
    }
    switch (state) {
      case "normal":
        return {
          fill: color,
          stroke: dcolor,
          strokeWidth: "1px",
					clipPath: "inset(1px 1px 1px 0)",
					transform: "translate(0, -1px)"
        };
      case "hover":
        return {
          fill: lcolor,
          stroke: dcolor,
          strokeWidth: "1px",
					clipPath: "inset(1px 1px 1px 0)",
					transform: "translate(0, -1px)",
        };
      case "selected":
        return {
          fill: color,
          stroke: dcolor,
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
      hospitalisationTimeline,
      consultationTimeline,
      openModal,
    } = this.state;
    // console.log(eventTimeline);
    const hospiSeries = new TimeSeries(hospitalisationTimeline);
    const consultSeries = new TimeSeries(consultationTimeline);
    const fmt = "YYYY-MM-DD HH:mm";
    const beginTime = moment(startDate, fmt);
    const endTime = moment(endDate, fmt);
    const timeRange = new TimeRange(beginTime, endTime);
    // On Change datepicker need to recall api with new date range
    return (
      <div>
              <ChartContainer
                timeRange={timeRange}
                enablePanZoom={true}
                enableDragZoom={false}
                timeAxisHeight={26}
								width={this.props.containerWidth}
              >
                <ChartRow key="Hospitalisation" height="20" axisMargin={0}>
                  <Charts>
                    <EventChart
                      series={hospiSeries}
                      size={22}
											hoverMarkerWidth={0}
                      style={this.eventStyleFunc}
											label={this.computeLabel}
                      onMouseOver={this.handleMouseOver}
											onMouseLeave={this.handleMouseLeave}
                      onSelectionChange={this.handleSelectEvent}
                    />
                  </Charts>
                </ChartRow>

                <ChartRow key="Consultation" height="20" axisMargin={0}>
                  <Charts>
                    <EventChart
                      series={consultSeries}
                      size={22}
											hoverMarkerWidth={0}
                      style={this.eventStyleFunc}
											label={this.computeLabel}
                      onMouseOver={this.handleMouseOver}
											onMouseLeave={this.handleMouseLeave}
                      onSelectionChange={this.handleOpenModal}
                    />
                  </Charts>
                </ChartRow>
              </ChartContainer>
        {openModal && (
          <Modal
            title={this.state.titleModal}
            visible={openModal}
            width={750}
            onCancel={this.handleCloseModal}
            footer={null}
          >
            {
              <p>
                <b>Date de début :</b>{" "}
                {moment(openModal.data?.start).format("DD/MM/YYYY")}
              </p>
            }
            {openModal.data?.oneDay || (
              <p>
                <b>Date de fin :</b>{" "}
                {moment(openModal.data?.end).format("DD/MM/YYYY")}
              </p>
            )}

            {openModal.data?.hospitalisation && (
              <p>
                <b>Type de séjour :</b> {openModal.data?.type}
              </p>
            )}
            {openModal.data?.hospitalisation && (
              <p>
                <b>Service :</b> {openModal.data?.display}
              </p>
            )}

            {openModal.data?.consultation && (
              <p>
                <b>Type :</b> {openModal.data?.type}
              </p>
            )}

            {openModal.data?.sameDayEvents && (
              <p>
                <b>Liste des services </b>
              </p>
            )}

            {openModal.data?.sameDayEvents &&
              openModal.data?.sameDayEvents.map((item) => {
                return <p>- {item?.reference}</p>;
              })}
          </Modal>
        )}
      </div>
    );
  }
}

export const SejoursTimeline = sizeAware(connect(undefined, {displayTooltip, removeTooltip})(SejoursTimelineBase));
