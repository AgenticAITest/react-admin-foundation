import { Page, expect } from '@playwright/test';

/**
 * Business Analyst Testing Helpers
 * Provides simple keywords for business analysts to write tests
 */
export class BusinessAnalystHelpers {
  constructor(private page: Page) {}

  async loginAsSuperAdmin() {
    await this.page.goto('/login');
    await this.page.fill('[name="username"]', process.env.TEST_ADMIN_USERNAME || 'sysadmin');
    await this.page.fill('[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'S3cr3T');
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL(/\/console/);
  }

  async navigateToModule(moduleName: string) {
    await this.page.goto('/console');
    await this.page.click(`text=${moduleName}`);
    await expect(this.page.locator('h1')).toContainText(moduleName);
  }

  async createRecord(entityName: string, data: Record<string, string>) {
    await this.page.click(`text=Add ${entityName}`);
    
    // Fill form fields
    for (const [field, value] of Object.entries(data)) {
      await this.page.fill(`[name="${field}"]`, value);
    }
    
    await this.page.click('button[type="submit"]');
    
    // Verify creation
    await expect(this.page.locator('.success-message')).toBeVisible();
  }

  async editRecord(entityName: string, identifier: string, newData: Record<string, string>) {
    await this.page.click(`text=${identifier}`);
    await this.page.click('text=Edit');
    
    // Update form fields
    for (const [field, value] of Object.entries(newData)) {
      await this.page.fill(`[name="${field}"]`, value);
    }
    
    await this.page.click('button[type="submit"]');
    
    // Verify update
    await expect(this.page.locator('.success-message')).toBeVisible();
  }

  async deleteRecord(identifier: string) {
    await this.page.click(`text=${identifier}`);
    await this.page.click('text=Delete');
    await this.page.click('text=Confirm');
    
    // Verify deletion
    await expect(this.page.locator('.success-message')).toBeVisible();
  }

  async switchTenant(tenantName: string) {
    await this.page.click('.tenant-selector');
    await this.page.click(`text=${tenantName}`);
    
    // Wait for tenant switch to complete
    await expect(this.page.locator('.current-tenant')).toContainText(tenantName);
  }

  async verifyDataIsolation(entityName: string, shouldNotExist: string) {
    // Verify that data from other tenant is not visible
    await expect(this.page.locator(`text=${shouldNotExist}`)).not.toBeVisible();
  }

  async exportModule(moduleId: string): Promise<any> {
    const response = await this.page.request.get(`/api/system/modules/export/${moduleId}`);
    expect(response.status()).toBe(200);
    return await response.json();
  }

  async importModule(modulePackage: any): Promise<void> {
    const response = await this.page.request.post('/api/system/modules/import', {
      data: modulePackage
    });
    expect(response.status()).toBe(200);
  }

  async hotswapModule(moduleId: string): Promise<void> {
    const response = await this.page.request.post(`/api/system/modules/hotswap/${moduleId}`);
    expect(response.status()).toBe(200);
  }
}

/**
 * Natural Language Test Interpreter
 * Converts business analyst descriptions to test actions
 */
export class NaturalLanguageInterpreter {
  
  static parseAction(description: string): { action: string; target?: string; data?: any } {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('create') || lowerDesc.includes('add')) {
      return { action: 'create', target: this.extractEntity(description) };
    }
    
    if (lowerDesc.includes('edit') || lowerDesc.includes('update')) {
      return { action: 'edit', target: this.extractEntity(description) };
    }
    
    if (lowerDesc.includes('delete') || lowerDesc.includes('remove')) {
      return { action: 'delete', target: this.extractEntity(description) };
    }
    
    if (lowerDesc.includes('navigate') || lowerDesc.includes('go to')) {
      return { action: 'navigate', target: this.extractTarget(description) };
    }
    
    if (lowerDesc.includes('switch tenant')) {
      return { action: 'switchTenant', target: this.extractTenant(description) };
    }
    
    if (lowerDesc.includes('export module')) {
      return { action: 'exportModule', target: this.extractModule(description) };
    }
    
    if (lowerDesc.includes('import module')) {
      return { action: 'importModule', target: this.extractModule(description) };
    }
    
    return { action: 'unknown' };
  }
  
  private static extractEntity(description: string): string {
    // Simple extraction - look for common business entities
    const entities = ['customer', 'vehicle', 'sale', 'rental', 'product', 'task', 'user'];
    for (const entity of entities) {
      if (description.toLowerCase().includes(entity)) {
        return entity;
      }
    }
    return 'item';
  }
  
  private static extractTarget(description: string): string {
    // Extract navigation target
    const match = description.match(/(?:navigate to|go to)\s+([^.,]+)/i);
    return match ? match[1].trim() : 'dashboard';
  }
  
  private static extractTenant(description: string): string {
    // Extract tenant name
    const match = description.match(/switch.*tenant.*?([^.,]+)/i);
    return match ? match[1].trim() : 'System';
  }
  
  private static extractModule(description: string): string {
    // Extract module name
    const match = description.match(/module\s+([^.,\s]+)/i);
    return match ? match[1].trim() : 'inventory';
  }
}