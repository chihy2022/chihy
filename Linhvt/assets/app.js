// ================================================================
// 1. CẤU HÌNH & BIẾN TOÀN CỤC
// ================================================================
let reportData = []; 

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleBtn');
    const contentArea = document.getElementById('content-area');
    const menuItems = document.querySelectorAll('.menu-item');
    const headerTitle = document.getElementById('dynamic-header-title');
    const groupHeaders = document.querySelectorAll('.group-header');

    // --- A. SIDEBAR CONTROL & PERSISTENCE --- (Giữ nguyên logic của bạn)
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            sidebar.classList.toggle('collapsed');
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebar-state', isCollapsed ? 'mini' : 'full');
        });
    }

    if (localStorage.getItem('sidebar-state') === 'mini') {
        sidebar.classList.add('collapsed');
    }

    groupHeaders.forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('active');
            if (sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
                localStorage.setItem('sidebar-state', 'full');
            }
        });
    });

    // --- B. HÀM TẢI TRANG AJAX TỐI ƯU (Nạp HTML + CSS + JS từng shot) ---


// --- B. HÀM TẢI TRANG AJAX TỐI ƯU (CHỐNG GIẬT) ---
    async function loadPage(shotName, targetHash = null) {
        if (!contentArea) return;

        // 1. Tạm ẩn vùng nội dung để người dùng không thấy cảnh "vỡ trận" lúc đang load
        contentArea.style.opacity = '0';
        contentArea.style.transform = 'translateY(10px)'; // Thêm hiệu ứng trượt nhẹ
        contentArea.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

        try {
            const folderPath = `shots/${shotName}`;
            const htmlPath = `${folderPath}/${shotName}.html`;
            const cssPath  = `${folderPath}/${shotName}.css`;
            const jsPath   = `${folderPath}/${shotName}.js`;

            // 2. NẠP CSS TRƯỚC KHI NẠP HTML (Cực kỳ quan trọng)
            let shotLink = document.getElementById('shot-specific-style');
            if (shotLink) shotLink.remove();
            
            shotLink = document.createElement('link');
            shotLink.id = 'shot-specific-style';
            shotLink.rel = 'stylesheet';
            shotLink.href = cssPath;
            document.head.appendChild(shotLink);

            // 3. Tải HTML
            const response = await fetch(htmlPath);
            if (!response.ok) throw new Error(`Không tìm thấy file: ${htmlPath}`);
            const html = await response.text();

            // 4. Xử lý qua DOMParser
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // 5. Đợi CSS "ngấm" (khoảng 150ms) rồi mới hiện nội dung
            setTimeout(() => {
                contentArea.innerHTML = doc.body.innerHTML;
                
                // Hiện nội dung mượt mà
                contentArea.style.opacity = '1';
                contentArea.style.transform = 'translateY(0)';

                // Nạp JS riêng
                let shotScript = document.getElementById('shot-specific-script');
                if (shotScript) shotScript.remove();
                shotScript = document.createElement('script');
                shotScript.id = 'shot-specific-script';
                shotScript.src = jsPath;
                document.body.appendChild(shotScript);

                // Các logic phụ (Tabs, ScrollSpy...)
                document.querySelectorAll('.header-nav-container').forEach(nav => nav.style.display = 'none');
                const currentNav = document.getElementById(`${shotName}-nav-group`);
                if (currentNav) {
                    currentNav.style.display = 'flex';
                    if (typeof initScrollSpy === 'function') initScrollSpy(); 
                }

                // Logic Shot 1
                if (shotName === 'shot1' && typeof initProgressReport === 'function') {
                    initProgressReport();
                }

                // Xử lý Smart Scroll
                if (targetHash) {
                    const targetEl = document.querySelector(targetHash);
                    if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
                } else {
                    contentArea.scrollTo(0, 0);
                }
            }, 150); 

        } catch (err) {
            contentArea.style.opacity = '1';
            contentArea.innerHTML = `<div class="p-4 text-danger">Lỗi: ${err.message}</div>`;
        }
    }

    // --- C. XỬ LÝ CLICK SIDEBAR MENU --- (Giữ nguyên)
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const shot = item.getAttribute('data-shot');
            if (shot) {
                menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                const menuName = item.querySelector('span')?.textContent || "";
                if (headerTitle) headerTitle.textContent = menuName;

                localStorage.setItem('currentShot', shot);
                localStorage.setItem('currentTitle', menuName);
                loadPage(shot);
            }
        });
    });

   // --- D. ỦY THÁC SỰ KIỆN TOÀN APP (CLICK) ---
    // ======================================================
// GLOBAL CLICK EVENT
// ======================================================
document.addEventListener('click', (e) => {

    /* ==================================================
       IMAGE PREVIEW (ƯU TIÊN TRƯỚC)
    ================================================== */

    if (
        e.target.id === "myImg" ||
        e.target.classList.contains("img-in-card")
    ) {

        const modal = document.getElementById("imageModal");

        if (modal) {

            modal.style.display = "flex";

            const img = document.getElementById("imgFull");

            if (img) {
                img.src = e.target.src;
            }

        }

        return;
    }

    /* ==================================================
       CLOSE IMAGE
    ================================================== */

    if (
        e.target.classList.contains("close") ||
        e.target.id === "imageModal"
    ) {

        const modal = document.getElementById("imageModal");

        if (modal) {

            modal.style.display = "none";

        }

        return;
    }

    /* ==================================================
   ACCORDION LOGIC (Cập nhật: Cuộn mượt khi mở)
   ================================================== */
    const card = e.target.closest(".remark-card, .timeline-card");

    if (card) {
        const item = card.closest(".remark-item, .timeline-item");

        if (item) {
            // Xác định loại item để đóng các cái cùng loại
            const isTimeline = item.classList.contains("timeline-item");
            const selector = isTimeline ? ".timeline-item" : ".remark-item";

            // 1. Đóng tất cả các card khác cùng cấp
            document.querySelectorAll(selector).forEach(el => {
                if (el !== item) el.classList.remove("active");
            });

            // 2. Bật/Tắt trạng thái active của card hiện tại
            const wasActive = item.classList.contains("active");
            item.classList.toggle("active");

            // 3. NẾU MỞ: Tự động cuộn nhẹ để card nằm gọn trong khung hình
            if (!wasActive) {
                setTimeout(() => {
                    item.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest" // Cuộn vừa đủ, không nhảy phắt lên đỉnh
                    });
                }, 300); // Đợi 300ms để hiệu ứng CSS "nở" ra một chút rồi mới cuộn
            }
        }
        return;
    }

    /* ==================================================
       HEADER NAV
    ================================================== */

    const navLink = e.target.closest(".nav-btn");

    if (navLink) {

        e.preventDefault();

        const hash = navLink.getAttribute("href");

        const target = document.querySelector(hash);

        if (target) {

            target.scrollIntoView({

                behavior: "smooth"

            });

            navLink.parentElement
                .querySelectorAll(".nav-btn")
                .forEach(btn => btn.classList.remove("active"));

            navLink.classList.add("active");

        }

        return;

    }

    /* ==================================================
       EXPORT PDF
    ================================================== */

    const exportBtn = e.target.closest("#exportPdfBtn");

    if (exportBtn) {

        handleExportPdf(exportBtn);

        return;

    }

});
    // --- E. HÀM THEO DÕI CUỘN TRANG (SCROLL SPY) --- (Giữ nguyên)
    function initScrollSpy() {
        const sections = document.querySelectorAll('.content-section');
        const navButtons = document.querySelectorAll('.nav-btn');
        if (sections.length === 0) return;

        const options = { root: contentArea, rootMargin: '-10% 0px -80% 0px', threshold: 0 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navButtons.forEach(btn => {
                        btn.classList.remove('active');
                        if (btn.getAttribute('href') === `#${id}`) btn.classList.add('active');
                    });
                }
            });
        }, options);
        sections.forEach(section => observer.observe(section));
    }

    // --- F. KHỞI TẠO KHI MỞ WEB ---
    const savedShot = localStorage.getItem('currentShot') || 'shot1';
    const savedTitle = localStorage.getItem('currentTitle') || 'BÁO CÁO TIẾN ĐỘ';
    if (headerTitle) headerTitle.textContent = savedTitle;
    
    menuItems.forEach(i => {
        if(i.getAttribute('data-shot') === savedShot) i.classList.add('active');
        else i.classList.remove('active');
    });

    loadPage(savedShot);
});

// ================================================================
// --- G. HÀM XUẤT PDF TOÀN BỘ NỘI DUNG (KHÔNG BỊ CẮT) ---
// ================================================================

async function handleExportPdf(btn) {
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        alert("Thư viện PDF đang tải, vui lòng thử lại sau 1 giây!");
        return;
    }

    var source = document.getElementById('content-area');
    if (!source) return;

    // Hiệu ứng nút bấm
    var originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải trang...';

    try {
        // BƯỚC 1: TẠO BẢN SAO ẨN ĐỂ XỬ LÝ (TRÁNH LỆCH LAYOUT CHÍNH)
        var clone = source.cloneNode(true);
        
        // Thiết lập phong cách cho bản sao: Phẳng hoàn toàn, không có thanh cuộn
        Object.assign(clone.style, {
            position: 'absolute',
            top: '-9999px', // Đẩy ra khỏi màn hình người dùng
            left: '0',
            width: source.offsetWidth + 'px', // Giữ đúng chiều rộng hiện tại
            height: 'auto',
            maxHeight: 'none',
            overflow: 'visible',
            backgroundColor: '#ffffff',
            opacity: '1'
        });
        document.body.appendChild(clone);

        // Đợi 500ms để hình ảnh nội bộ load đầy đủ vào bản sao
        await new Promise(resolve => setTimeout(resolve, 500));

        // BƯỚC 2: TIẾN HÀNH CHỤP BẢN SAO VỚI SCALE CAO
        var canvas = await html2canvas(clone, {
            scale: 2,           // Tăng độ nét gấp đôi
            useCORS: true,      // Hỗ trợ ảnh từ Google Drive
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            // Chụp chính xác kích thước thực tế của bản sao
            width: clone.offsetWidth,
            height: clone.scrollHeight
        });

        // Xóa bản sao sau khi chụp xong để sạch bộ nhớ
        document.body.removeChild(clone);

        // BƯỚC 3: TẠO FILE PDF VỚI KÍCH THƯỚC KHỚP 100% VỚI CANVAS
        var imgData = canvas.toDataURL('image/png', 1.0);
        var { jsPDF } = window.jspdf;

        // Tính toán kích thước ảnh thực tế (đã chia cho scale 2)
        var pdfWidth = canvas.width / 2;
        var pdfHeight = canvas.height / 2;

        var pdf = new jsPDF({
            orientation: pdfWidth > pdfHeight ? 'l' : 'p',
            unit: 'px',
            format: [pdfWidth, pdfHeight] // Tạo trang PDF vừa khít ảnh
        });

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        pdf.save(`Linhvt_Unime-dms-${new Date().getTime()}.pdf`);

    } catch (error) {
        console.error("Lỗi PDF:", error);
        alert("Có lỗi xảy ra khi tạo PDF! Vui lòng thử lại.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}