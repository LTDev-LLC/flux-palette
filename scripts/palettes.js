'use strict';
const fs = require('fs'),
    path = require('path');

// Get merged options with defaults
function getOptions(themeConfig) {
    const cfg = (themeConfig && themeConfig.sidebar && themeConfig.sidebar.palette_selector) || {};
    return {
        enabled: cfg.enabled !== false,
        default: cfg.default || 'blood-red',
        palette_folder: cfg.palette_folder || 'css/palettes'
    };
}

// Get the list of available palettes
function getPalettes(ctx) {
    const options = getOptions(ctx.theme.config);

    if (!options.enabled)
        return [];

    // e.g. "css" or "css/palettes"
    const folderAbs = path.join(hexo.theme_dir, 'source', (options.palette_folder || 'css/palettes').replace(/^\/+/, '').replace(/\/+$/, ''));

    // Read all files in the palette folder
    let files;
    try {
        files = fs.readdirSync(folderAbs);
    } catch (err) {
        // Folder missing or unreadable
        hexo.log.warn('[palette_list] Palette folder not found:', folderAbs);
        return [];
    }

    return files
        .filter(f => /^.*\.css$/.test(f)) // Only .css files
        .map(file => {
            const key = file
                .replace(/^palette-/, '')   // palette-default.css -> default.css
                .replace(/\.css$/, ''),    // default.css -> default
                name = key
                    .split(/[-_]/)
                    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                    .join(' ');
            return {
                file, // "blood-red.css"
                key,  // "blood-red"
                name  // "Blood Red"
            };
        });
}


// Returns a list of available palettes
hexo.extend.helper.register('palette_list', function () { return getPalettes(this) });

// Generate a bundle of all palettes to `css/palettes.css`
hexo.extend.generator.register('theme_palettes_bundle', function () {
    const themeCfg = this.theme.config || {},
        palettes = getPalettes(this);
    if (!palettes.length) {
        this.log.info('[palette-bundle] No palettes defined in theme config.');
        return;
    }

    const themeSourceDir = path.join(this.theme_dir, 'source'),
        cssDir = path.join(themeSourceDir, 'css/palettes'),
        parts = [];

    // Read each palette file
    palettes.forEach(p => {
        const key = p.key,
            file = p.file;

        // Check for key and file
        if (!key || !file) {
            hexo.log.warn('[palette-bundle] Palette entry missing key or file:', p);
            return;
        }

        // Read the file
        const filePath = path.join(cssDir, file);
        if (!fs.existsSync(filePath)) {
            hexo.log.warn('[palette-bundle] Palette file not found:', filePath);
            return;
        }

        // Replace :root with the palette selector
        let content;
        try {
            content = fs.readFileSync(filePath, 'utf8');
        } catch (err) {
            hexo.log.error('[palette-bundle] Failed to read file:', filePath);
            hexo.log.error(err);
            return;
        }

        // Replace :root with the palette selector
        let selector = `:root[data-palette="${key}"]`,
            rewritten = content.replace(/:root\b/g, selector);
        if (rewritten === content)
            rewritten = `${selector} {\n ${content}\n}\n`;
        parts.push(`/* ==== Palette: ${key} (${file}) ==== */\n${rewritten.trim()}\n`);
    });

    // No parts?
    if (!parts.length) {
        this.log.warn('[palette-bundle] No palette CSS could be bundled.');
        return;
    }

    // Serve as /css/palettes.css
    return {
        path: 'css/palettes.css',
        data: function () {
            return parts.join('\n');
        }
    };
});
