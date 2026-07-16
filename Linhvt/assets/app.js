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

    // --- TỐI ƯU SIÊU TỐC: VÀO APP TRƯỚC, CHECK QUYỀN SAU ---
    checkAuth() {
        const uid = localStorage.getItem(CONFIG.STORAGE_KEY);
        const cachedUser = localStorage.getItem(CONFIG.USER_DATA_KEY);

        if (uid && cachedUser) {
            const user = JSON.parse(cachedUser);
            // 1. HIỆN GIAO DIỆN NGAY LẬP TỨC TỪ CACHE (MẤT 0.1s)
            this.applyPermissions(user); 
            this.loginOverlay.classList.add('hidden');
            this.appContainer.classList.remove('hidden');

            const lastShotId = localStorage.getItem('currentShot') || 'welcome';
            this.loadPage(lastShotId);
            
            // 2. KIỂM TRA NGẦM (SILENT CHECK) - CẬP NHẬT LẠI SAU NẾU CÓ THAY ĐỔI
            this.silentCheckAuth(uid);
        }
    }

    async silentCheckAuth(uid) {
        try {
            const res = await fetch(`${CONFIG.GGS_URL}?action=getRole&uid=${uid}`);
            const user = await res.json();
            if (user && user.rights) {
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(user));
                this.applyPermissions(user); // Cập nhật lại menu nếu sếp vừa đổi quyền
            } else {
                this.forceLogout();
            }
        } catch(e) { console.log("Offline mode - using cache"); }
    }

    applyPermissions(user) {
        if (!user) return;
        const rights = user.rights || {};
        
        // Hiện tên
        const name = String(user.name || "Thành viên").trim();
        const nameDisplay = name !== "" ? name : "Thành viên";
        if (document.getElementById('display-user-name')) document.getElementById('display-user-name').innerText = nameDisplay;
        if (document.getElementById('user-welcome-name')) document.getElementById('user-welcome-name').innerText = nameDisplay;

        // ÉP ẨN/HIỆN TỨC THÌ BẰNG STYLE (NHANH HƠN CLASS)
        document.querySelectorAll('.menu-item[data-shot]').forEach(item => {
            const shotId = item.getAttribute('data-shot');
            const perm = (rights[shotId] || "").toString().toLowerCase().trim();
            const isAllowed = (perm === "root" || perm === "view");
            item.style.setProperty('display', isAllowed ? 'flex' : 'none', 'important');
        });

        // Hiện Group nếu có con hiện
        document.querySelectorAll('.menu-group').forEach(group => {
            const hasVisible = Array.from(group.querySelectorAll('.menu-item[data-shot]'))
                                   .some(child => child.style.display !== 'none');
            group.style.setProperty('display', hasVisible ? 'block' : 'none', 'important');
        });
    }

    async performLogin(forcedUid = null) {
        const uidInput = document.getElementById('login-uid');
        const btn = document.getElementById('btnLogin');
        const uid = forcedUid || uidInput.value.trim().toUpperCase();
        if (!uid) return;

        btn.disabled = true; 
        btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> XÁC THỰC...';
        
        try {
            const res = await fetch(`${CONFIG.GGS_URL}?action=getRole&uid=${uid}`);
            const user = await res.json();
            if (user && user.rights) {
                localStorage.setItem(CONFIG.STORAGE_KEY, uid);
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(user));
                this.applyPermissions(user);
                this.loginOverlay.classList.add('hidden');
                this.appContainer.classList.remove('hidden');
                this.loadPage('welcome');
            } else { 
                alert("Mã CODE không tồn tại!");
            }
        } catch(e) { alert("Lỗi kết nối!"); }
        finally { btn.disabled = false; btn.innerText = "ĐĂNG NHẬP"; }
    }

    async loadPage(shotName) {
        if (!shotName) return;
        const loader = document.getElementById('page-loader');
        if (loader) loader.classList.remove('hidden');
        this.contentArea.style.opacity = '0';

        try {
            const path = `shots/${shotName}/${shotName}`;
            ['shot-css', 'shot-js'].forEach(id => document.getElementById(id)?.remove());

            const [htmlRes] = await Promise.all([
                fetch(`${path}.html?t=${Date.now()}`),
                new Promise(res => {
                    const link = document.createElement('link');
                    link.id = 'shot-css'; link.rel = 'stylesheet';
                    link.href = `${path}.css?t=${Date.now()}`;
                    link.onload = res; link.onerror = res;
                    document.head.appendChild(link);
                })
            ]);

            const htmlText = await htmlRes.text();
            const doc = new DOMParser().parseFromString(htmlText, 'text/html');
            const shotActions = doc.querySelector('.shot-actions');
            const shotBody = doc.querySelector('.shot-body');

            if (this.actionSlot) this.actionSlot.innerHTML = shotActions ? shotActions.innerHTML : '';
            this.contentArea.innerHTML = shotBody ? shotBody.innerHTML : htmlText;

            const script = document.createElement('script');
            script.id = 'shot-js'; script.src = `${path}.js?t=${Date.now()}`;
            script.onload = async () => {
                if (typeof window[`${shotName}Init`] === 'function') await window[`${shotName}Init`]();
                if (loader) loader.classList.add('hidden');
                this.contentArea.style.opacity = '1';
            };
            document.body.appendChild(script);
            localStorage.setItem('currentShot', shotName);
        } catch (e) { if (loader) loader.classList.add('hidden'); this.contentArea.style.opacity = '1'; }
    }

    handleMainToggle() {
        const isMobile = window.innerWidth <= 992;
        if (isMobile) {
            const isOpen = this.sidebar.classList.toggle('mobile-active');
            this.sidebarOverlay?.classList.toggle('active', isOpen);
        } else {
            this.sidebar.classList.toggle('collapsed');
            localStorage.setItem(CONFIG.SIDEBAR_KEY, this.sidebar.classList.contains('collapsed') ? 'mini' : 'full');
        }
    }

    handleMenuClick(item) {
        const shotId = item.getAttribute('data-shot');
        const title = item.getAttribute('data-title');
        if (!shotId) return;
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        item.classList.add('active');
        if (this.headerTitle) this.headerTitle.innerText = title;
        if (window.innerWidth <= 992) this.handleMainToggle();
        this.loadPage(shotId);
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
            modal?.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        if (e.target.classList.contains('close-modal') || e.target.id === 'imageModal') {
            document.getElementById('imageModal')?.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    logout() { if (confirm("Đăng xuất?")) this.forceLogout(); }
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