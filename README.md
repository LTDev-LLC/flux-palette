# Flux Palette

A responsive blog/journal [Hexo](https://hexo.io/) theme designed around the idea of multiple color palettes.

[DEMO](https://flux-palette.pages.dev/)

- [Features](#features)
- [Install](#install)
- [Configuration](#configuration)
  * Default [_config.yml](#_config.yml)

## Features

- Mobile friendly
- Multiple [color palettes](/source/css/palettes/)
  * Has support for user selection via select dropdown or can be disabled within the config
- Password encrypted posts
- Pre-compile JavaScript via [swc](https://swc.rs/)
- Approx. read time (default 238 wpm)
- RSS feed generator
- URL shortener/post hash generator
- Projects listings
- Social links/icons
- Local search
- Archived post listing

## Install

1. In the `root` directory:
   * Optionally, install `@swc/core` for use with pre-compilation.

```bash
$ git clone --depth=1 https://github.com/LouisT/flux-palette.git themes/flux-palette ; rm -rf !$/.git
$ npm install @swc/core --save
```

OR updating:

```bash
$ cp themes/flux-palette/_config.yml theme-config.yml ; rm -rf themes/flux-palette
$ git clone --depth=1 https://github.com/LouisT/flux-palette.git themes/flux-palette ; rm -rf !$/.git
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
    url: https://github.com/LouisT/flux-palette
    icon: mdi:github
  - name: Website
    url: https://flux-palette.pages.dev/
    icon: material-symbols:link

```

### Projects listings

You can add a list of active projects using a `source/_projects` folder similar to how posts work.

##### Example `source/_projects/flux-palette.md`

```yml
---
title: Flux Palette
date: 2025-12-1
project_url: https://github.com/LouisT/flux-palette
project_summary: "The Flux Palette source."
project_tags:
  - javascript
  - hexo
---
This is a post about my project...
```

### _config.yml

Below is the default config for Flux Palette found within [_config.yml](/_config.yml).

```yml
menu: # site menu
  Home: /
  Archives: /archives/
  Feed: /rss.xml

rss: # RSS feed options
  path: rss.xml # output file (relative to root)
  limit: 20 # number of posts
  include_drafts: false
  include_future: false
  mark_encrypted_in_title: true # prefix [Encrypted] to titles
  add_encrypted_element: true # add <encrypted>true</encrypted>

short_url: # short URL options
  enabled: true # set to false to turn off all short URLs
  prefix: s # /s/<hash>
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

palette_selector: # palette selector
  enabled: true # set to false to turn off palette selector
  default: abyssal-blue # default palette selection
  palette_folder: css/palettes # folder for palette css files
```

