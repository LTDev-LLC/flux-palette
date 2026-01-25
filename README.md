# Flux Palette

A responsive blog/journal [Hexo](https://hexo.io/) theme designed around the idea of multiple color palettes.

[DEMO](https://flux-palette.ltdev.llc/)

- [Features](#features)
- [Install](#install)
- [Configuration](#configuration)
  * [Password protected posts](#password-protected-posts)
  * [Read Time](#read-time)
  * [Social listings](#social-listings)
  * [Projects listings](#projects-listings)
  * [Embeds](#embeds)
  * [Comments](#comments)
  * [Default _config.yml](#_configyml)
  * [Search](#search)

## Features

- Mobile friendly/responsive
- Multiple [color palettes](/source/css/palettes/)
  * Support for user selection via dropdown or fixed via config
  * A custom ("flux") color picker/palette generator
- **SEO & Social Metadata** (Open Graph / Twitter Cards)
- **Comments** (Giscus & Utterances support)
- Password encrypted posts
- Pre-compile JavaScript via [swc](https://swc.rs/)
  * Used to compile Alpine.js features. Can compile any other added JavaScript.
- Approx. read time (default 238 wpm)
- RSS feed generator
- URL shortener/post hash generator
- Projects listings
- Social links/icons
- Local search
- Archived post listing

***Note: Uses [Alpine.js](https://alpinejs.dev/) for some UI features.***

## Install

1. In the `root` directory:
   * Optionally, install `@swc/core` for use with pre-compilation.

```bash
$ git clone --depth=1 https://github.com/LTDev-LLC/hexo-theme-flux-palette.git themes/flux-palette ; rm -rf !$/.git
$ npm install @swc/core --save
```

OR updating:

```bash
$ cp themes/flux-palette/_config.yml theme-config.yml ; rm -rf themes/flux-palette$ git clone --depth=1 https://github.com/LTDev-LLC/hexo-theme-flux-palette.git themes/flux-palette ; rm -rf !$/.git
$ mv theme-config.yml themes/flux-palette/_config.yml
```

2. Change the `theme` property in the `config.yml` file.

```yml
theme: flux-palette
```

3. Run: `hexo clean ; hexo g ; hexo s`

## Configuration

### Password protected posts

This is done in the front matter. Any post with `password` will be encrypted by that password.

```yml
---
title: Example Post
date: 2025-12-10 00:00:00
password: password-goes-here
---
```

### Read Time

The front matter if your posts will be updated with the estimated read time information.
Can be disabled; see [_config.yml](https://www.google.com/search?q=%23_config.yml) below.

```yml
---
title: Example Post
date: 2025-12-10 00:00:00
read_time_minutes: 4
read_time_words: 764
---
```

### Social listings

You can display social links/icons in the sidenav by adding a `social` config to either the root `_config.yml` or the theme config.

```yml
social:
  - name: GitHub
    url: https://github.com/LTDev-LLC/hexo-theme-flux-palette
    icon: mdi:github
  - name: Website
    url: https://flux-palette.ltdev.llc/
    icon: material-symbols:link
```

### Projects listings

You can add a list of active projects using a `source/_projects` folder similar to how posts work. You may also sort the projects by `weight` (descending) in the front matter.

##### Example `source/_projects/flux-palette.md`

```yml
---
title: Flux Palette
date: 2025-12-1
weight: 100
buttons:
  - name: GitHub
    url: https://github.com/LTDev-LLC/hexo-theme-flux-palette
  - name: Demo
    url: https://flux-palette.pages.dev/
project_summary: "The Flux Palette source."
project_tags:
  - javascript
  - hexo
---
This is a post about my project...
```

### Embeds

You can embed content from various platforms like YouTube, Spotify, Vimeo, Twitch, and TikTok within your posts using a powerful `embed` tag.

The plugin can automatically detect the platform from a URL.

**Generic `embed` tag:**

The generic `embed` tag is the most flexible way to embed content.

```
{% embed <url/id> [platform_hint] [type_hint] %}
```

* `<url/id>`: The full URL or the ID of the content to embed.
* `[platform_hint]`: (Optional) If you use an ID instead of a URL, you must provide a platform hint. Supported platforms: `youtube`, `spotify`, `vimeo`, `twitch`, `tiktok`.
* `[type_hint]`: (Optional) For Spotify, you can specify `track`, `playlist`, or `artist`. For Twitch, you can specify `video` or `channel`.

**Examples:**

```yml
---
title: My Awesome Post
date: 2025-12-1
---

{# YouTube from URL #}
{% embed https://www.youtube.com/watch?v=dQw4w9WgXcQ %}

{# YouTube from ID #}
{% embed dQw4w9WgXcQ youtube %}

{# Spotify track from URL #}
{% embed https://open.spotify.com/track/3cLqK3LPVrTIzfENVmYLoU %}

{# Spotify playlist from ID #}
{% embed 1LcfcxzGNcselP4PIGeQ6V spotify playlist %}

{# Vimeo from URL #}
{% embed https://vimeo.com/59859181 %}

{# Twitch channel from URL #}
{% embed https://www.twitch.tv/theburntpeanut %}

{# Twitch video from ID #}
{% embed 123456789 twitch video %}

{# TikTok from URL #}
{% embed https://www.tiktok.com/@scout2015/video/6718335390845095173 %}

```

### Comments

Flux Palette supports privacy-focused comment systems: [Giscus](https://www.google.com/search?q=https://giscus.app/) and [Utterances](https://www.google.com/search?q=https://utteranc.es/). Enable them in `_config.yml`.

You may disable comments on specific posts or projects in the front matter. Comments are disabled for any [password protected posts](#password-protected-posts).

**Giscus Example:**

```yml
comments:
  enabled: true
  service: giscus
  giscus:
    repo: "username/repo"
    repo_id: "R_..."
    category: "Announcements"
    category_id: "DIC_..."
    mapping: "pathname"
    reactions_enabled: "1"
    emit_metadata: "0"
    input_position: "top"
    theme: "preferred_color_scheme"
    lang: "en"
```

**Utterances Example:**

```yml
comments:
  enabled: true
  service: utterances
  utterances:
    repo: "username/repo"
    issue_term: "pathname"
    label: "comments"
    theme: "github-light"
```

Comments may also be disabled per-post or project in the front matter.

```yml
---
title: Example Post
date: 2025-12-10 00:00:00
comments: false
---
```

### Search

Flux Palette supports flexible search providers, allowing you to choose between a simple local index or powerful cloud databases. Configure your preferred provider in `_config.yml`.

**Supported Providers:** `local`, `upstash`, `supabase`

```yml
search:
  enabled: true
  title: "Search"
  service: "local" # Change to 'upstash' or 'supabase'
  # ... provider specific config below
```

#### 1. Local Search (Default)

Generates a `search.json` file at build time. Best for small static sites or when you want zero external dependencies.

* **Pros:** Zero setup, completely free, works offline once loaded, private.
* **Cons:** The entire index is downloaded by the client (can be heavy for large sites), basic "fuzzy" matching.

#### 2. Upstash (Redis)

Uses a serverless Redis database to store the index. This is the recommended option for performance and scalability.
[Sign up at Upstash](https://upstash.com/)

**Setup:**

1. Create a Redis database in the Upstash console.
2. Scroll down to the **REST API** section.
3. Copy the `UPSTASH_REDIS_REST_URL`.
4. Copy the `UPSTASH_REDIS_REST_TOKEN` (use this as your primary `token` for writing during builds).
5. Copy a Read-Only token to enable search support on the client side as `read_token`.

**Configuration:**

```yml
search:
  enabled: true
  title: "Search"
  service: upstash
  upstash:
    url: "https://your-db.upstash.io"
    token: "your_primary_token" # Used during 'hexo generate' to upload index
    read_token: "your_read_only_token" # Exposed to client for searching
    index: "flux" # Prefix for keys
```

* **Pros:** Extremely fast (millisecond latency), excellent fuzzy matching, generous free tier (10k req/day).
* **Cons:** Requires an external account.

#### 3. Supabase (PostgreSQL)

Uses a Postgres database to store and query the index.
[Sign up at Supabase](https://supabase.com/)

**Setup:**

1. Create a new project.
2. Go to the **SQL Editor** and run the following commands to create tables and enable public read access:
```sql
-- Create Tables
CREATE TABLE flux_search_docs (
  id text PRIMARY KEY,
  title text,
  url text,
  date text,
  type text,
  excerpt text,
  encrypted boolean
);
CREATE TABLE flux_search_index (
  word text PRIMARY KEY,
  doc_ids text[]
);

-- Enable RLS
ALTER TABLE flux_search_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flux_search_index ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read docs" ON flux_search_docs FOR SELECT TO public USING (true);
CREATE POLICY "Public read index" ON flux_search_index FOR SELECT TO public USING (true);
```
3. Go to **Project Settings > Data API**.
4. Copy the **Project URL**.
4. Go to **Project Settings > API Keys**.
6. Copy the `Publishable Key` key (use as `pub_key` for reading).
5. Copy the `Secret Keys` key (use as `sec_key` for writing).

**Configuration:**

```yml
search:
  enabled: true
  title: "Search"
  service: supabase
  supabase:
    url: "https://your-project.supabase.co"
    sec_key: "your_service_role_key" # Used during 'hexo generate'
    pub_key: "your_anon_key" # Exposed to client
    table: "flux_search" # Prefix for tables (e.g. flux_search_docs)
```

* **Pros:** Robust relational database, highly scalable, reliable ecosystem.
* **Cons:** Requires running SQL setup commands manually as well as an external account.

### _config.yml

Below is the default config for Flux Palette found within [_config.yml](/_config.yml).

```yml
menu: # site menu
  Home: /
  Projects: /projects/
  Misc:
    Archives: /archives/
    Search: /search/
    Feed: /rss.xml

home: # home page configuration
  mode: blog # "blog" or "projects"

blog: # blog page configuration
  title: "Blog" # custom title

projects: # projects page configuration
  title: "Projects" # custom title

search: # search
  enabled: true # set to false to turn off search
  title: "Search" # page title
  service: "local" # Change to 'upstash' or 'supabase'
  upstash:
    url: "https://your-db.upstash.io"
    token: "your_primary_token" # Used during 'hexo generate' to upload index
    read_token: "your_read_only_token" # Exposed to client for searching
    index: "flux" # Prefix for keys
  supabase:
    url: "https://your-project.supabase.co"
    sec_key: "your_service_role_key" # Used during 'hexo generate'
    pub_key: "your_anon_key" # Exposed to client
    table: "flux_search" # Prefix for tables (e.g. flux_search_docs)

backtotop: # back to top button
  enabled: true # set to false to turn off back to top button

sidebar:
  recent_projects:
    enabled: true # set false to hide the section
    limit: 5 # how many recent projects to show
  social_buttons: # social buttons
    enabled: true # set to false to turn off social buttons
    size: 1.6em # icon size
  palette_selector: # palette selector
    enabled: true # set to false to turn off palette selector
    default_dark: solar-amber # default dark palette
    default_light: paper-and-ink # default light palette
    palette_folder: css/palettes # folder for palette css files

rss: # RSS feed options
  path: rss.xml # output file (relative to root)
  limit: 20 # number of posts
  include_drafts: false
  include_future: false
  mark_encrypted_in_title: true # prefix [Encrypted] to titles
  add_encrypted_element: true # add <encrypted>true</encrypted>

short_url: # short URL options
  enabled: true # set to false to turn off all short URLs
  length: 6 # characters in hash

# Enable comments service (either 'giscus' or 'utterances')
# See https://giscus.app/#repository for giscus settings
# See https://utteranc.es/#install for utterances settings
comments:
  enabled: true
  service: giscus # Options: 'giscus', 'utterances'
  giscus:
    repo: "username/repository" # [Required]
    repo_id: "R_..." # [Required]
    category: "General" # [Required]
    category_id: "DIC_..." # [Required]
    mapping: "pathname"
    reactions_enabled: "1"
    emit_metadata: "0"
    input_position: "top"
    theme: "preferred_color_scheme"
    lang: "en"
  utterances:
    repo: "username/repository" # [Required]
    issue_term: "pathname"
    label: "comments"
    theme: "github-light"

swc:
  enabled: true # set to false to turn off SWC
  target: es2020 # target environment
  minify: true # set to false to disable minification
  include: # folders to include
    - js/
  exclude: [] # folders to exclude

read_time: # read time options
  enabled: true # set to false to turn off read time
  write_front_matter: false # write read time to front matter

# Show theme credit. Feeds our ego. Please, we're starving.
attribution: # attribution options
  enabled: true # set to false to turn off attribution
  link: https://ltdev.llc/projects/flux-palette/
  text: Flux Palette by LTDev LLC
```