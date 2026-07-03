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
    async function loadPage(shotName, targetHash = null) {
        if (!contentArea) return;
        contentArea.style.opacity = '0.4';

        try {
            // 1. Định nghĩa đường dẫn theo cấu trúc mới: shots/shot1/shot1.html
            const folderPath = `shots/${shotName}`;
            const htmlPath = `${folderPath}/${shotName}.html`;
            const cssPath  = `${folderPath}/${shotName}.css`;
            const jsPath   = `${folderPath}/${shotName}.js`;

            // 2. Nạp nội dung HTML
            const response = await fetch(htmlPath);
            if (!response.ok) throw new Error(`Không tìm thấy file: ${htmlPath}`);
            const html = await response.text();

            // Chèn HTML vào vùng chứa
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            contentArea.innerHTML = doc.body.innerHTML;
            contentArea.style.opacity = '1';

            // 3. TỰ ĐỘNG NẠP CSS RIÊNG CỦA SHOT (Xóa cái cũ, thêm cái mới)
            let shotLink = document.getElementById('shot-specific-style');
            if (shotLink) shotLink.remove();
            
            shotLink = document.createElement('link');
            shotLink.id = 'shot-specific-style';
            shotLink.rel = 'stylesheet';
            shotLink.href = cssPath;
            document.head.appendChild(shotLink);

            // 4. TỰ ĐỘNG NẠP JS RIÊNG CỦA SHOT
            let shotScript = document.getElementById('shot-specific-script');
            if (shotScript) shotScript.remove();

            shotScript = document.createElement('script');
            shotScript.id = 'shot-specific-script';
            shotScript.src = jsPath;
            document.body.appendChild(shotScript);

            // 5. Quản lý TABS trên Header (Giữ nguyên logic của bạn)
            document.querySelectorAll('.header-nav-container').forEach(nav => nav.style.display = 'none');
            const currentNav = document.getElementById(`${shotName}-nav-group`);
            if (currentNav) {
                currentNav.style.display = 'flex';
                initScrollSpy(); 
            }

            // 6. Xử lý logic đặc biệt cho Shot 1 (Nếu bạn chưa chuyển code Google Sheet vào shot1.js)
            if (shotName === 'shot1' && typeof initProgressReport === 'function') {
                initProgressReport();
            }

            // 7. Xử lý Smart Scroll (Giữ nguyên)
            if (targetHash) {
                setTimeout(() => {
                    const targetEl = document.querySelector(targetHash);
                    if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
                }, 500);
            } else {
                contentArea.scrollTo(0, 0);
            }

        } catch (err) {
            contentArea.style.opacity = '1';
            contentArea.innerHTML = `<div class="p-4 text-danger">Lỗi nạp trang: ${err.message}</div>`;
            console.error(err);
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
// --- G. HÀM XUẤT PDF CHẤT LƯỢNG CAO (HỖ TRỢ TRANG DÀI)
// ================================================================
async function handleExportPdf(btn) {
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        alert("Đang tải thư viện PDF, vui lòng đợi trong giây lát...");
        return;
    }

    const element = document.getElementById('content-area');
    if (!element) return;

    // Hiệu ứng nút bấm khi đang xử lý
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo PDF...';

    try {
        // Tạm thời đưa scroll về đầu để chụp đủ nội dung
        const currentScroll = window.scrollY;
        window.scrollTo(0, 0);

        // Chụp màn hình vùng báo cáo với độ phân giải cao (scale: 2)
        const canvas = await html2canvas(element, {
            scale: 2,           // Tăng độ nét gấp 2 lần
            useCORS: true,      // Hỗ trợ load ảnh từ server khác
            backgroundColor: "#ffffff", // Ép nền trắng
            logging: false,
            height: element.scrollHeight, // Chụp toàn bộ chiều cao thực tế
            windowHeight: element.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const { jsPDF } = window.jspdf;

        // Tính toán kích thước để PDF dài theo nội dung (Long PDF)
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // Tạo file PDF với kích thước tùy chỉnh vừa khít với Canvas
        const pdf = new jsPDF({
            orientation: imgWidth > imgHeight ? 'l' : 'p',
            unit: 'px',
            format: [imgWidth, imgHeight] // Đây là chỗ giúp PDF "dài vô tận" theo báo cáo
        });

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Đặt tên file có kèm ngày tháng
        const date = new Date().toISOString().slice(0,10);
        pdf.save(`Umer-dms-${date}.pdf`);

        // Trả lại vị trí cuộn cũ
        window.scrollTo(0, currentScroll);

    } catch (error) {
        console.error("Lỗi PDF:", error);
        alert("Có lỗi xảy ra khi xuất PDF!");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}