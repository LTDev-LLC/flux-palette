document.addEventListener('alpine:init', () => {
    Alpine.data('encryptedPost', (slug, payloadEncoded) => ({
        slug,
        password: '',
        error: '',
        decryptedContent: '',
        isDecrypting: false,
        payloadEncoded,
        errorTimer: null,
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
        async decryptPayload(password, payload) {
            const ciphertext = this.base64ToUint8Array(payload.ct),
                authTag = this.base64ToUint8Array(payload.at),
                combinedData = new Uint8Array(ciphertext.length + authTag.length);
            combinedData.set(ciphertext);
            combinedData.set(authTag, ciphertext.length);
            return new TextDecoder().decode(await crypto.subtle.decrypt({
                name: 'AES-GCM',
                iv: this.base64ToUint8Array(payload.iv),
                tagLength: 128
            },
                (await this.deriveKey(password, this.base64ToUint8Array(payload.s), payload.i)),
                combinedData
            ));
        },
        async handleUnlock() {
            if (!this.password) {
                return await this.setError('Please enter a password.');
                return;
            }
            if (!this.payloadEncoded) {
                return await this.setError('No encrypted data found.');
            }
            let payload;
            try {
                payload = JSON.parse(atob(this.payloadEncoded));
            } catch (e) {
                return await this.setError('Failed to parse encrypted data.');
                return;
            }
            this.isDecrypting = true;
            this.error = '';
            try {
                this.decryptedContent = await this.decryptPayload(this.password, payload);
            } catch (e) {
                this.decryptedContent = '';
                return await this.setError('Incorrect password or decryption failed.');
            } finally {
                this.isDecrypting = false;
                this.password = '';
            }
        }
    }));
});
