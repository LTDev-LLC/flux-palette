// Utility function to wait for an element to appear in the DOM
function waitForElements(selectorObj, timeout = 5000) {
    return Promise.all(Object.keys(selectorObj).map(key => {
        const selector = selectorObj[key];

        return new Promise((resolve) => {
            let timer;

            // Check if it already exists
            const el = document.querySelector(selector);
            if (el)
                return resolve({ [key]: el });

            // Set up MutationObserver to watch for changes
            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    if (timer)
                        clearTimeout(timer);
                    observer.disconnect();
                    resolve({ [key]: element });
                }
            });

            // Start observing
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });

            // Timeout, reject if not found within specified time
            if (timeout)
                timer = setTimeout(() => {
                    observer.disconnect();
                    reject(new Error(`Timeout: Element "${selector}" not found within ${timeout}ms`));
                }, timeout);
        });
    })).then(results => {
        return Object.assign({}, ...results);
    });
}

// Navigation toggle for mobile
(async function () {
    let { toggle, nav } = await waitForElements({
        toggle: '.site-header .nav-toggle',
        nav: '.site-header #main-nav'
    });

    if (!toggle || !nav)
        return;

    // toggle menu visibility on click
    toggle.addEventListener('click', function () {
        var isOpen = nav.classList.toggle('is-open');
        toggle.classList.toggle('is-open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // close menu if resizing back to desktop size
    window.addEventListener('resize', function () {
        if (window.innerWidth > 768 && nav.classList.contains('is-open')) {
            nav.classList.remove('is-open');
            toggle.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });
})();
