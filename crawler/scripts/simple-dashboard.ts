/* scripts/simple-dashboard.ts
   Simple working monitoring dashboard
*/

import * as readline from 'readline';
import * as os from 'os';

class SimpleDashboard {
  private rl: readline.Interface;
  private isRunning = false;
  private refreshInterval?: NodeJS.Timeout;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.clear();
    console.log('🚀 Simple TA Worker Monitoring Dashboard');
    console.log('==========================================');
    console.log('Press Ctrl+C to exit\n');

    this.setupEventHandlers();
    await this.showMainMenu();
  }

  private setupEventHandlers(): void {
    process.on('SIGINT', () => {
      console.log('\n\nShutting down dashboard...');
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n\nShutting down dashboard...');
      this.stop();
      process.exit(0);
    });
  }

  private async showMainMenu(): Promise<void> {
    while (this.isRunning) {
      console.log('\n📊 Simple Dashboard Menu:');
      console.log('1. System Overview');
      console.log('2. Memory Usage');
      console.log('3. CPU Information');
      console.log('4. Process Info');
      console.log('5. Exit');

      const choice = await this.prompt('Select an option (1-5): ');
      
      switch (choice) {
        case '1':
          await this.showSystemOverview();
          break;
        case '2':
          await this.showMemoryUsage();
          break;
        case '3':
          await this.showCPUInfo();
          break;
        case '4':
          await this.showProcessInfo();
          break;
        case '5':
          this.isRunning = false;
          break;
        default:
          console.log('❌ Invalid option. Please try again.');
      }
    }
  }

  private async showSystemOverview(): Promise<void> {
    console.clear();
    console.log('🌐 System Overview');
    console.log('==================\n');

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercentage = (usedMem / totalMem) * 100;

    console.log(`💻 Platform: ${os.platform()} ${os.arch()}`);
    console.log(`🖥️  Hostname: ${os.hostname()}`);
    console.log(`⏰ Uptime: ${(os.uptime() / 3600).toFixed(1)} hours`);
    console.log(`🧠 Memory: ${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB used / ${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB total (${memPercentage.toFixed(1)}%)`);
    console.log(`🔢 CPU Cores: ${os.cpus().length}`);
    console.log(`📁 Home Directory: ${os.homedir()}`);

    await this.prompt('\nPress Enter to continue...');
  }

  private async showMemoryUsage(): Promise<void> {
    console.clear();
    console.log('🧠 Memory Usage');
    console.log('===============\n');

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercentage = (usedMem / totalMem) * 100;

    console.log(`Total Memory: ${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`Used Memory:  ${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`Free Memory:  ${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`Usage:        ${memPercentage.toFixed(1)}%`);

    // Memory bar visualization
    const barLength = 50;
    const usedBars = Math.round((memPercentage / 100) * barLength);
    const freeBars = barLength - usedBars;
    
    console.log('\nMemory Usage Bar:');
    console.log(`[${'█'.repeat(usedBars)}${'░'.repeat(freeBars)}] ${memPercentage.toFixed(1)}%`);

    if (memPercentage > 90) {
      console.log('🚨 CRITICAL: Memory usage is very high!');
    } else if (memPercentage > 80) {
      console.log('⚠️  WARNING: Memory usage is high');
    } else if (memPercentage > 70) {
      console.log('⚡ NOTICE: Memory usage is elevated');
    } else {
      console.log('✅ Memory usage is normal');
    }

    await this.prompt('\nPress Enter to continue...');
  }

  private async showCPUInfo(): Promise<void> {
    console.clear();
    console.log('💻 CPU Information');
    console.log('==================\n');

    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    console.log(`CPU Cores: ${cpus.length}`);
    console.log(`Architecture: ${cpus[0].model}`);
    console.log(`Speed: ${cpus[0].speed} MHz`);

    console.log('\nLoad Averages:');
    console.log(`1 minute:  ${loadAvg[0].toFixed(2)}`);
    console.log(`5 minutes: ${loadAvg[1].toFixed(2)}`);
    console.log(`15 minutes: ${loadAvg[2].toFixed(2)}`);

    // Load average interpretation
    const cores = cpus.length;
    const load1 = loadAvg[0];
    const load5 = loadAvg[1];
    const load15 = loadAvg[2];

    console.log('\nLoad Analysis:');
    if (load1 > cores * 2) {
      console.log('🚨 CRITICAL: System is overloaded');
    } else if (load1 > cores * 1.5) {
      console.log('⚠️  WARNING: System is under heavy load');
    } else if (load1 > cores) {
      console.log('⚡ NOTICE: System is moderately loaded');
    } else {
      console.log('✅ System load is normal');
    }

    await this.prompt('\nPress Enter to continue...');
  }

  private async showProcessInfo(): Promise<void> {
    console.clear();
    console.log('⚙️  Process Information');
    console.log('=======================\n');

    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    console.log(`Process Uptime: ${(uptime / 3600).toFixed(1)} hours`);
    console.log(`Node.js Version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    
    console.log('\nMemory Usage:');
    console.log(`RSS:        ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Heap Used:  ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`External:   ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);

    console.log('\nCPU Usage:');
    console.log(`User:   ${(cpuUsage.user / 1000000).toFixed(2)} seconds`);
    console.log(`System: ${(cpuUsage.system / 1000000).toFixed(2)} seconds`);

    // Memory usage percentage
    const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    console.log(`\nHeap Usage: ${heapPercentage.toFixed(1)}%`);

    if (heapPercentage > 90) {
      console.log('🚨 CRITICAL: Heap usage is very high!');
    } else if (heapPercentage > 80) {
      console.log('⚠️  WARNING: Heap usage is high');
    } else if (heapPercentage > 70) {
      console.log('⚡ NOTICE: Heap usage is elevated');
    } else {
      console.log('✅ Heap usage is normal');
    }

    await this.prompt('\nPress Enter to continue...');
  }

  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  stop(): void {
    this.isRunning = false;
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.rl.close();
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting Simple Monitoring Dashboard...\n');

  try {
    const dashboard = new SimpleDashboard();
    await dashboard.start();
  } catch (error) {
    console.error('❌ Failed to start dashboard:', error);
    process.exit(1);
  }
}

// Start the dashboard
main().catch((error) => {
  console.error('Failed to run dashboard:', error);
  process.exit(1);
});
