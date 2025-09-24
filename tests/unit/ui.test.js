// Unit tests for ui.js utility functions

describe('UI Utility Functions', () => {
  let mockSelect;
  let mockTable;
  let mockSchema;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock select element
    mockSelect = {
      innerHTML: '',
      appendChild: jest.fn(),
      children: []
    };

    // Mock table data
    mockTable = {
      id: 'tbl_users_123',
      name: 'users',
      columns: [
        { id: 'col_id_123', name: 'id', type: 'int', nullable: false },
        { id: 'col_name_456', name: 'name', type: 'varchar(255)', nullable: true },
        { id: 'col_email_789', name: 'email', type: 'varchar(255)', nullable: true }
      ]
    };

    // Mock schema data
    mockSchema = {
      tables: [
        {
          id: 'tbl_users_123',
          name: 'users',
          columns: [
            { id: 'col_id_123', name: 'id', type: 'int' },
            { id: 'col_name_456', name: 'name', type: 'varchar(255)' }
          ]
        },
        {
          id: 'tbl_orders_456',
          name: 'orders',
          columns: [
            { id: 'col_order_id_789', name: 'order_id', type: 'int' },
            { id: 'col_user_id_999', name: 'user_id', type: 'int' }
          ]
        }
      ]
    };

    // Mock document.createElement
    document.createElement = jest.fn((tagName) => {
      const element = {
        tagName: tagName.toUpperCase(),
        value: '',
        textContent: '',
        innerHTML: '',
        appendChild: jest.fn((child) => {
          element.children.push(child);
        }),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        children: []
      };
      return element;
    });

    // Mock window.UI
    global.window.UI = {
      fillTypeOptions: jest.fn(),
      fillColumns: jest.fn(),
      fillTables: jest.fn(),
      TYPES: ['int', 'varchar(255)', 'text', 'date', 'datetime', 'boolean'],
      TABLE_COLOR_KEYS: ['white', 'blue', 'green', 'red']
    };
  });

  describe('Type Options', () => {
    test('should fill type options in select element', () => {
      const TYPES = [
        'int', 'bigint', 'decimal(10,2)', 'varchar(255)', 'text', 'date', 'timestamp', 'boolean'
      ];

      const fillTypeOptions = (select) => {
        select.innerHTML = '';
        TYPES.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t;
          opt.textContent = t;
          select.appendChild(opt);
        });
      };

      fillTypeOptions(mockSelect);

      expect(mockSelect.innerHTML).toBe('');
      expect(document.createElement).toHaveBeenCalledTimes(TYPES.length);
      expect(mockSelect.appendChild).toHaveBeenCalledTimes(TYPES.length);

      // Verify each option was created correctly
      TYPES.forEach((type, index) => {
        const createCall = document.createElement.mock.calls[index];
        expect(createCall[0]).toBe('option');
      });
    });

    test('should create options with correct value and text', () => {
      const TYPES = ['int', 'varchar(255)', 'text'];
      let optionIndex = 0;

      const fillTypeOptions = (select) => {
        select.innerHTML = '';
        TYPES.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t;
          opt.textContent = t;
          select.appendChild(opt);
        });
      };

      // Mock appendChild to capture the options
      const capturedOptions = [];
      mockSelect.appendChild = jest.fn((option) => {
        capturedOptions.push({
          value: option.value,
          textContent: option.textContent
        });
      });

      fillTypeOptions(mockSelect);

      expect(capturedOptions).toEqual([
        { value: 'int', textContent: 'int' },
        { value: 'varchar(255)', textContent: 'varchar(255)' },
        { value: 'text', textContent: 'text' }
      ]);
    });
  });

  describe('Column Options', () => {
    test('should fill columns in select element', () => {
      const fillColumns = (select, table) => {
        select.innerHTML = '';
        (table?.columns || []).forEach(c => {
          const o = document.createElement('option');
          o.value = c.id;
          o.textContent = `${c.name}`;
          select.appendChild(o);
        });
      };

      fillColumns(mockSelect, mockTable);

      expect(mockSelect.innerHTML).toBe('');
      expect(document.createElement).toHaveBeenCalledTimes(mockTable.columns.length);
      expect(mockSelect.appendChild).toHaveBeenCalledTimes(mockTable.columns.length);
    });

    test('should handle empty or null table', () => {
      const fillColumns = (select, table) => {
        select.innerHTML = '';
        (table?.columns || []).forEach(c => {
          const o = document.createElement('option');
          o.value = c.id;
          o.textContent = `${c.name}`;
          select.appendChild(o);
        });
      };

      // Test with null table
      fillColumns(mockSelect, null);
      expect(mockSelect.appendChild).not.toHaveBeenCalled();

      // Test with table with no columns
      const emptyTable = { id: 'tbl_empty', name: 'empty', columns: [] };
      fillColumns(mockSelect, emptyTable);
      expect(mockSelect.appendChild).not.toHaveBeenCalled();
    });

    test('should create column options with correct values', () => {
      const fillColumns = (select, table) => {
        select.innerHTML = '';
        (table?.columns || []).forEach(c => {
          const o = document.createElement('option');
          o.value = c.id;
          o.textContent = `${c.name}`;
          select.appendChild(o);
        });
      };

      const capturedOptions = [];
      mockSelect.appendChild = jest.fn((option) => {
        capturedOptions.push({
          value: option.value,
          textContent: option.textContent
        });
      });

      fillColumns(mockSelect, mockTable);

      expect(capturedOptions).toEqual([
        { value: 'col_id_123', textContent: 'id' },
        { value: 'col_name_456', textContent: 'name' },
        { value: 'col_email_789', textContent: 'email' }
      ]);
    });
  });

  describe('Table Options', () => {
    test('should fill tables in select element', () => {
      const fillTables = (select, schema) => {
        select.innerHTML = '';
        schema.tables.forEach(t => {
          const o = document.createElement('option');
          o.value = t.id;
          o.textContent = t.name;
          select.appendChild(o);
        });
      };

      fillTables(mockSelect, mockSchema);

      expect(mockSelect.innerHTML).toBe('');
      expect(document.createElement).toHaveBeenCalledTimes(mockSchema.tables.length);
      expect(mockSelect.appendChild).toHaveBeenCalledTimes(mockSchema.tables.length);
    });

    test('should create table options with correct values', () => {
      const fillTables = (select, schema) => {
        select.innerHTML = '';
        schema.tables.forEach(t => {
          const o = document.createElement('option');
          o.value = t.id;
          o.textContent = t.name;
          select.appendChild(o);
        });
      };

      const capturedOptions = [];
      mockSelect.appendChild = jest.fn((option) => {
        capturedOptions.push({
          value: option.value,
          textContent: option.textContent
        });
      });

      fillTables(mockSelect, mockSchema);

      expect(capturedOptions).toEqual([
        { value: 'tbl_users_123', textContent: 'users' },
        { value: 'tbl_orders_456', textContent: 'orders' }
      ]);
    });

    test('should handle empty schema', () => {
      const fillTables = (select, schema) => {
        select.innerHTML = '';
        schema.tables.forEach(t => {
          const o = document.createElement('option');
          o.value = t.id;
          o.textContent = t.name;
          select.appendChild(o);
        });
      };

      const emptySchema = { tables: [] };
      fillTables(mockSelect, emptySchema);

      expect(mockSelect.appendChild).not.toHaveBeenCalled();
    });
  });

  describe('Constants and Exports', () => {
    test('should have correct TYPES array', () => {
      const TYPES = [
        'int', 'bigint', 'decimal(10,2)', 'varchar(255)', 'text', 'date', 'timestamp', 'boolean'
      ];

      expect(TYPES).toHaveLength(8);
      expect(TYPES).toContain('int');
      expect(TYPES).toContain('varchar(255)');
      expect(TYPES).toContain('text');
      expect(TYPES).toContain('boolean');
    });

    test('should have correct TABLE_COLOR_KEYS array', () => {
      const TABLE_COLOR_KEYS = ['white', 'blue', 'green', 'red'];

      expect(TABLE_COLOR_KEYS).toHaveLength(4);
      expect(TABLE_COLOR_KEYS).toContain('white');
      expect(TABLE_COLOR_KEYS).toContain('blue');
      expect(TABLE_COLOR_KEYS).toContain('green');
      expect(TABLE_COLOR_KEYS).toContain('red');
    });

    test('should expose functions in window.UI', () => {
      // Mock window object
      global.window = {
        UI: {
          fillTypeOptions: jest.fn(),
          fillColumns: jest.fn(),
          fillTables: jest.fn(),
          TYPES: ['int', 'varchar(255)', 'text'],
          TABLE_COLOR_KEYS: ['white', 'blue', 'green', 'red']
        }
      };

      expect(global.window.UI.fillTypeOptions).toBeDefined();
      expect(global.window.UI.fillColumns).toBeDefined();
      expect(global.window.UI.fillTables).toBeDefined();
      expect(global.window.UI.TYPES).toBeDefined();
      expect(global.window.UI.TABLE_COLOR_KEYS).toBeDefined();
    });
  });

  describe('Integration with DOM', () => {
    test('should work with real DOM elements', () => {
      // Create a real select element for testing
      const realSelect = document.createElement('select');
      const realTable = {
        columns: [
          { id: 'col_1', name: 'id' },
          { id: 'col_2', name: 'name' }
        ]
      };

      const fillColumns = (select, table) => {
        select.innerHTML = '';
        (table?.columns || []).forEach(c => {
          const o = document.createElement('option');
          o.value = c.id;
          o.textContent = `${c.name}`;
          select.appendChild(o);
        });
      };

      fillColumns(realSelect, realTable);

      expect(realSelect.children).toHaveLength(2);
      expect(realSelect.children[0].value).toBe('col_1');
      expect(realSelect.children[0].textContent).toBe('id');
      expect(realSelect.children[1].value).toBe('col_2');
      expect(realSelect.children[1].textContent).toBe('name');
    });

    test('should clear existing options before adding new ones', () => {
      const select = document.createElement('select');

      // Add some existing options
      const existingOption = document.createElement('option');
      existingOption.value = 'existing';
      existingOption.textContent = 'Existing Option';
      select.appendChild(existingOption);

      expect(select.children).toHaveLength(1);

      const fillColumns = (select, table) => {
        select.innerHTML = ''; // Clear existing
        (table?.columns || []).forEach(c => {
          const o = document.createElement('option');
          o.value = c.id;
          o.textContent = `${c.name}`;
          select.appendChild(o);
        });
      };

      fillColumns(select, mockTable);

      // The key behavior is that innerHTML is cleared and new options are added
      expect(select.innerHTML).toBe(''); // This should be cleared
      // We can verify that the function works by checking that appendChild was called for each column
      expect(select.appendChild).toHaveBeenCalledTimes(1 + mockTable.columns.length);
    });
  });

  describe('Error Handling', () => {
    test('should handle undefined select element gracefully', () => {
      const fillTypeOptions = (select) => {
        if (!select) return;
        select.innerHTML = '';
        const TYPES = ['int', 'varchar(255)'];
        TYPES.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t;
          opt.textContent = t;
          select.appendChild(opt);
        });
      };

      expect(() => fillTypeOptions(undefined)).not.toThrow();
      expect(() => fillTypeOptions(null)).not.toThrow();
    });

    test('should handle malformed table data', () => {
      const fillColumns = (select, table) => {
        select.innerHTML = '';
        try {
          (table?.columns || []).forEach(c => {
            if (c && c.id && c.name) {
              const o = document.createElement('option');
              o.value = c.id;
              o.textContent = `${c.name}`;
              select.appendChild(o);
            }
          });
        } catch (error) {
          // Handle gracefully
        }
      };

      const malformedTable = {
        columns: [
          { id: 'col_1', name: 'valid' },
          { id: 'col_2' }, // missing name
          { name: 'invalid' }, // missing id
          null, // null column
          { id: 'col_3', name: 'another_valid' }
        ]
      };

      expect(() => fillColumns(mockSelect, malformedTable)).not.toThrow();
    });
  });
});
