const DG_API_URL = "https://script.google.com/macros/s/AKfycby6KWMp7C6tlTot9tLyRR6OaupBPmsbWXZHKdR2nVeKLGb66l1UArX1fpzANQNPlBdQkg/exec";

const STATUS_CONFIG = [
    { id: 'done', label: 'done', class: 'p-done' },
    { id: 'process', label: 'process', class: 'p-process' },
    { id: 'open', label: 'open', class: 'p-open' },
    { id: 'pending', label: 'pending', class: 'p-pending' },
    { id: 'close', label: 'close', class: 'p-close' },
    { id: 'new', label: 'new', class: 'p-new' }
];

// Cấu hình màu sắc Group và Chip
const COLOR_MAP = {
    'done':    { border: 'st-blue',  bg: 'group-active-done',    chip: 'bg-blue' },
    'build':   { border: 'st-blue',  bg: 'group-active-done',    chip: 'bg-blue' },
    'process': { border: 'st-green', bg: 'group-active-process', chip: 'bg-green' },
    'pending': { border: 'st-red',   bg: 'group-active-pending', chip: 'bg-red' },
    'close':   { border: 'st-gray',  bg: 'group-active-close',   chip: 'bg-gray' },
    'new':     { border: 'st-new',   bg: 'group-active-new',     chip: 'bg-new' },
    'default': { border: 'st-orange',bg: 'group-active-open',    chip: 'bg-orange' }
};

// Biến toàn cục lưu trữ trạng thái
let activeStatuses = STATUS_CONFIG.map(s => s.id);
let collapsedParents = new Set(); 
let childCounts = {};
let parentStatusMap = {};
window.digitalData = [];

/**
 * Khởi tạo dữ liệu khi load trang
 */
async function shotDigitalInit() {
    initStatusFilters();
    try {
        const res = await fetch(`${DG_API_URL}?t=${Date.now()}`);
        const data = await res.json();
        
        // Reset Map dữ liệu
        childCounts = {};
        parentStatusMap = {};
        collapsedParents.clear();

        window.digitalData = data.map(r => {
            const taskId = r[3].toString();
            const status = (r[8] || "open").trim().toLowerCase();
            const isChild = taskId.includes('_');

            if (isChild) {
                const pId = taskId.split('_')[0];
                childCounts[pId] = (childCounts[pId] || 0) + 1;
            } else {
                parentStatusMap[taskId] = status;
                // Mặc định ban đầu: Đóng tất cả các Task cha
                collapsedParents.add(taskId); 
            }

            return {
                session: r[0], au: r[1], topic: r[2], taskId: taskId,
                content: r[4], priority: r[5], note: r[6], progress: r[7],
                status: status, timeline: r[9], actual: r[10]
            };
        });

        renderDigitalTable();
    } catch (e) {
        console.error("Lỗi tải dữ liệu:", e);
    }
}

/**
 * Xử lý khi tick/bỏ tick checkbox Detail (Mở hết / Đóng hết)
 */
function handleGlobalDetail(el) {
    if (el.checked) {
        // Mở hết -> Xóa mọi ID khỏi danh sách collapsed
        collapsedParents.clear();
    } else {
        // Đóng hết -> Thêm tất cả ID cha vào danh sách collapsed
        window.digitalData.forEach(item => {
            if (!item.taskId.includes('_')) collapsedParents.add(item.taskId);
        });
    }
    renderDigitalTable();
}

/**
 * Xử lý ẩn/hiện thủ công khi click vào dòng Cha
 */
function toggleParent(parentId) {
    if (collapsedParents.has(parentId)) {
        collapsedParents.delete(parentId);
    } else {
        collapsedParents.add(parentId);
    }
    
    // Khi người dùng tương tác thủ công, bỏ tick "Detail" ở trên toolbar 
    // vì trạng thái không còn là "Show All" nữa
    const detailCheckbox = document.getElementById('filterChild');
    if (detailCheckbox) detailCheckbox.checked = false;

    renderDigitalTable();
}

/**
 * Vẽ bảng dữ liệu
 */
function renderDigitalTable() {
    const tbody = document.getElementById('digital-table-body');
    if(!tbody || !window.digitalData) return;

    const showParentFilter = document.getElementById('filterParent').checked;
    
    const rows = [];
    let displayCount = 0;
    let lastParentSession = ""; 
    let lastParentAU = "";

    window.digitalData.forEach((item) => {
        const isChild = item.taskId.includes('_');
        const parentId = isChild ? item.taskId.split('_')[0] : item.taskId;
        
        if (!isChild) { 
            lastParentSession = item.session; 
            lastParentAU = item.au; 
        }

        // --- LOGIC HIỂN THỊ ---
        if (isChild) {
            // Dòng con chỉ hiện nếu Cha nó KHÔNG nằm trong danh sách đóng
            if (collapsedParents.has(parentId)) return;
        } else {
            // Dòng cha luôn hiện vì checkbox Task đã bị disabled (luôn tick)
            if (!showParentFilter) return;
        }

        // Lọc theo trạng thái (Pills)
        if (activeStatuses.length > 0 && !activeStatuses.some(s => item.status.includes(s))) return;

        displayCount++;
        const pStatus = parentStatusMap[parentId] || 'open';
        const numChildren = childCounts[item.taskId] || 0;

        rows.push(renderRowTemplate(item, isChild, lastParentSession, lastParentAU, numChildren, pStatus));
    });

    tbody.innerHTML = rows.join('');
    document.getElementById('filter-summary').innerText = `Hiển thị: ${displayCount} dòng`;
}

/**
 * Template HTML cho từng dòng
 */
function renderRowTemplate(item, isChild, session, au, numChildren, pStatus) {
    const parentId = isChild ? item.taskId.split('_')[0] : item.taskId;
    const isExpanded = !collapsedParents.has(parentId);
    const isInGroup = isExpanded && (isChild || numChildren > 0);

    // Lấy cấu hình màu sắc O(1)
    const pConf = Object.entries(COLOR_MAP).find(([key]) => pStatus.includes(key))?.[1] || COLOR_MAP.default;
    const sConf = Object.entries(COLOR_MAP).find(([key]) => item.status.includes(key))?.[1] || COLOR_MAP.default;

    // Ưu tiên màu của Cha cho cả group nếu group đang mở
    const finalBorderClass = isInGroup ? pConf.border : sConf.border;
    const groupBgClass = isInGroup ? `${pConf.bg} expanded-group-row` : "";

    return `
    <tr class="${isChild ? 'row-child' : 'row-parent'} ${finalBorderClass} ${groupBgClass}" 
        ${!isChild ? `onclick="toggleParent('${item.taskId}')"` : ''}>
        <td>
            <div style="font-weight:700; color:var(--chihy-blue);">${(isChild && isInGroup) ? '' : session}</div>
            <div style="font-size:10px">${(isChild && isInGroup) ? '' : au}</div>
        </td>
        <td class="${isChild ? 'tree-node-cell' : ''}">
            <div class="task-header-flex">
                <span class="task-title">${item.topic || ''}</span>
                ${(!isChild && numChildren > 0) ? `<span class="count-badge">(${numChildren})</span>` : ''}
            </div>
            <div style="display:flex; align-items:center;">
                <span class="id-tag">${item.taskId}</span>
                <span class="progress-text">${item.progress || ''}</span>
            </div>
        </td>
        <td style="white-space: pre-wrap;">${item.content || ''}</td>
        <td>${item.priority || ''}</td>
        <td style="white-space: pre-wrap;">${item.note || ''}</td>
        <td><div class="status-chip ${sConf.chip}">${item.status}</div></td>
        <td>${item.timeline || ''}</td>
        <td>${item.actual || ''}</td>
    </tr>`;
}

/**
 * Khởi tạo bộ lọc trạng thái (Pills)
 */
function initStatusFilters() {
    const container = document.getElementById('status-filter-container');
    if(!container) return;
    container.innerHTML = STATUS_CONFIG.map(st => `
        <div class="filter-pill active ${st.class}" onclick="toggleStatusFilter('${st.id}', this)">${st.label}</div>
    `).join('');
}

function toggleStatusFilter(id, el) {
    if (activeStatuses.includes(id)) {
        activeStatuses = activeStatuses.filter(s => s !== id);
    } else {
        activeStatuses.push(id);
    }
    el.classList.toggle('active');
    renderDigitalTable();
}

/**
 * Clear tất cả các filter về mặc định
 */
function clearAllFilters() {
    // Luôn giữ Task được chọn
    const detailCheckbox = document.getElementById('filterChild');
    if (detailCheckbox) detailCheckbox.checked = false;

    // Reset về trạng thái đóng tất cả dòng con
    collapsedParents.clear();
    window.digitalData.forEach(item => {
        if (!item.taskId.includes('_')) collapsedParents.add(item.taskId);
    });

    activeStatuses = STATUS_CONFIG.map(s => s.id);
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.add('active'));
    
    renderDigitalTable();
}

// Chạy khởi tạo
shotDigitalInit();