// --- 1. CORE UTILS & CACHE ---
    const Utils = {
        type(val) {
            if (val === null) return { t: 'null', icon: '∅', css: 'null', isComplex: false };
            if (Array.isArray(val)) return { t: 'array', icon: '[]', css: 'arr', isComplex: true };
            const t = typeof val;
            const icons = { object: '{}', string: 'T', number: '#', boolean: '✓' };
            const css = { object: 'obj', string: 'str', number: 'num', boolean: 'bool' };
            return { t, icon: icons[t] || '?', css: css[t] || 'str', isComplex: t === 'object' };
        },
        esc(str) { return String(str).replace(/[&<>'"]/g, t => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[t] || t)); },
        download(content, filename, type) {
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = filename;
            a.click(); URL.revokeObjectURL(a.href);
            document.getElementById('exportModal').classList.remove('active'); showToast(`Exported ${filename}`);
        },
        toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2000); }
    };

    const State = {
        parsedObj: null, activeTab: 'view-source', builderPath: [], builderEditingKey: null,
        needsRender: {}, collections: [], graphLayout: null
    };

    const els = {
        tabs: document.querySelectorAll('.tab'), panes: document.querySelectorAll('.view-pane'),
        input: document.getElementById('jsonInput'), modal: document.getElementById('builderModal')
    };

    // --- 2. INITIALIZATION ---
    function init() {
        // Theme
        document.getElementById('themeToggle').addEventListener('change', e => { document.documentElement.setAttribute('data-theme', e.target.value); State.needsRender['view-graph'] = true; renderActiveTab(); });
        
        // Navigation (Lazy Rendering)
        els.tabs.forEach(t => t.addEventListener('click', e => {
            const target = e.target.dataset.target;
            els.tabs.forEach(x => x.classList.remove('active')); els.panes.forEach(x => x.classList.remove('active'));
            e.target.classList.add('active'); document.getElementById(target).classList.add('active');
            State.activeTab = target; renderActiveTab();
        }));

        // Inputs
        document.getElementById('btnFormat').addEventListener('click', () => processJSON(els.input.value));
        document.getElementById('templateSelect').addEventListener('change', e => { if (e.target.value) processJSON(JSON.stringify(Templates[e.target.value], null, 2)); e.target.value = ""; });
        
        const dz = document.getElementById('dropzone'), fi = document.getElementById('fileInput');
        dz.addEventListener('click', () => fi.click());
        dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
        dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); });
        fi.addEventListener('change', e => readFile(e.target.files[0]));

        setupBuilderEvents();
        setupTreeEvents();
        setupExportEvents();
        setupGraphEvents();
        
        processJSON("{}"); // Init empty
    }

    function readFile(file) { const r = new FileReader(); r.onload = e => processJSON(e.target.result); r.readAsText(file); }
    function showToast(m) { Utils.toast(m); }

    // --- 3. DATA PROCESSING ---
    function processJSON(raw) {
        if (!raw.trim()) return;
        try {
            State.parsedObj = JSON.parse(raw);
            els.input.value = JSON.stringify(State.parsedObj, null, 2);
            State.builderPath = [];
            State.collections = findCollections(State.parsedObj, "root"); // Cache AST extraction once
            State.graphLayout = null; // reset graph layout cache
            
            // Mark all output tabs as dirty
            els.tabs.forEach(t => { t.classList.remove('hidden'); State.needsRender[t.dataset.target] = true; });
            
            // Auto-switch to Builder if not empty
            if (raw !== "{}" && State.activeTab === 'view-source') document.querySelector('[data-target="view-builder"]').click();
            else renderActiveTab();
            
        } catch (e) { alert("Invalid JSON: " + e.message); }
    }

    function findCollections(obj, path, res = []) {
        if(Array.isArray(obj)) {
            if(obj.length && typeof obj[0] === 'object' && obj[0] !== null && !Array.isArray(obj[0])) res.push({path, data: obj});
            else obj.forEach((i, idx) => { if(typeof i === 'object' && i !== null) findCollections(i, `${path}[${idx}]`, res); });
        } else if(typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach(k => findCollections(obj[k], `${path}.${k}`, res));
        }
        return res.sort((a,b) => b.data.length - a.data.length); // Cache sorted largest first
    }

    // --- 4. LAZY RENDERER ROUTER ---
    function renderActiveTab() {
        const tab = State.activeTab;
        if (!State.needsRender[tab] && tab !== 'view-builder') return; // Builder always re-renders to handle deep nav state
        
        if (tab === 'view-builder') renderBuilder();
        else if (tab === 'view-tree') renderTree();
        else if (tab === 'view-table') renderTable();
        else if (tab === 'view-cards') renderCards();
        else if (tab === 'view-code') renderCode();
        else if (tab === 'view-graph') renderGraph();
        
        State.needsRender[tab] = false;
    }

    function triggerGlobalUpdate() {
        State.collections = findCollections(State.parsedObj, "root");
        State.graphLayout = null;
        els.tabs.forEach(t => State.needsRender[t.dataset.target] = true);
        els.input.value = JSON.stringify(State.parsedObj, null, 2);
        renderActiveTab();
    }

    // --- 5. BUILDER (High Perf String Templates & Delegation) ---
    function setupBuilderEvents() {
        const bl = document.getElementById('builderList');
        // Search
        document.getElementById('builderSearch').addEventListener('input', renderBuilder);
        // Breadcrumbs
        document.getElementById('builderBreadcrumbs').addEventListener('click', e => {
            const idx = e.target.dataset.idx;
            if(idx !== undefined) { State.builderPath = State.builderPath.slice(0, Number(idx)); renderBuilder(); }
        });
        // List Click Delegation
        bl.addEventListener('click', e => {
            const item = e.target.closest('.builder-item'); if(!item) return;
            const k = item.dataset.key, isComplex = item.dataset.complex === "true";
            if (isComplex) { State.builderPath.push(k); renderBuilder(); }
            else openBuilderModal(k);
        });
        bl.addEventListener('contextmenu', e => {
            e.preventDefault(); const item = e.target.closest('.builder-item');
            if(item) openBuilderModal(item.dataset.key);
        });
        // Modals
        document.getElementById('btnBuilderAdd').addEventListener('click', () => openBuilderModal(null));
        document.getElementById('modalBtnClose').addEventListener('click', () => els.modal.classList.remove('active'));
        document.getElementById('modalBtnSave').addEventListener('click', saveBuilderModal);
        document.getElementById('modalBtnDelete').addEventListener('click', deleteBuilderItem);
        document.getElementById('modalType').addEventListener('change', updateModalInputs);
        const boolToggle = document.getElementById('modalValueBool');
        boolToggle.addEventListener('click', () => boolToggle.classList.toggle('on'));
    }

    function getBuilderTarget() { return State.builderPath.reduce((t, k) => t[k], State.parsedObj); }

    function renderBuilder() {
        // Breadcrumbs
        let bHtml = `<span class="builder-breadcrumb" data-idx="0">Root</span>`;
        State.builderPath.forEach((p, i) => bHtml += `<span class="breadcrumb-sep">/</span><span class="builder-breadcrumb" data-idx="${i+1}">${Utils.esc(p)}</span>`);
        document.getElementById('builderBreadcrumbs').innerHTML = bHtml;

        // List
        const target = getBuilderTarget();
        const bl = document.getElementById('builderList');
        if (typeof target !== 'object' || target === null) return bl.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:2rem;">Not an object.</p>`;
        
        const keys = Object.keys(target), filter = document.getElementById('builderSearch').value.toLowerCase();
        if (!keys.length) return bl.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:2rem;">Empty structure.</p>`;

        let html = '';
        keys.forEach(k => {
            if (filter && !String(k).toLowerCase().includes(filter)) return;
            const v = target[k], tInfo = Utils.type(v);
            const prev = tInfo.isComplex ? (tInfo.t === 'object' ? `{ ${Object.keys(v).length} keys }` : `[ ${v.length} items ]`) : Utils.esc(String(v));
            const label = Array.isArray(target) ? `Index ${k}` : Utils.esc(k);
            html += `<div class="builder-item" data-key="${Utils.esc(k)}" data-complex="${tInfo.isComplex}">
                <div class="bi-icon ${tInfo.css}">${tInfo.icon}</div>
                <div class="bi-content"><div class="bi-key">${label}</div><div class="bi-val">${prev}</div></div>
                ${tInfo.isComplex ? `<div class="bi-chevron">></div>` : ''}
            </div>`;
        });
        bl.innerHTML = html;
    }

    function openBuilderModal(key) {
        const t = getBuilderTarget(), isArr = Array.isArray(t);
        State.builderEditingKey = key;
        document.getElementById('modalTitle').textContent = key !== null ? "Edit" : "Add";
        document.getElementById('modalBtnDelete').style.display = key !== null ? "block" : "none";
        
        const keyGrp = document.getElementById('modalKeyGroup'), keyInp = document.getElementById('modalKey');
        if (isArr) keyGrp.classList.add('hidden');
        else { keyGrp.classList.remove('hidden'); keyInp.value = key || ""; keyInp.disabled = key !== null; }

        if (key !== null) {
            const v = t[key], tInfo = Utils.type(v);
            document.getElementById('modalType').value = tInfo.t; updateModalInputs();
            if(tInfo.t === 'string') document.getElementById('modalValueText').value = v;
            if(tInfo.t === 'number') document.getElementById('modalValueNumber').value = v;
            document.getElementById('modalValueBool').classList.toggle('on', v === true);
        } else {
            document.getElementById('modalType').value = 'string'; document.getElementById('modalValueText').value = ''; 
            document.getElementById('modalValueNumber').value = '0'; document.getElementById('modalValueBool').classList.remove('on'); updateModalInputs();
        }
        els.modal.classList.add('active');
    }

    function updateModalInputs() {
        const t = document.getElementById('modalType').value;
        document.getElementById('modalValueText').classList.toggle('hidden', t !== 'string');
        document.getElementById('modalValueNumber').classList.toggle('hidden', t !== 'number');
        document.getElementById('modalValueBool').classList.toggle('hidden', t !== 'boolean');
        const h = document.getElementById('modalValueHidden');
        h.classList.toggle('hidden', !['array','object','null'].includes(t));
        h.textContent = t === 'null' ? "Will be null" : "Empty Structure";
    }

    function saveBuilderModal() {
        const target = getBuilderTarget(), t = document.getElementById('modalType').value;
        let k = State.builderEditingKey;
        if (k === null) {
            if (Array.isArray(target)) k = target.length;
            else { k = document.getElementById('modalKey').value.trim(); if(!k || target.hasOwnProperty(k)) return alert("Invalid key"); }
        }
        let val = null;
        if (t === 'string') val = document.getElementById('modalValueText').value;
        if (t === 'number') val = Number(document.getElementById('modalValueNumber').value);
        if (t === 'boolean') val = document.getElementById('modalValueBool').classList.contains('on');
        if (t === 'array') val = []; if (t === 'object') val = {};

        target[k] = val; els.modal.classList.remove('active'); triggerGlobalUpdate();
    }

    function deleteBuilderItem() {
        const k = State.builderEditingKey, t = getBuilderTarget();
        if(k===null) return;
        Array.isArray(t) ? t.splice(k, 1) : delete t[k];
        els.modal.classList.remove('active'); triggerGlobalUpdate();
    }

    // --- 6. OTHER VIEWS (High Perf Renderers) ---
    function setupTreeEvents() {
        // Event delegation for blazing fast tree rendering
        document.getElementById('treeContainer').addEventListener('click', e => {
            const t = e.target.closest('.tree-toggle');
            if (t) {
                const c = t.parentNode.nextElementSibling, hide = c.style.display === 'none';
                c.style.display = hide ? 'block' : 'none'; t.classList.toggle('collapsed', !hide);
            }
        });
        document.getElementById('btnExpandAll').addEventListener('click', () => document.querySelectorAll('.tree-children').forEach(c => c.style.display='block') & document.querySelectorAll('.tree-toggle').forEach(t=>t.classList.remove('collapsed')));
        document.getElementById('btnCollapseAll').addEventListener('click', () => document.querySelectorAll('.tree-children').forEach(c => c.style.display='none') & document.querySelectorAll('.tree-toggle').forEach(t=>t.classList.add('collapsed')));
    }

    function renderTree() {
        function buildNode(k, v) {
            const tInfo = Utils.type(v);
            let html = `<div class="tree-line"><div style="display:flex;">`;
            if (tInfo.isComplex) {
                html += `<span class="tree-toggle">▼</span><div><span class="t-key">${Utils.esc(k)}</span> <span class="t-badge">${tInfo.t==='array'?'[]':'{}'} ${tInfo.t==='array'?v.length:Object.keys(v).length}</span></div></div>`;
                html += `<div class="tree-children" style="display:block;">` + Object.keys(v).map(childK => buildNode(childK, v[childK])).join('') + `</div>`;
            } else {
                html += `<span style="width:20px;display:inline-block;"></span><div><span class="t-key">${Utils.esc(k)}</span>: <span class="color-${tInfo.css}">${tInfo.t==='string'?`"${Utils.esc(v)}"`:Utils.esc(v)}</span></div></div>`;
            }
            return html + `</div>`;
        }
        document.getElementById('treeContainer').innerHTML = buildNode('root', State.parsedObj);
    }

    function renderTable() {
        const c = document.getElementById('tableContainer');
        if (!State.collections.length) return c.innerHTML = `<p style="color:var(--text-muted);">No array of objects found.</p>`;
        const col = State.collections[0], keys = Array.from(new Set(col.data.flatMap(i => Object.keys(i))));
        c.innerHTML = `<div class="table-wrapper"><table class="data-table"><thead><tr>${keys.map(k=>`<th>${Utils.esc(k)}</th>`).join('')}</tr></thead><tbody>${col.data.map(item => `<tr>${keys.map(k => {
            const v = item[k], tInfo = Utils.type(v);
            if(v===undefined) return `<td><span style="color:var(--border-subtle)">-</span></td>`;
            if(tInfo.isComplex) return `<td><span style="color:var(--text-muted)">${Utils.esc(JSON.stringify(v))}</span></td>`;
            return `<td><span class="color-${tInfo.css}">${tInfo.t==='string'?`"${Utils.esc(v)}"`:Utils.esc(v)}</span></td>`;
        }).join('')}</tr>`).join('')}</tbody></table></div>`;
    }

    function renderCards() {
        const c = document.getElementById('cardsContainer');
        if (!State.collections.length) return c.innerHTML = `<p style="color:var(--text-muted);">No array of objects found.</p>`;
        c.innerHTML = State.collections[0].data.map(item => `<div class="smart-card">${Object.keys(item).map(k => `<div class="sc-row"><span class="sc-key">${Utils.esc(k)}</span><span class="sc-val">${Utils.esc(typeof item[k]==='object'?JSON.stringify(item[k]):String(item[k]))}</span></div>`).join('')}</div>`).join('');
    }

    function renderCode() {
        const h = State.rawData.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, m => {
            let cls = 'color-num';
            if(/^"/.test(m)) cls = /:$/.test(m) ? 'color-key' : 'color-str';
            else if(/true|false/.test(m)) cls = 'color-bool';
            else if(/null/.test(m)) cls = 'color-null';
            return `<span class="${cls}">${m}</span>`;
        });
        document.getElementById('rawCode').innerHTML = h;
    }

    // --- 7. GRAPH ENGINE (Optimized Layout Caching) ---
    function setupGraphEvents() {} // Mapped in init()
    let isDragging = false, panX = 0, panY = 0, startX = 0, startY = 0;
    
    function renderGraph() {
        if (!State.parsedObj) return;
        const cvs = document.getElementById('graphCanvas'), rect = cvs.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
        cvs.width = rect.width * dpr; cvs.height = rect.height * dpr;
        const ctx = cvs.getContext('2d'); ctx.scale(dpr, dpr);
        
        // Cache Layout calculation (heavy)
        if (!State.graphLayout) {
            const nodes = [], edges = []; let idCounter = 0;
            function buildG(key, val, depth, yOffset) {
                const id = idCounter++, tInfo = Utils.type(val);
                const node = { id, key, t: tInfo.t, depth, y: yOffset, x: 0 }; nodes.push(node);
                let childH = 0;
                if (tInfo.isComplex) {
                    let cy = yOffset;
                    Object.keys(val).forEach(k => {
                        const cId = buildG(k, val[k], depth + 1, cy); edges.push({ from: id, to: cId });
                        const cH = nodes.find(n => n.id === cId).sH || 40; cy += cH; childH += cH;
                    });
                }
                node.sH = Math.max(40, childH); return id;
            }
            buildG("Root", State.parsedObj, 0, 0);

            const mD = Math.max(...nodes.map(n => n.depth)), lW = window.innerWidth < 600 ? 140 : 180;
            for(let d = mD; d >= 0; d--) {
                nodes.filter(n => n.depth === d).forEach(n => {
                    n.x = n.depth * lW; const cE = edges.filter(e => e.from === n.id);
                    if(cE.length) { const c = cE.map(e => nodes.find(ch => ch.id === e.to)); n.y = (Math.min(...c.map(ch=>ch.y)) + Math.max(...c.map(ch=>ch.y))) / 2; }
                });
            }
            State.graphLayout = { nodes, edges };
            panX = 30; panY = (rect.height / 2) - (nodes[0] ? nodes[0].y : 0);
        }
        drawGraph(ctx, rect.width, rect.height);
    }

    function drawGraph(ctx = document.getElementById('graphCanvas').getContext('2d'), w = document.getElementById('graphCanvas').width, h = document.getElementById('graphCanvas').height) {
        ctx.clearRect(0, 0, w, h); ctx.save(); ctx.translate(panX, panY);
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        
        const cs = getComputedStyle(document.documentElement);
        const cMap = { object: cs.getPropertyValue('--c-key').trim(), array: cs.getPropertyValue('--accent-primary').trim(), string: cs.getPropertyValue('--c-string').trim(), number: cs.getPropertyValue('--c-number').trim(), boolean: cs.getPropertyValue('--c-boolean').trim() };

        State.graphLayout.edges.forEach(e => {
            const f = State.graphLayout.nodes.find(n => n.id === e.from), t = State.graphLayout.nodes.find(n => n.id === e.to);
            ctx.beginPath(); ctx.moveTo(f.x + 80, f.y); ctx.bezierCurveTo(f.x + 120, f.y, t.x - 40, t.y, t.x, t.y); ctx.stroke();
        });
        State.graphLayout.nodes.forEach(n => {
            ctx.fillStyle = cs.getPropertyValue('--bg-surface').trim(); ctx.strokeStyle = cMap[n.t] || cs.getPropertyValue('--text-muted').trim();
            ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(n.x, n.y - 15, 80, 30, 8); ctx.fill(); ctx.stroke();
            ctx.fillStyle = cs.getPropertyValue('--text-main').trim(); ctx.font = '500 12px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            let txt = String(n.key); if(txt.length > 9) txt = txt.substring(0, 7) + '..'; ctx.fillText(txt, n.x + 40, n.y);
        });
        ctx.restore();
    }

    function startPan(e) { isDragging = true; startX = e.clientX - panX; startY = e.clientY - panY; }
    function panGraph(e) { if(!isDragging) return; panX = e.clientX - startX; panY = e.clientY - startY; requestAnimationFrame(()=>drawGraph()); }
    function endPan() { isDragging = false; }

    // --- 8. EXPORTS ---
    function setupExportEvents() {
        document.getElementById('btnExportMenu').addEventListener('click', () => document.getElementById('exportModal').classList.add('active'));
        document.getElementById('exportBtnClose').addEventListener('click', () => document.getElementById('exportModal').classList.remove('active'));
        document.getElementById('btnExpJSON').addEventListener('click', () => Utils.download(JSON.stringify(State.parsedObj, null, 2), 'data.json', 'application/json'));
        document.getElementById('btnExpJS').addEventListener('click', () => Utils.download(`const data = ${JSON.stringify(State.parsedObj, null, 2)};\nexport default data;`, 'data.js', 'text/javascript'));
    }
    
    function exportCSV() {
        if (!State.collections.length) return alert("No valid object arrays found.");
        const col = State.collections[0], keys = Array.from(new Set(col.data.flatMap(obj => Object.keys(obj))));
        const escCSV = v => { if(v==null) return '""'; v=String(typeof v==='object'?JSON.stringify(v):v); return (v.includes(',')||v.includes('"')||v.includes('\n')) ? '"'+v.replace(/"/g, '""')+'"' : v; };
        let csv = keys.map(escCSV).join(',') + '\n' + col.data.map(row => keys.map(k => escCSV(row[k])).join(',')).join('\n');
        Utils.download(csv, 'export.csv', 'text/csv');
    }

    function exportHTML() {
        if (!State.collections.length) return alert("No valid object arrays found.");
        const col = State.collections[0], keys = Array.from(new Set(col.data.flatMap(obj => Object.keys(obj))));
        const rows = col.data.map(i => `<tr>${keys.map(k => `<td>${Utils.esc(i[k]===undefined?'-':typeof i[k]==='object'?JSON.stringify(i[k]):i[k])}</td>`).join('')}</tr>`).join('');
        Utils.download(`<!DOCTYPE html><html><head><style>body{font-family:sans-serif;padding:2rem;}table{width:100%;border-collapse:collapse;}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left;}</style></head><body><h2>Dataset</h2><table><thead><tr>${keys.map(k=>`<th>${Utils.esc(k)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></body></html>`, 'export.html', 'text/html');
    }

    // --- TEMPLATES ---
    const Templates = {
        biz_crm: { "dataset": "CRM", "contacts": [ { "id": "C-101", "name": "Sarah J", "role": "CEO" }, { "id": "C-102", "name": "David C", "role": "CTO" } ] },
        biz_invoice: { "id": "INV-8891", "date": "2026-08-15", "items": [ { "sku": "SVC-01", "qty": 40, "price": 150.0 }, { "sku": "SFW-12", "qty": 1, "price": 2500.0 } ] },
        biz_hr: { "dept": "Eng", "budget": 650000, "employees": [ { "id": "E9012", "name": "Alice C", "salary": 145000 }, { "id": "E9033", "name": "Bob V", "salary": 125000 } ] },
        dev_package: { "name": "mini-prism", "version": "1.0.0", "scripts": { "start": "webpack serve" }, "dependencies": { "react": "^18.2.0" } },
        dev_theme: { "isDark": true, "colors": { "primary": "#FF2A6D", "bg": "#121118" }, "spacing": { "sm": "8px", "md": "16px" } },
        dev_api: { "status": 200, "data": [ { "id": "u1", "role": "admin", "active": true }, { "id": "u2", "role": "user", "active": false } ] }
    };

    init();