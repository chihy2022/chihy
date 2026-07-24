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
        
        // Gán sự kiện xuất file
        document.getElementById('exportPdfBtn')?.addEventListener('click', (e) => handleExportPdf(e.currentTarget));
        document.getElementById('exportPngBtn')?.addEventListener('click', (e) => handleExportPng(e.currentTarget));

        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => this.handleMenuClick(item));
        });

        document.querySelectorAll('.group-header').forEach(header => {
            header.addEventListener('click', () => header.parentElement.classList.toggle('active'));
        });

        document.addEventListener('click', (e) => this.handleGlobalClicks(e));

        window.addEventListener('resize', () => {
            const currentShot = localStorage.getItem('currentShot') || 'welcome';
            this.updateUIState(currentShot);
        });
    }

    // --- CẬP NHẬT TRẠNG THÁI HEADER & HIỂN THỊ NÚT XUẤT FILE ---
    updateUIState(shotId) {
        const pdfBtn = document.getElementById('exportPdfBtn');
        const pngBtn = document.getElementById('exportPngBtn');
        const hiddenShots = ['shot7', 'welcome', 'shot8']; 
        
        const isMobile = window.innerWidth <= 1024;
        const isHiddenShot = hiddenShots.includes(shotId);

        // Xử lý ẩn/hiện cả 2 nút PDF và PNG
        [pdfBtn, pngBtn].forEach(btn => {
            if (btn) {
                if (isMobile || isHiddenShot) {
                    btn.style.setProperty('display', 'none', 'important');
                } else {
                    btn.style.setProperty('display', 'flex', 'important');
                }
            }
        });

        // Cập nhật Highlight Sidebar & Tiêu đề Header
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        const activeMenu = document.querySelector(`.menu-item[data-shot="${shotId}"]`);
        
        if (activeMenu) {
            activeMenu.classList.add('active');
            if (this.headerTitle) this.headerTitle.innerText = activeMenu.getAttribute('data-title');
        } else if (shotId === 'welcome') {
            if (this.headerTitle) this.headerTitle.innerText = "WELCOME";
        }
    }

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
                this.updateUIState('welcome');
                this.loadPage('welcome');
            } else { alert("Mã CODE không tồn tại!"); }
        } catch(e) { alert("Lỗi kết nối!"); }
        finally { btn.disabled = false; btn.innerText = "ĐĂNG NHẬP"; }
    }

    handleMenuClick(item) {
        const shotId = item.getAttribute('data-shot');
        if (!shotId) return;
        this.updateUIState(shotId);
        if (window.innerWidth <= 992) this.handleMainToggle();
        this.loadPage(shotId);
    }

    async loadPage(shotName) {
        if (!shotName) return;
        const loader = document.getElementById('page-loader');
        const content = this.contentArea;

        if (loader) loader.classList.remove('hidden');
        content.style.transition = 'none';
        content.style.opacity = '0';
        content.innerHTML = ''; 
        if (this.actionSlot) this.actionSlot.innerHTML = ''; 

        try {
            const path = `shots/${shotName}/${shotName}`;
            ['shot-css', 'shot-js'].forEach(id => document.getElementById(id)?.remove());

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

            if (this.actionSlot && shotActions && shotActions.innerHTML.trim() !== "") {
                this.actionSlot.innerHTML = shotActions.innerHTML;
                mainHeader?.classList.add('has-nav-actions');
            } else {
                mainHeader?.classList.remove('has-nav-actions');
            }

            content.innerHTML = shotBody ? shotBody.innerHTML : htmlText;
            if (loader) loader.classList.add('hidden');
            
            requestAnimationFrame(() => {
                content.style.transition = 'opacity 0.25s ease';
                content.style.opacity = '1';
            });

            const script = document.createElement('script');
            script.id = 'shot-js';
            script.src = `${path}.js?t=${Date.now()}`;
            script.onload = () => {
                if (typeof window[`${shotName}Init`] === 'function') window[`${shotName}Init`]();
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
        const isMobile = window.innerWidth <= 1024;
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

// ================================================================
// --- HÀM XUẤT PDF TRANG DÀI (FIX MỜ, FIX CẮT CHỮ, NÉT CĂNG) ---
// ================================================================
async function handleExportPdf(btn) {
    const source = document.querySelector('.main-content') || document.getElementById('content-area');
    if (!source) return;

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Đang xử lý PDF...';

    try {
        await document.fonts.ready;
        const canvas = await html2canvas(source, {
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            windowWidth: 1920, 
            onclone: (clonedDoc) => {
                const clonedSource = clonedDoc.querySelector('.main-content') || clonedDoc.getElementById('content-area');
                
                // Ép hiện rõ 100% (Fix mờ nhạt)
                clonedSource.querySelectorAll('*').forEach(el => {
                    el.style.opacity = "1";
                    el.style.transition = "none";
                    el.style.animation = "none";
                });

                // Ép giãn hết chiều cao (Fix cắt chữ)
                let curr = clonedSource;
                while (curr) {
                    curr.style.overflow = 'visible';
                    curr.style.height = 'auto';
                    curr.style.maxHeight = 'none';
                    curr.style.display = 'block';
                    curr = curr.parentElement;
                }

                const style = clonedDoc.createElement('style');
                style.innerHTML = `
                    .sidebar, .btn, button, .no-export, .nav-tabs, .actions { display: none !important; visibility: hidden !important; }
                    header { position: static !important; width: 100% !important; border: none !important; }
                    body { overflow: visible !important; height: auto !important; background: #fff !important; }
                    .main-content { padding: 0 !important; margin: 0 !important; }
                `;
                clonedDoc.head.appendChild(style);
            }
        });

        const { jsPDF } = window.jspdf;
        const imgWidth = canvas.width / 2;
        const imgHeight = canvas.height / 2;

        const pdf = new jsPDF({
            orientation: imgWidth > imgHeight ? 'l' : 'p',
            unit: 'px',
            format: [imgWidth, imgHeight],
            hotfixes: ["px_scaling"],
            compress: true
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');

        const timestamp = new Date().getTime();
        pdf.save(`POSM_Full_Report_${timestamp}.pdf`);
    } catch (e) {
        console.error("Lỗi PDF:", e);
        alert("Lỗi xuất PDF!");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ================================================================
// --- HÀM XUẤT PNG SIÊU NÉT (CHO TRANG ÍT DATA) ---
// ================================================================
async function handleExportPng(btn) {
    // 1. CHỌN VÙNG NỘI DUNG CHÍNH XÁC
    const source = document.querySelector('.main-content') || document.getElementById('content-area');
    if (!source) return;

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Đang tối ưu hóa...';

    try {
        await document.fonts.ready;

        // --- BƯỚC QUAN TRỌNG: ĐO KÍCH THƯỚC THỰC TẾ ---
        // Lấy chiều rộng hiện tại trên màn hình của bạn
        const actualWidth = source.offsetWidth;
        
        // Ép thẻ nguồn nhả hết chiều cao để đo con số thật sự
        const originalStyle = source.getAttribute('style');
        source.style.height = 'auto';
        source.style.overflow = 'visible';
        source.style.display = 'block';
        
        // Đo chiều cao thực tế (bao gồm cả phần data ít hay nhiều)
        const actualHeight = source.scrollHeight;
        
        // Trả lại style cũ để không làm hỏng giao diện đang dùng
        if (originalStyle) source.setAttribute('style', originalStyle); 
        else source.removeAttribute('style');

        // Tính toán độ nét (Scale 2 là chuẩn nhất, 13 trang thì code tự giảm xuống 1.2)
        let finalScale = 2; 
        if (actualHeight * finalScale > 25000) finalScale = 25000 / actualHeight;

        const canvas = await html2canvas(source, {
            scale: finalScale,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            width: actualWidth,
            height: actualHeight,
            windowWidth: actualWidth, // Ép khung nhìn ảo bằng đúng chiều rộng bảng (Chống co cột)
            onclone: (clonedDoc) => {
                const clonedSource = clonedDoc.querySelector('.main-content') || clonedDoc.getElementById('content-area');
                
                // XOÁ SẠCH: Sidebar, Header, Nút bấm (Giúp ảnh trắng sạch và nhẹ RAM)
                clonedDoc.querySelectorAll('.sidebar, .btn, button, .no-export, .actions, header, .main-header, #menuToggleBtn, .right-side').forEach(el => el.remove());

                // ÉP CẤU TRÚC PHẲNG: Phá bỏ mọi rào cản overflow từ thẻ nguồn lên tận thẻ html
                let curr = clonedSource;
                while (curr && curr !== clonedDoc.documentElement) {
                    curr.style.height = 'auto !important';
                    curr.style.minHeight = '0 !important';
                    curr.style.maxHeight = 'none !important';
                    curr.style.overflow = 'visible !important';
                    curr.style.display = 'block !important';
                    curr.style.position = 'static !important';
                    curr = curr.parentElement;
                }

                // CSS ĐẶC TRỊ LAYOUT (FIX CHỮ CANH DƯỚI, FIX RỚT DÒNG)
                const style = clonedDoc.createElement('style');
                style.innerHTML = `
                    html, body { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
                    .main-content { padding: 30px !important; width: ${actualWidth}px !important; margin: 0 auto !important; display: block !important; }
                    table { width: 100% !important; table-layout: auto !important; border-collapse: collapse !important; border: 1px solid #ccc !important; }
                    th, td { 
                        vertical-align: middle !important; /* Căn giữa dọc */
                        padding: 12px 8px !important; 
                        border: 1px solid #dee2e6 !important; 
                        line-height: 1.4 !important;
                        word-break: normal !important;
                    }
                    /* Fix mờ nhạt */
                    * { opacity: 1 !important; visibility: visible !important; transition: none !important; animation: none !important; }
                `;
                clonedDoc.head.appendChild(style);
            }
        });

        // XUẤT FILE
        const image = canvas.toDataURL("image/png", 1.0);
        const link = document.createElement('a');
        link.download = `Bao_cao_Premium_${new Date().getTime()}.png`;
        link.href = image;
        link.click();

    } catch (e) {
        console.error(e);
        alert("Lỗi xuất ảnh! Dữ liệu quá dài hãy dùng PDF.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}