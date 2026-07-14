/**
 * SHOT 2 JS - STABLE LOAD
 */
(function() {
    console.log("Shot 2 Ready - Ratio 4:6 Fixed");

    // Chỉ cuộn mượt khi người dùng click
    var cards = document.querySelectorAll('.timeline-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            // Đợi CSS nở ra 300ms rồi mới cuộn
            setTimeout(() => {
                var parent = card.closest('.timeline-item');
                if (parent && parent.classList.contains('active')) {
                    parent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 300);
        });
    });
})();