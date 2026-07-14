// ================================================================
// DYNAMIC DASHBOARD ENGINE - UNIME SYSTEM
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleBtn');
    const contentArea = document.getElementById('content-area');
    const headerTitle = document.getElementById('dynamic-header-title');

    // --- A. SIDEBAR PERSISTENCE & CONTROL ---
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebar-state', sidebar.classList.contains('collapsed') ? 'mini' : 'full');
        });
    }

    if (localStorage.getItem('sidebar-state') === 'mini') {
        sidebar.classList.add('collapsed');
    }

    // Xử lý mở/đóng Menu Groups
    document.querySelectorAll('.group-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('active');
        });
    });

    // --- B. HÀM TẢI SHOT ĐỘNG (Dynamic Loader) ---
    window.loadPage = async function(shotName) {
        if (!contentArea) return;

        // Hiệu ứng mượt mà khi đổi shot
        contentArea.style.opacity = '0';
        contentArea.style.transform = 'translateY(8px)';
        contentArea.style.transition = 'all 0.3s ease';

        try {
            const folderPath = `shots/${shotName}`;
            const htmlPath = `${folderPath}/${shotName}.html`;
            const cssPath  = `${folderPath}/${shotName}.css`;
            const jsPath   = `${folderPath}/${shotName}.js`;

            // 1. Thay đổi CSS riêng của Shot
            let shotLink = document.getElementById('shot-specific-style');
            if (shotLink) shotLink.remove();
            shotLink = document.createElement('link');
            shotLink.id = 'shot-specific-style';
            shotLink.rel = 'stylesheet';
            shotLink.href = cssPath;
            document.head.appendChild(shotLink);

            // 2. Tải HTML qua AJAX
            const response = await fetch(htmlPath);
            if (!response.ok) throw new Error(`Không tìm thấy file: ${htmlPath}`);
            const html = await response.text();

            // 3. Đợi tí cho mượt rồi nạp vào DOM
            setTimeout(() => {
                contentArea.innerHTML = html;
                contentArea.style.opacity = '1';
                contentArea.style.transform = 'translateY(0)';

                // 4. Nạp JS riêng của Shot
                let shotScript = document.getElementById('shot-specific-script');
                if (shotScript) shotScript.remove();
                shotScript = document.createElement('script');
                shotScript.id = 'shot-specific-script';
                shotScript.src = jsPath;
                document.body.appendChild(shotScript);

                // 5. Cập nhật UI Header & Menu Active
                const activeItem = document.querySelector(`[data-shot="${shotName}"]`);
                if (activeItem && headerTitle) {
                    headerTitle.textContent = activeItem.innerText.trim();
                }
                
                // Lưu trạng thái trang hiện tại
                localStorage.setItem('currentShot', shotName);
            }, 150);

        } catch (err) {
            contentArea.style.opacity = '1';
            contentArea.innerHTML = `<div class="p-4 text-danger">⚠️ Lỗi nạp nội dung: ${err.message}</div>`;
        }
    };

    // --- C. XỬ LÝ CLICK SIDEBAR MENU ---
    document.querySelectorAll('.menu-item[data-shot]').forEach(item => {
        item.addEventListener('click', () => {
            const shot = item.getAttribute('data-shot');
            if (shot) {
                document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                window.loadPage(shot);
            }
        });
    });

    // --- D. GLOBAL EVENT DELEGATION (IMAGE & PDF & ACCORDION) ---
    document.addEventListener('click', (e) => {
        
        // 1. Phóng to ảnh (Modal)
        if (e.target.id === "myImg" || e.target.classList.contains("img-in-card")) {
            const modal = document.getElementById("imageModal");
            if (modal) {
                modal.style.display = "flex";
                document.getElementById("imgFull").src = e.target.src;
            }
            return;
        }

        // 2. Đóng Modal ảnh
        if (e.target.classList.contains("close") || e.target.id === "imageModal") {
            document.getElementById("imageModal").style.display = "none";
            return;
        }

        // 3. Nút Xuất PDF (Header)
        const exportBtn = e.target.closest("#exportPdfBtn");
        if (exportBtn) {
            handleExportPdf(exportBtn);
            return;
        }

        // 4. Logic Accordion (Báo cáo tiến độ)
        const accordionToggle = e.target.closest(".remark-card, .timeline-card");
        if (accordionToggle) {
            const parentItem = accordionToggle.closest(".remark-item, .timeline-item");
            if (parentItem) parentItem.classList.toggle("active");
        }
    });
});

// ================================================================
// --- G. HÀM XUẤT PDF TOÀN BỘ NỘI DUNG (KHÔNG BỊ CẮT) ---
// ================================================================

async function handleExportPdf(btn) {
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        alert("Thư viện PDF đang tải, vui lòng thử lại sau 1 giây!");
        return;
    }

    const source = document.getElementById('content-area');
    if (!source) return;

    // Hiệu ứng nút bấm
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải trang...';

    try {
        // BƯỚC 1: TẠO BẢN SAO ẨN ĐỂ XỬ LÝ (TRÁNH LỆCH LAYOUT CHÍNH)
        const clone = source.cloneNode(true);
        
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
        const canvas = await html2canvas(clone, {
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
        const imgData = canvas.toDataURL('image/png', 1.0);
        const { jsPDF } = window.jspdf;

        // Tính toán kích thước ảnh thực tế (đã chia cho scale 2)
        const pdfWidth = canvas.width / 2;
        const pdfHeight = canvas.height / 2;

        const pdf = new jsPDF({
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