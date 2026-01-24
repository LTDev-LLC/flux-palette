'use strict';
const crypto = require('crypto'),
    fs = require('fs'),
    path = require('path');

const ALGORITHM = 'aes-256-gcm',
    ITERATIONS = 100000,
    KEY_LEN = 32,
    DIGEST = 'sha256',
    SALT_LEN = 16,
    IV_LEN = 16;

// Helper to fetch remote images using native fetch
async function fetchUrl(url) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Status Code: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return {
        buffer: Buffer.from(arrayBuffer),
        mime: res.headers.get('content-type')
    };
}

// Encrypt posts asynchronously using pbkdf2 after post is rendered
hexo.extend.filter.register('after_post_render', async function (data) {
    // Check for password
    let password = data.password;
    if (!password)
        return data;

    // Support environment variables (Format: password: "env:MY_SECRET")
    if (typeof password === 'string' && password.startsWith('env:')) {
        const envKey = password.substring(4);
        if (process.env[envKey]) {
            password = process.env[envKey];
        } else {
            hexo.log.warn(`[Encrypt] Environment variable '${envKey}' not found for post '${data.title}'. Encryption skipped.`);
            return data;
        }
    }

    // Embed Images (Local & Remote) as Base64
    if (data.content) {
        // Regex to match img tags and capture the src attribute
        const regex = /<img([^>]*)src=["']([^"']+)["']([^>]*)>/gi,
            matches = [...data.content.matchAll(regex)];

        if (matches.length > 0) {
            // Process all images asynchronously
            const replacements = await Promise.all(matches.map(async (match) => {
                const [fullTag, p1, src, p3] = match;

                // Skip already embedded data URIs
                if (src.startsWith('data:'))
                    return null;

                let buffer = null,
                    mime = 'application/octet-stream';

                // Remote image
                if (/^https?:\/\//.test(src)) {
                    try {
                        const result = await fetchUrl(src);
                        buffer = result.buffer;
                        if (result.mime)
                            mime = result.mime;
                    } catch (e) {
                        hexo.log.warn(`[Encrypt] Failed to fetch remote image: ${src} in post '${data.title}'. Error: ${e.message}`);
                        return null;
                    }
                }

                // Local image
                else {
                    let filePath;

                    // Try absolute path from source root (e.g., /images/foo.png)
                    if (src.startsWith('/'))
                        filePath = path.join(hexo.source_dir, src);

                    // Try relative to post asset folder
                    else if (data.asset_dir) {
                        const assetPath = path.join(data.asset_dir, src);
                        if (fs.existsSync(assetPath))
                            filePath = assetPath;
                    }

                    // Fallback to source root if no leading slash
                    if (!filePath || !fs.existsSync(filePath)) {
                        const trySource = path.join(hexo.source_dir, src);
                        if (fs.existsSync(trySource))
                            filePath = trySource;
                    }

                    if (filePath && fs.existsSync(filePath)) {
                        try {
                            buffer = fs.readFileSync(filePath);
                            const ext = path.extname(filePath).toLowerCase();
                            mime = {
                                '.png': 'image/png',
                                '.jpg': 'image/jpeg',
                                '.jpeg': 'image/jpeg',
                                '.gif': 'image/gif',
                                '.webp': 'image/webp',
                                '.svg': 'image/svg+xml',
                                '.bmp': 'image/bmp'
                            }[ext] || mime;
                        } catch (e) {
                            hexo.log.warn(`[Encrypt] Failed to read local image: ${src}. Error: ${e.message}`);
                            return null;
                        }
                    }
                }

                // If we successfully got a buffer, create the new tag
                if (buffer) {
                    const b64 = buffer.toString('base64'),
                        newTag = `<img${p1}src="data:${mime};base64,${b64}"${p3}>`;

                    return {
                        index: match.index,
                        length: fullTag.length,
                        newTag
                    };
                }
                return null;
            }));

            // Apply replacements in reverse order to preserve string indices
            replacements
                .filter(r => r !== null)
                .sort((a, b) => b.index - a.index)
                .forEach(({ index, length, newTag }) => {
                    data.content = data.content.substring(0, index) + newTag + data.content.substring(index + length);
                });
        }
    }

    // Generate Salt, IV and Key asynchronously
    const salt = await randomBytesAsync(SALT_LEN),
        iv = await randomBytesAsync(IV_LEN),
        key = await pbkdf2Async(password, salt, ITERATIONS, KEY_LEN, DIGEST);

    // Encrypt Content
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Construct Payload
    const encodedPayload = Buffer.from(JSON.stringify({
        ct: (cipher.update(data.content, 'utf8', 'base64') + cipher.final('base64')),
        s: salt.toString('base64'),
        iv: iv.toString('base64'),
        at: cipher.getAuthTag().toString('base64'),
        i: ITERATIONS
    })).toString('base64');

    // Replace content with UI Placeholder
    data.content = `
    <div class="encrypted-post" x-data="encryptedPost('${data.slug}', '${encodedPayload}')">
      <div class="encrypted-form" x-show="!decryptedContent">
        <div class="encrypted-input-wrap">
          <input
            type="password"
            class="encrypted-input"
            x-model="password"
            @keydown.enter.prevent="handleUnlock"
            :id="'pass-' + slug"
            placeholder=" "
            autocomplete="off"
          >
          <label class="encrypted-label" :for="'pass-' + slug">Enter password</label>
        </div>
        <button type="button" class="encrypted-button" @click="handleUnlock" :disabled="isDecrypting">Unlock</button>
        <p class="encrypted-error" x-show="error" x-text="error" style="display:none;"></p>
      </div>
      <div class="encrypted-post-content" x-show="decryptedContent" x-html="decryptedContent"></div>
    </div>`;

    // Data Hygiene
    data.excerpt = '<p>This post has been password protected.</p>';
    data.more = ''; // Clear "read more" content to prevent leaks

    // Remove the plaintext password from the object so it doesn't leak into JSON/XML feeds
    delete data.password;
    data.encrypted = true;

    return data;
});

// Helper Functions
function randomBytesAsync(size) {
    return new Promise((res, rej) => crypto.randomBytes(size, (err, buf) => (err || !buf) ? rej(err) : res(buf)));
}
function pbkdf2Async(password, salt, iterations, keylen, digest) {
    return new Promise((res, rej) => crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, derivedKey) => (err || !derivedKey) ? rej(err) : res(derivedKey)));
}