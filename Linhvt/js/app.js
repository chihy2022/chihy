document.addEventListener('DOMContentLoaded', () => {
    // --- 1. KHAI BÁO BIẾN DÙNG CHUNG ---
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeBtn');
    const openBtn = document.getElementById('openBtn');
    const contentArea = document.getElementById('content-area');
    const menuItems = document.querySelectorAll('.menu-item');
    const headerTitle = document.getElementById('dynamic-header-title');

    // --- 2. XỬ LÝ SIDEBAR (ĐÓNG/MỞ) ---
    closeBtn?.addEventListener('click', () => sidebar?.classList.add('hidden'));
    openBtn?.addEventListener('click', () => sidebar?.classList.remove('hidden'));

    // --- 3. HÀM TẢI TRANG CHI TIẾT ---
    async function loadPage(shotName) {
        if (!contentArea) return;

        contentArea.style.opacity = '0'; // Hiệu ứng mờ dần

        try {
            const response = await fetch(`detail/${shotName}.html`);
            if (!response.ok) throw new Error("Không tải được trang");
            
            const html = await response.text();
            
            setTimeout(() => {
                contentArea.innerHTML = html;
                contentArea.style.opacity = '1';

                // Sau khi load HTML mới, kiểm tra nếu là trang Shot 5 thì khởi tạo bảng
                if (shotName === 'shot5') {
                    initProgressReport();
                }

                // Gọi hàm init riêng cho từng shot nếu có (ví dụ: initShot1())
                const initFuncName = "init" + shotName.charAt(0).toUpperCase() + shotName.slice(1);
                if (typeof window[initFuncName] === "function") {
                    window[initFuncName]();
                }
            }, 150);
        } catch (err) {
            console.error(err);
            contentArea.innerHTML = "<h2>Lỗi tải nội dung. Vui lòng thử lại.</h2>";
            contentArea.style.opacity = '1';
        }
    }

    // --- 4. XỬ LÝ CLICK MENU SIDEBAR ---
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // Đổi active class
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            // Cập nhật tiêu đề Header
            if (headerTitle) {
                headerTitle.innerText = this.querySelector('span')?.innerText || "";
            }

            // Load nội dung
            const shot = this.getAttribute('data-shot');
            loadPage(shot);
        });
    });

    // Tải trang mặc định
    loadPage('shot1');

    // --- 5. ỦY THÁC SỰ KIỆN (EVENT DELEGATION) ---
    // Dùng document.addEventListener('click') để xử lý các element được load động qua fetch
    document.addEventListener('click', function (e) {
        
        // A. Xử lý Popup Ảnh
        if (e.target && e.target.id === 'myImg') {
            const modal = document.getElementById("imageModal");
            const modalImg = document.getElementById("imgFull");
            if (modal && modalImg) {
                modal.style.display = "flex";
                modalImg.src = e.target.src;
            }
        }
        if (e.target.classList.contains('close') || e.target.id === 'imageModal') {
            document.getElementById("imageModal").style.display = "none";
        }

        // B. Xử lý Accordion / Card Timeline
        const timelineItem = e.target.closest('.timeline-item');

        if (timelineItem) {
            // Nếu click vào một nút bấm (button) hoặc link (a) bên trong card thì không toggle
            if (e.target.closest('button') || e.target.closest('a')) return;

            // Toggle class active cho card
            timelineItem.classList.toggle('active');
        }

        // C. Xử lý Remark Card
        const remarkCard = e.target.closest('.remark-card');
        if (remarkCard) {
            remarkCard.closest('.remark-item')?.classList.toggle('active');
        }

        // D. Xuất PDF
        const exportBtn = e.target.closest('#exportPdfBtn');
        if (exportBtn) {
            handleExportPdf(exportBtn);
        }
    });

    // --- 6. HÀM XUẤT PDF ---
    function handleExportPdf(btn) {
        if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
            alert("Đang tải thư viện, vui lòng thử lại sau giây lát!");
            return;
        }

        const element = document.getElementById('content-area');
        const originalBtnHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
        btn.disabled = true;

        html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" })
        .then(canvas => {
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const imgWidth = canvas.width / 2;
            const imgHeight = canvas.height / 2;
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: imgWidth > imgHeight ? 'l' : 'p',
                unit: 'pt',
                format: [imgWidth, imgHeight]
            });
            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
            pdf.save('Unime-Full-Report.pdf');
        })
        .finally(() => {
            btn.innerHTML = originalBtnHtml;
            btn.disabled = false;
        });
    }

    // --- 7. LOGIC BÁO CÁO TIẾN ĐỘ (SHOT 5) ---
    let reportData = [];

    function initProgressReport() {
        const tableBody = document.getElementById('table-body');
        const btnAdd = document.getElementById('btnAddRow');
        if (!tableBody) return;

        reportData = JSON.parse(localStorage.getItem('shot5_data')) || [
            { session: "POSM E2E", au: "Unilever", task: "Tên việc mẫu", desc: "Mô tả...", priority: "1", other: "", note: "", progress: "Request", status: "NEW", timeline: "", actual: "" }
        ];

        renderTable();

        btnAdd?.addEventListener('click', () => {
            reportData.push({ session: "Mới", au: "Unilever", task: "Nhiệm vụ mới", desc: "", priority: "3", other: "", note: "", progress: "Request", status: "NEW", timeline: "" , actual: "" });
            saveAndRender();
        });
    }

    function renderTable() {
    const tableBody = document.getElementById('table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = reportData.map((item, index) => `
        <tr style="${getRowStyle(item.status)}">
            <td contenteditable="true" onblur="updateCell(${index}, 'session', this)">${item.session || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'au', this)">${item.au || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'task', this)">${item.task || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'desc', this)">${item.desc || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'priority', this)">${item.priority || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'other', this)">${item.other || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'note', this)">${item.note || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'progress', this)">${item.progress || ''}</td>
            
            <!-- Cột Status -->
            <td contenteditable="true" onblur="updateStatusCell(${index}, this)">
                ${item.status || ''}
            </td>
            
            <td contenteditable="true" onblur="updateCell(${index}, 'timeline', this)">${item.timeline || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'actual', this)">${item.actual || ''}</td>
            <td><button class="btn-del" onclick="deleteRow(${index})">Xóa</button></td>
        </tr>
    `).join('');
    }
    
    function getRowStyle(status) {
    const val = (status || "").toString().trim().toUpperCase();
    
    switch (val) {
        case 'DONE':
            // Màu xanh neon nhạt cho nền
            return 'background-color: rgba(57, 255, 20, 0.2); font-weight: 500;'; 
            
        case 'OPEN':
        case 'REOPEN':
            // Màu vàng nhạt
            return 'background-color: rgba(255, 235, 59, 0.2); font-weight: 500;';
            
        case 'PROCESS':
            // Màu xanh lá Case nhạt
            return 'background-color: rgba(46, 125, 50, 0.15); font-weight: 500;';
            
        case 'NEW':
            // Màu xanh dương nhạt (Sky Blue)
            return 'background-color: rgba(33, 150, 243, 0.15); font-weight: 500;';
            
        default:
            return '';
    }
    }

    window.updateCell = function(idx, field, el) {
        reportData[idx][field] = el.innerText;
        localStorage.setItem('shot5_data', JSON.stringify(reportData));
    };

    window.deleteRow = function(idx) {
        if (confirm("Xóa dòng này?")) {
            reportData.splice(idx, 1);
            saveAndRender();
        }
    };

    function saveAndRender() {
        localStorage.setItem('shot5_data', JSON.stringify(reportData));
        renderTable();
    }

    window.updateStatusCell = function(idx, el) {
    const newStatus = el.innerText.trim();
    reportData[idx]['status'] = newStatus;
    
    // Tìm thẻ <tr> và cập nhật style mới
    const parentRow = el.closest('tr');
    if (parentRow) {
        parentRow.style = getRowStyle(newStatus);
    }
    
    localStorage.setItem('shot5_data', JSON.stringify(reportData));
    };
    btnAdd?.addEventListener('click', () => {
    reportData.push({ 
        session: "Mới", 
        au: "Unilever", 
        task: "Nhiệm vụ mới", 
        desc: "", 
        priority: "3", 
        other: "", 
        note: "", 
        progress: "0%", 
        status: "NEW", // Đặt là NEW
        timeline: "",
        actual: "" 
    });
    saveAndRender(); // Hàm này gọi renderTable, renderTable lại gọi getRowStyle
});
});