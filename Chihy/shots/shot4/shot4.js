// URL từ Shot 1 của bạn (tốc độ tốt hơn)
const MASTER_API_URL = "https://script.google.com/macros/s/AKfycbz36knkDmqMdVHCXoFhvQb4l6Ej2e9dsj0rLj7dD2km7XXshj2IaNy2o9-sCuHigvhN2w/exec";
const CACHE_KEY = "DT_SYSTEM_CACHE";

let globalData = [];
let collapsedGroups = new Set();
let childCounts = {};
let parentStatusMap = {};

/**
 * 1. KHỞI TẠO SIÊU TỐC (Dùng logic phản hồi của Shot 1)
 */
window.shotDigitalInit = async function(forceRefresh = false) {
    const tableBody = document.getElementById('digital-table-body');
    if (!tableBody) return;

    // HIỂN THỊ LOADING NGAY LẬP TỨC (Giống Shot 1)
    tableBody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align:center; padding:50px;">
                <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: #0071c5"></i>
                <p style="margin-top:15px; color: #64748b; font-weight:500;">Đang kết nối hệ thống...</p>
            </td>
        </tr>
    `;

    // KIỂM TRA CACHE TRƯỚC (Để hiện bảng trong 0.1s)
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached && !forceRefresh) {
        const parsed = JSON.parse(cached);
        applyDataAndRender(parsed);
        // Tải ngầm để cập nhật dữ liệu mới nhất
        fetchSilentUpdate();
        return;
    }

    // TẢI DỮ LIỆU THỰC TẾ
    await fetchSilentUpdate(true);
};

/**
 * 2. HÀM TẢI DỮ LIỆU TỪ GOOGLE
 */
async function fetchSilentUpdate(isFirstLoad = false) {
    try {
        const response = await fetch(`${MASTER_API_URL}?t=${Date.now()}`);
        const data = await response.json();
        
        // Tiền xử lý dữ liệu (Chỉ chạy 1 lần để tiết kiệm CPU)
        const tempChildCounts = {};
        const tempParentMap = {};
        const processed = data.map(r => {
            const taskId = r[3].toString();
            const status = (r[8] || "open").trim().toLowerCase();
            if (taskId.includes('_')) {
                const pId = taskId.split('_')[0];
                tempChildCounts[pId] = (tempChildCounts[pId] || 0) + 1;
            } else {
                tempParentMap[taskId] = status;
            }
            return {
                session: r[0], au: r[1], topic: r[2], taskId: taskId,
                content: r[4], priority: r[5], note: r[6], progress: r[7],
                status: status, timeline: r[9], actual: r[10]
            };
        });

        const finalPackage = { data: processed, counts: tempChildCounts, statuses: tempParentMap };
        
        // Lưu cache
        localStorage.setItem(CACHE_KEY, JSON.stringify(finalPackage));
        
        applyDataAndRender(finalPackage);

    } catch (error) {
        console.error("Connection Error:", error);
        if (isFirstLoad) document.getElementById('digital-table-body').innerHTML = `<tr><td colspan="8" class="text-center p-4">Lỗi kết nối Server!</td></tr>`;
    }
}

/**
 * 3. HÀM GÁN VÀ VẼ BẢNG (Tối ưu hóa vòng lặp)
 */
function applyDataAndRender(pkg) {
    globalData = pkg.data;
    childCounts = pkg.counts;
    parentStatusMap = pkg.statuses;
    
    // Mặc định đóng các task lần đầu nếu chưa có trạng thái đóng mở
    if (collapsedGroups.size === 0) {
        globalData.forEach(item => {
            if (!item.taskId.includes('_')) collapsedGroups.add(item.taskId);
        });
    }
    renderDigitalTable();
}

function renderDigitalTable() {
    const tbody = document.getElementById('digital-table-body');
    const showDetail = document.getElementById('filterChild').checked;
    
    const rows = [];
    let lastSession = ""; let lastAU = "";

    globalData.forEach(item => {
        const isChild = item.taskId.includes('_');
        const parentId = isChild ? item.taskId.split('_')[0] : item.taskId;

        if (!isChild) { lastSession = item.session; lastAU = item.au; }

        // Logic ẩn hiện: Hiện nếu (Dòng cha) HOẶC (Dòng con và cha không đóng) HOẶC (Bật show all detail)
        const isParentCollapsed = collapsedGroups.has(parentId);
        if (isChild && isParentCollapsed && !showDetail) return;

        rows.push(renderRowTemplate(item, isChild, lastSession, lastAU, isParentCollapsed, showDetail));
    });

    tbody.innerHTML = rows.join('');
}

/**
 * 4. TEMPLATE DÒNG (Đẹp như bản hiện đại, nhanh như Shot 1)
 */
function renderRowTemplate(item, isChild, session, au, isParentCollapsed, showDetail) {
    const parentId = isChild ? item.taskId.split('_')[0] : item.taskId;
    const pStatus = parentStatusMap[parentId] || 'open';
    const nChild = childCounts[item.taskId] || 0;
    
    // Group Active nếu (Cha mở + có con) HOẶC (Con)
    const isGroupActive = (!isParentCollapsed || showDetail) && (isChild || nChild > 0);
    
    // Mapping màu sắc
    const colors = {
        'done': { b: 'st-blue', bg: 'group-active-done', c: 'bg-blue' },
        'process': { b: 'st-green', bg: 'group-active-process', c: 'bg-green' },
        'pending': { b: 'st-red', bg: 'group-active-pending', c: 'bg-red' },
        'default': { b: 'st-orange', bg: 'group-active-open', c: 'bg-orange' }
    };
    
    const conf = colors[pStatus] || colors['default'];
    const rowColor = colors[item.status] || colors['default'];

    return `
    <tr class="${isChild ? 'row-child' : 'row-parent'} ${isGroupActive ? conf.b + ' ' + conf.bg + ' expanded-group-row' : rowColor.b}"
        ${!isChild ? `onclick="toggleTaskGroup('${item.taskId}')"` : ''}>
        <td style="width:120px">
            <div style="font-weight:700; color:#0071c5;">${(isChild && isGroupActive) ? '' : session}</div>
            <div style="font-size:10px">${(isChild && isGroupActive) ? '' : au}</div>
        </td>
        <td class="${isChild ? 'tree-node-cell' : ''}" style="width:280px">
            <div class="task-header-flex">
                <span class="task-title">${item.topic}</span>
                ${(!isChild && nChild > 0) ? `<span class="count-badge">(${nChild})</span>` : ''}
            </div>
            <div style="display:flex; align-items:center;">
                <span class="id-tag">${item.taskId}</span>
                <span class="progress-text">${item.progress}</span>
            </div>
        </td>
        <td>${item.content || ''}</td>
        <td class="text-center">${item.priority}</td>
        <td>${item.note || ''}</td>
        <td class="text-center"><div class="status-chip ${rowColor.c}">${item.status}</div></td>
        <td class="text-center">${item.timeline || ''}</td>
        <td class="text-center">${item.actual || ''}</td>
    </tr>`;
}

/**
 * 5. TƯƠNG TÁC
 */
window.toggleTaskGroup = (id) => {
    if (collapsedGroups.has(id)) collapsedGroups.delete(id);
    else collapsedGroups.add(id);
    renderDigitalTable();
};

window.handleDetailToggle = (el) => {
    renderDigitalTable();
};

// Khởi chạy
document.addEventListener('DOMContentLoaded', () => shotDigitalInit());