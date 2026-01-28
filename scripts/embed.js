'use strict';
// Detect platform from URL
function detectPlatformFromUrl(url) {
    if (/(?:youtube\.com|youtu\.be)/.test(url))
        return 'youtube';
    if (/spotify\.com/.test(url))
        return 'spotify';
    if (/vimeo\.com/.test(url))
        return 'vimeo';
    if (/twitch\.tv/.test(url))
        return 'twitch';
    if (/tiktok\.com/.test(url))
        return 'tiktok';
    return null;
}

// Extract YouTube video ID
function extractYouTubeId(input) {
    if (!input)
        return null;
    const str = String(input).trim();

    // Regular expression patterns
    const patterns = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = str.match(pattern);
        if (match)
            return match[1];
    }

    return null;
}

// Generate YouTube embed
function generateYouTubeEmbed(input) {
    const videoId = extractYouTubeId(input);
    if (!videoId)
        return '';

    // Return the embed
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    return [
        '<div class="video-embed-container">',
        '  <iframe',
        '    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"',
        '    src="' + embedUrl + '"',
        '    frameborder="0"',
        '    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"',
        '    allowfullscreen',
        '    loading="lazy"',
        '  ></iframe>',
        '</div>'
    ].join('\n');
}

// Spotify track, playlist, and artist types
const SPOTIFY_TYPES = new Set(['track', 'playlist', 'artist', 'episode']);

// Extract Spotify track, playlist, and artist IDs
function extractSpotifyRef(input, forcedType) {
    if (!input)
        return null;
    const str = String(input).trim(),
        typeHint = forcedType && SPOTIFY_TYPES.has(forcedType) ? forcedType : null;

    // Regular expression patterns
    const patterns = [
        { regex: /^spotify:(track|playlist|artist|episode):([a-zA-Z0-9]+)$/, typeIndex: 1, idIndex: 2 },
        { regex: /open\.spotify\.com\/(track|playlist|artist|episode)\/([a-zA-Z0-9]+)/, typeIndex: 1, idIndex: 2 },
        { regex: /open\.spotify\.com\/embed\/(track|playlist|artist|episode)\/([a-zA-Z0-9]+)/, typeIndex: 1, idIndex: 2 }
    ];

    // Check each pattern
    for (const pattern of patterns) {
        const match = str.match(pattern.regex);
        if (match)
            return { type: match[pattern.typeIndex], id: match[pattern.idIndex] };
    }

    // Check for short IDs
    if (/^[a-zA-Z0-9]{22}$/.test(str))
        return { type: typeHint || 'track', id: str };

    return null;
}

// Generate Spotify embed
function generateSpotifyEmbed(input, forcedType) {
    const ref = extractSpotifyRef(input, forcedType);
    if (!ref)
        return '';

    // Extract type and ID
    const { type, id } = ref,
        embedUrl = `https://open.spotify.com/embed/${type}/${id}`,
        height = type === 'track' ? 80 : 352;

    // Return the embed
    return [
        '<div class="spotify-embed-inline">',
        '  <iframe',
        '    src="' + embedUrl + '"',
        '    width="100%"',
        '    height="' + height + '"',
        '    frameborder="0"',
        '    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"',
        '    loading="lazy"',
        '  ></iframe>',
        '</div>'
    ].join('\n');
}

// Extract Vimeo video ID
function extractVimeoId(input) {
    if (!input)
        return null;
    const str = String(input).trim(),
        match = str.match(/vimeo\.com\/(\d+)/);
    if (match)
        return match[1];
    if (/^(\d+)$/.test(str))
        return str;
    return null;
}

// Generate Vimeo embed
function generateVimeoEmbed(input) {
    const videoId = extractVimeoId(input);
    if (!videoId)
        return '';

    // Return the embed
    const embedUrl = `https://player.vimeo.com/video/${videoId}`;
    return [
        '<div class="video-embed-container">',
        '  <iframe',
        '    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"',
        '    src="' + embedUrl + '"',
        '    frameborder="0"',
        '    allow="autoplay; fullscreen; picture-in-picture"',
        '    allowfullscreen',
        '    loading="lazy"',
        '  ></iframe>',
        '</div>'
    ].join('\n');
}

// Twitch video and channel types
const TWITCH_TYPES = new Set(['video', 'channel']);

// Extract Twitch video or channel reference
function extractTwitchRef(input, forcedType) {
    if (!input)
        return null;
    const str = String(input).trim(),
        typeHint = forcedType && TWITCH_TYPES.has(forcedType) ? forcedType : null;

    // Video URL
    let match = str.match(/twitch\.tv\/videos\/(\d+)/);
    if (match)
        return { type: 'video', id: match[1] };

    // Channel URL
    match = str.match(/twitch\.tv\/([a-zA-Z0-9_]+)\/?$/);
    if (match) {
        const id = match[1];
        if (id.toLowerCase() !== 'videos')
            return { type: 'channel', id: id };
    }

    if (typeHint) {
        if (typeHint === 'video' && /^\d+$/.test(str))
            return { type: 'video', id: str };
        if (typeHint === 'channel' && /^[a-zA-Z0-9_]+$/.test(str))
            return { type: 'channel', id: str };
    }

    // Guess type for naked IDs
    if (/^\d+$/.test(str))
        return { type: 'video', id: str };
    if (/^[a-zA-Z0-9_]+$/.test(str))
        return { type: 'channel', id: str };

    return null;
}

// Generate Twitch embed
function generateTwitchEmbed(input, forcedType) {
    const ref = extractTwitchRef(input, forcedType);
    if (!ref)
        return '';

    // Extract type and ID
    const { type, id } = ref,
        url = new URL(hexo.config.url),
        parent = url.hostname;

    // Build embed URL
    let embedUrl;
    if (type === 'video') {
        embedUrl = `https://player.twitch.tv/?video=${id}&parent=${parent}`;
    } else { // channel
        embedUrl = `https://player.twitch.tv/?channel=${id}&parent=${parent}`;
    }

    // Return the embed
    return [
        '<div class="video-embed-container">',
        '  <iframe',
        '    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"',
        '    src="' + embedUrl + '"',
        '    frameborder="0"',
        '    allow="autoplay; fullscreen"',
        '    allowfullscreen',
        '    loading="lazy"',
        '  ></iframe>',
        '</div>'
    ].join('\n');
}

// Extract TikTok video info
function extractTikTokInfo(input) {
    if (!input) return null;
    const str = String(input).trim();
    let match;

    match = str.match(/(https?:\/\/(?:www\.)?tiktok\.com\/@.+?\/video\/(\d+))/);
    if (match)
        return { url: match[1], id: match[2] };

    if (/^\d+$/.test(str))
        return { url: null, id: str };

    return null;
}

// Generate TikTok embed
function generateTikTokEmbed(input) {
    const info = extractTikTokInfo(input);
    if (!info)
        return '';

    // Return the embed
    const citeAttr = info.url ? `cite="${info.url}"` : '';
    return [
        `<blockquote class="tiktok-embed" ${citeAttr} data-video-id="${info.id}" style="max-width: 605px;min-width: 325px;" >`,
        `<section></section>`,
        `</blockquote>`,
        `<script async src="https://www.tiktok.com/embed.js"></script>`
    ].join('');
}


// Generic 'embed' tag
//      {% embed <url/id> [hint] %}
//      {% embed <url/id> youtube %}
//      {% embed <url/id> vimeo %}
//      {% embed <url/id> spotify [track/playlist/artist/episode] %}
hexo.extend.tag.register('embed', function (args) {
    if (!args || !args.length)
        return '';

    // Parse arguments
    const input = args[0],
        hint = (args.length > 1) ? args[1].toLowerCase() : null,
        platform = detectPlatformFromUrl(input) || hint;

    // Switch on platform
    switch (platform) {
        case 'youtube':
            return generateYouTubeEmbed(input);
        case 'spotify':
            // For {% embed <id> spotify track %}
            const forcedSpotifyType = (args.length > 2 && SPOTIFY_TYPES.has(args[2].toLowerCase())) ? args[2].toLowerCase() : null;
            return generateSpotifyEmbed(input, forcedSpotifyType);
        case 'vimeo':
            return generateVimeoEmbed(input);
        case 'twitch':
            const forcedTwitchType = (args.length > 2 && TWITCH_TYPES.has(args[2].toLowerCase())) ? args[2].toLowerCase() : null;
            return generateTwitchEmbed(input, forcedTwitchType);
        case 'tiktok':
            return generateTikTokEmbed(input);
        default:
            return '';
    }
}, { ends: false });

// A list of embed tags to support
const embedTags = {
    youtube: (args) => generateYouTubeEmbed(args.join(' ')),
    spotify: (args) => {
        const forcedType = (args.length == 2 && SPOTIFY_TYPES.has(args[1].toLowerCase())) ? args[1].toLowerCase() : null;
        return generateSpotifyEmbed(args[0], forcedType);
    },
    vimeo: (args) => generateVimeoEmbed(args.join(' ')),
    twitch: (args) => {
        const forcedType = (args.length == 2 && TWITCH_TYPES.has(args[1].toLowerCase())) ? args[1].toLowerCase() : null;
        return generateTwitchEmbed(args[0], forcedType);
    },
    tiktok: (args) => generateTikTokEmbed(args.join(' ')),
};

// Loop the embed tags and register them
for (const tag of Object.keys(embedTags))
    hexo.extend.tag.register(tag, (args) => embedTags[tag](args), { ends: false });