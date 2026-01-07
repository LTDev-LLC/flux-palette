document.addEventListener('alpine:init', () => {
    Alpine.data('search', () => ({
        query: '',
        results: [],
        docs: [],
        indexLoaded: false,
        loading: false,
        init() {
            this.$refs.searchInput.focus();
            this.$watch('query', (q) => this.performSearch(q));
        },
        fetchIndex() {
            if (this.indexLoaded || this.loading)
                return;
            this.loading = true;
            fetch('/search/index.json', { credentials: 'same-origin' })
                .then(res => res.json())
                .then(json => {
                    this.docs = json?.docs ?? [];
                    this.indexLoaded = true;
                    this.performSearch(this.query);
                })
                .catch(err => console.error('Search index load failed:', err))
                .finally(() => {
                    this.loading = false;
                });
        },
        performSearch(q) {
            if (!q) {
                this.results = [];
                return;
            }
            if (!this.indexLoaded) {
                this.fetchIndex();
                return;
            }
            this.results = this.docs.filter(d => ((d.title + ' ' + (d.content || '') + ' ' + (d.excerpt || '')).toLowerCase()).includes(q.toLowerCase)).slice(0, 15);
        },
        clearSearch() {
            this.query = '';
            this.results = [];
            this.$refs.searchInput.focus();
        }
    }));
});
