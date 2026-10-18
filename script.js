// ══════════════════════════════════════════════════════════════════
//  PERFORMANCE REPORT DASHBOARD — JAVASCRIPT
// ══════════════════════════════════════════════════════════════════

// State for uploaded screenshots
const uploadedScreenshots = [];

// ─────────────────────────────────────────────
//  INITIALIZATION
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
    // Attach button listeners
    document.getElementById("addAccountBtn").addEventListener("click", () => addAccount());

    // Highlight add buttons
    document.getElementById("addWeeklyHighlightBtn").addEventListener("click", () => addWeeklyAchievement(""));
    document.getElementById("addMonthlyAchieveBtn").addEventListener("click", () => addMonthlyAchievement(""));
    document.getElementById("addMonthlyDevBtn").addEventListener("click", () => addMonthlyDevelopment(""));
    document.getElementById("addMonthlyEventsBtn").addEventListener("click", () => addMonthlyCoveredEvent(""));

    // Download buttons
    document.getElementById("downloadWeeklyPptxBtn").addEventListener("click", downloadWeeklyReport);
    document.getElementById("downloadMonthlyPptxBtn").addEventListener("click", downloadMonthlyReport);

    // Screenshot handlers
    setupScreenshots();

    // Twitter Fetcher setup
    setupTwitterFetcher();

    // Populate initial default samples matching the user's template data
    populateDefaultData();
});

// ─────────────────────────────────────────────
//  ACCOUNT & POST MANAGEMENT
// ─────────────────────────────────────────────
let accountCounter = 0;

function addAccount(initialData = null) {
    accountCounter++;
    const container = document.getElementById("accountsContainer");

    const card = document.createElement("div");
    card.className = "account-card";
    card.dataset.accountId = accountCounter;

    card.innerHTML = `
        <div class="account-header">
            <h3 class="account-title">Account ${accountCounter}</h3>
            <button type="button" class="btn-danger delete-account-btn" title="Delete this account">
                🗑️ Delete Account
            </button>
        </div>

        <div class="account-details">
            <label>
                Account Name:
                <input type="text" class="account-name" placeholder="e.g. Tijana Lazic" value="${initialData?.name || ''}">
            </label>

            <label>
                Profile URL:
                <input type="url" class="profile-url" placeholder="https://x.com/username" value="${initialData?.url || ''}">
            </label>

            <label>
                Initial Followers:
                <input type="number" class="initial-followers" min="0" value="${initialData?.initFollowers ?? 0}">
            </label>

            <label>
                Current Followers:
                <input type="number" class="current-followers" min="0" value="${initialData?.currFollowers ?? 0}">
            </label>

            <label>
                Friends:
                <input type="number" class="account-friends" min="0" value="${initialData?.friends ?? 0}">
            </label>

            <label>
                Groups Joined:
                <input type="number" class="account-groups" min="0" value="${initialData?.groups ?? 0}">
            </label>
        </div>

        <div class="posts-section">
            <div class="posts-header">
                <h4>Posts</h4>
                <button type="button" class="btn-secondary btn-sm add-post-btn">+ Add Post</button>
            </div>
            <div class="posts-container"></div>
        </div>

        <div class="account-summary-row">
            <table class="account-summary-table">
                <thead>
                    <tr>
                        <th>Total Posts</th>
                        <th>Total Reach</th>
                        <th>Total Likes</th>
                        <th>Total Comments</th>
                        <th>Total Video Views</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="acc-total-posts">0</td>
                        <td class="acc-total-reach">0</td>
                        <td class="acc-total-likes">0</td>
                        <td class="acc-total-comments">0</td>
                        <td class="acc-total-views">0</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    // Wire Delete Account button
    card.querySelector(".delete-account-btn").addEventListener("click", function () {
        card.remove();
        renumberAccounts();
        updateSummary();
    });

    // Wire Add Post button
    card.querySelector(".add-post-btn").addEventListener("click", function () {
        addPost(card);
    });

    container.appendChild(card);

    // If initial posts were passed
    if (initialData?.posts && Array.isArray(initialData.posts)) {
        initialData.posts.forEach(p => addPost(card, p));
    }

    renumberAccounts();
    updateSummary();
}

function renumberAccounts() {
    const cards = document.querySelectorAll("#accountsContainer .account-card");
    accountCounter = cards.length;
    cards.forEach((card, index) => {
        const title = card.querySelector(".account-title");
        if (title) title.textContent = `Account ${index + 1}`;
    });
}

function addPost(accountCard, initialData = null) {
    const postsContainer = accountCard.querySelector(".posts-container");
    const postNumber = postsContainer.children.length + 1;

    const row = document.createElement("div");
    row.className = "post-entry";

    row.innerHTML = `
        <div class="post-entry-header">
            <h5 class="post-title">Post ${postNumber}</h5>
            <button type="button" class="btn-danger btn-sm delete-post-btn" title="Delete this post">
                🗑️ Delete Post
            </button>
        </div>

        <div class="post-details">
            <label>
                Post URL:
                <input type="url" class="post-url" placeholder="https://x.com/user/status/..." value="${initialData?.url || ''}">
            </label>

            <label>
                Reach:
                <input type="number" class="post-reach" min="0" value="${initialData?.reach ?? 0}">
            </label>

            <label>
                Likes:
                <input type="number" class="post-likes" min="0" value="${initialData?.likes ?? 0}">
            </label>

            <label>
                Comments:
                <input type="number" class="post-comments" min="0" value="${initialData?.comments ?? 0}">
            </label>

            <label>
                Video Views:
                <input type="number" class="post-views" min="0" value="${initialData?.views ?? 0}">
            </label>
        </div>
    `;

    // Wire Delete Post button
    row.querySelector(".delete-post-btn").addEventListener("click", function () {
        row.remove();
        renumberPosts(accountCard);
        updateSummary();
    });

    postsContainer.appendChild(row);
    renumberPosts(accountCard);
    updateSummary();
}

function renumberPosts(accountCard) {
    const posts = accountCard.querySelectorAll(".post-entry");
    posts.forEach((post, index) => {
        const title = post.querySelector(".post-title");
        if (title) title.textContent = `Post ${index + 1}`;
    });
}

// Recalculate summary totals whenever input changes
document.getElementById("accountsContainer").addEventListener("input", updateSummary);

function updateSummary() {
    const accounts = document.querySelectorAll(".account-card");

    let totalPosts = 0;
    let totalReach = 0;
    let totalLikes = 0;
    let totalFriends = 0;
    let totalComments = 0;
    let totalVideoViews = 0;
    let totalGroups = 0;
    let totalInitialFollowers = 0;
    let totalCurrentFollowers = 0;

    accounts.forEach(function (card) {
        totalInitialFollowers += getNumber(card, ".initial-followers");
        totalCurrentFollowers += getNumber(card, ".current-followers");
        totalFriends += getNumber(card, ".account-friends");
        totalGroups += getNumber(card, ".account-groups");

        const posts = card.querySelectorAll(".post-entry");
        totalPosts += posts.length;

        let accReach = 0;
        let accLikes = 0;
        let accComments = 0;
        let accViews = 0;

        posts.forEach(function (post) {
            const reach = getNumber(post, ".post-reach");
            const likes = getNumber(post, ".post-likes");
            const comments = getNumber(post, ".post-comments");
            const views = getNumber(post, ".post-views");

            accReach += reach;
            accLikes += likes;
            accComments += comments;
            accViews += views;

            totalReach += reach;
            totalLikes += likes;
            totalComments += comments;
            totalVideoViews += views;
        });

        // Update the account's individual summary table
        const elPosts = card.querySelector(".acc-total-posts");
        const elReach = card.querySelector(".acc-total-reach");
        const elLikes = card.querySelector(".acc-total-likes");
        const elComments = card.querySelector(".acc-total-comments");
        const elViews = card.querySelector(".acc-total-views");

        if (elPosts) elPosts.textContent = posts.length.toLocaleString();
        if (elReach) elReach.textContent = accReach.toLocaleString();
        if (elLikes) elLikes.textContent = accLikes.toLocaleString();
        if (elComments) elComments.textContent = accComments.toLocaleString();
        if (elViews) elViews.textContent = accViews.toLocaleString();
    });

    setTotalText("totalAccounts", accounts.length);
    setTotalText("totalPosts", totalPosts);
    setTotalText("totalReachValue", totalReach);
    setTotalText("totalLikes", totalLikes);
    setTotalText("totalFriends", totalFriends);
    setTotalText("totalComments", totalComments);
    setTotalText("totalVideoViews", totalVideoViews);
    setTotalText("totalGroups", totalGroups);
    setTotalText("totalInitialFollowers", totalInitialFollowers);
    setTotalText("totalCurrentFollowers", totalCurrentFollowers);
}

function getNumber(container, selector) {
    const el = container.querySelector(selector);
    return el ? Number(el.value) || 0 : 0;
}

function setTotalText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value.toLocaleString();
}

function getVal(id) {
    return (document.getElementById(id)?.value || "").trim();
}

// ─────────────────────────────────────────────
//  SCREENSHOTS UPLOAD & CLIPBOARD PASTE
// ─────────────────────────────────────────────
function setupScreenshots() {
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("screenshotInput");
    const browseBtn = document.getElementById("browseScreenshotsBtn");

    browseBtn.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("click", (e) => {
        if (e.target !== browseBtn) fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
        handleFiles(e.target.files);
        fileInput.value = "";
    });

    // Drag and drop events
    ["dragenter", "dragover"].forEach(evt => {
        dropzone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add("dragover");
        });
    });

    ["dragleave", "drop"].forEach(evt => {
        dropzone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove("dragover");
        });
    });

    dropzone.addEventListener("drop", (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length) {
            handleFiles(dt.files);
        }
    });

    // Clipboard Paste support (Ctrl+V)
    window.addEventListener("paste", (e) => {
        if (!e.clipboardData || !e.clipboardData.items) return;
        const items = e.clipboardData.items;
        const imageFiles = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                if (blob) imageFiles.push(blob);
            }
        }
        if (imageFiles.length > 0) {
            handleFiles(imageFiles);
        }
    });
}

function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (!file.type.startsWith("image/")) return;

        const readerBuf = new FileReader();
        readerBuf.onload = function (e) {
            const arrayBuffer = e.target.result;

            const readerUrl = new FileReader();
            readerUrl.onload = function (e2) {
                const dataUrl = e2.target.result;
                const screenshotObj = {
                    id: Date.now() + "_" + Math.random().toString(36).substr(2, 6),
                    name: file.name || `screenshot_${uploadedScreenshots.length + 1}.png`,
                    type: file.type || "image/png",
                    buffer: new Uint8Array(arrayBuffer),
                    dataUrl: dataUrl
                };

                uploadedScreenshots.push(screenshotObj);
                renderScreenshotThumb(screenshotObj);
            };
            readerUrl.readAsDataURL(file);
        };
        readerBuf.readAsArrayBuffer(file);
    });
}

function renderScreenshotThumb(screenshotObj) {
    const grid = document.getElementById("screenshotsGrid");

    const thumb = document.createElement("div");
    thumb.className = "screenshot-thumb";
    thumb.dataset.id = screenshotObj.id;

    thumb.innerHTML = `
        <img src="${screenshotObj.dataUrl}" alt="${screenshotObj.name}">
        <div class="screenshot-info">
            <span title="${screenshotObj.name}">${screenshotObj.name}</span>
            <button type="button" class="btn-remove-thumb" title="Remove screenshot">✕</button>
        </div>
    `;

    thumb.querySelector(".btn-remove-thumb").addEventListener("click", () => {
        const idx = uploadedScreenshots.findIndex(s => s.id === screenshotObj.id);
        if (idx !== -1) uploadedScreenshots.splice(idx, 1);
        thumb.remove();
    });

    grid.appendChild(thumb);
}

// ─────────────────────────────────────────────
//  ACHIEVEMENT HIGHLIGHTS MANAGEMENT
// ─────────────────────────────────────────────
function addGenericHighlightRow(containerId, text = "", placeholder = "Enter description...") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const row = document.createElement("div");
    row.className = "highlight-row";

    row.innerHTML = `
        <textarea placeholder="${placeholder}">${text || ""}</textarea>
        <button type="button" class="btn-remove-row" title="Remove item">✕</button>
    `;

    row.querySelector(".btn-remove-row").addEventListener("click", () => {
        row.remove();
    });

    container.appendChild(row);
}

function addWeeklyAchievement(text = "") {
    addGenericHighlightRow(
        "weeklyHighlightsContainer",
        text,
        "e.g. This post is about the UEFA Champions League preview match. It received 352 views and 2 likes."
    );
}

function addMonthlyAchievement(text = "") {
    addGenericHighlightRow(
        "monthlyAchieveContainer",
        text,
        "e.g. ركّز هذا المنشور على منصة X على تعزيز العلاقات بين ماليزيا والهند..."
    );
}

function addMonthlyDevelopment(text = "") {
    addGenericHighlightRow(
        "monthlyDevContainer",
        text,
        "e.g. سلطت قمة قادة بريكس 2026 في الهند الضوء على المصالح الدبلوماسية..."
    );
}

function addMonthlyCoveredEvent(text = "") {
    addGenericHighlightRow(
        "monthlyEventsContainer",
        text,
        "e.g. احتفلت ماليزيا بـاليوم الوطني في 31 أغسطس بمشاركة أكثر من 100 ألف شخص..."
    );
}

function getHighlightTexts(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll("textarea"))
        .map(t => t.value.trim())
        .filter(t => t.length > 0);
}

// ─────────────────────────────────────────────
//  COLLECT ACCOUNT DATA FOR PPTX TABLES
// ─────────────────────────────────────────────
function collectAllAccountRows() {
    const cards = document.querySelectorAll("#accountsContainer .account-card");
    const rows = [];

    cards.forEach(card => {
        const url = (card.querySelector(".profile-url")?.value || "").trim();
        const init = getNumber(card, ".initial-followers");
        const curr = getNumber(card, ".current-followers");
        const friends = getNumber(card, ".account-friends");
        const groups = getNumber(card, ".account-groups");

        const posts = card.querySelectorAll(".post-entry");
        let totalReach = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalViews = 0;

        posts.forEach(p => {
            totalReach += getNumber(p, ".post-reach");
            totalLikes += getNumber(p, ".post-likes");
            totalComments += getNumber(p, ".post-comments");
            totalViews += getNumber(p, ".post-views");
        });

        rows.push({
            url: url || "—",
            initFollowers: init,
            currFollowers: curr,
            totalReach: totalReach,
            totalPosts: posts.length,
            totalLikes: totalLikes,
            totalComments: totalComments,
            totalViews: totalViews,
            friends: friends,
            groups: groups
        });
    });

    return rows;
}

// ─────────────────────────────────────────────
//  LOAD TEMPLATES WITH ZERO CORS ISSUES
// ─────────────────────────────────────────────
async function loadTemplateZip(type) {
    if (typeof JSZip === "undefined") {
        throw new Error("JSZip library is not loaded.");
    }

    let base64 = null;
    let fileName = "";

    if (type === "weekly") {
        base64 = window.WEEKLY_TEMPLATE_BASE64;
        fileName = "template.pptx";
    } else {
        base64 = window.MONTHLY_TEMPLATE_BASE64;
        fileName = "monthly_template.pptx";
    }

    if (base64) {
        return await JSZip.loadAsync(base64, { base64: true });
    }

    // Fallback: try fetch (if served via localhost or web server)
    try {
        const response = await fetch(fileName);
        const arrayBuf = await response.arrayBuffer();
        return await JSZip.loadAsync(arrayBuf);
    } catch (err) {
        throw new Error(`Unable to load ${fileName}. Make sure templates_data.js is present.`);
    }
}

// ─────────────────────────────────────────────
//  WEEKLY REPORT PPTX GENERATOR (EXACT COPY)
// ─────────────────────────────────────────────
async function downloadWeeklyReport() {
    const btn = document.getElementById("downloadWeeklyPptxBtn");
    const originalText = btn.innerHTML;
    btn.innerHTML = "<span>⏳ Generating Weekly PPTX...</span>";
    btn.disabled = true;

    try {
        const zip = await loadTemplateZip("weekly");

        const projectName = getVal("projectName") || "Europe";
        const projectLocation = getVal("projectLocation") || "Serbia";
        const reportDate = getVal("reportDate") || "Oct 13";

        const totals = {
            accounts: getRawTotal("totalAccounts"),
            reach: getRawTotal("totalReachValue"),
            likes: getRawTotal("totalLikes"),
            posts: getRawTotal("totalPosts"),
            videoViews: getRawTotal("totalVideoViews"),
            friends: getRawTotal("totalFriends"),
            comments: getRawTotal("totalComments"),
            groups: getRawTotal("totalGroups")
        };

        const accountRows = collectAllAccountRows();
        const weeklyHighlights = getHighlightTexts("weeklyHighlightsContainer");

        // ── 1. Update Slide 1 (Title, Project Name, Location) ──
        let s1 = await zip.file("ppt/slides/slide1.xml").async("string");
        // Replace project name and location in shape 162
        s1 = s1.replace(
            /(<a:t>PROJECT NAME:\s*<\/a:t>\s*<\/a:r>\s*<a:r[^>]*>\s*<a:rPr[^>]*\/>\s*<a:t>)[^<]*(<\/a:t>)/,
            `$1${escapeXml(projectName)}$2`
        );
        s1 = s1.replace(
            /(<a:t>PROJECT LOCATION:\s*<\/a:t>\s*<\/a:r>\s*<a:r[^>]*>\s*<a:rPr[^>]*\/>\s*<a:t>)[^<]*(<\/a:t>)/,
            `$1${escapeXml(projectLocation)}$2`
        );
        zip.file("ppt/slides/slide1.xml", s1);

        // ── 2. Update Slide 2 (8 Achievement Summary Boxes) ──
        let s2 = await zip.file("ppt/slides/slide2.xml").async("string");
        s2 = s2.replace(/<a:tbl>[\s\S]*?<\/a:tbl>/g, (tblXml) => {
            if (/Total no of\s*Accounts/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.accounts);
            if (/Reach/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.reach);
            if (/Likes/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.likes);
            if (/Posts/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.posts);
            if (/Video views/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.videoViews);
            if (/Friends/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.friends);
            if (/Comments/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.comments);
            if (/Groups Joined/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.groups);
            return tblXml;
        });
        zip.file("ppt/slides/slide2.xml", s2);

        // ── 3. Update Slide 3 & Slide 4 (Account Tables, 14 rows each) ──
        const s3File = zip.file("ppt/slides/slide3.xml");
        if (s3File) {
            let s3 = await s3File.async("string");
            const first14 = accountRows.slice(0, 14);
            s3 = updateWeeklyTableRows(s3, first14, reportDate);
            zip.file("ppt/slides/slide3.xml", s3);
        }

        const s4File = zip.file("ppt/slides/slide4.xml");
        if (s4File) {
            let s4 = await s4File.async("string");
            const next14 = accountRows.slice(14, 28);
            s4 = updateWeeklyTableRows(s4, next14, reportDate);
            zip.file("ppt/slides/slide4.xml", s4);
        }

        // ── 4. Update Slide 5 (Screenshots) ──
        // Only show screenshots uploaded by the user; remove all unused template screenshots
        const s5File = zip.file("ppt/slides/slide5.xml");
        if (s5File) {
            let s5 = await s5File.async("string");
            const numUploads = uploadedScreenshots.length;
            let picIndex = 0;

            s5 = s5.replace(/<p:pic>[\s\S]*?<\/p:pic>/g, (picXml) => {
                if (picIndex < numUploads && picIndex < 5) {
                    const imgPath = `ppt/media/image${picIndex + 1}.jpeg`;
                    zip.file(imgPath, uploadedScreenshots[picIndex].buffer);
                    picIndex++;
                    return picXml; // Keep this picture
                } else {
                    picIndex++;
                    return ""; // Remove unused template screenshot
                }
            });

            zip.file("ppt/slides/slide5.xml", s5);
        }

        // ── 5. Update Slide 6 (Achievements Text) ──
        const s6File = zip.file("ppt/slides/slide6.xml");
        if (s6File && weeklyHighlights.length > 0) {
            let s6 = await s6File.async("string");
            s6 = updateWeeklyAchievementsSlide(s6, weeklyHighlights);
            zip.file("ppt/slides/slide6.xml", s6);
        }

        // ── 6. Save & Download ──
        const blob = await zip.generateAsync({ type: "blob" });
        const safeDate = reportDate.replace(/[/\\:*?"<>|]/g, "-");
        triggerFileDownload(blob, `Weekly_Performance_Report_${safeDate}.pptx`);
    } catch (err) {
        console.error("Weekly report generation error:", err);
        alert("Error generating weekly report: " + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ─────────────────────────────────────────────
//  MONTHLY REPORT PPTX GENERATOR (EXACT COPY)
// ─────────────────────────────────────────────
async function downloadMonthlyReport() {
    const btn = document.getElementById("downloadMonthlyPptxBtn");
    const originalText = btn.innerHTML;
    btn.innerHTML = "<span>⏳ Generating Monthly PPTX...</span>";
    btn.disabled = true;

    try {
        const zip = await loadTemplateZip("monthly");

        const projectName = getVal("projectName") || "ماليزيا";
        const projectLocation = getVal("projectLocation") || "";
        const reportMonth = getVal("reportMonth") || "أكتوبر";
        const reportYear = getVal("reportYear") || "2026";
        const reportDate = getVal("reportDate") || "17.10.2026";

        const totals = {
            accounts: getRawTotal("totalAccounts"),
            reach: getRawTotal("totalReachValue"),
            likes: getRawTotal("totalLikes"),
            posts: getRawTotal("totalPosts"),
            videoViews: getRawTotal("totalVideoViews"),
            currFollowers: getRawTotal("totalCurrentFollowers"),
            comments: getRawTotal("totalComments")
        };

        const achieveItems = getHighlightTexts("monthlyAchieveContainer");
        const devItems = getHighlightTexts("monthlyDevContainer");
        const eventItems = getHighlightTexts("monthlyEventsContainer");

        // ── 1. Update Slide 1 (Title, Month, Year, Date) ──
        let s1 = await zip.file("ppt/slides/slide1.xml").async("string");
        // Title: أحدث تقرير شهري – مشروع ماليزيا
        s1 = s1.replace(
            /(<a:t>)(أحدث تقرير شهري – مشروع )[^<]*(<\/a:t>)/,
            `$1$2${escapeXml(projectName)}$3`
        );
        // Subtitle: 2026 - أكتوبر
        s1 = s1.replace(/(<a:t>)\d{4}\s*-\s*[^<]*(<\/a:t>)/, `$1${escapeXml(reportYear)} - ${escapeXml(reportMonth)}$2`);
        // Date
        s1 = s1.replace(/(<a:t>)\d{1,2}\.\d{1,2}\.?\d{0,4}(<\/a:t>)/, `$1${escapeXml(reportDate)}$2`);
        zip.file("ppt/slides/slide1.xml", s1);

        // ── 2. Update Slide 2 (7 Horizontal Metric Tables) ──
        let s2 = await zip.file("ppt/slides/slide2.xml").async("string");
        s2 = s2.replace(/<a:tbl>[\s\S]*?<\/a:tbl>/g, (tblXml) => {
            if (/إجمالي عدد الحسابات/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.accounts);
            if (/إجمالي المنشورات/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.posts);
            if (/إجمالي الوصول/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.reach);
            if (/الإعجابات/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.likes);
            if (/المتابعين/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.currFollowers);
            if (/التعليقات/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.comments);
            if (/المشاهدات/.test(tblXml)) return replaceSecondRowCell(tblXml, totals.videoViews);
            return tblXml;
        });
        zip.file("ppt/slides/slide2.xml", s2);

        // ── 3. Update Slide 3 (3 Achievement Text Categories) ──
        let s3 = await zip.file("ppt/slides/slide3.xml").async("string");

        // Shape 95: Achievements (الإنجازات)
        if (achieveItems.length > 0) {
            s3 = replaceShapeTextContent(s3, "Google Shape;95;p3", achieveItems, "ar-SA");
        }
        // Shape 97: Latest Developments (آخر التطورات)
        if (devItems.length > 0) {
            s3 = replaceShapeTextContent(s3, "Google Shape;97;p3", devItems, "ar-SA");
        }
        // Shape 94: Key Events Covered (أبرز الأحداث التي تم تغطيتها)
        if (eventItems.length > 0) {
            s3 = replaceShapeTextContent(s3, "Google Shape;94;p3", eventItems, "ar-SA");
        }
        zip.file("ppt/slides/slide3.xml", s3);

        // ── 4. Update Slides 4 & 5 (Screenshots) ──
        // Only show screenshots uploaded by the user; remove all unused template screenshots
        const numUploads = uploadedScreenshots.length;

        // Slide 4: Up to 11 images (image2.png through image12.png)
        const s4File = zip.file("ppt/slides/slide4.xml");
        if (s4File) {
            let s4 = await s4File.async("string");
            let picIdx4 = 0;
            s4 = s4.replace(/<p:pic>[\s\S]*?<\/p:pic>/g, (picXml) => {
                if (picIdx4 < numUploads && picIdx4 < 11) {
                    const imgPath = `ppt/media/image${picIdx4 + 2}.png`;
                    zip.file(imgPath, uploadedScreenshots[picIdx4].buffer);
                    picIdx4++;
                    return picXml; // Keep this picture
                } else {
                    picIdx4++;
                    return ""; // Remove unused template screenshot
                }
            });
            zip.file("ppt/slides/slide4.xml", s4);
        }

        // Slide 5: Up to 10 images (image13.png through image22.png)
        const s5File = zip.file("ppt/slides/slide5.xml");
        if (s5File) {
            let s5 = await s5File.async("string");
            let picIdx5 = 0;
            s5 = s5.replace(/<p:pic>[\s\S]*?<\/p:pic>/g, (picXml) => {
                const globalIdx = 11 + picIdx5;
                if (globalIdx < numUploads && picIdx5 < 10) {
                    const imgPath = `ppt/media/image${picIdx5 + 13}.png`;
                    zip.file(imgPath, uploadedScreenshots[globalIdx].buffer);
                    picIdx5++;
                    return picXml; // Keep this picture
                } else {
                    picIdx5++;
                    return ""; // Remove unused template screenshot
                }
            });
            zip.file("ppt/slides/slide5.xml", s5);
        }

        // ── 5. Update Slides 6 & 7 (Chart Titles) ──
        const s6File = zip.file("ppt/slides/slide6.xml");
        if (s6File) {
            let s6 = await s6File.async("string");
            s6 = s6.replace(
                /(<a:t>)[^<]*(– ملخص الأداء الشهري<\/a:t>)/,
                `$1${escapeXml(reportMonth)} ${escapeXml(reportYear)} $2`
            );
            zip.file("ppt/slides/slide6.xml", s6);
        }

        // ── 6. Save & Download ──
        const blob = await zip.generateAsync({ type: "blob" });
        const safeMonth = reportMonth.replace(/[/\\:*?"<>|]/g, "-");
        triggerFileDownload(blob, `Monthly_Performance_Report_${safeMonth}_${reportYear}.pptx`);
    } catch (err) {
        console.error("Monthly report generation error:", err);
        alert("Error generating monthly report: " + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ─────────────────────────────────────────────
//  XML HELPER FUNCTIONS
// ─────────────────────────────────────────────
function getRawTotal(id) {
    const el = document.getElementById(id);
    return el ? el.textContent.replace(/,/g, "") : "0";
}

function escapeXml(unsafe) {
    return String(unsafe || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function replaceSecondRowCell(tblXml, newVal) {
    const rows = tblXml.split(/<a:tr\b/);
    if (rows.length >= 3) {
        rows[2] = rows[2].replace(/(<a:t[^>]*>)[^<]*(<\/a:t>)/, `$1${escapeXml(String(newVal))}$2`);
        return rows.join("<a:tr");
    }
    return tblXml;
}

function updateWeeklyTableRows(xml, accounts, reportDate) {
    let updated = xml;

    // Update Month text on top right
    if (reportDate) {
        updated = updated.replace(
            /(name="Google Shape;505;p70"[\s\S]*?<p:txBody>[\s\S]*?<a:p>)[\s\S]*?(<\/a:p>)/,
            (match, prefix, suffix) => {
                const pContent = `
                    <a:pPr marL="12600" marR="0" lvl="0" indent="0" algn="l" rtl="0">
                        <a:lnSpc><a:spcPct val="120050"/></a:lnSpc>
                        <a:spcBef><a:spcPts val="0"/></a:spcBef>
                        <a:spcAft><a:spcPts val="0"/></a:spcAft>
                        <a:buClr><a:srgbClr val="FFFFFF"/></a:buClr>
                        <a:buSzPts val="2000"/>
                        <a:buFont typeface="Trebuchet MS"/>
                        <a:buNone/>
                    </a:pPr>
                    <a:r>
                        <a:rPr lang="en-US" sz="2000" b="1" i="0" u="none" strike="noStrike" cap="none" dirty="0">
                            <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
                            <a:latin typeface="Trebuchet MS"/>
                            <a:ea typeface="Trebuchet MS"/>
                            <a:cs typeface="Trebuchet MS"/>
                            <a:sym typeface="Trebuchet MS"/>
                        </a:rPr>
                        <a:t>MONTH: ${escapeXml(reportDate)}</a:t>
                    </a:r>
                    <a:endParaRPr sz="2000" b="0" i="0" u="none" strike="noStrike" cap="none" dirty="0">
                        <a:solidFill><a:srgbClr val="000000"/></a:solidFill>
                        <a:latin typeface="Arial"/>
                        <a:ea typeface="Arial"/>
                        <a:cs typeface="Arial"/>
                        <a:sym typeface="Arial"/>
                    </a:endParaRPr>
                `;
                return `${prefix}${pContent}${suffix}`;
            }
        );
    }

    // Replace table row contents
    updated = updated.replace(/<a:tbl>[\s\S]*?<\/a:tbl>/, (tblXml) => {
        const rows = tblXml.split("<a:tr ");
        // rows[0] is table header/definition
        // rows[1] is table column titles (PROFILE URL, Followers Initial...)
        // rows[2..15] are data rows
        for (let i = 2; i < rows.length; i++) {
            const accIdx = i - 2;
            const acc = accounts[accIdx];
            const prefix = "<a:tr ";
            let rowXml = prefix + rows[i];

            const cells = rowXml.split("<a:tc>");
            if (cells.length >= 6) {
                const url = acc ? acc.url : "";
                const init = acc ? String(acc.initFollowers) : "";
                const curr = acc ? String(acc.currFollowers) : "";
                const reach = acc ? String(acc.totalReach) : "";
                const posts = acc ? String(acc.totalPosts) : "";

                cells[1] = setCellText(cells[1], url);
                cells[2] = setCellText(cells[2], init);
                cells[3] = setCellText(cells[3], curr);
                cells[4] = setCellText(cells[4], reach);
                cells[5] = setCellText(cells[5], posts);
                rowXml = cells.join("<a:tc>");
            }
            rows[i] = rowXml.substring(prefix.length);
        }
        return rows.join("<a:tr ");
    });

    return updated;
}

function setCellText(cellXml, text) {
    if (/<a:t[^>]*>/.test(cellXml)) {
        return cellXml.replace(/(<a:t[^>]*>)[^<]*(<\/a:t>)/, `$1${escapeXml(text)}$2`);
    } else {
        return cellXml.replace(/<\/a:p>/, `<a:r><a:rPr lang="en-US"/><a:t>${escapeXml(text)}</a:t></a:r></a:p>`);
    }
}

function updateWeeklyAchievementsSlide(xml, paragraphs) {
    // Shape 124 contains the achievements text body
    return xml.replace(
        /(<p:sp>[\s\S]*?name="Google Shape;124;g3ee72b57672_0_0"[\s\S]*?<p:txBody>[\s\S]*?<a:lstStyle\/>)[\s\S]*?(<\/p:txBody>)/,
        (match, prefix, suffix) => {
            let parasXml = "";
            paragraphs.forEach(pText => {
                parasXml += `
                    <a:p>
                        <a:pPr lvl="0" marL="0">
                            <a:spcBef><a:spcPts val="1200"/></a:spcBef>
                            <a:buNone/>
                        </a:pPr>
                        <a:r>
                            <a:rPr lang="en-US" sz="1100" dirty="0">
                                <a:solidFill><a:schemeClr val="dk1"/></a:solidFill>
                                <a:latin typeface="Calibri"/>
                            </a:rPr>
                            <a:t>${escapeXml(pText)}</a:t>
                        </a:r>
                    </a:p>
                `;
            });
            return `${prefix}${parasXml}${suffix}`;
        }
    );
}

function replaceShapeTextContent(xml, shapeName, items, lang = "ar-SA") {
    const shapeRegex = new RegExp(
        `(<p:sp>([\\s\\S]*?)name="${shapeName}"([\\s\\S]*?)<p:txBody>([\\s\\S]*?)<a:lstStyle\\/>)[\\s\\S]*?(<\\/p:txBody>)`,
        "g"
    );

    return xml.replace(shapeRegex, (match, prefix, g1, g2, g3, suffix) => {
        let parasXml = "";
        items.forEach(text => {
            parasXml += `
                <a:p>
                    <a:pPr lvl="0" marL="0" rtl="1">
                        <a:spcBef><a:spcPts val="800"/></a:spcBef>
                        <a:buNone/>
                    </a:pPr>
                    <a:r>
                        <a:rPr lang="${lang}" sz="1200" dirty="0">
                            <a:solidFill><a:schemeClr val="dk1"/></a:solidFill>
                            <a:latin typeface="Calibri"/>
                        </a:rPr>
                        <a:t>${escapeXml(text)}</a:t>
                    </a:r>
                </a:p>
            `;
        });
        return `${prefix}${parasXml}${suffix}`;
    });
}

function triggerFileDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 2000);
}

// ─────────────────────────────────────────────
//  PRE-POPULATE DEFAULT DATA
// ─────────────────────────────────────────────
function populateDefaultData() {
    // Populate sample accounts from the user's weekly template
    const sampleAccounts = [
        { name: "Ivan Ristic", url: "https://x.com/ivanristic5b9q", initFollowers: 4, currFollowers: 8, friends: 65, groups: 0, posts: [{ reach: 2206, likes: 4, comments: 2, views: 0 }] },
        { name: "Tijana Lazic", url: "https://x.com/Tijanalazic09", initFollowers: 7, currFollowers: 9, friends: 0, groups: 0, posts: [{ reach: 443, likes: 3, comments: 1, views: 0 }] },
        { name: "Jovan Lukac", url: "https://x.com/JovanLukacf", initFollowers: 3, currFollowers: 3, friends: 0, groups: 0, posts: [{ reach: 396, likes: 2, comments: 0, views: 0 }] },
        { name: "Milena Vukovic", url: "https://x.com/MilenaVukovic09", initFollowers: 0, currFollowers: 0, friends: 0, groups: 0, posts: [{ reach: 105, likes: 1, comments: 0, views: 0 }] },
        { name: "Bojana Babic", url: "https://x.com/BojanaBabic78", initFollowers: 1, currFollowers: 2, friends: 0, groups: 0, posts: [{ reach: 88, likes: 2, comments: 0, views: 0 }] },
        { name: "Kristijan Jvnrq", url: "https://x.com/KristijanJvnrq", initFollowers: 0, currFollowers: 1, friends: 0, groups: 0, posts: [{ reach: 84, likes: 1, comments: 0, views: 0 }] },
        { name: "Filip Ilic", url: "https://x.com/filip52o4", initFollowers: 1, currFollowers: 2, friends: 0, groups: 0, posts: [{ reach: 298, likes: 0, comments: 0, views: 0 }] },
        { name: "Mila Antic", url: "https://x.com/milaantic7p", initFollowers: 3, currFollowers: 6, friends: 0, groups: 0, posts: [{ reach: 309, likes: 3, comments: 0, views: 0 }] },
        { name: "Dusan Simic", url: "https://x.com/dusansimic90", initFollowers: 2, currFollowers: 3, friends: 0, groups: 0, posts: [{ reach: 47, likes: 1, comments: 0, views: 0 }] },
        { name: "Stefan Kos", url: "https://x.com/stefankos88", initFollowers: 2, currFollowers: 2, friends: 0, groups: 0, posts: [{ reach: 110, likes: 2, comments: 1, views: 0 }] }
    ];

    sampleAccounts.forEach(acc => addAccount(acc));

    // Populate Weekly Achievements from template
    const weeklyDefaults = [
        "This post is about the UEFA Champions League / European football preview post regarding the historic European campaign match between Hajduk Split and Ajax Amsterdam. It received 352 views and 2 likes.",
        "This post is a political-historical quote post leveraging Donald Trump's statement on Nikola Tesla to boost national pride and engagement around Serbia's legacy. It received 1529 views and 4 likes.",
        "This post is an opposition-driven attack post targeting Aleksandar Vučić over claims of corruption, callousness, and lack of empathy toward a grieving parent. It received 202 views and 1 likes.",
        "This post is a campaign reassurance and voter mobilization post aimed at reassuring citizens about economic stability and urging them to vote on October 26th. It received 237 views and 3 likes.",
        "This post is a breaking news security report covering a false bomb threat by a named Serbian militia demanding Kosovo's recognition and the ongoing anti-terrorism investigation (238 views)."
    ];
    weeklyDefaults.forEach(t => addWeeklyAchievement(t));

    // Populate Monthly Achievements from template
    const monthlyAchieveDefaults = [
        "ركّز هذا المنشور على منصة X (تويتر سابقًا) على تعزيز العلاقات بين ماليزيا والهند من خلال الدبلوماسية والتعاون الاقتصادي وضمن مجموعة بريكس. وحقق 5,200 مشاهدة و12 إعجابًا.",
        "ركّز هذا المنشور على تيك توك على التطورات السياسية في ماليزيا والتصريحات العامة مع تسليط الضوء على القضايا الراهنة. وحقق 82 ألف مشاهدة و1,739 إعجابًا.",
        "ركّز المحتوى المنشور على فيسبوك على الشأن السياسي الماليزي ورسالة سياسية موجهة للجمهور. وحقق 36 ألف مشاهدة و541 إعجابًا."
    ];
    monthlyAchieveDefaults.forEach(t => addMonthlyAchievement(t));

    // Populate Monthly Developments from template
    const monthlyDevDefaults = [
        "سلطت قمة قادة بريكس 2026 في الهند الضوء على المصالح الدبلوماسية والاقتصادية لماليزيا، حيث مثّل رئيس الوزراء بلاده وأجرى مباحثات لتعميق التعاون التجاري.",
        "أصبحت قضية العفو عن رئيس الوزراء الماليزي الأسبق من أبرز التطورات السياسية والقانونية خلال الشهر."
    ];
    monthlyDevDefaults.forEach(t => addMonthlyDevelopment(t));

    // Populate Monthly Covered Events from template
    const monthlyEventDefaults = [
        "احتفلت ماليزيا بـاليوم الوطني في 31 أغسطس بمشاركة أكثر من 100 ألف شخص في احتفالات بوتراجايا.",
        "أدى تحطم مروحية تابعة لخدمة الطبيب الطائر في ساراواك إلى تعليق الخدمة مؤقتًا وإجراء مراجعة لترتيبات السلامة."
    ];
    monthlyEventDefaults.forEach(t => addMonthlyCoveredEvent(t));
}

// ─────────────────────────────────────────────
//  TWITTER / X AUTOMATED FETCHER
// ─────────────────────────────────────────────
const API_BASE = window.location.origin.startsWith("http") ? "" : "http://localhost:3000";

async function checkServerStatus() {
    const badge = document.getElementById("serverStatusBadge");
    const alertBox = document.getElementById("serverAlert");
    if (!badge) return false;

    const savedAuth = localStorage.getItem("twitter_auth_token") || "";
    const savedCt0 = localStorage.getItem("twitter_ct0") || "";
    const hasLocalAuth = !!(savedAuth && savedCt0);

    try {
        const res = await fetch(`${API_BASE}/api/status?hasClientCookies=${hasLocalAuth ? '1' : '0'}`, {
            method: "GET",
            cache: "no-store",
            headers: { "x-has-cookies": hasLocalAuth ? "1" : "0" }
        });
        if (res.ok) {
            const data = await res.json();
            badge.className = "status-badge status-online";
            if (data.isLoggedIn || hasLocalAuth) {
                badge.textContent = "● Server Connected (Session Active)";
                badge.title = "Authenticated with Twitter session. Posts and metrics will be fetched.";
            } else {
                badge.textContent = "● Server Connected (Guest Mode)";
                badge.title = "Guest mode: Profile metrics will be fetched. Set cookies in Session Settings to fetch posts & views.";
            }
            if (alertBox) alertBox.style.display = "none";
            return true;
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (e) {
        badge.className = "status-badge status-offline";
        badge.textContent = "● Server Offline";
        if (alertBox) alertBox.style.display = "block";
        return false;
    }
}

function setupSettingsModal() {
    const modal = document.getElementById("settingsModal");
    const openBtn = document.getElementById("openSettingsBtn");
    const closeBtn = document.getElementById("closeSettingsBtn");
    const cancelBtn = document.getElementById("cancelSettingsBtn");
    const saveBtn = document.getElementById("saveSettingsBtn");
    const authInput = document.getElementById("settingAuthToken");
    const ct0Input = document.getElementById("settingCt0");
    const statusDiv = document.getElementById("settingsSaveStatus");

    if (!modal) return;

    // Load saved cookies into inputs if available
    const initialAuth = localStorage.getItem("twitter_auth_token") || "";
    const initialCt0 = localStorage.getItem("twitter_ct0") || "";
    if (authInput && initialAuth) authInput.value = initialAuth;
    if (ct0Input && initialCt0) ct0Input.value = initialCt0;

    function openModal() {
        modal.style.display = "flex";
        const curAuth = localStorage.getItem("twitter_auth_token") || "";
        const curCt0 = localStorage.getItem("twitter_ct0") || "";
        if (authInput && !authInput.value && curAuth) authInput.value = curAuth;
        if (ct0Input && !ct0Input.value && curCt0) ct0Input.value = curCt0;

        if (statusDiv) {
            statusDiv.textContent = "";
            statusDiv.className = "save-status";
        }
    }

    function closeModal() {
        modal.style.display = "none";
    }

    if (openBtn) openBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    // Close when clicking modal backdrop
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            const authToken = authInput ? authInput.value.trim() : "";
            const ct0 = ct0Input ? ct0Input.value.trim() : "";

            if (!authToken || !ct0) {
                if (statusDiv) {
                    statusDiv.className = "save-status text-danger";
                    statusDiv.textContent = "⚠️ Please enter both auth_token and ct0.";
                }
                return;
            }

            // Save to localStorage immediately so it works seamlessly on Vercel
            localStorage.setItem("twitter_auth_token", authToken);
            localStorage.setItem("twitter_ct0", ct0);

            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";

            try {
                const res = await fetch(`${API_BASE}/api/settings`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ authToken, ct0 })
                });
                const result = await res.json();
                if (result.success) {
                    if (statusDiv) {
                        statusDiv.className = "save-status text-success";
                        statusDiv.textContent = "✓ Session cookies saved successfully!";
                    }
                    setTimeout(() => {
                        closeModal();
                        checkServerStatus();
                    }, 1200);
                } else {
                    if (statusDiv) {
                        statusDiv.className = "save-status text-danger";
                        statusDiv.textContent = `❌ ${result.error || "Failed to save"}`;
                    }
                }
            } catch (err) {
                // If API is unreachable or static-only, still confirm saved in localStorage
                if (statusDiv) {
                    statusDiv.className = "save-status text-success";
                    statusDiv.textContent = "✓ Cookies saved locally in browser!";
                }
                setTimeout(() => {
                    closeModal();
                    checkServerStatus();
                }, 1200);
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = "Save Session Cookies";
            }
        });
    }
}

function setupTwitterFetcher() {
    let activePeriod = "weekly";

    const weeklyBtn = document.getElementById("toggleWeeklyBtn");
    const monthlyBtn = document.getElementById("toggleMonthlyBtn");
    const clearBtn = document.getElementById("clearUrlsBtn");
    const fetchBtn = document.getElementById("startFetchBtn");
    const urlsInput = document.getElementById("twitterUrlsInput");
    const fetchPostsCb = document.getElementById("fetchPostsCheckbox");
    const progressText = document.getElementById("fetchProgressText");

    if (weeklyBtn && monthlyBtn) {
        weeklyBtn.addEventListener("click", () => {
            activePeriod = "weekly";
            weeklyBtn.classList.add("active");
            monthlyBtn.classList.remove("active");
        });

        monthlyBtn.addEventListener("click", () => {
            activePeriod = "monthly";
            monthlyBtn.classList.add("active");
            weeklyBtn.classList.remove("active");
        });
    }

    if (clearBtn && urlsInput) {
        clearBtn.addEventListener("click", () => {
            urlsInput.value = "";
            if (progressText) progressText.textContent = "";
        });
    }

    if (fetchBtn) {
        fetchBtn.addEventListener("click", async () => {
            const rawText = (urlsInput?.value || "").trim();
            if (!rawText) {
                alert("Please enter at least one Twitter / X profile link or username.");
                return;
            }

            const urls = rawText
                .split("\n")
                .map(u => u.trim())
                .filter(u => u.length > 0);

            if (urls.length === 0) {
                alert("Please enter valid profile links.");
                return;
            }

            // Check if server is running first
            const isServerUp = await checkServerStatus();
            if (!isServerUp) {
                alert("Backend server is not running!\nPlease run 'npm start' in the project directory, then try again.");
                return;
            }

            const existingAccounts = document.querySelectorAll("#accountsContainer .account-card");
            if (existingAccounts.length > 0) {
                const replace = confirm(
                    `You currently have ${existingAccounts.length} account(s) loaded.\n\nClick 'OK' to REPLACE them with fetched accounts.\nClick 'Cancel' to APPEND to existing accounts.`
                );
                if (replace) {
                    document.getElementById("accountsContainer").innerHTML = "";
                    accountCounter = 0;
                }
            }

            fetchBtn.disabled = true;
            const originalBtnText = fetchBtn.innerHTML;
            const fetchPosts = fetchPostsCb ? fetchPostsCb.checked : true;

            let successCount = 0;
            let errorCount = 0;
            let serverWarning = null;

            for (let i = 0; i < urls.length; i++) {
                const currentUrl = urls[i];
                if (progressText) {
                    progressText.textContent = `⏳ Fetching ${i + 1}/${urls.length}: ${currentUrl}...`;
                }
                fetchBtn.innerHTML = `⏳ Fetching (${i + 1}/${urls.length})...`;

                try {
                    const savedAuth = localStorage.getItem("twitter_auth_token") || "";
                    const savedCt0 = localStorage.getItem("twitter_ct0") || "";

                    const res = await fetch(`${API_BASE}/api/fetch-account`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            url: currentUrl,
                            period: activePeriod,
                            fetchPosts: fetchPosts,
                            authToken: savedAuth,
                            ct0: savedCt0
                        })
                    });

                    const json = await res.json();
                    if (json.success && json.data) {
                        addAccount(json.data);
                        successCount++;
                        if (json.warning) {
                            serverWarning = json.warning;
                        }
                    } else {
                        console.warn(`Failed to fetch ${currentUrl}:`, json.error);
                        errorCount++;
                    }
                } catch (err) {
                    console.error(`Error fetching ${currentUrl}:`, err);
                    errorCount++;
                }
            }

            fetchBtn.disabled = false;
            fetchBtn.innerHTML = originalBtnText;

            if (progressText) {
                if (serverWarning) {
                    progressText.innerHTML = `✅ Complete! ${successCount} account(s) loaded.<br><span style="color: #ffb74d; font-size: 0.9em; display: inline-block; margin-top: 4px;">⚠️ <strong>Notice:</strong> ${serverWarning}</span>`;
                } else {
                    progressText.textContent = `✅ Complete! ${successCount} account(s) fetched successfully.${errorCount > 0 ? ` (${errorCount} failed)` : ""}`;
                }
            }

            updateSummary();
        });
    }

    setupSettingsModal();
    checkServerStatus();
    setInterval(checkServerStatus, 15000);
}

