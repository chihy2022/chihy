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

// Vẽ lại bảng dữ liệu
window.renderTable = function() {
    const tableBody = document.getElementById('table-body');
    if (!tableBody || !window.reportData) return;
    
    tableBody.innerHTML = window.reportData.map((item, index) => {
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
};

// Cập nhật ô dữ liệu
window.updateCell = (idx, f, el) => { window.reportData[idx][f] = el.innerText; };
window.updateStatusCell = (idx, el) => { 
    window.reportData[idx]['status'] = el.innerText; 
    renderTable(); // Vẽ lại để cập nhật màu sắc status
};

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

// Style cho Status (Dùng bản Pastel đẹp)
function getRowStyle(status) {
    const s = (status || "").toString().trim().toUpperCase();
    switch (s) {
        case 'DONE': return 'background-color: #f0fdf4; color: #166534;';
        case 'PENDING': 
        case 'PROCESS': return 'background-color: #fffbeb; color: #92400e;';
        case 'REOPEN': return 'background-color: #fef2f2; color: #991b1b;';
        case 'OPEN':
        case 'NEW': return 'background-color: #eff6ff; color: #1e40af;';
        default: return ''; 
    }
}

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