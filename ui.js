// ui.js
const TYPES = [
    'int','bigint','decimal(10,2)','varchar(255)','text','date','timestamp','boolean'
  ];

  function fillTypeOptions(select){
    select.innerHTML = '';
    TYPES.forEach(t => {
      const opt = document.createElement('option'); opt.value = t; opt.textContent = t;
      select.appendChild(opt);
    });
  }

  function fillColumns(select, table){
    select.innerHTML = '';
    (table?.columns||[]).forEach(c=>{
      const o=document.createElement('option'); o.value=c.id; o.textContent=`${c.name}`;
      select.appendChild(o);
    });
  }

  function fillTables(select, schema){
    select.innerHTML = '';
    schema.tables.forEach(t=>{
      const o=document.createElement('option'); o.value=t.id; o.textContent=t.name;
      select.appendChild(o);
    });
  }

  window.UI = { fillTypeOptions, fillColumns, fillTables, TYPES };
