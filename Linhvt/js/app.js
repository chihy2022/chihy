const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyH6XZJtaH0a4L8SVJ-7lcCiORY9EYrnnnw7jFCjprZ59ik6-wgRQELYJ5Q71gJZHSmRA/exec";
let reportData = []; 

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleBtn');
    const contentArea = document.getElementById('content-area');
    const menuItems = document.querySelectorAll('.menu-item');
    const headerTitle = document.getElementById('dynamic-header-title');
    const groupHeaders = document.querySelectorAll('.group-header');
    
    // Vùng chứa 3 nút điều hướng trên header
    const shot2NavGroup = document.getElementById('shot2-nav-group'); 

    // --- 1. SIDEBAR CONTROL ---
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

    // --- 2. AJAX PAGE LOADER (HIỆN NÚT HEADER & LOAD GG SHEET) ---
    async function loadPage(shotName, targetHash = null) {
        if (!contentArea) return;
        contentArea.style.opacity = '0.5';

        try {
            const response = await fetch(`./detail/${shotName}.html`);
            if (!response.ok) throw new Error("File not found");
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            contentArea.innerHTML = doc.body.innerHTML;
            contentArea.style.opacity = '1';

            // A. LOGIC CHO SHOT 2 (HIỆN NAV & SCROLL SPY)
            if (shotName === 'shot2') {
                if (shot2NavGroup) shot2NavGroup.style.display = 'flex';
                initScrollSpy(); 
            } else {
                if (shot2NavGroup) shot2NavGroup.style.display = 'none';
            }

            // B. LOGIC CHO SHOT 5 (QUAN TRỌNG: TẢI GOOGLE SHEETS)
            if (shotName === 'shot5') {
                initProgressReport(); // Kích hoạt nạp dữ liệu bảng
            }

            // C. XỬ LÝ SCROLL NẾU CÓ HASH
            if (targetHash) {
                setTimeout(() => {
                    const targetEl = document.querySelector(targetHash);
                    if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
                }, 400);
            } else {
                contentArea.scrollTo(0, 0);
            }

        } catch (err) {
            contentArea.style.opacity = '1';
            console.error("Lỗi tải trang:", err);
        }
    }

    // --- 3. MENU CLICK ---
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const shot = item.getAttribute('data-shot');
            if (shot) {
                menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                if (headerTitle) headerTitle.innerText = item.querySelector('span')?.innerText || "";
                loadPage(shot);
            }
        });
    });

    // --- 4. ỦY THÁC SỰ KIỆN TOÀN APP ---
    document.addEventListener('click', (e) => {
        // Roadmap Toggle
        const remarkCard = e.target.closest('.remark-card');
        if (remarkCard) {
            remarkCard.closest('.remark-item')?.classList.toggle('active');
        }

        // Zoom Ảnh
        if (e.target.id === 'myImg') {
            const modal = document.getElementById("imageModal");
            if (modal) {
                modal.style.display = "flex";
                document.getElementById("imgFull").src = e.target.src;
            }
        }
        if (e.target.classList.contains('close') || e.target.id === 'imageModal') {
            const modal = document.getElementById("imageModal");
            if (modal) modal.style.display = "none";
        }

        // LOGIC BẤM TAB HEADER
        const navLink = e.target.closest('.nav-btn');
        if (navLink) {
            e.preventDefault();
            const hash = navLink.getAttribute('href');
            const targetEl = document.querySelector(hash);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth' });
                document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                navLink.classList.add('active');
            }
        }

        // Xuất PDF
        if (e.target.closest('#exportPdfBtn')) {
            handleExportPdf(e.target.closest('#exportPdfBtn'));
        }
    });

    // --- 5. HÀM THEO DÕI CUỘN TRANG ---
    function initScrollSpy() {
        const sections = document.querySelectorAll('.content-section');
        const navButtons = document.querySelectorAll('.nav-btn');
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

    loadPage('shot1');
});

// ================================================================
// 2. LOGIC BÁO CÁO TIẾN ĐỘ (SHOT 5)
// ================================================================
async function initProgressReport() {
    const tableBody = document.getElementById('table-body');
    const btnAdd = document.getElementById('btnAddRow');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang nạp dữ liệu từ Google Sheets...</td></tr>';

    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        reportData = await response.json();
        renderTable();
    } catch (error) {
        console.error("API Error:", error);
    }

    if (btnAdd) {
        btnAdd.onclick = () => {
            reportData.push({ 
                session: "Mới", au: "Unilever", task: "Nhiệm vụ mới", 
                desc: "", priority: "3", other: "", note: "", 
                progress: "0%", status: "NEW", timeline: "", actual: "" 
            });
            renderTable();
        };
    }
}

function renderTable() {
    const tableBody = document.getElementById('table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = reportData.map((item, index) => {
        const formatT = (t) => (t || "").includes('T') ? t.split('T')[0] : (t || "");
        
        return `
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
            <td contenteditable="true" onblur="updateCell(${index}, 'timeline', this)">${formatT(item.timeline)}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'actual', this)">${formatT(item.actual)}</td>
            <td style="text-align:center;">
                <button class="btn-trash" onclick="deleteRow(${index})" title="Xóa dòng này">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `}).join('');
}

// HÀM XÓA CÓ BẢO MẬT BẰNG MÃ XÁC NHẬN
window.deleteRow = function(idx) {
    // 1. Thay confirm bằng prompt để hiện ô nhập chữ
    const confirmCode = prompt("⚠️ CẢNH BÁO BẢO MẬT\n\nBạn đang thực hiện thao tác xóa dữ liệu vĩnh viễn.\nVui lòng nhập đúng mã để xác nhận:");

    // 2. Kiểm tra mã nhập vào
    if (confirmCode === "DELETERAW") {
        reportData.splice(idx, 1); // Xóa trong mảng dữ liệu
        renderTable();            // Vẽ lại bảng
        alert("✅ Xác thực thành công! Dòng dữ liệu đã được xóa.");
    } else if (confirmCode === null) {
        // Người dùng bấm nút "Cancel" trên bảng thông báo
        console.log("Hủy thao tác xóa.");
    } else {
        // Nhập sai mã
        alert("❌ Mã xác nhận không đúng! Thao tác xóa bị từ chối để bảo vệ dữ liệu.");
    }
};

// 3. Hệ thống màu sắc Status chuyên nghiệp (Dạng Pastel)
function getRowStyle(status) {
    const s = (status || "").toString().trim().toUpperCase();
    switch (s) {
        case 'DONE': 
            return 'background-color: #f0fdf4; color: #166534; font-weight: 600;'; // Xanh lá Pastel
        case 'PENDING': 
        case 'PROCESS': 
            return 'background-color: #fffbeb; color: #92400e; font-weight: 600;'; // Vàng cam Pastel
        case 'REOPEN': 
            return 'background-color: #fef2f2; color: #991b1b; font-weight: 600;'; // Đỏ nhạt Pastel
        case 'OPEN':
        case 'NEW':
            return 'background-color: #eff6ff; color: #1e40af; font-weight: 600;'; // Xanh dương Pastel
        default: 
            return ''; 
    }
}

window.updateCell = (idx, f, el) => { reportData[idx][f] = el.innerText; };
window.updateStatusCell = (idx, el) => { reportData[idx]['status'] = el.innerText; renderTable(); };
window.syncToGoogleSheets = async function() {
    const btn = document.getElementById('btnSync');
    if (!btn) return;
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';
    try {
        const res = await fetch(GOOGLE_SHEET_URL, { method: "POST", body: JSON.stringify({ type: "UPDATE_ALL", data: reportData }) });
        if (res.ok) alert("Đã đồng bộ thành công!");
    } catch (e) { alert("Lỗi kết nối server!"); }
    finally { btn.disabled = false; btn.innerHTML = original; }
};

function getRowStyle(status) {
    const s = (status || "").toString().trim().toUpperCase();
    if (s === 'DONE') return 'background-color: #e6fffa;';
    if (s === 'PENDING') return 'background-color: #fff5f5;';
    return '';
}

// ================================================================
// 3. HÀM XUẤT PDF CHẤT LƯỢNG CAO
// ================================================================
async function handleExportPdf(btn) {
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        alert("Đang tải thư viện PDF..."); return;
    }
    const element = document.getElementById('content-area');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo PDF...';

    try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL('image/png', 1.0);
        const { jsPDF } = window.jspdf;
        const imgWidth = canvas.width; const imgHeight = canvas.height;
        const pdf = new jsPDF({ orientation: imgWidth > imgHeight ? 'l' : 'p', unit: 'px', format: [imgWidth, imgHeight] });
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Unime-Report.pdf`);
    } catch (error) {
        alert("Lỗi xuất PDF!");
    } finally {
        btn.disabled = false; btn.innerHTML = originalText;
    }
}