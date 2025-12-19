'use strict';
const crypto = require('crypto'),
    fs = require('fs'),
    path = require('path'),
    fm = require('hexo-front-matter');

// Generate a short hash from a string
function makeShortHash(input) {
    return crypto.createHash('sha256').update(String(input)).digest('hex').slice(0, 8);
}

// HTML redirect template for short URLs
function redirectTemplate(target) {
    return [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '  <meta charset="utf-8">',
        '  <title>Redirecting…</title>',
        '  <meta http-equiv="refresh" content="0;url=' + target + '">',
        '  <link rel="canonical" href="' + target + '">',
        '</head>',
        '<body>',
        '  <p>This short link redirects to <a href="' + target + '">' + target + '</a></p>',
        '  <script>',
        '    try { window.location.replace(' + JSON.stringify(target) + '); } catch (e) {',
        '      window.location.href = ' + JSON.stringify(target) + ';',
        '    }',
        '  </script>',
        '</body>',
        '</html>'
    ].join('\n');
}

// Load projects from source/_projects/*.md
// (used so we can generate short URLs for project pages too)
function loadFolderProjects(hexo) {
    const base = path.join(hexo.base_dir, 'source', '_projects');

    if (!fs.existsSync(base))
        return [];

    // Read all Markdown files
    const entries = fs.readdirSync(base, { withFileTypes: true }),
        mdFiles = entries
            .filter(entry => entry.isFile())
            .map(entry => entry.name)
            .filter(name => /\.(md|markdown)$/i.test(name)),
        projects = [];

    // Parse each file, and add it to the projects array
    mdFiles.forEach(filename => {
        // Read the file
        const full = path.join(base, filename);
        let raw;
        try {
            raw = fs.readFileSync(full, 'utf8');
        } catch (err) {
            hexo.log.error('[short-url] Failed to read project file:', full);
            hexo.log.error(err);
            return;
        }

        // Parse the front matter
        let parsed;
        try {
            parsed = fm.parse(raw);
        } catch (err) {
            hexo.log.error('[short-url] Failed to parse front matter for project:', full);
            hexo.log.error(err);
            return;
        }

        // Build the project object variables
        const slug = parsed.slug || filename.replace(/\.(md|markdown)$/i, ''),
            stat = fs.statSync(full),
            date = parsed.date ? new Date(parsed.date) : stat.mtime,
            projectPath = 'projects/' + slug + '/',
            keySource = parsed.short_hash || projectPath,
            short_hash = parsed.short_hash || makeShortHash(keySource);

        // Add the project
        projects.push({
            slug,
            path: projectPath,
            title: parsed.title || slug,
            date,
            short_hash
        });
    });

    return projects;
}

// In-memory map of path -> short_hash so templates can ask for a hash by path.
const shortMap = {};

// Add short hashes to posts
hexo.extend.filter.register('after_post_render', function (data) {
    // Only apply to posts (and optionally pages if you want)
    if (data.layout !== 'post')
        return data;

    // Generate short hash
    if (!data.short_hash)
        data.short_hash = makeShortHash(data.permalink ||
            data.path ||
            data.slug ||
            data.title);

    // Add to in-memory map
    if (data.path)
        shortMap[data.path] = data.short_hash;

    return data;
});

// Generator: short URLs for both blog and projects
hexo.extend.generator.register('theme_short_urls', function (locals) {
    const urlBase = (this.config.url || '').replace(/\/+$/, ''),
        routes = [];

    // Loop through all posts
    locals.posts.forEach(post => {
        post.short_hash = post.short_hash || makeShortHash(post.permalink ||
            post.path ||
            post.slug ||
            post.title);

        // Add to in-memory map
        if (post.path)
            shortMap[post.path] = post.short_hash;

        // Create a redirect for each post
        routes.push({
            path: `s/${post.short_hash}/index.html`,
            data: () => redirectTemplate(`${urlBase}/${post.path.replace(/^\/+/, '')}`)
        });
    });

    // Projects from source/_projects
    const folderProjects = loadFolderProjects(this);

    // Create a redirect for each project
    folderProjects.forEach(project => {
        const shortPath = `s/${project.short_hash}/index.html`;
        shortMap[project.path] = project.short_hash;
        routes.push({
            path: shortPath,
            data: () => redirectTemplate(`${urlBase}/${project.path.replace(/^\/+/, '')}`)
        });
    });

    return routes;
});

// Return the short_hash for a given path
hexo.extend.helper.register('short_hash_for', function (targetPath) {
    if (!targetPath)
        return '';

    // Remove leading slashes
    const key = String(targetPath).replace(/^\/+/, '');
    return shortMap[key] || shortMap[`/${key}`] || '';
});
