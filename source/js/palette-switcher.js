document.addEventListener('alpine:init', () => {
    Alpine.data('paletteSwitcher', (palettes, defaultLight, defaultDark) => ({
        palettes: palettes,
        currentPalette: 'auto',
        systemListener: null,
        init() {
            // Determine initial state
            let key = 'auto';
            try {
                let hashget = new URLSearchParams(window.location.hash.substring(1) ?? '');
                key = hashget.get('theme') || localStorage.getItem('flux-palette-theme') || 'auto';
            } catch { }
            this.currentPalette = key;

            // Apply initial state WITHOUT updating the URL hash
            this.apply(key, false);

            // Watch for changes (user interaction) and DO update the URL hash
            this.$watch('currentPalette', (newKey) => this.apply(newKey, true));
        },
        apply(key, updateUrl = false) {
            if (!key)
                return;
            const cleanKey = String(key).replace(/[^a-zA-Z0-9_-]/g, '');

            // Clean up existing listener if any
            if (this.systemListener) {
                try {
                    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', this.systemListener);
                } catch (e) { }
                this.systemListener = null;
            }

            // Auto detect and apply system preference
            if (cleanKey === 'auto') {
                this.applySystem();
                this.systemListener = (e) => {
                    const sysKey = e.matches ? defaultDark : defaultLight;
                    document.documentElement.setAttribute('data-palette', sysKey);
                };
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.systemListener);
            } else {
                document.documentElement.setAttribute('data-palette', cleanKey);
            }

            // Save preference
            try {
                localStorage.setItem('flux-palette-theme', cleanKey);
            } catch { }

            // Update URL hash ONLY if requested (User interaction)
            if (updateUrl) {
                let curHash;
                try {
                    curHash = new URLSearchParams(window.location.hash.substring(1) ?? '');
                    if (cleanKey === 'auto') {
                        curHash.delete('theme');
                    } else {
                        curHash.set('theme', cleanKey);
                    }
                    const newHash = curHash.toString();
                    if (window.location.hash.substring(1) !== newHash) {
                        if (!newHash) {
                            history.replaceState(null, null, ' '); // Clear hash if empty
                        } else {
                            window.location.hash = newHash;
                        }
                    }
                } catch { }
            }
        },
        applySystem() {
            const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-palette', isDark ? defaultDark : defaultLight);
        }
    }));
});