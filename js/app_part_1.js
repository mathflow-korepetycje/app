// Dynamiczny Manifest PWA + ikona aplikacji (do instalacji na ekranie głównym bez paska przeglądarki)
        (function setupPWA() {
            const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#4f46e5"/><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="240">√x</text></svg>`;
            const iconUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgIcon)));

            const appleIcon = document.createElement('link');
            appleIcon.rel = 'apple-touch-icon';
            appleIcon.href = iconUrl;
            document.head.appendChild(appleIcon);

            const manifest = {
                name: 'MathFlow – Korepetycje',
                short_name: 'MathFlow',
                start_url: '.',
                display: 'standalone',
                background_color: '#f8fafc',
                theme_color: '#0f172a',
                icons: [{ src: iconUrl, sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }]
            };
            const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
            const manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            manifestLink.href = URL.createObjectURL(blob);
            document.head.appendChild(manifestLink);
        })();