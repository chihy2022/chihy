(function () {
    // --- BẢO VỆ CHỐNG "Identifier already declared" KHI SCRIPT BỊ CHẠY LẠI ---
    // Khi chuyển từ shot khác quay lại, nếu hệ thống re-inject thẻ <script> này,
    // các khai báo let/const ở top-level cũ sẽ gây lỗi và dừng toàn bộ script.
    // Do đó ta chỉ khai báo 1 lần duy nhất, các lần sau chỉ gọi lại init.
    if (window.__digitalShotLoaded) {
        if (typeof window.shotDigitalInit === 'function') {
            window.shotDigitalInit();
        }
        return;
    }
    window.__digitalShotLoaded = true;

    const DG_API_URL = "https://script.google.com/macros/s/AKfycby6KWMp7C6tlTot9tLyRR6OaupBPmsbWXZHKdR2nVeKLGb66l1UArX1fpzANQNPlBdQkg/exec";

    const STATUS_CONFIG = [
        { id: 'done', label: 'done', class: 'p-done' },
        { id: 'process', label: 'process', class: 'p-process' },
        { id: 'open', label: 'open', class: 'p-open' },
        { id: 'pending', label: 'pending', class: 'p-pending' },
        { id: 'close', label: 'close', class: 'p-close' },
        { id: 'new', label: 'new', class: 'p-new' }
    ];

    const COLOR_MAP = {
        'done':    { border: 'st-blue',  bg: 'group-active-done',    chip: 'bg-blue' },
        'build':   { border: 'st-blue',  bg: 'group-active-done',    chip: 'bg-blue' },
        'process': { border: 'st-green', bg: 'group-active-process', chip: 'bg-green' },
        'pending': { border: 'st-red',   bg: 'group-active-pending', chip: 'bg-red' },
        'close':   { border: 'st-gray',  bg: 'group-active-close',   chip: 'bg-gray' },
        'new':     { border: 'st-new',   bg: 'group-active-new',     chip: 'bg-new' },
        'default': { border: 'st-orange',bg: 'group-active-open',    chip: 'bg-orange' }
    };

    // Biến trạng thái - nằm trong closure, không đụng global scope nữa
    let activeStatuses = STATUS_CONFIG.map(s => s.id);
    let collapsedParents = new Set();
    let childCounts = {};
    let parentStatusMap = {};
    window.digitalData = [];

    /**
     * Đợi cho tới khi các phần tử DOM cần thiết xuất hiện.
     * Quan trọng khi chuyển shot: DOM của shot Digital có thể được
     * render/gắn vào trang muộn hơn thời điểm script chạy.
     */
    function waitForDigitalDom(callback, retries = 20) {
        const tbody = document.getElementById('digital-table-body');
        const filterContainer = document.getElementById('status-filter-container');
        const filterParent = document.getElementById('filterParent');

        if (tbody && filterContainer && filterParent) {
            callback();
            return;
        }
        if (retries <= 0) {
            console.warn("[Digital Shot] Không tìm thấy DOM cần thiết sau nhiều lần thử.");
            return;
        }
        setTimeout(() => waitForDigitalDom(callback, retries - 1), 150);
    }

    /**
     * Hiển thị thông báo "Đang kết nối dữ liệu" ngay bên trong bảng
     * (thay cho việc để bảng trống hoặc show loading toàn trang).
     */
    function showLoadingRow() {
        const tbody = document.getElementById('digital-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding: 40px 0; color:#9ca3af;">
                        Đang kết nối dữ liệu
                    </td>
                </tr>`;
        }
        const summaryEl = document.getElementById('filter-summary');
        if (summaryEl) summaryEl.innerText = 'Đang tải dữ liệu...';
    }

    async function shotDigitalInit() {
        waitForDigitalDom(async () => {
            initStatusFilters();
            showLoadingRow();
            try {
                const res = await fetch(`${DG_API_URL}?t=${Date.now()}`);
                const data = await res.json();

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
                        collapsedParents.add(taskId);
                    }

                    return {
                        session: r[0], au: r[1], topic: r[2], taskId: taskId,
                        content: r[4], priority: r[5], note: r[6], progress: r[7],
                        status: status, timeline: r[9], actual: r[10]
                    };
                });

                // Reset lại các filter/checkbox trên UI (đề phòng shot cũ để lại trạng thái cũ)
                const filterParentEl = document.getElementById('filterParent');
                const filterChildEl = document.getElementById('filterChild');
                if (filterParentEl) filterParentEl.checked = true;
                if (filterChildEl) filterChildEl.checked = false;
                activeStatuses = STATUS_CONFIG.map(s => s.id);

                renderDigitalTable();
            } catch (e) {
                console.error("Lỗi tải dữ liệu:", e);
                const tbody = document.getElementById('digital-table-body');
                if (tbody) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="8" style="text-align:center; padding: 40px 0; color:#e11d48; font-weight:600;">
                                Lỗi kết nối dữ liệu, vui lòng thử lại.
                            </td>
                        </tr>`;
                }
                const summaryEl = document.getElementById('filter-summary');
                if (summaryEl) summaryEl.innerText = 'Lỗi tải dữ liệu';
            }
        });
    }

    function handleGlobalDetail(el) {
        if (el.checked) {
            collapsedParents.clear();
        } else {
            window.digitalData.forEach(item => {
                if (!item.taskId.includes('_')) collapsedParents.add(item.taskId);
            });
        }
        renderDigitalTable();
    }

    function toggleParent(parentId) {
        if (collapsedParents.has(parentId)) {
            collapsedParents.delete(parentId);
        } else {
            collapsedParents.add(parentId);
        }

        const detailCheckbox = document.getElementById('filterChild');
        if (detailCheckbox) detailCheckbox.checked = false;

        renderDigitalTable();
    }

function renderDigitalTable() {
    const tbody = document.getElementById('digital-table-body');
    const filterParentEl = document.getElementById('filterParent');
    if (!tbody || !filterParentEl || !window.digitalData) return;

    const showParentFilter = filterParentEl.checked;

    const rows = [];
    let displayCount = 0;
    let lastParentSession = "";
    let lastParentAU = "";
    const groupHeaderRendered = new Set(); // các parentId đã hiển thị Session/A/U

    window.digitalData.forEach((item) => {
        const isChild = item.taskId.includes('_');
        const parentId = isChild ? item.taskId.split('_')[0] : item.taskId;

        if (!isChild) {
            lastParentSession = item.session;
            lastParentAU = item.au;
        }

        if (isChild) {
            if (collapsedParents.has(parentId)) return;
        } else {
            if (!showParentFilter) return;
        }

        if (activeStatuses.length > 0 && !activeStatuses.some(s => item.status.includes(s))) return;

        displayCount++;
        const pStatus = parentStatusMap[parentId] || 'open';
        const numChildren = childCounts[item.taskId] || 0;

        // Dòng này có phải là dòng đầu tiên của group được vẽ ra không?
        const showHeader = !groupHeaderRendered.has(parentId);
        if (showHeader) groupHeaderRendered.add(parentId);

        rows.push(renderRowTemplate(item, isChild, lastParentSession, lastParentAU, numChildren, pStatus, showHeader));
    });

    tbody.innerHTML = rows.join('');
    const summaryEl = document.getElementById('filter-summary');
    if (summaryEl) summaryEl.innerText = `Hiển thị: ${displayCount} dòng`;
}

function renderRowTemplate(item, isChild, session, au, numChildren, pStatus, showHeader) {
    const parentId = isChild ? item.taskId.split('_')[0] : item.taskId;
    const isExpanded = !collapsedParents.has(parentId);
    const isInGroup = isExpanded && (isChild || numChildren > 0);

    const pConf = Object.entries(COLOR_MAP).find(([key]) => pStatus.includes(key))?.[1] || COLOR_MAP.default;
    const sConf = Object.entries(COLOR_MAP).find(([key]) => item.status.includes(key))?.[1] || COLOR_MAP.default;

    const finalBorderClass = isInGroup ? pConf.border : sConf.border;
    const groupBgClass = isInGroup ? `${pConf.bg} expanded-group-row` : "";

    return `
    <tr class="${isChild ? 'row-child' : 'row-parent'} ${finalBorderClass} ${groupBgClass}" 
        ${!isChild ? `onclick="toggleParent('${item.taskId}')"` : ''}>
        <td>
            <div style="font-weight:700; color:var(--chihy-blue);">${showHeader ? session : ''}</div>
            <div style="font-size:10px">${showHeader ? au : ''}</div>
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

    function initStatusFilters() {
        const container = document.getElementById('status-filter-container');
        if (!container) return;
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

    function clearAllFilters() {
        const detailCheckbox = document.getElementById('filterChild');
        if (detailCheckbox) detailCheckbox.checked = false;

        collapsedParents.clear();
        window.digitalData.forEach(item => {
            if (!item.taskId.includes('_')) collapsedParents.add(item.taskId);
        });

        activeStatuses = STATUS_CONFIG.map(s => s.id);
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.add('active'));

        renderDigitalTable();
    }

    // --- Đưa các hàm cần gọi từ HTML (onclick, oninput...) ra window ---
    window.shotDigitalInit = shotDigitalInit;
    window.handleGlobalDetail = handleGlobalDetail;
    window.toggleParent = toggleParent;
    window.toggleStatusFilter = toggleStatusFilter;
    window.clearAllFilters = clearAllFilters;

    // Chạy lần đầu
    shotDigitalInit();
})();