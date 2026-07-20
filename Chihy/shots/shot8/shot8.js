window.shot8Init = function() {
    const GGS_URL = "https://script.google.com/macros/s/AKfycbz36knkDmqMdVHCXoFhvQb4l6Ej2e9dsj0rLj7dD2km7XXshj2IaNy2o9-sCuHigvhN2w/exec?sheet=Goc_phanhoi";
    
    let fileData = "";
    let fileName = "";
    let category = "Ứng dụng";

    // --- DOM Elements ---
    const sevRange = document.getElementById('fbSevRange');
    const sevLabel = document.getElementById('fbSevLabel');
    const btnApp = document.getElementById('btnApp');
    const btnPeople = document.getElementById('btnPeople');
    const boxApp = document.getElementById('boxApp');
    const boxPeople = document.getElementById('boxPeople');
    const btnSubmit = document.getElementById('btnSubmitFB');
    const fileInput = document.getElementById('fbFile');

    // 1. Logic cập nhật Slider (Màu sắc & Label)
    const updateSev = (val) => {
        const texts = ["Thấp", "Trung bình", "Cao", "Khẩn cấp"];
        const colors = ["#10b981", "#00599a", "#f59e0b", "#d93025"];
        const idx = val - 1;

        if (sevLabel) {
            sevLabel.innerText = texts[idx];
            sevLabel.style.color = colors[idx];
        }

        const percent = (idx / 3) * 100;
        sevRange.style.background = `linear-gradient(to right, ${colors[idx]} 0%, ${colors[idx]} ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`;
        sevRange.style.setProperty('--thumb-color', colors[idx]);
    };

    // 2. Sự kiện Slider
    sevRange.addEventListener('input', (e) => updateSev(e.target.value));

    // 3. Sự kiện chuyển Tab
    const switchTab = (cat) => {
        category = (cat === 'APP') ? "Ứng dụng" : "Con người";
        btnApp.classList.toggle('active', cat === 'APP');
        btnPeople.classList.toggle('active', cat === 'PEOPLE');
        boxApp.style.display = (cat === 'APP') ? 'block' : 'none';
        boxPeople.style.display = (cat === 'PEOPLE') ? 'block' : 'none';
    };

    btnApp.addEventListener('click', () => switchTab('APP'));
    btnPeople.addEventListener('click', () => switchTab('PEOPLE'));

    // 4. Xử lý File đính kèm
    document.getElementById('btnFileTrigger').addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            if (file.size > 15 * 1024 * 1024) { alert("File tối đa 15MB"); return; }
            document.getElementById('fbFileName').innerText = "📎 Đã chọn: " + file.name;
            fileName = file.name;
            const reader = new FileReader();
            reader.onload = (e) => fileData = e.target.result;
            reader.readAsDataURL(file);
        }
    });

    // 5. Gửi Phản Hồi
    btnSubmit.addEventListener('click', async function() {
        const desc = document.getElementById('fbDesc').value;
        if (!desc.trim()) return alert("Vui lòng mô tả nội dung chi tiết!");

        this.disabled = true;
        const originalHTML = this.innerHTML;
        this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';

        const payload = {
            type: "FEEDBACK",
            category: category,
            subject: (category === "Ứng dụng") ? document.getElementById('fbErrorType').value : document.getElementById('fbTarget').value,
            severity: sevLabel.innerText,
            content: desc,
            expectation: document.getElementById('fbExpect').value,
            isAnonymous: document.getElementById('fbAnon').checked,
            fileData: fileData,
            fileName: fileName,
            uid: localStorage.getItem('Unime_UID') || 'Guest'
        };

        try {
            await fetch(GGS_URL, { method: "POST", mode: 'no-cors', body: JSON.stringify(payload) });
            alert("✅ Cảm ơn bạn! Phản hồi đã được gửi đi.");
            // Reset form thay vì reload trang
            document.getElementById('fbDesc').value = "";
            document.getElementById('fbExpect').value = "";
            document.getElementById('fbFileName').innerText = "";
            fileData = ""; fileName = "";
        } catch (e) {
            alert("Lỗi kết nối!");
        } finally {
            this.disabled = false;
            this.innerHTML = originalHTML;
        }
    });

    // Chạy khởi tạo UI ngay lập tức
    updateSev(sevRange.value);
};