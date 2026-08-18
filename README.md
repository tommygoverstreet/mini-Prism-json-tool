* 🔮 Mini Prism**

**The Mobile-First, High-Performance JSON Studio.**

Parse, build, visualize, and export JSON data through a beautiful, dependency-free interface.

** 📖 Overview**

Mini Prism is a zero-dependency, vanilla JavaScript web application designed to make exploring, building, and exporting JSON data a beautiful and effortless experience. Built with a strict mobile-first mentality, it trades clunky, desktop-only split-screens for a sleek, horizontally scrollable unified tab interface, backed by a hyper-optimized rendering engine.

Whether you are debugging a REST API response on your phone or manipulating massive datasets on your desktop, Mini Prism adapts perfectly to your environment.

** ✨ Features**

Mini Prism parses your JSON data once and allows you to view and manipulate it across 7 distinct dimensions:

1.  📝 **Source:** A beautiful dropzone and code editor to paste, upload, or generate sample JSON. Includes 10 built-in templates (Business & Web Dev) to get you started.
    
2.  🏗️ **Builder:** A deeply nested, breadcrumb-navigable visual editor. Add, edit, or delete keys and values using native, mobile-friendly bottom-sheet modals.
    
3.  🌲 **Tree:** An infinitely collapsible, color-coded node tree for structural overview.
    
4.  📊 **Table:** Automatically detects the largest array of objects in your JSON and flattens it into a horizontal, sticky-header data table.
    
5.  🗂️ **Cards:** Maps array data into a beautiful, masonry-style responsive card grid.
    
6.  🕸️ **Graph:** A custom-built, 2D HTML5
    
    bezier-curve mind map of your data structure. Fully pannable via mouse or touch.
    
7.  💻 **Code:** A syntax-highlighted, read-only raw code view.
    

** ⚡ Technical Architecture & Optimizations**

Mini Prism is built to be blazing fast. By strictly adhering to DRY (Don't Repeat Yourself) principles and avoiding heavy frameworks like React or Vue, the entire app lives in a single file and executes in milliseconds.

Here are the core architectural optimizations that power the application:

**1\. The Lazy-Rendering Router**

Instead of bogging down the browser by rendering the Canvas, the DOM Tree, and the HTML Tables simultaneously on every keystroke or data change, Mini Prism utilizes a **Dirty State** tracking system. It only renders the tab you are currently looking at, deferring the rendering of other tabs until they are activated.

'''js
// State tracks which views need updatesconst State = {    activeTab: 'view-source',    needsRender: { 'view-tree': true, 'view-table': true /\* ... \*/ }};// The Lazy Renderer Routerfunction renderActiveTab() {    const tab = State.activeTab;        // If the tab data hasn't changed, skip the heavy DOM calculations    if (!State.needsRender\[tab\] && tab !== 'view-builder') return;         if (tab === 'view-builder') renderBuilder();    else if (tab === 'view-tree') renderTree();    else if (tab === 'view-table') renderTable();    else if (tab === 'view-cards') renderCards();    else if (tab === 'view-code') renderCode();    else if (tab === 'view-graph') renderGraph();        // Mark the tab as clean after rendering    State.needsRender\[tab\] = false;}
'''

**2\. AST Collection Caching**

To generate Tables and Cards, the app must find arrays of objects nested deep within the JSON. Previously, this recursive search ran on every render. Now, it runs **once** upon parsing, caches the result in State.collections, and feeds that directly to the Table, Cards, and Exporters.

'''js
// Recursively extracts table/card data and caches it globallyfunction findCollections(obj, path, res = \[\]) {    if(Array.isArray(obj)) {        // If it's an array of objects, save it as a collection        if(obj.length && typeof obj\[0\] === 'object' && obj\[0\] !== null && !Array.isArray(obj\[0\])) {            res.push({path, data: obj});        } else {            // Keep digging            obj.forEach((i, idx) => {                 if(typeof i === 'object' && i !== null) findCollections(i, \`${path}\[${idx}\]\`, res);             });        }    } else if(typeof obj === 'object' && obj !== null) {        // Iterate through dictionary keys        Object.keys(obj).forEach(k => findCollections(obj\[k\], \`${path}.${k}\`, res));    }    // Return sorted by size so the largest dataset is rendered by default    return res.sort((a,b) => b.data.length - a.data.length); }
'''

**3\. Unified Type System**

Scattered typeof checks lead to bloated code. Mini Prism uses a central Utils.type(val) method that returns standard types, corresponding UI icons, and CSS classes in a single, clean object.

'''js
const Utils = {    type(val) {        if (val === null) return { t: 'null', icon: '∅', css: 'null', isComplex: false };        if (Array.isArray(val)) return { t: 'array', icon: '\[\]', css: 'arr', isComplex: true };                const t = typeof val;        const icons = { object: '{}', string: 'T', number: '#', boolean: '✓' };        const css = { object: 'obj', string: 'str', number: 'num', boolean: 'bool' };                return {             t,             icon: icons\[t\] || '?',             css: css\[t\] || 'str',             isComplex: t === 'object'         };    }};
'''

**4\. High-Performance Event Delegation**

To support massive JSON files, we eliminated attaching onclick listeners to thousands of individual elements. The UI is constructed using hyper-fast template literals (innerHTML), and a single listener is attached to the parent container.

'''js
// Single event listener managing hundreds of nested tree nodesdocument.getElementById('treeContainer').addEventListener('click', e => {    // Find the closest toggle button that was clicked    const t = e.target.closest('.tree-toggle');        if (t) {        // Find the adjacent children container and toggle its visibility        const c = t.parentNode.nextElementSibling;        const hide = c.style.display === 'none';                c.style.display = hide ? 'block' : 'none';         t.classList.toggle('collapsed', !hide);    }});
'''

**🎨 Dynamic CSS Theming Engine**

Mini Prism includes three custom, high-contrast themes designed for OLED mobile displays. The theming engine relies entirely on CSS Custom Properties (:root variables), meaning theme swaps happen instantly without any JavaScript recalculations.

Even the syntax highlighting and

graph colors are dynamically mapped to these CSS variables.

'''css
/\* Base Theme (Midnight Velvet) \*/:root {    --bg-base: #121118;    --bg-surface: #1A1824;    --accent-primary: #FF2A6D;    --accent-secondary: #05D9E8;        /\* Dynamic Syntax Mapping \*/    --c-string: #A3E635;     --c-number: #FBBF24; }/\* Theme Override via Data Attribute (Cyber Noir) \*/\[data-theme="cyber"\] {    --bg-base: #000000;    --bg-surface: #141414;    --accent-primary: #B8FF01;    --accent-secondary: #7000FF;        --c-string: #00E5FF;    --c-number: #FF0055;}
'''

**📤 Advanced Export Capabilities**

A unified export menu allows you to instantly extract your manipulated data in four different formats. The CSV exporter includes advanced escaping logic to ensure strings with commas or quotes don't break Excel/Numbers.

'''js
// Safely converts JSON data into a robust CSV formatfunction exportCSV() {    if (!State.collections.length) return alert("No valid object arrays found.");        const col = State.collections\[0\];    const keys = Array.from(new Set(col.data.flatMap(obj => Object.keys(obj))));        // Robust escaping for inner commas and quotes    const escCSV = v => {         if(v == null) return '""';         v = String(typeof v === 'object' ? JSON.stringify(v) : v);         return (v.includes(',') || v.includes('"') || v.includes('\\n')) ? '"' + v.replace(/"/g, '""') + '"' : v;     };        // Build CSV string    let csv = keys.map(escCSV).join(',') + '\\n' +               col.data.map(row => keys.map(k => escCSV(row\[k\])).join(',')).join('\\n');                  Utils.download(csv, 'export.csv', 'text/csv');}
'''

**🚀 Usage & Installation**

Because Mini Prism is a 100% vanilla, single-file application, there is no npm install or build step required.

1.  Clone this repository or download the index.html file
2.  Double-click index.html to open it in any modern browser (Chrome, Safari, Firefox, Edge)
3.  **Hosting:** Deploy instantly by dragging and dropping the index.html file into Vercel, Netlify, or GitHub Pages. No configuration needed.
    

**📄 License**

This project is licensed under the MIT License - feel free to modify, distribute, and use it in your own projects.