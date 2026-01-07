document.addEventListener('alpine:init', () => {
    Alpine.data('paletteSwitcher', (palettes, defaultKey) => ({
        palettes: palettes,
        currentPalette: defaultKey,
        init() {
            let key = defaultKey;
            try {
                let hashget = new URLSearchParams(window.location.hash.substring(1) ?? '');
                key = hashget.get('theme') || localStorage.getItem('flux-palette-theme') || defaultKey;
            } catch { }
            this.currentPalette = key;
            document.documentElement.setAttribute('data-palette', String(key).replace(/[^a-zA-Z0-9_-]/g, ''));
            this.$watch('currentPalette', (newKey) => this.apply(newKey));
        },
        apply(key) {
            if (!key)
                return;
            const cleanKey = String(key).replace(/[^a-zA-Z0-9_-]/g, '');
            document.documentElement.setAttribute('data-palette', cleanKey);
            try {
                localStorage.setItem('flux-palette-theme', cleanKey);
            } catch { }
            let curHash;
            try {
                curHash = new URLSearchParams(window.location.hash.substring(1) ?? '');
                curHash.set('theme', cleanKey);
                window.location.hash = curHash.toString();
            } catch { }
        }
    }));
});
