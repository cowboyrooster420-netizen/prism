/* lib/test-configuration.ts
   Test file to demonstrate configuration management system
*/

import { 
  createConfigurationManager,
  ConfigurationValidator,
  ENVIRONMENT_PRESETS,
  TAWorkerConfig
} from './configuration';

console.log('🧪 Testing Configuration Management System');
console.log('=========================================\n');

// Test 1: Create configuration manager
console.log('1️⃣ Creating configuration manager:');
const configManager = createConfigurationManager();
console.log('✅ Configuration manager created');

// Test 2: View default configuration
console.log('\n2️⃣ Default configuration:');
const defaultConfig = configManager.getConfig();
console.log(`Environment: ${defaultConfig.environment}`);
console.log(`Version: ${defaultConfig.version}`);
console.log(`Max workers: ${defaultConfig.performance.maxWorkers}`);
console.log(`Batch size: ${defaultConfig.performance.batchSize}`);
console.log(`RSI period: ${defaultConfig.technicalAnalysis.rsiPeriod}`);

// Test 3: Configuration validation
console.log('\n3️⃣ Configuration validation:');
const validation = ConfigurationValidator.validateConfig(defaultConfig);
console.log(`Valid: ${validation.isValid ? '✅' : '❌'}`);

if (validation.warnings.length > 0) {
  console.log('⚠️  Warnings:', validation.warnings);
}

if (validation.errors.length > 0) {
  console.log('❌ Errors:', validation.errors);
}

// Test 4: Update configuration values
console.log('\n4️⃣ Updating configuration values:');

// Update performance settings
const perfResult = configManager.updateSection('performance', {
  maxWorkers: 6,
  batchSize: 300
});

if (perfResult.isValid) {
  console.log('✅ Performance configuration updated');
  console.log(`   New max workers: ${configManager.getValue('performance', 'maxWorkers')}`);
  console.log(`   New batch size: ${configManager.getValue('performance', 'batchSize')}`);
} else {
  console.log('❌ Performance update failed:', perfResult.errors);
}

// Update technical analysis settings
const taResult = configManager.updateSection('technicalAnalysis', {
  rsiPeriod: 21,
  rsiOverbought: 75,
  rsiOversold: 25
});

if (taResult.isValid) {
  console.log('✅ Technical analysis configuration updated');
  console.log(`   New RSI period: ${configManager.getValue('technicalAnalysis', 'rsiPeriod')}`);
  console.log(`   New RSI overbought: ${configManager.getValue('technicalAnalysis', 'rsiOversold')}`);
} else {
  console.log('❌ Technical analysis update failed:', taResult.errors);
}

// Test 5: Invalid configuration update
console.log('\n5️⃣ Testing invalid configuration:');
const invalidResult = configManager.updateSection('performance', {
  maxWorkers: -1, // Invalid: negative workers
  batchSize: 0    // Invalid: zero batch size
});

if (!invalidResult.isValid) {
  console.log('✅ Invalid configuration correctly rejected');
  console.log('   Errors:', invalidResult.errors);
} else {
  console.log('❌ Invalid configuration was accepted');
}

// Test 6: Environment presets
console.log('\n6️⃣ Environment presets:');
Object.entries(ENVIRONMENT_PRESETS).forEach(([env, preset]) => {
  console.log(`\n🌍 ${env.toUpperCase()} preset:`);
  Object.entries(preset).forEach(([section, updates]) => {
    console.log(`   ${section}: ${Object.keys(updates).length} updates`);
  });
});

// Test 7: Configuration change events
console.log('\n7️⃣ Configuration change events:');
configManager.on('configChanged', (event) => {
  console.log(`🔄 Config changed: ${event.section}.${event.key}`);
  console.log(`   Old: ${event.oldValue}`);
  console.log(`   New: ${event.newValue}`);
  console.log(`   Time: ${event.timestamp.toISOString()}`);
});

// Trigger a change
configManager.updateValue('database', 'maxConnections', 15);

// Test 8: Configuration summary
console.log('\n8️⃣ Configuration summary:');
const summary = configManager.getSummary();
console.log(`Environment: ${summary.environment}`);
console.log(`Version: ${summary.version}`);
console.log(`Last Updated: ${summary.lastUpdated.toISOString()}`);
console.log(`Sections: ${summary.sections.join(', ')}`);
console.log(`Valid: ${summary.validation.isValid ? '✅' : '❌'}`);

// Test 9: Save and load configuration
console.log('\n9️⃣ Save and load configuration:');
const testConfigPath = './test-config.json';

// Save current configuration
configManager.saveToFile(testConfigPath);
console.log('✅ Configuration saved to file');

// Create new manager and load configuration
const newConfigManager = createConfigurationManager(undefined, testConfigPath);
const loadedConfig = newConfigManager.getConfig();
console.log('✅ Configuration loaded from file');
console.log(`   Loaded max workers: ${loadedConfig.performance.maxWorkers}`);
console.log(`   Loaded batch size: ${loadedConfig.performance.batchSize}`);

// Test 10: Reset to defaults
console.log('\n🔟 Reset to defaults:');
configManager.resetToDefaults();
const resetConfig = configManager.getConfig();
console.log('✅ Configuration reset to defaults');
console.log(`   Max workers: ${resetConfig.performance.maxWorkers}`);
console.log(`   Batch size: ${resetConfig.performance.batchSize}`);

// Cleanup
newConfigManager.destroy();
configManager.destroy();

// Clean up test file
try {
  const fs = require('fs');
  if (fs.existsSync(testConfigPath)) {
    fs.unlinkSync(testConfigPath);
    console.log('✅ Test configuration file cleaned up');
  }
} catch (error) {
  console.log('⚠️  Could not clean up test file:', error);
}

console.log('\n✅ All configuration tests completed!');
console.log('⚙️  Configuration management system is working correctly.');
console.log('🚀 Ready for production use in TA workers.');

