const DG_API_URL = "https://script.google.com/macros/s/AKfycby6KWMp7C6tlTot9tLyRR6OaupBPmsbWXZHKdR2nVeKLGb66l1UArX1fpzANQNPlBdQkg/exec";
const STATUS_CONFIG = [
    { id: 'done', label: 'done', class: 'p-done' },
    { id: 'process', label: 'process', class: 'p-process' },
    { id: 'open', label: 'open', class: 'p-open' },
    { id: 'pending', label: 'pending', class: 'p-pending' },
    { id: 'close', label: 'close', class: 'p-close' },
    { id: 'new', label: 'new', class: 'p-new' }
];

let activeStatuses = STATUS_CONFIG.map(s => s.id);

function switchView(viewId, el) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
}

async function shotDigitalInit() {
    initStatusFilters();
    try {
        const res = await fetch(`${DG_API_URL}?t=${Date.now()}`);
        const data = await res.json();
        window.digitalData = data.map(r => ({
            session: r[0], au: r[1], topic: r[2], taskId: r[3],
            content: r[4], priority: r[5], note: r[6], progress: r[7],
            status: (r[8] || "open").trim(), 
            timeline: r[9],
            actual: r[10]
        }));
        renderDigitalTable();
    } catch (e) { console.error("Lỗi dữ liệu:", e); }
}

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
        el.classList.remove('active');
    } else {
        activeStatuses.push(id);
        el.classList.add('active');
    }
    renderDigitalTable();
}

function clearAllFilters() {
    document.getElementById('filterParent').checked = true;
    document.getElementById('filterChild').checked = true;
    activeStatuses = STATUS_CONFIG.map(s => s.id);
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.add('active'));
    renderDigitalTable();
}

// Biến lưu trạng thái các dòng đang bị đóng
let collapsedParents = new Set(); 

function renderDigitalTable() {
    const tbody = document.getElementById('digital-table-body');
    const showParent = document.getElementById('filterParent').checked;
    const showChild = document.getElementById('filterChild').checked;
    
    if(!window.digitalData) return;

    // BƯỚC 1: Đếm số lượng con của từng cha
    const childCounts = {};
    window.digitalData.forEach(item => {
        const idStr = item.taskId.toString();
        if (idStr.includes('_')) {
            const parentId = idStr.split('_')[0]; // Lấy "Task2" từ "Task2_01"
            childCounts[parentId] = (childCounts[parentId] || 0) + 1;
        }
    });

    let html = ""; let countRows = 0;
    let lastParentSession = ""; let lastParentAU = "";

    window.digitalData.forEach((item) => {
        const idStr = item.taskId.toString();
        const isChild = idStr.includes('_');
        const parentId = isChild ? idStr.split('_')[0] : idStr;

        // Lưu thông tin cha để hiển thị cho con nếu cần
        if (!isChild) { 
            lastParentSession = item.session; 
            lastParentAU = item.au; 
        }

        // Logic lọc Task/Detail và Trạng thái
        const st = item.status.toLowerCase();
        if (!isChild && !showParent) return;
        if (isChild && !showChild) return;
        const isStatusMatch = activeStatuses.some(s => st.includes(s));
        if (!isStatusMatch && activeStatuses.length > 0) return;

        // CHỨC NĂNG ẨN/HIỆN: Nếu cha đang đóng thì không render con
        if (isChild && collapsedParents.has(parentId)) return;

        countRows++;
        const numChildren = childCounts[idStr] || 0; // Lấy số lượng con nếu là dòng cha

        html += renderRowCustom(item, isChild, lastParentSession, lastParentAU, numChildren); 
    });

    tbody.innerHTML = html;
    document.getElementById('filter-summary').innerText = `Hiển thị: ${countRows} dòng`;
}

    function renderRowCustom(item, isChild, session, au, numChildren) {
        const st = item.status.toLowerCase();
        const idStr = item.taskId.toString();
        
        let colorClass = "st-orange"; let bgClass = "bg-orange";
        if (st.includes('done') || st.includes('build') || st.includes('close')) { 
            colorClass = st.includes('close') ? "st-gray" : "st-blue"; 
            bgClass = st.includes('close') ? "bg-gray" : "bg-blue"; 
        } else if (st.includes('process')) { colorClass = "st-green"; bgClass = "bg-green"; }
        else if (st.includes('pending')) { colorClass = "st-red"; bgClass = "bg-red"; }
        else if (st.includes('new')) { colorClass = "st-new"; bgClass = "bg-new"; }

        // Xử lý hiển thị badge số lượng (6)
        const countBadge = (!isChild && numChildren > 0) 
            ? `<span class="count-badge">(${numChildren})</span>` 
            : '';

        // Thêm sự kiện click cho dòng cha
        const rowAttr = !isChild ? `onclick="toggleParent('${idStr}')"` : '';

        return `
        <tr class="${isChild ? 'row-child' : 'row-parent'} ${colorClass}" ${rowAttr}>
            <td>
                <div style="font-weight:700; color:var(--chihy-blue);">${isChild ? '' : session}</div>
                <div style="font-size:10px">${isChild ? '' : au}</div>
            </td>
            <td class="${isChild ? 'tree-node-cell' : ''}">
                <div class="task-header-flex">
                    <span class="task-title">${item.topic || ''}</span>
                    ${countBadge}
                </div>
                <div style="display:flex; align-items:center;">
                    <span class="id-tag">${item.taskId}</span>
                    <span class="progress-text">${item.progress || ''}</span>
                </div>
            </td>
            <td style="white-space: pre-wrap;">${item.content || ''}</td>
            <td>${item.priority || ''}</td>
            <td style="white-space: pre-wrap;">${item.note || ''}</td>
            <td><div class="status-chip ${bgClass}">${item.status}</div></td>
            <td>${item.timeline || ''}</td>
            <td>${item.actual || ''}</td>
        </tr>`;
    }

    // Hàm xử lý đóng mở khi click vào dòng
    function toggleParent(parentId) {
        if (collapsedParents.has(parentId)) {
            collapsedParents.delete(parentId);
        } else {
            collapsedParents.add(parentId);
        }
        renderDigitalTable(); // Vẽ lại bảng để áp dụng ẩn/hiện
    }
shotDigitalInit();