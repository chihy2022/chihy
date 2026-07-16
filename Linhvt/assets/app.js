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
        this.sidebarOverlay = document.getElementById('sidebar-overlay');
        this.loginOverlay = document.getElementById('login-overlay');
        this.appContainer = document.querySelector('.app-container');
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
        this.restoreSidebarState();
    }

    setupEventListeners() {
        // Nút Menu dùng chung cho cả Web & Mobile
        document.getElementById('menuToggleBtn').addEventListener('click', () => this.handleMainToggle());
        this.sidebarOverlay?.addEventListener('click', () => this.handleMainToggle());

        document.getElementById('btnLogin').addEventListener('click', () => this.performLogin());
        document.getElementById('togglePassword').addEventListener('click', () => this.togglePassword());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('exportPdfBtn').addEventListener('click', (e) => handleExportPdf(e.currentTarget));

        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => this.handleMenuClick(item));
        });

        document.querySelectorAll('.group-header').forEach(header => {
            header.addEventListener('click', () => header.parentElement.classList.toggle('active'));
        });

        document.addEventListener('click', (e) => this.handleGlobalClicks(e));
    }

    handleMainToggle() {
        const isMobile = window.innerWidth <= 992;
        const overlay = document.getElementById('sidebar-overlay');
        const sidebar = this.sidebar;

        if (isMobile) {
            const isOpen = sidebar.classList.toggle('mobile-active');
            if (isOpen) {
                overlay.classList.add('active');
            } else {
                overlay.classList.remove('active');
            }
        } else {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem(CONFIG.SIDEBAR_KEY, sidebar.classList.contains('collapsed') ? 'mini' : 'full');
        }
    }

    checkAuth() {
        const uid = localStorage.getItem(CONFIG.STORAGE_KEY);
        const cachedUser = localStorage.getItem(CONFIG.USER_DATA_KEY);
        if (uid && cachedUser) {
            this.applyPermissions(JSON.parse(cachedUser));
            this.loginOverlay.classList.add('hidden');
            this.appContainer.classList.remove('hidden');
            this.loadPage(localStorage.getItem('currentShot') || 'shot1');
            this.silentCheckAuth(uid);
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
        } catch(e) {}
    }

    async performLogin(forcedUid = null) {
        const uidInput = document.getElementById('login-uid');
        const btn = document.getElementById('btnLogin');
        const uid = forcedUid || uidInput.value.trim().toUpperCase();
        if (!uid) return;
        if (!forcedUid) localStorage.removeItem(CONFIG.USER_DATA_KEY);

        btn.disabled = true; 
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG XÁC THỰC...';
        
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
                document.getElementById('login-msg').innerText = "Mã CODE không đúng!"; 
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

        if (window.innerWidth <= 992) {
            this.sidebar.classList.remove('mobile-active');
            this.sidebarOverlay.classList.remove('active');
        }
        this.loadPage(shotId);
    }

    // --- CƠ CHẾ LOADPAGE CHỐNG GIẬT (PHẢI NẠP XONG CSS MỚI SHOW) ---
    async loadPage(shotName) {
        if (!shotName) return;
        const content = this.contentArea;
        const actionSlot = this.actionSlot;

        // 1. Ẩn nội dung cũ ngay lập tức
        content.style.transition = 'none';
        content.style.opacity = '0';
        if (actionSlot) actionSlot.innerHTML = ''; 

        try {
            const path = `shots/${shotName}/${shotName}`;
            ['shot-css', 'shot-js'].forEach(id => document.getElementById(id)?.remove());

            // 2. Tải HTML
            const htmlRes = await fetch(`${path}.html?t=${Date.now()}`);
            const htmlText = await htmlRes.text();

            // 3. Nạp CSS và tạo Promise chờ CSS tải xong
            const cssLoadPromise = new Promise(resolve => {
                const link = document.createElement('link');
                link.id = 'shot-css'; link.rel = 'stylesheet';
                link.href = `${path}.css?t=${Date.now()}`;
                link.onload = resolve; // Quan trọng: CSS nạp xong mới resolve
                link.onerror = resolve; // Tránh treo nếu file CSS lỗi
                document.head.appendChild(link);
            });

            await cssLoadPromise; // DỪNG LẠI ĐỢI CSS

            // 4. Khi CSS xong, đổ HTML vào
            const doc = new DOMParser().parseFromString(htmlText, 'text/html');
            const shotActions = doc.querySelector('.shot-actions');
            const shotBody = doc.querySelector('.shot-body');

            if (actionSlot) actionSlot.innerHTML = shotActions ? shotActions.innerHTML : '';
            content.innerHTML = shotBody ? shotBody.innerHTML : htmlText;

            // 5. Nạp JS
            const script = document.createElement('script');
            script.id = 'shot-js'; script.src = `${path}.js?t=${Date.now()}`;
            script.onload = () => {
                if (typeof window[`${shotName}Init`] === 'function') window[`${shotName}Init`]();
                // Chỉ hiện nội dung khi mọi thứ đã sẵn sàng
                requestAnimationFrame(() => {
                    content.style.transition = 'opacity 0.3s ease';
                    content.style.opacity = '1';
                });
            };
            document.body.appendChild(script);
            localStorage.setItem('currentShot', shotName);

        } catch (err) { 
            console.error("LoadPage Error:", err);
            content.style.opacity = '1'; 
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
            const modal = document.getElementById('imageModal');
            if(modal) modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    logout() { if (confirm("Bạn có muốn đăng xuất?")) this.forceLogout(); }
    forceLogout() { localStorage.clear(); location.reload(); }
}

// --- HÀM XUẤT PDF CHUẨN MIRROR (ĐÃ FIX RỚT CHỮ) ---
async function handleExportPdf(btn) {
    const source = document.getElementById('content-area');
    if (!source || typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') return;
    const originalText = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Đang xuất...';

    let sandbox = null;
    try {
        await document.fonts.ready;
        sandbox = document.createElement('div');
        Object.assign(sandbox.style, { position: 'absolute', left: '-9999px', top: '0', width: source.clientWidth + 'px', background: 'white' });
        const clone = source.cloneNode(true);
        sandbox.appendChild(clone);
        document.body.appendChild(sandbox);

        const oTable = source.querySelector('.modern-table');
        const cTable = clone.querySelector('.modern-table');
        if (oTable && cTable) {
            cTable.style.width = oTable.offsetWidth + 'px';
            cTable.style.tableLayout = 'fixed';
            for (let r = 0; r < oTable.rows.length; r++) {
                for (let c = 0; c < oTable.rows[r].cells.length; c++) {
                    const oCell = oTable.rows[r].cells[c];
                    const cCell = cTable.rows[r].cells[c];
                    if (cCell) {
                        const s = window.getComputedStyle(oCell);
                        cCell.style.width = oCell.offsetWidth + 'px';
                        cCell.style.backgroundColor = s.backgroundColor;
                        cCell.style.textAlign = s.textAlign;
                        cCell.style.padding = s.padding;
                        cCell.style.fontSize = s.fontSize;
                        cCell.style.verticalAlign = 'middle';
                        if (c === 1) { cCell.style.whiteSpace = 'nowrap'; cCell.style.width = (oCell.offsetWidth + 2) + 'px'; }
                    }
                }
            }
        }
        clone.querySelectorAll('button, .actions, .sidebar-toggle, .btn-trash, .fa-trash-can').forEach(el => el.remove());
        clone.style.minHeight = '0'; clone.style.height = 'auto';
        await new Promise(r => setTimeout(r, 400));

        const canvas = await html2canvas(sandbox, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png', 1.0);
        const { jsPDF } = window.jspdf;
        const imgW = canvas.width / 2; const imgH = canvas.height / 2;
        const pdf = new jsPDF({ orientation: imgW > imgH ? 'l' : 'p', unit: 'px', format: [imgW, imgH] });
        pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
        pdf.save(`Unime_Report_${new Date().getTime()}.pdf`);
    } catch (e) { console.error(e); }
    finally { if (sandbox) sandbox.remove(); btn.disabled = false; btn.innerHTML = originalText; }
}