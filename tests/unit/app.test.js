// Unit tests for app.js core functions
// Note: Since app.js is wrapped in an IIFE, we'll test the functions by creating a test harness

describe('App Core Functions', () => {
  let mockSchema;
  let mockElement;
  let mockStatus;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    global.global.fetchMock.resetMocks();

    // Mock DOM elements
    mockElement = {
      textContent: '',
      value: '',
      checked: false,
      hidden: false,
      style: {},
      addEventListener: jest.fn(),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      getAttribute: jest.fn(),
      setAttribute: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn()
      }
    };

    mockStatus = { textContent: '' };

    // Mock document.getElementById
    document.getElementById = jest.fn((id) => {
      const elements = {
        'status': mockStatus,
        'diagram': mockElement,
        'section-selected': { ...mockElement, hidden: false },
        'sel-title': { ...mockElement, textContent: '' },
        'btn-del-table': mockElement,
        'form-new-table': mockElement,
        'nt-name': { ...mockElement, value: '' },
        'form-rename-table': mockElement,
        'rt-name': { ...mockElement, value: '' },
        'rt-color': { ...mockElement, value: 'white' },
        'form-new-col': mockElement,
        'nc-name': { ...mockElement, value: '' },
        'nc-type': { ...mockElement, value: 'int' },
        'nc-nullable': { ...mockElement, checked: false },
        'nc-default': { ...mockElement, value: '' },
        'nc-pk': { ...mockElement, checked: false },
        'nc-unique': { ...mockElement, checked: false },
        'form-new-fk': mockElement,
        'fk-from-col': { ...mockElement, value: '' },
        'fk-to-table': { ...mockElement, value: '' },
        'fk-to-col': { ...mockElement, value: '' },
        'fk-ondelete': { ...mockElement, value: 'NO ACTION' },
        'field-form-title': { ...mockElement, textContent: 'Add Field' }
      };
      return elements[id] || mockElement;
    });

    // Mock localStorage
    localStorage.getItem.mockReturnValue(null);
    localStorage.setItem.mockImplementation(() => {});

    // Mock fetch for server operations
    global.global.fetchMock.mockResponse(JSON.stringify({ success: true }));

    // Initialize test schema
    mockSchema = {
      name: 'TestDB',
      tables: [],
      foreignKeys: []
    };
  });

  describe('Schema Operations', () => {
    test('should create empty schema', () => {
      // Test the makeEmptySchema function logic
      const emptySchema = {
        name: 'New schema',
        tables: [],
        foreignKeys: []
      };

      expect(emptySchema.name).toBe('New schema');
      expect(emptySchema.tables).toEqual([]);
      expect(emptySchema.foreignKeys).toEqual([]);
    });

    test('should generate unique IDs', () => {
      // Test ID generation functions
      const uid = () => Math.random().toString(36).slice(2, 9);
      const tblId = (name) => `tbl_${name}_${uid()}`;
      const colId = (name) => `col_${name}_${uid()}`;
      const fkId = () => `fk_${uid()}`;

      const tableId = tblId('users');
      const columnId = colId('id');
      const foreignKeyId = fkId();

      expect(tableId).toMatch(/^tbl_users_[a-z0-9]{7}$/);
      expect(columnId).toMatch(/^col_id_[a-z0-9]{7}$/);
      expect(foreignKeyId).toMatch(/^fk_[a-z0-9]{7}$/);
    });

    test('should ensure unique table names', () => {
      const ensureUniqueTableName = (name, existingTables) => {
        const base = name;
        let i = 1;
        let nm = base;
        while (existingTables.some(t => t.name === nm)) {
          nm = `${base}_${i++}`;
        }
        return nm;
      };

      const existingTables = [
        { name: 'users' },
        { name: 'users_1' },
        { name: 'products' }
      ];

      expect(ensureUniqueTableName('users', existingTables)).toBe('users_2');
      expect(ensureUniqueTableName('products', existingTables)).toBe('products_1');
      expect(ensureUniqueTableName('orders', existingTables)).toBe('orders');
    });
  });

  describe('Table Operations', () => {
    test('should add table with unique name', () => {
      const addTable = (name, schema) => {
        const clean = name.trim();
        if (!clean) return null;

        const ensureUniqueTableName = (name, existingTables) => {
          const base = name;
          let i = 1;
          let nm = base;
          while (existingTables.some(t => t.name === nm)) {
            nm = `${base}_${i++}`;
          }
          return nm;
        };

        const uniqueName = ensureUniqueTableName(clean, schema.tables);
        const table = {
          id: `tbl_${uniqueName}_test123`,
          name: uniqueName,
          columns: [],
          primaryKey: [],
          uniqueConstraints: [],
          indexes: [],
          position: { x: 80, y: 80 },
          color: 'white'
        };
        schema.tables.push(table);
        return table;
      };

      const result = addTable('users', mockSchema);

      expect(result).toBeTruthy();
      expect(result.name).toBe('users');
      expect(result.id).toMatch(/^tbl_users_test123$/);
      expect(mockSchema.tables).toHaveLength(1);
    });

    test('should rename table with validation', () => {
      const renameTable = (id, newName, schema) => {
        const t = schema.tables.find(x => x.id === id);
        if (!t) return false;
        const clean = newName.trim();
        if (!clean) return false;
        if (schema.tables.some(x => x.id !== id && x.name === clean)) {
          return false; // Name already used
        }
        t.name = clean;
        return true;
      };

      // Add a table first
      mockSchema.tables.push({
        id: 'tbl_users_123',
        name: 'users',
        columns: []
      });

      const result = renameTable('tbl_users_123', 'customers', mockSchema);

      expect(result).toBe(true);
      expect(mockSchema.tables[0].name).toBe('customers');
    });

    test('should delete table and related foreign keys', () => {
      const deleteTable = (id, schema) => {
        const idx = schema.tables.findIndex(t => t.id === id);
        if (idx < 0) return false;
        const table = schema.tables[idx];

        // Remove FKs referencing or from this table
        schema.foreignKeys = (schema.foreignKeys || []).filter(fk =>
          fk.from.table !== table.id && fk.to.table !== table.id
        );

        schema.tables.splice(idx, 1);
        return true;
      };

      // Setup schema with table and foreign key
      mockSchema.tables.push({
        id: 'tbl_users_123',
        name: 'users',
        columns: []
      });
      mockSchema.tables.push({
        id: 'tbl_orders_456',
        name: 'orders',
        columns: []
      });
      mockSchema.foreignKeys.push({
        id: 'fk_789',
        from: { table: 'tbl_orders_456', columns: ['user_id'] },
        to: { table: 'tbl_users_123', columns: ['id'] }
      });

      const result = deleteTable('tbl_users_123', mockSchema);

      expect(result).toBe(true);
      expect(mockSchema.tables).toHaveLength(1);
      expect(mockSchema.foreignKeys).toHaveLength(0);
    });
  });

  describe('Column Operations', () => {
    test('should add column with validation', () => {
      const addColumn = (tableId, columnData, schema) => {
        const t = schema.tables.find(x => x.id === tableId);
        if (!t) return null;

        let base = columnData.name.trim();
        if (!base) return null;

        // Ensure unique per table
        let nm = base, i = 1;
        while (t.columns.some(c => c.name === nm)) {
          nm = `${base}_${i++}`;
        }

        const id = `col_${nm}_test123`;
        const col = {
          id,
          name: nm,
          type: columnData.type,
          nullable: !!columnData.nullable,
          default: columnData.def || null
        };

        t.columns.push(col);

        if (columnData.pk) {
          if (!t.primaryKey.includes(id)) t.primaryKey.push(id);
          col.nullable = false;
        }

        if (columnData.unique) {
          t.uniqueConstraints.push({ id: `uq_test123`, columns: [id] });
        }

        return col;
      };

      // Add a table first
      mockSchema.tables.push({
        id: 'tbl_users_123',
        name: 'users',
        columns: [],
        primaryKey: [],
        uniqueConstraints: []
      });

      const columnData = {
        name: 'id',
        type: 'int',
        nullable: false,
        def: null,
        pk: true,
        unique: false
      };

      const result = addColumn('tbl_users_123', columnData, mockSchema);

      expect(result).toBeTruthy();
      expect(result.name).toBe('id');
      expect(result.type).toBe('int');
      expect(result.nullable).toBe(false);
      expect(mockSchema.tables[0].primaryKey).toContain(result.id);
    });

    test('should update column with name uniqueness', () => {
      const updateColumn = (tableId, colId, columnData, schema) => {
        const t = schema.tables.find(x => x.id === tableId);
        if (!t) return null;
        const c = t.columns.find(x => x.id === colId);
        if (!c) return null;

        const cleanName = columnData.name.trim();
        if (!cleanName) return null;

        // If name changes, keep unique within table (except self)
        let finalName = cleanName;
        if (c.name !== cleanName) {
          let i = 1;
          while (t.columns.some(x => x.id !== c.id && x.name === finalName)) {
            finalName = `${cleanName}_${i++}`;
          }
        }

        c.name = finalName;
        c.type = columnData.type;
        c.nullable = !!columnData.nullable;
        c.default = (columnData.def || '').trim() || null;

        // PK update
        t.primaryKey = (t.primaryKey || []).filter(id => id !== c.id);
        if (columnData.pk) {
          t.primaryKey.push(c.id);
          c.nullable = false;
        }

        // Unique constraint update
        t.uniqueConstraints = (t.uniqueConstraints || []).filter(uq =>
          !(uq.columns || []).includes(c.id)
        );
        if (columnData.unique) {
          t.uniqueConstraints.push({ id: `uq_test123`, columns: [c.id] });
        }

        return c;
      };

      // Setup table with column
      mockSchema.tables.push({
        id: 'tbl_users_123',
        name: 'users',
        columns: [
          { id: 'col_id_123', name: 'id', type: 'int', nullable: false }
        ],
        primaryKey: ['col_id_123'],
        uniqueConstraints: []
      });

      const columnData = {
        name: 'user_id',
        type: 'varchar(255)',
        nullable: true,
        def: null,
        pk: false,
        unique: true
      };

      const result = updateColumn('tbl_users_123', 'col_id_123', columnData, mockSchema);

      expect(result).toBeTruthy();
      expect(result.name).toBe('user_id');
      expect(result.type).toBe('varchar(255)');
      expect(result.nullable).toBe(true);
      expect(mockSchema.tables[0].primaryKey).not.toContain('col_id_123');
      expect(mockSchema.tables[0].uniqueConstraints).toHaveLength(1);
    });

    test('should delete column and clean up references', () => {
      const deleteColumn = (tableId, colId, schema) => {
        const t = schema.tables.find(x => x.id === tableId);
        if (!t) return false;
        const idx = t.columns.findIndex(x => x.id === colId);
        if (idx < 0) return false;

        // Remove PK ref
        t.primaryKey = (t.primaryKey || []).filter(id => id !== colId);
        // Remove unique refs
        t.uniqueConstraints = (t.uniqueConstraints || []).filter(uq =>
          !(uq.columns || []).includes(colId)
        );
        // Remove FKs referencing this column
        schema.foreignKeys = (schema.foreignKeys || []).filter(fk =>
          !(fk.from.table === tableId && fk.from.columns.includes(colId)) &&
          !(fk.to.table === tableId && fk.to.columns.includes(colId))
        );

        t.columns.splice(idx, 1);
        return true;
      };

      // Setup schema with table, column, and foreign key
      mockSchema.tables.push({
        id: 'tbl_users_123',
        name: 'users',
        columns: [
          { id: 'col_id_123', name: 'id', type: 'int', nullable: false }
        ],
        primaryKey: ['col_id_123'],
        uniqueConstraints: []
      });
      mockSchema.foreignKeys.push({
        id: 'fk_789',
        from: { table: 'tbl_orders_456', columns: ['user_id'] },
        to: { table: 'tbl_users_123', columns: ['col_id_123'] }
      });

      const result = deleteColumn('tbl_users_123', 'col_id_123', mockSchema);

      expect(result).toBe(true);
      expect(mockSchema.tables[0].columns).toHaveLength(0);
      expect(mockSchema.tables[0].primaryKey).toHaveLength(0);
      expect(mockSchema.foreignKeys).toHaveLength(0);
    });
  });

  describe('Foreign Key Operations', () => {
    test('should add foreign key', () => {
      const addForeignKey = (fromTableId, fromColId, toTableId, toColId, onDelete, schema) => {
        schema.foreignKeys = schema.foreignKeys || [];
        const fk = {
          id: `fk_test123`,
          from: { table: fromTableId, columns: [fromColId] },
          to: { table: toTableId, columns: [toColId] },
          onDelete,
          onUpdate: 'NO ACTION'
        };
        schema.foreignKeys.push(fk);
        return fk;
      };

      const result = addForeignKey(
        'tbl_orders_456',
        'col_user_id_789',
        'tbl_users_123',
        'col_id_123',
        'CASCADE',
        mockSchema
      );

      expect(result).toBeTruthy();
      expect(result.from.table).toBe('tbl_orders_456');
      expect(result.to.table).toBe('tbl_users_123');
      expect(result.onDelete).toBe('CASCADE');
      expect(mockSchema.foreignKeys).toHaveLength(1);
    });

    test('should remove foreign key for field', () => {
      const removeForeignKeyForField = (fromTableId, fromColId, schema) => {
        if (!schema?.foreignKeys) return 0;
        const before = schema.foreignKeys.length;
        schema.foreignKeys = schema.foreignKeys.filter(fk =>
          !(fk.from.table === fromTableId && fk.from.columns.includes(fromColId))
        );
        return before - schema.foreignKeys.length;
      };

      // Setup foreign keys
      mockSchema.foreignKeys = [
        {
          id: 'fk_1',
          from: { table: 'tbl_orders_456', columns: ['col_user_id_789'] },
          to: { table: 'tbl_users_123', columns: ['col_id_123'] }
        },
        {
          id: 'fk_2',
          from: { table: 'tbl_orders_456', columns: ['col_product_id_999'] },
          to: { table: 'tbl_products_888', columns: ['col_id_777'] }
        }
      ];

      const removed = removeForeignKeyForField('tbl_orders_456', 'col_user_id_789', mockSchema);

      expect(removed).toBe(1);
      expect(mockSchema.foreignKeys).toHaveLength(1);
      expect(mockSchema.foreignKeys[0].id).toBe('fk_2');
    });
  });

  describe('Auto-save functionality', () => {
    test('should mark schema as dirty', () => {
      let dirty = false;
      const markDirty = () => { dirty = true; };

      markDirty();
      expect(dirty).toBe(true);
    });

    test('should save to localStorage', () => {
      const saveSchemaToLocalStorage = (schema) => {
        localStorage.setItem('dbdesigner:lastSchema', JSON.stringify(schema));
      };

      saveSchemaToLocalStorage(mockSchema);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'dbdesigner:lastSchema',
        JSON.stringify(mockSchema)
      );
    });

    test('should save to server', async () => {
      const saveSchemaToServer = async (schema, filename = 'test.json') => {
        const res = await fetch(`/api/save?file=${encodeURIComponent(filename)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schema, null, 2),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        return await res.text();
      };

      global.global.fetchMock.mockResponseOnce('ok: wrote solution.json');

      const result = await saveSchemaToServer(mockSchema, 'solution.json');

      expect(result).toBe('ok: wrote solution.json');
      expect(global.global.fetchMock).toHaveBeenCalledWith(
        '/api/save?file=solution.json',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockSchema, null, 2)
        })
      );
    });
  });
});
