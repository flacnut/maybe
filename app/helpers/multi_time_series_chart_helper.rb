# Multi-time series chart helper for generating chart data
module MultiTimeSeriesChartHelper
  # Helper method to generate multi-time series chart data
  #
  # @param series_data [Array<Hash>] Array of series data
  #   Each hash should contain:
  #   - name: String name for the series
  #   - color: Optional hex color (will use default palette if not provided)
  #   - data: Array of hashes with :date, :value, and optional :date_formatted
  # @param options [Hash] Chart configuration options
  # @return [Hash] Formatted data for the chart controller
  #
  # Example usage:
  #   chart_data = multi_time_series_chart_data([
  #     {
  #       name: "Account Balance",
  #       color: "#3b82f6",
  #       data: [
  #         { date: Date.parse("2024-01-01"), value: 10000 },
  #         { date: Date.parse("2024-02-01"), value: 12000 }
  #       ]
  #     },
  #     {
  #       name: "Investment Value",
  #       color: "#ef4444",
  #       data: [
  #         { date: Date.parse("2024-01-01"), value: 5000 },
  #         { date: Date.parse("2024-02-01"), value: 5500 }
  #       ]
  #     }
  #   ])
  def multi_time_series_chart_data(series_data, options = {})
    formatted_series = series_data.map do |series|
      {
        name: series[:name],
        color: series[:color], # Can be nil, controller will use default colors
        values: series[:data].map do |point|
          {
            date: format_chart_date(point[:date]),
            date_formatted: point[:date_formatted] || format_display_date(point[:date]),
            value: point[:value]
          }
        end
      }
    end

    {
      series: formatted_series
    }
  end

  # Helper for account balance series
  def account_balance_series(accounts, start_date, end_date)
    accounts.map do |account|
      balances = account.balances
        .where(date: start_date..end_date)
        .order(:date)
        .pluck(:date, :balance)

      {
        name: account.name,
        color: account_color(account), # You might have a method for account colors
        data: balances.map do |date, balance|
          {
            date: date,
            value: balance.to_f
          }
        end
      }
    end
  end

  # Helper for investment performance series
  def investment_performance_series(investments, start_date, end_date)
    investments.map do |investment|
      values = investment.valuations
        .where(date: start_date..end_date)
        .order(:date)
        .pluck(:date, :value)

      {
        name: investment.name,
        data: values.map do |date, value|
          {
            date: date,
            value: value.to_f
          }
        end
      }
    end
  end

  private

    # Format date for chart (YYYY-MM-DD string format expected by D3)
    def format_chart_date(date)
      case date
      when Date, DateTime, Time
        date.strftime("%Y-%m-%d")
      when String
        Date.parse(date).strftime("%Y-%m-%d")
      else
        date.to_s
      end
    rescue
      date.to_s
    end

    # Format date for display in tooltips
    def format_display_date(date)
      case date
      when Date, DateTime, Time
        date.strftime("%b %d, %Y")
      when String
        Date.parse(date).strftime("%b %d, %Y")
      else
        date.to_s
      end
    rescue
      date.to_s
    end

    # Default account color (you might want to customize this)
    def account_color(account)
      colors = [ "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899" ]
      colors[account.id % colors.length]
    end
end
