// Integration tests for user workflows using Playwright

const { test, expect } = require('@playwright/test');

test.describe('Database Designer User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the application to load
    await page.waitForSelector('#diagram');
    await page.waitForSelector('#sidebar');
  });

  test.describe('Table Management', () => {
    test('should create a new table', async ({ page }) => {
      // Fill in table name
      await page.fill('#nt-name', 'users');

      // Submit the form
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Verify table appears in diagram
      await expect(page.locator('text=users')).toBeVisible();

      // Verify table appears in selected section
      await expect(page.locator('#sel-title')).toContainText('Selected: users');

      // Verify form is cleared
      await expect(page.locator('#nt-name')).toHaveValue('');
    });

    test('should rename a table', async ({ page }) => {
      // Create a table first
      await page.fill('#nt-name', 'old_name');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Wait for table to be selected
      await expect(page.locator('#sel-title')).toContainText('Selected: old_name');

      // Rename the table
      await page.fill('#rt-name', 'new_name');
      await page.click('button[type="submit"]', { hasText: 'Save Name' });

      // Verify table is renamed in diagram
      await expect(page.locator('text=new_name')).toBeVisible();
      await expect(page.locator('text=old_name')).not.toBeVisible();

      // Verify selected section shows new name
      await expect(page.locator('#sel-title')).toContainText('Selected: new_name');
    });

    test('should change table color', async ({ page }) => {
      // Create a table
      await page.fill('#nt-name', 'colored_table');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Change color to blue
      await page.selectOption('#rt-color', 'blue');

      // Verify color change is reflected in diagram
      // Note: This would need to check the actual SVG styling
      await expect(page.locator('#rt-color')).toHaveValue('blue');
    });

    test('should delete a table', async ({ page }) => {
      // Create a table
      await page.fill('#nt-name', 'to_delete');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Wait for table to be selected
      await expect(page.locator('#sel-title')).toContainText('Selected: to_delete');

      // Delete the table
      await page.click('#btn-del-table');

      // Confirm deletion in dialog
      page.on('dialog', dialog => dialog.accept());

      // Verify table is removed from diagram
      await expect(page.locator('text=to_delete')).not.toBeVisible();

      // Verify selected section is hidden
      await expect(page.locator('#section-selected')).toBeHidden();
    });

    test('should prevent duplicate table names', async ({ page }) => {
      // Create first table
      await page.fill('#nt-name', 'duplicate');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Try to create second table with same name
      await page.fill('#nt-name', 'duplicate');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Should create with unique name
      await expect(page.locator('text=duplicate_1')).toBeVisible();
    });
  });

  test.describe('Column Management', () => {
    test.beforeEach(async ({ page }) => {
      // Create a table for column tests
      await page.fill('#nt-name', 'test_table');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });
      await expect(page.locator('#sel-title')).toContainText('Selected: test_table');
    });

    test('should add a column to table', async ({ page }) => {
      // Fill column form
      await page.fill('#nc-name', 'id');
      await page.selectOption('#nc-type', 'int');
      await page.check('#nc-pk');

      // Submit column form
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Verify column appears in diagram
      await expect(page.locator('text=🔑 id: int NOT NULL')).toBeVisible();

      // Verify form is cleared
      await expect(page.locator('#nc-name')).toHaveValue('');
      await expect(page.locator('#nc-pk')).not.toBeChecked();
    });

    test('should edit an existing column', async ({ page }) => {
      // Add a column first
      await page.fill('#nc-name', 'old_column');
      await page.selectOption('#nc-type', 'varchar(255)');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Click on the column to edit it
      await page.click('text=old_column');

      // Verify form is populated for editing
      await expect(page.locator('#nc-name')).toHaveValue('old_column');
      await expect(page.locator('#nc-type')).toHaveValue('varchar(255)');
      await expect(page.locator('button[type="submit"]')).toContainText('Save Field');

      // Edit the column
      await page.fill('#nc-name', 'new_column');
      await page.selectOption('#nc-type', 'text');
      await page.click('button[type="submit"]', { hasText: 'Save Field' });

      // Verify changes in diagram
      await expect(page.locator('text=new_column: text')).toBeVisible();
      await expect(page.locator('text=old_column')).not.toBeVisible();
    });

    test('should delete a column', async ({ page }) => {
      // Add a column
      await page.fill('#nc-name', 'to_delete');
      await page.selectOption('#nc-type', 'int');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Click on column to edit
      await page.click('text=to_delete');

      // Delete the column
      await page.click('button[type="button"]', { hasText: 'Delete Field' });

      // Confirm deletion
      page.on('dialog', dialog => dialog.accept());

      // Verify column is removed
      await expect(page.locator('text=to_delete')).not.toBeVisible();
    });

    test('should handle column constraints', async ({ page }) => {
      // Add column with primary key
      await page.fill('#nc-name', 'id');
      await page.selectOption('#nc-type', 'int');
      await page.check('#nc-pk');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Verify primary key indicator
      await expect(page.locator('text=🔑 id: int NOT NULL')).toBeVisible();

      // Add column with unique constraint
      await page.fill('#nc-name', 'email');
      await page.selectOption('#nc-type', 'varchar(255)');
      await page.check('#nc-unique');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Verify unique constraint (would need to check for unique indicator)
      await expect(page.locator('text=email: varchar(255)')).toBeVisible();
    });

    test('should prevent duplicate column names within table', async ({ page }) => {
      // Add first column
      await page.fill('#nc-name', 'duplicate');
      await page.selectOption('#nc-type', 'int');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Try to add second column with same name
      await page.fill('#nc-name', 'duplicate');
      await page.selectOption('#nc-type', 'varchar(255)');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Should create with unique name
      await expect(page.locator('text=duplicate_1: varchar(255)')).toBeVisible();
    });
  });

  test.describe('Foreign Key Management', () => {
    test.beforeEach(async ({ page }) => {
      // Create two tables for foreign key tests
      await page.fill('#nt-name', 'users');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Add id column to users table
      await page.fill('#nc-name', 'id');
      await page.selectOption('#nc-type', 'int');
      await page.check('#nc-pk');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Create second table
      await page.fill('#nt-name', 'orders');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Add user_id column to orders table
      await page.fill('#nc-name', 'user_id');
      await page.selectOption('#nc-type', 'int');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });
    });

    test('should create foreign key relationship', async ({ page }) => {
      // Select user_id column in orders table
      await page.click('text=user_id');

      // Fill foreign key form
      await page.selectOption('#fk-from-col', 'user_id');
      await page.selectOption('#fk-to-table', 'users');
      await page.selectOption('#fk-to-col', 'id');
      await page.selectOption('#fk-ondelete', 'CASCADE');

      // Submit foreign key form
      await page.click('button[type="submit"]', { hasText: 'Add FK' });

      // Verify foreign key indicator appears
      await expect(page.locator('text=🔗 user_id: int')).toBeVisible();

      // Verify foreign key arrow appears in diagram
      await expect(page.locator('.edge')).toBeVisible();
    });

    test('should remove foreign key', async ({ page }) => {
      // Create foreign key first
      await page.click('text=user_id');
      await page.selectOption('#fk-from-col', 'user_id');
      await page.selectOption('#fk-to-table', 'users');
      await page.selectOption('#fk-to-col', 'id');
      await page.click('button[type="submit"]', { hasText: 'Add FK' });

      // Click on column to edit
      await page.click('text=🔗 user_id');

      // Remove foreign key
      await page.click('button[type="button"]', { hasText: 'Remove FK' });

      // Confirm removal
      page.on('dialog', dialog => dialog.accept());

      // Verify foreign key indicator is removed
      await expect(page.locator('text=🔗 user_id')).not.toBeVisible();
      await expect(page.locator('text=user_id: int')).toBeVisible();
    });
  });

  test.describe('Diagram Interactions', () => {
    test('should select table by clicking on it', async ({ page }) => {
      // Create a table
      await page.fill('#nt-name', 'clickable_table');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Click on empty area to deselect
      await page.click('#diagram');
      await expect(page.locator('#section-selected')).toBeHidden();

      // Click on table to select it
      await page.click('text=clickable_table');
      await expect(page.locator('#section-selected')).toBeVisible();
      await expect(page.locator('#sel-title')).toContainText('Selected: clickable_table');
    });

    test('should select column by clicking on it', async ({ page }) => {
      // Create table with column
      await page.fill('#nt-name', 'table_with_column');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      await page.fill('#nc-name', 'clickable_column');
      await page.selectOption('#nc-type', 'int');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Click on column
      await page.click('text=clickable_column');

      // Verify column editing form is shown
      await expect(page.locator('#nc-name')).toHaveValue('clickable_column');
      await expect(page.locator('button[type="submit"]')).toContainText('Save Field');
    });

    test('should drag table to new position', async ({ page }) => {
      // Create a table
      await page.fill('#nt-name', 'draggable_table');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Get initial position
      const table = page.locator('g.table[data-id*="tbl_draggable_table"]');
      const initialTransform = await table.getAttribute('transform');

      // Drag the table by its drag handle
      const dragHandle = table.locator('.drag-handle');
      await dragHandle.dragTo(page.locator('#diagram'), { targetPosition: { x: 200, y: 200 } });

      // Verify table moved (transform should be different)
      const newTransform = await table.getAttribute('transform');
      expect(newTransform).not.toBe(initialTransform);
    });

    test('should pan and zoom diagram', async ({ page }) => {
      // Create a table for reference
      await page.fill('#nt-name', 'reference_table');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Test zoom in
      await page.locator('#diagram').wheel({ deltaY: -100 });

      // Test zoom out
      await page.locator('#diagram').wheel({ deltaY: 100 });

      // Test pan (drag on empty area)
      await page.locator('#diagram').dragTo(page.locator('#diagram'), {
        targetPosition: { x: 100, y: 100 }
      });

      // Verify diagram is still functional
      await expect(page.locator('text=reference_table')).toBeVisible();
    });
  });

  test.describe('Data Persistence', () => {
    test('should auto-save changes', async ({ page }) => {
      // Create a table
      await page.fill('#nt-name', 'auto_save_table');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Wait for auto-save status
      await expect(page.locator('#status')).toContainText('Auto-saved');

      // Verify data is saved to localStorage
      const localStorageData = await page.evaluate(() => {
        return localStorage.getItem('dbdesigner:lastSchema');
      });

      expect(localStorageData).toContain('auto_save_table');
    });

    test('should load data from localStorage on page refresh', async ({ page }) => {
      // Create a table
      await page.fill('#nt-name', 'persistent_table');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Wait for auto-save
      await expect(page.locator('#status')).toContainText('Auto-saved');

      // Refresh the page
      await page.reload();

      // Verify table is still there
      await expect(page.locator('text=persistent_table')).toBeVisible();
    });

    test('should handle server save errors gracefully', async ({ page }) => {
      // Mock server error
      await page.route('**/api/save*', route => {
        route.fulfill({ status: 500, body: 'Server Error' });
      });

      // Create a table
      await page.fill('#nt-name', 'error_table');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Wait for error status
      await expect(page.locator('#status')).toContainText('Auto-save failed');

      // Verify table still exists locally
      await expect(page.locator('text=error_table')).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    test('should validate required fields', async ({ page }) => {
      // Try to submit empty table name
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Form should not submit due to required attribute
      await expect(page.locator('#nt-name')).toHaveAttribute('required');
    });

    test('should validate column name uniqueness', async ({ page }) => {
      // Create table
      await page.fill('#nt-name', 'validation_table');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Add first column
      await page.fill('#nc-name', 'unique_name');
      await page.selectOption('#nc-type', 'int');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Try to add column with same name
      await page.fill('#nc-name', 'unique_name');
      await page.selectOption('#nc-type', 'varchar(255)');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Should create with unique name
      await expect(page.locator('text=unique_name_1: varchar(255)')).toBeVisible();
    });

    test('should handle form reset after operations', async ({ page }) => {
      // Create table
      await page.fill('#nt-name', 'reset_table');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Add column
      await page.fill('#nc-name', 'test_column');
      await page.selectOption('#nc-type', 'int');
      await page.check('#nc-pk');
      await page.click('button[type="submit"]', { hasText: 'Add Field' });

      // Verify form is reset
      await expect(page.locator('#nc-name')).toHaveValue('');
      await expect(page.locator('#nc-pk')).not.toBeChecked();
      await expect(page.locator('button[type="submit"]')).toContainText('Add Field');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/save*', route => {
        route.abort();
      });

      // Create table
      await page.fill('#nt-name', 'network_error_table');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Should show error status but continue working
      await expect(page.locator('#status')).toContainText('Auto-save failed');
      await expect(page.locator('text=network_error_table')).toBeVisible();
    });

    test('should handle invalid JSON responses', async ({ page }) => {
      // Mock invalid JSON response
      await page.route('**/api/save*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json'
        });
      });

      // Create table
      await page.fill('#nt-name', 'json_error_table');
      await page.click('button[type="submit"]', { hasText: 'Add Table' });

      // Should handle error gracefully
      await expect(page.locator('text=json_error_table')).toBeVisible();
    });
  });
});
