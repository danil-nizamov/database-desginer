// diagram.js
const DIAGRAM = { NODE_WIDTH: 240, ROW_H: 22, PADDING_X: 10, HEADER_H: 28, GAP: 8 };

function clearDiagram(svg){ while(svg.firstChild) svg.removeChild(svg.firstChild); }
function createSvg(tag, attrs={}){ const el=document.createElementNS('http://www.w3.org/2000/svg',tag); for(const[k,v] of Object.entries(attrs)) el.setAttribute(k,String(v)); return el; }
function tableGeometry(table){ const rows=table.columns.length; const height=DIAGRAM.HEADER_H+DIAGRAM.GAP+rows*DIAGRAM.ROW_H+DIAGRAM.GAP; const width=DIAGRAM.NODE_WIDTH; const {x,y}=table.position||{x:50,y:50}; return {x,y,width,height,rows}; }
function columnCenterY(table,colId){ const {y}=tableGeometry(table); const idx=table.columns.findIndex(c=>c.id===colId); const base=y+DIAGRAM.HEADER_H+DIAGRAM.GAP+DIAGRAM.ROW_H/2; return base+idx*DIAGRAM.ROW_H; }

function renderTable(svg, table, schema, selectedId, onSelect){
  const g=createSvg('g',{class:`table${table.id===selectedId?' selected':''}`,'data-id':table.id});
  const {x,y,width,height}=tableGeometry(table);

  // MAIN BOX (no longer a drag handle — selection only)
  const rect=createSvg('rect',{x,y,rx:8,ry:8,width,height,fill:'#fff',stroke:'#ccc',class:'table-box'});
  g.appendChild(rect);

  // TITLE (selection only)
  const title=createSvg('text',{x:x+DIAGRAM.PADDING_X,y:y+DIAGRAM.HEADER_H/2,class:'table-title','dominant-baseline':'middle'});
  title.textContent=table.name; g.appendChild(title);

  // HEADER SEPARATOR
  g.appendChild(createSvg('line',{x1:x,y1:y+DIAGRAM.HEADER_H,x2:x+width,y2:y+DIAGRAM.HEADER_H,stroke:'#e4e4e8'}));

  // DRAG BUTTON (the ONLY drag handle)
  const btnSize = 16;
  const hx = x + width - DIAGRAM.PADDING_X - btnSize;
  const hy = y + (DIAGRAM.HEADER_H - btnSize) / 2;

  const dragBtn = createSvg('g', { class: 'drag-button drag-handle', transform: `translate(${hx},${hy})`, role: 'button' });

  // button background
  dragBtn.appendChild(createSvg('rect', { width: btnSize, height: btnSize, rx: 4, ry: 4, class: 'drag-btn-bg' }));
  // 6-dot "grip"
  [[4,5],[8,5],[12,5],[4,10],[8,10],[12,10]].forEach(([cx,cy])=>{
    dragBtn.appendChild(createSvg('circle',{cx,cy,r:1.3,class:'drag-btn-dot'}));
  });

  // Prevent clicks on the drag button from selecting the table
  dragBtn.addEventListener('click', (e)=>{ e.stopPropagation(); });

  g.appendChild(dragBtn);

  // COLUMNS
  table.columns.forEach((col,i)=>{
    const cy=y+DIAGRAM.HEADER_H+DIAGRAM.GAP+i*DIAGRAM.ROW_H+DIAGRAM.ROW_H/2;
    const isPK=(table.primaryKey||[]).includes(col.id);
    const isFK=(schema.foreignKeys||[]).some(fk=>
      (fk.from.table===table.id && fk.from.columns.includes(col.id)) ||
      (fk.to.table===table.id && fk.to.columns.includes(col.id))
    );
    const prefix=`${isPK?'🔑 ':''}${isFK?'🔗 ':''}`;
    const t=createSvg('text',{x:x+DIAGRAM.PADDING_X,y:cy,class:'col-text','dominant-baseline':'middle'});
    t.textContent=`${prefix}${col.name}: ${col.type}${col.nullable?'':' NOT NULL'}`;
    g.appendChild(t);
  });

  // selection (click anywhere on the group EXCEPT the drag button)
  g.addEventListener('click', (e)=>{ onSelect && onSelect(table.id); e.stopPropagation(); });

  svg.appendChild(g);
}

function ensureArrowMarker(svg){
  let defs=svg.querySelector('defs'); if(!defs){defs=createSvg('defs'); svg.appendChild(defs);}
  if(svg.querySelector('#arrow')) return;
  const marker=createSvg('marker',{id:'arrow',markerWidth:10,markerHeight:7,refX:10,refY:3.5,orient:'auto',markerUnits:'strokeWidth'});
  marker.appendChild(createSvg('path',{d:'M0,0 L10,3.5 L0,7 z',class:'edge-marker'}));
  defs.appendChild(marker);
}

function renderEdge(svg, fk, schema){
  const fromTable=schema.tables.find(t=>t.id===fk.from.table);
  const toTable=schema.tables.find(t=>t.id===fk.to.table);
  if(!fromTable||!toTable) return;
  const fromCol=fk.from.columns[0], toCol=fk.to.columns[0];
  const fromY=columnCenterY(fromTable,fromCol), toY=columnCenterY(toTable,toCol);
  const fromX=(fromTable.position?.x||0)+DIAGRAM.NODE_WIDTH, toX=(toTable.position?.x||0);
  const dx=Math.max(40,Math.abs(toX-fromX)/3);
  const d=`M ${fromX},${fromY} C ${fromX+dx},${fromY} ${toX-dx},${toY} ${toX},${toY}`;
  svg.appendChild(createSvg('path',{d,class:'edge','marker-end':'url(#arrow)'}));
}

function renderSchema(svg, schema, selectedId, onSelect){
  clearDiagram(svg); ensureArrowMarker(svg);
  schema.tables.forEach(t=>renderTable(svg,t,schema,selectedId,onSelect));
  (schema.foreignKeys||[]).forEach(fk=>renderEdge(svg,fk,schema));
}

/* --- dragging: now ONLY starts when the drag button (drag-handle) is used --- */
function clientToSvgPoint(svg, clientX, clientY){ const pt=svg.createSVGPoint(); pt.x=clientX; pt.y=clientY; const ctm=svg.getScreenCTM(); return ctm?pt.matrixTransform(ctm.inverse()):{x:clientX,y:clientY}; }
function enableDragging(svg, schema, onChange, getSelectedId){
  const drag={active:false,id:null,offsetX:0,offsetY:0,pointerId:null};

  svg.addEventListener('pointerdown',(e)=>{
    // Only start drag if the pointer originated on (or within) an element with .drag-handle
    const target = (e.target instanceof Element) ? e.target.closest('.drag-handle') : null;
    if(!target) return;

    const group = target.closest('g.table'); if(!group) return;
    const tableId = group.getAttribute('data-id'); const table=schema.tables.find(t=>t.id===tableId); if(!table) return;

    const {x:sx,y:sy}=clientToSvgPoint(svg,e.clientX,e.clientY); const {x,y}=table.position||{x:0,y:0};
    drag.active=true; drag.id=tableId; drag.offsetX=sx-x; drag.offsetY=sy-y; drag.pointerId=e.pointerId; svg.setPointerCapture(e.pointerId);

    // prevent selection click when using the drag handle
    e.stopPropagation();
    e.preventDefault();
  });

  svg.addEventListener('pointermove',(e)=>{
    if(!drag.active||drag.pointerId!==e.pointerId) return;
    const table=schema.tables.find(t=>t.id===drag.id); if(!table) return;
    const {x:sx,y:sy}=clientToSvgPoint(svg,e.clientX,e.clientY);
    table.position={x:Math.round(sx-drag.offsetX), y:Math.round(sy-drag.offsetY)};
    renderSchema(svg, schema, getSelectedId && getSelectedId(), getSelectedId && (()=>{}));
  });

  function endDrag(e){
    if(!drag.active) return; drag.active=false;
    try{ svg.releasePointerCapture(drag.pointerId);}catch(_){}
    drag.pointerId=null; onChange && onChange(schema);
  }
  svg.addEventListener('pointerup',endDrag); svg.addEventListener('pointercancel',endDrag);
}

window.Diagram={ renderSchema, enableDragging };
