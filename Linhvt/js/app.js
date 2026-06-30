document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeBtn');
    const openBtn = document.getElementById('openBtn');
    const contentArea = document.getElementById('content-area');
    const menuItems = document.querySelectorAll('.menu-item');

    // 1. ĐÓNG/MỞ SIDEBAR
    if (closeBtn) {
        closeBtn.onclick = () => sidebar.classList.add('hidden');
    }
    if (openBtn) {
        openBtn.onclick = () => sidebar.classList.remove('hidden');
    }

    // 2. HÀM LOAD TRANG CHI TIẾT
    async function loadPage(shotName) {
        if (!contentArea) return;
        contentArea.style.opacity = '0'; 
        try {
            const response = await fetch(`detail/${shotName}.html`);
            if (response.ok) {
                const html = await response.text();
                setTimeout(() => {
                    contentArea.innerHTML = html;
                    contentArea.style.opacity = '1';
                }, 200);
            }
        } catch (e) {
            contentArea.innerHTML = "<h2>Lỗi tải nội dung. Vui lòng thử lại.</h2>";
        }
    }

    // 3. XỬ LÝ CLICK MENU
    menuItems.forEach(item => {
        item.onclick = function() {
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            const shot = this.getAttribute('data-shot');
            loadPage(shot);
        };
    });

    // Load mặc định trang shot1
    loadPage('shot1');
});
// 4. XỬ LÝ POPUP ẢNH (Ủy thác sự kiện - Cực kỳ quan trọng)
document.addEventListener('click', function (e) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("imgFull");
    const captionText = document.getElementById("caption");

    if (!modal) return;

    // A. MỞ MODAL: Khi click vào ảnh có ID là myImg
    if (e.target && e.target.id === 'myImg') {
        modal.style.display = "flex"; // Hiện dạng flex để căn giữa
        modalImg.src = e.target.src;
        captionText.innerHTML = e.target.alt;
    }

    // B. ĐÓNG MODAL: Khi click vào nút X HOẶC click vào vùng đen (nền modal)
    if (e.target.classList.contains('close') || e.target.id === 'imageModal') {
        modal.style.display = "none";
    }
});

document.addEventListener('click', function (e) {
    // Xử lý click mở rộng Card
    const header = e.target.closest('.card-header');
    if (header) {
        const item = header.closest('.timeline-item');
        item.classList.toggle('active');
        
        // Xoay icon mũi tên
        const icon = header.querySelector('.toggle-btn i');
        if (icon) {
            icon.style.transform = item.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    }

    // (Giữ nguyên code Popup ảnh cũ ở đây...)
});

document.addEventListener('click', function (e) {
    // Xử lý đóng mở Remark Card
    const card = e.target.closest('.remark-card');
    if (card) {
        const item = card.closest('.remark-item');
        item.classList.toggle('active');
    }

    // Xử lý zoom ảnh (như các bước trước đã làm)
    if (e.target && e.target.id === 'myImg') {
        const modal = document.getElementById("imageModal");
        const modalImg = document.getElementById("imgFull");
        if (modal) {
            modal.style.display = "flex";
            modalImg.src = e.target.src;
        }
    }
});
/*export nhiều page pdf
document.addEventListener('click', function (e) {
    const exportBtn = e.target.closest('#exportPdfBtn');
    if (exportBtn) {
        const element = document.getElementById('content-area');
        if (!element) {
            console.error("Không tìm thấy phần tử #content-area");
            return;
        }

        exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
        exportBtn.disabled = true;

        const opt = {
            margin: [10, 10, 10, 10], // Lề [trên, trái, dưới, phải] tính bằng mm
            filename: 'Unime-System-Report.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,           // Tăng độ sắc nét
                useCORS: true,      // Cho phép lấy ảnh từ server khác nếu có
                logging: false,     // Tắt log để tăng tốc
                letterRendering: true,
                allowTaint: false
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'landscape', // Khổ ngang
                compress: true 
            }
        };

        // Chạy tiến trình xuất PDF
        html2pdf().set(opt).from(element).toContainer().toCanvas().toImg().toPdf().save().then(() => {
            exportBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Xuất PDF';
            exportBtn.disabled = false;
        }).catch(err => {
            console.error("Lỗi xuất PDF:", err);
            exportBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Lỗi khi xuất';
            exportBtn.disabled = false;
        });

        // Hàm onclone nằm trong cấu hình html2canvas của html2pdf
        opt.html2canvas.onclone = (clonedDoc) => {
            const clonedEl = clonedDoc.getElementById('content-area');
            
            // 1. Reset toàn bộ style của các thẻ cha để tránh bị ảnh hưởng bởi layout web (Flex/Grid/Padding)
            let parent = clonedEl.parentElement;
            while (parent) {
                parent.style.margin = "0";
                parent.style.padding = "0";
                parent.style.display = "block";
                parent.style.position = "static";
                parent = parent.parentElement;
            }

            // 2. Cố định chiều rộng cho vùng nội dung để khớp với tỷ lệ A4 Landscape (~1100px)
            // Việc này giúp ngăn chặn việc nội dung bị co lại hoặc tràn lề
            clonedEl.style.width = "1080px"; 
            clonedEl.style.margin = "0 auto";
            clonedEl.style.padding = "10px";
            clonedEl.style.background = "white";
            clonedEl.style.position = "relative";
            clonedEl.style.top = "0";
            clonedEl.style.left = "0";

            // 3. Xử lý các thành phần đặc biệt (Table RACI)
            const raci = clonedEl.querySelector('.raci-table');
            if (raci) {
                raci.style.width = "100%";
                raci.style.tableLayout = "fixed";
                
                // Thu nhỏ font chữ để bảng không bị đẩy rộng
                const cells = raci.querySelectorAll('th, td');
                cells.forEach(cell => {
                    cell.style.fontSize = "10px";
                    cell.style.padding = "4px";
                });
                
                // Thu nhỏ các Pill/Badge
                const pills = raci.querySelectorAll('.raci-pill');
                pills.forEach(p => {
                    p.style.fontSize = "9px";
                    p.style.padding = "2px 5px";
                    p.style.minWidth = "auto";
                });
            }

            // 4. Đảm bảo các ảnh (logo Unilever...) hiển thị đầy đủ
            const images = clonedEl.querySelectorAll('img');
            images.forEach(img => {
                img.style.maxWidth = "100%";
                img.style.height = "auto";
            });
        };
    }
});*/
document.addEventListener('click', function (e) {
    const exportBtn = e.target.closest('#exportPdfBtn');
    if (exportBtn) {
        // Kiểm tra xem thư viện đã load chưa
        if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
            alert("Đang tải thư viện, vui lòng thử lại sau 1 giây!");
            return;
        }

        const element = document.getElementById('content-area');
        exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
        exportBtn.disabled = true;

        // Chụp ảnh vùng nội dung
        html2canvas(element, {
            scale: 2, 
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            
            // Lấy kích thước thực tế theo Point (pt)
            const imgWidth = canvas.width / 2;
            const imgHeight = canvas.height / 2;

            // Khởi tạo jsPDF từ thư viện
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: imgWidth > imgHeight ? 'l' : 'p',
                unit: 'pt',
                format: [imgWidth, imgHeight] // Trang vừa khít ảnh, không phân trang
            });

            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
            pdf.save('Unime-Full-Report.pdf');

            exportBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Xuất PDF';
            exportBtn.disabled = false;
        }).catch(err => {
            console.error("Lỗi xuất PDF:", err);
            exportBtn.disabled = false;
            exportBtn.innerHTML = 'Lỗi xuất PDF';
        });
    }
});
document.addEventListener('DOMContentLoaded', function() {
    const headerTitle = document.getElementById('dynamic-header-title');
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');

    // 1. Hàm cập nhật chữ lên Header
    function updateHeader(element) {
        if (!element || !headerTitle) return;
        const text = element.querySelector('span').innerText;
        headerTitle.innerText = text;
    }

    // 2. Khi vừa load trang, lấy tên của mục đang 'active'
    const initialActive = document.querySelector('.menu-item.active');
    updateHeader(initialActive);

    // 3. Lắng nghe sự kiện click vào các mục menu Sidebar
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // Cập nhật tiêu đề ngay lập tức khi click
            updateHeader(this);
            
            // Xử lý đổi class active cho menu (nếu code cũ của bạn chưa có)
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
});