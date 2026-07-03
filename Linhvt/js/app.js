// ================================================================
// 1. CẤU HÌNH & BIẾN TOÀN CỤC
// ================================================================
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyH6XZJtaH0a4L8SVJ-7lcCiORY9EYrnnnw7jFCjprZ59ik6-wgRQELYJ5Q71gJZHSmRA/exec";
let reportData = []; 

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleBtn');
    const contentArea = document.getElementById('content-area');
    const menuItems = document.querySelectorAll('.menu-item');
    const headerTitle = document.getElementById('dynamic-header-title');
    const groupHeaders = document.querySelectorAll('.group-header');

    // --- A. SIDEBAR CONTROL & PERSISTENCE ---
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            sidebar.classList.toggle('collapsed');
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebar-state', isCollapsed ? 'mini' : 'full');
        });
    }

    if (localStorage.getItem('sidebar-state') === 'mini') {
        sidebar.classList.add('collapsed');
    }

    groupHeaders.forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('active');
            if (sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
                localStorage.setItem('sidebar-state', 'full');
            }
        });
    });

    // --- B. HÀM TẢI TRANG AJAX VẠN NĂNG ---
    async function loadPage(shotName, targetHash = null) {
        if (!contentArea) return;
        contentArea.style.opacity = '0.4';

        try {
            const response = await fetch(`./detail/${shotName}.html`);
            if (!response.ok) throw new Error("File not found");
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            contentArea.innerHTML = doc.body.innerHTML;
            contentArea.style.opacity = '1';

            // 1. Tự động Quản lý TABS trên Header (Vạn năng cho Shot 2, 3, 4...)
            document.querySelectorAll('.header-nav-container').forEach(nav => nav.style.display = 'none');
            const currentNav = document.getElementById(`${shotName}-nav-group`);
            if (currentNav) {
                currentNav.style.display = 'flex';
                initScrollSpy(); 
            }

            // 2. Tải dữ liệu Google Sheets nếu là Shot 1 (Báo cáo tiến độ)
            if (shotName === 'shot1') {
                initProgressReport();
            }

            // 3. Xử lý Smart Scroll
            if (targetHash) {
                setTimeout(() => {
                    const targetEl = document.querySelector(targetHash);
                    if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
                }, 500);
            } else {
                contentArea.scrollTo(0, 0);
            }

        } catch (err) {
            contentArea.style.opacity = '1';
            console.error("Lỗi nạp trang:", err);
        }
    }

    // --- C. XỬ LÝ CLICK SIDEBAR MENU ---
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const shot = item.getAttribute('data-shot');
            if (shot) {
                menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // Lấy textContent để không bị lỗi khi sidebar đóng
                const menuName = item.querySelector('span')?.textContent || "";
                if (headerTitle) headerTitle.textContent = menuName;

                localStorage.setItem('currentShot', shot);
                localStorage.setItem('currentTitle', menuName);
                loadPage(shot);
            }
        });
    });

    // --- D. ỦY THÁC SỰ KIỆN TOÀN APP (CLICK) ---
    document.addEventListener('click', (e) => {
        // 1. Roadmap Card Toggle
        const card = e.target.closest('.remark-card');
        if (card) card.closest('.remark-item')?.classList.toggle('active');

        // 2. Zoom Ảnh Modal
        if (e.target.id === 'myImg' || e.target.classList.contains('img-in-card')) {
            const modal = document.getElementById("imageModal");
            if (modal) {
                modal.style.display = "flex";
                document.getElementById("imgFull").src = e.target.src;
            }
        }
        if (e.target.classList.contains('close') || e.target.id === 'imageModal') {
            const modal = document.getElementById("imageModal");
            if (modal) modal.style.display = "none";
        }

        // 3. Header Tab Click (Cuộn mượt)
        const navLink = e.target.closest('.nav-btn');
        if (navLink) {
            e.preventDefault();
            const hash = navLink.getAttribute('href');
            const targetEl = document.querySelector(hash);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth' });
                navLink.parentElement.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                navLink.classList.add('active');
            }
        }

        // 4. Nút Xuất PDF
        if (e.target.closest('#exportPdfBtn')) {
            handleExportPdf(e.target.closest('#exportPdfBtn'));
        }
    });

    // --- E. HÀM THEO DÕI CUỘN TRANG (SCROLL SPY) ---
    function initScrollSpy() {
        const sections = document.querySelectorAll('.content-section');
        const navButtons = document.querySelectorAll('.nav-btn');
        if (sections.length === 0) return;

        const options = { root: contentArea, rootMargin: '-10% 0px -80% 0px', threshold: 0 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navButtons.forEach(btn => {
                        btn.classList.remove('active');
                        if (btn.getAttribute('href') === `#${id}`) btn.classList.add('active');
                    });
                }
            });
        }, options);
        sections.forEach(section => observer.observe(section));
    }

    // --- F. KHỞI TẠO KHI MỞ WEB (GHI NHỚ TRANG) ---
    const savedShot = localStorage.getItem('currentShot') || 'shot1';
    const savedTitle = localStorage.getItem('currentTitle') || 'BÁO CÁO TIẾN ĐỘ';
    if (headerTitle) headerTitle.textContent = savedTitle;
    
    // Set active cho sidebar theo trang đã lưu
    menuItems.forEach(i => {
        if(i.getAttribute('data-shot') === savedShot) i.classList.add('active');
        else i.classList.remove('active');
    });

    loadPage(savedShot);
});
// ================================================================
// 2. LOGIC BÁO CÁO TIẾN ĐỘ (SHOT 1)
// ================================================================
async function initProgressReport() {
    const tableBody = document.getElementById('table-body');
    const btnAdd = document.getElementById('btnAddRow');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang kết nối dữ liệu từ Google Sheets...</td></tr>';

    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        reportData = await response.json();
        renderTable();
    } catch (error) {
        console.error("API Error:", error);
    }

    if (btnAdd) {
        btnAdd.onclick = () => {
            reportData.push({ 
                session: "Mới", au: "Unilever", task: "Nhiệm vụ mới", 
                desc: "", priority: "3", other: "", note: "", 
                progress: "0%", status: "NEW", timeline: "", actual: "" 
            });
            renderTable();
        };
    }
}

function renderTable() {
    const tableBody = document.getElementById('table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = reportData.map((item, index) => {
        const formatT = (t) => (t || "").includes('T') ? t.split('T')[0] : (t || "");
        
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
            <td contenteditable="true" onblur="updateCell(${index}, 'timeline', this)">${formatT(item.timeline)}</td>
            <td contenteditable="true" onblur="updateCell(${index}, 'actual', this)">${formatT(item.actual)}</td>
            <td style="text-align:center;">
                <button class="btn-trash" onclick="deleteRow(${index})" title="Xóa dòng này">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `}).join('');
}

// HÀM XÓA CÓ BẢO MẬT BẰNG MÃ XÁC NHẬN
window.deleteRow = function(idx) {
    // 1. Thay confirm bằng prompt để hiện ô nhập chữ
    const confirmCode = prompt("⚠️ CẢNH BÁO BẢO MẬT\n\nBạn đang thực hiện thao tác xóa dữ liệu vĩnh viễn.\nVui lòng nhập đúng mã để xác nhận:");

    // 2. Kiểm tra mã nhập vào
    if (confirmCode === "DELETERAW") {
        reportData.splice(idx, 1); // Xóa trong mảng dữ liệu
        renderTable();            // Vẽ lại bảng
        alert("✅ Xác thực thành công! Dòng dữ liệu đã được xóa.");
    } else if (confirmCode === null) {
        // Người dùng bấm nút "Cancel" trên bảng thông báo
        console.log("Hủy thao tác xóa.");
    } else {
        // Nhập sai mã
        alert("❌ Mã xác nhận không đúng! Thao tác xóa bị từ chối để bảo vệ dữ liệu.");
    }
};

// 3. Hệ thống màu sắc Status chuyên nghiệp (Dạng Pastel)
function getRowStyle(status) {
    const s = (status || "").toString().trim().toUpperCase();
    switch (s) {
        case 'DONE': 
            return 'background-color: #f0fdf4; color: #166534; font-weight: 600;'; // Xanh lá Pastel
        case 'PENDING': 
        case 'PROCESS': 
            return 'background-color: #fffbeb; color: #92400e; font-weight: 600;'; // Vàng cam Pastel
        case 'REOPEN': 
            return 'background-color: #fef2f2; color: #991b1b; font-weight: 600;'; // Đỏ nhạt Pastel
        case 'OPEN':
        case 'NEW':
            return 'background-color: #eff6ff; color: #1e40af; font-weight: 600;'; // Xanh dương Pastel
        default: 
            return ''; 
    }
}

window.updateCell = (idx, f, el) => { reportData[idx][f] = el.innerText; };
window.updateStatusCell = (idx, el) => { reportData[idx]['status'] = el.innerText; renderTable(); };
window.syncToGoogleSheets = async function() {
    const btn = document.getElementById('btnSync');
    if (!btn) return;
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';
    try {
        const res = await fetch(GOOGLE_SHEET_URL, { method: "POST", body: JSON.stringify({ type: "UPDATE_ALL", data: reportData }) });
        if (res.ok) alert("Đã đồng bộ thành công!");
    } catch (e) { alert("Lỗi kết nối server!"); }
    finally { btn.disabled = false; btn.innerHTML = original; }
};

function getRowStyle(status) {
    const s = (status || "").toString().trim().toUpperCase();
    if (s === 'DONE') return 'background-color: #e6fffa;';
    if (s === 'PENDING') return 'background-color: #fff5f5;';
    return '';
}

// ================================================================
// 3. HÀM XUẤT PDF CHẤT LƯỢNG CAO (HỖ TRỢ TRANG DÀI)
// ================================================================
async function handleExportPdf(btn) {
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        alert("Đang tải thư viện PDF, vui lòng đợi trong giây lát...");
        return;
    }

    const element = document.getElementById('content-area');
    if (!element) return;

    // Hiệu ứng nút bấm khi đang xử lý
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo PDF...';

    try {
        // Tạm thời đưa scroll về đầu để chụp đủ nội dung
        const currentScroll = window.scrollY;
        window.scrollTo(0, 0);

        // Chụp màn hình vùng báo cáo với độ phân giải cao (scale: 2)
        const canvas = await html2canvas(element, {
            scale: 2,           // Tăng độ nét gấp 2 lần
            useCORS: true,      // Hỗ trợ load ảnh từ server khác
            backgroundColor: "#ffffff", // Ép nền trắng
            logging: false,
            height: element.scrollHeight, // Chụp toàn bộ chiều cao thực tế
            windowHeight: element.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const { jsPDF } = window.jspdf;

        // Tính toán kích thước để PDF dài theo nội dung (Long PDF)
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // Tạo file PDF với kích thước tùy chỉnh vừa khít với Canvas
        const pdf = new jsPDF({
            orientation: imgWidth > imgHeight ? 'l' : 'p',
            unit: 'px',
            format: [imgWidth, imgHeight] // Đây là chỗ giúp PDF "dài vô tận" theo báo cáo
        });

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Đặt tên file có kèm ngày tháng
        const date = new Date().toISOString().slice(0,10);
        pdf.save(`Umer-dms-${date}.pdf`);

        // Trả lại vị trí cuộn cũ
        window.scrollTo(0, currentScroll);

    } catch (error) {
        console.error("Lỗi PDF:", error);
        alert("Có lỗi xảy ra khi xuất PDF!");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}


/* ======================================================
   SHOT 6
====================================================== */

document.addEventListener("DOMContentLoaded", () => {

    initTimeline();
    initUseCase();
    initMatrix();

});


/* ======================================================
   TIMELINE
====================================================== */

function initTimeline() {

    const steps = document.querySelectorAll(".shot6-step");

    const title = document.querySelector(".shot6-detail-title h3");

    const actor = document.querySelectorAll(".detail-item p")[0];
    const input = document.querySelectorAll(".detail-item p")[1];
    const process = document.querySelector(".detail-item ul");
    const output = document.querySelectorAll(".detail-item p")[2];

    const data = {

        1:{

            title:"STEP 01 - Import Planout",

            actor:"CDA",

            input:"Planout Excel File",

            process:[
                "Upload Planout",
                "Validate Data",
                "Import Database"
            ],

            output:"POSM Database"

        },

        2:{

            title:"STEP 02 - Receive POSM",

            actor:"NPP",

            input:"POSM Delivery",

            process:[
                "Receive POSM",
                "Verify Quantity",
                "Confirm Receive"
            ],

            output:"Receive Quantity"

        },

        3:{

            title:"STEP 03 - Inventory Check",

            actor:"GSTB",

            input:"Current Inventory",

            process:[
                "Count Inventory",
                "Verify Stock",
                "Submit Result"
            ],

            output:"Actual Stock"

        },

        4:{

            title:"STEP 04 - Update Stock",

            actor:"IT",

            input:"Inventory Data",

            process:[
                "Update Stock",
                "Calculate GAP",
                "Sync Database"
            ],

            output:"Updated Inventory"

        },

        5:{

            title:"STEP 05 - Dashboard",

            actor:"Manager",

            input:"Stock Data",

            process:[
                "View Dashboard",
                "Export Report",
                "Monitor KPI"
            ],

            output:"Business Report"

        }

    };



    steps.forEach(step=>{

        step.addEventListener("click",()=>{

            steps.forEach(item=>item.classList.remove("active"));

            step.classList.add("active");

            const id = step.dataset.step;

            const info = data[id];

            title.innerHTML = info.title;

            actor.innerHTML = info.actor;

            input.innerHTML = info.input;

            output.innerHTML = info.output;

            process.innerHTML="";

            info.process.forEach(item=>{

                process.innerHTML += `<li>${item}</li>`;

            });

        });

    });

}



/* ======================================================
   USE CASE
====================================================== */

function initUseCase(){

    const actors=document.querySelectorAll(".actor-card");

    const items=document.querySelectorAll(".usecase-item");

    const map={

        cda:["uc-import"],

        npp:["uc-receive"],

        gstb:["uc-check"],

        it:["uc-stock","uc-gap"],

        manager:["uc-report"]

    };

    actors.forEach(actor=>{

        actor.addEventListener("mouseenter",()=>{

            items.forEach(i=>{

                i.style.opacity=.25;

                i.style.transform="scale(.95)";

            });

            map[actor.dataset.actor].forEach(id=>{

                const el=document.getElementById(id);

                if(el){

                    el.style.opacity=1;

                    el.style.transform="scale(1.05)";

                    el.style.background="#0F62FE";

                    el.style.color="#fff";

                }

            });

        });

        actor.addEventListener("mouseleave",()=>{

            items.forEach(i=>{

                i.style.opacity=1;

                i.style.transform="scale(1)";

                i.style.background="#fff";

                i.style.color="#111";

            });

        });

    });

}



/* ======================================================
   MATRIX
====================================================== */

function initMatrix(){

    const rows=document.querySelectorAll(".raci-table tbody tr");

    rows.forEach(row=>{

        row.addEventListener("mouseenter",()=>{

            row.style.background="#EFF6FF";

        });

        row.addEventListener("mouseleave",()=>{

            row.style.background="#fff";

        });

    });

}



/* ======================================================
   OPTIONAL SCROLL ANIMATION
====================================================== */

const observer=new IntersectionObserver(entries=>{

    entries.forEach(entry=>{

        if(entry.isIntersecting){

            entry.target.style.opacity=1;

            entry.target.style.transform="translateY(0)";

        }

    });

},{threshold:.2});

document.querySelectorAll(".shot6-section").forEach(section=>{

    section.style.opacity=0;

    section.style.transform="translateY(30px)";

    section.style.transition=".5s";

    observer.observe(section);

});