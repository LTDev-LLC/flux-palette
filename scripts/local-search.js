'use strict';
const fs = require('fs'),
    path = require('path'),
    fm = require('hexo-front-matter');

// Basic HTML stripper for search index content.
function stripHtml(str) {
    return String(str || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Load projects from source/_projects/*.md
function loadProjectsForSearch(ctx) {
    const base = path.join(ctx.base_dir, 'source', '_projects');
    if (!fs.existsSync(base))
        return [];

    // Read all Markdown files
    const entries = fs.readdirSync(base, { withFileTypes: true }),
        mdFiles = entries
            .filter(entry => entry.isFile())
            .map(entry => entry.name)
            .filter(name => /\.(md|markdown)$/i.test(name));

    const projects = [];
    // Parse each file, and add it to the projects array
    mdFiles.forEach(filename => {
        const full = path.join(base, filename);
        let raw;
        try {
            raw = fs.readFileSync(full, 'utf8');
        } catch (err) {
            ctx.log.error('[local_search] Failed to read project file:', full);
            ctx.log.error(err);
            return;
        }

        let parsed;
        try {
            parsed = fm.parse(raw);
        } catch (err) {
            ctx.log.error('[local_search] Failed to parse front matter for:', full);
            ctx.log.error(err);
            return;
        }

        // Extract the body
        const body = parsed._content || '';
        delete parsed._content;

        // Build the project
        const slug = parsed.slug || filename.replace(/\.(md|markdown)$/i, ''),
            stat = fs.statSync(full),
            date = parsed.date ? new Date(parsed.date) : stat.mtime,
            projectPath = `projects/${slug}/`,
            excerpt = stripHtml(parsed.excerpt || body);

        // Add the project
        projects.push({
            id: 'project:' + slug,
            title: parsed.title || slug,
            url: projectPath,
            type: 'project',
            date: date.toISOString(),
            encrypted: false, // Projects are never encrypted
            tags: parsed.project_tags || parsed.tags || [],
            categories: [],
            excerpt,
            content: body
        });
    });

    return projects;
}

// Generator: local search index
hexo.extend.generator.register('theme_local_search_index', function (locals) {
    const ctx = this,
        cfg = ctx.config || {},
        theme = ctx.theme.config || {},
        searchCfg = theme.search || {};

    if (searchCfg.enabled === false) {
        ctx.log.info('[local_search] Disabled by theme config.');
        return;
    }

    const root = (cfg.root || '/').replace(/\/?$/, '/'),
        docs = [];

    // Blog posts
    locals.posts.forEach(post => {
        if (post.draft)
            return;

        const isEncrypted = !!(post.password || post.encrypted),
            url = post.permalink ? post.permalink : root + post.path;

        // Make the blog post encryption aware
        let text = '',
            excerpt = '';
        if (isEncrypted) {
            excerpt = 'This post has been password protected.';
            text = '';
        } else {
            text = stripHtml(post.excerpt && post.excerpt.length
                ? post.excerpt
                : post.content || '');
            excerpt = text.length > 220 ? text.slice(0, 217) + '…' : text;
        }

        // Add the post
        docs.push({
            id: 'post:' + (post._id || post.slug || post.path),
            title: post.title || '',
            url,
            type: 'post',
            date: post.date ? post.date.toISOString() : '',
            encrypted: isEncrypted,
            tags: post.tags ? post.tags.map(t => t.name) : [],
            categories: post.categories ? post.categories.map(c => c.name) : [],
            excerpt,
            content: text
        });
    });

    // Load projects (from _projects)
    const projectDocs = loadProjectsForSearch(ctx);
    projectDocs.forEach(p => {
        // Make URL root-aware
        let url = p.url;
        if (!/^https?:\/\//i.test(url)) {
            if (url.charAt(0) === '/')
                url = root.replace(/\/$/, '') + url;
            else
                url = root + url;
        }
        docs.push(Object.assign({}, p, { url }));
    });

    // If no docs found, warn
    if (!docs.length) {
        ctx.log.info('[local_search] No documents found for search index.');
    } else {
        ctx.log.info('[local_search] Indexed ' + docs.length + ' documents.');
    }

    return {
        path: 'search/index.json',
        data: function () {
            return JSON.stringify({ docs }, null, 2);;
        }
    };
});

// Generator: /search page using "search" layout
hexo.extend.generator.register('theme_local_search_page', function () {
    const theme = this.theme.config || {},
        searchCfg = theme.search || {};
    if (searchCfg.enabled === false)
        return;

    return {
        path: 'search/index.html',
        layout: 'search',
        data: {
            title: searchCfg.title || 'Search'
        }
    };
});
