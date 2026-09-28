(() => {
    'use strict';
    const config = window.LECTURE_ANALYTICS;
    // Require an explicit switch, token AND exact origin (including port).
    // Missing or invalid configuration must never start external requests.
    if (!config || config.enabled !== true ||
        typeof config.token !== 'string' || !/^[a-f0-9]{32}$/i.test(config.token) ||
        !Array.isArray(config.allowedOrigins) ||
        !config.allowedOrigins.includes(window.location.origin) ||
        !['http:', 'https:'].includes(window.location.protocol)) return;

    if (document.querySelector('script[data-cf-beacon]')) return;
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.setAttribute('data-cf-beacon', JSON.stringify({ token: config.token }));
    document.head.appendChild(script);
})();
