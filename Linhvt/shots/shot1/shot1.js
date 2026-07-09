const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyH6XZJtaH0a4L8SVJ-7lcCiORY9EYrnnnw7jFCjprZ59ik6-wgRQELYJ5Q71gJZHSmRA/exec";

// Khởi tạo báo cáo
async function initProgressReport() {
    const tableBody = document.getElementById('table-body');
    const btnAdd = document.getElementById('btnAddRow');
    
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:30px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang kết nối dữ liệu từ Google Sheets...</td></tr>';

    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        // Lưu vào biến reportData toàn cục (đã khai báo ở assets/app.js)
        window.reportData = await response.json();
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

// ================================================================
// 3. LOGIC XỬ LÝ (BAO GỒM CẢNH BÁO BẢO MẬT)
// ================================================================

// HÀM XÓA CÓ BẢO MẬT BẰNG MÃ XÁC NHẬN (NHƯ LINH YÊU CẦU)
window.deleteRow = function(idx) {
    // 1. Hiện prompt yêu cầu nhập mã
    const confirmCode = prompt("⚠️ CẢNH BÁO BẢO MẬT\n\nBạn đang thực hiện thao tác xóa dữ liệu vĩnh viễn.\nVui lòng nhập đúng mã để xác nhận:");

    // 2. Kiểm tra mã nhập vào
    if (confirmCode === "DELETERAW") {
        window.reportData.splice(idx, 1); // Xóa trong mảng dữ liệu
        renderTable();                    // Vẽ lại bảng
        alert("✅ Xác thực thành công! Dòng dữ liệu đã được xóa.");
    } else if (confirmCode === null) {
        // Người dùng bấm nút "Cancel"
        console.log("Hủy thao tác xóa.");
    } else {
        // Nhập sai mã hoặc để trống
        alert("❌ Mã xác nhận không đúng! Thao tác xóa bị từ chối để bảo vệ dữ liệu.");
    }
};

window.updateCell = (idx, f, el) => { window.reportData[idx][f] = el.innerText; };
window.updateStatusCell = (idx, el) => { 
    window.reportData[idx]['status'] = el.innerText; 
    renderTable(); 
};

// ================================================================
// LOGIC MÀU SẮC CHUẨN GOOGLE SHEETS (THEO HÌNH CỦA LINH)
// ================================================================
function getRowStyle(status, progress) {
    const s = (status || "").toString().trim().toUpperCase();
    const p = (progress || "").toString().trim().toUpperCase();

    // 1. ƯU TIÊN 1: CỘT TIẾN ĐỘ (PROGRESS - CỘT H)
    // Nếu Tiến độ là "Triển khai" -> Màu Xanh dương nhạt
    if (p.includes("TRIỂN KHAI") || p.includes("TRIEN KHAI")) {
        return 'background-color: #dbeafe; color: #1e40af; font-weight: 600;'; 
    }

    // 2. ƯU TIÊN 2: CỘT TRẠNG THÁI (STATUS - CỘT I)
    
    // CLOSE -> Màu Xám
    if (s === 'CLOSE' || s === 'CLOSED' || p === 'CLOSE') {
        return 'background-color: #f3f4f6; color: #4b5563; font-weight: 600;'; 
    }

    // PENDING -> Màu Đỏ nhạt
    if (s === 'PENDING') {
        return 'background-color: #fee2e2; color: #b91c1c; font-weight: 600;'; 
    }

    // OPEN -> Màu Vàng nhạt
    if (s === 'OPEN') {
        return 'background-color: #fef9c3; color: #854d0e; font-weight: 600;'; 
    }

    // REOPEN -> Màu Cam đào nhạt
    if (s === 'REOPEN') {
        return 'background-color: #ffedd5; color: #9a3412; font-weight: 600;'; 
    }

    // PHÂN TÍCH YÊU CẦU -> Màu Xanh lá nhạt
    if (s === 'PHÂN TÍCH YÊU CẦU' || s === 'PHAN TICH YEU CAU') {
        return 'background-color: #dcfce7; color: #166534; font-weight: 600;'; 
    }

    // CHƯA BẮT ĐẦU -> Màu Tím nhạt
    if (s === 'CHƯA BẮT ĐẦU' || s === 'CHUA BAT DAU') {
        return 'background-color: #f3e8ff; color: #6b21a8; font-weight: 600;'; 
    }

    return ''; 
}

// ================================================================
// CẬP NHẬT HÀM RENDER ĐỂ TỰ ĐỘNG XUỐNG DÒNG (PRE-WRAP)
// ================================================================

window.renderTable = function() {
    const tableBody = document.getElementById('table-body');
    if (!tableBody || !window.reportData) return;
    
    // HÀM FIX LỆCH NGÀY CHUẨN GMT+7 (VIỆT NAM)
    const formatT = (dateStr) => {
        if (!dateStr) return "";
        
        let d = new Date(dateStr);
        // Nếu dữ liệu không phải dạng Date chuẩn, trả về nguyên bản
        if (isNaN(d.getTime())) return dateStr;

        /**
         * Bí quyết ở đây: 
         * Không dùng split('T') nữa. 
         * d.getDate(), d.getMonth() sẽ tự động lấy theo giờ máy tính (Việt Nam) 
         * nên nó sẽ tự bù lại 7 tiếng bị thiếu.
         */
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
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
            
            <!-- Hiển thị ngày đã được fix GMT+7 -->
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

// Hàm cập nhật riêng cho Tiến độ để màu nhảy ngay lập tức
window.updateProgressCell = (idx, el) => { 
    window.reportData[idx]['progress'] = el.innerText; 
    renderTable(); 
};

// Đồng bộ lên Google Sheets
window.syncToGoogleSheets = async function() {
    const btn = document.getElementById('btnSync');
    if (!btn) return;
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';
    
    try {
        const res = await fetch(GOOGLE_SHEET_URL, { 
            method: "POST", 
            body: JSON.stringify({ type: "UPDATE_ALL", data: window.reportData }) 
        });
        if (res.ok) alert("Đã đồng bộ thành công!");
    } catch (e) { 
        alert("Lỗi kết nối server!"); 
    } finally { 
        btn.disabled = false; btn.innerHTML = original; 
    }
};

// Tự động chạy khi file JS này được nạp
initProgressReport();