'use strict';
const { escapeHTML } = require('hexo-util');

// Get theme and site config
function getThemeConfig(ctx) {
    return (ctx && ctx.theme && ctx.theme.config) ? ctx.theme.config : (hexo.theme && hexo.theme.config) || {};
}

// Get theme and site config
function getSiteConfig() {
    return (hexo && hexo.config) ? hexo.config : {};
}

// Resolve social items
function resolveSocialItems(ctx) {
    const themeCfg = getThemeConfig(ctx),
        siteCfg = getSiteConfig(),
        themeSocial = Array.isArray(themeCfg.social) ? themeCfg.social : [],
        siteSocial = Array.isArray(siteCfg.social) ? siteCfg.social : [];

    // Prefer theme social if present; otherwise fall back to site social
    return themeSocial.length ? themeSocial : siteSocial;
}

// Resolve social buttons config
function resolveSocialButtonsConfig(ctx) {
    const themeCfg = getThemeConfig(ctx),
        siteCfg = getSiteConfig(),
        siteSB = siteCfg.social_buttons || {},
        themeSB = themeCfg.sidebar?.social_buttons || {};

    // Site provides defaults; theme overrides
    return Object.assign({}, siteSB, themeSB);
}

// Check if URL is external
function isExternal(url) {
    return /^(https?:)?\/\/|^mailto:|^tel:/i.test(url);
}

// Parse tag arguments
function parseTagArgs(args = []) {
    // key:value, key=value, and boolean flags (e.g. "label")
    const out = {};
    for (const raw of args) {
        const m = String(raw).match(/^([^:=]+)[:=](.*)$/);
        if (m)
            out[m[1]] = m[2];
        else
            out[raw] = true;
    }
    return out;
}

// Build social buttons HTML
function buildButtons(ctx, options = {}) {
    const cfg = resolveSocialButtonsConfig(ctx),
        items = resolveSocialItems(ctx);

    if (!items.length)
        return '';
    if (!cfg.enabled)
        return '';

    const size = options.size || cfg.size || '2.5em';
    return items.filter(i => i && i.url).map(i => {
        const name = i.name || i.label || '',
            title = i.title || name,
            icon = i.icon || i.iconify || '', // e.g. "mdi:github"
            rel = i.rel || cfg.rel || 'me noopener noreferrer',
            target = i.target || cfg.target || '_blank';

        // Resolve URL
        const href = (!isExternal(i.url) && ctx && typeof ctx.url_for === 'function')
            ? ctx.url_for(i.url)
            : i.url;

        // Build the link
        return (icon || name) ? [
            `<a class="link" href="${escapeHTML(href)}"`,
            ` target="${escapeHTML(target)}" rel="${escapeHTML(rel)}"`,
            title ? ` title="${escapeHTML(title)}"` : '',
            name ? ` aria-label="${escapeHTML(name)}"` : '',
            '>',
            icon
                ? `<iconify-icon icon="${escapeHTML(icon)}" aria-hidden="true" style="font-size:${escapeHTML(String(size))};"></iconify-icon>`
                : '',
            (!icon && name)
                ? `<span label">${escapeHTML(name)}</span>`
                : '',
            '</a>'
        ].join('') : '';

    }).join('') || '';
}

// Usage in posts/pages: {% social_buttons %} or {% social_buttons size:1.4em label:true class:my-social %}
hexo.extend.tag.register('social_buttons', function (args) { return buildButtons(this, parseTagArgs(args)); });
hexo.extend.helper.register('social_buttons', function (options = {}) { return buildButtons(this, options); });

// Check if there are any social buttons
hexo.extend.helper.register('has_social_buttons', function () {
    const cfg = resolveSocialButtonsConfig(this);
    if (!cfg.enabled)
        return false;

    let items = resolveSocialItems(this);
    if (!items.length)
        return false;

    return items
        .some(i => i && typeof i.url === 'string' && i.url.trim().length > 0);
});