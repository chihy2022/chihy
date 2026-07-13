const GGS_URL = "https://script.google.com/macros/s/AKfycbwAy0alQ6WVQEMazLAH-RIqVMCDTwrgZ7ekCbFrOxwxLF6samu_ucUfTeALBSVWxzMB0A/exec";
let currentCat = "APP";
let fBase64 = "";
let fName = "";

// 1. Đổi Tab
window.changeCategory = function(type) {
    currentCat = type;
    document.getElementById('tabApp').classList.toggle('active', type === 'APP');
    document.getElementById('tabPeople').classList.toggle('active', type === 'PEOPLE');
    document.getElementById('areaApp').style.display = (type === 'APP') ? 'block' : 'none';
    document.getElementById('areaPeople').style.display = (type === 'PEOPLE') ? 'block' : 'none';
};

// 2. Slider
const sInput = document.getElementById('sevInput');
const sText = document.getElementById('sevText');
const lvls = ["Nhẹ", "Trung bình", "Nặng", "Nghiêm trọng"];
if(sInput) sInput.oninput = function() { sText.innerText = lvls[this.value - 1]; };

// 3. Xử lý File
window.processFile = function() {
    const file = document.getElementById('fbFile').files[0];
    if (file) {
        if(file.size > 10*1024*1024) { alert("File quá lớn (>10MB)!"); return; }
        fName = file.name;
        document.getElementById('fileInfo').innerText = "📎 Đã chọn: " + fName;
        const reader = new FileReader();
        reader.onload = (e) => { fBase64 = e.target.result; };
        reader.readAsDataURL(file);
    }
};

// 4. Gửi dữ liệu
window.sendFeedback = async function() {
    const btn = document.getElementById('btnSendFB');
    const content = document.getElementById('fbContent').value;
    if(!content.trim()) { alert("Vui lòng nhập nội dung!"); return; }

    const data = {
        type: "FEEDBACK",
        category: currentCat === "APP" ? "Ứng dụng" : "Con người",
        subject: (currentCat === "APP") ? document.getElementById('errType').value : document.getElementById('target').value,
        severity: sText.innerText,
        content: content,
        expectation: document.getElementById('fbExpect').value,
        isAnonymous: document.getElementById('anonCheck').checked,
        fileData: fBase64,
        fileName: fName
    };

    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';

    try {
        // KHÔNG dùng mode: no-cors khi có upload file nặng
        await fetch(GGS_URL, { method: "POST", body: JSON.stringify(data) });
        alert("✅ Thành công!");
        location.reload();
    } catch (e) {
        alert("❌ Lỗi!");
    } finally { btn.disabled = false; }
};