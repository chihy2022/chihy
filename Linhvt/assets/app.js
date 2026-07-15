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
        this.actionSlot = document.getElementById('shot-actions-slot');
        this.headerTitle = document.getElementById('dynamic-header-title');
        this.sidebar = document.getElementById('sidebar');
        this.loginOverlay = document.getElementById('login-overlay');
        this.appContainer = document.querySelector('.app-container');
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
        this.restoreSidebarState();
    }

    setupEventListeners() {
        document.getElementById('toggleBtn').addEventListener('click', () => this.toggleSidebar());
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

    async performLogin(forcedUid = null) {
        const uidInput = document.getElementById('login-uid');
        const btn = document.getElementById('btnLogin');
        const uid = forcedUid || uidInput.value.trim().toUpperCase();

        if (!uid) return;
        btn.disabled = true; btn.innerText = "ĐANG KIỂM TRA...";
        
        try {
            const res = await fetch(`${CONFIG.GGS_URL}?action=getRole&uid=${uid}`);
            const user = await res.json();
            if (user && user.rights) {
                localStorage.setItem(CONFIG.STORAGE_KEY, uid);
                this.applyPermissions(user);
                this.loginOverlay.classList.add('hidden');
                this.appContainer.classList.remove('hidden');
                this.loadPage(localStorage.getItem('currentShot') || 'shot1');
            } else { 
                document.getElementById('login-msg').innerText = "Sai User CODE!"; 
            }
        } catch(e) {
            document.getElementById('login-msg').innerText = "Lỗi kết nối!";
        } finally { btn.disabled = false; btn.innerText = "ĐĂNG NHẬP"; }
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
    async loadPage(shotName) {
        if (!shotName) return;

        // Đảm bảo các phần tử tồn tại trước khi chạy
        const content = document.getElementById('content-area');
        const actionSlot = document.getElementById('shot-actions-slot');
        
        if (!content || !actionSlot) {
            console.error("Không tìm thấy content-area hoặc shot-actions-slot");
            return;
        }

        content.style.opacity = '0';
        actionSlot.innerHTML = ''; 

        try {
            const path = `shots/${shotName}/${shotName}`;
            
            // Gọi hàm dọn dẹp (đã khai báo bên dưới)
            this.cleanupShotAssets();

            // 1. Tải HTML (thêm timestamp để tránh cache)
            const res = await fetch(`${path}.html?t=${Date.now()}`);
            if (!res.ok) throw new Error("File HTML không tồn tại");
            const htmlText = await res.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const shotActions = doc.querySelector('.shot-actions');
            const shotBody = doc.querySelector('.shot-body');

            if (shotActions) actionSlot.innerHTML = shotActions.innerHTML;
            content.innerHTML = shotBody ? shotBody.innerHTML : htmlText;

            // 2. Nạp CSS
            const link = document.createElement('link');
            link.id = 'shot-css';
            link.rel = 'stylesheet';
            link.href = `${path}.css?t=${Date.now()}`;
            document.head.appendChild(link);

            // 3. Nạp JS
            const script = document.createElement('script');
            script.id = 'shot-js';
            script.src = `${path}.js?t=${Date.now()}`;
            
            script.onload = () => {
                // Sau khi file JS nạp xong, tìm hàm Init của Shot đó để chạy
                const initFuncName = `${shotName}Init`;
                if (typeof window[initFuncName] === 'function') {
                    window[initFuncName]();
                }
            };

            document.body.appendChild(script);

            localStorage.setItem('currentShot', shotName);
            
            // Hiện nội dung mượt mà
            setTimeout(() => content.style.opacity = '1', 150);

        } catch (err) { 
            console.error("Lỗi LoadPage:", err);
            content.innerHTML = `<div class="p-5 text-center text-muted">Dữ liệu đang được cập nhật cho ${shotName}...</div>`;
            content.style.opacity = '1';
        }
    }

    // ĐẢM BẢO BẠN CÓ HÀM NÀY TRONG CLASS UNIMEAPP
    cleanupShotAssets() {
        const oldCss = document.getElementById('shot-css');
        if (oldCss) oldCss.remove();
        const oldJs = document.getElementById('shot-js');
        if (oldJs) oldJs.remove();
    }

    cleanupShotAssets() { ['shot-css', 'shot-js'].forEach(id => document.getElementById(id)?.remove()); }

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
        localStorage.setItem(CONFIG.SIDEBAR_KEY, this.sidebar.classList.contains('collapsed') ? 'mini' : 'full');
    }

    restoreSidebarState() { if (localStorage.getItem(CONFIG.SIDEBAR_KEY) === 'mini') this.sidebar.classList.add('collapsed'); }

    togglePassword() {
        const input = document.getElementById('login-uid');
        input.type = input.type === 'password' ? 'text' : 'password';
        document.getElementById('togglePassword').classList.toggle('fa-eye');
    }

    handleGlobalClicks(e) {
        // ZOOM ẢNH
        if (e.target.tagName === 'IMG' && (e.target.id === 'myImg' || e.target.classList.contains('img-previewable'))) {
            const modal = document.getElementById('imageModal');
            document.getElementById('imgFull').src = e.target.src;
            modal.classList.add('active');
        }
        if (e.target.classList.contains('close-modal') || e.target.id === 'imageModal') {
            document.getElementById('imageModal').classList.remove('active');
        }
    }

    logout() { if (confirm("Đăng xuất?")) { localStorage.clear(); location.reload(); } }
    checkAuth() { const uid = localStorage.getItem(CONFIG.STORAGE_KEY); if (uid) this.performLogin(uid); }
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