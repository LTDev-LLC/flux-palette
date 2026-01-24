
'use strict';
const fs = require('fs'),
    path = require('path'),
    fm = require('hexo-front-matter'),
    https = require('https');

// List of supported providers
const providers = [
    'upstash',
    'supabase'
];

// Basic HTML stripper for search index content
function stripHtml(str) {
    return String(str || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Basic markdown stripper for search index content
function stripMarkdown(str) {
    if (!str) return '';
    return str
        .replace(/<[^>]*>/g, ' ') // HTML tags
        .replace(/!\[.*?\]\(.*?\)/g, '') // Images
        .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // Links
        .replace(/`{3}[\s\S]*?`{3}/g, '') // Code blocks
        .replace(/`(.+?)`/g, '$1') // Inline code
        .replace(/#+\s+/g, '') // Headings
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
        .replace(/(\*|_)(.*?)\1/g, '$2') // Italic
        .replace(/>\s+/g, '') // Blockquotes
        .replace(/- \s+/g, '') // Lists
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim();
}

// Tokenize text into words, preserving specific delimiters like dots/hyphens
function tokenize(text) {
    if (!text)
        return [];
    return (
        text.toLowerCase()
            .match(/[a-z0-9]+(?:[\.\-][a-z0-9]+)*/g) || []
    ).filter(w => w.length > 1);
}

// Load projects from the source/_projects folder
function loadProjectsForSearch(ctx) {
    const base = path.join(ctx.base_dir, 'source', '_projects');
    if (!fs.existsSync(base))
        return [];

    // Parse each file and add it to the projects array
    return fs.readdirSync(base, { withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => entry.name)
        .filter(name => /\.(md|markdown)$/i.test(name))
        .map(filename => {
            try {
                const raw = fs.readFileSync(path.join(base, filename), 'utf8'),
                    parsed = fm.parse(raw),
                    body = parsed._content || '',
                    slug = parsed.slug || filename.replace(/\.(md|markdown)$/i, ''),
                    stat = fs.statSync(path.join(base, filename)),
                    text = stripMarkdown(parsed.excerpt || body);

                return {
                    id: `project:${slug}`,
                    title: parsed.title || slug,
                    url: `projects/${slug}/`,
                    type: 'project',
                    date: (parsed.date ? new Date(parsed.date) : stat.mtime).toISOString(),
                    encrypted: false, // Never encrypted?
                    tags: (Array.isArray(parsed.tags)
                        ? parsed.tags
                        : parsed.tags?.data?.map(t => t.name)
                    ) || [], excerpt: text.length > 220 ? `${text.slice(0, 217)}...` : text,
                    content: text
                };
            } catch (e) { return null; }
        }).filter(p => p !== null);
}

// Gather all posts and projects into a uniform format
function gatherData(ctx, locals) {
    const docs = [];

    // Process blog posts
    locals.posts.forEach(post => {
        if (post.draft)
            return;

        const isEncrypted = !!(post.password || post.encrypted),
            url = post.permalink ? post.permalink.replace(ctx.config.url, '') : post.path;

        let text = '', excerpt = '';
        if (isEncrypted) {
            excerpt = 'This post has been password protected.';
        } else {
            text = stripHtml(post.excerpt && post.excerpt.length ? post.excerpt : post.content || '');
            excerpt = text.length > 220 ? `${text.slice(0, 217)}…` : text;
        }

        docs.push({
            id: 'post:' + (post._id || post.slug || post.path),
            title: post.title || '',
            url: url.startsWith('/') ? url : '/' + url,
            type: 'post',
            date: post.date ? post.date.toISOString() : '',
            encrypted: isEncrypted,
            tags: (Array.isArray(post.tags)
                ? post.tags
                : post.tags?.data?.map(t => t.name)
            ) || [],
            excerpt,
            content: text
        });
    });

    // Process Projects
    loadProjectsForSearch(ctx).forEach(p => {
        let url = p.url;
        if (!/^https?:\/\//i.test(url))
            url = url.startsWith('/') ? url : '/' + url;
        docs.push(Object.assign({}, p, { url }));
    });

    return docs;
}

// Perform request to Upstash
async function upstashRequest(urlStr, token, commands) {
    const response = await fetch(new URL(`${urlStr}/pipeline`), {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(commands)
    });

    // Fetch does not throw on 4xx/5xx errors, so we check response.ok manually
    if (!response.ok)
        throw new Error(await response.text());

    // Parse JSON
    return await response.json();
}

// Perform request to Supabase
async function supabaseRequest(urlStr, key, endpoint, method, body) {
    const response = await fetch(new URL(`${urlStr}/rest/v1/${endpoint}`), {
        method: method,
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        // Only stringify and attach body if it is truthy
        body: body ? JSON.stringify(body) : undefined
    });

    // Get raw text from response
    const data = await response.text();
    if (!response.ok)
        throw new Error(data);

    return data;
}

// Create local search index file (search/index.json)
hexo.extend.generator.register('theme_search', async function (locals) {
    const config = this.theme.config.search || {};
    if (config.enabled === false)
        return;

    if (!providers.includes(config.service)) {
        const docs = gatherData(this, locals);
        this.log.info('[local_search] Generated ' + docs.length + ' docs for local index.');
        return {
            path: 'search/index.json',
            data: JSON.stringify({ docs }, null, 2)
        };
    }
});

// Upload index to remote providers after generation
hexo.extend.filter.register('after_generate', async function () {
    if (hexo.env.cmd !== 'generate' && hexo.env.cmd !== 'g')
        return;

    const ctx = this,
        config = ctx.theme.config.search || {};

    if (!config.enabled)
        return;

    const service = config.service;
    if (!providers.includes(service))
        return;

    const ups = config.upstash || {},
        sb = config.supabase || {};

    // Validate credentials
    if (service === 'upstash' && (!ups.url || !ups.token))
        return ctx.log.warn('[upstash] Missing credentials.');
    if (service === 'supabase' && (!sb.url || !sb.sec_key))
        return ctx.log.warn('[supabase] Missing credentials.');

    ctx.log.info(`[${service}_search] Gathering data...`);

    // Gather data
    const docs = gatherData(ctx, hexo.locals.toObject());
    if (!docs.length)
        return;

    // Prepare data structures
    const wordMap = new Map(),
        docMap = new Map(),
        docList = [];

    // Process documents
    docs.forEach(doc => {
        // Minify document for storage
        const minDoc = {
            id: doc.id,
            title: doc.title,
            url: doc.url,
            date: doc.date,
            type: doc.type,
            excerpt: doc.excerpt,
            encrypted: doc.encrypted
        };
        docMap.set(doc.id, JSON.stringify(minDoc));
        docList.push(minDoc);

        // Index unique tokens
        const uniqueWords = new Set([
            ...tokenize(doc.content),
            ...tokenize(doc.title),
            ...tokenize(doc.tags.join(' '))
        ]);

        // Add to index
        uniqueWords.forEach(word => {
            if (!wordMap.has(word))
                wordMap.set(word, new Set());

            // Add doc ID
            wordMap.get(word).add(doc.id);

            // Fuzzy match support, split complex tokens
            if (/[\.\-]/.test(word))
                word.split(/[\.\-]/).filter(p => p.length > 1).forEach(p => {
                    if (!wordMap.has(p))
                        wordMap.set(p, new Set());
                    wordMap.get(p).add(doc.id);
                });
        });
    });

    // Upload to Upstash
    switch (String(service).toLowerCase()) {
        case 'upstash':
            const prefix = ups.index || 'flux',
                pipeline = [["DEL", `${prefix}:docs`], ["DEL", `${prefix}:index`]];
            try {
                // Create new docs hash set
                let dArgs = ["HSET", `${prefix}:docs`];
                docMap.forEach((val, key) => {
                    dArgs.push(key, val);
                    if (dArgs.length > 500) {
                        pipeline.push(dArgs);
                        dArgs = ["HSET", `${prefix}:docs`];
                    }
                });

                if (dArgs.length > 2)
                    pipeline.push(dArgs);

                // Create new index hash set
                let iArgs = ["HSET", `${prefix}:index`];
                wordMap.forEach((ids, word) => {
                    iArgs.push(word, Array.from(ids).join(','));
                    if (iArgs.length > 500) {
                        pipeline.push(iArgs);
                        iArgs = ["HSET", `${prefix}:index`];
                    }
                });

                // Push last batch
                if (iArgs.length > 2)
                    pipeline.push(iArgs);

                // Upload docs to Upstash
                ctx.log.info(`[upstash] Uploading index (${docs.length} docs, ${wordMap.size} keywords)...`);
                for (let i = 0; i < pipeline.length; i += 100)
                    await upstashRequest(ups.url, ups.token, pipeline.slice(i, i + 100)).catch(e => ctx.log.error(e.message));
            } catch (e) {
                ctx.log.error(`[upstash] Error: ${e.message}`);
            }
            break;

        // Upload to Supabase
        case 'supabase':
            const tDocs = (sb.table || 'flux_search') + '_docs',
                tIndex = (sb.table || 'flux_search') + '_index',
                indexList = Array.from(wordMap).map(([w, ids]) => ({ word: w, doc_ids: Array.from(ids) }));
            try {
                ctx.log.info(`[supabase] Clearing old data...`);

                // Clear old data
                await supabaseRequest(sb.url, sb.sec_key, `${tDocs}?id=neq.placeholder`, 'DELETE');
                await supabaseRequest(sb.url, sb.sec_key, `${tIndex}?word=neq.placeholder`, 'DELETE');

                ctx.log.info(`[supabase] Uploading ${docs.length} docs & ${indexList.length} keywords...`);

                // Upload docs to Supabase
                for (let i = 0; i < docList.length; i += 100)
                    await supabaseRequest(sb.url, sb.sec_key, tDocs, 'POST', docList.slice(i, i + 100));

                // Upload index to Supabase
                for (let i = 0; i < indexList.length; i += 500)
                    await supabaseRequest(sb.url, sb.sec_key, tIndex, 'POST', indexList.slice(i, i + 500));
            } catch (e) {
                ctx.log.error(`[supabase] Error: ${e.message}`);
            }
            break;
    }

    ctx.log.info(`[${service}_search] Index updated successfully.`);
});

// Search page structure
hexo.extend.generator.register('theme_search_page', function () {
    const config = this.theme.config.search || {};
    if (config.enabled === false)
        return;
    return {
        path: 'search/index.html',
        layout: 'search',
        data: { title: config.title || 'Search' }
    };
});