// io.js
async function loadSchemaFromFile(path = 'test.json') {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return await res.json();
  }

  function saveSchemaToLocalStorage(schema) {
    localStorage.setItem('dbdesigner:lastSchema', JSON.stringify(schema));
  }
  function loadSchemaFromLocalStorage() {
    const raw = localStorage.getItem('dbdesigner:lastSchema');
    return raw ? JSON.parse(raw) : null;
  }

  // UPDATED: allow choosing the target file (defaults to test.json)
  async function saveSchemaToServer(schema, filename = 'test.json') {
    const res = await fetch(`/api/save?file=${encodeURIComponent(filename)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schema, null, 2),
    });
    if (!res.ok) throw new Error(`Save failed: ${res.status}`);
    return await res.text();
  }

  window.saveSchemaToServer = saveSchemaToServer; // (optional) expose to console
