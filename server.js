const http = require('http');
const fs = require('fs');
const path = require('path');
const { Scraper, SearchMode } = require('@the-convocation/twitter-scraper');

const PORT = process.env.PORT || 3000;
const scraper = new Scraper();

// Load cookies from cookies.json if present
const COOKIES_FILE = path.join(__dirname, 'twitter_cookies.json');
let sessionConfig = {
    authToken: '',
    ct0: '',
    isLoggedIn: false
};

async function initAuth() {
    try {
        if (fs.existsSync(COOKIES_FILE)) {
            const data = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
            if (data.authToken && data.ct0) {
                sessionConfig.authToken = data.authToken;
                sessionConfig.ct0 = data.ct0;
                await scraper.setCookies([
                    `auth_token=${data.authToken}; Domain=.x.com; Path=/; Secure; HttpOnly`,
                    `ct0=${data.ct0}; Domain=.x.com; Path=/; Secure`
                ]);
                sessionConfig.isLoggedIn = true;
                console.log('Loaded Twitter session cookies from twitter_cookies.json');
            }
        }
    } catch (e) {
        console.warn('Could not load saved cookies:', e.message);
    }
}

initAuth();

function extractUsername(input) {
    if (!input) return '';
    let str = input.trim();
    // Remove query params or hash
    str = str.split('?')[0].split('#')[0];
    // Match x.com/username or twitter.com/username
    const match = str.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i);
    if (match) return match[1];
    // Remove leading @
    if (str.startsWith('@')) return str.slice(1);
    // Return clean alphanumeric + underscore string
    const clean = str.replace(/[^a-zA-Z0-9_]/g, '');
    return clean;
}

// MIME types for static files
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // ──────────────── API: Check Status ────────────────
    if (pathname === '/api/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            isLoggedIn: sessionConfig.isLoggedIn,
            hasAuthToken: !!sessionConfig.authToken
        }));
        return;
    }

    // ──────────────── API: Save Session Cookies ────────────────
    if (pathname === '/api/settings' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { authToken, ct0 } = JSON.parse(body || '{}');
                if (authToken && ct0) {
                    sessionConfig.authToken = authToken.trim();
                    sessionConfig.ct0 = ct0.trim();
                    fs.writeFileSync(COOKIES_FILE, JSON.stringify(sessionConfig, null, 2), 'utf8');

                    await scraper.setCookies([
                        `auth_token=${sessionConfig.authToken}; Domain=.x.com; Path=/; Secure; HttpOnly`,
                        `ct0=${sessionConfig.ct0}; Domain=.x.com; Path=/; Secure`
                    ]);
                    sessionConfig.isLoggedIn = true;
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Session cookies saved successfully!' }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Both auth_token and ct0 cookies are required.' }));
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // ──────────────── API: Fetch Single Account ────────────────
    if (pathname === '/api/fetch-account' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { url, period = 'weekly', fetchPosts = true, authToken: clientAuth, ct0: clientCt0 } = JSON.parse(body || '{}');
                const username = extractUsername(url);

                if (!username) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Invalid profile URL or username.' }));
                    return;
                }

                if (clientAuth && clientCt0 && (!sessionConfig.authToken || sessionConfig.authToken !== clientAuth)) {
                    sessionConfig.authToken = clientAuth;
                    sessionConfig.ct0 = clientCt0;
                    await scraper.setCookies([
                        `auth_token=${clientAuth}; Domain=.x.com; Path=/; Secure; HttpOnly`,
                        `ct0=${clientCt0}; Domain=.x.com; Path=/; Secure`
                    ]);
                    sessionConfig.isLoggedIn = true;
                }

                console.log(`[API] Fetching profile: @${username} (period: ${period})`);
                const profile = await scraper.getProfile(username);
                if (!profile) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: `Could not find Twitter profile for @${username}` }));
                    return;
                }

                // Calculate date threshold
                // Weekly = 7 days, Monthly = 30 days
                const now = Date.now();
                const days = period === 'monthly' ? 30 : 7;
                const cutoffTime = now - (days * 24 * 60 * 60 * 1000);

                const posts = [];
                const allRecentPosts = [];
                let fetchWarning = null;

                if (fetchPosts) {
                    try {
                        console.log(`[API] Fetching tweets for @${username} (cutoff: ${new Date(cutoffTime).toISOString().slice(0, 10)}, session: ${sessionConfig.isLoggedIn ? 'Active' : 'Guest'})...`);
                        
                        // Collect candidates from getTweets
                        async function collectFromGen(generator) {
                            try {
                                for await (const tweet of generator) {
                                    if (!tweet || !tweet.id) continue;
                                    // Avoid duplicates
                                    if (allRecentPosts.some(p => p.id === tweet.id)) continue;

                                    const tweetDate = tweet.timeParsed ? new Date(tweet.timeParsed).getTime() : 0;
                                    const postObj = {
                                        id: tweet.id,
                                        url: `https://x.com/${username}/status/${tweet.id}`,
                                        reach: tweet.views || tweet.impressions || (tweet.likes ? tweet.likes * 10 : 0) || 0,
                                        likes: tweet.likes || 0,
                                        comments: tweet.replies || 0,
                                        views: tweet.views || 0,
                                        shares: tweet.retweets || 0,
                                        date: tweet.timeParsed,
                                        text: tweet.text || ''
                                    };

                                    allRecentPosts.push(postObj);
                                    if (tweetDate >= cutoffTime || tweetDate === 0) {
                                        posts.push(postObj);
                                    }
                                    if (posts.length >= 30 || allRecentPosts.length >= 40) break;
                                }
                            } catch (e) {
                                console.warn(`[API] Generator error for @${username}:`, e.message);
                            }
                        }

                        // Strategy 1: getTweets
                        await collectFromGen(scraper.getTweets(username, 40));

                        // Strategy 2: If no tweets found, try getTweetsAndReplies
                        if (allRecentPosts.length === 0) {
                            await collectFromGen(scraper.getTweetsAndReplies(username, 40));
                        }

                        // Strategy 3: If still none, try searchTweets
                        if (allRecentPosts.length === 0) {
                            await collectFromGen(scraper.searchTweets(`from:${username}`, 20, SearchMode.Latest));
                        }

                        // If no posts were in the exact date range, but recent posts exist,
                        // use the recent posts so the user doesn't see an empty list when posts exist!
                        if (posts.length === 0 && allRecentPosts.length > 0) {
                            console.log(`[API] No posts strictly in the last ${days} days for @${username}, using ${allRecentPosts.length} latest posts.`);
                            posts.push(...allRecentPosts.slice(0, 15));
                        }

                        if (posts.length === 0 && !sessionConfig.isLoggedIn) {
                            fetchWarning = "Twitter blocks public reading of posts without a login session. Click '⚙️ Session Settings' to enter your auth_token & ct0 cookies.";
                            console.warn(`[API] 0 posts returned for @${username}. Session is not logged in.`);
                        }
                    } catch (tweetErr) {
                        console.warn(`[API] Could not fetch tweets for @${username}:`, tweetErr.message);
                        if (!sessionConfig.isLoggedIn) {
                            fetchWarning = "Twitter requires an active session to read posts. Click '⚙️ Session Settings' to add cookies.";
                        }
                    }
                }

                const result = {
                    success: true,
                    warning: fetchWarning,
                    data: {
                        name: profile.name || username,
                        url: `https://x.com/${username}`,
                        initFollowers: 0,
                        currFollowers: profile.followersCount || 0,
                        friends: profile.followingCount || 0,
                        groups: 0,
                        posts: posts,
                        period: period
                    }
                };

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                console.error('[API] Error in fetch-account:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // ──────────────── Static Files ────────────────
    const cleanName = (pathname === '/' || pathname === '') ? 'index.html' : pathname.replace(/^\/+/, '');
    const candidatePaths = [
        path.join(__dirname, cleanName),
        path.join(__dirname, 'public', cleanName),
        path.join(process.cwd(), cleanName),
        path.join(process.cwd(), 'public', cleanName)
    ];

    let foundPath = null;
    for (const p of candidatePaths) {
        try {
            if (fs.existsSync(p) && fs.statSync(p).isFile()) {
                foundPath = p;
                break;
            }
        } catch (e) {}
    }

    if (!foundPath) {
        console.warn(`[Static] 404 Not Found for "${pathname}" (checked: ${candidatePaths.join(', ')})`);
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
    }

    const ext = path.extname(foundPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(foundPath).pipe(res);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} is already in use by another running process.`);
        console.error(`   If the server is already running, open http://localhost:${PORT} in your browser.`);
        console.error(`   To free port ${PORT}, you can close other node processes or run:`);
        console.error(`   Stop-Process -Name node -Force\n`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
        process.exit(1);
    }
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Performance Report Dashboard server running at:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`======================================================\n`);
});

