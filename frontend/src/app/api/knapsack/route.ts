import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weightLimit = parseInt(searchParams.get("limit") || "20");

  const packages = [
    { name: "Medical Supplies", weight: 5, value: 50 },
    { name: "Electronics", weight: 8, value: 80 },
    { name: "Office Chairs", weight: 12, value: 60 },
    { name: "Luxury Goods", weight: 3, value: 100 },
    { name: "Food Rations", weight: 7, value: 40 },
  ];

  const n = packages.length;
  // Initialize DP Matrix
  const dp = Array.from({ length: n + 1 }, () => new Array(weightLimit + 1).fill(0));

  // Build the DP Table (Bottom-Up)
  for (let i = 1; i <= n; i++) {
    for (let w = 1; w <= weightLimit; w++) {
      if (packages[i - 1].weight <= w) {
        dp[i][w] = Math.max(
          dp[i - 1][w],
          packages[i - 1].value + dp[i - 1][w - packages[i - 1].weight]
        );
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  // Traceback to find loaded items
  let maxProfit = dp[n][weightLimit];
  let w = weightLimit;
  const loaded = [];

  for (let i = n; i > 0 && maxProfit > 0; i--) {
    if (maxProfit !== dp[i - 1][w]) {
      loaded.push(packages[i - 1]);
      maxProfit -= packages[i - 1].value;
      w -= packages[i - 1].weight;
    }
  }

  return NextResponse.json({
    status: "success",
    maxRevenue: dp[n][weightLimit],
    inventory: packages,
    matrix: dp,
    loaded,
  });
}
