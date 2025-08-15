// Test if our import works
try {
  const { analyzeTokenReasons } = require('./src/lib/tokenReasonAnalyzer.ts');
  console.log('Import successful');
} catch (error) {
  console.error('Import failed:', error.message);
}