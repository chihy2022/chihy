const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyH6XZJtaH0a4L8SVJ-7lcCiORY9EYrnnnw7jFCjprZ59ik6-wgRQELYJ5Q71gJZHSmRA/exec";
let reportData = [];

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleBtn');
    const contentArea = document.getElementById('content-area');
    const menuItems = document.querySelectorAll('.menu-item');
    const groupHeaders = document.querySelectorAll('.group-header');

    toggleBtn?.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

    groupHeaders.forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('active');
            if (sidebar.classList.contains('collapsed')) sidebar.classList.remove('collapsed');
        });
    });

    async function loadPage(shotName) {
        if (!contentArea) return;
        contentArea.style.opacity = '0.5';
        try {
            const response = await fetch(`./detail/${shotName}.html`);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            contentArea.innerHTML = doc.body.innerHTML;
            contentArea.style.opacity = '1';
            
            if (shotName === 'shot5') initProgressReport();
        } catch (err) {
            contentArea.style.opacity = '1';
        }
    }

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const shot = item.getAttribute('data-shot');
            if (shot) {
                menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                document.getElementById('dynamic-header-title').innerText = item.querySelector('span')?.innerText || "";
                loadPage(shot);
            }
        });
    });

    loadPage('shot1');
});

//shot 5
async function initProgressReport() {
    const tableBody = document.getElementById('table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:20px;">Đang tải dữ liệu...</td></tr>';

    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        reportData = await response.json();
        renderTable();
    } catch (error) {
        console.error("Lỗi:", error);
    }
}

function renderTable() {
    const tableBody = document.getElementById('table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = reportData.map((item, index) => {
        // Định dạng lại ngày tháng từ Google Sheets (nếu có chữ T)
        const formatTime = (timeStr) => (timeStr || "").split('T')[0];

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
            <td contenteditable="true" onblur="updateCell(${index}, 'timeline', this)">${formatTime(item.timeline)}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'actual', this)">${formatTime(item.actual)}</td>
            <td style="text-align:center;">
                <button class="btn-del-row" onclick="deleteRow(${index})">Xóa</button>
            </td>
        </tr>
    `}).join('');
}

// Hàm lấy màu dòng giống ảnh bạn gửi
function getRowStyle(status) {
    const s = (status || "").toUpperCase().trim();
    if (s === 'DONE') return 'background-color: #e6fffa;'; // Xanh lá nhẹ
    if (s === 'PENDING') return 'background-color: #fff5f5;'; // Đỏ nhẹ
    return '';
}

window.deleteRow = function(idx) {
    if (confirm("Bạn có chắc muốn xóa dòng này?")) {
        reportData.splice(idx, 1);
        renderTable();
    }
};

// Cập nhật ô khi sửa trực tiếp
window.updateCell = function(idx, field, el) {
    reportData[idx][field] = el.innerText;
};

window.updateStatusCell = function(idx, el) {
    reportData[idx]['status'] = el.innerText;
    renderTable(); // Render lại để đổi màu dòng
};