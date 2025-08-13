/* lib/config-cli.ts
   CLI tool for managing TA worker configuration at runtime
*/

import { createConfigurationManager, ENVIRONMENT_PRESETS } from './configuration';
import * as readline from 'readline';

export class ConfigurationCLI {
  private configManager: ReturnType<typeof createConfigurationManager>;
  private rl: readline.Interface;

  constructor(configFile?: string) {
    this.configManager = createConfigurationManager(undefined, configFile);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Listen for configuration changes
    this.configManager.on('configChanged', (event) => {
      console.log(`\n🔄 Configuration changed: ${event.section}.${event.key}`);
      console.log(`   Old: ${event.oldValue}`);
      console.log(`   New: ${event.newValue}`);
      console.log(`   Time: ${event.timestamp.toISOString()}`);
    });
  }

  /**
   * Start interactive CLI
   */
  async start(): Promise<void> {
    console.log('🔧 TA Worker Configuration Manager');
    console.log('==================================\n');

    while (true) {
      try {
        await this.showMainMenu();
      } catch (error) {
        if (error === 'exit') {
          break;
        }
        console.error('❌ Error:', error);
      }
    }

    this.cleanup();
  }

  /**
   * Show main menu
   */
  private async showMainMenu(): Promise<void> {
    console.log('\n📋 Main Menu:');
    console.log('1. View current configuration');
    console.log('2. View configuration section');
    console.log('3. Update configuration value');
    console.log('4. Update configuration section');
    console.log('5. Load configuration from file');
    console.log('6. Save configuration to file');
    console.log('7. Apply environment preset');
    console.log('8. Reset to defaults');
    console.log('9. Validate configuration');
    console.log('10. Watch configuration file');
    console.log('0. Exit');

    const choice = await this.question('\nSelect option (0-10): ');

    switch (choice) {
      case '1':
        await this.viewConfiguration();
        break;
      case '2':
        await this.viewSection();
        break;
      case '3':
        await this.updateValue();
        break;
      case '4':
        await this.updateSection();
        break;
      case '5':
        await this.loadFromFile();
        break;
      case '6':
        await this.saveToFile();
        break;
      case '7':
        await this.applyEnvironmentPreset();
        break;
      case '8':
        await this.resetToDefaults();
        break;
      case '9':
        await this.validateConfiguration();
        break;
      case '10':
        await this.watchFile();
        break;
      case '0':
        throw 'exit';
      default:
        console.log('❌ Invalid option');
    }
  }

  /**
   * View current configuration
   */
  private async viewConfiguration(): Promise<void> {
    const config = this.configManager.getConfig();
    const summary = this.configManager.getSummary();

    console.log('\n📊 Configuration Summary:');
    console.log(`Environment: ${summary.environment}`);
    console.log(`Version: ${summary.version}`);
    console.log(`Last Updated: ${summary.lastUpdated.toISOString()}`);
    console.log(`Sections: ${summary.sections.join(', ')}`);
    console.log(`Valid: ${summary.validation.isValid ? '✅' : '❌'}`);

    if (summary.validation.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      summary.validation.warnings.forEach((warning: string) => console.log(`   - ${warning}`));
    }

    if (summary.validation.errors.length > 0) {
      console.log('\n❌ Errors:');
      summary.validation.errors.forEach((error: string) => console.log(`   - ${error}`));
    }

    const showDetails = await this.question('\nShow detailed configuration? (y/n): ');
    if (showDetails.toLowerCase() === 'y') {
      console.log('\n📋 Detailed Configuration:');
      console.log(JSON.stringify(config, null, 2));
    }
  }

  /**
   * View configuration section
   */
  private async viewSection(): Promise<void> {
    const sections = ['technicalAnalysis', 'performance', 'database', 'errorHandling', 'logging', 'monitoring'];
    
    console.log('\n📂 Available sections:');
    sections.forEach((section, index) => {
      console.log(`${index + 1}. ${section}`);
    });

    const sectionChoice = await this.question('\nSelect section (1-6): ');
    const sectionIndex = parseInt(sectionChoice) - 1;

    if (sectionIndex >= 0 && sectionIndex < sections.length) {
      const section = sections[sectionIndex];
      const sectionConfig = this.configManager.getSection(section as any);
      
      console.log(`\n📋 ${section} Configuration:`);
      console.log(JSON.stringify(sectionConfig, null, 2));
    } else {
      console.log('❌ Invalid section');
    }
  }

  /**
   * Update configuration value
   */
  private async updateValue(): Promise<void> {
    const sections = ['technicalAnalysis', 'performance', 'database', 'errorHandling', 'logging', 'monitoring'];
    
    console.log('\n📂 Available sections:');
    sections.forEach((section, index) => {
      console.log(`${index + 1}. ${section}`);
    });

    const sectionChoice = await this.question('\nSelect section (1-6): ');
    const sectionIndex = parseInt(sectionChoice) - 1;

    if (sectionIndex >= 0 && sectionIndex < sections.length) {
      const section = sections[sectionIndex];
      const sectionConfig = this.configManager.getSection(section as any);
      
      console.log(`\n📋 Current ${section} configuration:`);
      Object.keys(sectionConfig).forEach((key, index) => {
        console.log(`${index + 1}. ${key}: ${sectionConfig[key]}`);
      });

      const keyChoice = await this.question('\nSelect key to update (1-...): ');
      const keyIndex = parseInt(keyChoice) - 1;
      const keys = Object.keys(sectionConfig);

      if (keyIndex >= 0 && keyIndex < keys.length) {
        const key = keys[keyIndex];
        const currentValue = sectionConfig[key];
        
        console.log(`\nCurrent value for ${key}: ${currentValue}`);
        const newValue = await this.question(`Enter new value for ${key}: `);
        
        // Try to parse the value based on type
        let parsedValue: any = newValue;
        if (typeof currentValue === 'number') {
          parsedValue = parseFloat(newValue);
          if (isNaN(parsedValue)) {
            console.log('❌ Invalid number value');
            return;
          }
        } else if (typeof currentValue === 'boolean') {
          parsedValue = newValue.toLowerCase() === 'true';
        }

        const result = this.configManager.updateValue(section as any, key as any, parsedValue);
        
        if (result.isValid) {
          console.log('✅ Configuration updated successfully');
          if (result.warnings.length > 0) {
            console.log('⚠️  Warnings:', result.warnings);
          }
        } else {
          console.log('❌ Configuration update failed:', result.errors);
        }
      } else {
        console.log('❌ Invalid key');
      }
    } else {
      console.log('❌ Invalid section');
    }
  }

  /**
   * Update configuration section
   */
  private async updateSection(): Promise<void> {
    const sections = ['technicalAnalysis', 'performance', 'database', 'errorHandling', 'logging', 'monitoring'];
    
    console.log('\n📂 Available sections:');
    sections.forEach((section, index) => {
      console.log(`${index + 1}. ${section}`);
    });

    const sectionChoice = await this.question('\nSelect section (1-6): ');
    const sectionIndex = parseInt(sectionChoice) - 1;

    if (sectionIndex >= 0 && sectionIndex < sections.length) {
      const section = sections[sectionIndex];
      console.log(`\n📝 Enter JSON configuration for ${section}:`);
      console.log('(Enter "cancel" to abort)');
      
      const jsonInput = await this.question('JSON: ');
      
      if (jsonInput.toLowerCase() === 'cancel') {
        return;
      }

      try {
        const updates = JSON.parse(jsonInput);
        const result = this.configManager.updateSection(section as any, updates);
        
        if (result.isValid) {
          console.log('✅ Configuration section updated successfully');
          if (result.warnings.length > 0) {
            console.log('⚠️  Warnings:', result.warnings);
          }
        } else {
          console.log('❌ Configuration update failed:', result.errors);
        }
      } catch (error) {
        console.log('❌ Invalid JSON:', error);
      }
    } else {
      console.log('❌ Invalid section');
    }
  }

  /**
   * Load configuration from file
   */
  private async loadFromFile(): Promise<void> {
    const filePath = await this.question('\nEnter configuration file path: ');
    
    if (filePath.trim()) {
      this.configManager.loadFromFile(filePath);
      console.log('✅ Configuration loaded from file');
    }
  }

  /**
   * Save configuration to file
   */
  private async saveToFile(): Promise<void> {
    const filePath = await this.question('\nEnter configuration file path: ');
    
    if (filePath.trim()) {
      this.configManager.saveToFile(filePath);
      console.log('✅ Configuration saved to file');
    }
  }

  /**
   * Apply environment preset
   */
  private async applyEnvironmentPreset(): Promise<void> {
    const environments = Object.keys(ENVIRONMENT_PRESETS);
    
    console.log('\n🌍 Available environments:');
    environments.forEach((env, index) => {
      console.log(`${index + 1}. ${env}`);
    });

    const envChoice = await this.question('\nSelect environment (1-3): ');
    const envIndex = parseInt(envChoice) - 1;

    if (envIndex >= 0 && envIndex < environments.length) {
      const environment = environments[envIndex];
      const preset = ENVIRONMENT_PRESETS[environment as keyof typeof ENVIRONMENT_PRESETS];
      
      console.log(`\n🔄 Applying ${environment} preset...`);
      
      Object.entries(preset).forEach(([section, updates]) => {
        const result = this.configManager.updateSection(section as any, updates);
        if (result.isValid) {
          console.log(`✅ ${section} updated`);
        } else {
          console.log(`❌ ${section} update failed:`, result.errors);
        }
      });
      
      console.log(`✅ ${environment} preset applied successfully`);
    } else {
      console.log('❌ Invalid environment');
    }
  }

  /**
   * Reset to defaults
   */
  private async resetToDefaults(): Promise<void> {
    const confirm = await this.question('\n⚠️  Are you sure you want to reset to defaults? (yes/no): ');
    
    if (confirm.toLowerCase() === 'yes') {
      this.configManager.resetToDefaults();
      console.log('✅ Configuration reset to defaults');
    } else {
      console.log('❌ Reset cancelled');
    }
  }

  /**
   * Validate configuration
   */
  private async validateConfiguration(): Promise<void> {
    const summary = this.configManager.getSummary();
    
    console.log('\n🔍 Configuration Validation:');
    console.log(`Valid: ${summary.validation.isValid ? '✅' : '❌'}`);
    
    if (summary.validation.errors.length > 0) {
      console.log('\n❌ Errors:');
      summary.validation.errors.forEach((error: string) => console.log(`   - ${error}`));
    }
    
    if (summary.validation.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      summary.validation.warnings.forEach((warning: string) => console.log(`   - ${warning}`));
    }
    
    if (summary.validation.isValid) {
      console.log('\n✅ Configuration is valid');
    }
  }

  /**
   * Watch configuration file
   */
  private async watchFile(): Promise<void> {
    const filePath = await this.question('\nEnter configuration file path to watch: ');
    
    if (filePath.trim()) {
      this.configManager.watchFile(filePath);
      console.log(`✅ Watching ${filePath} for changes`);
      console.log('Press Enter to stop watching...');
      await this.question('');
      this.configManager.stopWatching();
      console.log('✅ Stopped watching file');
    }
  }

  /**
   * Ask user question
   */
  private question(query: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(query, resolve);
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.configManager.destroy();
    this.rl.close();
    console.log('\n👋 Configuration manager closed');
  }
}

/**
 * Start CLI if run directly
 */
if (require.main === module) {
  const configFile = process.argv[2];
  const cli = new ConfigurationCLI(configFile);
  cli.start().catch(console.error);
}
