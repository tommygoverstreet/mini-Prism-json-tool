🔮 Mini Prism
<div align="center">
<p><strong>The Mobile-First, High-Performance JSON Studio.</strong></p>
<p>Parse, build, visualize, and export JSON data through a beautiful, dependency-free interface.</p>
</div>
📖 Overview
Mini Prism is a zero-dependency, vanilla JavaScript web application designed to make exploring, building, and exporting JSON data a beautiful and effortless experience. Built with a strict mobile-first mentality, it trades clunky, desktop-only split-screens for a sleek, horizontally scrollable unified tab interface, backed by a hyper-optimized rendering engine.
Whether you are debugging a REST API response on your phone or manipulating massive datasets on your desktop, Mini Prism adapts perfectly to your environment.
✨ Features
Mini Prism parses your JSON data once and allows you to view and manipulate it across 7 distinct dimensions:
1. 📝 Source: A beautiful dropzone and code editor to paste, upload, or generate sample JSON. Includes 10 built-in templates (Business & Web Dev) to get you started.
2. 🏗️ Builder: A deeply nested, breadcrumb-navigable visual editor. Add, edit, or delete keys and values using native, mobile-friendly bottom-sheet modals.
3. 🌲 Tree: An infinitely collapsible, color-coded node tree for structural overview.
4. 📊 Table: Automatically detects the largest array of objects in your JSON and flattens it into a horizontal, sticky-header data table.
5. 🗂️ Cards: Maps array data into a beautiful, masonry-style responsive card grid.
6. 🕸️ Graph: A custom-built, 2D HTML5 ⁠<canvas>⁠ bezier-curve mind map of your data structure. Fully pannable via mouse or touch.
7. 💻 Code: A syntax-highlighted, read-only raw code view.
⚡ Technical Architecture & Optimizations
Mini Prism is built to be blazing fast. By strictly adhering to DRY (Don't Repeat Yourself) principles and avoiding heavy frameworks like React or Vue, the entire app lives in a single file and executes in milliseconds.
Here are the core architectural optimizations that power the application:
1. The Lazy-Rendering Router
Instead of bogging down the browser by rendering the Canvas, the DOM Tree, and the HTML Tables simultaneously on every keystroke or data change, Mini Prism utilizes a Dirty State tracking system. It only renders the tab you are currently looking at, deferring the rendering of other tabs until they are activated.
2. AST Collection Caching
To generate Tables and Cards, the app must find arrays of objects nested deep within the JSON. Previously, this recursive search ran on every render. Now, it runs once upon parsing, caches the result in ⁠State.collections⁠, and feeds that directly to the Table, Cards, and Exporters.
3. Unified Type System
Scattered ⁠typeof⁠ checks lead to bloated code. Mini Prism uses a central ⁠Utils.type(val)⁠ method that returns standard types, corresponding UI icons, and CSS classes in a single, clean object.
4. High-Performance Event Delegation
To support massive JSON files, we eliminated attaching ⁠onclick⁠ listeners to thousands of individual elements. The UI is constructed using hyper-fast template literals (⁠innerHTML⁠), and a single listener is attached to the parent container.
🎨 Dynamic CSS Theming Engine
Mini Prism includes three custom, high-contrast themes designed for OLED mobile displays. The theming engine relies entirely on CSS Custom Properties (⁠:root⁠ variables), meaning theme swaps happen instantly without any JavaScript recalculations.
Even the syntax highlighting and ⁠<canvas>⁠ graph colors are dynamically mapped to these CSS variables.
📤 Advanced Export Capabilities
A unified export menu allows you to instantly extract your manipulated data in four different formats. The CSV exporter includes advanced escaping logic to ensure strings with commas or quotes don't break Excel/Numbers.
🚀 Usage & Installation
Because Mini Prism is a 100% vanilla, single-file application, there is no ⁠npm install⁠ or build step required.
1. Clone this repository or download the ⁠index.html⁠ file.
2. Double-click ⁠index.html⁠ to open it in any modern browser (Chrome, Safari, Firefox, Edge).
3. Hosting: Deploy instantly by dragging and dropping the ⁠index.html⁠ file into Vercel, Netlify, or GitHub Pages. No configuration needed.
📄 License
This project is licensed under the MIT License - feel free to modify, distribute, and use it in your own projects.