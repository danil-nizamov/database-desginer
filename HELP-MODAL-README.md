# Help Modal System

A reusable, dependency-free help modal system that can be easily extracted and used in other projects.

## Files

- `help-modal.js` - The main modal system (standalone, no dependencies)
- `help-content.html` - The help content (can be customized)
- `style.css` - Contains modal styles (integrated with existing theme system)

## Usage

### Basic Integration

1. Include the modal script in your HTML:
```html
<script src="./help-modal.js"></script>
```

2. Add a trigger button:
```html
<button id="btn-help" class="as-button ghost">HELP</button>
```

3. Initialize the modal:
```javascript
HelpModal.init({
  triggerSelector: '#btn-help',
  content: helpContent,
  theme: 'auto'
});
```

### Configuration Options

```javascript
HelpModal.init({
  triggerSelector: '#btn-help',    // CSS selector for trigger element
  content: helpContent,            // HTML content string or fetch from URL
  theme: 'auto',                   // 'light', 'dark', or 'auto'
  customStyles: {}                 // Optional style overrides
});
```

### Loading Content from File

```javascript
const helpContent = await fetch('./help-content.html').then(r => r.text());
HelpModal.init({
  triggerSelector: '#btn-help',
  content: helpContent,
  theme: 'auto'
});
```

## Features

- ✅ **Dependency-free**: Pure vanilla JavaScript
- ✅ **Theme-aware**: Automatically adapts to light/dark themes
- ✅ **Responsive**: Works on mobile and desktop
- ✅ **Accessible**: Keyboard navigation (ESC to close)
- ✅ **Reusable**: Easy to extract and use in other projects
- ✅ **Image support**: Handles images and rich content
- ✅ **Navigation**: Internal anchor links work within modal

## Extraction for Other Projects

To use this modal system in another project:

1. Copy `help-modal.js` to your project
2. Copy the modal styles from `style.css` (lines 202-410)
3. Adapt the CSS custom properties to match your theme
4. Create your help content
5. Initialize with `HelpModal.init()`

## Customization

### Styling
The modal uses CSS custom properties that integrate with your existing theme:
- `--bg`, `--fg`, `--box`, `--stroke`, `--muted` for colors
- `--control-bg`, `--control-border` for interactive elements

### Content
The help content supports:
- Standard HTML elements
- Images with relative paths
- Internal navigation links
- Collapsible `<details>` sections
- Code blocks and inline code

## Browser Support

Works in all modern browsers that support:
- ES6 classes
- CSS custom properties
- Flexbox
- `fetch()` API (for loading external content)
