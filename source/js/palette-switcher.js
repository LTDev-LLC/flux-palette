document.addEventListener('alpine:init', () => {
    Alpine.data('paletteSwitcher', () => ({
        palettes: (window.FLUX_DATA && window.FLUX_DATA.palettes) || [],
        defaultLight: (window.FLUX_DATA && window.FLUX_DATA.defaultLight) || 'paper-and-ink',
        defaultDark: (window.FLUX_DATA && window.FLUX_DATA.defaultDark) || 'solar-amber',
        currentPalette: 'auto',
        customColor: '#3b82f6',
        customBgColor: '#0a0a0a',
        useCustomBg: false,
        customMode: 'auto',
        paletteName: '',
        systemListener: null,

        // Computed property to check if mode is set to auto
        get isAuto() {
            return this.customMode === 'auto';
        },

        // toggle between auto, dark, and light logic
        set isAuto(val) {
            this.customMode = val ? 'auto' : (this.systemIsDark() ? 'dark' : 'light');
        },

        // Computed property to determine if the result is currently dark
        get isDark() {
            return this.customMode === 'auto' ? this.systemIsDark() : this.customMode === 'dark';
        },

        // Check window media query for system preference
        systemIsDark() {
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        },

        // Handle manual mode toggling
        toggleMode() {
            if (this.customMode === 'auto')
                this.customMode = this.systemIsDark() ? 'light' : 'dark';
            else
                this.customMode = this.customMode === 'dark' ? 'light' : 'dark';
        },

        // Component initialization: Load storage and setup listeners
        init() {
            try {
                // Restore preferences from LocalStorage
                this.customColor = localStorage.getItem('flux-palette-custom-color') || '#3b82f6';
                this.customBgColor = localStorage.getItem('flux-palette-custom-bg-color') || '#0a0a0a';
                this.useCustomBg = localStorage.getItem('flux-palette-use-custom-bg') === 'true';
                this.customMode = localStorage.getItem('flux-palette-custom-mode') || 'auto';
                this.paletteName = localStorage.getItem('flux-palette-name') || '';

                // Parse URL hash or storage for active theme key
                let key = 'auto';
                try {
                    let hashget = new URLSearchParams(window.location.hash.substring(1) || '');
                    key = hashget.get('theme') || localStorage.getItem('flux-palette-theme') || 'auto';
                } catch { }

                // Validate key against existing palettes
                if (key !== 'auto' && key !== 'custom' && !this.palettes.some(p => p.key === key))
                    key = 'auto';

                this.currentPalette = key;
                this.apply(key, false);

                // Watchers to persist state changes to LocalStorage
                this.$watch('currentPalette', (k) => this.apply(k, true));
                this.$watch('customColor', (c) => {
                    if (this.currentPalette === 'custom')
                        this.applyCustom();
                    localStorage.setItem('flux-palette-custom-color', c);
                });
                this.$watch('customBgColor', (c) => localStorage.setItem('flux-palette-custom-bg-color', c));
                this.$watch('customMode', (m) => {
                    if (this.currentPalette === 'custom')
                        this.applyCustom();
                    localStorage.setItem('flux-palette-custom-mode', m);
                });
                this.$watch('useCustomBg', (v) => localStorage.setItem('flux-palette-use-custom-bg', v));
                this.$watch('paletteName', (n) => localStorage.setItem('flux-palette-name', n));
            } catch (e) {
                console.error("Flux Palette Init Error:", e);
            }
        },

        // Handler for manual background color input interactions
        handleBgInput() {
            this.useCustomBg = true;
            this.applyCustom();
        },

        // Main logic to switch themes, handle CSS injection, and URL updates
        apply(key, updateUrl = false) {
            // Clean up existing media query listeners
            if (this.systemListener) {
                try { window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', this.systemListener); } catch { }
                this.systemListener = null;
            }

            // Reset custom CSS if not in custom mode
            if (key !== 'custom') {
                document.documentElement.removeAttribute('style');
                localStorage.removeItem('flux-palette-custom-css');
            }

            // Handle 'Auto' mode (System Preference)
            if (key === 'auto') {
                this.applySystem();
                this.systemListener = (e) => {
                    document.documentElement.setAttribute('data-palette', e.matches ? this.defaultDark : this.defaultLight);
                };
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.systemListener);

                // Handle 'Custom' mode (user defined colors)
            } else if (key === 'custom') {
                this.applyCustom();
                this.systemListener = (e) => {
                    if (this.customMode === 'auto')
                        this.applyCustom();
                };
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.systemListener);

                // Handle preset palettes
            } else {
                document.documentElement.setAttribute('data-palette', key);
            }

            // Persist theme selection
            try { localStorage.setItem('flux-palette-theme', key); } catch { }

            // Update URL hash for sharing
            if (updateUrl) {
                try {
                    let curHash = new URLSearchParams(window.location.hash.substring(1) || '');
                    if (key === 'auto')
                        curHash.delete('theme');
                    else
                        curHash.set('theme', key);
                    const newHash = curHash.toString();
                    if (window.location.hash.substring(1) !== newHash) {
                        if (!newHash)
                            history.replaceState(null, null, ' ');
                        else
                            window.location.hash = newHash;
                    }
                } catch { }
            }
        },

        // Apply system default palettes based on preference
        applySystem() {
            document.documentElement.setAttribute('data-palette', this.systemIsDark() ? this.defaultDark : this.defaultLight);
        },

        // Generate and inject CSS variables for custom colors
        applyCustom() {
            let mode = this.customMode;
            if (mode === 'auto')
                mode = this.systemIsDark() ? 'dark' : 'light';

            // Set base class for fallback
            document.documentElement.setAttribute('data-palette', mode === 'dark' ? this.defaultDark : this.defaultLight);

            // If useCustomBg is false, pass null so the engine calculates a derived background
            this.updateCustomPalette(this.customColor, mode, this.useCustomBg ? this.customBgColor : null);

            // Update the background color picker UI to match derived reality
            // This ensures if you haven't touched the background, it spins with the accent
            if (!this.useCustomBg)
                this.updateBgPickerUI(this.customColor, mode);
        },

        // Recalculate background picker color based on accent color
        updateBgPickerUI(accentHex, mode) {
            const accent = this.hexToHsl(accentHex),
                isDark = mode === 'dark';
            this.customBgColor = this.hslToHex(accent.h, isDark ? Math.min(accent.s, 15) : Math.min(accent.s, 25), isDark ? 6 : 100);
        },

        // Utility: Convert HSL to hex
        hslToHex(h, s, l) {
            l /= 100;
            const a = s * Math.min(l, 1 - l) / 100,
                f = n => {
                    const k = (n + h / 30) % 12;
                    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1))).toString(16).padStart(2, '0');
                };
            return `#${f(0)}${f(8)}${f(4)}`;
        },

        // Utility: Convert hex string to HSL
        hexToHsl(hex) {
            let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (!result)
                return { h: 0, s: 0, l: 0 };
            let r = parseInt(result[1], 16) / 255,
                g = parseInt(result[2], 16) / 255,
                b = parseInt(result[3], 16) / 255,
                max = Math.max(r, g, b),
                min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            if (max == min)
                h = s = 0;
            else {
                let d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return {
                h: Math.round(h * 360),
                s: Math.round(s * 100),
                l: Math.round(l * 100)
            };
        },

        // Generates complete CSS variable map based on mode and base colors
        getPaletteVariables(hex, mode, bgHex = null) {
            const accent = this.hexToHsl(hex),
                bg = bgHex ? this.hexToHsl(bgHex) : null,
                isDark = mode === 'dark',
                formatHsl = (h, s, l, a) => `hsl(${h}, ${s}%, ${l}%${a !== undefined && a < 1 ? `, ${a}` : ''})`;
            let v = {}, bgH, bgS, baseL;

            // Generate dark mode variables
            if (isDark) {
                bgH = bg ? bg.h : accent.h;
                bgS = bg ? bg.s : Math.min(accent.s, 15);
                baseL = bg ? bg.l : 6;
                v['--bg'] = formatHsl(bgH, bgS, baseL);
                v['--bg-black'] = formatHsl(bgH, bgS, Math.max(0, baseL - 4));
                v['--bg-alt'] = formatHsl(bgH, bgS, Math.min(100, baseL + 3));
                v['--bg-card'] = formatHsl(bgH, bgS, Math.min(100, baseL + 5));
                v['--bg-radial-start'] = formatHsl(bgH, bgS, Math.min(100, baseL + 10));
                v['--bg-header-end'] = formatHsl(bgH, bgS, Math.min(100, baseL + 3));
                v['--bg-tooltip'] = formatHsl(bgH, bgS, Math.min(100, baseL + 4), 0.96);
                v['--text'] = formatHsl(bgH, Math.min(bgS, 10), 96);
                v['--text-white'] = '#ffffff';
                v['--text-light'] = formatHsl(bgH, Math.min(bgS, 10), 85);
                v['--text-sidebar'] = formatHsl(bgH, Math.min(bgS, 10), 92);
                v['--muted'] = formatHsl(bgH, Math.min(bgS, 15), 65);
                v['--border'] = formatHsl(bgH, bgS, Math.min(100, baseL + 14));
                v['--border-card'] = 'rgba(255, 255, 255, 0.05)';
                v['--border-sidebar'] = 'rgba(255, 255, 255, 0.07)';
                v['--border-code'] = formatHsl(bgH, bgS, Math.min(100, baseL + 12));
                v['--shadow-soft'] = `0 10px 30px ${formatHsl(accent.h, accent.s, 5, 0.7)}`;
                v['--shadow-header'] = `0 8px 20px ${formatHsl(accent.h, accent.s, 5, 0.6)}`;
                v['--shadow-tooltip'] = `0 12px 30px ${formatHsl(accent.h, accent.s, 5, 0.85)}`;

                // Generate light mode variables
            } else {
                bgH = bg ? bg.h : accent.h;
                bgS = bg ? bg.s : Math.min(accent.s, 25);
                baseL = bg ? bg.l : 100;
                v['--bg'] = formatHsl(bgH, bgS, baseL);
                v['--bg-black'] = formatHsl(bgH, bgS, Math.max(0, baseL - 3));
                v['--bg-alt'] = formatHsl(bgH, bgS, Math.max(0, baseL - 2));
                v['--bg-card'] = formatHsl(bgH, bgS, baseL);
                v['--bg-radial-start'] = formatHsl(bgH, bgS, baseL);
                v['--bg-header-end'] = formatHsl(bgH, bgS, Math.max(0, baseL - 6));
                v['--bg-tooltip'] = 'rgba(255, 255, 255, 0.98)';
                v['--text'] = formatHsl(bgH, Math.min(bgS, 30), 20);
                v['--text-white'] = formatHsl(bgH, Math.min(bgS, 30), 10);
                v['--text-light'] = formatHsl(bgH, Math.min(bgS, 20), 40);
                v['--text-sidebar'] = formatHsl(bgH, Math.min(bgS, 30), 30);
                v['--muted'] = formatHsl(bgH, Math.min(bgS, 20), 60);
                v['--border'] = formatHsl(bgH, bgS, Math.max(0, baseL - 10));
                v['--border-card'] = formatHsl(bgH, bgS, Math.max(0, baseL - 8));
                v['--border-sidebar'] = formatHsl(bgH, bgS, Math.max(0, baseL - 6));
                v['--border-code'] = formatHsl(bgH, bgS, Math.max(0, baseL - 12));
                v['--shadow-soft'] = `0 10px 30px ${formatHsl(accent.h, accent.s, 40, 0.08)}`;
                v['--shadow-header'] = `0 4px 12px ${formatHsl(accent.h, accent.s, 40, 0.05)}`;
                v['--shadow-tooltip'] = `0 12px 30px ${formatHsl(accent.h, accent.s, 40, 0.15)}`;
            }

            // Generate accent color variables (shared logic)
            v['--accent'] = hex;
            const softOpacity = isDark ? 0.35 : 0.15,
                ringOpacity = isDark ? 0.6 : 0.4;
            v['--accent-muted'] = formatHsl(accent.h, Math.max(0, accent.s - 20), isDark ? Math.max(20, accent.l - 15) : Math.max(20, accent.l - 10));
            v['--accent-bright'] = formatHsl(accent.h, Math.min(100, accent.s + 10), isDark ? Math.min(90, accent.l + 15) : Math.min(80, accent.l + 10));
            v['--accent-soft'] = formatHsl(accent.h, accent.s, accent.l, softOpacity);
            v['--focus-ring'] = formatHsl(accent.h, accent.s, accent.l, ringOpacity);
            return v;
        },

        // Helper: Inject calculated variables into inline styles and local storage
        updateCustomPalette(hex, mode, bgHex) {
            const v = this.getPaletteVariables(hex, mode, bgHex)
            localStorage.setItem('flux-palette-custom-css', (
                document.documentElement.style.cssText = Object.entries(v).map(([prop, val]) => `${prop}: ${val}`).join(';')
            ));
        },

        // Export current custom palette as a downloadable CSS file
        exportPalette() {
            let mode = this.customMode,
                css = '',
                cssBody = ''; // Ensure variable accumulator exists

            if (mode === 'auto')
                mode = this.systemIsDark() ? 'dark' : 'light';

            // Gather all variables
            const v = this.getPaletteVariables(this.customColor, mode, this.useCustomBg ? this.customBgColor : null),
                name = this.paletteName || 'Custom Flux',
                slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                groups = [
                    { title: `Backgrounds (${mode === 'dark' ? 'Dark' : 'Light'} Mode)`, keys: ['--bg', '--bg-black', '--bg-alt', '--bg-card', '--bg-radial-start', '--bg-header-end', '--bg-tooltip'] },
                    { title: 'Text', keys: ['--text', '--text-white', '--text-light', '--text-sidebar', '--muted'] },
                    { title: 'Primary accent family', keys: ['--accent', '--accent-soft', '--accent-muted', '--accent-bright', '--focus-ring'] },
                    { title: 'Borders & Shadows', keys: ['--border', '--border-card', '--border-sidebar', '--border-code', '--shadow-soft', '--shadow-header', '--shadow-tooltip'] }
                ];

            // Format CSS text content
            groups.forEach((g, i) => {
                if (i > 0)
                    cssBody += '\n';
                cssBody += `    /* ${g.title} */\n`;
                g.keys.forEach(key => cssBody += `    ${key}: ${v[key]};\n`);
            });

            // Create and trigger download
            const a = document.createElement('a'),
                url = URL.createObjectURL(new Blob([
                    `:root {\n${cssBody}}`
                ], { type: 'text/css' }));
            a.href = url;
            a.download = `${slug || 'flux-palette'}.css`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }));
});