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
        // Thêm dòng này để cập nhật nút PDF khi thay đổi kích thước màn hình/xoay iPad
        window.addEventListener('resize', () => {
        const currentShot = localStorage.getItem('currentShot') || 'welcome';
        this.updateUIState(currentShot);
    ``  });
    }

    // --- HÀM CẬP NHẬT TRẠNG THÁI HEADER & SIDEBAR (TỐI ƯU GIAO DIỆN) ---
    updateUIState(shotId) {
        // --- ĐOẠN SETUP ẨN/HIỆN NÚT PDF ---
        const exportBtn = document.getElementById('exportPdfBtn');
        const hiddenPdfShots = ['shot7', 'welcome','shot8']; // Danh sách shot KHÔNG HIỆN nút PDF
        
        if (exportBtn) {
        const isMobile = window.innerWidth <= 1024;
        const isHiddenShot = hiddenPdfShots.includes(shotId);

        // Nút PDF sẽ ẩn NẾU là mobile HOẶC thuộc danh sách shot bị cấm
        if (isMobile || isHiddenShot) {
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


// --- HÀM XUẤT PDF CHUẨN MIRROR (ĐÃ FIX RỚT CHỮ) ---
async function handleExportPdf(btn) {
    // Chọn vùng nội dung
    const source = document.querySelector('.main-content') || document.getElementById('content-area');
    if (!source) return;

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Đang xử lý...';

    try {
        // 1. CHỜ ĐỢI: Đảm bảo font và tất cả ảnh đã tải xong
        await document.fonts.ready;
        
        // 2. MẸO QUAN TRỌNG: Ép toàn bộ các thẻ cha phải hiển thị hết nội dung (không cho phép cắt)
        const originalStyles = [];
        let current = source;
        while (current && current !== document.body) {
            originalStyles.push({ el: current, overflow: current.style.overflow, height: current.style.height });
            current.style.overflow = 'visible';
            current.style.height = 'auto';
            current = current.parentElement;
        }

        // Đo chính xác kích thước thực tế sau khi đã ép hiển thị
        const rect = source.getBoundingClientRect();
        const fullW = source.scrollWidth || rect.width;
        const fullH = source.scrollHeight || rect.height;

        // 3. CHỤP ẢNH VỚI NHỮNG CÀI ĐẶT ÉP KHUNG HÌNH
        const canvas = await html2canvas(source, {
            scale: 2,               // Độ nét tốt nhất cho in ấn và xem
            useCORS: true,          // Cho phép lấy ảnh từ server khác (nếu có)
            logging: false,
            backgroundColor: "#ffffff",
            width: fullW,
            height: fullH,
            windowWidth: fullW,
            windowHeight: fullH,    // Ép trình duyệt ảo mở rộng đúng chiều cao thật
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,             // Luôn bắt đầu chụp từ đỉnh nội dung
            onclone: (clonedDoc) => {
                // Xử lý trong bản clone để không ảnh hưởng giao diện thật
                const clonedSource = clonedDoc.querySelector('.main-content') || clonedDoc.getElementById('content-area');
                if (clonedSource) {
                    clonedSource.style.overflow = 'visible';
                    clonedSource.style.height = 'auto';
                    clonedSource.style.maxHeight = 'none';
                }
                // Ẩn các nút bấm và thanh cuộn
                const style = clonedDoc.createElement('style');
                style.innerHTML = `
                    * { animation: none !important; transition: none !important; box-shadow: none !important; }
                    header, .sidebar, .no-export, .btn, button, .actions { display: none !important; }
                    body { overflow: visible !important; height: auto !important; }
                `;
                clonedDoc.head.appendChild(style);
            }
        });

        // 4. KHÔI PHỤC LẠI STYLE GỐC (Để giao diện web không bị vỡ)
        originalStyles.forEach(item => {
            item.el.style.overflow = item.overflow;
            item.el.style.height = item.height;
        });

        // 5. XUẤT PDF MỘT TRANG DÀI
        const { jsPDF } = window.jspdf;
        // Nén JPEG 0.7 để file cực nhẹ nhưng vẫn đủ thông tin
        const imgData = canvas.toDataURL('image/jpeg', 0.7); 
        
        const pdfW = canvas.width / 2;
        const pdfH = canvas.height / 2;

        const pdf = new jsPDF({
            orientation: pdfW > pdfH ? 'l' : 'p',
            unit: 'px',
            format: [pdfW, pdfH], // Trang PDF sẽ dài đúng bằng nội dung bạn có
            compress: true
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
        
        // Tạo chuỗi thời gian định dạng YYYYMMDDHHMMSS
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0');

        pdf.save(`Umer_dms_${timestamp}.pdf`);

    } catch (e) {
        console.error("Lỗi:", e);
        alert("Không thể xuất toàn bộ nội dung!");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}