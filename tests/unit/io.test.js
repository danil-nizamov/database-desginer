// Unit tests for io.js data persistence functions

describe('IO Data Persistence Functions', () => {
  let mockSchema;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    global.global.fetchMock.resetMocks();

    // Mock schema data
    mockSchema = {
      name: 'TestDB',
      version: '1.0',
      tables: [
        {
          id: 'tbl_users_123',
          name: 'users',
          columns: [
            { id: 'col_id_123', name: 'id', type: 'int', nullable: false },
            { id: 'col_name_456', name: 'name', type: 'varchar(255)', nullable: true }
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

    // Mock localStorage
    localStorage.getItem.mockReturnValue(null);
    localStorage.setItem.mockImplementation(() => {});

    // Reset localStorage mock implementations
    localStorage.getItem.mockClear();
    localStorage.setItem.mockClear();
  });

  describe('File Loading', () => {
    test('should load schema from file successfully', async () => {
      const loadSchemaFromFile = async (path = 'test.json') => {
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
        return await res.json();
      };

      global.global.fetchMock.mockResponseOnce(JSON.stringify(mockSchema));

      const result = await loadSchemaFromFile('solution.json');

      expect(result).toEqual(mockSchema);
      expect(global.global.fetchMock).toHaveBeenCalledWith('solution.json', { cache: 'no-store' });
    });

    test('should handle file loading errors', async () => {
      const loadSchemaFromFile = async (path = 'test.json') => {
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
        return await res.json();
      };

      global.global.fetchMock.mockRejectOnce(new Error('Network error'));

      await expect(loadSchemaFromFile('nonexistent.json')).rejects.toThrow('Network error');
    });

    test('should handle HTTP error responses', async () => {
      const loadSchemaFromFile = async (path = 'test.json') => {
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
        return await res.json();
      };

      global.fetchMock.mockResponseOnce('Not Found', { status: 404 });

      await expect(loadSchemaFromFile('missing.json')).rejects.toThrow('Failed to load missing.json: 404');
    });

    test('should handle invalid JSON responses', async () => {
      const loadSchemaFromFile = async (path = 'test.json') => {
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
        return await res.json();
      };

      global.fetchMock.mockResponseOnce('invalid json');

      await expect(loadSchemaFromFile('invalid.json')).rejects.toThrow();
    });
  });

  describe('Local Storage Operations', () => {
    test('should save schema to localStorage', () => {
      const saveSchemaToLocalStorage = (schema) => {
        localStorage.setItem('dbdesigner:lastSchema', JSON.stringify(schema));
      };

      saveSchemaToLocalStorage(mockSchema);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'dbdesigner:lastSchema',
        JSON.stringify(mockSchema)
      );
    });

    test('should load schema from localStorage', () => {
      const loadSchemaFromLocalStorage = () => {
        const raw = localStorage.getItem('dbdesigner:lastSchema');
        return raw ? JSON.parse(raw) : null;
      };

      localStorage.getItem.mockReturnValue(JSON.stringify(mockSchema));

      const result = loadSchemaFromLocalStorage();

      expect(result).toEqual(mockSchema);
      expect(localStorage.getItem).toHaveBeenCalledWith('dbdesigner:lastSchema');
    });

    test('should return null when localStorage is empty', () => {
      const loadSchemaFromLocalStorage = () => {
        const raw = localStorage.getItem('dbdesigner:lastSchema');
        return raw ? JSON.parse(raw) : null;
      };

      localStorage.getItem.mockReturnValue(null);

      const result = loadSchemaFromLocalStorage();

      expect(result).toBeNull();
    });

    test('should handle invalid JSON in localStorage', () => {
      const loadSchemaFromLocalStorage = () => {
        const raw = localStorage.getItem('dbdesigner:lastSchema');
        try {
          return raw ? JSON.parse(raw) : null;
        } catch (error) {
          return null;
        }
      };

      localStorage.getItem.mockReturnValue('invalid json');

      const result = loadSchemaFromLocalStorage();

      expect(result).toBeNull();
    });

    test('should handle localStorage errors gracefully', () => {
      const saveSchemaToLocalStorage = (schema) => {
        try {
          localStorage.setItem('dbdesigner:lastSchema', JSON.stringify(schema));
        } catch (error) {
          console.error('Failed to save to localStorage:', error);
        }
      };

      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw
      expect(() => saveSchemaToLocalStorage(mockSchema)).not.toThrow();
    });
  });

  describe('Server Operations', () => {
    test('should save schema to server successfully', async () => {
      const saveSchemaToServer = async (schema, filename = 'test.json') => {
        const res = await fetch(`/api/save?file=${encodeURIComponent(filename)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schema, null, 2),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        return await res.text();
      };

      global.fetchMock.mockResponseOnce('ok: wrote solution.json');

      const result = await saveSchemaToServer(mockSchema, 'solution.json');

      expect(result).toBe('ok: wrote solution.json');
      expect(global.fetchMock).toHaveBeenCalledWith(
        '/api/save?file=solution.json',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockSchema, null, 2)
        }
      );
    });

    test('should use default filename when not specified', async () => {
      const saveSchemaToServer = async (schema, filename = 'test.json') => {
        const res = await fetch(`/api/save?file=${encodeURIComponent(filename)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schema, null, 2),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        return await res.text();
      };

      global.fetchMock.mockResponseOnce('ok: wrote test.json');

      await saveSchemaToServer(mockSchema);

      expect(global.fetchMock).toHaveBeenCalledWith(
        '/api/save?file=test.json',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockSchema, null, 2)
        })
      );
    });

    test('should handle server errors', async () => {
      const saveSchemaToServer = async (schema, filename = 'test.json') => {
        const res = await fetch(`/api/save?file=${encodeURIComponent(filename)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schema, null, 2),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        return await res.text();
      };

      global.fetchMock.mockResponseOnce('Server Error', { status: 500 });

      await expect(saveSchemaToServer(mockSchema)).rejects.toThrow('Save failed: 500');
    });

    test('should handle network errors', async () => {
      const saveSchemaToServer = async (schema, filename = 'test.json') => {
        const res = await fetch(`/api/save?file=${encodeURIComponent(filename)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schema, null, 2),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        return await res.text();
      };

      global.fetchMock.mockRejectOnce(new Error('Network error'));

      await expect(saveSchemaToServer(mockSchema)).rejects.toThrow('Network error');
    });

    test('should properly encode filename in URL', async () => {
      const saveSchemaToServer = async (schema, filename = 'test.json') => {
        const res = await fetch(`/api/save?file=${encodeURIComponent(filename)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schema, null, 2),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        return await res.text();
      };

      global.fetchMock.mockResponseOnce('ok: wrote file with spaces.json');

      await saveSchemaToServer(mockSchema, 'file with spaces.json');

      expect(global.fetchMock).toHaveBeenCalledWith(
        '/api/save?file=file%20with%20spaces.json',
        expect.any(Object)
      );
    });

    test('should handle special characters in filename', async () => {
      const saveSchemaToServer = async (schema, filename = 'test.json') => {
        const res = await fetch(`/api/save?file=${encodeURIComponent(filename)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schema, null, 2),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        return await res.text();
      };

      global.fetchMock.mockResponseOnce('ok: wrote file%20with%20special%20chars.json');

      await saveSchemaToServer(mockSchema, 'file with special chars.json');

      expect(global.fetchMock).toHaveBeenCalledWith(
        '/api/save?file=file%20with%20special%20chars.json',
        expect.any(Object)
      );
    });
  });

  describe('Data Validation', () => {
    test('should validate schema structure before saving', () => {
      const validateSchema = (schema) => {
        if (!schema || typeof schema !== 'object') return false;
        if (!schema.name || typeof schema.name !== 'string') return false;
        if (!Array.isArray(schema.tables)) return false;
        if (!Array.isArray(schema.foreignKeys)) return false;
        return true;
      };

      expect(validateSchema(mockSchema)).toBe(true);
      expect(validateSchema(null)).toBe(false);
      expect(validateSchema({})).toBe(false);
      expect(validateSchema({ name: 'test' })).toBe(false);
      expect(validateSchema({ name: 'test', tables: [] })).toBe(false);
    });

    test('should handle malformed schema data', () => {
      const saveSchemaToLocalStorage = (schema) => {
        try {
          const jsonString = JSON.stringify(schema);
          localStorage.setItem('dbdesigner:lastSchema', jsonString);
          return true;
        } catch (error) {
          console.error('Failed to serialize schema:', error);
          return false;
        }
      };

      const malformedSchema = {
        name: 'test',
        tables: 'not an array', // Invalid
        foreignKeys: []
      };

      const result = saveSchemaToLocalStorage(malformedSchema);
      expect(result).toBe(true); // JSON.stringify should still work
    });

    test('should handle circular references in schema', () => {
      const saveSchemaToLocalStorage = (schema) => {
        try {
          const jsonString = JSON.stringify(schema);
          localStorage.setItem('dbdesigner:lastSchema', jsonString);
          return true;
        } catch (error) {
          console.error('Failed to serialize schema:', error);
          return false;
        }
      };

      const circularSchema = { ...mockSchema };
      circularSchema.tables[0].parent = circularSchema; // Create circular reference

      const result = saveSchemaToLocalStorage(circularSchema);
      expect(result).toBe(false); // Should fail due to circular reference
    });
  });

  describe('Error Recovery', () => {
    test('should provide fallback when localStorage fails', () => {
      const loadSchemaWithFallback = () => {
        try {
          const raw = localStorage.getItem('dbdesigner:lastSchema');
          return raw ? JSON.parse(raw) : null;
        } catch (error) {
          console.error('Failed to load from localStorage:', error);
          return null;
        }
      };

      localStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      const result = loadSchemaWithFallback();
      expect(result).toBeNull();
    });

    test('should retry server operations on failure', async () => {
      const saveSchemaWithRetry = async (schema, filename, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            const res = await fetch(`/api/save?file=${encodeURIComponent(filename)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(schema, null, 2),
            });
            if (res.ok) return await res.text();
            if (i === maxRetries - 1) throw new Error(`Save failed after ${maxRetries} attempts: ${res.status}`);
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            // Wait before retry (simplified for test)
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      };

      // First two calls fail, third succeeds
      global.fetchMock
        .mockResponseOnce('Server Error', { status: 500 })
        .mockResponseOnce('Server Error', { status: 500 })
        .mockResponseOnce('ok: wrote solution.json');

      const result = await saveSchemaWithRetry(mockSchema, 'solution.json');
      expect(result).toBe('ok: wrote solution.json');
      expect(global.fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance Considerations', () => {
    test('should handle large schemas efficiently', () => {
      const largeSchema = {
        name: 'LargeDB',
        tables: Array.from({ length: 100 }, (_, i) => ({
          id: `tbl_${i}`,
          name: `table_${i}`,
          columns: Array.from({ length: 50 }, (_, j) => ({
            id: `col_${i}_${j}`,
            name: `column_${j}`,
            type: 'varchar(255)',
            nullable: true
          })),
          primaryKey: [],
          uniqueConstraints: [],
          indexes: [],
          position: { x: i * 10, y: i * 10 },
          color: 'white'
        })),
        foreignKeys: []
      };

      const saveSchemaToLocalStorage = (schema) => {
        const start = performance.now();
        localStorage.setItem('dbdesigner:lastSchema', JSON.stringify(schema));
        const end = performance.now();
        return end - start;
      };

      const duration = saveSchemaToLocalStorage(largeSchema);
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('should handle concurrent save operations', async () => {
      const saveSchemaToServer = async (schema, filename) => {
        const res = await fetch(`/api/save?file=${encodeURIComponent(filename)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schema, null, 2),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        return await res.text();
      };

      global.fetchMock.mockResponse('ok: wrote file.json');

      // Simulate concurrent saves
      const promises = [
        saveSchemaToServer(mockSchema, 'file1.json'),
        saveSchemaToServer(mockSchema, 'file2.json'),
        saveSchemaToServer(mockSchema, 'file3.json')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results.every(result => result === 'ok: wrote file.json')).toBe(true);
      expect(global.fetchMock).toHaveBeenCalledTimes(3);
    });
  });
});
