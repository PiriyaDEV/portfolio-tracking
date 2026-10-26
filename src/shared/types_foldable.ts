export interface CalculatorCompanionContext {
  selectedSymbol: string;
  activeTab: "calculator" | "estimate" | "dividend" | "predict";
  result: {
    quantity: number;
    costPerShare: number;
    totalCost: number;
    marketValueBase: number;
    marketValueThb: number;
    profit: number;
    profitPercent: number;
    estimateCost?: number;
  } | null;
}
