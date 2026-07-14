// Biến toàn cục cho Shot 8
let s8FileData = "";
let s8FileName = "";
let s8Category = "Ứng dụng";

var GGS_LINK_FB = "https://script.google.com/macros/s/AKfycbz36knkDmqMdVHCXoFhvQb4l6Ej2e9dsj0rLj7dD2km7XXshj2IaNy2o9-sCuHigvhN2w/exec?sheet=Goc_phanhoi";

// 1. Chuyển đổi Tab
window.switchFB = (cat) => {
    s8Category = (cat === 'APP') ? "Ứng dụng" : "Con người";
    document.getElementById('btnApp').classList.toggle('active', cat === 'APP');
    document.getElementById('btnPeople').classList.toggle('active', cat === 'PEOPLE');
    document.getElementById('boxApp').style.display = (cat === 'APP') ? 'block' : 'none';
    document.getElementById('boxPeople').style.display = (cat === 'PEOPLE') ? 'block' : 'none';
};

// 2. Cập nhật mức độ (Đổi màu Line & Thumb)
window.updateSev = (val) => {
    var texts = ["Thấp", "Trung bình", "Cao", "Khẩn cấp"];
    var colors = ["#10b981", "#00599a", "#f59e0b", "#d93025"];
    
    var label = document.getElementById('fbSevLabel');
    var slider = document.getElementById('fbSevRange');

    if(label) {
        label.innerText = texts[val - 1];
        label.style.color = colors[val - 1];
    }

    // Tính % để tô màu thanh line
    var percent = ((val - 1) / (slider.max - slider.min)) * 100;
    var activeColor = colors[val - 1];
    
    slider.style.background = `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`;
    slider.style.setProperty('--thumb-color', activeColor);
};

// 3. Xử lý File đính kèm
window.onFileChange = () => {
    var file = document.getElementById('fbFile').files[0];
    var nameLabel = document.getElementById('fbFileName');
    if (file) {
        if(file.size > 15 * 1024 * 1024) { alert("Dung lượng file tối đa 15MB"); return; }
        s8FileName = file.name;
        nameLabel.innerText = "📎 Đã chọn: " + file.name;
        var reader = new FileReader();
        reader.onload = (e) => s8FileData = e.target.result;
        reader.readAsDataURL(file);
    }
};

// 4. Gửi dữ liệu
window.submitFB = async () => {
    var content = document.getElementById('fbDesc').value;
    var btn = document.getElementById('btnSubmitFB');

    if (!content.trim()) return alert("Vui lòng mô tả chi tiết nội dung phản hồi!");

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';

    var payload = {
        type: "FEEDBACK",
        category: s8Category,
        subject: (s8Category === "Ứng dụng") ? document.getElementById('fbErrorType').value : document.getElementById('fbTarget').value,
        severity: document.getElementById('fbSevLabel').innerText,
        content: content,
        expectation: document.getElementById('fbExpect').value,
        isAnonymous: document.getElementById('fbAnon').checked,
        fileData: s8FileData,
        fileName: s8FileName
    };

    try {
        await fetch(GGS_LINK_FB, { method: "POST", mode: 'no-cors', body: JSON.stringify(payload) });
        alert("✅ Gửi phản hồi thành công. Cảm ơn sự đóng góp của bạn!");
        location.reload(); 
    } catch (e) {
        alert("Có lỗi kết nối. Vui lòng thử lại!");
        btn.disabled = false;
        btn.innerText = "Gửi phản hồi";
    }
};

// Khởi tạo slider lúc mới nạp
setTimeout(() => {
    var s = document.getElementById('fbSevRange');
    if(s) updateSev(s.value);
}, 300);