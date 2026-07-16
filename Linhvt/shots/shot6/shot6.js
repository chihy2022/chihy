window.shot6Init = function() {
    console.log("🚀 Shot 6: Engine Started...");

    try {
        const actionSlot = document.getElementById('shot-actions-slot');
        const contentArea = document.getElementById('content-area');
        
        if (!contentArea) {
            console.error("Không tìm thấy content-area");
            return;
        }

        // 1. XỬ LÝ CLICK CUỘN MƯỢT
        // Đợi một chút để các nút trên Header được nạp xong
        setTimeout(() => {
            const navBtns = document.querySelectorAll('.btn-nav-scroll');
            
            navBtns.forEach(btn => {
                btn.onclick = function(e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('data-target');
                    const targetEl = document.getElementById(targetId);
                    
                    if (targetEl) {
                        // Cuộn vùng chứa nội dung đến vị trí section
                        // Đã có scroll-margin-top trong CSS nên không lo bị che header
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        
                        // Cập nhật class active thủ công ngay khi bấm
                        navBtns.forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                    }
                };
            });
        }, 100);

        // 2. XỬ LÝ SCROLL SPY (TỰ ĐỘNG FOCUS NÚT KHI CUỘN)
        const sections = document.querySelectorAll('.content-section');
        const navBtns = document.querySelectorAll('.btn-nav-scroll');

        if (sections.length > 0 && 'IntersectionObserver' in window) {
            const observerOptions = {
                root: contentArea,
                rootMargin: '-20% 0px -70% 0px', // Nhận diện khi section nằm ở vùng phía trên
                threshold: 0
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.getAttribute('id');
                        // Tìm và active nút có data-target khớp với ID đang xem
                        const activeBtn = document.querySelector(`.btn-nav-scroll[data-target="${id}"]`);
                        if (activeBtn) {
                            document.querySelectorAll('.btn-nav-scroll').forEach(b => b.classList.remove('active'));
                            activeBtn.classList.add('active');
                            // Tự động cuộn thanh chứa nút nếu bị tràn trên mobile
                            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        }
                    }
                });
            }, observerOptions);

            sections.forEach(section => observer.observe(section));
        }

        // 3. HIỆU ỨNG ROADMAP
        const steps = document.querySelectorAll('.s6-step-box');
        steps.forEach((step, idx) => {
            step.style.opacity = '0';
            step.style.transform = 'translateY(15px)';
            setTimeout(() => {
                step.style.transition = 'all 0.5s ease-out';
                step.style.opacity = '1';
                step.style.transform = 'translateY(0)';
            }, 100 * idx);
        });

    } catch (err) {
        console.error("Lỗi trong shot6Init:", err);
    }
};