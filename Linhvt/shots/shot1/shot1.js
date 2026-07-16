/**
 * SHOT 1: BÁO CÁO TIẾN ĐỘ
 * Tích hợp hệ thống Master-Detail
 */

// ĐỊNH NGHĨA HÀM KHỞI TẠO CHÍNH (Được gọi từ app.js)
window.shot1Init = async function() {
    const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbz36knkDmqMdVHCXoFhvQb4l6Ej2e9dsj0rLj7dD2km7XXshj2IaNy2o9-sCuHigvhN2w/exec";
    
    // Khai báo các phần tử DOM
    const tableBody = document.getElementById('table-body');
    const btnAdd = document.getElementById('btnAddRow');
    const btnSync = document.getElementById('btnSync');

    if (!tableBody) return;

    // 1. HIỂN THỊ TRẠNG THÁI ĐANG TẢI
    tableBody.innerHTML = `
        <tr>
            <td colspan="12" style="text-align:center; padding:40px;">
                <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--primary)"></i>
                <p style="margin-top:10px; color: var(--text-gray)">Đang kết nối dữ liệu từ Google Sheets...</p>
            </td>
        </tr>
    `;

    // 2. TẢI DỮ LIỆU
    try {
        const response = await fetch(`${GOOGLE_SHEET_URL}?t=${Date.now()}`);
        const data = await response.json();
        
        // Lưu dữ liệu vào biến toàn cục để các hàm khác sử dụng
        window.reportData = JSON.parse(JSON.stringify(data));
        
        // Vẽ bảng
        renderShot1Table();
    } catch (error) {
        console.error("API Error:", error);
        tableBody.innerHTML = `<tr><td colspan="12" class="text-danger text-center p-4">Lỗi tải dữ liệu. Vui lòng kiểm tra lại kết nối!</td></tr>`;
    }

    // 3. GÁN SỰ KIỆN NÚT BẤM (Nằm trên Header)
    if (btnAdd) {
        btnAdd.onclick = () => {
            window.reportData.push({ 
                session: "Mới", au: "Unilever", task: "Nhiệm vụ mới", 
                desc: "", priority: "3", other: "", note: "", 
                progress: "Request", status: "NEW", timeline: "", actual: "" 
            });
            renderShot1Table();
        };
    }

    if (btnSync) {
        btnSync.onclick = () => syncShot1ToGoogleSheets(GOOGLE_SHEET_URL);
    }
};

/**
 * HÀM VẼ BẢNG
 */
function renderShot1Table() {
    const tableBody = document.getElementById('table-body');
    if (!tableBody || !window.reportData) return;
    
    const formatDate = (dateStr) => {
        if (!dateStr || dateStr.length < 5) return dateStr || "";
        let d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    tableBody.innerHTML = window.reportData.map((item, index) => {
        return `
        <tr style="${getRowStyleShot1(item.status, item.progress)}">
            <td contenteditable="true" onblur="updateShot1Cell(${index}, 'session', this)">${item.session || ''}</td>
            <td contenteditable="true" onblur="updateShot1Cell(${index}, 'au', this)" class="text-center">${item.au || ''}</td>
            <td contenteditable="true" onblur="updateShot1Cell(${index}, 'task', this)">${item.task || ''}</td>
            <td contenteditable="true" onblur="updateShot1Cell(${index}, 'desc', this)">${item.desc || ''}</td>
            <td contenteditable="true" onblur="updateShot1Cell(${index}, 'priority', this)" class="text-center">${item.priority || ''}</td>
            <td contenteditable="true" onblur="updateShot1Cell(${index}, 'other', this)">${item.other || ''}</td>
            <td contenteditable="true" onblur="updateShot1Cell(${index}, 'note', this)">${item.note || ''}</td>
            <td contenteditable="true" onblur="updateShot1ProgressCell(${index}, this)">${item.progress || ''}</td>
            <td contenteditable="true" onblur="updateShot1StatusCell(${index}, this)" class="text-center">${item.status || ''}</td>
            <td contenteditable="true" onblur="updateShot1Cell(${index}, 'timeline', this)" class="text-center">${formatDate(item.timeline)}</td>
            <td contenteditable="true" onblur="updateShot1Cell(${index}, 'actual', this)" class="text-center">${formatDate(item.actual)}</td>
            <td style="text-align:center;">
                <button class="btn-trash" onclick="deleteShot1Row(${index})">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `;}).join('');
}

/**
 * HÀM XỬ LÝ CẬP NHẬT Ô
 */
window.updateShot1Cell = (idx, field, el) => { 
    window.reportData[idx][field] = el.innerText.trim(); 
};

window.updateShot1StatusCell = (idx, el) => { 
    window.reportData[idx]['status'] = el.innerText.trim(); 
    renderShot1Table(); 
};

window.updateShot1ProgressCell = (idx, el) => { 
    window.reportData[idx]['progress'] = el.innerText.trim(); 
    renderShot1Table(); 
};

/**
 * HÀM XÓA DÒNG
 */
window.deleteShot1Row = function(idx) {
    const confirmCode = prompt("⚠️ CẢNH BÁO BẢO MẬT\nNhập mật khẩu để xác nhận xóa:");
    
    if (confirmCode === "DELETERAW") {
        window.reportData.splice(idx, 1);
        renderShot1Table();
        alert("✅ Đã xóa tạm thời. Hãy nhấn Sync để cập nhật vĩnh viễn.");
    } else if (confirmCode !== null) {
        alert("❌ Sai mật khẩu!");
    }
};

/**
 * LOGIC ĐỔI MÀU DÒNG
 */
function getRowStyleShot1(status, progress) {
    const s = (status || "").toString().trim().toUpperCase();
    const p = (progress || "").toString().trim().toUpperCase();
    
    if (p.includes("TRIỂN KHAI")) return 'background-color: #dbeafe; color: #1e40af;'; 
    if (s === 'CLOSE' || s === 'CLOSED' || p === 'CLOSE') return 'background-color: #f3f4f6; color: #4b5563;'; 
    if (s === 'PENDING') return 'background-color: #fee2e2; color: #b91c1c;'; 
    if (s === 'OPEN') return 'background-color: #fef9c3; color: #854d0e;'; 
    if (s === 'REOPEN') return 'background-color: #ffedd5; color: #9a3412;'; 
    if (s.includes('PHÂN TÍCH')) return 'background-color: #dcfce7; color: #166534;'; 
    if (s.includes('CHƯA BẮT ĐẦU')) return 'background-color: #f3e8ff; color: #6b21a8;'; 
    return ''; 
}

/**
 * HÀM ĐỒNG BỘ (SYNC)
 */
async function syncShot1ToGoogleSheets(url) {
    const btn = document.getElementById('btnSync');
    const password = prompt("🔐 XÁC NHẬN ĐỒNG BỘ\nNhập mật khẩu để lưu dữ liệu:");

    if (password === null) return;
    if (password !== "LINHVTsync") return alert("❌ Sai mật khẩu!");

    const originalHTML = btn.innerHTML;
    btn.disabled = true; 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang Sync...';
    
    try {
        await fetch(url, { 
            method: "POST", 
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: "UPDATE_ALL", data: window.reportData }) 
        });

        alert("✅ Đồng bộ thành công!");
    } catch (e) { 
        alert("❌ Lỗi kết nối!"); 
    } finally { 
        btn.disabled = false; 
        btn.innerHTML = originalHTML; 
    }
}

// KHỞI CHẠY (Dành cho trường hợp load file trực tiếp)
if (!window.UnimeApp) window.shot1Init();