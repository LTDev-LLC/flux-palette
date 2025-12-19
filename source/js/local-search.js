(function () {
    var input = document.getElementById('local-search-input'),
        container = document.getElementById('local-search-results'),
        template = document.getElementById('local-search-result-template'),
        clearBtn = document.getElementById('local-search-clear');

    if (!input || !container || !template)
        return;

    var docs = [],
        indexLoaded = false,
        loading = false;

    // Lazy load index on first search
    function fetchIndex() {
        if (indexLoaded || loading)
            return;
        loading = true;
        fetch('/search/index.json', {
            credentials: 'same-origin'
        })
            .then((res) => res.json())
            .then(function (json) {
                docs = json && json.docs ? json.docs : [];
                indexLoaded = true;
                performSearch(input.value.trim());
            }).catch((err) => console.error('Search index load failed:', err));
    }

    // Clear html elements from container
    function clearResults() {
        while (container.firstChild)
            container.removeChild(container.firstChild);
    }

    // Perform search for query string and display results
    function performSearch(query) {
        clearResults();
        if (!query)
            return;

        if (!indexLoaded)
            return fetchIndex();

        var q = query.toLowerCase(),
            results = [];

        for (var i = 0; i < docs.length; i++) {
            var d = docs[i],
                haystack = (d.title + ' ' + (d.content || '') + ' ' + (d.excerpt || '')).toLowerCase();
            if (haystack.indexOf(q) !== -1)
                results.push(d);
        }

        // Display results, limit to 15
        results.slice(0, 15).forEach(function (d) {
            var node = template.content ?
                template.content.cloneNode(true) :
                template.cloneNode(true),
                link = node.querySelector('.result-link'),
                typeEl = node.querySelector('.result-type'),
                dateEl = node.querySelector('.result-date'),
                sepEl = node.querySelector('.meta-sep'),
                excerptEl = node.querySelector('.result-excerpt'),
                lockEl = node.querySelector('.result-lock');

            // Set link
            if (link) {
                link.textContent = d.title || '(Untitled)';
                link.href = d.url || '#';
            }

            // Set type
            if (typeEl)
                typeEl.textContent = d.type === 'project' ? 'Project' : 'Post';

            // Try to parse date
            if (dateEl && d.date)
                try {
                    var dt = new Date(d.date);
                    if (!isNaN(dt.getTime())) {
                        dateEl.textContent = dt.toISOString().slice(0, 10);
                        if (sepEl) sepEl.hidden = false;
                    }
                } catch (e) {
                    // ignore
                }


            // Set excerpt
            if (excerptEl)
                excerptEl.textContent = d.excerpt || '';

            // Set lock icon visibility (if present)
            if (lockEl && d.encrypted)
                lockEl.hidden = false;

            // Add to container
            container.appendChild(node);
        });
    }

    // Handle input events and trigger search
    input.addEventListener('input', function () {
        var q = this.value.trim();
        if (clearBtn) {
            clearBtn.style.visibility = q ? 'visible' : 'hidden';
            clearBtn.style.opacity = q ? '1' : '0';
        }
        if (!indexLoaded && q) {
            fetchIndex();
        } else {
            performSearch(q);
        }
    });

    // Handle clear button click and clear input
    if (clearBtn)
        clearBtn.addEventListener('click', function () {
            input.value = '';
            if (clearBtn) {
                clearBtn.style.visibility = 'hidden';
                clearBtn.style.opacity = '0';
            }
            clearResults();
            input.focus();
        });

    // Autofocus and maybe load index lazily when page is ready
    window.addEventListener('load', function () {
        try {
            input.focus();
        } catch (e) { }
    });
})();