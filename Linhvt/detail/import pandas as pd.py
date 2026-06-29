import pandas as pd
from datetime import datetime, timedelta

# Create a writer object
file_path = 'WBS_Website_TMDT_20240517.xlsx'
writer = pd.ExcelWriter(file_path, engine='xlsxwriter')
workbook = writer.book

# Formatting
header_format = workbook.add_format({'bold': True, 'bg_color': '#D7E4BC', 'border': 1, 'align': 'center', 'valign': 'vcenter'})
level0_format = workbook.add_format({'bold': True, 'bg_color': '#4F81BD', 'font_color': 'white', 'border': 1})
level1_format = workbook.add_format({'bold': True, 'bg_color': '#B8CCE4', 'border': 1})
level2_format = workbook.add_format({'bg_color': '#DCE6F1', 'border': 1})
normal_format = workbook.add_format({'border': 1})

# --- SHEET 1: WBS MASTER ---
wbs_data = [
    ["0.0", 0, "None", "Dự án Website TMĐT", "Website TMĐT sẵn sàng vận hành", "Mục tiêu cuối cùng của dự án", "Project Outcome", "PM", "Founder", "2024-05-20", "2024-07-14", "8 weeks", "-", "High", "Not Started", "Website live, không lỗi critical, có đơn hàng đầu tiên"],
    ["1.0", 1, "0.0", "Khởi tạo & Lập kế hoạch", "Bộ tài liệu phạm vi và kế hoạch dự án", "Xác định những gì sẽ làm và không làm", "Major Deliverable", "PM", "Founder", "2024-05-20", "2024-05-26", "1 week", "-", "High", "Not Started", "Tài liệu được Founder ký duyệt"],
    ["1.1", 2, "1.0", "Khởi tạo", "Làm rõ yêu cầu kinh doanh và kỹ thuật", "Họp lấy yêu cầu", "Sub-deliverable", "PM", "Founder, Tech Lead", "2024-05-20", "2024-05-22", "3 days", "-", "High", "Not Started", "Danh sách tính năng hoàn thiện"],
    ["1.1.1", 3, "1.1", "Công việc", "Phân tích đối thủ và hành trình khách hàng", "Khảo sát UX", "Work Package", "PM", "Designer", "2024-05-20", "2024-05-22", "3 days", "-", "Medium", "Not Started", "Bản vẽ hành trình khách hàng (User Flow)"],
    ["2.0", 1, "0.0", "Thiết kế UI/UX", "Bản thiết kế Prototype hoàn chỉnh", "Thiết kế giao diện người dùng", "Major Deliverable", "Designer", "PM", "2024-05-27", "2024-06-09", "2 weeks", "1.0", "High", "Not Started", "Prototype có thể click được trên Figma"],
    ["2.1", 2, "2.0", "Thiết kế", "Thiết kế Wireframe và UI chi tiết", "Các màn hình chính: Home, Shop, Product, Checkout", "Sub-deliverable", "Designer", "PM", "2024-05-27", "2024-06-05", "10 days", "1.1", "High", "Not Started", "Full UI Kit và các màn hình chính"],
    ["3.0", 1, "0.0", "Phát triển Nội dung", "Hệ thống nội dung và sản phẩm", "Chuẩn bị text, hình ảnh", "Major Deliverable", "Content", "PM, Marketing", "2024-05-27", "2024-06-16", "3 weeks", "1.0", "Medium", "Not Started", "100 sản phẩm được nhập liệu mẫu"],
    ["4.0", 1, "0.0", "Phát triển Kỹ thuật", "Mã nguồn và hệ thống vận hành", "Lập trình frontend và backend", "Major Deliverable", "Dev", "PM, Tech Lead", "2024-06-03", "2024-06-30", "4 weeks", "2.1", "High", "Not Started", "Web chạy ổn định trên môi trường Staging"],
    ["5.0", 1, "0.0", "Kiểm thử (QA/QC)", "Báo cáo kiểm thử và fix bug", "Đảm bảo chất lượng", "Major Deliverable", "QA", "Dev, PM", "2024-07-01", "2024-07-10", "1.5 weeks", "4.0", "High", "Not Started", "Không còn bug nghiêm trọng"],
    ["6.0", 1, "0.0", "Triển khai & Launch", "Website Live", "Go-live và bàn giao", "Major Deliverable", "PM", "All", "2024-07-11", "2024-07-14", "4 days", "5.0", "High", "Not Started", "Website truy cập được bằng domain chính thức"]
]

df_wbs = pd.DataFrame(wbs_data, columns=["WBS ID", "Level", "Parent ID", "Workstream", "Deliverable", "Mô tả", "Loại mục", "Owner", "Bên involve", "Start Date", "End Date", "Duration", "Dependency", "Priority", "Status", "Acceptance Criteria"])
df_wbs.to_excel(writer, sheet_name='WBS Master', index=False)
worksheet = writer.sheets['WBS Master']
for i, row in enumerate(wbs_data):
    fmt = normal_format
    if row[1] == 0: fmt = level0_format
    elif row[1] == 1: fmt = level1_format
    elif row[1] == 2: fmt = level2_format
    worksheet.set_row(i + 1, None, fmt)

# --- SHEET 2: TIMELINE / GANTT ---
gantt_data = [
    ["0.0", "Website TMĐT sẵn sàng vận hành", "PM", "2024-05-20", "2024-07-14", "8 weeks", "-", "Not Started", "X", "X", "X", "X", "X", "X", "X", "X"],
    ["1.0", "Khởi tạo & Lập kế hoạch", "PM", "2024-05-20", "2024-05-26", "1 week", "-", "Not Started", "X", "", "", "", "", "", "", ""],
    ["2.0", "Thiết kế UI/UX", "Designer", "2024-05-27", "2024-06-09", "2 weeks", "1.0", "Not Started", "", "X", "X", "", "", "", "", ""],
    ["3.0", "Phát triển Nội dung", "Content", "2024-05-27", "2024-06-16", "3 weeks", "1.0", "Not Started", "", "X", "X", "X", "", "", "", ""],
    ["4.0", "Phát triển Kỹ thuật", "Dev", "2024-06-03", "2024-06-30", "4 weeks", "2.1", "Not Started", "", "", "X", "X", "X", "X", "", ""],
    ["5.0", "Kiểm thử (QA/QC)", "QA", "2024-07-01", "2024-07-10", "1.5 weeks", "4.0", "Not Started", "", "", "", "", "", "", "X", ""],
    ["6.0", "Triển khai & Launch", "PM", "2024-07-11", "2024-07-14", "4 days", "5.0", "Not Started", "", "", "", "", "", "", "", "X"]
]
df_gantt = pd.DataFrame(gantt_data, columns=["WBS ID", "Deliverable", "Owner", "Start", "End", "Dur", "Dep", "Status", "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"])
df_gantt.to_excel(writer, sheet_name='Timeline Gantt', index=False)

# --- SHEET 3: RACI ---
raci_data = [
    ["1.0", "Lập kế hoạch", "PM", "Founder", "Dev", "Marketing", "Founder phê duyệt cuối"],
    ["2.0", "Thiết kế UI/UX", "Designer", "PM", "Founder", "Dev", ""],
    ["3.0", "Nội dung", "Content", "PM", "Marketing", "Founder", ""],
    ["4.0", "Lập trình", "Dev", "PM", "Designer", "QA", ""],
    ["5.0", "Kiểm thử", "QA", "PM", "Dev", "Founder", ""],
    ["6.0", "Go-live", "PM", "Founder", "All", "Customers", "Thời điểm quan trọng nhất"]
]
df_raci = pd.DataFrame(raci_data, columns=["WBS ID", "Công việc", "Responsible", "Accountable", "Consulted", "Informed", "Notes"])
df_raci.to_excel(writer, sheet_name='RACI', index=False)

# --- SHEET 4: MILESTONES ---
ms_data = [
    ["M1", "Phạm vi dự án được chốt (Scope Finalized)", "1.0", "2024-05-26", "PM", "Founder ký duyệt", "Not Started"],
    ["M2", "Thiết kế được phê duyệt (Design Approved)", "2.0", "2024-06-09", "Designer", "Ký duyệt Figma", "Not Started"],
    ["M3", "Bản Beta hoàn thành (Beta Version)", "4.0", "2024-06-30", "Dev", "Tính năng chính chạy ổn", "Not Started"],
    ["M4", "Website chính thức Launch", "6.0", "2024-07-14", "PM", "Public domain truy cập được", "Not Started"]
]
df_ms = pd.DataFrame(ms_data, columns=["ID", "Milestone Name", "WBS ID", "Target Date", "Owner", "Criteria", "Status"])
df_ms.to_excel(writer, sheet_name='Milestones', index=False)

# --- SHEET 5: DASHBOARD ---
# Just creating visual structure, formulas will be simplified for this static output
db_data = [
    ["Tổng số Work Packages", 10],
    ["Not Started", 10],
    ["In Progress", 0],
    ["Completed", 0],
    ["% Hoàn thành", "0%"],
    ["Milestones đạt được", "0/4"]
]
df_db = pd.DataFrame(db_data, columns=["Chỉ số", "Giá trị"])
df_db.to_excel(writer, sheet_name='Dashboard', index=False)

# --- SHEET 6: ASSUMPTIONS ---
asm_data = [
    ["Ngày bắt đầu giả định", "20/05/2024", "Dựa trên yêu cầu tạo kế hoạch mẫu"],
    ["Tổng thời gian", "8 tuần", "Phù hợp cho 1 website TMĐT trung bình"],
    ["Nhân sự", "Đã giả định đủ 5 roles chính", "PM, Designer, Dev, Content, QA"],
    ["Công nghệ", "Sử dụng nền tảng có sẵn hoặc Framework phổ biến", "Giả định không build từ zero hoàn toàn"],
    ["Phản hồi từ Stakeholder", "Giả định feedback trong vòng 48h", "Nếu chậm hơn sẽ ảnh hưởng timeline"]
]
df_asm = pd.DataFrame(asm_data, columns=["Hạng mục", "Giả định", "Ghi chú"])
df_asm.to_excel(writer, sheet_name='Assumptions', index=False)

# Save and Close
writer.close()