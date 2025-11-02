import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = [
    "purchasePrice", "depreciableValue", "exitCapRate", "holdPeriod", "capRate", "noi", "rentBumpRate", "dscrBuffer",
    "depositPercentage", "interestRate", "loanTerm", "amortizationSchedule",
    "chartContainer", "projectionTableBody", "irrValue", 
    "monthlyIncomeDisplay", "monthlyPaymentDisplay", "dscrValue", "loanAmountDisplay", "depositAmountDisplay"
  ]

  connect() {
    this.updateIncomeCalculations();
    this.updateLoanCalculations();
    this.updateMetricsDisplay();
    this.updateChart();
  }

  // Helper method to calculate loan amount from purchase price and deposit percentage
  calculateLoanAmount() {
    const purchasePrice = parseFloat(this.purchasePriceTarget.value) || 500000;
    const depositPercentage = parseFloat(this.depositPercentageTarget.value) || 20.0;
    return purchasePrice * (1 - depositPercentage / 100.0);
  }

  // Helper method to calculate property value using linear interpolation between cap rates
  calculatePropertyValue(year, currentNOI, inputs) {
    // Linear interpolation of cap rate from current cap rate to exit cap rate
    const startCapRate = inputs.capRate / 100.0;
    const endCapRate = inputs.exitCapRate / 100.0;
    const interpolatedCapRate = startCapRate + (endCapRate - startCapRate) * (year / inputs.holdPeriod);
    
    // Property value = NOI / Cap Rate
    return currentNOI / interpolatedCapRate;
  }

  // Update the metrics display box (monthly income, monthly payment, DSCR)
  updateMetricsDisplay() {
    // Get current values directly from inputs or calculate them
    const noi = parseFloat(this.noiTarget.value) || 0;
    const monthlyIncome = noi / 12;
    
    // Calculate monthly payment using the same logic as updateLoanCalculations
    const loanAmount = this.calculateLoanAmount();
    const interestRate = parseFloat(this.interestRateTarget.value) || 0;
    const amortizationSchedule = parseFloat(this.amortizationScheduleTarget.value) || 25;
    let monthlyPayment = 0;
    
    if (loanAmount > 0 && interestRate >= 0) {
      monthlyPayment = this.calculatePMT(interestRate / 100.0, amortizationSchedule * 12, loanAmount);
    }
    
    // Update monthly income display
    if (this.hasMonthlyIncomeDisplayTarget) {
      this.monthlyIncomeDisplayTarget.textContent = `$${Math.round(monthlyIncome).toLocaleString()}`;
    }
    
    // Update monthly payment display
    if (this.hasMonthlyPaymentDisplayTarget) {
      this.monthlyPaymentDisplayTarget.textContent = `$${Math.round(monthlyPayment).toLocaleString()}`;
    }
    
    // Calculate and update DSCR (Debt Service Coverage Ratio) with buffer
    if (this.hasDscrValueTarget) {
      const dscrBuffer = parseFloat(this.dscrBufferTarget.value) || 0;
      const adjustedMonthlyIncome = monthlyIncome * (1.0 - dscrBuffer / 100.0);
      const dscr = monthlyPayment > 0 ? (adjustedMonthlyIncome / monthlyPayment) : 0;
      this.dscrValueTarget.textContent = dscr > 0 ? dscr.toFixed(2) : "N/A";
      
      // Color code DSCR (green if >= 1.25, yellow if >= 1.0, red if < 1.0)
      this.dscrValueTarget.className = this.dscrValueTarget.className.replace(/text-(green|yellow|red|blue)-600/g, '');
      if (dscr >= 1.25) {
        this.dscrValueTarget.classList.add('text-green-600');
      } else if (dscr >= 1.0) {
        this.dscrValueTarget.classList.add('text-yellow-600');
      } else if (dscr > 0) {
        this.dscrValueTarget.classList.add('text-red-600');
      } else {
        this.dscrValueTarget.classList.add('text-blue-600'); // Default color for N/A
      }
    }
    
    // Update loan amount display
    if (this.hasLoanAmountDisplayTarget) {
      this.loanAmountDisplayTarget.textContent = `$${Math.round(loanAmount).toLocaleString()}`;
    }
    
    // Update deposit amount display
    if (this.hasDepositAmountDisplayTarget) {
      const purchasePrice = parseFloat(this.purchasePriceTarget.value) || 500000;
      const depositAmount = purchasePrice - loanAmount;
      this.depositAmountDisplayTarget.textContent = `$${Math.round(depositAmount).toLocaleString()}`;
    }
  }

  // Handle purchase price changes - update income, keep deposit percentage and cap rate
  onPurchasePriceChange() {
    
    // Update income calculations (keep cap rate, adjust NOI)
    this.updateIncomeCalculations();
    this.updateLoanCalculations();
    this.updateChart();
  }

  // Handle deposit percentage changes, keep purchase price
  onDepositPercentageChange() {
    this.updateLoanCalculations();
    this.updateChart();
  }

  // Handle cap rate changes - update NOI, keep purchase price
  onCapRateChange() {
    this.updateIncomeCalculations();
    this.updateChart();
  }

  // Handle NOI changes - update cap rate, keep purchase price
  onNOIChange() {
    const purchasePrice = parseFloat(this.purchasePriceTarget.value) || 500000;
    const noi = Math.max(0, parseFloat(this.noiTarget.value) || 0);
    
    // Calculate new cap rate: Cap Rate = NOI / Purchase Price * 100
    // Handle edge case where purchase price is 0
    const newCapRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
    this.capRateTarget.value = Math.max(0, newCapRate.toFixed(2));
    
    this.updateMetricsDisplay();
    this.updateChart();
  }

  // Update income calculations (NOI and monthly income based on cap rate)
  updateIncomeCalculations() {
    const purchasePrice = parseFloat(this.purchasePriceTarget.value) || 500000;
    const capRate = Math.max(0, parseFloat(this.capRateTarget.value) || 0);
    
    // Handle edge case: 0% cap rate
    if (capRate === 0) {
      this.noiTarget.value = 0;
      this.updateMetricsDisplay();
      return;
    }
    
    // Calculate NOI: NOI = Purchase Price * Cap Rate / 100
    const newNOI = purchasePrice * (capRate / 100.0);
    this.noiTarget.value = Math.round(Math.max(0, newNOI));
    
    this.updateMetricsDisplay();
  }

  // Update loan calculations (repayment amount)
  updateLoanCalculations() {
    // Just trigger metrics display update since we calculate payment there now
    this.updateMetricsDisplay();
  }

  // Calculate PMT (equivalent to Excel PMT function)
  calculatePMT(annualRate, numberOfPayments, loanAmount) {
    // Handle edge case: no loan amount
    if (loanAmount <= 0) {
      return 0;
    }
    
    const monthlyRate = annualRate / 12.0;
    
    // Handle edge case: 0% interest rate
    if (monthlyRate === 0 || annualRate === 0) {
      return loanAmount / numberOfPayments;
    }
    
    const factor = Math.pow(1 + monthlyRate, numberOfPayments);
    const payment = loanAmount * (monthlyRate * factor) / (factor - 1);
    
    // Ensure we return a valid number
    return isNaN(payment) || !isFinite(payment) ? 0 : payment;
  }

  // Calculate FV (Future Value) - equivalent to Excel FV function
  // FV(rate, nper, pmt, pv, type) where type=0 (payment at end of period)
  calculateFV(rate, nper, pmt, pv) {
    // Handle edge case: 0% interest rate
    if (rate === 0) {
      return -1 * (pv + (pmt * nper));
    }
    
    const factor = Math.pow(1 + rate, nper);
    const fv = -1 * (pv * factor + pmt * ((factor - 1) / rate));
    
    return isNaN(fv) || !isFinite(fv) ? 0 : fv;
  }

  // Calculate interest paid for a year range using the exact formula provided
  // Equivalent to the Ruby ipmt_range function
  calculateIPMTRange(rate, nper, pv, startPeriod, endPeriod) {
    if (startPeriod < 1 || endPeriod > nper || startPeriod > endPeriod) {
      throw new Error("Invalid period range");
    }

    let totalInterest = 0.0;
    let balance = pv;
    const pmt = this.calculatePMT(rate, nper, pv);

    for (let period = 1; period <= nper; period++) {
      const interest = balance * rate;
      const principal = pmt - interest;
      balance += principal;

      if (period >= startPeriod && period <= endPeriod) {
        totalInterest += interest;
      }
    }

    return Math.round(totalInterest * 100) / 100;
  }

  // Calculate IRR (Internal Rate of Return) using Newton-Raphson method
  calculateIRR(cashFlows, guess = 0.1) {
    const maxIterations = 1000;
    const tolerance = 1e-6;
    let rate = guess;

    for (let i = 0; i < maxIterations; i++) {
      // Calculate NPV and its derivative
      let npv = 0.0;
      let dNpv = 0.0;

      cashFlows.forEach((cf, t) => {
        npv += cf / Math.pow(1 + rate, t);
        dNpv -= t * cf / Math.pow(1 + rate, t + 1);
      });

      // Newton-Raphson update
      const newRate = rate - npv / dNpv;

      // Check for convergence
      if (Math.abs(newRate - rate) < tolerance) {
        return (newRate * 100); // Return as percentage
      }

      rate = newRate;
    }

    throw new Error("IRR did not converge");
  }

  updateChart() {
    // Update metrics display first
    this.updateMetricsDisplay();
    
    // Get all input values with defaults
    const loanAmount = this.calculateLoanAmount();
    const interestRate = parseFloat(this.interestRateTarget.value) || 6.5;
    const loanTerm = parseFloat(this.loanTermTarget.value) || 15;
    const amortizationSchedule = parseFloat(this.amortizationScheduleTarget.value) || 25;
    const repaymentAmount = loanAmount > 0 ? this.calculatePMT(interestRate / 100.0, amortizationSchedule * 12, loanAmount) : 0;
    
    const inputs = {
      purchasePrice: parseFloat(this.purchasePriceTarget.value) || 500000,
      depreciableValue: parseFloat(this.depreciableValueTarget.value) || 400000,
      exitCapRate: parseFloat(this.exitCapRateTarget.value) || 6.0,
      holdPeriod: parseFloat(this.holdPeriodTarget.value) || 15,
      capRate: parseFloat(this.capRateTarget.value) || 5.0,
      noi: parseFloat(this.noiTarget.value) || 25000,
      rentBumpRate: parseFloat(this.rentBumpRateTarget.value) || 2.5,
      depositPercentage: parseFloat(this.depositPercentageTarget.value) || 20.0,
      interestRate: interestRate,
      loanTerm: loanTerm,
      amortizationSchedule: amortizationSchedule,
      loanAmount: loanAmount,
      repaymentAmount: repaymentAmount
    };

    // Generate new forecast data
    const seriesData = this.generateForecastSeries(inputs);
    
    // Find the existing chart controller and update its data
    const chartElement = this.chartContainerTarget.querySelector("[data-controller='time-series-chart']");
    if (chartElement) {
      // Update the data attribute
      chartElement.setAttribute("data-time-series-chart-data-value", JSON.stringify(seriesData));
      
      // Get the Stimulus controller instance and refresh the chart
      const chartController = this.application.getControllerForElementAndIdentifier(chartElement, "time-series-chart");
      if (chartController) {
        chartController.dataValue = seriesData;
        chartController._reinstall();
      }
    }

    // Update the projection table
    this.updateProjectionTable();
  }

  generateForecastSeries(inputs) {
    // Generate net equity projection for the hold period (single series for chart compatibility)
    const dataPoints = [];
    const currentDate = new Date();
    
    // Calculate initial values
    let currentNOI = inputs.noi;
    let remainingLoan = inputs.loanAmount;
    
    for (let year = 0; year <= inputs.holdPeriod; year++) {
      const date = new Date(currentDate.getFullYear() + year, currentDate.getMonth(), currentDate.getDate());
      
      if (year > 0) {
        // Apply NOI growth for rent increases (starting from year 2)
        if (year > 1) {
          const rentGrowthRate = inputs.rentBumpRate / 100.0;
          currentNOI *= (1 + rentGrowthRate);
        }
        
        // Calculate mortgage remaining using FV formula
        const monthlyRate = (inputs.interestRate * 0.01) / 12;
        const monthsElapsed = year * 12;
        const monthlyPayment = inputs.repaymentAmount;
        remainingLoan = Math.max(0, this.calculateFV(monthlyRate, monthsElapsed, monthlyPayment, -1 * inputs.loanAmount));
      }
      
      // Calculate property value using cap rate interpolation and current NOI
      const currentPropertyValue = this.calculatePropertyValue(year, currentNOI, inputs);
      
      // Calculate net equity (93% of property value - remaining loan)
      const equity = (0.93 * currentPropertyValue) - remainingLoan;
      
      dataPoints.push({
        date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        date_formatted: date.toLocaleDateString(),
        value: Math.round(equity),
        trend: {
          direction: year > 0 ? "up" : "flat",
          color: "var(--color-blue-500)",
          current: { amount: Math.round(equity) },
          previous: { amount: year > 0 && dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].value : Math.round(equity) },
          value: year > 0 && dataPoints.length > 0 ? Math.round(equity - dataPoints[dataPoints.length - 1].value) : 0,
          percent_formatted: year > 0 && dataPoints.length > 0 ? 
            `+${((equity - dataPoints[dataPoints.length - 1].value) / dataPoints[dataPoints.length - 1].value * 100).toFixed(1)}%` : 
            "0.0%"
        }
      });
    }

    return {
      trend: {
        direction: "up",
        color: "var(--color-blue-500)"
      },
      values: dataPoints
    };
  }

  updateProjectionTable() {
    if (!this.hasProjectionTableBodyTarget) {
      return;
    }

    const loanAmount = this.calculateLoanAmount();
    const interestRate = parseFloat(this.interestRateTarget.value) || 6.5;
    const loanTerm = parseFloat(this.loanTermTarget.value) || 15;
    const amortizationSchedule = parseFloat(this.amortizationScheduleTarget.value) || 25;
    const repaymentAmount = loanAmount > 0 ? this.calculatePMT(interestRate / 100.0, amortizationSchedule * 12, loanAmount) : 0;
    
    const inputs = {
      purchasePrice: parseFloat(this.purchasePriceTarget.value) || 500000,
      depreciableValue: parseFloat(this.depreciableValueTarget.value) || 400000,
      exitCapRate: parseFloat(this.exitCapRateTarget.value) || 6.0,
      holdPeriod: parseFloat(this.holdPeriodTarget.value) || 15,
      capRate: parseFloat(this.capRateTarget.value) || 5.0,
      noi: parseFloat(this.noiTarget.value) || 25000,
      rentBumpRate: parseFloat(this.rentBumpRateTarget.value) || 2.5,
      loanAmount: loanAmount,
      repaymentAmount: repaymentAmount,
      interestRate: interestRate,
      loanTerm: loanTerm,
      amortizationSchedule: amortizationSchedule
    };

    this.projectionTableBodyTarget.innerHTML = '';

    let currentNOI = inputs.noi;
    const cashFlows = []; // Track cash flows for IRR calculation

    for (let year = 1; year <= inputs.holdPeriod; year++) {
      // Apply rent increases at the END of each year (starting from year 2)
      const rentGrowthRate = inputs.rentBumpRate / 100.0;
      if (year > 1) {
        currentNOI *= (1 + rentGrowthRate);
      }
      
      // Calculate property value using cap rate interpolation and current NOI
      const currentAssetValue = this.calculatePropertyValue(year, currentNOI, inputs);
      
      // Calculate mortgage remaining using FV formula
      // FV(monthly_rate, months_elapsed, monthly_payment, -initial_loan)
      const monthlyRate = (inputs.interestRate * 0.01) / 12;
      const monthsElapsed = Math.min(year * 12, inputs.loanTerm * 12); // Cap at loan term
      const monthlyPayment = inputs.repaymentAmount;
      const remainingLoan = year > inputs.loanTerm ? 0 : Math.max(0, this.calculateFV(monthlyRate, monthsElapsed, monthlyPayment, -1 * inputs.loanAmount));
      
      const annualRepayment = year <= inputs.loanTerm ? inputs.repaymentAmount * 12 : 0;
      
      // Calculate cash flow - subtract deposit in year 1, balloon payment at loan term, sale proceeds in year 15
      let cashFlow = currentNOI - annualRepayment;
      if (year === 1) {
        const depositAmount = inputs.purchasePrice - inputs.loanAmount;
        cashFlow -= depositAmount;
      } else if (year === inputs.loanTerm) {
        // Balloon payment at loan term
        cashFlow -= remainingLoan;
      } 
      
      if (year === inputs.holdPeriod) {
        // Add sale proceeds at end of hold period: 93% of asset value minus remaining mortgage (or 0 if loan already paid off)
        const finalLoanBalance = year > inputs.loanTerm ? 0 : remainingLoan;
        const saleProceeds = (0.93 * currentAssetValue) - finalLoanBalance;
        cashFlow += saleProceeds;
      }

      // Calculate Net Equity (Asset Value - Mortgage Remaining)
      const netEquity = currentAssetValue - remainingLoan;
      
      // Calculate Profit (NOI - Interest Payment for this year)
      const totalPayments = inputs.amortizationSchedule * 12; // Use amortization schedule for interest calculation
      const startPeriod = (year - 1) * 12 + 1; // First month of this year
      const endPeriod = year * 12; // Last month of this year
      const interestPayment = (inputs.loanAmount > 0 && year <= inputs.loanTerm) ? 
        this.calculateIPMTRange(monthlyRate, totalPayments, inputs.loanAmount, startPeriod, endPeriod) : 0;
      const profit = currentNOI - interestPayment;
      
      // Calculate After-Tax Cash Flow using new formula
      const depreciation = inputs.depreciableValue / 39;
      const taxableIncome = profit - depreciation;
      const tax = taxableIncome > 0 ? taxableIncome * 0.28 : 0; // 72% tax rate on positive taxable income
      const afterTaxCashFlow = cashFlow - tax;

      // Store cash flow for IRR calculation
      cashFlows.push(cashFlow);

      const row = document.createElement('tr');
      row.className = 'border-b border-gray-100 hover:bg-gray-50';
      
      row.innerHTML = `
        <td class="py-3 px-2 font-medium text-primary">${year}</td>
        <td class="py-3 px-2 text-right text-primary">$${Math.round(currentAssetValue).toLocaleString()}</td>
        <td class="py-3 px-2 text-right text-primary">$${Math.round(remainingLoan).toLocaleString()}</td>
        <td class="py-3 px-2 text-right text-primary">$${Math.round(netEquity).toLocaleString()}</td>
        <td class="py-3 px-2 text-right text-primary">$${Math.round(currentNOI).toLocaleString()}</td>
        <td class="py-3 px-2 text-right text-orange-600">$${Math.round(interestPayment).toLocaleString()}</td>
        <td class="py-3 px-2 text-right ${profit >= 0 ? 'text-green-600' : 'text-red-600'}">$${Math.round(profit).toLocaleString()}</td>
        <td class="py-3 px-2 text-right ${cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}">$${Math.round(cashFlow).toLocaleString()}</td>
        <td class="py-3 px-2 text-right ${afterTaxCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}">$${Math.round(afterTaxCashFlow).toLocaleString()}</td>
      `;
      
      this.projectionTableBodyTarget.appendChild(row);
    }

    // Calculate and display IRR
    try {
      const irr = this.calculateIRR(cashFlows);
      if (this.hasIrrValueTarget) {
        this.irrValueTarget.textContent = `${irr.toFixed(2)}%`;
      }
    } catch (error) {
      if (this.hasIrrValueTarget) {
        this.irrValueTarget.textContent = 'N/A';
      }
    }

    console.log(`Added ${this.projectionTableBodyTarget.children.length} rows to table`);
  }
}