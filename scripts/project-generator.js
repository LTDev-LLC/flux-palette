'use strict';
let fs = require('fs'),
    path = require('path'),
    fm = require('hexo-front-matter'),
    { slugize } = require('hexo-util');

// Cache to prevent infinite loops during generation
let projectsCache = null;

// Load all projects from the _projects folder
async function loadProjects(ctx) {
    if (hexo.env?.env !== 'development' && Array.isArray(projectsCache))
        return projectsCache;

    const base = path.join(ctx.base_dir, 'source', '_projects');
    if (!fs.existsSync(base))
        return [];

    const mdFiles = fs.readdirSync(base).filter(name => /\.(md|markdown)$/i.test(name)),
        projects = [];

    for (const filename of mdFiles) {
        const fullPath = path.join(base, filename),
            raw = fs.readFileSync(fullPath, 'utf8'),
            parsed = fm.parse(raw);

        // Prepare the data object for Hexo's internal post renderer
        const data = Object.assign({}, parsed, {
            content: parsed._content,
            full_source: fullPath,
            source: filename,
            engine: 'markdown'
        });

        // Passing 'null' prevents Hexo from trying to read the file again
        await ctx.post.render(null, data);
        const slug = parsed.slug || filename.replace(/\.(md|markdown)$/i, ''),
            stat = fs.statSync(fullPath);

        // data.content has now been transformed into HTML by Hexo
        // Store the project entry
        projects.push({
            ...parsed,
            content: data.content,   // The fully processed body HTML
            slug: slug,
            path: `projects/${slug}/`,
            date: parsed.date ? new Date(parsed.date) : stat.mtime,
            project_tags: parsed.project_tags || parsed.tags || [],
            read_time: (data.read_time ? data.read_time : {})
        });
    }

    // Sort the projects by weight and date (descending)
    return (projectsCache = projects.sort((a, b) => {
        const wA = a.weight || 0,
            wB = b.weight || 0;
        if (wA !== wB)
            return wB - wA;
        return b.date - a.date;
    }));
}

// Generator: /projects + paginated pages + project detail pages + project tags
hexo.extend.generator.register('theme_projects', async function (locals) {
    const theme = this.theme.config || {},
        projCfg = theme.projects || {},
        title = projCfg.title || 'Projects';

    // Load all projects
    let allProjects = await loadProjects(this, hexo.base_dir);
    if (!allProjects.length)
        return [];

    const config = this.config || {},
        perPage =
            projCfg.per_page ||
            (config.index_generator && config.index_generator.per_page) ||
            config.per_page ||
            10,
        total = allProjects.length,
        totalPages = perPage > 0 ? Math.ceil(total / perPage) : 1,
        routes = [];

    // Paginated listing: /projects/, /projects/page/2/, ...
    for (let i = 1; i <= totalPages; i++) {
        const current = i,
            listPath =
                current === 1
                    ? 'projects/index.html'
                    : `projects/page/${current}/index.html`,
            start = perPage > 0 ? perPage * (current - 1) : 0,
            end = perPage > 0 ? start + perPage : total,
            pageProjects = allProjects.slice(start, end),
            prev = current > 1 ? current - 1 : 0,
            next = current < totalPages ? current + 1 : 0,
            prev_link =
                prev > 0
                    ? (prev === 1 ? 'projects/' : `projects/page/${prev}/`)
                    : '',
            next_link =
                next > 0
                    ? `projects/page/${next}/`
                    : '';

        routes.push({
            path: listPath,
            layout: 'projects',
            data: {
                title,
                projects: pageProjects,
                current,
                total: totalPages,
                prev,
                next,
                prev_link,
                next_link
            }
        });
    }

    // Detail pages for _projects folder entries
    allProjects.forEach(project => {
        routes.push({
            path: project.path,
            layout: 'project',
            data: {
                title: project.title,
                project
            }
        });
    });

    // Project tags: /project-tag/<tag>/
    const tags = {};
    allProjects.forEach(project => {
        const pTags = project.project_tags || [];
        pTags.forEach(tag => {
            if (!tags[tag])
                tags[tag] = [];
            tags[tag].push(project);
        });
    });

    Object.keys(tags).forEach(tag => {
        const tagProjects = tags[tag],
            tagSlug = slugize(tag, { transform: 1 }),
            tagTotalPages = perPage > 0 ? Math.ceil(tagProjects.length / perPage) : 1;

        // Paginated listing: /project-tag/<tag>/, /project-tag/<tag>/page/2/, ...
        for (let i = 1; i <= tagTotalPages; i++) {
            const current = i,
                base = `project-tag/${tagSlug}`,
                path = current === 1 ? `${base}/index.html` : `${base}/page/${current}/index.html`,
                start = perPage > 0 ? perPage * (current - 1) : 0,
                end = perPage > 0 ? start + perPage : tagProjects.length,
                pageProjects = tagProjects.slice(start, end),
                prev = current > 1 ? current - 1 : 0,
                next = current < tagTotalPages ? current + 1 : 0,
                prev_link = prev > 0 ? (prev === 1 ? `${base}/` : `${base}/page/${prev}/`) : '',
                next_link = next > 0 ? `${base}/page/${next}/` : '';

            // Add route to collection
            routes.push({
                path: path,
                layout: 'projects',
                data: {
                    title: `Projects: ${tag}`,
                    projects: pageProjects,
                    current,
                    total: tagTotalPages,
                    prev,
                    next,
                    prev_link,
                    next_link,
                    is_tag_page: true,
                    tag_name: tag
                }
            });
        }
    });

    return routes;
});

// Helper for sidebar
hexo.extend.helper.register('recent_projects', function (limit = 5) {
    return (projectsCache || []).slice(0, limit);
});

// Helper to generate project tag URLs
hexo.extend.helper.register('project_tag_url', function (tag) {
    return this.url_for(`/project-tag/${slugize(tag, { transform: 1 })}/`);
});