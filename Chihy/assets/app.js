/**
 * CẤU HÌNH HỆ THỐNG
 * GGS_URL: Đường dẫn đến Google Apps Script xử lý dữ liệu
 * STORAGE_KEY/USER_DATA_KEY: Các khóa để lưu mã định danh và thông tin người dùng vào LocalStorage
 */
const CONFIG = {
  GGS_URL:
    "https://script.google.com/macros/s/AKfycbz36knkDmqMdVHCXoFhvQb4l6Ej2e9dsj0rLj7dD2km7XXshj2IaNy2o9-sCuHigvhN2w/exec",
  STORAGE_KEY: "Unime_UID",
  USER_DATA_KEY: "Unime_UserData",
  SIDEBAR_KEY: "sidebar-state",
};

// Khởi tạo ứng dụng khi toàn bộ HTML đã tải xong
document.addEventListener("DOMContentLoaded", () => {
  const app = new UnimeApp();
  app.init();
});

class UnimeApp {
  constructor() {
    // Khởi tạo các biến truy cập nhanh đến các phần tử giao diện chính
    this.contentArea = document.getElementById("content-area");
    this.actionSlot = document.getElementById("shot-actions-slot");
    this.headerTitle = document.getElementById("dynamic-header-title");
    this.sidebar = document.getElementById("sidebar");
    this.sidebarOverlay = document.getElementById("sidebar-overlay");
    this.loginOverlay = document.getElementById("login-overlay");
    this.appContainer = document.querySelector(".app-container");
  }

  // Hàm khởi chạy ứng dụng
  init() {
    this.setupEventListeners(); // Gán các sự kiện click, resize...
    this.checkAuth();           // Kiểm tra trạng thái đăng nhập
    this.restoreSidebarState(); // Khôi phục trạng thái đóng/mở của sidebar từ lần trước
  }

  // Thiết lập tất cả các sự kiện tương tác của người dùng
  setupEventListeners() {

    // Menu & Sidebar
    document
      .getElementById("menuToggleBtn")
      .addEventListener("click", () => this.handleMainToggle());
    this.sidebarOverlay?.addEventListener("click", () =>
      this.handleMainToggle(),
    );

    // Đăng nhập & Đăng xuất
    document
      .getElementById("btnLogin")
      .addEventListener("click", () => this.performLogin());
    document
      .getElementById("togglePassword")
      .addEventListener("click", () => this.togglePassword());
    document
      .getElementById("logoutBtn")
      .addEventListener("click", () => this.logout());

    // Nút xuất file (PDF và PNG)
    document
      .getElementById("exportPdfBtn")
      ?.addEventListener("click", (e) => handleExportPdf(e.currentTarget));
    document
      .getElementById("exportPngBtn")
      ?.addEventListener("click", (e) => handleExportPng(e.currentTarget));

    // Xử lý khi click vào các mục menu
    document.querySelectorAll(".menu-item").forEach((item) => {
      item.addEventListener("click", () => this.handleMenuClick(item));
    });

    // Xử lý đóng/mở các nhóm menu (Dropdown menu)
    document.querySelectorAll(".group-header").forEach((header) => {
      header.addEventListener("click", () =>
        header.parentElement.classList.toggle("active"),
      );
    });

    // Các sự kiện click toàn cục (ví dụ: phóng to ảnh)
    document.addEventListener("click", (e) => this.handleGlobalClicks(e));

    // Xử lý khi thay đổi kích thước màn hình
    window.addEventListener("resize", () => {
      const currentShot = localStorage.getItem("currentShot") || "welcome";
      this.updateUIState(currentShot);
    });
  }

  /**
   * CẬP NHẬT TRẠNG THÁI GIAO DIỆN (HEADER & NÚT XUẤT FILE)
   * Ẩn các nút export trên điện thoại hoặc ở các trang không có dữ liệu bảng
   */
  updateUIState(shotId) {
    const pdfBtn = document.getElementById("exportPdfBtn");
    const pngBtn = document.getElementById("exportPngBtn");
    const hiddenShots = ["shot7", "welcome", "shot8"];

    const isMobile = window.innerWidth <= 1024;
    const isHiddenShot = hiddenShots.includes(shotId);

    // Điều khiển ẩn hiện nút xuất file
    [pdfBtn, pngBtn].forEach((btn) => {
      if (btn) {
        if (isMobile || isHiddenShot) {
          btn.style.setProperty("display", "none", "important");
        } else {
          btn.style.setProperty("display", "flex", "important");
        }
      }
    });

    // Đánh dấu mục menu đang được chọn (Active)
    document
      .querySelectorAll(".menu-item")
      .forEach((m) => m.classList.remove("active"));
    const activeMenu = document.querySelector(
      `.menu-item[data-shot="${shotId}"]`,
    );

    if (activeMenu) {
      activeMenu.classList.add("active");
      if (this.headerTitle)
        this.headerTitle.innerText = activeMenu.getAttribute("data-title");
    } else if (shotId === "welcome") {
      if (this.headerTitle) this.headerTitle.innerText = "WELCOME";
    }
  }

  /**
   * PHÂN QUYỀN NGƯỜI DÙNG
   * Ẩn/Hiện các menu dựa trên quyền (rights) mà Google Sheets trả về
   */
  applyPermissions(user) {
    if (!user) return;
    const rights = user.rights || {};
    const name = String(user.name || "Thành viên").trim();
    const nameDisplay = name !== "" ? name : "Thành viên";

    // Hiển thị tên người dùng lên giao diện
    if (document.getElementById("display-user-name"))
      document.getElementById("display-user-name").innerText = nameDisplay;
    if (document.getElementById("user-welcome-name"))
      document.getElementById("user-welcome-name").innerText = nameDisplay;

     // Duyệt qua từng menu để ẩn/hiện
    document.querySelectorAll(".menu-item[data-shot]").forEach((item) => {
      const shotId = item.getAttribute("data-shot");
      const perm = (rights[shotId] || "").toString().toLowerCase().trim();
      const isAllowed = perm === "root" || perm === "view";
      item.style.setProperty(
        "display",
        isAllowed ? "flex" : "none",
        "important",
      );
    });

    // Ẩn cả nhóm menu nếu bên trong không có mục nào được phép xem
    document.querySelectorAll(".menu-group").forEach((group) => {
      const hasVisible = Array.from(
        group.querySelectorAll(".menu-item[data-shot]"),
      ).some((child) => child.style.display !== "none");
      group.style.setProperty(
        "display",
        hasVisible ? "block" : "none",
        "important",
      );
    });
  }

  // Kiểm tra đăng nhập khi vừa tải trang
  checkAuth() {
    const uid = localStorage.getItem(CONFIG.STORAGE_KEY);
    const cachedUser = localStorage.getItem(CONFIG.USER_DATA_KEY);

    if (uid && cachedUser) {
      const user = JSON.parse(cachedUser);
      this.applyPermissions(user);
      this.loginOverlay.classList.add("hidden");
      this.appContainer.classList.remove("hidden");

      // Khôi phục trang cuối cùng người dùng xem
      let lastShotId = localStorage.getItem("currentShot") || "welcome";
      const userPerm = (user.rights[lastShotId] || "")
        .toString()
        .toLowerCase()
        .trim();
      // Nếu trang cũ không có quyền truy cập thì quay về 'welcome'
      if (
        !(userPerm === "root" || userPerm === "view") &&
        lastShotId !== "welcome"
      ) {
        lastShotId = "welcome";
      }

      this.updateUIState(lastShotId);
      this.loadPage(lastShotId);
      this.silentCheckAuth(uid); // Kiểm tra ngầm quyền truy cập từ server
    }
  }

  // Xử lý quy trình đăng nhập
  async performLogin(forcedUid = null) {
    const uidInput = document.getElementById("login-uid");
    const btn = document.getElementById("btnLogin");
    const uid = forcedUid || uidInput.value.trim().toUpperCase();
    if (!uid) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> XÁC THỰC...';

    try {
      // Gọi API Google Scripts để lấy thông tin user
      const res = await fetch(`${CONFIG.GGS_URL}?action=getRole&uid=${uid}`);
      const user = await res.json();
      if (user && user.rights) {
        localStorage.setItem(CONFIG.STORAGE_KEY, uid);
        localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(user));
        this.applyPermissions(user);
        this.loginOverlay.classList.add("hidden");
        this.appContainer.classList.remove("hidden");
        this.updateUIState("welcome");
        this.loadPage("welcome");
      } else {
        alert("Mã CODE không tồn tại!");
      }
    } catch (e) {
      alert("Lỗi kết nối!");
    } finally {
      btn.disabled = false;
      btn.innerText = "ĐĂNG NHẬP";
    }
  }

  // Khi click vào mục menu bên trái
  handleMenuClick(item) {
    const shotId = item.getAttribute("data-shot");
    if (!shotId) return;
    this.updateUIState(shotId);
    if (window.innerWidth <= 992) this.handleMainToggle();// Tự đóng sidebar trên mobile sau khi chọn
    this.loadPage(shotId);
  }

  /**
   * TẢI TRANG ĐỘNG (SPA ENGINE)
   * Tải file HTML, CSS và JS của từng "Shot" mà không load lại toàn bộ web
   */
  async loadPage(shotName) {
    if (!shotName) return;
    const loader = document.getElementById("page-loader");
    const content = this.contentArea;

    if (loader) loader.classList.remove("hidden");
    content.style.transition = "none";
    content.style.opacity = "0";
    content.innerHTML = "";// Xóa nội dung cũ
    if (this.actionSlot) this.actionSlot.innerHTML = "";

    try {
      const path = `shots/${shotName}/${shotName}`;
      // Xóa CSS/JS của trang cũ để tránh xung đột
      ["shot-css", "shot-js"].forEach((id) =>
        document.getElementById(id)?.remove(),
      );
      // Tải đồng thời HTML và CSS
      const [htmlRes] = await Promise.all([
        fetch(`${path}.html?t=${Date.now()}`),
        new Promise((resolve) => {
          const link = document.createElement("link");
          link.id = "shot-css";
          link.rel = "stylesheet";
          link.href = `${path}.css?t=${Date.now()}`;
          link.onload = resolve;
          link.onerror = resolve;
          document.head.appendChild(link);
        }),
      ]);

      const htmlText = await htmlRes.text();
      const doc = new DOMParser().parseFromString(htmlText, "text/html");
      const shotActions = doc.querySelector(".shot-actions");// Phần nút bấm thêm trên header
      const shotBody = doc.querySelector(".shot-body");// Nội dung chính
      const mainHeader = document.querySelector(".main-header");

      // Nếu trang có các nút chức năng riêng, đẩy chúng lên header
      if (
        this.actionSlot &&
        shotActions &&
        shotActions.innerHTML.trim() !== ""
      ) {
        this.actionSlot.innerHTML = shotActions.innerHTML;
        mainHeader?.classList.add("has-nav-actions");
      } else {
        mainHeader?.classList.remove("has-nav-actions");
      }

      content.innerHTML = shotBody ? shotBody.innerHTML : htmlText;
      if (loader) loader.classList.add("hidden");

      // Hiệu ứng mờ dần khi hiện nội dung mới
      requestAnimationFrame(() => {
        content.style.transition = "opacity 0.25s ease";
        content.style.opacity = "1";
      });

      // Tải và chạy file JS của trang đó
      const script = document.createElement("script");
      script.id = "shot-js";
      script.src = `${path}.js?t=${Date.now()}`;
      script.onload = () => {
        if (typeof window[`${shotName}Init`] === "function")
          window[`${shotName}Init`]();
      };
      document.body.appendChild(script);
      localStorage.setItem("currentShot", shotName);
    } catch (e) {
      console.error("LoadPage Error:", e);
      if (loader) loader.classList.add("hidden");
      content.style.opacity = "1";
    }
  }

  // Đóng/Mở thanh menu bên trái
  handleMainToggle() {
    const isMobile = window.innerWidth <= 1024;
    const overlay = document.getElementById("sidebar-overlay");
    if (isMobile) {
      const isOpen = this.sidebar.classList.toggle("mobile-active");
      overlay?.classList.toggle("active", isOpen);
    } else {
      this.sidebar.classList.toggle("collapsed");
      // Lưu trạng thái mini/full để lần sau mở lại đúng như vậy
      localStorage.setItem(
        CONFIG.SIDEBAR_KEY,
        this.sidebar.classList.contains("collapsed") ? "mini" : "full",
      );
    }
  }

  // Khôi phục trạng thái sidebar từ bộ nhớ
  restoreSidebarState() {
    if (localStorage.getItem(CONFIG.SIDEBAR_KEY) === "mini")
      this.sidebar.classList.add("collapsed");
  }

  // Hiện/Ẩn mật khẩu (UID) ở màn hình đăng nhập
  togglePassword() {
    const input = document.getElementById("login-uid");
    input.type = input.type === "password" ? "text" : "password";
    document.getElementById("togglePassword").classList.toggle("fa-eye");
  }

  // Xử lý các click vào ảnh để xem ảnh lớn (Lightbox)
  handleGlobalClicks(e) {
    if (
      e.target.tagName === "IMG" &&
      e.target.classList.contains("img-previewable")
    ) {
      const modal = document.getElementById("imageModal");
      document.getElementById("imgFull").src = e.target.src;
      modal?.classList.add("active");
      document.body.style.overflow = "hidden";
    }
    if (
      e.target.classList.contains("close-modal") ||
      e.target.id === "imageModal"
    ) {
      document.getElementById("imageModal")?.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  // Kiểm tra quyền ngầm (không làm gián đoạn người dùng)
  async silentCheckAuth(uid) {
    try {
      const res = await fetch(`${CONFIG.GGS_URL}?action=getRole&uid=${uid}`);
      const user = await res.json();
      if (user && user.rights) {
        localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(user));
        this.applyPermissions(user);
      } else {
        this.forceLogout();
      }
    } catch (e) {}
  }

  logout() {
    if (confirm("Đăng xuất?")) this.forceLogout();
  }
  forceLogout() {
    localStorage.clear();
    location.reload();
  }
}
/**
 * HÀM HỖ TRỢ XUẤT ẢNH PNG
 * Áp dụng các style đặc biệt để khi chụp ảnh bảng không bị lỗi layout
 */
function applyPngExportStyles(contentEl, tableW, finalW) {
  // 1. Ép container giãn hết & không cắt nội dung
  contentEl.style.setProperty("width", finalW + "px", "important");
  contentEl.style.setProperty("max-width", "none", "important");
  contentEl.style.setProperty("height", "auto", "important");
  contentEl.style.setProperty("min-height", "0", "important");
  contentEl.style.setProperty("max-height", "none", "important");
  contentEl.style.setProperty("overflow", "visible", "important");
  contentEl.style.setProperty("margin", "0", "important");

  // 2. Bỏ hiệu ứng gây mờ/lệch
  contentEl.querySelectorAll("*").forEach((el) => {
    el.style.transform = "none";
    el.style.transition = "none";
    el.style.animation = "none";
    el.style.filter = "none";
  });

  // 3. Khung cuộn bảng: không được cắt (bỏ overflow-x: auto)
  const scrollBox = contentEl.querySelector(".table-scroll");
  if (scrollBox) {
    scrollBox.style.setProperty("overflow", "visible", "important");
    scrollBox.style.setProperty("width", "auto", "important");
    scrollBox.style.setProperty("max-width", "none", "important");
  }

  // 4. Khóa chiều rộng bảng đúng bằng kích thước đo được
  //    -> tránh table-layout:auto tự giãn thêm làm mất cột bên phải
  const tbl = contentEl.querySelector("table");
  if (tbl) {
    tbl.style.setProperty("width", tableW + "px", "important");
    tbl.style.setProperty("min-width", tableW + "px", "important");
    tbl.style.setProperty("max-width", tableW + "px", "important");
  }

  // 5. Canh lề + padding cho từng ô (thao tác trực tiếp trên DOM)
  const BADGE_COLORS = {
    "badge-open": "#ca8a04",
    "badge-process": "#16a34a",
    "badge-pending": "#dc2626",
    "badge-done": "#0891b2",
    "badge-deploy": "#0891b2",
    "badge-new": "#d39236",
    "badge-close": "#64748b",
  };

  const colCount = contentEl.querySelectorAll("tr")[0]?.cells?.length || 11;
  contentEl.querySelectorAll("td").forEach((td, i) => {
    td.style.verticalAlign = "middle";
    td.style.height = "auto";
    td.style.padding = "8px 10px";
    td.style.lineHeight = "1.4";

    const colsCenter = [2,6, 8, 9, 10, 11];  // Các cột cần căn giữa
    const colsLeft = [1,3,4, 5, 7];
    const colIdx = (i % colCount) + 1;
    if (colsCenter.includes(colIdx)) td.style.textAlign = "center";
    else if (colsLeft.includes(colIdx)) td.style.textAlign = "left";

    Array.from(td.children).forEach((child) => {
      if (child.tagName !== "SPAN" && child.tagName !== "A") {
        child.style.display = "inline-block";
      }
      child.style.verticalAlign = "middle";
    });
  });

  // Áp màu trực tiếp cho các nhãn trạng thái (Badge)
  contentEl.querySelectorAll(".status-badge").forEach((badge) => {
    badge.style.display = "inline-block";
    badge.style.borderRadius = "20px";
    badge.style.padding = "3px 10px";
    badge.style.minWidth = "75px";
    badge.style.textAlign = "center";
    badge.style.fontSize = "10px";
    badge.style.color = "white";
    badge.style.verticalAlign = "middle";
    badge.style.lineHeight = "1.4";
    badge.style.whiteSpace = "nowrap";
    badge.style.border = "1px solid rgba(0,0,0,0.1)";

    for (const [cls, color] of Object.entries(BADGE_COLORS)) {
      if (badge.classList.contains(cls)) {
        badge.style.backgroundColor = color;
        break;
      }
    }
  });
}

/**
 * XỬ LÝ XUẤT PNG
 */
async function handleExportPng(btn) {
  // 1. CHỌN VÙNG DỮ LIỆU CHÍNH
  const source =
    document.getElementById("content-area") ||
    document.querySelector(".main-content");
  const table = source ? source.querySelector("table") : null;
  if (!table) return alert("Không tìm thấy dữ liệu bảng!");

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Đang vẽ ảnh...';

  let ghostWrap = null;
  try {
    await document.fonts.ready;

    // --- BƯỚC 1: ĐO CHIỀU RỘNG THẬT CỦA BẢNG + PADDING ---
    const tableW = Math.ceil(table.getBoundingClientRect().width);
    const cs = getComputedStyle(source);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const finalW = tableW + padL + padR;

    // --- BƯỚC 2: ĐO CHIỀU CAO SAU KHI ĐÃ ÁP STYLE XUẤT (offscreen) ---
    // Style xuất (padding ô 8px, line-height 1.4...) làm mỗi dòng CAO HƠN lúc
    // hiển thị. Nếu đo trên DOM gốc rồi crop theo đó -> thiếu chiều cao -> mất
    // dòng cuối. Vì vậy clone ra ngoài màn hình, áp đúng style rồi đo lại.
    const ghost = source.cloneNode(true);
    ghost.removeAttribute("id"); // tránh trùng id với DOM gốc
    ghostWrap = document.createElement("div");
    ghostWrap.style.cssText =
      "position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;z-index:-1;";
    ghostWrap.style.width = finalW + "px";
    document.body.appendChild(ghostWrap);
    ghostWrap.appendChild(ghost);
    applyPngExportStyles(ghost, tableW, finalW);
    await document.fonts.ready;
    const finalH = Math.ceil(ghost.scrollHeight) + 8; // +8px đệm an toàn
    document.body.removeChild(ghostWrap);
    ghostWrap = null;

    console.log("Kích thước xuất:", finalW, "x", finalH);

    // --- BƯỚC 3: VẼ ---
    const canvas = await html2canvas(source, {
      scale: 1.5, // Giảm xuống 1.5 để tránh lỗi bộ nhớ (trắng màn hình/crash)
      useCORS: true,
      backgroundColor: "#ffffff",
      width: finalW,
      height: finalH,
      windowWidth: finalW,
      windowHeight: finalH,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        const clonedSource =
          clonedDoc.getElementById("content-area") ||
          clonedDoc.querySelector(".main-content");

        // Ẩn sidebar / header / nút
        clonedDoc
          .querySelectorAll(
            ".sidebar, .main-header, header, button, .actions, .no-export, #menuToggleBtn, .right-side, #sidebar-overlay, .sidebar-overlay",
          )
          .forEach((el) => {
            el.style.display = "none";
          });

        // Ép các container cha giãn hết
        [
          clonedDoc.querySelector(".app-container"),
          clonedDoc.querySelector(".main-content"),
        ].forEach((el) => {
          if (!el) return;
          el.style.setProperty("width", finalW + "px", "important");
          el.style.setProperty("max-width", "none", "important");
          el.style.setProperty("height", "auto", "important");
          el.style.setProperty("min-height", "0", "important");
          el.style.setProperty("max-height", "none", "important");
          el.style.setProperty("overflow", "visible", "important");
          el.style.setProperty("margin", "0", "important");
        });

        // Áp CHÍNH XÁC cùng bộ style đã dùng để đo chiều cao
        applyPngExportStyles(clonedSource, tableW, finalW);
      },
    });

    // TẢI ẢNH
    const link = document.createElement("a");
    link.download = `Umer_Digital_Report_${new Date().getTime()}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
  } catch (e) {
    console.error("Lỗi trích xuất:", e);
    alert("Lỗi xuất ảnh! Vui lòng cuộn lên đầu trang và thử lại lần nữa.");
  } finally {
    if (ghostWrap && ghostWrap.parentNode) ghostWrap.parentNode.removeChild(ghostWrap);
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

/**
 * XỬ LÝ XUẤT PDF
 */
async function handleExportPdf(btn) {
  const source =
    document.querySelector(".main-content") ||
    document.getElementById("content-area");

  if (!source) return;

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Đang xử lý PDF...';

  try {
    await document.fonts.ready;
    const canvas = await html2canvas(source, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 1920,
      onclone: (clonedDoc) => {
        const clonedSource =
          clonedDoc.querySelector(".main-content") ||
          clonedDoc.getElementById("content-area");

        // Ép hiện rõ 100% (Fix mờ nhạt)
        clonedSource.querySelectorAll("*").forEach((el) => {
          el.style.opacity = "1";
          el.style.transition = "none";
          el.style.animation = "none";
          el.style.transform = "none";
          el.style.filter = "none";
        });

        // Ép giãn hết chiều cao (Fix cắt chữ)
        let curr = clonedSource;
        while (curr && curr !== clonedDoc.documentElement) {
          curr.style.overflow = "visible";
          curr.style.height = "auto";
          curr.style.maxHeight = "none";
          curr = curr.parentElement;
        }

        // ẨN CÁC THÀNH PHẦN KHÔNG CẦN EXPORT
        const style = clonedDoc.createElement("style");
        style.innerHTML = `
                  .sidebar, .no-export, .nav-tabs, .actions { display: none !important; visibility: hidden !important; }
                  header { position: static !important; width: 100% !important; border: none !important; }
                  body { overflow: visible !important; height: auto !important; background: #fff !important; }
                  .main-content { padding: 0 !important; margin: 0 !important; }
              `;
        clonedDoc.head.appendChild(style);

        // THAO TÁC TRỰC TIẾP TRÊN DOM — đáng tin cậy hơn inject CSS với html2canvas
        const BADGE_COLORS = {
          "badge-open": "#ca8a04",
          "badge-process": "#16a34a",
          "badge-pending": "#dc2626",
          "badge-done": "#0891b2",
          "badge-deploy": "#0891b2",
          "badge-new": "#d39236",
          "badge-close": "#64748b",
        };

        clonedSource.querySelectorAll("td").forEach((td) => {
          // Canh giữa dọc trực tiếp trên td
          td.style.verticalAlign = "middle";
          td.style.height = "auto";

          // Ép wrapper trực tiếp bên trong td thành inline-block để vertical-align hoạt động
          Array.from(td.children).forEach((child) => {
            if (child.tagName !== "SPAN" && child.tagName !== "A") {
              child.style.display = "inline-block";
            }
            child.style.verticalAlign = "middle";
          });
        });

        clonedSource.querySelectorAll(".status-badge").forEach((badge) => {
          // Áp style trực tiếp — bypass html2canvas CSS specificity issue
          badge.style.display = "inline-block";
          badge.style.borderRadius = "20px";
          badge.style.padding = "3px 10px";
          badge.style.minWidth = "75px";
          badge.style.textAlign = "center";
          badge.style.fontSize = "10px";
          badge.style.color = "white";
          badge.style.verticalAlign = "middle";
          badge.style.lineHeight = "1.4";
          badge.style.whiteSpace = "nowrap";
          badge.style.border = "1px solid rgba(0,0,0,0.1)";

          // Áp màu nền trực tiếp theo class
          for (const [cls, color] of Object.entries(BADGE_COLORS)) {
            if (badge.classList.contains(cls)) {
              badge.style.backgroundColor = color;
              break;
            }
          }
        });
      },
    });

    const { jsPDF } = window.jspdf;
    const imgWidth = canvas.width / 2;
    const imgHeight = canvas.height / 2;

    const pdf = new jsPDF({
      orientation: imgWidth > imgHeight ? "l" : "p",
      unit: "px",
      format: [imgWidth, imgHeight],
      hotfixes: ["px_scaling"],
      compress: true,
    });

    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight, undefined, "FAST");

    const timestamp = new Date().getTime();
    pdf.save(`Umer_dms_pdf_${timestamp}.pdf`);
  } catch (e) {
    console.error("Lỗi PDF:", e);
    alert("Lỗi xuất PDF!");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}
