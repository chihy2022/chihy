/**
 * CẤU HÌNH HỆ THỐNG
 * GGS_URL: Đường dẫn đến Google Apps Script xử lý dữ liệu
 * STORAGE_KEY/USER_DATA_KEY: Các khóa để lưu mã định danh và thông tin người dùng vào LocalStorage
 */
const CONFIG = {
  GGS_URL:
    "https://script.google.com/macros/s/AKfycbw71ByZYOTRfNV5fzfL6C_JCSHo3eTbTGAoJ43U4mkSHGhrLtjC8cj1dwAE87521p1MbQ/exec",
  STORAGE_KEY: "Unime_UID",
  USER_DATA_KEY: "Unime_UserData",
  SIDEBAR_KEY: "sidebar-state",
  // Đường dẫn CSS CHUNG - dùng chung cho MỌI shot. Sửa lại path này cho đúng
  // với vị trí thực tế của file style.css so với index.html gốc.
  SHARED_CSS_PATH: "style.css", // add
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
    
    // 1. Xử lý nút Xuất PDF
    document.getElementById("exportPdfBtn")?.addEventListener("click", (e) => {
        // ĐÓNG MENU NGAY LẬP TỨC
        document.getElementById("dotsMenuContent")?.classList.remove("show");
        
        // Sau đó mới chạy hàm xuất
        handleExportPdf(e.currentTarget);
    });

    // 2. Xử lý nút Xuất PNG
    document.getElementById("exportPngBtn")?.addEventListener("click", (e) => {
        // ĐÓNG MENU NGAY LẬP TỨC
        document.getElementById("dotsMenuContent")?.classList.remove("show");
        
        // Sau đó mới chạy hàm xuất
        handleExportPng(e.currentTarget);
    });

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
   * ĐẢM BẢO CSS CHUNG (dùng cho MỌI shot: --chihy-blue, .modern-table,
   * .row-parent, .status-chip, màu badge...) LUÔN được nạp, bất kể vào
   * bằng cách nào (F5 hay điều hướng qua menu SPA).
   *
   * Trước đây shot4.html có 3 <link> trong <head> (style.css, ../../style.css,
   * shot4.css), NHƯNG loadPage() bên dưới chỉ trích xuất phần .shot-body của
   * HTML fetch về, bỏ hoàn toàn <head> của nó -> các <link> đó KHÔNG BAO GIỜ
   * được trình duyệt nạp khi điều hướng qua menu. Chỉ khi mở thẳng file .html
   * (F5 trên chính file đó) thì trình duyệt mới tự đọc <head> gốc và nạp đủ.
   *
   * Hàm này nạp CSS chung 1 LẦN DUY NHẤT (không phụ thuộc shot đang mở),
   * và không bao giờ bị gỡ bỏ khi chuyển giữa các shot.
   */
  ensureSharedCss() {
    return new Promise((resolve) => {
      if (document.getElementById("shared-css")) {
        resolve();
        return;
      }
      const link = document.createElement("link");
      link.id = "shared-css";
      link.rel = "stylesheet";
      link.href = CONFIG.SHARED_CSS_PATH;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
    });
  }
 
  /**
   * ĐẢM BẢO CSS CHUNG (dùng cho MỌI shot: --chihy-blue, .modern-table,
   * .row-parent, .status-chip, màu badge...) LUÔN được nạp, bất kể vào
   * bằng cách nào (F5 hay điều hướng qua menu SPA).
   *
   * Trước đây shot4.html có 3 <link> trong <head> (style.css, ../../style.css,
   * shot4.css), NHƯNG loadPage() bên dưới chỉ trích xuất phần .shot-body của
   * HTML fetch về, bỏ hoàn toàn <head> của nó -> các <link> đó KHÔNG BAO GIỜ
   * được trình duyệt nạp khi điều hướng qua menu. Chỉ khi mở thẳng file .html
   * (F5 trên chính file đó) thì trình duyệt mới tự đọc <head> gốc và nạp đủ.
   *
   * Hàm này nạp CSS chung 1 LẦN DUY NHẤT (không phụ thuộc shot đang mở),
   * và không bao giờ bị gỡ bỏ khi chuyển giữa các shot.
   */
  ensureSharedCss() {
    return new Promise((resolve) => {
      if (document.getElementById("shared-css")) {
        resolve();
        return;
      }
      const link = document.createElement("link");
      link.id = "shared-css";
      link.rel = "stylesheet";
      link.href = CONFIG.SHARED_CSS_PATH;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
    });
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
      // Xóa CSS/JS của trang cũ để tránh xung đột (CSS CHUNG "shared-css"
      // KHÔNG nằm trong danh sách này -> không bao giờ bị gỡ khi chuyển shot)
      ["shot-css", "shot-js"].forEach((id) =>
        document.getElementById(id)?.remove(),
      );
      // Tải đồng thời: HTML riêng của shot + CSS chung (nếu chưa có) + CSS riêng của shot
      const [htmlRes] = await Promise.all([
        fetch(`${path}.html?t=${Date.now()}`),
        this.ensureSharedCss(),
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
 * BẢNG MÀU BADGE - dùng chung cho cả PNG và PDF
 * (áp trực tiếp inline style vì html2canvas đôi khi không đọc đúng
 * class CSS khi vẽ canvas)
 */
const EXPORT_BADGE_COLORS = {
  "badge-open": "#ca8a04",
  "badge-process": "#16a34a",
  "badge-pending": "#dc2626",
  "badge-done": "#0891b2",
  "badge-deploy": "#0891b2",
  "badge-new": "#d39236",
  "badge-close": "#64748b",
};

/**
 * Áp màu trực tiếp cho badge trạng thái - KHÔNG đụng tới display/vertical-align
 * của các phần tử khác để không làm vỡ layout gốc (flex, wrap...).
 */
function applyExportBadgeColors(root) {
  root.querySelectorAll(".status-badge").forEach((badge) => {
    badge.style.borderRadius = "20px";
    badge.style.padding = "3px 10px";
    badge.style.minWidth = "75px";
    badge.style.textAlign = "center";
    badge.style.fontSize = "10px";
    badge.style.color = "white";
    badge.style.lineHeight = "1.4";
    badge.style.whiteSpace = "nowrap";
    badge.style.border = "1px solid rgba(0,0,0,0.1)";

    for (const [cls, color] of Object.entries(EXPORT_BADGE_COLORS)) {
      if (badge.classList.contains(cls)) {
        badge.style.backgroundColor = color;
        break;
      }
    }
  });
}

/**
 * Đo độ rộng THẬT của từng cột từ bảng GỐC đang hiển thị trên web
 * (trước khi bị clone/chỉnh sửa gì cả). Đây là nguồn dữ liệu đáng tin cậy
 * nhất để tái tạo đúng layout, vì nó phản ánh chính xác cách trình duyệt
 * đã tính toán độ rộng cột theo nội dung thực tế.
 */
function measureLiveColumnWidths(liveTable) {
  const firstRow = liveTable.querySelector("tr");
  if (!firstRow) return [];
  return Array.from(firstRow.cells).map((cell) =>
    Math.ceil(cell.getBoundingClientRect().width),
  );
}

/**
 * Khóa cứng độ rộng từng cột trong bảng (clone) bằng <colgroup> + table-layout:fixed.
 * Đây là điểm mấu chốt: với table-layout:auto, nội dung dài trong 1 ô có thể
 * ép cột đó giãn ra và TRÀN LẤN sang cột bên cạnh (đúng lỗi trong ảnh chụp).
 * table-layout:fixed buộc trình duyệt phải tôn trọng đúng độ rộng cột đã cho,
 * và bắt buộc nội dung phải xuống dòng bên trong cột thay vì tràn ra ngoài.
 */
function lockTableColumnWidths(tbl, colWidths) {
  if (!tbl || !colWidths || !colWidths.length) return;

  tbl.style.setProperty("table-layout", "fixed", "important");

  let colgroup = tbl.querySelector("colgroup");
  if (colgroup) colgroup.remove();
  colgroup = document.createElement("colgroup");
  colWidths.forEach((w) => {
    const col = document.createElement("col");
    col.style.width = w + "px";
    colgroup.appendChild(col);
  });
  tbl.insertBefore(colgroup, tbl.firstChild);

  const totalW = colWidths.reduce((a, b) => a + b, 0);
  tbl.style.setProperty("width", totalW + "px", "important");
  tbl.style.setProperty("min-width", totalW + "px", "important");
  tbl.style.setProperty("max-width", totalW + "px", "important");
}

/**
 * Chống trường hợp label chứa checkbox (vd: "Task", "Detail") bị flex-shrink
 * bóp nhỏ lại khiến chữ chồng lên ô checkbox. Luôn giữ đúng kích thước tự
 * nhiên của label, bất kể container cha có bị co hẹp hay không.
 */
function lockCheckboxLabels(root) {
  root.querySelectorAll("label").forEach((label) => {
    if (label.querySelector('input[type="checkbox"]')) {
      label.style.setProperty("white-space", "nowrap", "important");
      label.style.setProperty("flex-shrink", "0", "important");
      label.style.setProperty("display", "inline-flex", "important");
      label.style.setProperty("align-items", "center", "important");
    }
  });
  // Container cha trực tiếp của các label này (thanh filter) nên cho phép
  // wrap xuống dòng nếu thật sự không đủ chỗ, thay vì bóp méo/chồng chữ.
  root.querySelectorAll("label input[type='checkbox']").forEach((input) => {
    const flexParent = input.closest("label")?.parentElement;
    if (flexParent) {
      flexParent.style.setProperty("flex-wrap", "wrap", "important");
    }
  });
}

/**
 * HÀM HỖ TRỢ XUẤT ẢNH PNG
 * KHÔNG đụng tới display / vertical-align của các phần tử trong ô để giữ
 * đúng layout như trên web (top-align, wrap 2 dòng, flex...). Chỉ khóa
 * đúng độ rộng cột + chống bóp label checkbox.
 */
function applyPngExportStyles(contentEl, finalW, colWidths) {
  // 1. Ép container giãn hết & không cắt nội dung
  contentEl.style.setProperty("width", finalW + "px", "important");
  contentEl.style.setProperty("max-width", "none", "important");
  contentEl.style.setProperty("height", "auto", "important");
  contentEl.style.setProperty("min-height", "0", "important");
  contentEl.style.setProperty("max-height", "none", "important");
  contentEl.style.setProperty("overflow", "visible", "important");
  contentEl.style.setProperty("margin", "0", "important");
 
  // 2. Bỏ hiệu ứng gây mờ/lệch (an toàn, không ảnh hưởng layout)
  contentEl.querySelectorAll("*").forEach((el) => {
    el.style.transform = "none";
    el.style.transition = "none";
    el.style.animation = "none";
    el.style.filter = "none";
  });
 
  // 3. Khung cuộn bảng: không được cắt (bỏ giới hạn chiều cao + overflow)
  //    LƯU Ý: class thực tế là ".table-container" (thêm khi làm sticky header),
  //    KHÔNG PHẢI ".table-scroll" như trước đây -> đây chính là lý do xuất
  //    PDF/PNG trước đó chỉ ra đúng phần đang hiển thị trong khung cuộn,
  //    không ra hết toàn bộ dòng đang được lọc/hiển thị.
  const scrollBox = contentEl.querySelector(".table-container, .table-scroll");
  if (scrollBox) {
    scrollBox.style.setProperty("overflow", "visible", "important");
    scrollBox.style.setProperty("overflow-y", "visible", "important");
    scrollBox.style.setProperty("overflow-x", "visible", "important");
    scrollBox.style.setProperty("max-height", "none", "important");
    scrollBox.style.setProperty("height", "auto", "important");
    scrollBox.style.setProperty("width", "auto", "important");
    scrollBox.style.setProperty("max-width", "none", "important");
  }
 
  // 3b. Header đang "sticky" để dính khi cuộn -> khi xuất ảnh cần trả về vị
  //    trí tĩnh bình thường, nếu không nó có thể đè/che các dòng dữ liệu
  //    phía trên khi table-container đã bị mở hết chiều cao.
  contentEl.querySelectorAll("thead th").forEach((th) => {
    th.style.setProperty("position", "static", "important");
  });
 
  // 4. KHÓA ĐÚNG ĐỘ RỘNG TỪNG CỘT như trên web -> chặn hiện tượng nội dung
  //    dài tràn lấn sang cột bên cạnh (lỗi trong ảnh chụp gửi trước đó)
  const tbl = contentEl.querySelector("table");
  lockTableColumnWidths(tbl, colWidths);
 
  // 5. Padding/line-height cho từng ô.
  //    KHÔNG set verticalAlign="middle" (web đang canh TOP, giữ nguyên vậy).
  //    KHÔNG ép display:inline-block lên children (làm vỡ flex + wrap 2 dòng).
  //    KHÔNG ép text-align theo index cột cố định nữa: mỗi "shot" có cấu
  //    trúc cột khác nhau, hard-code theo index (vd cột 4,7,8) chỉ đúng cho
  //    1 bảng cụ thể và làm SAI lệch bảng khác (vd cột "MÔ TẢ" bị ép canh
  //    giữa dù web để canh trái). Luôn tôn trọng text-align mà web đã set
  //    sẵn cho từng ô/cột.
  contentEl.querySelectorAll("tr").forEach((tr) => {
    Array.from(tr.cells).forEach((td) => {
      if (td.tagName !== "TD") return; // bỏ qua <th> ở header
 
      td.style.padding = "8px 10px";
      td.style.lineHeight = "1.4";
      // KHÔNG set white-space -> giữ nguyên "pre-wrap" đã set sẵn cho 1 số cột
      td.style.overflowWrap = "break-word";  // chỉ ngắt khi thật sự cần
      td.style.wordBreak = "normal";         // KHÔNG cắt giữa badge/số nhỏ như "(3)"
      // Giữ nguyên vertical-align và text-align mặc định của web -> không set gì thêm
    });
  });
 
  // 6. Chống bóp label checkbox (Task/Detail...)
  lockCheckboxLabels(contentEl);
 
  // 7. Áp màu cho badge trạng thái
  applyExportBadgeColors(contentEl);
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

    // --- BƯỚC 1: ĐO ĐÚNG ĐỘ RỘNG TỪNG CỘT + TOÀN KHỐI TỪ BẢNG GỐC (LIVE DOM) ---
    // Đo TRƯỚC khi clone/chỉnh sửa bất cứ thứ gì, vì đây là số liệu chuẩn
    // nhất phản ánh đúng những gì đang hiển thị trên web.
    const colWidths = measureLiveColumnWidths(table);
    const tableW = colWidths.reduce((a, b) => a + b, 0) || Math.ceil(table.getBoundingClientRect().width);
    const cs = getComputedStyle(source);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    // Lấy chiều rộng LỚN NHẤT giữa bảng và toàn bộ khối nội dung (gồm cả
    // thanh filter phía trên bảng), cộng thêm buffer an toàn để tránh sai số
    // đo lường làm bóp thanh filter (checkbox Task/Detail bị đè chữ).
    const naturalW = Math.ceil(Math.max(source.scrollWidth, source.getBoundingClientRect().width));
    const BUFFER = 32;
    const finalW = Math.max(tableW + padL + padR, naturalW) + BUFFER;

    // --- BƯỚC 2: ĐO CHIỀU CAO SAU KHI ĐÃ ÁP STYLE XUẤT (offscreen) ---
    const ghost = source.cloneNode(true);
    ghost.removeAttribute("id"); // tránh trùng id với DOM gốc
    ghostWrap = document.createElement("div");
    ghostWrap.style.cssText =
      "position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;z-index:-1;";
    ghostWrap.style.width = finalW + "px";
    document.body.appendChild(ghostWrap);
    ghostWrap.appendChild(ghost);
    applyPngExportStyles(ghost, finalW, colWidths);
    await document.fonts.ready;
    const finalH = Math.ceil(ghost.scrollHeight) + 8; // +8px đệm an toàn
    document.body.removeChild(ghostWrap);
    ghostWrap = null;

    console.log("Kích thước xuất:", finalW, "x", finalH, "| Cột:", colWidths);

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

        // Áp CHÍNH XÁC cùng bộ style + cùng bộ độ rộng cột đã dùng để đo chiều cao
        applyPngExportStyles(clonedSource, finalW, colWidths);
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
 
  const table = source.querySelector("table");
 
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Đang xử lý PDF...';
 
  try {
    await document.fonts.ready;
 
    // Đo độ rộng cột từ bảng gốc TRƯỚC khi html2canvas clone, để đảm bảo
    // clone dùng trong onclone cũng khớp layout với web.
    const colWidths = table ? measureLiveColumnWidths(table) : [];
 
    const canvas = await html2canvas(source, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 1920,
      onclone: (clonedDoc) => {
        // --- FIXED: ẨN CÁC NÚT VÀ SIDEBAR TRONG FILE PDF ---
        clonedDoc.querySelectorAll(".no-export, .sidebar, .main-header, .sidebar-toggle").forEach(el => {
          el.style.setProperty("display", "none", "important");
        });

        // const clonedSource =
        //   clonedDoc.querySelector(".main-content") ||
        //   clonedDoc.getElementById("content-area");
        const clonedSource = clonedDoc.getElementById("content-area") || clonedDoc.querySelector(".main-content");
        clonedSource.style.height = "auto";
        clonedSource.style.overflow = "visible";
 
        // Ép hiện rõ 100% (Fix mờ nhạt) - không đụng display/vertical-align
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
 
        // Khung cuộn bảng (".table-container", thêm khi làm sticky header):
        // trước đây KHÔNG được xử lý ở đây -> html2canvas chỉ chụp đúng phần
        // đang hiển thị trong khung cuộn 600px, không ra hết các dòng đang
        // lọc/hiển thị. Bỏ hẳn giới hạn chiều cao + overflow của nó.
        clonedSource.querySelectorAll(".table-container, .table-scroll").forEach((box) => {
          box.style.setProperty("overflow", "visible", "important");
          box.style.setProperty("overflow-y", "visible", "important");
          box.style.setProperty("overflow-x", "visible", "important");
          box.style.setProperty("max-height", "none", "important");
          box.style.setProperty("height", "auto", "important");
        });
        // Trả header về vị trí tĩnh (bỏ sticky) để không đè lên dữ liệu khi
        // khung cuộn đã được mở hết chiều cao.
        clonedSource.querySelectorAll("thead th").forEach((th) => {
          th.style.setProperty("position", "static", "important");
        });
 
        // Khóa đúng độ rộng cột như bảng gốc -> chặn nội dung tràn lấn cột
        const clonedTable = clonedSource.querySelector("table");
        lockTableColumnWidths(clonedTable, colWidths);
 
        // Padding/line-height + wrap cho các ô — KHÔNG ép vertical-align
        // hay display của children (giữ đúng layout top-align + flex như web)
        clonedSource.querySelectorAll("td").forEach((td) => {
          td.style.padding = "8px 10px";
          td.style.lineHeight = "1.4";
          // KHÔNG set white-space -> giữ nguyên "pre-wrap" đã set sẵn cho 1 số cột
          td.style.overflowWrap = "break-word"; // chỉ ngắt khi cần
          td.style.wordBreak = "normal";         // không cắt giữa badge/số nhỏ như "(3)"
        });
 
        // Chống bóp label checkbox (Task/Detail...)
        lockCheckboxLabels(clonedSource);
 
        // Áp màu badge trạng thái (bypass html2canvas CSS specificity issue)
        applyExportBadgeColors(clonedSource);
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
 
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgW, imgH);
        pdf.save(`Umer_Report_${Date.now()}.pdf`);

    } catch (error) {
        console.error("Lỗi Xuất PDF:", error);
        alert("Có lỗi xảy ra trong quá trình tạo file!");
    } finally {
        // 3. FORCE RESET: Ép nút quay lại trạng thái cũ bằng mọi giá
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalContent;
            console.log("Nút đã được reset.");
        }, 500); // Delay 0.5s để chắc chắn trình duyệt đã xử lý xong file download
    }
}