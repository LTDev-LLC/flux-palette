'use strict';
hexo.extend.generator.register('theme_blog', function (locals) {
    const config = this.config || {},
        theme = this.theme.config || {},
        blogCfg = theme.blog || {};

    // Same rules as index: theme override -> index_generator.per_page -> per_page
    const perPage =
        blogCfg.per_page ||
        (config.index_generator && config.index_generator.per_page) ||
        config.per_page || 10;

    // Blog title, defaults to "Blog", not currently used
    const title = blogCfg.title || 'Blog';

    // All posts, newest first, filter projects
    const allPosts = locals.posts.sort('-date'),
        total = allPosts.length;
    if (!total)
        return [];

    // Paginated listing of posts mode
    const totalPages = perPage > 0 ? Math.ceil(total / perPage) : 1,
        routes = [];

    // Paginated listing: /blog/, /blog/page/2/, ...
    for (let i = 1; i <= totalPages; i++) {
        // Pagination setup
        const current = i,
            path = current === 1 ? 'blog/index.html' : `blog/page/${current}/index.html`,
            skip = perPage > 0 ? perPage * (current - 1) : 0,
            pagePosts = perPage > 0
                ? allPosts.skip(skip).limit(perPage)
                : allPosts,
            prev = current > 1 ? current - 1 : 0,
            next = current < totalPages ? current + 1 : 0,
            prev_link =
                prev > 0
                    ? (prev === 1 ? 'blog/' : `blog/page/${prev}/`)
                    : '',
            next_link =
                next > 0
                    ? `blog/page/${next}/`
                    : '';

        // Add route to collection
        routes.push({
            path,
            layout: ['blog'],
            data: {
                title,
                posts: pagePosts,
                current,
                total: totalPages,
                prev,
                next,
                prev_link,
                next_link,
                __is_blog: true
            }
        });
    }

    return routes;
});
