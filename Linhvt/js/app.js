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