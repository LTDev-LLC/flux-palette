document.addEventListener('alpine:init', () => {
    Alpine.data('codeCopy', () => ({
        copied: false,
        async copy() {
            // Find the <code> element within Hexo's table structure
            // Hexo structure: figure.highlight -> table -> td.code -> pre
            const figure = this.$el.closest('.highlight'),
                codeElement = figure ? figure.querySelector('td.code pre') : null;
            if (codeElement)
                try {
                    // writeText is supported in modern secure contexts
                    await navigator.clipboard.writeText(codeElement.innerText);
                    this.copied = true;
                    setTimeout(() => this.copied = false, 2000);
                } catch (err) {
                    console.error('Failed to copy: ', err);
                }
        }
    }));
});