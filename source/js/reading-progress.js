document.addEventListener('alpine:init', () => {
    Alpine.data('readingProgress', () => ({
        progress: 0,
        init() {
            // Bind the update function to 'this' to preserve context
            this.handleScroll = this.updateProgress.bind(this);

            // Add listeners directly to window
            document?.body?.addEventListener?.('scroll', this.handleScroll, { passive: true });
            window.addEventListener('resize', this.handleScroll, { passive: true });

            // Trigger once on load
            this.updateProgress();
        },
        updateProgress() {
            const el = this.$refs.content;
            if (!el)
                return;

            // Get current scroll position
            const rect = el.getBoundingClientRect(),
                windowHeight = window.innerHeight || document.documentElement.clientHeight,
                scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

            // Calculate progress
            const offsetTop = rect.top + scrollTop,
                current = scrollTop + windowHeight - offsetTop,
                percent = (current / rect.height) * 100;

            // Update progress
            this.progress = Math.min(100, Math.max(0, percent));
        }
    }));
});