document.addEventListener('alpine:init', () => {
    Alpine.data('encryptedPost', (slug, apiUrl) => ({
        slug,
        apiUrl,
        password: '',
        error: '',
        decryptedContent: '',
        isDecrypting: false,
        derivedKey: null,
        imagesData: {},
        base64ToUint8Array(b64) {
            const binary = atob(b64),
                len = binary.length,
                bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++)
                bytes[i] = binary.charCodeAt(i);
            return bytes;
        },
        async setError(msg, timeout = 5000) {
            clearTimeout(this.errorTimer);
            this.error = msg;
            if (timeout)
                this.errorTimer = setTimeout(() => this.error = '', timeout);
            return Promise.reject(new Error(msg));
        },
        async deriveKey(password, salt, iterations) {
            return crypto.subtle.deriveKey({
                name: 'PBKDF2',
                salt,
                iterations,
                hash: 'SHA-256'
            },
                (await crypto.subtle.importKey(
                    'raw',
                    (new TextEncoder()).encode(password), {
                    name: 'PBKDF2'
                },
                    false,
                    ['deriveKey']
                )), {
                name: 'AES-GCM',
                length: 256
            },
                true,
                ['decrypt']
            );
        },
        async decryptChunk(key, ctStr, ivStr, atStr) {
            const ciphertext = this.base64ToUint8Array(ctStr),
                authTag = this.base64ToUint8Array(atStr),
                iv = this.base64ToUint8Array(ivStr);

            // Web Crypto expects tag appended to ciphertext
            const combinedData = new Uint8Array(ciphertext.length + authTag.length);
            combinedData.set(ciphertext);
            combinedData.set(authTag, ciphertext.length);

            // Decrypt chunk
            return crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv, tagLength: 128 },
                key,
                combinedData
            );
        },
        async handleUnlock() {
            if (!this.password)
                return await this.setError('Please enter a password.');
            if (!this.apiUrl)
                return await this.setError('Configuration error: No API URL found.');

            this.isDecrypting = true;
            this.error = '';

            try {
                // Fetch the encrypted payload from the API
                const response = await fetch(this.apiUrl);
                if (!response.ok)
                    throw new Error('Failed to fetch encrypted content.');
                const payload = await response.json();

                // Derive and cache Key
                this.derivedKey = await this.deriveKey(
                    this.password,
                    this.base64ToUint8Array(payload.s),
                    payload.i
                );

                // Decrypt main post content
                const decryptedBuffer = await this.decryptChunk(
                    this.derivedKey,
                    payload.ct, // content ciphertext
                    payload.iv, // content iv
                    payload.at // content auth tag
                );

                // Reveal content
                this.decryptedContent = new TextDecoder().decode(decryptedBuffer);
                this.imagesData = payload.imgs || {};

                // Setup Lazy Loading after DOM update
                this.$nextTick(() => {
                    this.initLazyLoader();
                });
            } catch (e) {
                console.error(e);
                if (e.name === 'OperationError' || e.message.includes('decrypt'))
                    return await this.setError('Incorrect password or decryption failed.');
                return await this.setError('Failed to load content. Please check your connection.');
            } finally {
                this.isDecrypting = false;
                this.password = ''; // Clear password from memory
            }
        },
        initLazyLoader() {
            // Find container using x-ref
            const container = this.$refs.contentContainer;
            if (!container)
                return;

            // Find all placeholder images
            const images = container.querySelectorAll('img[data-enc-id]');
            if (images.length === 0)
                return;

            // Setup intersection observer
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target,
                            id = img.dataset.encId;

                        // Decrypt if we have data for this ID
                        if (id && this.imagesData[id]) {
                            this.revealImage(id, img);
                            observer.unobserve(img); // Only decrypt once
                        }
                    }
                });
            }, { rootMargin: '200px' }); // Preload 200px before appearing

            images.forEach(img => observer.observe(img));
        },
        async revealImage(id, imgEl) {
            try {
                const imgData = this.imagesData[id];

                // Decrypt image + set source
                imgEl.src = URL.createObjectURL(new Blob([
                    await this.decryptChunk(
                        this.derivedKey,
                        imgData.ct,
                        imgData.iv,
                        imgData.at
                    )
                ], { type: imgData.m }));

                // Remove from cache
                delete this.imagesData[id];
            } catch (e) {
                console.error(`Failed to decrypt image ${id}`, e);
                imgEl.alt = 'Decryption Failed';
            }
        }
    }));
});