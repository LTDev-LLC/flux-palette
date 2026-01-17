# Flux Palette

A responsive blog/journal [Hexo](https://hexo.io/) theme designed around the idea of multiple color palettes.

[DEMO](https://flux-palette.ltdev.llc/)

- [Features](#features)
- [Install](#install)
- [Configuration](#configuration)
  * Default [_config.yml](#_config.yml)

## Features

- Mobile friendly/responsive
- Multiple [color palettes](/source/css/palettes/)
  * Has support for user selection via select dropdown or can be disabled within the config
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
$ git clone --depth=1 https://github.com/LTDev-LLC/flux-palette.git themes/flux-palette ; rm -rf !$/.git
$ npm install @swc/core --save
```

OR updating:

```bash
$ cp themes/flux-palette/_config.yml theme-config.yml ; rm -rf themes/flux-palette
$ git clone --depth=1 https://github.com/LTDev-LLC/flux-palette.git themes/flux-palette ; rm -rf !$/.git
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
Can be disabled; see [_config.yml](#_config.yml) below.

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
    url: https://github.com/LTDev-LLC/flux-palette
    icon: mdi:github
  - name: Website
    url: https://flux-palette.ltdev.llc/
    icon: material-symbols:link
```

### Projects listings

You can add a list of active projects using a `source/_projects` folder similar to how posts work.

##### Example `source/_projects/flux-palette.md`

```yml
---
title: Flux Palette
date: 2025-12-1
project_url: https://github.com/LTDev-LLC/flux-palette
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

-   `<url/id>`: The full URL or the ID of the content to embed.
-   `[platform_hint]`: (Optional) If you use an ID instead of a URL, you must provide a platform hint. Supported platforms: `youtube`, `spotify`, `vimeo`, `twitch`, `tiktok`.
-   `[type_hint]`: (Optional) For Spotify, you can specify `track`, `playlist`, or `artist`. For Twitch, you can specify `video` or `channel`.

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

**Platform-specific tags:**

For convenience, legacy tags for each platform are also available.

```yml
{% youtube dQw4w9WgXcQ %}
{% spotify 1LcfcxzGNcselP4PIGeQ6V playlist %}
{% vimeo 59859181 %}
{% twitch theburntpeanut channel %}
{% tiktok 6718335390845095173 %}
```

### _config.yml

Below is the default config for Flux Palette found within [_config.yml](/_config.yml).

```yml
menu: # site menu
  Home: /
  Projects: /projects/
  Archives: /archives/
  Search : /search/
  Feed: /rss.xml

home: # home page configuration
  mode: blog # "blog" or "projects"

search: # search
  enabled: true # set to false to turn off search
  title: "Search" # page title

sidebar:
  recent_projects:
    enabled: true # set false to hide the section
    limit: 5 # how many recent projects to show
  social_buttons: # social buttons
    enabled: true # set to false to turn off social buttons
    inject_iconify: true # set to false to turn off Iconify
    size: 2.5em # icon size
  palette_selector: # palette selector
    enabled: true # set to false to turn off palette selector
    default: abyssal-blue # default palette selection
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

swc:
  enabled: true # set to false to turn off SWC
  target: es2020 # target environment
  minify: true # set to false to disable minification
  include: # folders to include
    - js/
  exclude: [] # folders to exclude

read_time: # read time options
  enabled: true # set to false to turn off read time
  write_front_matter: true # write read time to front matter
```

