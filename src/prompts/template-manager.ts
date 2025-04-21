import Handlebars from 'handlebars';
import { registerTemplates } from './templates.js';

/**
 * TemplateManager handles rendering of prompt templates
 */
export class TemplateManager {
  private templates: Record<string, HandlebarsTemplateDelegate>;
  
  /**
   * Creates a new TemplateManager
   */
  constructor() {
    this.templates = {};
    this.registerHelpers();
    this.loadTemplates();
  }
  
  /**
   * Renders a template with the given data
   * @param templateName Name of the template to render
   * @param data Data to pass to the template
   * @returns Rendered template string
   */
  render(templateName: string, data: any): string {
    const template = this.templates[templateName];
    
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }
    
    return template(data);
  }
  
  /**
   * Registers Handlebars helpers
   */
  private registerHelpers(): void {
    // Helper to format numbers
    Handlebars.registerHelper('formatNumber', function(value: number, decimals: number = 2) {
      return value.toFixed(decimals);
    });
    
    // Helper to format percentages
    Handlebars.registerHelper('formatPercent', function(value: number, decimals: number = 1) {
      return (value * 100).toFixed(decimals) + '%';
    });
    
    // Helper to format duration in ms
    Handlebars.registerHelper('formatDuration', function(value: number) {
      if (value < 1000) {
        return `${value}ms`;
      } else {
        return `${(value / 1000).toFixed(2)}s`;
      }
    });
    
    // Helper to check if a value is greater than a threshold
    Handlebars.registerHelper('gt', function(a: number, b: number) {
      return a > b;
    });
    
    // Helper to get status class
    Handlebars.registerHelper('statusClass', function(status: string) {
      switch (status) {
        case 'critical':
        case 'failing':
        case 'degraded':
          return 'critical';
        case 'warning':
          return 'warning';
        default:
          return 'normal';
      }
    });
  }
  
  /**
   * Loads all templates
   */
  private loadTemplates(): void {
    const templateDefinitions = registerTemplates();
    
    for (const [name, template] of Object.entries(templateDefinitions)) {
      this.templates[name] = Handlebars.compile(template);
    }
  }
}

// Create singleton instance
export const templateManager = new TemplateManager();