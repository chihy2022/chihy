// 1. CẤU HÌNH (Sử dụng tên biến lạ để không bị trùng)
const DG_MAP = {
    "OPEN": "#ca8a04", "PROCESS": "#16a34a", "PENDING": "#dc2626", "DONE": "#0891b2", "CLOSE": "#64748b" ,"NEW": "#d39236c7"
};
const DG_API_URL = "https://script.google.com/macros/s/AKfycbw71ByZYOTRfNV5fzfL6C_JCSHo3eTbTGAoJ43U4mkSHGhrLtjC8cj1dwAE87521p1MbQ/exec";

// 2. HÀM KHỞI TẠO (Fetch dữ liệu)
async function shotDigitalInit() {
    console.log("🚀 Đang khởi tạo...");
    
    // Tạo nút lọc trạng thái trước
    initStatusPills();

    const tbody = document.getElementById('digital-table-body');
    if (tbody) tbody.innerHTML = '<tr> <td colspan="12" style="text-align:center; padding:40px;"><i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--primary)"></i> <p style="margin-top:10px; color: var(--text-gray)">Đang kết nối dữ liệu từ Google Sheets...</p></td></tr>';
    // Nếu đã có dữ liệu rồi thì vẽ luôn, không cần fetch lại để tăng tốc
    if (window.digitalData && window.digitalData.length > 0) {
        renderDigitalTable();
        return;
    }

    // Nếu chưa có dữ liệu thì mới đi fetch từ Google
    try {
        const res = await fetch(`${DG_API_URL}?t=${Date.now()}`);
        const data = await res.json();
        window.digitalData = data.map(r => ({
            session: r[0], au: r[1], topic: r[2], taskId: r[3],
            content: r[4], other: r[5], note: r[6], progress: r[7],
            status: (r[8] || "OPEN").toUpperCase().trim(),
            timeline: r[9], actual: r[10]
        }));
        renderDigitalTable();
    } catch (e) { console.error(e); }
}

// 3. HÀM TẠO NÚT PILL (Bộ lọc)
function initStatusPills() {
    const container = document.getElementById('status-pill-container');
    if (!container) return;
    
    container.innerHTML = Object.keys(DG_MAP).map(st => `
        <label class="status-pill-btn" style="background: ${DG_MAP[st]}">
            <input type="checkbox" class="st-check" value="${st}" checked onchange="renderDigitalTable()">
            ${st}
        </label>
    `).join('');
}

// 4. HÀM RENDER (Vẽ bảng & Lọc)
function renderDigitalTable() {
    const tbody = document.getElementById('digital-table-body');
    if (!tbody || !window.digitalData) return;

    // Lấy danh sách status đang chọn
    const activeStatuses = Array.from(document.querySelectorAll('.st-check:checked')).map(cb => cb.value);
    const showParent = document.getElementById('filterParent').checked;
    const showChild = document.getElementById('filterChild').checked;

    let html = "";
    let currentParentStatus = "OPEN"; 
    let count = 0;

    window.digitalData.forEach((item) => {
        const isChild = item.taskId.toString().includes('_');
        if (!isChild) currentParentStatus = item.status;

        // Logic Lọc
        if (!isChild && !showParent) return;
        if (isChild && !showChild) return;
        if (activeStatuses.length > 0 && !activeStatuses.includes(item.status)) return;

        count++;
        const textClass = `txt-${item.status.toLowerCase()}`;
        const bgClass = `bg-p-${currentParentStatus.toLowerCase()}`;

        html += `
        <tr class="${bgClass} ${textClass}">
            <td class="${isChild ? 'indent-child' : 'indent-parent'}" style="white-space: pre-wrap;">${item.session || ''}</td>
            <td class="${isChild ? 'indent-child' : 'indent-parent'}" style="white-space: pre-wrap;">${item.au || ''}</td>
            <td class="${isChild ? 'indent-child' : 'indent-parent'}" style="white-space: pre-wrap;">${item.topic || ''}</td>
            <td class="${isChild ? 'indent-child' : 'indent-parent'}" style="white-space: pre-wrap;">${item.taskId || ''}</td>
            <td class="${isChild ? 'indent-child' : 'indent-parent'}" style="white-space: pre-wrap;">${item.content || ''}</td>
            <td style="text-align:center">${item.other || ''}</td>
            <td class="${isChild ? 'indent-child' : 'indent-parent'}" style="white-space: pre-wrap;">${item.note || ''}</td>
            <td style="text-align:center">${item.progress || ''}</td>
            <td style="text-align:center;"><span class="status-badge badge-${item.status.toLowerCase()}">${item.status}</span></td>
            <td style="text-align:center">${item.timeline || ''}</td>
            <td style="text-align:center">${item.actual || ''}</td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
    const summary = document.getElementById('filter-summary');
    if(summary) summary.innerText = `Hiển thị: ${count} dòng`;
}

// Tự động kiểm tra: Nếu thấy bảng Digital xuất hiện mà đang trống thì nạp data
setInterval(() => {
    const tbody = document.getElementById('digital-table-body');
    // Nếu bảng xuất hiện trên màn hình và đang trắng trơn
    if (tbody && tbody.innerHTML === "") {
        shotDigitalInit();
    }
}, 1000); // Mỗi 1 giây kiểm tra 1 lần