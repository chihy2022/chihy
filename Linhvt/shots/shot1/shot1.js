const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyH6XZJtaH0a4L8SVJ-7lcCiORY9EYrnnnw7jFCjprZ59ik6-wgRQELYJ5Q71gJZHSmRA/exec";

// Biến lưu trữ dữ liệu
let originalData = [];

// 1. Khởi tạo báo cáo
async function initProgressReport() {
    const tableBody = document.getElementById('table-body');
    const btnAdd = document.getElementById('btnAddRow');
    
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:30px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang kết nối dữ liệu từ Google Sheets...</td></tr>';

    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const data = await response.json();
        
        window.reportData = JSON.parse(JSON.stringify(data)); 
        originalData = JSON.parse(JSON.stringify(data)); 
        
        renderTable();
    } catch (error) {
        console.error("API Error:", error);
        tableBody.innerHTML = '<tr><td colspan="12" class="text-danger text-center p-3">Lỗi tải dữ liệu. Vui lòng kiểm tra kết nối!</td></tr>';
    }

    if (btnAdd) {
        btnAdd.onclick = () => {
            window.reportData.push({ 
                session: "Mới", au: "Unilever", task: "Nhiệm vụ mới", 
                desc: "", priority: "3", other: "", note: "", 
                progress: "Request", status: "NEW", timeline: "", actual: "" 
            });
            renderTable();
        };
    }
}

// 2. Logic Xử lý Xóa (Có Pass + Thông báo thành công)
window.deleteRow = function(idx) {
    const confirmCode = prompt("⚠️ CẢNH BÁO BẢO MẬT\n\nBạn đang thực hiện thao tác xóa dữ liệu. Vui lòng nhập mật khẩu để xác nhận:");
    
    if (confirmCode === "DELETERAW") {
        window.reportData.splice(idx, 1); // Xóa dòng trong bộ nhớ tạm
        renderTable();                    // Vẽ lại bảng ngay lập tức
        
        // THÊM THÔNG BÁO Ở ĐÂY
        alert("✅ Xóa thành công! \nLưu ý: Bạn cần nhấn nút 'Sync' để xóa vĩnh viễn trên Google Sheets.");
        
    } else if (confirmCode !== null) {
        alert("❌ Mã xác nhận không đúng! Thao tác xóa bị từ chối để bảo vệ dữ liệu!");
    }
};

window.updateCell = (idx, f, el) => { 
    window.reportData[idx][f] = el.innerText; 
};

window.updateStatusCell = (idx, el) => { 
    window.reportData[idx]['status'] = el.innerText; 
    renderTable(); 
};

window.updateProgressCell = (idx, el) => { 
    window.reportData[idx]['progress'] = el.innerText; 
    renderTable(); 
};

// 3. Logic Màu sắc
function getRowStyle(status, progress) {
    const s = (status || "").toString().trim().toUpperCase();
    const p = (progress || "").toString().trim().toUpperCase();
    if (p.includes("TRIỂN KHAI") || p.includes("TRIEN KHAI")) return 'background-color: #dbeafe; color: #1e40af; font-weight: 600;'; 
    if (s === 'CLOSE' || s === 'CLOSED' || p === 'CLOSE') return 'background-color: #f3f4f6; color: #4b5563; font-weight: 600;'; 
    if (s === 'PENDING') return 'background-color: #fee2e2; color: #b91c1c; font-weight: 600;'; 
    if (s === 'OPEN') return 'background-color: #fef9c3; color: #854d0e; font-weight: 600;'; 
    if (s === 'REOPEN') return 'background-color: #ffedd5; color: #9a3412; font-weight: 600;'; 
    if (s === 'PHÂN TÍCH YÊU CẦU' || s === 'PHAN TICH YEU CAU') return 'background-color: #dcfce7; color: #166534; font-weight: 600;'; 
    if (s === 'CHƯA BẮT ĐẦU' || s === 'CHUA BAT DAU') return 'background-color: #f3e8ff; color: #6b21a8; font-weight: 600;'; 
    return ''; 
}

// 4. Render Bảng
window.renderTable = function() {
    const tableBody = document.getElementById('table-body');
    if (!tableBody || !window.reportData) return;
    
    const formatT = (dateStr) => {
        if (!dateStr) return "";
        let d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    tableBody.innerHTML = window.reportData.map((item, index) => {
        return `
        <tr style="${getRowStyle(item.status, item.progress)}">
            <td contenteditable="true" onblur="updateCell(${index}, 'session', this)">${item.session || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'au', this)">${item.au || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'task', this)">${item.task || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'desc', this)">${item.desc || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'priority', this)">${item.priority || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'other', this)">${item.other || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'note', this)">${item.note || ''}</td>
            <td contenteditable="true" onblur="updateProgressCell(${index}, this)">${item.progress || ''}</td>
            <td contenteditable="true" onblur="updateStatusCell(${index}, this)">${item.status || ''}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'timeline', this)">${formatT(item.timeline)}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'actual', this)">${formatT(item.actual)}</td>
            <td style="text-align:center;">
                <button class="btn-trash" onclick="deleteRow(${index})">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `}).join('');
};

// 5. ĐỒNG BỘ CÓ MẬT KHẨU (LINHVTsync)
window.syncToGoogleSheets = async function() {
    const btn = document.getElementById('btnSync');
    if (!btn) return;

    // BƯỚC 1: HỎI MẬT KHẨU TRƯỚC KHI LÀM BẤT CỨ GÌ
    const password = prompt("🔐 XÁC NHẬN ĐỒNG BỘ\nVui lòng nhập mật khẩu để lưu dữ liệu lên Google Sheets:");

    if (password === null) return; // Người dùng bấm Hủy

    if (password !== "LINHVTsync") {
        alert("❌ Mật khẩu không chính xác! Thao tác đồng bộ bị hủy.");
        return;
    }

    // BƯỚC 2: NẾU ĐÚNG PASS THÌ MỚI CHẠY TIẾP
    if (!window.reportData || window.reportData.length === 0) {
        alert("Không có dữ liệu để đồng bộ!");
        return;
    }

    const originalBtnHTML = btn.innerHTML;
    btn.disabled = true; 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đồng bộ...';
    
    try {
        const response = await fetch(GOOGLE_SHEET_URL, { 
            method: "POST", 
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: "UPDATE_ALL", data: window.reportData }) 
        });

        // Với Google Apps Script và no-cors, alert ngay sau khi fetch thành công
        alert("✅ Đã xác thực thành công và đồng bộ lên Google Sheets!");
        originalData = JSON.parse(JSON.stringify(window.reportData));
        
    } catch (e) { 
        console.error("Sync Error:", e);
        alert("❌ Lỗi kết nối server! Vui lòng thử lại sau."); 
    } finally { 
        btn.disabled = false; 
        btn.innerHTML = originalBtnHTML; 
    }
};

// Tự động chạy
initProgressReport();