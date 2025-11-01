import { Controller } from "@hotwired/stimulus";
import * as d3 from "d3";

const parseLocalDate = d3.timeParse("%Y-%m-%d");

export default class extends Controller {
  static values = {
    data: Object,
    strokeWidth: { type: Number, default: 2 },
    useLabels: { type: Boolean, default: true },
    useTooltip: { type: Boolean, default: true },
    useLegend: { type: Boolean, default: true },
    colors: { type: Array, default: ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"] },
  };

  _d3SvgMemo = null;
  _d3GroupMemo = null;
  _d3Tooltip = null;
  _d3InitialContainerWidth = 0;
  _d3InitialContainerHeight = 0;
  _normalizedSeries = [];
  _resizeObserver = null;

  connect() {
    this._install();
    document.addEventListener("turbo:load", this._reinstall);
    this._setupResizeObserver();
  }

  disconnect() {
    this._teardown();
    document.removeEventListener("turbo:load", this._reinstall);
    this._resizeObserver?.disconnect();
  }

  _reinstall = () => {
    this._teardown();
    this._install();
  };

  _teardown() {
    this._d3SvgMemo = null;
    this._d3GroupMemo = null;
    this._d3Tooltip = null;
    this._normalizedSeries = [];

    this._d3Container.selectAll("*").remove();
  }

  _install() {
    this._normalizeSeries();
    this._rememberInitialContainerSize();
    this._draw();
  }

  _normalizeSeries() {
    const series = this.dataValue.series || [];
    this._normalizedSeries = series.map((seriesData, index) => ({
      name: seriesData.name,
      color: seriesData.color || this.colorsValue[index % this.colorsValue.length],
      data: (seriesData.values || []).map((d) => ({
        date: parseLocalDate(d.date),
        date_formatted: d.date_formatted,
        value: d.value,
      })).filter(d => d.date !== null), // Filter out invalid dates
    })).filter(series => series.data.length > 0); // Filter out empty series
  }

  _rememberInitialContainerSize() {
    this._d3InitialContainerWidth = this._d3Container.node().clientWidth;
    this._d3InitialContainerHeight = this._d3Container.node().clientHeight;
  }

  _draw() {
    if (this._normalizedSeries.length === 0 || this._normalizedSeries.every(s => s.data.length < 2)) {
      this._drawEmpty();
    } else {
      this._drawChart();
    }
  }

  _drawEmpty() {
    this._d3Svg.selectAll(".tick").remove();
    this._d3Svg.selectAll(".domain").remove();

    this._drawDashedLineEmptyState();
    this._drawCenteredCircleEmptyState();
  }

  _drawDashedLineEmptyState() {
    this._d3Svg
      .append("line")
      .attr("x1", this._d3InitialContainerWidth / 2)
      .attr("y1", 0)
      .attr("x2", this._d3InitialContainerWidth / 2)
      .attr("y2", this._d3InitialContainerHeight)
      .attr("stroke", "var(--color-gray-300)")
      .attr("stroke-dasharray", "4, 4");
  }

  _drawCenteredCircleEmptyState() {
    this._d3Svg
      .append("circle")
      .attr("cx", this._d3InitialContainerWidth / 2)
      .attr("cy", this._d3InitialContainerHeight / 2)
      .attr("r", 4)
      .attr("class", "fg-subdued")
      .style("fill", "currentColor");
  }

  _drawChart() {
    this._drawLines();

    if (this.useLabelsValue) {
      this._drawXAxisLabels();
      this._drawYAxisLabels();
    }

    if (this.useLegendValue) {
      this._drawLegend();
    }

    if (this.useTooltipValue) {
      this._drawTooltip();
      this._trackMouseForShowingTooltip();
    }
  }

  _drawLines() {
    const linesGroup = this._d3Group
      .append("g")
      .attr("class", "lines");

    this._normalizedSeries.forEach((series, index) => {
      if (series.data.length < 2) return;

      linesGroup
        .append("path")
        .datum(series.data)
        .attr("class", `line line-${index}`)
        .attr("fill", "none")
        .attr("stroke", series.color)
        .attr("stroke-width", this.strokeWidthValue)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", this._d3LineGenerator);

      // Add data points as circles for better visibility
      linesGroup
        .selectAll(`.point-${index}`)
        .data(series.data)
        .enter()
        .append("circle")
        .attr("class", `point point-${index}`)
        .attr("cx", (d) => this._d3XScale(d.date))
        .attr("cy", (d) => this._d3YScale(d.value))
        .attr("r", 3)
        .attr("fill", series.color)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .style("opacity", 0.8);
    });
  }

  _drawLegend() {
    const legend = this._d3Svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${this._d3ContainerWidth - 120}, 20)`);

    const legendItems = legend
      .selectAll(".legend-item")
      .data(this._normalizedSeries)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItems
      .append("line")
      .attr("x1", 0)
      .attr("x2", 15)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", 2);

    legendItems
      .append("text")
      .attr("x", 20)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("fill", "var(--color-gray-700)")
      .text((d) => d.name);
  }

  _drawXAxisLabels() {
    const allDates = this._getAllDates();
    if (allDates.length === 0) return;

    const xExtent = d3.extent(allDates);

    // Add ticks
    this._d3Group
      .append("g")
      .attr("transform", `translate(0,${this._d3ContainerHeight})`)
      .call(
        d3
          .axisBottom(this._d3XScale)
          .tickValues([xExtent[0], xExtent[1]])
          .tickSize(0)
          .tickFormat(d3.timeFormat("%b %d, %Y")),
      )
      .select(".domain")
      .remove();

    // Style ticks
    this._d3Group
      .selectAll(".tick text")
      .attr("class", "fg-gray")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .attr("text-anchor", "middle")
      .attr("dx", (_d, i) => {
        return i === 0 ? "5em" : "-5em";
      })
      .attr("dy", "0em");
  }

  _drawYAxisLabels() {
    const allValues = this._getAllValues();
    if (allValues.length === 0) return;

    const yDomain = this._d3YScale.domain();
    const tickValues = this._d3YScale.ticks(5);
    
    // Add Y-axis ticks
    this._d3Group
      .append("g")
      .attr("class", "y-axis")
      .attr("transform", "translate(0,0)")
      .call(
        d3
          .axisLeft(this._d3YScale)
          .tickValues(tickValues)
          .tickSize(-this._d3ContainerWidth)
          .tickFormat((d) => {
            if (d >= 1000000) {
              return `$${(d / 1000000).toFixed(1)}M`;
            } else if (d >= 1000) {
              return `$${(d / 1000).toFixed(0)}K`;
            } else {
              return `$${d.toLocaleString()}`;
            }
          })
      )
      .select(".domain")
      .remove();

    // Style grid lines and labels
    this._d3Group
      .selectAll(".y-axis .tick line")
      .attr("class", "grid-line")
      .style("stroke", "var(--color-gray-200)")
      .style("stroke-dasharray", "2,2");

    this._d3Group
      .selectAll(".y-axis .tick text")
      .attr("class", "fg-gray")
      .style("font-size", "12px")
      .style("font-weight", "500");
  }

  _drawTooltip() {
    this._d3Tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "chart-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");
  }

  _trackMouseForShowingTooltip() {
    const mouseRect = this._d3Svg
      .append("rect")
      .attr("width", this._d3ContainerWidth)
      .attr("height", this._d3ContainerHeight)
      .style("fill", "none")
      .style("pointer-events", "all");

    mouseRect
      .on("mouseover", () => {
        if (this._d3Tooltip) {
          this._d3Tooltip.style("visibility", "visible");
        }
      })
      .on("mouseout", () => {
        if (this._d3Tooltip) {
          this._d3Tooltip.style("visibility", "hidden");
        }
      })
      .on("mousemove", (event) => {
        const [mouseX] = d3.pointer(event);
        const date = this._d3XScale.invert(mouseX);
        
        // Find closest data points for each series
        const tooltipData = this._normalizedSeries
          .map(series => {
            const closestPoint = this._findClosestPoint(series.data, date);
            return closestPoint ? {
              seriesName: series.name,
              color: series.color,
              value: closestPoint.value,
              date: closestPoint.date_formatted || d3.timeFormat("%b %d, %Y")(closestPoint.date)
            } : null;
          })
          .filter(d => d !== null);

        if (tooltipData.length > 0) {
          const tooltipContent = tooltipData
            .map(d => `<div style="color: ${d.color};">● ${d.seriesName}: $${d.value.toLocaleString()}</div>`)
            .join('');
          
          const dateStr = tooltipData[0].date;
          
          this._d3Tooltip
            .html(`<div style="margin-bottom: 4px; font-weight: bold;">${dateStr}</div>${tooltipContent}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        }
      });
  }

  _findClosestPoint(data, targetDate) {
    if (data.length === 0) return null;
    
    let closestPoint = data[0];
    let minDistance = Math.abs(targetDate - closestPoint.date);
    
    for (const point of data) {
      const distance = Math.abs(targetDate - point.date);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    }
    
    return closestPoint;
  }

  _getAllDates() {
    const allDates = [];
    this._normalizedSeries.forEach(series => {
      series.data.forEach(d => allDates.push(d.date));
    });
    return allDates.filter(d => d !== null);
  }

  _getAllValues() {
    const allValues = [];
    this._normalizedSeries.forEach(series => {
      series.data.forEach(d => allValues.push(d.value));
    });
    return allValues.filter(v => v !== null && !isNaN(v));
  }

  get _d3LineGenerator() {
    return d3
      .line()
      .x((d) => this._d3XScale(d.date))
      .y((d) => this._d3YScale(d.value))
      .defined(d => d.date !== null && !isNaN(d.value));
  }

  get _d3XScale() {
    const allDates = this._getAllDates();
    if (allDates.length === 0) {
      return d3.scaleTime().rangeRound([0, this._d3ContainerWidth]).domain([new Date(), new Date()]);
    }
    
    return d3
      .scaleTime()
      .rangeRound([0, this._d3ContainerWidth])
      .domain(d3.extent(allDates));
  }

  get _d3YScale() {
    const allValues = this._getAllValues();
    if (allValues.length === 0) {
      return d3.scaleLinear().rangeRound([this._d3ContainerHeight, 0]).domain([0, 100]);
    }

    const dataMin = d3.min(allValues);
    const dataMax = d3.max(allValues);

    // Handle edge case where all values are the same
    if (dataMin === dataMax) {
      const padding = dataMax === 0 ? 100 : Math.abs(dataMax) * 0.5;
      return d3
        .scaleLinear()
        .rangeRound([this._d3ContainerHeight, 0])
        .domain([dataMin - padding, dataMax + padding]);
    }

    const dataRange = dataMax - dataMin;
    const padding = dataRange * 0.1; // 10% padding

    return d3
      .scaleLinear()
      .rangeRound([this._d3ContainerHeight, 0])
      .domain([dataMin - padding, dataMax + padding]);
  }

  get _d3Container() {
    return d3.select(this.element);
  }

  get _d3Svg() {
    if (!this._d3SvgMemo) {
      this._d3SvgMemo = this._d3Container
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%");
    }
    return this._d3SvgMemo;
  }

  get _d3Group() {
    if (!this._d3GroupMemo) {
      this._d3GroupMemo = this._d3Svg.append("g").attr("class", "chart-content");
    }
    return this._d3GroupMemo;
  }

  get _d3ContainerWidth() {
    return this._d3InitialContainerWidth;
  }

  get _d3ContainerHeight() {
    return this._d3InitialContainerHeight;
  }

  _setupResizeObserver() {
    if (window.ResizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        this._reinstall();
      });
      this._resizeObserver.observe(this.element);
    }
  }
}