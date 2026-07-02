// ================================================================
// 1. KHAI BÁO BIẾN TOÀN CỤC
// ================================================================
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyH6XZJtaH0a4L8SVJ-7lcCiORY9EYrnnnw7jFCjprZ59ik6-wgRQELYJ5Q71gJZHSmRA/exec";
let reportData = []; 

// ================================================================
// 2. KHỞI TẠO GIAO DIỆN & ĐIỀU HƯỚNG
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeBtn');
    const openBtn = document.getElementById('openBtn');
    const contentArea = document.getElementById('content-area');
    const menuItems = document.querySelectorAll('.menu-item');
    const headerTitle = document.getElementById('dynamic-header-title');

    // --- SIDEBAR ---
    closeBtn?.addEventListener('click', () => sidebar?.classList.add('hidden'));
    openBtn?.addEventListener('click', () => sidebar?.classList.remove('hidden'));

    // --- HÀM TẢI TRANG CHI TIẾT (AJAX) ---
    async function loadPage(shotName) {
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;

    // Hiệu ứng mờ dần (đừng xóa nội dung cũ ngay)
    contentArea.style.opacity = '0.5';

    try {
        const response = await fetch(`detail/${shotName}.html`);
        if (!response.ok) throw new Error("Lỗi mạng");
        const html = await response.text();

        // CHỐNG GIẬT: Tải xong xuôi mới ghi đè
        contentArea.innerHTML = html;
        contentArea.style.opacity = '1';

        // Khởi tạo logic sau khi nạp HTML
        if (shotName === 'shot5') {
            initProgressReport();
        }

        const initFuncName = "init" + shotName.charAt(0).toUpperCase() + shotName.slice(1);
        if (typeof window[initFuncName] === "function") {
            window[initFuncName]();
        }
    } catch (err) {
        contentArea.style.opacity = '1';
        console.error("Vercel Load Error:", err);
    }
    }
    // --- XỬ LÝ CLICK MENU ---
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            if (headerTitle) {
                headerTitle.innerText = this.querySelector('span')?.innerText || "";
            }
            loadPage(this.getAttribute('data-shot'));
        });
    });

    loadPage('shot1'); // Trang mặc định

    // --- ỦY THÁC SỰ KIỆN CLICK (CHO TOÀN BỘ APP) ---
    document.addEventListener('click', function (e) {
        
        // A. Popup Ảnh (Zoom)
        if (e.target && e.target.id === 'myImg') {
            const modal = document.getElementById("imageModal");
            const modalImg = document.getElementById("imgFull");
            if (modal && modalImg) {
                modal.style.display = "flex";
                modalImg.src = e.target.src;
            }
        }
        if (e.target.classList.contains('close') || e.target.id === 'imageModal') {
            const modal = document.getElementById("imageModal");
            if (modal) modal.style.display = "none";
        }

        // B. Mở rộng Remark Card (Timeline Roadmap) - QUAN TRỌNG
        const remarkCard = e.target.closest('.remark-card');
        if (remarkCard) {
            const item = remarkCard.closest('.remark-item');
            item?.classList.toggle('active');
        }

        // C. Mở rộng Timeline Item (nếu có)
        const timelineItem = e.target.closest('.timeline-item');
        if (timelineItem && !e.target.closest('button') && !e.target.closest('a')) {
            timelineItem.classList.toggle('active');
        }

        // D. Xuất PDF
        const exportBtn = e.target.closest('#exportPdfBtn');
        if (exportBtn) {
            handleExportPdf(exportBtn);
        }
    });
});

// ================================================================
// 3. LOGIC BÁO CÁO TIẾN ĐỘ (SHOT 5)
// ================================================================

async function initProgressReport() {
    const tableBody = document.getElementById('table-body');
    const btnAdd = document.getElementById('btnAddRow');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:20px;">Đang tải dữ liệu từ Google Sheets...</td></tr>';

    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        reportData = await response.json();
        renderTable();
        displayLastUpdated();
    } catch (error) {
        console.error("Lỗi nạp dữ liệu:", error);
        const local = localStorage.getItem('shot5_data');
        reportData = local ? JSON.parse(local) : [];
        renderTable();
    }

    if (btnAdd) {
        btnAdd.onclick = () => {
            reportData.push({ 
                session: "Mới", au: "Unilever", task: "Nhiệm vụ mới", 
                desc: "", priority: "3", other: "", note: "", 
                progress: "0%", status: "NEW", timeline: "", actual: "" 
            });
            saveAndRender();
        };
    }
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
            <td contenteditable="true" onblur="updateStatusCell(${index}, this)">${item.status || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'timeline', this)">${item.timeline || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'actual', this)">${item.actual || ''}</td>
            <td><button class="btn-del" onclick="deleteRow(${index})">Xóa</button></td>
        </tr>
    `).join('');
}

// --- CẬP NHẬT Ô ---
window.updateCell = function(idx, field, el) {
    reportData[idx][field] = el.innerText;
    localStorage.setItem('shot5_data', JSON.stringify(reportData));
};

window.updateStatusCell = function(idx, el) {
    const newStatus = el.innerText.trim();
    reportData[idx]['status'] = newStatus;
    const parentRow = el.closest('tr');
    if (parentRow) parentRow.style = getRowStyle(newStatus);
    localStorage.setItem('shot5_data', JSON.stringify(reportData));
};

window.deleteRow = function(idx) {
    if (confirm("Xác nhận xóa dòng này?")) {
        reportData.splice(idx, 1);
        saveAndRender();
    }
};

function saveAndRender() {
    localStorage.setItem('shot5_data', JSON.stringify(reportData));
    renderTable();
}

// --- ĐỒNG BỘ GOOGLE SHEETS ---
window.syncToGoogleSheets = async function() {
    const btn = document.getElementById('btnSync');
    if (!btn) return;
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';

    try {
        const response = await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            body: JSON.stringify({ type: "UPDATE_ALL", data: reportData })
        });
        
        if (response.ok) {
            alert("Đã đồng bộ thành công!");
            triggerUpdateTimestamp();
        }
    } catch (e) {
        alert("Lỗi kết nối Server!");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// ================================================================
// 4. HÀM BỔ TRỢ (MÀU, THỜI GIAN, PDF)
// ================================================================

function getRowStyle(status) {
    const val = (status || "").toString().trim().toUpperCase();
    switch (val) {
        case 'DONE': return 'background-color: rgba(57, 255, 20, 0.15); font-weight: 500;';
        case 'OPEN':
        case 'REOPEN': return 'background-color: rgba(255, 235, 59, 0.15); font-weight: 500;';
        case 'PROCESS': return 'background-color: rgba(46, 125, 50, 0.1); font-weight: 500;';
        case 'NEW': return 'background-color: rgba(33, 150, 243, 0.1); font-weight: 500;';
        default: return '';
    }
}

function getVNTime() {
    return new Date().toLocaleString('vi-VN', { 
        hour: '2-digit', minute: '2-digit', 
        day: '2-digit', month: '2-digit', year: 'numeric' 
    });
}

function displayLastUpdated() {
    const el = document.getElementById('last-updated');
    if (el) el.innerText = localStorage.getItem('shot5_last_time') || "--:--";
}

function triggerUpdateTimestamp() {
    const time = getVNTime();
    localStorage.setItem('shot5_last_time', time);
    displayLastUpdated();
}

function handleExportPdf(btn) {
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        alert("Đang tải thư viện PDF, vui lòng đợi..."); return;
    }
    const element = document.getElementById('content-area');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

    html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" })
    .then(canvas => {
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? 'l' : 'p',
            unit: 'pt',
            format: [canvas.width / 2, canvas.height / 2]
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 2, canvas.height / 2);
        pdf.save('Unime-Report.pdf');
    }).finally(() => {
        btn.disabled = false; btn.innerHTML = originalText;
    });
}