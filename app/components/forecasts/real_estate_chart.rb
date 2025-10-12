class Forecasts::RealEstateChart < ApplicationComponent
  attr_reader :purchase_price, :depreciable_value, :growth_rate, :cap_rate, :noi, :rent_bump_rate, :deposit_percentage, :interest_rate, :loan_amount, :repayment_amount

  def initialize(
    purchase_price: 500000,
    depreciable_value: 400000,
    growth_rate: 3.0,
    cap_rate: 5.0,
    noi: 25000,
    rent_bump_rate: 2.5,
    deposit_percentage: 20.0,
    interest_rate: 6.5,
    loan_amount: 400000,
    repayment_amount: 2000
  )
    @purchase_price = purchase_price.to_f
    @depreciable_value = depreciable_value.to_f
    @growth_rate = growth_rate.to_f
    @cap_rate = cap_rate.to_f
    @noi = noi.to_f
    @rent_bump_rate = rent_bump_rate.to_f
    @deposit_percentage = deposit_percentage.to_f
    @interest_rate = interest_rate.to_f
    @loan_amount = loan_amount.to_f
    @repayment_amount = repayment_amount.to_f
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
          # Apply property appreciation
          appreciation_rate = growth_rate / 100.0
          current_property_value *= (1 + appreciation_rate)
          
          # Calculate mortgage remaining using simplified formula for initial display
          annual_repayment = repayment_amount * 12
          remaining_loan = [0, remaining_loan - annual_repayment].max
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
