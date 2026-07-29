const API_URL = "https://script.google.com/macros/s/AKfycby6KWMp7C6tlTot9tLyRR6OaupBPmsbWXZHKdR2nVeKLGb66l1UArX1fpzANQNPlBdQkg/exec";

window.shotDigitalInit = async function() {
    const tbody = document.getElementById('digital-table-body');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_URL}?t=${Date.now()}`);
        const data = await res.json();
        
        // KHỚP CHÍNH XÁC CỘT TRÊN SHEETS (A=0, B=1, ... K=10)
        window.digitalData = data.map(r => ({
            session: r[0] || "",   au: r[1] || "",      topic: r[2] || "",
            taskId: r[3] || "",    content: r[4] || "", other: r[5] || "",
            note: r[6] || "",      progress: r[7] || "", 
            status: (r[8] || "OPEN").toUpperCase().trim(),
            timeline: r[9] || "",  actual: r[10] || ""
        }));
        
        renderDigitalTable();
    } catch (e) { console.error("Lỗi:", e); }
};

// 1. Khai báo danh sách status mặc định là chọn tất cả
let activeStatusFilters = ["OPEN", "PROCESS", "PENDING", "DONE", "CLOSE"];

// 2. Hàm khởi tạo bộ lọc (Gọi hàm này trong window.onload hoặc shotDigitalInit)
function initStatusFilters() {
    const container = document.getElementById('st-filter-list');
    const colors = { "OPEN": "#ca8a04", "PROCESS": "#16a34a", "PENDING": "#dc2626", "DONE": "#0891b2", "CLOSE": "#64748b" };
    
    container.innerHTML = Object.keys(colors).map(st => `
        <div class="st-filter-btn active" 
             id="btn-filter-${st}" 
             style="background: ${colors[st]}; color: white;" 
             onclick="toggleStatusFilter('${st}')">
            ${st}
        </div>
    `).join('');
}

// 3. Hàm bật/tắt filter khi click
window.toggleStatusFilter = (st) => {
    const btn = document.getElementById(`btn-filter-${st}`);
    if (activeStatusFilters.includes(st)) {
        activeStatusFilters = activeStatusFilters.filter(s => s !== st);
        btn.classList.remove('active');
    } else {
        activeStatusFilters.push(st);
        btn.classList.add('active');
    }
    renderDigitalTable(); // Vẽ lại bảng
};

// 4. CẬP NHẬT HÀM RENDER CHÍNH CỦA BẠN
function renderDigitalTable() {
    const tbody = document.getElementById('digital-table-body');
    if (!tbody) return;

    const showParent = document.getElementById('filterParent').checked;
    const showChild = document.getElementById('filterChild').checked;

    let html = "";
    let currentParentStatus = "OPEN"; 

    window.digitalData.forEach((item, idx) => {
        const isChild = item.taskId.toString().includes('_');
        
        // CẬP NHẬT STATUS CHA (Luôn chạy để con lấy đúng màu dù cha bị ẩn)
        if (!isChild) {
            currentParentStatus = item.status.toUpperCase().trim();
        }

        // LOGIC LỌC 1: Theo Cha/Con
        if (!isChild && !showParent) return;
        if (isChild && !showChild) return;

        // LOGIC LỌC 2: Theo Trạng thái (Mới thêm)
        if (!activeStatusFilters.includes(item.status.toUpperCase().trim())) return;

        const textClass = `txt-${item.status.toLowerCase()}`;
        const bgClass = `bg-p-${currentParentStatus.toLowerCase()}`;
        const rowIndent = isChild ? 'indent-child' : 'indent-parent';

        html += `
        <tr class="${bgClass} ${textClass}">
            <td class="${rowIndent}" style="white-space: pre-wrap;">${item.session}</td>
            <td class="${rowIndent}" style="white-space: pre-wrap; text-align:center;">${item.au}</td>
            <td class="${rowIndent}" style="white-space: pre-wrap;">${item.topic}</td>
            <td class="${rowIndent}" style="white-space: pre-wrap;">${item.taskId}</td>
            <td class="${rowIndent}" style="white-space: pre-wrap;">${item.content}</td>
            <td class="${rowIndent}" style="white-space: pre-wrap; text-align:center;">${item.other}</td>
            <td class="${rowIndent}" style="white-space: pre-wrap;">${item.note}</td>
            <td class="${rowIndent}" style="text-align:center;">${item.progress}</td>
            <td class="${rowIndent}" style="text-align:center;">
                <span class="status-badge badge-${item.status.toLowerCase()}">${item.status}</span>
            </td>
            <td class="${rowIndent}" style="text-align:center;">${item.timeline}</td>
            <td class="${rowIndent}" style="text-align:center;">${item.actual}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}
// Chạy khởi tạo ngay khi nạp file
window.shotDigitalInit();

// Các hàm cập nhật
window.upV = (i, f, el) => { window.digitalData[i][f] = el.innerText.trim(); };
window.upS = (i, v) => { window.digitalData[i].status = v; renderDigitalTable(); };
window.delV = (i) => { if(confirm("Xóa?")) { window.digitalData.splice(i,1); renderDigitalTable(); } };