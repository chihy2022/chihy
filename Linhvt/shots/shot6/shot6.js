(function() {
    console.log("🚀 Shot 6: POSM Inventory Loaded.");
    
    // Tự động mở Step đầu tiên cho chuyên nghiệp
    setTimeout(() => {
        var firstStep = document.querySelector('.timeline-item');
        if (firstStep) firstStep.classList.add('active');
    }, 500);

    // Xử lý click Card cuộn mượt (Sử dụng selector timeline-card mới)
    var cards = document.querySelectorAll('.timeline-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            setTimeout(() => {
                var parent = card.closest('.timeline-item');
                if (parent && parent.classList.contains('active')) {
                    parent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 350);
        });
    });
})();