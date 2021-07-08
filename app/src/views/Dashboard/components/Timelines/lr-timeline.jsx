import React from 'react';
import {connect} from "react-redux";
import PropTypes from 'prop-types';
import _ from 'lodash';
import {
  Charts,
  ChartContainer,
  ChartRow,
  EventChart,
} from "react-timeseries-charts";
import moment from 'moment';
import { TimeRange, TimeSeries } from 'pondjs';
import {displayTooltip, removeTooltip} from '../../../../store/actions/uiActions';
import {brighten, cssrgb, darken} from "../../../../utils/color.js";
import sizeAware from '../../../../utils/sizeAware.jsx';
import { LrModal } from '../Modals/lr-modal';
import { BacteriologyModal } from '../Modals/bacteriology-modal';
import { LrDocument } from '../Documents/lr-document.jsx';
import { BacteriologyDocument } from '../Documents/bacteriology-document.jsx';
import { getTooltipValue } from './utils.jsx';

const LrTimelineBase = class LrTimeline extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            startDate: props.startDate,
            endDate: props.endDate,
            timeline: props.timeline,
            visibleSubTimelines: props.visibleSubTimelines,
            openDocumentCallback: props.openDocumentCallback,
            openModalBiology: false,
            openModalBacterio: false,
            modalData: undefined,
            displaySubTimelines: false,
        };
        this.refreshSubTimelines = this.refreshSubTimelines.bind(this);
        this.handleOpenModal = this.handleOpenModal.bind(this);
        this.handleCloseModal = this.handleCloseModal.bind(this);
        this.onButtonLabResult = this.onButtonLabResult.bind(this);
        this.onButtonBacteriology = this.onButtonBacteriology.bind(this);
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
          'startDate',
          'endDate',
          'timeline',
          'visibleSubTimelines',
      ];
      const mutableProps = _.pick(nextProps, keys);
      const stateToCompare = _.pick(prevState, keys);
      if (!_.isEqual(mutableProps, stateToCompare)) {
          return mutableProps;
      }
      return null;
  }

  handleMouseOver = e => {
		const d = e.data();
		const isBacterio = d.has('bacteriology');

		this.props.displayTooltip(
			<div style={{fontSize: "0.85em", paddingBottom: 4}}>
				<div style={{fontSize: "1.2em", fontWeight: "bold", marginBottom: 4}}>
					Résultat(s) de {e.get(isBacterio ? "bacteriology" : "labResults")[0].type}  ({getTooltipValue(e.get(isBacterio ? "bacteriology" : "labResults"))})
				</div>

				{(a => a && <ul style={{margin: 0, padding: 0, listStyle: "none inside"}}>
					{a.slice(0, 10).map((a, i) => <li key={i}>
						<span style={{fontWeight: "bold"}}>Date: </span>
						{a.date && moment(a.date).format("DD/MM/YYYY")}

						{isBacterio ? <>
							<span style={{fontWeight: "bold", marginLeft: 8}}>Examen(s): </span>
                            {a.examens ? a.examens.length : 0}
							<span style={{fontWeight: "bold", marginLeft: 8}}>Résultat(s): </span>
                            {a.results ? a.results.length : 0}
                            <span style={{fontWeight: "bold", marginLeft: 8}}>Observations(s): </span>
                            {a.observations ? a.observations.length : 0}
						</> : <>
							<span style={{fontWeight: "bold", marginLeft: 8}}>Type: </span>
							{a.type}
							<span style={{fontWeight: "bold", marginLeft: 8}}>Document(s) disponible(s): </span>
							{a.documents ? a.documents.length : 0}
						</>}
					</li>)}
					{a.length > 10 && <li style={{fontSize: "0.8em", opacity: 0.8}}>{a.length - 10} éléments de plus non affichés</li>}
				</ul>)(e.get(isBacterio ? "bacteriology" : "labResults"))}
			</div>
		);
  }

	handleMouseLeave = () => {
		this.props.removeTooltip();
	}

  handleOpenModal(e, f) {
      const jsonEvent = e.toJSON();
      if ('bacteriology' in jsonEvent.data) {
        this.setState({
            openModalBacterio: true,
            modalData: jsonEvent.data
        });
      } else {
        this.setState({
            openModalBiology: true,
            modalData: jsonEvent.data
        });
    }
  }

  handleCloseModal = (value) => {
      this.setState({
          openModalBiology: false,
          openModalBacterio: false,
          modalData: undefined,
      });
  };

  onButtonLabResult(title, data) {
      this.setState({
          openModalBiology: false,
          openModalBacterio: false,
          modalData: undefined,
      });
      this.state.openDocumentCallback(
          title,
          <LrDocument labResults={data}></LrDocument>
      );
  }

  onButtonBacteriology(title, data) {
    this.setState({
        openModalBiology: false,
        openModalBacterio: false,
        modalData: undefined,
    });
    this.state.openDocumentCallback(
        title,
        <BacteriologyDocument bacteriology={data}></BacteriologyDocument>
    );
}


  refreshSubTimelines = () => {
      const timelinesTemp = [];
      const { visibleSubTimelines } = this.state;

      this.state.timeline.subTimelines.filter(a => a).forEach( (sub) => {
        if (visibleSubTimelines.includes(sub.name)) {
            const labResultTypeTimeSeries = new TimeSeries(sub);
            labResultTypeTimeSeries.setName(`${sub.name}`);
            timelinesTemp.push(labResultTypeTimeSeries);
        }
      });
      return timelinesTemp;
  };

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
          openModalBiology,
          openModalBacterio,
          modalData,
      } = this.state;
      const timeSeries = new TimeSeries(timeline.mainTimeline);

      const fmt = 'YYYY-MM-DD HH:mm';
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
							<ChartRow key="Lab Results" height="16" axisMargin={0}>
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
              <LrModal
                  visible={openModalBiology}
                  data={modalData || {labResults: []}}
                  handleCloseModal={this.handleCloseModal}
                  onButtonLabResult={this.onButtonLabResult}
              ></LrModal>
              <BacteriologyModal
                  visible={openModalBacterio}
                  data={modalData || {bacteriology: []}}
                  handleCloseModal={this.handleCloseModal}
                  onButtonBacteriology={this.onButtonBacteriology}
              ></BacteriologyModal>
          </>
      );
  }
}

export const LrTimeline = sizeAware(connect(undefined, {displayTooltip, removeTooltip})(LrTimelineBase));;
