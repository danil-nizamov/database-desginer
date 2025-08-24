// app.js
(function () {
    const status = document.getElementById('status');
    const svg = document.getElementById('diagram');

    // Hide any existing "Save solution" buttons in the host page (header or sidebar),
    // since saves are automatic now.
    const headerSaveBtn = document.getElementById('btn-save-solution');
    if (headerSaveBtn) headerSaveBtn.style.display = 'none';

    // sidebar controls
    const sectionSelected = document.getElementById('section-selected');
    const selTitle = document.getElementById('sel-title');
    const btnDelTable = document.getElementById('btn-del-table');

    const fNewTable = document.getElementById('form-new-table');
    const ntName = document.getElementById('nt-name');

    const fRename = document.getElementById('form-rename-table');
    const rtName = document.getElementById('rt-name');

    const fNewCol = document.getElementById('form-new-col');
    const ncName = document.getElementById('nc-name');
    const ncType = document.getElementById('nc-type');
    const ncNullable = document.getElementById('nc-nullable');
    const ncDefault = document.getElementById('nc-default');
    const ncPK = document.getElementById('nc-pk');
    const ncUnique = document.getElementById('nc-unique');

    const fNewFK = document.getElementById('form-new-fk');
    const fkFromCol = document.getElementById('fk-from-col');
    const fkToTable = document.getElementById('fk-to-table');
    const fkToCol = document.getElementById('fk-to-col');
    const fkOnDelete = document.getElementById('fk-ondelete');

    UI.fillTypeOptions(ncType);

    let schema = null;
    let selectedTableId = null;
    let selectedColId = null;

    // --- id helpers
    const uid = () => Math.random().toString(36).slice(2, 9);
    const tblId = name => `tbl_${name}_${uid()}`;
    const colId = name => `col_${name}_${uid()}`;
    const fkId = () => `fk_${uid()}`;

    function setStatus(msg) { status.textContent = msg; }

    /* --------------------------------
       Auto-save every second to server
       -------------------------------- */
    let dirty = false;
    let lastSent = 0;

    function markDirty() { dirty = true; }

    // save to localStorage immediately; autosave loop will flush to server
    function save() {
      saveSchemaToLocalStorage(schema);
      markDirty();
    }

    setInterval(async () => {
      if (!schema) return;
      const now = Date.now();
      if (!dirty || now - lastSent < 1000) return;
      try {
        await saveSchemaToServer(schema, 'solution.json');
        lastSent = now; dirty = false;
        setStatus('Auto-saved to solution.json');
      } catch (e) {
        // Ignore transient failures; we'll retry next tick
        console.error(e);
        setStatus('Auto-save failed (will retry)');
      }
    }, 250); // check 4x per second; flush at >=1s since last send

    /* --------------------------------
       Selection & UI
       -------------------------------- */
    function selectTable(id) {
      selectedTableId = id;
      selectedColId = null; // clear column selection
      const t = schema.tables.find(x => x.id === id);
      if (t) {
        sectionSelected.hidden = false;
        selTitle.textContent = `Selected: ${t.name}`;
        rtName.value = t.name;
        // update FK dropdowns
        UI.fillColumns(fkFromCol, t);
        UI.fillTables(fkToTable, schema);
        const toTable = schema.tables.find(x => x.id === fkToTable.value) || schema.tables[0];
        fillToCols(toTable);
      } else {
        sectionSelected.hidden = true;
      }
      Diagram.renderSchema(svg, schema, selectedTableId, selectTable, selectColumn);
    }

    function selectColumn(tableId, colId) {
      if (!tableId || !colId) return;
      selectedTableId = tableId;
      selectedColId = colId;
      const t = schema.tables.find(x => x.id === tableId);
      const c = t?.columns.find(x => x.id === colId);
      if (!t || !c) return;
      // ensure correct table is selected in UI and FK lists
      UI.fillColumns(fkFromCol, t);
      UI.fillTables(fkToTable, schema);
      const toTable = schema.tables.find(x => x.id === fkToTable.value) || schema.tables[0];
      fillToCols(toTable);

      // Load values into the "Add Field" form to EDIT
      ncName.value = c.name;
      ncType.value = UI.TYPES.includes(c.type) ? c.type : UI.TYPES[0];
      ncNullable.checked = !!c.nullable;
      ncDefault.value = c.default ?? '';
      ncPK.checked = (t.primaryKey || []).includes(c.id);
      ncUnique.checked = !!(t.uniqueConstraints || []).some(uq => (uq.columns || []).includes(c.id));
      // Switch buttons to edit mode label
      btnAddOrUpdateCol.textContent = 'Save Field';
      btnDeleteCol.removeAttribute('hidden');

      selTitle.textContent = `Selected: ${t.name} • Editing field "${c.name}"`;
      Diagram.renderSchema(svg, schema, selectedTableId, selectTable, selectColumn);
    }

    function fillToCols(table) {
      UI.fillColumns(fkToCol, table);
    }

    // change target columns list when table changes
    fkToTable.addEventListener('change', () => {
      const t = schema.tables.find(x => x.id === fkToTable.value);
      fillToCols(t);
    });

    // --- CRUD Ops
    function ensureUniqueTableName(name) {
      const base = name; let i = 1; let nm = base;
      while (schema.tables.some(t => t.name === nm)) { nm = `${base}_${i++}`; }
      return nm;
    }

    function addTable(name) {
      const clean = name.trim();
      if (!clean) return;
      const uniqueName = ensureUniqueTableName(clean);
      const t = {
        id: tblId(uniqueName),
        name: uniqueName,
        columns: [],
        primaryKey: [],
        uniqueConstraints: [],
        indexes: [],
        position: { x: 80 + 40 * schema.tables.length, y: 80 + 40 * schema.tables.length }
      };
      schema.tables.push(t);
      save(); setStatus(`Added table "${uniqueName}"`);
      selectTable(t.id);
    }

    function renameTable(id, newName) {
      const t = schema.tables.find(x => x.id === id); if (!t) return;
      const clean = newName.trim(); if (!clean) return;
      if (schema.tables.some(x => x.id !== id && x.name === clean)) {
        setStatus('Name already used'); return;
      }
      t.name = clean; save(); selectTable(id);
    }

    function deleteTable(id) {
      const idx = schema.tables.findIndex(t => t.id === id); if (idx < 0) return;
      const table = schema.tables[idx];
      // remove FKs referencing or from this table
      schema.foreignKeys = (schema.foreignKeys || []).filter(fk =>
        fk.from.table !== table.id && fk.to.table !== table.id
      );
      schema.tables.splice(idx, 1);
      if (selectedTableId === id) { selectedTableId = null; selectedColId = null; }
      save(); setStatus('Table deleted'); selectTable(selectedTableId);
    }

    function addColumn(tableId, { name, type, nullable, def, pk, unique }) {
      const t = schema.tables.find(x => x.id === tableId); if (!t) return;
      let base = name.trim(); if (!base) return;
      // ensure unique per table
      let nm = base, i = 1;
      while (t.columns.some(c => c.name === nm)) nm = `${base}_${i++}`;
      const id = colId(nm);
      const col = { id, name: nm, type, nullable: !!nullable, default: def || null };
      t.columns.push(col);
      if (pk) {
        if (!t.primaryKey.includes(id)) t.primaryKey.push(id);
        col.nullable = false;
      }
      if (unique) {
        t.uniqueConstraints.push({ id: `uq_${uid()}`, columns: [id] });
      }
      save(); selectTable(tableId);
    }

    function updateColumn(tableId, colId, { name, type, nullable, def, pk, unique }) {
      const t = schema.tables.find(x => x.id === tableId); if (!t) return;
      const c = t.columns.find(x => x.id === colId); if (!c) return;
      const cleanName = name.trim(); if (!cleanName) return;

      // if name changes, keep unique within table (except self)
      let finalName = cleanName;
      if (c.name !== cleanName) {
        let i = 1;
        while (t.columns.some(x => x.id !== c.id && x.name === finalName)) finalName = `${cleanName}_${i++}`;
      }
      c.name = finalName;
      c.type = type;
      c.nullable = !!nullable;
      c.default = (def || '').trim() || null;

      // PK update
      t.primaryKey = (t.primaryKey || []).filter(id => id !== c.id);
      if (pk) {
        t.primaryKey.push(c.id);
        c.nullable = false;
      }

      // Unique (single-column UQs only here)
      t.uniqueConstraints = (t.uniqueConstraints || []).filter(uq => !(uq.columns || []).includes(c.id));
      if (unique) {
        t.uniqueConstraints.push({ id: `uq_${uid()}`, columns: [c.id] });
      }

      save(); selectColumn(tableId, colId);
    }

    function deleteColumn(tableId, colId) {
      const t = schema.tables.find(x => x.id === tableId); if (!t) return;
      const idx = t.columns.findIndex(x => x.id === colId); if (idx < 0) return;

      // remove PK ref
      t.primaryKey = (t.primaryKey || []).filter(id => id !== colId);
      // remove unique refs
      t.uniqueConstraints = (t.uniqueConstraints || []).filter(uq => !(uq.columns || []).includes(colId));
      // remove FKs referencing this column
      schema.foreignKeys = (schema.foreignKeys || []).filter(fk =>
        !(fk.from.table === tableId && fk.from.columns.includes(colId)) &&
        !(fk.to.table === tableId && fk.to.columns.includes(colId))
      );
      t.columns.splice(idx, 1);
      selectedColId = null;
      save(); selectTable(tableId);
    }

    function addForeignKey(fromTableId, fromColId, toTableId, toColId, onDelete) {
      schema.foreignKeys = schema.foreignKeys || [];
      schema.foreignKeys.push({
        id: fkId(),
        from: { table: fromTableId, columns: [fromColId] },
        to: { table: toTableId, columns: [toColId] },
        onDelete, onUpdate: 'NO ACTION'
      });
      save(); selectTable(fromTableId);
    }

    // --- Wire UI (tables)
    fNewTable.addEventListener('submit', (e) => {
      e.preventDefault(); addTable(ntName.value); ntName.value = '';
    });

    fRename.addEventListener('submit', (e) => {
      e.preventDefault(); if (!selectedTableId) return; renameTable(selectedTableId, rtName.value);
    });

    btnDelTable.addEventListener('click', () => {
      if (!selectedTableId) return;
      if (confirm('Delete this table? This will also remove related foreign keys.')) deleteTable(selectedTableId);
    });

    // --- FIELD form: we’ll dynamically add an "Update/Delete" UX without changing HTML
    const btnRow = document.createElement('div');
    btnRow.className = 'row';
    const btnAddOrUpdateCol = document.createElement('button');
    btnAddOrUpdateCol.type = 'submit';
    btnAddOrUpdateCol.textContent = 'Add Field'; // flips to "Save Field" in edit mode
    const btnDeleteCol = document.createElement('button');
    btnDeleteCol.type = 'button';
    btnDeleteCol.className = 'danger';
    btnDeleteCol.textContent = 'Delete Field';
    btnDeleteCol.hidden = true; // only visible when editing
    btnRow.appendChild(btnAddOrUpdateCol);
    btnRow.appendChild(btnDeleteCol);
    fNewCol.appendChild(btnRow);

    fNewCol.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!selectedTableId) return;
      const data = {
        name: ncName.value,
        type: ncType.value,
        nullable: ncNullable.checked,
        def: (ncDefault.value || '').trim() || null,
        pk: ncPK.checked,
        unique: ncUnique.checked
      };
      if (selectedColId) {
        updateColumn(selectedTableId, selectedColId, data);
      } else {
        addColumn(selectedTableId, data);
      }
      // reset a bit (back to "add" mode)
      clearFieldForm();
    });

    btnDeleteCol.addEventListener('click', () => {
      if (!selectedTableId || !selectedColId) return;
      if (confirm('Delete this field? This also removes related constraints/keys.')) {
        deleteColumn(selectedTableId, selectedColId);
        clearFieldForm();
      }
    });

    function clearFieldForm() {
      selectedColId = null;
      ncName.value = '';
      ncPK.checked = false; ncUnique.checked = false; ncNullable.checked = false; ncDefault.value = '';
      btnAddOrUpdateCol.textContent = 'Add Field';
      btnDeleteCol.hidden = true;
    }

    // --- FK form
    fNewFK.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!selectedTableId) return;
      const fromCol = fkFromCol.value;
      const toTbl = fkToTable.value;
      const toCol = fkToCol.value;
      if (!fromCol || !toTbl || !toCol) return;
      addForeignKey(selectedTableId, fromCol, toTbl, toCol, fkOnDelete.value || 'NO ACTION');
    });

    // click empty canvas to clear selection (and exit column edit mode)
    svg.addEventListener('click', () => { selectTable(null); clearFieldForm(); });

    // --- boot
    (async function init() {
      try {
        schema = loadSchemaFromLocalStorage() || await loadSchemaFromFile('../.codesignal/initial_state.json');
        schema.foreignKeys = schema.foreignKeys || [];
        setStatus(`Loaded: ${schema.name}`);
        save();

        // Render & interactions
        Diagram.renderSchema(svg, schema, selectedTableId, selectTable, selectColumn);
        Diagram.enableDragging(svg, schema, save, () => selectedTableId);
        Diagram.enablePanZoom(svg, () => { /* persist view? not necessary */ });

        // Pre-populate FK target selects
        UI.fillTables(fkToTable, schema);
        const first = schema.tables[0];
        if (first) { selectTable(first.id); } else { sectionSelected.hidden = true; }
      } catch (e) {
        console.error(e); setStatus('Failed to load schema.');
      }
    })();
  })();
