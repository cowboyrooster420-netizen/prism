// Test if Next.js can start without our unified services
const { spawn } = require('child_process');

console.log('🔍 Testing minimal Next.js startup...');

// Start Next.js with minimal output
const nextProcess = spawn('npm', ['run', 'dev'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development' }
});

let output = '';
let hasStarted = false;

nextProcess.stdout.on('data', (data) => {
  output += data.toString();
  console.log(data.toString());
  
  if (data.toString().includes('Ready in')) {
    hasStarted = true;
    console.log('✅ Server started successfully');
    
    // Test if we can fetch the page
    setTimeout(() => {
      const https = require('http');
      const req = https.request('http://localhost:3000', (res) => {
        console.log('📄 Page response status:', res.statusCode);
        if (res.statusCode === 200) {
          console.log('✅ Page loads successfully');
        } else {
          console.log('❌ Page failed to load');
        }
        process.exit(0);
      });
      
      req.on('error', (err) => {
        console.log('❌ Connection error:', err.message);
        process.exit(1);
      });
      
      req.setTimeout(5000, () => {
        console.log('❌ Request timeout');
        process.exit(1);
      });
      
      req.end();
    }, 2000);
  }
});

nextProcess.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

nextProcess.on('close', (code) => {
  if (!hasStarted) {
    console.log('❌ Server failed to start, exit code:', code);
  }
});

// Kill process after 30 seconds if not ready
setTimeout(() => {
  if (!hasStarted) {
    console.log('❌ Server startup timeout');
    nextProcess.kill();
    process.exit(1);
  }
}, 30000);