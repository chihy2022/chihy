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

function renderDigitalTable() {
    const tbody = document.getElementById('digital-table-body');
    let html = "";
    
    // BIẾN QUAN TRỌNG: Lưu status của dòng cha gần nhất
    let currentParentStatus = "OPEN"; 

    window.digitalData.forEach((item, idx) => {
        // Kiểm tra xem là con hay cha dựa trên dấu "_" ở cột ID (D)
        const isChild = item.taskId.toString().includes('_');
        
        if (!isChild) {
            // Nếu là CHA: Cập nhật lại "trạng thái cha hiện tại"
            currentParentStatus = item.status.toUpperCase().trim();
        }

        // Tạo class màu chữ (theo bản thân)
        const textClass = `txt-${item.status.toLowerCase()}`;
        
        // Tạo class màu nền (LUÔN lấy theo currentParentStatus)
        // Nếu bạn muốn dòng CHA cũng có nền màu đó thì bỏ điều kiện 'isChild ?'
        const bgClass = `bg-p-${currentParentStatus.toLowerCase()}`;

        html += `
        <tr class="${bgClass} ${textClass}">
            <td>${item.session}</td>
            <td>${item.au}</td>
            <td>${item.topic}</td>
            <td class="${isChild ? 'indent-child' : 'indent-parent'}">${item.taskId}</td>
            <td class="${isChild ? 'indent-child' : 'indent-parent'}">${item.content}</td>
            <td class="${isChild ? 'indent-child' : 'indent-parent'}">${item.other}</td>
            <td class="${isChild ? 'indent-child' : 'indent-parent'}">${item.note}</td>
            <td class="${isChild ? 'indent-child' : 'indent-parent'}">${item.progress}</td>
            <td  class="${isChild ? 'indent-child' : 'indent-parent'}" style="text-align:center;">
                <span class="status-badge badge-${item.status.toLowerCase()}">${item.status}</span>
            </td>
            <td class="${isChild ? 'indent-child' : 'indent-parent'}">${item.timeline}</td>
            <td class="${isChild ? 'indent-child' : 'indent-parent'}">${item.actual}</td>
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