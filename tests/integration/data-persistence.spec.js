// Integration tests for data persistence

const { test, expect } = require('@playwright/test');

test.describe('Data Persistence Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#diagram');
  });

  test.describe('Auto-save Functionality', () => {
    test('should auto-save every 250ms when changes are made', async ({ page }) => {
      // Create a table
      await page.fill('#nt-name', 'auto_save_test');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Wait for initial auto-save
      await expect(page.locator('#status')).toContainText('Auto-saved');

      // Make another change
      await page.fill('#nc-name', 'test_column');
      await page.selectOption('#nc-type', 'int');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Wait for second auto-save
      await expect(page.locator('#status')).toContainText('Auto-saved');
    });

    test('should save to localStorage immediately', async ({ page }) => {
      // Create a table
      await page.fill('#nt-name', 'local_storage_test');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Check localStorage immediately
      const localStorageData = await page.evaluate(() => {
        return localStorage.getItem('dbdesigner:lastSchema');
      });

      expect(localStorageData).toContain('local_storage_test');
    });

    test('should load from localStorage on page load', async ({ page }) => {
      // Set up localStorage data
      await page.evaluate(() => {
        const schema = {
          name: 'PreloadedDB',
          tables: [
            {
              id: 'tbl_preloaded_123',
              name: 'preloaded_table',
              columns: [
                { id: 'col_id_123', name: 'id', type: 'int', nullable: false }
              ],
              primaryKey: ['col_id_123'],
              uniqueConstraints: [],
              indexes: [],
              position: { x: 100, y: 100 },
              color: 'white'
            }
          ],
          foreignKeys: []
        };
        localStorage.setItem('dbdesigner:lastSchema', JSON.stringify(schema));
      });

      // Reload page
      await page.reload();

      // Verify preloaded data is displayed
      await expect(page.locator('text=preloaded_table')).toBeVisible();
      await expect(page.locator('text=id: int NOT NULL')).toBeVisible();
    });

    test('should handle localStorage corruption gracefully', async ({ page }) => {
      // Set corrupted data in localStorage
      await page.evaluate(() => {
        localStorage.setItem('dbdesigner:lastSchema', 'invalid json data');
      });

      // Reload page
      await page.reload();

      // Should start with empty schema
      await expect(page.locator('#section-selected')).toBeHidden();
    });
  });

  test.describe('Server Synchronization', () => {
    test('should save to server with correct endpoint', async ({ page }) => {
      let serverRequest = null;

      // Intercept server requests
      await page.route('**/api/save*', route => {
        serverRequest = {
          url: route.request().url(),
          method: route.request().method(),
          headers: route.request().headers(),
          body: route.request().postData()
        };
        route.fulfill({ status: 200, body: 'ok: wrote solution.json' });
      });

      // Create a table
      await page.fill('#nt-name', 'server_save_test');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Wait for server save
      await expect(page.locator('#status')).toContainText('Auto-saved to solution.json');

      // Verify request details
      expect(serverRequest.url).toContain('/api/save?file=solution.json');
      expect(serverRequest.method).toBe('POST');
      expect(serverRequest.headers['content-type']).toBe('application/json');
      expect(serverRequest.body).toContain('server_save_test');
    });

    test('should handle server errors with retry', async ({ page }) => {
      let requestCount = 0;

      // Mock server to fail first, then succeed
      await page.route('**/api/save*', route => {
        requestCount++;
        if (requestCount === 1) {
          route.fulfill({ status: 500, body: 'Server Error' });
        } else {
          route.fulfill({ status: 200, body: 'ok: wrote solution.json' });
        }
      });

      // Create a table
      await page.fill('#nt-name', 'retry_test');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Wait for retry and success
      await page.waitForFunction(() => {
        const status = document.querySelector('#status');
        return status && status.textContent.includes('Auto-saved to solution.json');
      }, { timeout: 10000 });

      // Verify retry happened
      expect(requestCount).toBeGreaterThan(1);
    });

    test('should save to different files based on context', async ({ page }) => {
      const requests = [];

      await page.route('**/api/save*', route => {
        requests.push({
          url: route.request().url(),
          body: route.request().postData()
        });
        route.fulfill({ status: 200, body: 'ok: wrote test.json' });
      });

      // Create a table (should save to solution.json by default)
      await page.fill('#nt-name', 'default_file_test');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      await expect(page.locator('#status')).toContainText('Auto-saved');

      // Verify it saved to solution.json
      expect(requests[0].url).toContain('file=solution.json');
    });
  });

  test.describe('Data Integrity', () => {
    test('should maintain referential integrity when deleting tables', async ({ page }) => {
      // Create two tables
      await page.fill('#nt-name', 'parent_table');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Add id column to parent
      await page.fill('#nc-name', 'id');
      await page.selectOption('#nc-type', 'int');
      await page.check('#nc-pk');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Create child table
      await page.fill('#nt-name', 'child_table');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Add foreign key column
      await page.fill('#nc-name', 'parent_id');
      await page.selectOption('#nc-type', 'int');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Create foreign key relationship
      await page.click('text=parent_id');
      await page.selectOption('#fk-from-col', 'parent_id');
      await page.selectOption('#fk-to-table', 'parent_table');
      await page.selectOption('#fk-to-col', 'id');
      await page.click('button[type="submit"]', { hasText: 'Add FK' });

      // Verify foreign key exists
      await expect(page.locator('text=🔗 parent_id: int')).toBeVisible();

      // Delete parent table
      await page.click('text=parent_table');
      await page.click('#btn-del-table');
      page.on('dialog', dialog => dialog.accept());

      // Verify foreign key is removed
      await expect(page.locator('.edge')).not.toBeVisible();
    });

    test('should maintain data consistency across operations', async ({ page }) => {
      // Create complex schema
      await page.fill('#nt-name', 'users');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      await page.fill('#nc-name', 'id');
      await page.selectOption('#nc-type', 'int');
      await page.check('#nc-pk');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      await page.fill('#nc-name', 'name');
      await page.selectOption('#nc-type', 'varchar(255)');
      await page.check('#nc-unique');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Create second table
      await page.fill('#nt-name', 'orders');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      await page.fill('#nc-name', 'order_id');
      await page.selectOption('#nc-type', 'int');
      await page.check('#nc-pk');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      await page.fill('#nc-name', 'user_id');
      await page.selectOption('#nc-type', 'int');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Create foreign key
      await page.click('text=user_id');
      await page.selectOption('#fk-from-col', 'user_id');
      await page.selectOption('#fk-to-table', 'users');
      await page.selectOption('#fk-to-col', 'id');
      await page.click('button[type="submit"]', { hasText: 'Add FK' });

      // Verify all data is saved correctly
      const savedData = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('dbdesigner:lastSchema'));
      });

      expect(savedData.tables).toHaveLength(2);
      expect(savedData.foreignKeys).toHaveLength(1);
      expect(savedData.tables[0].columns).toHaveLength(2);
      expect(savedData.tables[1].columns).toHaveLength(2);
    });

    test('should handle concurrent modifications', async ({ page }) => {
      // Create a table
      await page.fill('#nt-name', 'concurrent_test');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Make rapid changes
      const changes = [
        { name: 'col1', type: 'int' },
        { name: 'col2', type: 'varchar(255)' },
        { name: 'col3', type: 'text' }
      ];

      for (const change of changes) {
        await page.fill('#nc-name', change.name);
        await page.selectOption('#nc-type', change.type);
        await page.click('button[type="submit"]', { hasText: 'Add Field' });
      }

      // Wait for all changes to be saved
      await page.waitForFunction(() => {
        const status = document.querySelector('#status');
        return status && status.textContent.includes('Auto-saved');
      });

      // Verify all columns exist
      await expect(page.locator('text=col1: int')).toBeVisible();
      await expect(page.locator('text=col2: varchar(255)')).toBeVisible();
      await expect(page.locator('text=col3: text')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should handle large schemas efficiently', async ({ page }) => {
      const startTime = Date.now();

      // Create multiple tables with columns
      for (let i = 0; i < 5; i++) {
        await page.fill('#nt-name', `table_${i}`);
        await page.click('button[type="submit"]', { hasText: 'Add Table' });

        // Add multiple columns to each table
        for (let j = 0; j < 3; j++) {
          await page.fill('#nc-name', `col_${i}_${j}`);
          await page.selectOption('#nc-type', 'varchar(255)');
          await page.click('button[type="submit"]', { hasText: 'Add Field' });
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (10 seconds)
      expect(duration).toBeLessThan(10000);

      // Verify all tables are visible
      for (let i = 0; i < 5; i++) {
        await expect(page.locator(`text=table_${i}`)).toBeVisible();
      }
    });

    test('should maintain responsiveness during auto-save', async ({ page }) => {
      // Create a table
      await page.fill('#nt-name', 'responsiveness_test');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Make changes while auto-save is happening
      await page.fill('#nc-name', 'test_column');
      await page.selectOption('#nc-type', 'int');

      // UI should remain responsive
      await expect(page.locator('#nc-name')).toHaveValue('test_column');
      await expect(page.locator('#nc-type')).toHaveValue('int');

      // Submit should work
      await page.click('button[type="submit"]', { hasText: 'Add Field' });
      await expect(page.locator('text=test_column: int')).toBeVisible();
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from localStorage quota exceeded', async ({ page }) => {
      // Mock localStorage quota exceeded
      await page.evaluate(() => {
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
          if (key === 'dbdesigner:lastSchema') {
            throw new DOMException('Quota exceeded', 'QuotaExceededError');
          }
          return originalSetItem.call(this, key, value);
        };
      });

      // Create a table
      await page.fill('#nt-name', 'quota_test');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Should handle error gracefully
      await expect(page.locator('text=quota_test')).toBeVisible();
    });

    test('should handle server unavailability', async ({ page }) => {
      // Mock server unavailable
      await page.route('**/api/save*', route => {
        route.abort();
      });

      // Create a table
      await page.fill('#nt-name', 'server_unavailable_test');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Should show error but continue working
      await expect(page.locator('#status')).toContainText('Auto-save failed');
      await expect(page.locator('text=server_unavailable_test')).toBeVisible();
    });

    test('should handle malformed server responses', async ({ page }) => {
      // Mock malformed response
      await page.route('**/api/save*', route => {
        route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: 'unexpected response format'
        });
      });

      // Create a table
      await page.fill('#nt-name', 'malformed_response_test');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Should handle gracefully
      await expect(page.locator('text=malformed_response_test')).toBeVisible();
    });
  });
});
