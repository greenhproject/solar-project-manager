import { calculateTeamVelocity, calculateProjectTypeMetrics, predictProjectCompletion, calculateDashboardStats } from './server/metricsCalculator.ts';

async function testMetrics() {
  console.log('=== Testing Metrics Functions ===\n');
  
  try {
    console.log('1. Testing Team Velocity...');
    const velocity = await calculateTeamVelocity();
    console.log(`✅ Team Velocity: ${velocity.length} months of data`);
    console.log(JSON.stringify(velocity, null, 2));
    
    console.log('\n2. Testing Project Type Metrics...');
    const typeMetrics = await calculateProjectTypeMetrics();
    console.log(`✅ Type Metrics: ${typeMetrics.length} project types`);
    console.log(JSON.stringify(typeMetrics, null, 2));
    
    console.log('\n3. Testing Predictions...');
    const predictions = await predictProjectCompletion();
    console.log(`✅ Predictions: ${predictions.length} active projects`);
    console.log(JSON.stringify(predictions, null, 2));
    
    console.log('\n4. Testing Dashboard Stats...');
    const stats = await calculateDashboardStats();
    console.log(`✅ Dashboard Stats:`);
    console.log(JSON.stringify(stats, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testMetrics();
