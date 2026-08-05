const DG_API_URL = "https://script.google.com/macros/s/AKfycbz36knkDmqMdVHCXoFhvQb4l6Ej2e9dsj0rLj7dD2km7XXshj2IaNy2o9-sCuHigvhN2w/exec";
const CACHE_KEY = "SHOT4_MASTER_CACHE";

const THEME = {
    'done':    { b: 'st-blue',  bg: 'group-active-done',    c: 'bg-blue' },
    'process': { b: 'st-green', bg: 'group-active-process', c: 'bg-green' },
    'pending': { b: 'st-red',   bg: 'group-active-pending', c: 'bg-red' },
    'default': { b: 'st-orange',bg: 'group-active-open',    c: 'bg-orange' }
};

let globalData = [];
let collapsedGroups = new Set();
let childCounts = {};
let parentStatusMap = {};

/**
 * KHỞI TẠO SIÊU TỐC
 */
window.shotDigitalInit = function() {
    const tbody = document.getElementById('digital-table-body');
    if (!tbody) return;

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const parsed = JSON.parse(cached);
        processData(parsed.data, parsed.counts, parsed.statuses);
        renderTable();
        fetchUpdateSilent(); // Tải ngầm
    } else {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:60px;"><i class="fa-solid fa-spinner fa-spin fa-2x" style="color:#0071c5"></i><p>Đang kết nối...</p></td></tr>`;
        fetchUpdateSilent();
    }
};

async function fetchUpdateSilent() {
    try {
        const res = await fetch(`${DG_API_URL}?t=${Date.now()}`);
        const raw = await res.json();
        
        const counts = {};
        const pMap = {};
        const processed = raw.map(item => {
            const idVal = (item.taskId || item.task || "").toString();
            const stVal = (item.status || "open").trim().toLowerCase();
            
            if (idVal.includes('_')) {
                const pId = idVal.split('_')[0];
                counts[pId] = (counts[pId] || 0) + 1;
            } else {
                pMap[idVal] = stVal;
            }

            return {
                session: item.session || "",
                au: item.au || "",
                topic: item.task || "", // Đọc từ cột 'task'
                taskId: idVal,
                content: item.desc || "", // Đọc từ cột 'desc'
                priority: item.priority || "",
                note: item.note || "",
                progress: item.progress || "",
                status: stVal,
                timeline: item.timeline || "",
                actual: item.actual || ""
            };
        });

        const pkg = { data: processed, counts, statuses: pMap };
        localStorage.setItem(CACHE_KEY, JSON.stringify(pkg));
        processData(processed, counts, pMap);
        renderTable();

    } catch (err) { console.error(err); }
}

function processData(data, counts, statuses) {
    globalData = data;
    childCounts = counts;
    parentStatusMap = statuses;
    if (collapsedGroups.size === 0) {
        data.forEach(item => { if (!item.taskId.includes('_')) collapsedGroups.add(item.taskId); });
    }
}

function renderTable() {
    const tbody = document.getElementById('digital-table-body');
    if (!tbody) return;
    const showDetail = document.getElementById('filterChild')?.checked || false;
    const rows = []; let lastS = "";

    globalData.forEach(item => {
        const isChild = item.taskId.includes('_');
        const parentId = isChild ? item.taskId.split('_')[0] : item.taskId;
        if (!isChild) lastS = item.session;
        if (isChild && collapsedGroups.has(parentId) && !showDetail) return;

        const pStatus = parentStatusMap[parentId] || 'open';
        const nChild = childCounts[item.taskId] || 0;
        const isExp = (!collapsedGroups.has(parentId) || showDetail) && (isChild || nChild > 0);
        
        const pTheme = THEME[pStatus] || THEME['default'];
        const sTheme = THEME[item.status] || THEME['default'];

        rows.push(`
            <tr class="${isChild ? 'row-child' : 'row-parent'} ${isExp ? pTheme.b + ' ' + pTheme.bg : sTheme.b}" 
                onclick="${!isChild ? `window.toggleTaskGroup('${item.taskId}')` : ''}">
                <td style="font-weight:700; color:#0071c5;">${(isChild && isExp) ? '' : lastS}</td>
                <td class="${isChild ? 'tree-node-cell' : ''}">
                    <div style="display:flex; justify-content:space-between;">
                        <span style="font-weight:600">${item.topic}</span>
                        ${(!isChild && nChild > 0) ? `<span class="count-badge">(${nChild})</span>` : ''}
                    </div>
                    <div style="font-size:11px; color:#94a3b8">${item.taskId} | ${item.progress}</div>
                </td>
                <td style="white-space: pre-wrap;">${item.content}</td>
                <td style="text-align:center">${item.priority}</td>
                <td style="white-space: pre-wrap;">${item.note}</td>
                <td style="text-align:center"><div class="status-chip ${sTheme.c}">${item.status}</div></td>
                <td style="text-align:center">${item.timeline}</td>
                <td style="text-align:center">${item.actual}</td>
            </tr>
        `);
    });
    tbody.innerHTML = rows.join('');
}

window.toggleTaskGroup = (id) => {
    if (collapsedGroups.has(id)) collapsedGroups.delete(id);
    else collapsedGroups.add(id);
    renderTable();
};

document.addEventListener('DOMContentLoaded', window.shotDigitalInit);