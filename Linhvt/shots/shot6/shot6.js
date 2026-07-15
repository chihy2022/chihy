window.shot6Init = function() {
    console.log("🚀 Shot 6: Nav Scroll Initialized.");

    // 1. Tìm các nút trên Header (Lúc này đã được app.js render vào slot)
    const actionSlot = document.getElementById('shot-actions-slot');
    const scrollBtns = actionSlot.querySelectorAll('.btn-nav-scroll');
    const contentArea = document.getElementById('content-area');

    scrollBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);

            if (targetEl && contentArea) {
                // Tính toán vị trí cuộn (trừ đi một chút lề trên cho đẹp)
                const offsetTop = targetEl.offsetTop - 20;

                contentArea.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });

                // Hiệu ứng Active nhẹ cho nút
                scrollBtns.forEach(b => b.style.opacity = '0.6');
                this.style.opacity = '1';
            }
        });
    });

    // 2. Hiệu ứng xuất hiện cho Roadmap (như cũ)
    const steps = document.querySelectorAll('.s6-step-box');
    steps.forEach((step, index) => {
        step.style.opacity = '0';
        step.style.transform = 'translateY(20px)';
        setTimeout(() => {
            step.style.transition = 'all 0.5s ease-out';
            step.style.opacity = '1';
            step.style.transform = 'translateY(0)';
        }, 100 * (index + 1));
    });
};