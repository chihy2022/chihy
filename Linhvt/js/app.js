const overlay = document.getElementById("overlay");
const closeBtn = document.querySelector(".close-btn");

closeBtn.onclick = () => {
    overlay.classList.remove("show");
};

overlay.onclick = (e) => {
    if (e.target === overlay) {
        overlay.classList.remove("show");
    }
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        overlay.classList.remove("show");
    }
});