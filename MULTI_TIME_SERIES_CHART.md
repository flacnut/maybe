# Multi-Time Series Chart Controller

A Stimulus controller for rendering interactive multi-line time series charts using D3.js. This controller extends the functionality of the single time series chart to support multiple data series with different colors, legends, and enhanced interactivity.

## Features

- ✅ **Multiple Series Support**: Display multiple time series on the same chart
- ✅ **Custom Colors**: Define custom colors for each series or use default palette
- ✅ **Interactive Legend**: Toggle-able legend showing series names and colors
- ✅ **Enhanced Tooltips**: Multi-series tooltips showing all values at a point in time
- ✅ **Data Points**: Visual markers for each data point on the lines
- ✅ **Responsive Design**: Automatically adjusts to container size changes
- ✅ **Grid Lines & Labels**: Configurable axis labels and grid lines
- ✅ **Empty State Handling**: Graceful display when no data is available

## Usage

### Basic HTML Implementation

```html
<div 
  data-controller="multi-time-series-chart"
  data-multi-time-series-chart-data-value='{
    "series": [
      {
        "name": "Series 1",
        "color": "#3b82f6",
        "values": [
          {"date": "2024-01-01", "date_formatted": "Jan 1, 2024", "value": 1000},
          {"date": "2024-02-01", "date_formatted": "Feb 1, 2024", "value": 1200}
        ]
      },
      {
        "name": "Series 2", 
        "color": "#ef4444",
        "values": [
          {"date": "2024-01-01", "date_formatted": "Jan 1, 2024", "value": 800},
          {"date": "2024-02-01", "date_formatted": "Feb 1, 2024", "value": 950}
        ]
      }
    ]
  }'
  style="width: 800px; height: 400px;"
  class="border rounded-lg"
>
</div>
```

### Rails Implementation with Helper

```erb
<%
  # Define your series data
  series_data = [
    {
      name: "Account Balance",
      color: "#3b82f6",
      data: [
        { date: Date.parse("2024-01-01"), value: 10000 },
        { date: Date.parse("2024-02-01"), value: 12000 }
      ]
    },
    {
      name: "Investment Value",
      color: "#10b981", 
      data: [
        { date: Date.parse("2024-01-01"), value: 5000 },
        { date: Date.parse("2024-02-01"), value: 5500 }
      ]
    }
  ]
  
  chart_data = multi_time_series_chart_data(series_data)
%>

<div 
  data-controller="multi-time-series-chart"
  data-multi-time-series-chart-data-value="<%= chart_data.to_json %>"
  style="height: 400px;"
  class="w-full"
>
</div>
```

## Configuration Options

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-value` | Object | `{}` | The chart data containing series array |
| `stroke-width-value` | Number | `2` | Width of the line strokes |
| `use-labels-value` | Boolean | `true` | Show/hide axis labels |
| `use-tooltip-value` | Boolean | `true` | Enable/disable tooltips |
| `use-legend-value` | Boolean | `true` | Show/hide the legend |
| `colors-value` | Array | `["#3b82f6", "#ef4444", ...]` | Default color palette |

### Example with All Options

```html
<div 
  data-controller="multi-time-series-chart"
  data-multi-time-series-chart-data-value="<%= chart_data.to_json %>"
  data-multi-time-series-chart-stroke-width-value="3"
  data-multi-time-series-chart-use-labels-value="true"
  data-multi-time-series-chart-use-tooltip-value="true"
  data-multi-time-series-chart-use-legend-value="true"
  data-multi-time-series-chart-colors-value='["#22c55e", "#dc2626", "#f59e0b"]'
  style="height: 400px;"
>
</div>
```

## Data Structure

The chart expects data in the following format:

```javascript
{
  "series": [
    {
      "name": "Series Name",           // Required: Display name for the series
      "color": "#3b82f6",             // Optional: Hex color (uses default palette if omitted)
      "values": [                     // Required: Array of data points
        {
          "date": "2024-01-01",       // Required: Date in YYYY-MM-DD format
          "date_formatted": "Jan 1, 2024", // Optional: Formatted date for tooltips
          "value": 1000               // Required: Numeric value
        }
      ]
    }
  ]
}
```

## Rails Helper Methods

The included helper provides several convenient methods:

### `multi_time_series_chart_data(series_data)`
Converts Ruby data structures to the chart format.

### `account_balance_series(accounts, start_date, end_date)`
Creates series data from account balance records.

### `investment_performance_series(investments, start_date, end_date)`
Creates series data from investment valuation records.

## Styling

### Default Colors
The controller uses a predefined color palette:
- `#3b82f6` (Blue)
- `#ef4444` (Red) 
- `#10b981` (Green)
- `#f59e0b` (Yellow)
- `#8b5cf6` (Purple)
- `#ec4899` (Pink)

### Custom CSS

```css
/* Tooltip styling */
.chart-tooltip {
  font-family: system-ui, -apple-system, sans-serif;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Grid lines */
.grid-line {
  stroke-opacity: 0.3;
}

/* Legend interactions */
.legend-item:hover text {
  font-weight: 600;
}
```

## Interactive Features

### Tooltips
- **Multi-series tooltips**: Show values for all series at the hovered x-position
- **Color-coded**: Each series value is shown with its corresponding color
- **Date formatting**: Displays formatted dates and values

### Legend
- **Series identification**: Shows series name with color indicator
- **Positioned**: Automatically positioned in the top-right corner
- **Responsive**: Adjusts based on available space

### Data Points
- **Visual markers**: Small circles mark each data point
- **Color-coded**: Match the series colors
- **Hover effects**: Enhance visibility on interaction

## Performance Considerations

- **Responsive**: Uses ResizeObserver for efficient resize handling
- **Data filtering**: Automatically filters out invalid dates and empty series
- **Memory management**: Proper cleanup on disconnect
- **Debounced updates**: Efficient re-rendering on data changes

## Browser Support

- Modern browsers with D3.js support
- Requires ResizeObserver (polyfill may be needed for older browsers)
- SVG rendering support

## Examples

See the included demo files:
- `app/views/shared/_multi_time_series_chart_example.html.erb`
- `app/views/shared/_multi_time_series_chart_demo.html.erb`

These provide comprehensive examples of different use cases and configuration options.