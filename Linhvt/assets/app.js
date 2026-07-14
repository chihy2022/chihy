/**
 * UNIME SYSTEM - CORE JAVASCRIPT
 * Tối ưu hóa: Dọn dẹp script, Quản lý trạng thái, Phân quyền
 */

const CONFIG = {
    GGS_URL: "https://script.google.com/macros/s/AKfycbz36knkDmqMdVHCXoFhvQb4l6Ej2e9dsj0rLj7dD2km7XXshj2IaNy2o9-sCuHigvhN2w/exec",
    STORAGE_KEY: "Unime_UID",
    SIDEBAR_KEY: "sidebar-state"
};

document.addEventListener('DOMContentLoaded', () => {
    const app = new UnimeApp();
    app.init();
});

class UnimeApp {
    constructor() {
        this.contentArea = document.getElementById('content-area');
        this.headerTitle = document.getElementById('dynamic-header-title');
        this.sidebar = document.getElementById('sidebar');
        this.loginOverlay = document.getElementById('login-overlay');
        this.appContainer = document.querySelector('.app-container');
        this.userPermissions = null;
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
        this.restoreSidebarState();
    }

    setupEventListeners() {
        // Toggle Sidebar
        document.getElementById('toggleBtn').addEventListener('click', () => this.toggleSidebar());

        // Login Actions
        document.getElementById('btnLogin').addEventListener('click', () => this.performLogin());
        document.getElementById('login-uid').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performLogin();
        });
        document.getElementById('togglePassword').addEventListener('click', () => this.togglePassword());

        // Sidebar Menu Clicks
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => this.handleMenuClick(item));
        });

        // Group Headers
        document.querySelectorAll('.group-header').forEach(header => {
            header.addEventListener('click', () => header.parentElement.classList.toggle('active'));
        });

        // Global Image Click (Delegation)
        document.addEventListener('click', (e) => this.handleGlobalClicks(e));

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Export PDF
        document.getElementById('exportPdfBtn').addEventListener('click', (e) => handleExportPdf(e.currentTarget));
    }

    // --- AUTHENTICATION ---
    async checkAuth() {
        const savedUID = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (savedUID) {
            document.getElementById('login-uid').value = savedUID;
            // Tự động login nếu đã có UID trong máy
            await this.performLogin(savedUID);
        }
    }

    async performLogin(forcedUid = null) {
        const uidInput = document.getElementById('login-uid');
        const btn = document.getElementById('btnLogin');
        const msg = document.getElementById('login-msg');
        const uid = forcedUid || uidInput.value.trim().toUpperCase();

        if (!uid) return;

        btn.disabled = true;
        btn.innerText = "ĐANG KIỂM TRA...";
        msg.innerText = "";

        try {
            const response = await fetch(`${CONFIG.GGS_URL}?action=getRole&uid=${uid}`);
            const user = await response.json();

            if (user && user.rights) {
                localStorage.setItem(CONFIG.STORAGE_KEY, uid);
                this.userPermissions = user.rights;
                this.applyPermissions(user);
                this.loginOverlay.classList.add('hidden');
                this.appContainer.classList.remove('hidden');
                
                // Load shot mặc định hoặc shot đang xem dở
                const startShot = localStorage.getItem('currentShot') || 'shot1';
                this.loadPage(startShot);
            } else {
                msg.innerText = "Sai mã hoặc không có quyền truy cập!";
                localStorage.removeItem(CONFIG.STORAGE_KEY);
            }
        } catch (e) {
            msg.innerText = "Lỗi kết nối máy chủ!";
        } finally {
            btn.disabled = false;
            btn.innerText = "ĐĂNG NHẬP";
        }
    }

    applyPermissions(user) {
        document.getElementById('display-user-name').innerText = user.name;
        
        document.querySelectorAll('.menu-item[data-shot]').forEach(item => {
            const shot = item.getAttribute('data-shot');
            const perm = (this.userPermissions[shot] || "").toLowerCase();
            if (perm === "root" || perm === "view") {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    }

    // --- PAGE LOADER (OPTIMIZED) ---
    async loadPage(shotName) {
        if (!shotName || !this.contentArea) return;

        // Hiệu ứng mờ dần khi chuyển
        this.contentArea.style.opacity = '0.3';

        try {
            const path = `shots/${shotName}/${shotName}`;
            
            // 1. Dọn dẹp tài nguyên cũ của shot trước
            this.cleanupShotAssets();

            // 2. Tải CSS trước để không bị "nháy" giao diện
            const link = document.createElement('link');
            link.id = 'shot-css';
            link.rel = 'stylesheet';
            link.href = `${path}.css`;
            document.head.appendChild(link);

            // 3. Tải HTML
            const res = await fetch(`${path}.html`);
            if (!res.ok) throw new Error("Không thể tải nội dung trang");
            const html = await res.text();
            this.contentArea.innerHTML = html;

            // 4. Tải JS sau khi DOM đã có
            const script = document.createElement('script');
            script.id = 'shot-js';
            script.src = `${path}.js`;
            document.body.appendChild(script);

            // Cập nhật UI
            localStorage.setItem('currentShot', shotName);
            this.contentArea.style.opacity = '1';
            this.contentArea.scrollTo(0, 0);

        } catch (err) {
            this.contentArea.innerHTML = `<div class="p-5 text-danger">Lỗi tải trang: ${err.message}</div>`;
            this.contentArea.style.opacity = '1';
        }
    }

    cleanupShotAssets() {
        ['shot-css', 'shot-js'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    }

    // --- UTILS ---
    handleMenuClick(item) {
        const shot = item.getAttribute('data-shot');
        const title = item.getAttribute('data-title');
        
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.headerTitle.innerText = title;
        
        this.loadPage(shot);
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('collapsed');
        const isMini = this.sidebar.classList.contains('collapsed');
        localStorage.setItem(CONFIG.SIDEBAR_KEY, isMini ? 'mini' : 'full');
    }

    restoreSidebarState() {
        if (localStorage.getItem(CONFIG.SIDEBAR_KEY) === 'mini') {
            this.sidebar.classList.add('collapsed');
        }
    }

    togglePassword() {
        const input = document.getElementById('login-uid');
        const icon = document.getElementById('togglePassword');
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        icon.classList.toggle('fa-eye-slash', !isPass);
        icon.classList.toggle('fa-eye', isPass);
    }

    handleGlobalClicks(e) {
        // Modal ảnh
        if (e.target.classList.contains('img-previewable') || e.target.id === 'myImg') {
            const modal = document.getElementById('imageModal');
            document.getElementById('imgFull').src = e.target.src;
            modal.classList.add('active');
        }

        if (e.target.classList.contains('close-modal') || e.target.id === 'imageModal') {
            document.getElementById('imageModal').classList.remove('active');
        }

        // Accordion Card logic
        const cardHeader = e.target.closest('.card-header-toggle');
        if (cardHeader) {
            const item = cardHeader.closest('.collapsible-item');
            item.classList.toggle('active');
        }
    }

    logout() {
        if (confirm("Đăng xuất khỏi hệ thống?")) {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
            location.reload();
        }
    }
}

// --- PDF EXPORT FUNCTION (GLOBAL) ---
async function handleExportPdf(btn) {
    const source = document.getElementById('content-area');
    if (!source || typeof html2canvas === 'undefined') return;

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

    try {
        const canvas = await html2canvas(source, {
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: source.scrollWidth,
            windowHeight: source.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? 'l' : 'p',
            unit: 'px',
            format: [canvas.width / 2, canvas.height / 2]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
        pdf.save(`Unime_Export_${new Date().getTime()}.pdf`);
    } catch (err) {
        alert("Lỗi khi tạo PDF!");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}