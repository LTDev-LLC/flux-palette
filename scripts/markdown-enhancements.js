'use strict';
// Markers for tab and accordion tags
const MARKER = {
    TAB_START: '@@FLUX_TAB_HEAD@@',
    TAB_SPLIT: '@@FLUX_TAB_SPLIT@@',
    TAB_END: '@@FLUX_TAB_FOOT@@',
    ACC_START: '@@FLUX_ACC_HEAD@@',
    ACC_SPLIT: '@@FLUX_ACC_SPLIT@@',
    ACC_END: '@@FLUX_ACC_FOOT@@'
};

// Helper to safely render Markdown string to HTML
function renderMd(text) {
    try {
        return hexo.render.renderSync({ text: text || '', engine: 'markdown' });
    } catch (e) {
        console.error('[Flux Tags] Render error:', e);
        return text;
    }
}

// Register child tag for tabs
hexo.extend.tag.register('tab', function (args, content) {
    return `${MARKER.TAB_START}${args.join(' ').replace(/["']/g, '')}${MARKER.TAB_SPLIT}${content || ''}${MARKER.TAB_END}`;
}, { ends: true });

// Register parent tag for tabs
hexo.extend.tag.register('tabs', function (args, content) {
    const raw = content || '',
        tabs = [],
        chunks = raw.split(MARKER.TAB_START);

    // Parse each tab block
    for (let i = 1; i < chunks.length; i++) {
        const chunk = chunks[i],
            endIdx = chunk.indexOf(MARKER.TAB_END);

        // No end marker
        if (endIdx === -1)
            continue;

        // Add tab
        const block = chunk.substring(0, endIdx),
            parts = block.split(MARKER.TAB_SPLIT);
        if (parts.length >= 2)
            tabs.push({
                title: parts[0].trim(),
                content: renderMd(parts.slice(1).join(MARKER.TAB_SPLIT))
            });
    }

    // No tabs found
    if (!tabs.length)
        return renderMd(raw);

    // Build tabs HTML
    let [
        nav,
        panels
    ] = tabs.reduce(([navAcc, panelAcc], tab, i) => ([
        navAcc += `<button type="button" class="tab-btn" :class="{ 'active': tab === ${i} }"  @click="tab = ${i}" role="tab">${tab.title}</button>`,
        panelAcc += `<div class="tab-panel" x-show="tab === ${i}"  x-cloak role="tabpanel">${tab.content}</div>`
    ]), ['<div class="tabs-nav" role="tablist">', '<div class="tabs-panels">']);

    // Return complete tabs HTML with Alpine.js logic
    return `<div class="tabs-container" x-data="${`{
        tab: 0,
        init() {
            this.check();
            window.addEventListener('hashchange', () => this.check());
        },
        check() {
            if (!window.location.hash)
                return;
            try {
                const el = document.querySelector(window.location.hash);
                if (el && this.$el.contains(el)) {
                    const panels = this.$el.querySelectorAll('.tab-panel');
                    for (let i = 0; i < panels.length; i++) {
                        if (panels[i].contains(el)) {
                            this.tab = i;
                            this.$nextTick(() => el.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            }));
                            break;
                        }
                    }
                }
            } catch (e) {}
        }
    }`.replace(/"/g, "'")}">${nav}</div>${panels}</div></div>`;
}, { ends: true });

// Child tag for accordion items
hexo.extend.tag.register('accordion', function (args, content) {
    return `${MARKER.ACC_START}${args.join(' ').replace(/["']/g, '')}${MARKER.ACC_SPLIT}${content || ''}${MARKER.ACC_END}`;
}, { ends: true });

// Parent tag for accordion
hexo.extend.tag.register('accordions', function (args, content) {
    const raw = content || '',
        items = [],
        chunks = raw.split(MARKER.ACC_START);

    // Parse each accordion block
    for (let i = 1; i < chunks.length; i++) {
        const chunk = chunks[i],
            endIdx = chunk.indexOf(MARKER.ACC_END);
        if (endIdx === -1)
            continue;

        // Add item
        const block = chunk.substring(0, endIdx),
            parts = block.split(MARKER.ACC_SPLIT);
        if (parts.length >= 2)
            items.push({
                title: parts[0].trim(),
                content: renderMd(parts.slice(1).join(MARKER.ACC_SPLIT))
            });
    }

    // No items found
    if (!items.length)
        return renderMd(raw);

    // Build accordion HTML
    let html = items.reduce((htmlAcc, item, i) => ([
        ...htmlAcc,
        `<div class="accordion-item">
            <button type="button"
                class="accordion-header"
                @click="active = (active === ${i} ? null : ${i})"
                :class="{ 'active': active === ${i} }">
                <span>${item.title}</span>
                <span x-text="active === ${i} ? '-' : '+'">+</span>
            </button>
            <div class="accordion-content" x-show="active === ${i}" x-collapse x-cloak>
                <div class="accordion-inner">${item.content}</div>
            </div>
        </div>`
    ]), ['<div class="accordion-group" x-data="{ active: null }">']).join('');

    // Replace the opening div with the robust x-data
    return html.replace(
        '<div class="accordion-group" x-data="{ active: null }">',
        `<div class="accordion-group" x-data="${`{
        active: null,
        init() {
            this.check();
            window.addEventListener('hashchange', () => this.check());
        },
        check() {
            if (!window.location.hash)
                return;
            try {
                const el = document.querySelector(window.location.hash);
                if (el && this.$el.contains(el)) {
                    const items = this.$el.querySelectorAll('.accordion-item');
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].contains(el)) {
                            this.$nextTick(() => items[i].scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            }));
                            break;
                        }
                    }
                }
            } catch (e) {}
        }
    }`.replace(/"/g, "'")}">`) + '</div>';
}, { ends: true });

// Inject Alpine.js copy button into Hexo's code blocks
hexo.extend.filter.register('after_post_render', function (data) {
    if (!data.content)
        return data;

    // Regex to match the opening tag of the figure and optional caption
    const regex = /(<figure class="highlight.*?>)(?:<figcaption>.*?<\/figcaption>)?/gi;

    // Inject Alpine.js copy button and language label
    data.content = data.content.replace(regex, (match, openTag) => {
        // Extract language from class="highlight language"
        let lang = 'code';
        const classMatch = /class=["']highlight\s+([a-zA-Z0-9\-_]+)/.exec(openTag);

        // Extract language from class="highlight"
        if (classMatch && classMatch[1])
            lang = classMatch[1];

        // Clean up display text
        if (lang === 'plain')
            lang = 'text';

        // Inject container with language label and copy button
        return `${match}
        <div class="code-actions">
            <button class="code-copy-btn" x-data="codeCopy" @click="copy" aria-label="Copy code">
                <span class="copy-icon" x-show="!copied">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </span>
                <span class="copy-text" x-show="!copied">Copy</span>
                <span class="copy-success" x-show="copied" x-cloak>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Copied!
                </span>
            </button>
            <span class="code-lang">${lang.toUpperCase()}</span>
        </div>`;
    });

    // Return modified data
    return data;
});