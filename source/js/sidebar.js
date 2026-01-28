document.addEventListener('alpine:init', () => {
    Alpine.data('sidebarSection', (id) => {
        const key = `flux-sidebar-${id}`,
            stored = sessionStorage.getItem(key),
            initialOpen = stored === null ? true : (stored === 'true');
        return {
            id: id,
            open: initialOpen,
            init() {
                this.$watch('open', val => sessionStorage.setItem(key, val));
            },
            toggle() {
                this.open = !this.open;
            }
        };
    });
});