window.welcomeInit = function() {
    // 1. Hiển thị tên User
    const userData = localStorage.getItem("Unime_UserData");
    if (userData) {
        const user = JSON.parse(userData);
        const nameEl = document.getElementById('user-welcome-name');
        if (nameEl) nameEl.innerText = user.name;
    }
}