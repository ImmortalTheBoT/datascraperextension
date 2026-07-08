// --- CONFIGURATION ---
const EXTPAY_ID = 'data-scraper-immortal'; // Your Real ID
const extpay = ExtPay(EXTPAY_ID);

let userIsPaid = false;

// Check payment status
extpay.getUser().then(user => {
    console.log("✅ User Paid:", user.paid);
    userIsPaid = user.paid;
    // We cannot update UI here immediately because UI might not be open yet
}).catch(err => console.error("ExtPay Error:", err));

// --- STATE MANAGEMENT ---
const STATE_KEY = 'scraper_state'; 
const PRESETS_KEY = 'scraper_presets';
const DATA_KEY = 'scraper_data';
const BATCH_KEY = 'scraper_batch_job'; 

// --- GLOBAL VARS ---
let config = {
    clickSelector: null,
    dataFields: [],
    autoScroll: false,
    scrollDuration: 2000,
    delayMin: 3000,
    delayMax: 6000,
    maxEmptyRuns: 3
};

// Expose for background script
window.scrapperOpenGui = openGui; 

// --- INITIALIZATION ---
window.addEventListener('load', () => {
    // Resume Batch Job if running
    const batchJob = JSON.parse(localStorage.getItem(BATCH_KEY));
    if (batchJob && (batchJob.status === 'running' || batchJob.status === 'paused')) {
        openGui(); 
        if(batchJob.status === 'running') runBatchStep(batchJob);
    }
});

// --- AUDIO ALERT ---
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch(e) {}
}

// --- BATCH LOGIC ---
async function runBatchStep(job) {
    if (job.status !== 'running') return;

    // Use a small delay to ensure UI is ready before trying to update it
    setTimeout(() => {
        updateProgressUI(job.currentIndex, job.urls.length);
        updateBatchButtons('running');
    }, 500);
    
    // 1. Wait
    const delay = Math.floor(Math.random() * (config.delayMax - config.delayMin + 1)) + config.delayMin;
    updateStatusText(`Waiting ${Math.round(delay/1000)}s...`);
    await new Promise(r => setTimeout(r, delay));

    // Re-check status
    job = JSON.parse(localStorage.getItem(BATCH_KEY)); 
    if (!job || job.status !== 'running') return;

    // 2. Scrape
    updateStatusText("Scraping...");
    const result = await extractData();

    // 3. Save
    if (result) {
        let stored = JSON.parse(localStorage.getItem(DATA_KEY) || '[]');
        stored.push(result);
        localStorage.setItem(DATA_KEY, JSON.stringify(stored));
        updateStatusText("Data Saved!");
        job.emptyRuns = 0; 
    } else {
        updateStatusText("No Data Found");
        job.emptyRuns = (job.emptyRuns || 0) + 1;
    }

    // 4. Check Empty Runs
    if (job.emptyRuns >= config.maxEmptyRuns) {
        job.status = 'paused';
        localStorage.setItem(BATCH_KEY, JSON.stringify(job));
        updateStatusText(`Paused: ${job.emptyRuns} empty pages.`);
        updateBatchButtons('paused');
        playNotificationSound();
        alert(`⚠️ Batch Paused: No data found for ${job.emptyRuns} consecutive pages.`);
        return; 
    }

    // 5. Navigate Next
    const nextIndex = job.currentIndex + 1;
    if (nextIndex < job.urls.length) {
        job.currentIndex = nextIndex;
        localStorage.setItem(BATCH_KEY, JSON.stringify(job)); 
        updateStatusText(`Navigating to ${nextIndex + 1}/${job.urls.length}...`);
        await new Promise(r => setTimeout(r, 1000));
        window.location.href = job.urls[nextIndex]; 
    } else {
        job.status = 'complete';
        localStorage.setItem(BATCH_KEY, JSON.stringify(job));
        updateStatusText("Job Complete!");
        updateProgressUI(job.urls.length, job.urls.length);
        updateBatchButtons('idle');
        playNotificationSound();
        alert("Batch Job Complete!");
    }
}

// --- EXTRACTION ENGINE ---
async function extractData() {
    if (config.autoScroll) await performAutoScroll(config.scrollDuration || 2000);
    if (config.clickSelector) {
        const el = document.querySelector(config.clickSelector);
        if (el) { el.click(); await new Promise(r => setTimeout(r, 2000)); }
    }
    let row = [window.location.href];
    let allEmpty = true;
    config.dataFields.forEach(field => {
        const el = document.querySelector(field.selector);
        let text = el ? (el.innerText || el.textContent || '').trim() : '';
        if (text) allEmpty = false;
        row.push(text);
    });
    return allEmpty ? null : row;
}

async function performAutoScroll(duration) {
    return new Promise(resolve => {
        window.scrollTo({ left: 0, top: document.body.scrollHeight, behavior: "smooth" });
        setTimeout(() => { window.scrollBy(0, -100); setTimeout(resolve, 500); }, duration);
    });
}

// --- SHADOW DOM GUI ---
let shadowRoot = null; // Store reference

function openGui() {
    // Prevent duplicates
    if (document.getElementById('triple-scraper-host')) return;

    // Load Config
    const savedConfig = localStorage.getItem(STATE_KEY);
    if (savedConfig) config = { ...config, ...JSON.parse(savedConfig) };
    
    // Create Host
    const host = document.createElement('div');
    host.id = 'triple-scraper-host';
    host.style.position = 'fixed';
    host.style.zIndex = '2147483647';
    host.style.top = '0';
    host.style.left = '0';
    document.body.appendChild(host);

    // Attach Shadow
    shadowRoot = host.attachShadow({mode: 'open'});

    // HTML Structure
    const html = `
    <div id="scraper-panel">
        <div id="scraper-header">
            <div class="header-left">
                <div class="header-icon">🚀</div>
                <div class="header-text">
                    <span class="title">Triple Scraper <span class="version">Ultimate</span></span>
                    <span id="scraper-status-badge" class="badge-loading">Auth...</span>
                </div>
            </div>
            <button id="scraper-close">✕</button>
        </div>

        <div id="scraper-tabs">
            <button class="tab-btn active" id="btn-tab-manual">Manual Mode</button>
            <button class="tab-btn" id="btn-tab-batch">Batch / Auto</button>
        </div>

        <div id="scraper-content">
            <button id="scraper-login-btn" class="btn-pay" style="display:none;">🔒 Login / Subscribe</button>

            <div class="card">
                <div class="card-header">
                    <span>Config & Presets</span>
                    <div class="actions">
                        <select id="scraper-presets-dropdown"><option value="">Load...</option></select>
                        <button id="scraper-save-preset" class="icon-btn">💾</button>
                        <button id="scraper-delete-preset" class="icon-btn danger">🗑️</button>
                    </div>
                </div>
                <div class="grid-2">
                    <button id="scraper-set-click" class="btn-outline">👆 Set Click</button>
                    <button id="scraper-add-field" class="btn-outline">+ Add Field</button>
                </div>
                <div id="scraper-fields-list"></div>
                
                <div class="setting-row">
                    <label><input type="checkbox" id="scraper-autoscroll-check"> Auto-Scroll</label>
                    <input type="number" id="scraper-scroll-wait" class="input-sm"> <span>ms</span>
                </div>
            </div>

            <div id="tab-manual" class="tab-pane active">
                 <button id="scraper-run-active" class="btn-primary big">Scrape This Page</button>
            </div>

            <div id="tab-batch" class="tab-pane">
                <div class="card">
                    <label>URLs (One per line)</label>
                    <textarea id="scraper-urls" rows="3" placeholder="https://..."></textarea>
                    
                    <div class="setting-row mt-10">
                        <label>Delay (s):</label>
                        <input type="number" id="delay-min" class="input-sm"> - <input type="number" id="delay-max" class="input-sm">
                    </div>
                    <div class="setting-row mt-5">
                         <label>Pause after</label>
                         <input type="number" id="max-empty" class="input-sm"> empty runs
                    </div>
                </div>

                <div class="progress-section">
                    <div class="progress-info">
                        <span id="batch-counter">0 / 0</span>
                        <span id="batch-status">Idle</span>
                    </div>
                    <div class="progress-track"><div id="scraper-progress-bar" class="progress-fill"></div></div>
                </div>

                <div class="action-bar">
                    <button id="scraper-batch-start" class="btn-primary flex-grow">Start Batch</button>
                    <button id="scraper-batch-pause" class="btn-warning hidden">Pause</button>
                    <button id="scraper-batch-stop" class="btn-danger">Stop</button>
                </div>
            </div>
        </div>

        <div id="scraper-footer">
            <button id="scraper-download" class="btn-success">📥 Download Excel <span id="data-count-badge" class="count-badge">0</span></button>
        </div>
    </div>
    <style>
        /* CSS RESET FOR SHADOW DOM */
        :host { all: initial; }
        * { box-sizing: border-box; }
        
        :root { --bg: #1e293b; --primary: #3b82f6; --success: #10b981; --danger: #ef4444; --warning: #f59e0b; }
        
        #scraper-panel { 
            position: fixed; top: 20px; right: 20px; width: 340px; 
            background: white; border-radius: 8px; 
            box-shadow: 0 10px 40px rgba(0,0,0,0.3); 
            font-family: sans-serif; font-size: 13px; 
            display: flex; flex-direction: column; 
            border: 1px solid #94a3b8; color: #333;
            pointer-events: auto !important; /* FORCE CLICKS */
        }
        
        #scraper-header { background: #1e293b; color: white; padding: 12px; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none; }
        .header-left { display: flex; gap: 8px; align-items: center; }
        .title { font-weight: 700; font-size: 14px; } 
        #scraper-close { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; }
        #scraper-close:hover { color: white; }
        
        #scraper-tabs { display: flex; background: #e2e8f0; padding: 4px; gap: 4px; }
        .tab-btn { flex: 1; border: none; background: transparent; padding: 8px; cursor: pointer; font-weight: 600; color: #64748b; border-radius: 4px; }
        .tab-btn.active { background: white; color: #3b82f6; }
        
        #scraper-content { padding: 16px; display: flex; flex-direction: column; gap: 12px; max-height: 60vh; overflow-y: auto; }
        .tab-pane { display: none; flex-direction: column; gap: 12px; }
        .tab-pane.active { display: flex; }
        
        .card { background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; }
        .card-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 600; color: #64748b; }
        
        button { cursor: pointer; transition: opacity 0.2s; }
        button:hover { opacity: 0.9; }
        .btn-primary { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-weight: 600; }
        .btn-success { background: #10b981; color: white; border: none; padding: 8px; border-radius: 4px; font-weight: 600; width: 100%; }
        .btn-warning { background: #f59e0b; color: white; border: none; padding: 8px; border-radius: 4px; font-weight: 600; }
        .btn-danger { background: #ef4444; color: white; border: none; padding: 8px; border-radius: 4px; font-weight: 600; }
        .btn-pay { background: #f59e0b; width: 100%; padding: 10px; border: none; color: white; font-weight: bold; border-radius: 4px; }
        .btn-outline { background: white; border: 1px solid #cbd5e1; padding: 6px; border-radius: 4px; }
        
        .input-sm { width: 50px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center; }
        textarea { width: 100%; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px; font-family: monospace; resize: vertical; }
        
        .progress-section { background: #f1f5f9; padding: 10px; border-radius: 4px; }
        .progress-info { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px; font-weight: 600; }
        .progress-track { background: #cbd5e1; height: 6px; border-radius: 3px; overflow: hidden; }
        .progress-fill { background: #10b981; height: 100%; width: 0%; transition: width 0.3s ease; }
        
        .action-bar { display: flex; gap: 8px; }
        .flex-grow { flex: 1; }
        .hidden { display: none !important; }
        .mt-10 { margin-top: 10px; } .mt-5 { margin-top: 5px; } .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        
        #scraper-footer { padding: 12px; background: #f8fafc; border-top: 1px solid #cbd5e1; }
        .count-badge { background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 10px; font-size: 11px; font-weight: bold; margin-left: 5px;}
        
        .badge-pro { background: #10b981; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; }
        .badge-free { background: #94a3b8; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; }
        
        .field-item { display: flex; justify-content: space-between; background: #f1f5f9; padding: 5px; margin-top: 4px; border-radius: 4px; }
        .remove-btn { color: red; cursor: pointer; font-weight: bold; }
    </style>
    `;
    
    shadowRoot.innerHTML = html;

    // --- APPLY VALUES ---
    const q = (sel) => shadowRoot.querySelector(sel); // Helper
    
    q('#scraper-autoscroll-check').checked = config.autoScroll;
    q('#scraper-scroll-wait').value = config.scrollDuration;
    q('#delay-min').value = config.delayMin / 1000;
    q('#delay-max').value = config.delayMax / 1000;
    q('#max-empty').value = config.maxEmptyRuns;

    // --- BIND EVENTS (Use q() to select inside shadow) ---
    
    q('#scraper-close').addEventListener('click', (e) => { e.stopPropagation(); host.remove(); });
    
    // Draggable
    const panel = q('#scraper-panel');
    const header = q('#scraper-header');
    let isDragging = false, startX, startY, initialLeft, initialTop;
    
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = panel.offsetLeft;
        initialTop = panel.offsetTop;
        e.preventDefault(); // Prevent text selection
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        panel.style.left = `${initialLeft + dx}px`;
        panel.style.top = `${initialTop + dy}px`;
    });
    
    window.addEventListener('mouseup', () => { isDragging = false; });

    // Tabs
    q('#btn-tab-manual').addEventListener('click', (e) => { e.stopPropagation(); switchTab('tab-manual'); });
    q('#btn-tab-batch').addEventListener('click', (e) => { e.stopPropagation(); switchTab('tab-batch'); });

    function switchTab(id) {
        shadowRoot.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
        shadowRoot.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        q(`#${id}`).classList.add('active');
        q(`#btn-${id}`).classList.add('active');
    }

    // Buttons (with Stop Propagation to prevent page interference)
    const bind = (id, fn) => {
        const el = q(id);
        if(el) el.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            e.preventDefault(); 
            fn(e); 
        });
    };

    bind('#scraper-set-click', startConfigClick);
    bind('#scraper-add-field', startConfigData);
    bind('#scraper-save-preset', savePreset);
    bind('#scraper-load-preset', loadPreset);
    bind('#scraper-delete-preset', deletePreset);
    
    bind('#scraper-run-active', () => {
        if(!userIsPaid) { extpay.openPaymentPage(); return; }
        scrapeCurrentPage();
    });
    
    bind('#scraper-download', () => {
        if(!userIsPaid) { extpay.openPaymentPage(); return; }
        downloadExcel();
    });

    bind('#scraper-login-btn', () => extpay.openPaymentPage());

    // Batch Buttons
    bind('#scraper-batch-start', startOrResumeBatch);
    bind('#scraper-batch-pause', pauseBatch);
    bind('#scraper-batch-stop', stopBatch);

    // Inputs (Save on change)
    const saveInputs = () => {
        config.autoScroll = q('#scraper-autoscroll-check').checked;
        config.scrollDuration = parseInt(q('#scraper-scroll-wait').value) || 2000;
        config.delayMin = (parseInt(q('#delay-min').value) || 3) * 1000;
        config.delayMax = (parseInt(q('#delay-max').value) || 6) * 1000;
        config.maxEmptyRuns = parseInt(q('#max-empty').value) || 3;
        saveConfig();
    };
    
    ['#scraper-autoscroll-check', '#scraper-scroll-wait', '#delay-min', '#delay-max', '#max-empty'].forEach(sel => {
        q(sel).addEventListener('change', saveInputs);
    });

    // Initialize UI State
    refreshUI();
}

// --- UI HELPERS (Shadow DOM aware) ---
function refreshUI() {
    if(!shadowRoot) return;
    updateFieldsList();
    loadPresetsDropdown();
    updatePaymentUI();
    updateDataCountBadge();
    
    // Check Batch Status
    const batchJob = JSON.parse(localStorage.getItem(BATCH_KEY));
    if(batchJob && (batchJob.status === 'running' || batchJob.status === 'paused')) {
        shadowRoot.getElementById('btn-tab-batch').click();
        updateProgressUI(batchJob.currentIndex, batchJob.urls.length);
        updateBatchButtons(batchJob.status);
    }
}

function updateFieldsList() {
    if(!shadowRoot) return;
    const list = shadowRoot.getElementById('scraper-fields-list');
    list.innerHTML = '';
    config.dataFields.forEach((f, i) => {
        const div = document.createElement('div');
        div.className = 'field-item';
        div.innerHTML = `<span>${f.name}</span> <span class="remove-btn">✕</span>`;
        div.querySelector('.remove-btn').onclick = (e) => {
            e.stopPropagation();
            config.dataFields.splice(i, 1);
            saveConfig();
            updateFieldsList();
        };
        list.appendChild(div);
    });
}

function updatePaymentUI() {
    if(!shadowRoot) return;
    const badge = shadowRoot.getElementById('scraper-status-badge');
    const lock = shadowRoot.getElementById('scraper-login-btn');
    if(userIsPaid) {
        badge.textContent = "PRO"; badge.className = "badge-pro";
        lock.style.display = 'none';
    } else {
        badge.textContent = "FREE"; badge.className = "badge-free";
        lock.style.display = 'block';
    }
}

function updateBatchButtons(state) {
    if(!shadowRoot) return;
    const start = shadowRoot.getElementById('scraper-batch-start');
    const pause = shadowRoot.getElementById('scraper-batch-pause');
    
    if(state === 'running') {
        start.classList.add('hidden');
        pause.classList.remove('hidden');
    } else if(state === 'paused') {
        start.classList.remove('hidden'); start.textContent = "Resume";
        pause.classList.add('hidden');
    } else {
        start.classList.remove('hidden'); start.textContent = "Start Batch";
        pause.classList.add('hidden');
    }
}

function updateProgressUI(current, total) {
    if(!shadowRoot) return;
    const bar = shadowRoot.getElementById('scraper-progress-bar');
    const txt = shadowRoot.getElementById('batch-counter');
    const pct = total === 0 ? 0 : (current/total)*100;
    bar.style.width = `${pct}%`;
    txt.textContent = `${current} / ${total}`;
}

function updateDataCountBadge() {
    if(!shadowRoot) return;
    const data = JSON.parse(localStorage.getItem(DATA_KEY) || '[]');
    shadowRoot.getElementById('data-count-badge').textContent = data.length;
}

function updateStatusText(msg) {
    if(!shadowRoot) return;
    shadowRoot.getElementById('batch-status').textContent = msg;
}

// --- LOGIC HELPERS ---
function saveConfig() { localStorage.setItem(STATE_KEY, JSON.stringify(config)); }

function startOrResumeBatch() {
    if (!userIsPaid) { extpay.openPaymentPage(); return; }
    
    let job = JSON.parse(localStorage.getItem(BATCH_KEY));
    if(job && job.status === 'paused') {
        job.status = 'running'; job.emptyRuns = 0;
        localStorage.setItem(BATCH_KEY, JSON.stringify(job));
        runBatchStep(job);
        return;
    }
    
    const text = shadowRoot.getElementById('scraper-urls').value;
    const urls = text.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    if(urls.length === 0) { alert("No URLs provided"); return; }
    if(config.dataFields.length === 0) { alert("No fields configured"); return; }
    
    job = { status: 'running', urls: urls, currentIndex: 0, emptyRuns: 0 };
    localStorage.setItem(BATCH_KEY, JSON.stringify(job));
    updateBatchButtons('running');
    window.location.href = urls[0];
}

function pauseBatch() {
    let job = JSON.parse(localStorage.getItem(BATCH_KEY));
    if(job) {
        job.status = 'paused';
        localStorage.setItem(BATCH_KEY, JSON.stringify(job));
        updateBatchButtons('paused');
        updateStatusText("Paused");
    }
}

function stopBatch() {
    localStorage.removeItem(BATCH_KEY);
    updateBatchButtons('idle');
    updateStatusText("Stopped");
    updateProgressUI(0,0);
}

function startConfigClick() { showSelectorOverlay('Click element to click', (s) => { config.clickSelector = s; saveConfig(); }); }
function startConfigData() { showSelectorOverlay('Click element to extract', (s) => { const n = prompt("Name:"); if(n){ config.dataFields.push({name:n, selector:s}); saveConfig(); updateFieldsList(); }}); }

function showSelectorOverlay(text, cb) {
    // We attach overlay to MAIN document, not shadow, to cover full page
    let ov = document.createElement('div');
    ov.style.position = 'fixed'; ov.style.top='0'; ov.style.left='0'; ov.style.width='100vw'; ov.style.height='100vh';
    ov.style.background='rgba(0,0,0,0.1)'; ov.style.zIndex='2147483646'; ov.style.cursor='crosshair';
    ov.innerHTML = `<div style="position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:10px;border-radius:20px;">${text} (ESC cancel)</div>`;
    document.body.appendChild(ov);
    
    let curr = null;
    const hover = (e) => {
        if(e.target === ov || e.target.closest('#triple-scraper-host')) return;
        if(curr) curr.style.outline = '';
        curr = e.target;
        curr.style.outline = '3px solid #10b981';
    };
    const click = (e) => {
        if(e.target === ov || e.target.closest('#triple-scraper-host')) return;
        e.preventDefault(); e.stopPropagation();
        cb(getSelector(curr));
        cleanup();
    };
    const key = (e) => { if(e.key === 'Escape') cleanup(); };
    const cleanup = () => {
        if(curr) curr.style.outline = '';
        ov.remove();
        document.removeEventListener('mouseover', hover, true);
        document.removeEventListener('click', click, true);
        document.removeEventListener('keydown', key, true);
    };
    document.addEventListener('mouseover', hover, true);
    document.addEventListener('click', click, true);
    document.addEventListener('keydown', key, true);
}

function getSelector(el) { if(el.id) return `#${CSS.escape(el.id)}`; let path=[], p=el; while(p.nodeType===1 && path.length<5){ let s=p.nodeName.toLowerCase(); if(p.id){ path.unshift(`#${CSS.escape(p.id)}`); break; } let i=1, sib=p; while(sib=sib.previousElementSibling){if(sib.nodeName.toLowerCase()==s)i++;} if(i>1)s+=`:nth-of-type(${i})`; path.unshift(s); p=p.parentNode; } return path.join(' > '); }

async function scrapeCurrentPage() {
    const d = await extractData();
    if(d) {
        let s = JSON.parse(localStorage.getItem(DATA_KEY) || '[]'); s.push(d); localStorage.setItem(DATA_KEY, JSON.stringify(s));
        updateDataCountBadge();
        const b = shadowRoot.getElementById('scraper-run-active');
        b.textContent = "✅ Saved!"; setTimeout(()=>b.textContent="Scrape This Page", 1500);
    } else alert("No data found");
}

function downloadExcel() {
    const d = JSON.parse(localStorage.getItem(DATA_KEY) || '[]');
    if(!d.length) return alert("No data");
    let c = "data:text/csv;charset=utf-8,";
    d.forEach(r => c += r.join(",") + "\r\n");
    const a = document.createElement("a"); a.href = encodeURI(c); a.download="data.csv"; document.body.appendChild(a); a.click(); a.remove();
}

function loadPresetsDropdown() {
    if(!shadowRoot) return;
    const p = JSON.parse(localStorage.getItem(PRESETS_KEY) || '{}');
    const d = shadowRoot.getElementById('scraper-presets-dropdown');
    d.innerHTML = '<option value="">Load...</option>';
    Object.keys(p).forEach(k => d.innerHTML += `<option value="${k}">${k}</option>`);
}

function savePreset() {
    const n = prompt("Name:"); if(!n) return;
    const p = JSON.parse(localStorage.getItem(PRESETS_KEY) || '{}');
    p[n] = config; localStorage.setItem(PRESETS_KEY, JSON.stringify(p));
    loadPresetsDropdown();
}

function loadPreset() {
    const n = shadowRoot.getElementById('scraper-presets-dropdown').value;
    if(!n) return;
    config = JSON.parse(localStorage.getItem(PRESETS_KEY))[n];
    saveConfig(); refreshUI();
}

function deletePreset() {
    const n = shadowRoot.getElementById('scraper-presets-dropdown').value;
    if(!n) return;
    const p = JSON.parse(localStorage.getItem(PRESETS_KEY) || '{}');
    delete p[n]; localStorage.setItem(PRESETS_KEY, JSON.stringify(p));
    loadPresetsDropdown();
}