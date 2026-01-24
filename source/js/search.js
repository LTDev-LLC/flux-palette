document.addEventListener('alpine:init', () => {
    Alpine.data('search', (config) => ({
        query: '',
        results: [],
        docs: [],
        indexLoaded: false,
        isLoading: false,
        error: null,
        mode: config?.mode || 'local',
        upstash: config?.upstash || {},
        supabase: config?.supabase || {},
        abortController: null,

        init() {
            if (this.$refs.searchInput)
                this.$refs.searchInput.focus();
            this.$watch('query', (q) => this.performSearch(q));
        },
        async performSearch(q) {
            this.error = null;
            if (!q || q.trim() === '') {
                this.results = [];
                this.isLoading = false;
                return;
            }
            if (this.mode === 'local')
                await this.searchLocal(q);
            else
                await this.searchRemote(q);
        },

        clearSearch() {
            this.query = '';
            this.results = [];
            this.error = null;
            this.isLoading = false;
            if (this.$refs.searchInput)
                this.$refs.searchInput.focus();
        },
        async searchLocal(q) {
            this.isLoading = true;
            try {
                // Load local index
                if (!this.indexLoaded) {
                    const res = await fetch('/search/index.json');
                    if (!res.ok)
                        throw new Error('Failed to load local index');
                    const json = await res.json();
                    this.docs = json?.docs ?? [];
                    this.indexLoaded = true;
                }

                // Tokenize query
                const tokens = this.tokenize(q);
                if (tokens.length === 0) {
                    this.results = [];
                    return;
                }

                // Search index for matches by token presence
                this.results = this.docs.filter(doc => {
                    const text = `${doc.title} ${doc.content || ''} ${doc.excerpt || ''}`.toLowerCase();
                    return tokens.every(t => text.includes(t));
                }).slice(0, 15);
            } catch (err) {
                console.error(err);
                this.error = 'Could not load search results.';
            } finally {
                this.isLoading = false;
            }
        },
        async searchRemote(q) {
            // Cancel previous request
            if (this.abortController)
                this.abortController.abort();

            // Start new request with AbortController
            this.abortController = new AbortController();
            const signal = this.abortController.signal;
            this.isLoading = true;

            try {
                // Figure out which strategy to use and tokenize query
                const strategy = this.getRemoteStrategy(),
                    tokens = this.tokenize(q);

                // Check for empty query
                if (!tokens.length) {
                    this.results = [];
                    return;
                }

                // Fetch IDs for each token
                const resultSets = await strategy.fetchIds(tokens, signal);
                if (resultSets.some(set => set.size === 0)) {
                    this.results = [];
                    return;
                }

                // Find common IDs
                let commonIds = Array.from(resultSets[0]);
                for (let i = 1; i < resultSets.length; i++)
                    commonIds = commonIds.filter(id => resultSets[i].has(id));

                // Check for empty results
                if (!commonIds.length) {
                    this.results = [];
                    return;
                }

                // Fetch docs for common IDs
                this.results = await strategy.fetchDocs(commonIds.slice(0, 15), signal);
            } catch (err) {
                if (err.name === 'AbortError')
                    return;
                console.error(err);
                this.error = 'Search service unavailable.';
            } finally {
                if (!signal.aborted)
                    this.isLoading = false;
            }
        },
        getRemoteStrategy() {
            const strategies = {
                upstash: {
                    fetchIds: async (tokens, signal) => {
                        // Fetch IDs from Upstash for each token in parallel using HSCAN command
                        const prefix = this.upstash.index || 'flux',
                            pipeline = tokens.map(t => [
                                "HSCAN", `${prefix}:index`, "0", "MATCH", `*${t}*`, "COUNT", 1000
                            ]),
                            res = await fetch(`${this.upstash.url}/pipeline`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${this.upstash.token}` },
                                body: JSON.stringify(pipeline),
                                signal
                            }).then(r => r.json());

                        // Parse results and extract IDs from fields values to remove duplicates
                        return res.map(item => {
                            const idSet = new Set(),
                                resultData = item.result;
                            if (resultData && Array.isArray(resultData) && resultData[1]) {
                                const fields = resultData[1];
                                for (let i = 1; i < fields.length; i += 2)
                                    fields[i].split(',').forEach(id => idSet.add(id));
                            }
                            return idSet;
                        });
                    },

                    // Fetch docs from Upstash by IDs
                    fetchDocs: async (ids, signal) => {
                        const prefix = this.upstash.index || 'flux',
                            cmd = ["HMGET", `${prefix}:docs`, ...ids],
                            res = await fetch(`${this.upstash.url}`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${this.upstash.token}` },
                                body: JSON.stringify(cmd),
                                signal
                            }).then(r => r.json());

                        // Parse results
                        return res.result.filter(Boolean).map(s => JSON.parse(s));
                    }
                },
                supabase: {
                    fetchIds: async (tokens, signal) => {
                        // Fetch IDs from Supabase for each token in parallel using OR query
                        const table = `${this.supabase.table || 'flux_search'}_index`,
                            orFilter = tokens.map(t => `word.ilike.*${t}*`).join(','),
                            params = new URLSearchParams({ select: 'word,doc_ids', or: `(${orFilter})` }),
                            rows = await fetch(`${this.supabase.url}/rest/v1/${table}?${params.toString()}`, {
                                headers: { 'apikey': this.supabase.key, 'Authorization': `Bearer ${this.supabase.key}` },
                                signal
                            }).then(r => r.json()),
                            sets = tokens.map(() => new Set());

                        // Parse results and extract IDs from rows
                        rows.forEach(row => {
                            const word = row.word.toLowerCase();
                            tokens.forEach((token, idx) => {
                                if (word.includes(token))
                                    row.doc_ids.forEach(id => sets[idx].add(id));
                            });
                        });
                        return sets;
                    },
                    fetchDocs: async (ids, signal) => {
                        // Fetch docs from Supabase by IDs
                        const table = `${this.supabase.table || 'flux_search'}_docs`,
                            idList = ids.map(id => `"${id}"`).join(',');
                        return await fetch(`${this.supabase.url}/rest/v1/${table}?id=in.(${idList})`, {
                            headers: { 'apikey': this.supabase.key, 'Authorization': `Bearer ${this.supabase.key}` },
                            signal
                        }).then(r => r.json());
                    }
                }
            };
            return strategies[this.mode];
        },
        tokenize(text) {
            return (text || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 0);
        }
    }));
});