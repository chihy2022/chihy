window.shot6Init = function() {
    console.log("🚀 Shot 6: POSM Inventory Full Setup Initialized.");

    // Scroll smoothly to top
    const contentArea = document.getElementById('content-area');
    if (contentArea) {
        contentArea.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Animation for Roadmap steps
    const steps = document.querySelectorAll('.s6-step-box');
    steps.forEach((step, index) => {
        step.style.opacity = '0';
        step.style.transform = 'translateY(20px)';
        setTimeout(() => {
            step.style.transition = 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
            step.style.opacity = '1';
            step.style.transform = 'translateY(0)';
        }, 150 * (index + 1));
    });
};