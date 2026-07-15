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

async function handleExportPdf(btn) {
    const source = document.getElementById('content-area');
    if (!source || typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') return;

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Đang trích xuất...';

    // 1. TẠO SANDBOX ĐỂ CHỤP
    const sandbox = document.createElement('div');
    Object.assign(sandbox.style, {
        position: 'absolute',
        left: '-9999px',
        top: '0',
        width: source.clientWidth + 'px', 
        background: 'white',
        padding: '0' // Không thêm padding để tránh lệch lề
    });

    const clone = source.cloneNode(true);
    sandbox.appendChild(clone);
    document.body.appendChild(sandbox);

    try {
        // 2. GIỮ NGUYÊN SETUP CỦA BẠN - CHỈ FIX NHỮNG THỨ LÀM HỎNG PDF
        const originalTable = source.querySelector('.modern-table');
        const clonedTable = clone.querySelector('.modern-table');

        if (originalTable && clonedTable) {
            // Ép chiều rộng bảng clone bằng đúng bảng thật để không rớt chữ
            clonedTable.style.width = originalTable.offsetWidth + 'px';
            clonedTable.style.tableLayout = 'fixed';

            const originalRows = originalTable.rows;
            const clonedRows = clonedTable.rows;

            for (let r = 0; r < originalRows.length; r++) {
                for (let c = 0; c < originalRows[r].cells.length; c++) {
                    const origCell = originalRows[r].cells[c];
                    const clonedCell = clonedRows[r].cells[c];
                    if (!clonedCell) continue;

                    // LẤY STYLE THỰC TẾ TRÌNH DUYỆT ĐANG HIỂN THỊ (bao gồm màu từ getRowStyleShot1)
                    const computedStyle = window.getComputedStyle(origCell);
                    
                    clonedCell.style.width = origCell.offsetWidth + 'px';
                    clonedCell.style.backgroundColor = computedStyle.backgroundColor;
                    clonedCell.style.color = computedStyle.color;
                    clonedCell.style.textAlign = computedStyle.textAlign; // GIỮ NGUYÊN CANH LỀ CỦA BẠN
                    clonedCell.style.padding = computedStyle.padding;
                    clonedCell.style.fontWeight = computedStyle.fontWeight;
                    clonedCell.style.verticalAlign = 'middle'; // Chỉ ép cái này để PDF đẹp
                    
                    // Chỉ dùng nowrap cho cột A/U để tránh rớt chữ "r" do sai số font
                    if (c === 1) {
                        clonedCell.style.whiteSpace = 'nowrap';
                        clonedCell.style.width = (origCell.offsetWidth + 1) + 'px'; // Thêm 1px dự phòng
                    }
                }
            }
        }

        // 3. DỌN UI RÁC (Nút và thùng rác)
        clone.querySelectorAll('button, .actions, .sidebar-toggle, .btn-trash, .fa-trash-can').forEach(el => el.remove());
        
        // Loại bỏ min-height 100vh để hết lỗi canh dưới
        clone.style.minHeight = '0';
        clone.style.height = 'auto';

        await new Promise(r => setTimeout(r, 300));

        // 4. CHỤP ẢNH
        const canvas = await html2canvas(sandbox, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff"
        });

        // 5. XUẤT PDF VỪA KHÍT (KHÔNG DƯ TRẮNG)
        const imgData = canvas.toDataURL('image/png', 1.0);
        const imgW = canvas.width / 2;
        const imgH = canvas.height / 2;

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: imgW > imgH ? 'l' : 'p',
            unit: 'px',
            format: [imgW, imgH] // PDF dài đúng bằng nội dung của bạn
        });

        pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
        pdf.save(`Unime_Report_${new Date().getTime()}.pdf`);

    } catch (e) {
        console.error(e);
    } finally {
        sandbox.remove();
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}