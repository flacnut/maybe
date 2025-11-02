class Forecasts::RealEstateChart < ApplicationComponent
  attr_reader :purchase_price, :depreciable_value, :exit_cap_rate, :hold_period, :cap_rate, :noi, :rent_bump_rate, :dscr_buffer, :deposit_percentage, :interest_rate, :loan_term, :amortization_schedule, :loan_amount, :repayment_amount, :reinvest_cashflows, :adjust_for_inflation, :inflation_rate

  def initialize(
    purchase_price: 500000,
    depreciable_value: 400000,
    exit_cap_rate: 6.0,
    hold_period: 15,
    cap_rate: 5.0,
    noi: 25000,
    rent_bump_rate: 2.5,
    dscr_buffer: 10.0,
    deposit_percentage: 20.0,
    interest_rate: 6.5,
    loan_term: 15,
    amortization_schedule: 25,
    loan_amount: 400000,
    repayment_amount: 2000,
    reinvest_cashflows: false,
    adjust_for_inflation: false,
    inflation_rate: 3.0
  )
    @purchase_price = purchase_price.to_f
    @depreciable_value = depreciable_value.to_f
    @exit_cap_rate = exit_cap_rate.to_f
    @hold_period = hold_period.to_f
    @cap_rate = cap_rate.to_f
    @noi = noi.to_f
    @rent_bump_rate = rent_bump_rate.to_f
    @dscr_buffer = dscr_buffer.to_f
    @deposit_percentage = deposit_percentage.to_f
    @interest_rate = interest_rate.to_f
    @loan_term = loan_term.to_f
    @amortization_schedule = amortization_schedule.to_f
    @loan_amount = loan_amount.to_f
    @repayment_amount = repayment_amount.to_f
    @reinvest_cashflows = reinvest_cashflows
    @adjust_for_inflation = adjust_for_inflation
    @inflation_rate = inflation_rate.to_f
  end

  private

    def chart_id
      "real-estate-forecast-chart"
    end

    def series_data
      generate_forecast_series
    end

    def generate_forecast_series
      # Generate 15 years of net equity projection
      data_points = []

      current_property_value = purchase_price
      remaining_loan = loan_amount

      (0..15).each do |year|
        date = Date.current + year.years

        if year > 0
          # Recalculate property value from NOI using an interpolated cap rate over the hold period.
          # cap_rate and exit_cap_rate are percentages (e.g. 5.0 for 5%).
          hold = hold_period.zero? ? 1.0 : hold_period.to_f
          progression = year.to_f / hold

          # Interpolate cap rate between current cap_rate and exit_cap_rate
          interpolated_cap = (progression * (exit_cap_rate - cap_rate)) + cap_rate

          # Convert percentage to decimal and guard against zero/negative caps
          cap_decimal = interpolated_cap.to_f / 100.0
          cap_decimal = 0.0001 if cap_decimal <= 0.0

          current_property_value = noi.to_f / cap_decimal

          # Calculate mortgage remaining using simplified formula for initial display
          annual_repayment = repayment_amount * 12
          remaining_loan = [ 0, remaining_loan - annual_repayment ].max
        end

        # Calculate net equity (93% of property value - remaining loan)
        equity = (0.93 * current_property_value) - remaining_loan

        data_points << {
          date: date,
          value: equity.round(0)
        }
      end

      Series.from_raw_values(data_points, interval: "1 year")
    end
end
