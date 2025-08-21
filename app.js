// app.js
(function(){
    const status = document.getElementById('status');
    const svg = document.getElementById('diagram');

    // --- Insert a "Save Solution" button dynamically (no HTML change required)
    const sidebar = document.getElementById('sidebar');
    let btnSaveSolution = document.getElementById('btn-save-solution');
    if (!btnSaveSolution && sidebar) {
      const card = document.createElement('section');
      card.className = 'card';
      card.innerHTML = `
        <h2>Save to file</h2>
        <div class="row">
          <button id="btn-save-solution">Save Solution</button>
        </div>
      `;
      sidebar.insertBefore(card, sidebar.firstChild);
      btnSaveSolution = card.querySelector('#btn-save-solution');
    }

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

    // --- id helpers
    const uid = () => Math.random().toString(36).slice(2,9);
    const tblId = name => `tbl_${name}_${uid()}`;
    const colId = name => `col_${name}_${uid()}`;
    const fkId = () => `fk_${uid()}`;

    function setStatus(msg){ status.textContent = msg; }
    function save(){ saveSchemaToLocalStorage(schema); }

    function selectTable(id){
      selectedTableId = id;
      const t = schema.tables.find(x=>x.id===id);
      if (t){
        sectionSelected.hidden = false;
        selTitle.textContent = `Selected: ${t.name}`;
        rtName.value = t.name;
        // update FK dropdowns
        UI.fillColumns(fkFromCol, t);
        UI.fillTables(fkToTable, schema);
        const toTable = schema.tables.find(x=>x.id===fkToTable.value) || schema.tables[0];
        fillToCols(toTable);
      } else {
        sectionSelected.hidden = true;
      }
      Diagram.renderSchema(svg, schema, selectedTableId, selectTable);
    }

    function fillToCols(table){
      UI.fillColumns(fkToCol, table);
    }

    // change target columns list when table changes
    fkToTable.addEventListener('change', ()=>{
      const t = schema.tables.find(x=>x.id===fkToTable.value);
      fillToCols(t);
    });

    // --- CRUD Ops
    function ensureUniqueTableName(name){
      const base=name; let i=1; let nm=base;
      while(schema.tables.some(t=>t.name===nm)){ nm = `${base}_${i++}`; }
      return nm;
    }

    function addTable(name){
      const clean = name.trim();
      if(!clean) return;
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

    function renameTable(id, newName){
      const t = schema.tables.find(x=>x.id===id); if(!t) return;
      const clean = newName.trim(); if(!clean) return;
      // allow rename to same, else ensure uniqueness among others
      if (schema.tables.some(x=>x.id!==id && x.name===clean)) {
        setStatus('Name already used'); return;
      }
      t.name = clean; save(); selectTable(id);
    }

    function deleteTable(id){
      const idx = schema.tables.findIndex(t=>t.id===id); if(idx<0) return;
      const table = schema.tables[idx];
      // remove FKs referencing or from this table
      schema.foreignKeys = (schema.foreignKeys||[]).filter(fk =>
        fk.from.table!==table.id && fk.to.table!==table.id
      );
      schema.tables.splice(idx,1);
      if (selectedTableId===id) selectedTableId=null;
      save(); setStatus('Table deleted'); selectTable(selectedTableId);
    }

    function addColumn(tableId, {name, type, nullable, def, pk, unique}){
      const t = schema.tables.find(x=>x.id===tableId); if(!t) return;
      let base = name.trim(); if(!base) return;
      // ensure unique per table
      let nm=base, i=1;
      while(t.columns.some(c=>c.name===nm)) nm = `${base}_${i++}`;
      const id = colId(nm);
      const col = { id, name:nm, type, nullable:!!nullable, default: def || null };
      t.columns.push(col);
      if(pk){
        if(!t.primaryKey.includes(id)) t.primaryKey.push(id);
        col.nullable = false;
      }
      if(unique){
        t.uniqueConstraints.push({ id: `uq_${uid()}`, columns: [id] });
      }
      save(); selectTable(tableId);
    }

    function addForeignKey(fromTableId, fromColId, toTableId, toColId, onDelete){
      schema.foreignKeys = schema.foreignKeys || [];
      schema.foreignKeys.push({
        id: fkId(),
        from: { table: fromTableId, columns: [fromColId] },
        to: { table: toTableId, columns: [toColId] },
        onDelete, onUpdate: 'NO ACTION'
      });
      save(); selectTable(fromTableId);
    }

    // --- Wire UI
    fNewTable.addEventListener('submit', (e)=>{
      e.preventDefault(); addTable(ntName.value); ntName.value='';
    });

    fRename.addEventListener('submit', (e)=>{
      e.preventDefault(); if(!selectedTableId) return; renameTable(selectedTableId, rtName.value);
    });

    btnDelTable.addEventListener('click', ()=>{
      if(!selectedTableId) return;
      if(confirm('Delete this table? This will also remove related foreign keys.')) deleteTable(selectedTableId);
    });

    fNewCol.addEventListener('submit', (e)=>{
      e.preventDefault();
      if(!selectedTableId) return;
      addColumn(selectedTableId, {
        name: ncName.value,
        type: ncType.value,
        nullable: ncNullable.checked,
        def: (ncDefault.value || '').trim() || null,
        pk: ncPK.checked,
        unique: ncUnique.checked
      });
      // reset a bit
      ncName.value=''; ncPK.checked=false; ncUnique.checked=false; ncNullable.checked=false; ncDefault.value='';
    });

    fNewFK.addEventListener('submit', (e)=>{
      e.preventDefault();
      if(!selectedTableId) return;
      const fromCol = fkFromCol.value;
      const toTbl = fkToTable.value;
      const toCol = fkToCol.value;
      if(!fromCol || !toTbl || !toCol) return;
      addForeignKey(selectedTableId, fromCol, toTbl, toCol, fkOnDelete.value || 'NO ACTION');
    });

    // click empty canvas to clear selection
    svg.addEventListener('click', ()=>{ selectTable(null); });

    // "Save Solution" -> write to local file solution.json via local server (no download)
    if (btnSaveSolution) {
      btnSaveSolution.addEventListener('click', async ()=>{
        if (!schema) return;
        try {
          // Post directly to the local server. Requires server.py to accept ?file=solution.json
          const res = await fetch('/api/save?file=solution.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schema, null, 2),
          });
          if (!res.ok) throw new Error(`Save failed: ${res.status}`);
          setStatus('Saved to solution.json');
        } catch (e) {
          console.error(e);
          setStatus('Save failed (solution.json)');
        }
      });
    }

    // --- boot
    (async function init(){
      try {
        schema = loadSchemaFromLocalStorage() || await loadSchemaFromFile('test.json');
        schema.foreignKeys = schema.foreignKeys || [];
        setStatus(`Loaded: ${schema.name}`);
        save();

        Diagram.renderSchema(svg, schema, selectedTableId, selectTable);
        Diagram.enableDragging(svg, schema, save, () => selectedTableId);

        // Pre-populate FK target selects
        UI.fillTables(fkToTable, schema);
        const first = schema.tables[0];
        if (first) { selectTable(first.id); } else { sectionSelected.hidden = true; }
      } catch (e) {
        console.error(e); setStatus('Failed to load schema.');
      }
    })();
  })();
