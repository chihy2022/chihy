const CONFIG = {
    GGS_URL: "https://script.google.com/macros/s/AKfycbz36knkDmqMdVHCXoFhvQb4l6Ej2e9dsj0rLj7dD2km7XXshj2IaNy2o9-sCuHigvhN2w/exec",
    STORAGE_KEY: "Unime_UID",
    USER_DATA_KEY: "Unime_UserData",
    SIDEBAR_KEY: "sidebar-state"
};

document.addEventListener('DOMContentLoaded', () => {
    const app = new UnimeApp();
    app.init();
});

class UnimeApp {
    constructor() {
        this.contentArea = document.getElementById('content-area');
        this.actionSlot = document.getElementById('shot-actions-slot');
        this.headerTitle = document.getElementById('dynamic-header-title');
        this.sidebar = document.getElementById('sidebar');
        this.loginOverlay = document.getElementById('login-overlay');
        this.appContainer = document.querySelector('.app-container');
        this.sidebarOverlay = document.getElementById('sidebar-overlay');
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
        this.restoreSidebarState();
    }

    setupEventListeners() {
        // Desktop Events
        document.getElementById('toggleBtn').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('btnLogin').addEventListener('click', () => this.performLogin());
        document.getElementById('togglePassword').addEventListener('click', () => this.togglePassword());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('exportPdfBtn').addEventListener('click', (e) => handleExportPdf(e.currentTarget));

        // Mobile Events
        document.getElementById('mobileMenuBtn')?.addEventListener('click', () => this.toggleMobileSidebar(true));
        this.sidebarOverlay?.addEventListener('click', () => this.toggleMobileSidebar(false));

        // Menu & Sidebar
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => this.handleMenuClick(item));
        });

        document.querySelectorAll('.group-header').forEach(header => {
            header.addEventListener('click', () => header.parentElement.classList.toggle('active'));
        });

        document.addEventListener('click', (e) => this.handleGlobalClicks(e));
    }

    // --- TỐI ƯU LOGIN (CACHE-FIRST) ---
    checkAuth() {
        const uid = localStorage.getItem(CONFIG.STORAGE_KEY);
        const cachedUser = localStorage.getItem(CONFIG.USER_DATA_KEY);

        if (uid && cachedUser) {
            try {
                const user = JSON.parse(cachedUser);
                this.applyPermissions(user);
                this.loginOverlay.classList.add('hidden');
                this.appContainer.classList.remove('hidden');
                this.loadPage(localStorage.getItem('currentShot') || 'shot1');
                this.silentCheckAuth(uid);
            } catch (e) { this.performLogin(uid); }
        }
    }

    async silentCheckAuth(uid) {
        try {
            const res = await fetch(`${CONFIG.GGS_URL}?action=getRole&uid=${uid}`);
            const user = await res.json();
            if (user && user.rights) {
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(user));
                this.applyPermissions(user);
            } else { this.forceLogout(); }
        } catch(e) { console.warn("Background check offline."); }
    }

    async performLogin(forcedUid = null) {
        const uidInput = document.getElementById('login-uid');
        const btn = document.getElementById('btnLogin');
        const uid = forcedUid || uidInput.value.trim().toUpperCase();
        if (!uid) return;

        if (!forcedUid) localStorage.removeItem(CONFIG.USER_DATA_KEY);

        btn.disabled = true; 
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG KIỂM TRA...';
        
        try {
            const res = await fetch(`${CONFIG.GGS_URL}?action=getRole&uid=${uid}`);
            const user = await res.json();
            if (user && user.rights) {
                localStorage.setItem(CONFIG.STORAGE_KEY, uid);
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(user));
                this.applyPermissions(user);
                this.loginOverlay.classList.add('hidden');
                this.appContainer.classList.remove('hidden');
                this.loadPage(localStorage.getItem('currentShot') || 'shot1');
            } else { 
                document.getElementById('login-msg').innerText = "Sai User CODE!"; 
                localStorage.clear();
            }
        } catch(e) { document.getElementById('login-msg').innerText = "Lỗi kết nối!"; }
        finally { btn.disabled = false; btn.innerText = "ĐĂNG NHẬP"; }
    }

    applyPermissions(user) {
        document.getElementById('display-user-name').innerText = user.name;
        document.querySelectorAll('.menu-item[data-shot]').forEach(item => {
            const shot = item.getAttribute('data-shot');
            const perm = (user.rights[shot] || "").toLowerCase();
            item.classList.toggle('hidden', !(perm === "root" || perm === "view"));
        });
        document.querySelectorAll('.menu-group').forEach(group => {
            const hasVisible = group.querySelectorAll('.menu-item:not(.hidden)').length > 0;
            group.classList.toggle('hidden', !hasVisible);
        });
    }

    handleMenuClick(item) {
        const shotId = item.getAttribute('data-shot');
        const title = item.getAttribute('data-title');
        if (!shotId) return;

        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        item.classList.add('active');
        if (this.headerTitle) this.headerTitle.innerText = title;

        const exportBtn = document.getElementById('exportPdfBtn');
        if (exportBtn) exportBtn.style.display = (shotId === 'shot7') ? 'none' : 'flex';

        // Đóng menu nếu đang ở Mobile
        if (window.innerWidth <= 992) this.toggleMobileSidebar(false);

        this.loadPage(shotId);
    }

    async loadPage(shotName) {
        if (!shotName) return;
        const content = this.contentArea;
        const actionSlot = this.actionSlot;
        content.style.opacity = '0';
        if (actionSlot) actionSlot.innerHTML = ''; 

        try {
            const path = `shots/${shotName}/${shotName}`;
            this.cleanupShotAssets();

            const htmlRes = await fetch(`${path}.html?t=${Date.now()}`);
            if (!htmlRes.ok) throw new Error("File 404");
            const htmlText = await htmlRes.text();

            const cssLoadPromise = new Promise((resolve) => {
                const link = document.createElement('link');
                link.id = 'shot-css'; link.rel = 'stylesheet';
                link.href = `${path}.css?t=${Date.now()}`;
                link.onload = resolve; link.onerror = resolve;
                document.head.appendChild(link);
            });
            await cssLoadPromise;

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const shotActions = doc.querySelector('.shot-actions');
            const shotBody = doc.querySelector('.shot-body');

            if (shotActions && actionSlot) actionSlot.innerHTML = shotActions.innerHTML;
            content.innerHTML = shotBody ? shotBody.innerHTML : htmlText;

            const script = document.createElement('script');
            script.id = 'shot-js'; script.src = `${path}.js?t=${Date.now()}`;
            script.onload = () => {
                const initFuncName = `${shotName}Init`;
                if (typeof window[initFuncName] === 'function') window[initFuncName]();
                requestAnimationFrame(() => content.style.opacity = '1');
            };
            document.body.appendChild(script);
            localStorage.setItem('currentShot', shotName);
        } catch (err) { 
            content.innerHTML = `<div class="p-5 text-center text-muted">Dữ liệu ${shotName} đang cập nhật...</div>`;
            content.style.opacity = '1';
        }
    }

    cleanupShotAssets() { ['shot-css', 'shot-js'].forEach(id => document.getElementById(id)?.remove()); }

    toggleSidebar() {
        this.sidebar.classList.toggle('collapsed');
        localStorage.setItem(CONFIG.SIDEBAR_KEY, this.sidebar.classList.contains('collapsed') ? 'mini' : 'full');
    }

    toggleMobileSidebar(open) {
        if (open) {
            this.sidebar.classList.add('mobile-active');
            this.sidebarOverlay.classList.add('active');
        } else {
            this.sidebar.classList.remove('mobile-active');
            this.sidebarOverlay.classList.remove('active');
        }
    }

    restoreSidebarState() { if (localStorage.getItem(CONFIG.SIDEBAR_KEY) === 'mini') this.sidebar.classList.add('collapsed'); }

    togglePassword() {
        const input = document.getElementById('login-uid');
        input.type = input.type === 'password' ? 'text' : 'password';
        document.getElementById('togglePassword').classList.toggle('fa-eye');
    }

    handleGlobalClicks(e) {
        if (e.target.tagName === 'IMG' && e.target.classList.contains('img-previewable')) {
            const modal = document.getElementById('imageModal');
            document.getElementById('imgFull').src = e.target.src;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        if (e.target.classList.contains('close-modal') || e.target.id === 'imageModal') {
            document.getElementById('imageModal').classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    logout() { if (confirm("Đăng xuất?")) this.forceLogout(); }
    forceLogout() { localStorage.clear(); location.reload(); }
}

// --- HÀM XUẤT PDF CHUẨN MIRROR (FIX RỚT CHỮ UNILEVER) ---
async function handleExportPdf(btn) {
    const source = document.getElementById('content-area');
    if (!source || typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') return;

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Trích xuất...';

    let sandbox = null;
    try {
        await document.fonts.ready;
        sandbox = document.createElement('div');
        Object.assign(sandbox.style, {
            position: 'absolute', left: '-9999px', top: '0',
            width: source.clientWidth + 'px', background: 'white', padding: '0'
        });

        const clone = source.cloneNode(true);
        sandbox.appendChild(clone);
        document.body.appendChild(sandbox);

        const originalTable = source.querySelector('.modern-table');
        const clonedTable = clone.querySelector('.modern-table');

        if (originalTable && clonedTable) {
            clonedTable.style.width = originalTable.offsetWidth + 'px';
            clonedTable.style.tableLayout = 'fixed';
            const rows = originalTable.rows;
            const cRows = clonedTable.rows;
            for (let r = 0; r < rows.length; r++) {
                for (let c = 0; c < rows[r].cells.length; c++) {
                    const oCell = rows[r].cells[c];
                    const cCell = cRows[r].cells[c];
                    if (cCell) {
                        const style = window.getComputedStyle(oCell);
                        cCell.style.width = oCell.offsetWidth + 'px';
                        cCell.style.backgroundColor = style.backgroundColor;
                        cCell.style.color = style.color;
                        cCell.style.textAlign = style.textAlign;
                        cCell.style.padding = style.padding;
                        cCell.style.fontWeight = style.fontWeight;
                        cCell.style.fontSize = style.fontSize;
                        cCell.style.verticalAlign = 'middle';
                        if (c === 1) { // Cột Unilever
                            cCell.style.whiteSpace = 'nowrap';
                            cCell.style.width = (oCell.offsetWidth + 2) + 'px';
                        }
                    }
                }
            }
        }

        clone.querySelectorAll('button, .actions, .sidebar-toggle, .btn-trash, .fa-trash-can').forEach(el => el.remove());
        clone.style.minHeight = '0'; clone.style.height = 'auto';

        await new Promise(r => setTimeout(r, 400));
        const canvas = await html2canvas(sandbox, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png', 1.0);
        const { jsPDF } = window.jspdf;
        const imgW = canvas.width / 2;
        const imgH = canvas.height / 2;

        const pdf = new jsPDF({ orientation: imgW > imgH ? 'l' : 'p', unit: 'px', format: [imgW, imgH] });
        pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
        pdf.save(`Unime_Report_${new Date().getTime()}.pdf`);
    } catch (e) { console.error(e); }
    finally {
        if (sandbox && sandbox.parentNode) sandbox.parentNode.removeChild(sandbox);
        btn.disabled = false; btn.innerHTML = originalText;
    }
}