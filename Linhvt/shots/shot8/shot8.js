let shot8FileData = "";
let shot8FileName = "";
let shot8Category = "APP";

const GGS_URL_FEEDBACK = "https://script.google.com/macros/s/AKfycbz36knkDmqMdVHCXoFhvQb4l6Ej2e9dsj0rLj7dD2km7XXshj2IaNy2o9-sCuHigvhN2w/exec?sheet=Goc_phanhoi";

// 1. Chuyển Tab
window.switchFB = (cat) => {
    shot8Category = cat;
    document.getElementById('btnApp').classList.toggle('active', cat === 'APP');
    document.getElementById('btnPeople').classList.toggle('active', cat === 'PEOPLE');
    document.getElementById('boxApp').style.display = (cat === 'APP') ? 'block' : 'none';
    document.getElementById('boxPeople').style.display = (cat === 'PEOPLE') ? 'block' : 'none';
};

// 2. Slider
window.updateSev = (val) => {
    const lvls = ["Nhẹ", "Trung bình", "Nặng", "Nghiêm trọng"];
    document.getElementById('fbSevLabel').innerText = lvls[val - 1];
};

// 3. Xử lý File
window.onFileChange = () => {
    const file = document.getElementById('fbFile').files[0];
    if (file) {
        shot8FileName = file.name;
        document.getElementById('fbFileName').innerText = "📎 Đã chọn: " + file.name;
        const reader = new FileReader();
        reader.onload = (e) => shot8FileData = e.target.result;
        reader.readAsDataURL(file);
    }
};

// 4. Gửi Feedback
window.submitFB = async () => {
    const btn = document.getElementById('btnSubmitFB');
    const content = document.getElementById('fbDesc').value;
    if (!content.trim()) return alert("Vui lòng nhập nội dung chi tiết!");

    btn.disabled = true; 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';

    const payload = {
        type: "FEEDBACK",
        category: shot8Category === "APP" ? "Ứng dụng" : "Con người",
        subject: (shot8Category === "APP") ? document.getElementById('fbErrorType').value : document.getElementById('fbTarget').value,
        severity: document.getElementById('fbSevLabel').innerText,
        content: content,
        expectation: document.getElementById('fbExpect').value,
        isAnonymous: document.getElementById('fbAnon').checked,
        fileData: shot8FileData,
        fileName: shot8FileName
    };

    try {
        await fetch(GGS_URL_FEEDBACK, { 
            method: "POST", 
            mode: 'no-cors', 
            body: JSON.stringify(payload) 
        });
        alert("✅ Gửi phản hồi thành công!");
        location.reload(); // Hoặc gọi loadShot('shot8') để làm mới form
    } catch (e) {
        alert("❌ Lỗi mạng, vui lòng thử lại!");
        btn.disabled = false;
        btn.innerText = "Gửi phản hồi";
    }
};