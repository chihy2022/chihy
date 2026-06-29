document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeBtn');
    const openBtn = document.getElementById('openBtn');
    const contentArea = document.getElementById('content-area');
    const menuItems = document.querySelectorAll('.menu-item');

    // 1. Logic đóng mở sidebar
    if (closeBtn) closeBtn.onclick = () => sidebar.classList.add('hidden');
    if (openBtn) openBtn.onclick = () => sidebar.classList.remove('hidden');

    // 2. Hàm Load nội dung động
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
            contentArea.innerHTML = "<h2>Lỗi tải trang</h2>";
        }
    }

    // 3. Xử lý click menu
    menuItems.forEach(item => {
        item.onclick = function() {
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            const shot = this.getAttribute('data-shot');
            loadPage(shot);
        };
    }); // <--- BẠN TỪNG THIẾU DẤU NÀY

    // Mặc định load trang đầu tiên
    loadPage('shot1');
});

// 4. XỬ LÝ POPUP ZOOM ẢNH (Ủy thác sự kiện - Luôn chạy kể cả khi nội dung thay đổi)

document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'myImg') {
        const modal = document.getElementById("imageModal");
        const modalImg = document.getElementById("imgFull");
        const captionText = document.getElementById("caption");

        if (modal && modalImg) {
            modal.style.display = "flex"; // Sửa 'block' thành 'flex' để căn giữa
            modalImg.src = e.target.src;
            captionText.innerHTML = e.target.alt; // Chữ lấy từ thuộc tính alt của ảnh
        }
    }

    // Đóng modal
    if (e.target && (e.target.classList.contains('close') || e.target.id === 'imageModal')) {
        const modal = document.getElementById("imageModal");
        if (modal) modal.style.display = "none";
    }
});