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

    // --- HÀM CẬP NHẬT TRẠNG THÁI HEADER & SIDEBAR (TỐI ƯU GIAO DIỆN) ---
    updateUIState(shotId) {
        // --- ĐOẠN SETUP ẨN/HIỆN NÚT PDF ---
        const exportBtn = document.getElementById('exportPdfBtn');
        const hiddenPdfShots = ['shot7', 'welcome']; // Danh sách shot KHÔNG HIỆN nút PDF
        
        if (exportBtn) {
            if (hiddenPdfShots.includes(shotId)) {
                exportBtn.style.setProperty('display', 'none', 'important');
            } else {
                exportBtn.style.setProperty('display', 'flex', 'important');
            }
        }

        // 2. Cập nhật Highlight Sidebar & Tiêu đề Header
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        const activeMenu = document.querySelector(`.menu-item[data-shot="${shotId}"]`);
        
        if (activeMenu) {
            activeMenu.classList.add('active');
            if (this.headerTitle) this.headerTitle.innerText = activeMenu.getAttribute('data-title');
        } else if (shotId === 'welcome') {
            if (this.headerTitle) this.headerTitle.innerText = "WELCOME";
        }
    }

    // --- LOGIC PHÂN QUYỀN (SỬA LỖI USER 2) ---
    applyPermissions(user) {
        if (!user) return;
        const rights = user.rights || {};
        
        const name = String(user.name || "Thành viên").trim();
        const nameDisplay = name !== "" ? name : "Thành viên";
        if (document.getElementById('display-user-name')) document.getElementById('display-user-name').innerText = nameDisplay;
        if (document.getElementById('user-welcome-name')) document.getElementById('user-welcome-name').innerText = nameDisplay;

        document.querySelectorAll('.menu-item[data-shot]').forEach(item => {
            const shotId = item.getAttribute('data-shot');
            const perm = (rights[shotId] || "").toString().toLowerCase().trim();
            const isAllowed = (perm === "root" || perm === "view");
            item.style.setProperty('display', isAllowed ? 'flex' : 'none', 'important');
        });

        document.querySelectorAll('.menu-group').forEach(group => {
            const hasVisible = Array.from(group.querySelectorAll('.menu-item[data-shot]'))
                                   .some(child => child.style.display !== 'none');
            group.style.setProperty('display', hasVisible ? 'block' : 'none', 'important');
        });
    }

    checkAuth() {
        const uid = localStorage.getItem(CONFIG.STORAGE_KEY);
        const cachedUser = localStorage.getItem(CONFIG.USER_DATA_KEY);

        if (uid && cachedUser) {
            const user = JSON.parse(cachedUser);
            this.applyPermissions(user); 
            this.loginOverlay.classList.add('hidden');
            this.appContainer.classList.remove('hidden');

            let lastShotId = localStorage.getItem('currentShot') || 'welcome';
            
            // Kiểm tra quyền của user hiện tại với shot cũ
            const userPerm = (user.rights[lastShotId] || "").toString().toLowerCase().trim();
            if (!(userPerm === "root" || userPerm === "view") && lastShotId !== 'welcome') {
                lastShotId = 'welcome';
            }

            this.updateUIState(lastShotId);
            this.loadPage(lastShotId);
            this.silentCheckAuth(uid);
        }
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
                
                this.updateUIState('welcome'); // Cập nhật Header/PDF cho welcome
                this.loadPage('welcome');
            } else { 
                alert("Mã CODE không tồn tại!");
            }
        } catch(e) { alert("Lỗi kết nối!"); }
        finally { btn.disabled = false; btn.innerText = "ĐĂNG NHẬP"; }
    }

    handleMenuClick(item) {
        const shotId = item.getAttribute('data-shot');
        if (!shotId) return;

        this.updateUIState(shotId); // Cập nhật Header/PDF và Active Menu

        if (window.innerWidth <= 992) this.handleMainToggle();
        this.loadPage(shotId);
    }

    // Các hàm loadPage, handleMainToggle, GlobalClicks giữ nguyên...
    async loadPage(shotName) {
        if (!shotName) return;
        const loader = document.getElementById('page-loader');
        const content = this.contentArea;

        // 1. DỌN DẸP VÀ XOÁ SẠCH NGAY LẬP TỨC
        if (loader) loader.classList.remove('hidden');
        
        content.style.transition = 'none'; // Tắt hiệu ứng mờ để ẩn ngay lập tức
        content.style.opacity = '0';
        content.innerHTML = ''; // <--- DÒNG QUAN TRỌNG: Xoá sạch Welcome Avatar ngay tại đây
        
        if (this.actionSlot) this.actionSlot.innerHTML = ''; 

        try {
            const path = `shots/${shotName}/${shotName}`;
            
            // Xoá CSS/JS cũ
            ['shot-css', 'shot-js'].forEach(id => document.getElementById(id)?.remove());

            // 2. TẢI HTML VÀ CSS SONG SONG
            const [htmlRes] = await Promise.all([
                fetch(`${path}.html?t=${Date.now()}`),
                new Promise(resolve => {
                    const link = document.createElement('link');
                    link.id = 'shot-css'; link.rel = 'stylesheet';
                    link.href = `${path}.css?t=${Date.now()}`;
                    link.onload = resolve; link.onerror = resolve;
                    document.head.appendChild(link);
                })
            ]);

            const htmlText = await htmlRes.text();
            const doc = new DOMParser().parseFromString(htmlText, 'text/html');
            const shotActions = doc.querySelector('.shot-actions');
            const shotBody = doc.querySelector('.shot-body');
            const mainHeader = document.querySelector('.main-header');

            // Cập nhật Header
            if (this.actionSlot && shotActions && shotActions.innerHTML.trim() !== "") {
                this.actionSlot.innerHTML = shotActions.innerHTML;
                mainHeader?.classList.add('has-nav-actions');
            } else {
                mainHeader?.classList.remove('has-nav-actions');
            }

            // 3. ĐỔ NỘI DUNG MỚI VÀO (Lúc này content đang trống rỗng nên không bị ghosting)
            content.innerHTML = shotBody ? shotBody.innerHTML : htmlText;

            // 4. HIỆN TRANG VÀ ẨN LOADER
            if (loader) loader.classList.add('hidden');
            
            // Dùng requestAnimationFrame để đảm bảo trình duyệt đã render nội dung mới rồi mới hiện opacity
            requestAnimationFrame(() => {
                content.style.transition = 'opacity 0.25s ease';
                content.style.opacity = '1';
            });

            // 5. NẠP JS TRONG CHẾ ĐỘ CHẠY NGẦM
            const script = document.createElement('script');
            script.id = 'shot-js';
            script.src = `${path}.js?t=${Date.now()}`;
            script.onload = () => {
                if (typeof window[`${shotName}Init`] === 'function') {
                    window[`${shotName}Init`]();
                }
            };
            document.body.appendChild(script);

            localStorage.setItem('currentShot', shotName);

        } catch (e) { 
            console.error("LoadPage Error:", e);
            if (loader) loader.classList.add('hidden');
            content.style.opacity = '1'; 
        }
    }
    
    handleMainToggle() {
        const isMobile = window.innerWidth <= 992;
        const overlay = document.getElementById('sidebar-overlay');
        if (isMobile) {
            const isOpen = this.sidebar.classList.toggle('mobile-active');
            overlay?.classList.toggle('active', isOpen);
        } else {
            this.sidebar.classList.toggle('collapsed');
            localStorage.setItem(CONFIG.SIDEBAR_KEY, this.sidebar.classList.contains('collapsed') ? 'mini' : 'full');
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
            modal?.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        if (e.target.classList.contains('close-modal') || e.target.id === 'imageModal') {
            document.getElementById('imageModal')?.classList.remove('active');
            document.body.style.overflow = '';
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

        const canvas = await html2canvas(sandbox, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png', 1.0);
        const { jsPDF } = window.jspdf;
        const imgW = canvas.width / 2; const imgH = canvas.height / 2;
        const pdf = new jsPDF({ orientation: imgW > imgH ? 'l' : 'p', unit: 'px', format: [imgW, imgH] });
        pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
        pdf.save(`Unime_Report_${new Date().getTime()}.pdf`);
    } catch (e) { console.error(e); }
    finally { if (sandbox) sandbox.remove(); btn.disabled = false; btn.innerHTML = originalText; }
}