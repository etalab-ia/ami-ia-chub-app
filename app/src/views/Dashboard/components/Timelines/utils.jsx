import React from "react";
import { Button, Row } from "antd";
import { DownCircleTwoTone, UpCircleTwoTone } from "@ant-design/icons";
import moment from "moment";
import {
  Charts,
  ChartContainer,
  ChartRow,
  Resizable,
  EventChart,
} from "react-timeseries-charts";

export function getChartContainer(
  key,
  timeRange,
  timeSeries,
  subTimeSeries,
  displaySubSeries,
  mainStyleFunc,
  mainLabel,
  mainOnMouseOver,
  mainOnSelectionChange,
  subStyleFunc,
  subLabel,
  subOnMouseOver,
  subOnSelectionChange
) {
  return (
    <Resizable>
      <ChartContainer
        timeRange={timeRange}
        enablePanZoom={true}
        enableDragZoom={false}
        hideTimeAxis={true}
        timeAxisHeight={0}
      >
        <ChartRow key={key} height="30" axisMargin="0">
          <Charts>
            <EventChart
              series={timeSeries}
              size={30}
              style={mainStyleFunc}
              label={mainLabel}
              onMouseOver={mainOnMouseOver}
              onSelectionChange={mainOnSelectionChange}
            />
          </Charts>
        </ChartRow>
        {subTimeSeries != null &&
          subTimeSeries.map((e) => {
            return (
              <ChartRow
                key={`${e.name()}`}
                height="20"
                visible={displaySubSeries}
                axisMargin="0"
              >
                <Charts>
                  <EventChart
                    series={e}
                    size={20}
                    style={subStyleFunc}
                    label={subLabel}
                    onMouseOver={subOnMouseOver}
                    onSelectionChange={subOnSelectionChange}
                  />
                </Charts>
              </ChartRow>
            );
          })}
      </ChartContainer>
    </Resizable>
  );
}

export function getChartTitles(
  title,
  displaySubSeries,
  onDisplaySubSeriesButton,
  subTimeSeriesTitles
) {
  return (
    <>
      <Row>
        {subTimeSeriesTitles && subTimeSeriesTitles.length !== 0 && (
          <Button
            type="primary"
            shape="circle"
            icon={
              displaySubSeries ? <UpCircleTwoTone /> : <DownCircleTwoTone />
            }
            size={"small"}
            onClick={() => onDisplaySubSeriesButton()}
          />
        )}
        {title}
      </Row>
      {subTimeSeriesTitles &&
        displaySubSeries &&
        subTimeSeriesTitles.map((e) => {
          return <Row>{"   " + e}</Row>;
        })}
    </>
  );
}

export function getTooltipValue(
    docs
) {
    let message = '';
    if (docs.length >= 2) {
        var date1 = moment(docs[0].date).format("DD/MM/YYYY");
        var date2 = moment(docs[docs.length-1].date).format("DD/MM/YYYY");
        if (date1 === date2) message = `${date1}`;
        else message = `${date1} - ${date2}`;
    } else {
        message = moment(docs[0].date).format("DD/MM/YYYY");
    }
    return message;
}
