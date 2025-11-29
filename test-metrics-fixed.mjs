import {
  getCompletionRate,
  getAverageCompletionTime,
  getMonthlyMetrics,
  getProjectDistributionByType,
} from "./server/db.ts";

async function testMetrics() {
  console.log("\n=== Testing Completion Rate ===");
  const completionRate = await getCompletionRate();
  console.log("Result:", completionRate);

  console.log("\n=== Testing Average Time ===");
  const avgTime = await getAverageCompletionTime();
  console.log("Result:", avgTime);

  console.log("\n=== Testing Monthly Metrics ===");
  const monthly = await getMonthlyMetrics(12);
  console.log("Result:", monthly);

  console.log("\n=== Testing Distribution ===");
  const distribution = await getProjectDistributionByType();
  console.log("Result:", distribution);
}

testMetrics().catch(console.error);
