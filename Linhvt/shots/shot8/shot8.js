const GGS_URL = "https://script.google.com/macros/s/AKfycbw3YMIpDCpEPAq4uOZtoNwK1K0cblkTr1ZykUS3dxmJW4P9j1_Xr9PEYq_MZVrfjwWQwg/exec?sheet=Goc_phanhoi";
let fbCategory = "APP";
let fbFileData = "";
let fbFileName = "";

// 1. Chuyển đổi Link Drive sang Link Ảnh trực tiếp
function getDirectLink(url) {
    if (!url || !url.includes("drive.google.com")) return "";
    const fileId = url.match(/[-\w]{25,}/);
    return fileId ? `https://lh3.googleusercontent.com/d/${fileId[0]}` : "";
}

// 2. Xử lý UI Feedback
window.switchFB = (cat) => {
    fbCategory = cat;
    document.getElementById('btnApp').classList.toggle('active', cat === 'APP');
    document.getElementById('btnPeople').classList.toggle('active', cat === 'PEOPLE');
    document.getElementById('boxApp').style.display = (cat === 'APP') ? 'block' : 'none';
    document.getElementById('boxPeople').style.display = (cat === 'PEOPLE') ? 'block' : 'none';
};

window.updateSev = (val) => {
    const lvls = ["Nhẹ", "Trung bình", "Nặng", "Nghiêm trọng"];
    document.getElementById('fbSevLabel').innerText = lvls[val - 1];
};

window.onFileChange = () => {
    const file = document.getElementById('fbFile').files[0];
    if (file) {
        fbFileName = file.name;
        document.getElementById('fbFileName').innerText = "📎 " + file.name;
        const reader = new FileReader();
        reader.onload = (e) => fbFileData = e.target.result;
        reader.readAsDataURL(file);
    }
};

// 3. Gửi Feedback
window.submitFB = async () => {
    const btn = document.getElementById('btnSubmitFB');
    const content = document.getElementById('fbDesc').value;
    if (!content.trim()) return alert("Vui lòng nhập nội dung!");

    const data = {
        type: "FEEDBACK",
        category: fbCategory === "APP" ? "Ứng dụng" : "Con người",
        subject: (fbCategory === "APP") ? document.getElementById('fbErrorType').value : document.getElementById('fbTarget').value,
        severity: document.getElementById('fbSevLabel').innerText,
        content: content,
        expectation: document.getElementById('fbExpect').value,
        isAnonymous: document.getElementById('fbAnon').checked,
        fileData: fbFileData,
        fileName: fbFileName
    };

    btn.disabled = true; btn.innerText = "Đang gửi...";
    try {
        await fetch(GGS_URL, { method: "POST", mode: 'no-cors', body: JSON.stringify(data) });
        alert("✅ Đã gửi thành công!");
        location.reload();
    } catch (e) { alert("Lỗi gửi!"); }
    finally { btn.disabled = false; }
};