# Asset Management UI

Giao diện web cho hệ thống Quản lý tài sản (backend Spring Boot).

## Yêu cầu

- Node.js 18 trở lên
- Backend Spring Boot đang chạy (mặc định `http://localhost:8080`)

## Chạy ở môi trường dev

```bash
npm install
cp .env.example .env     # sửa VITE_API_BASE_URL nếu backend chạy cổng khác
npm run dev
```

Mở `http://localhost:5173`.

## Build cho production

```bash
npm run build      # kết quả nằm trong thư mục dist/
npm run preview    # xem thử bản build
```

## Cấu hình backend (BẮT BUỘC)

Vì FE chạy ở cổng riêng (5173) khác backend (8080), trình duyệt sẽ chặn mọi
request nếu backend chưa bật CORS. Cần thêm 2 thay đổi sau vào project Spring Boot:

1. Thêm file `config/CorsConfig.java` (đã kèm trong gói bàn giao).
2. Trong `config/SecurityConfig.java`, thêm dòng `.cors(Customizer.withDefaults())`
   vào `securityFilterChain`, ngay sau `.csrf(csrf -> csrf.disable())`, kèm
   `import org.springframework.security.config.Customizer;`.

Nếu thiếu bước 2, request preflight `OPTIONS` sẽ bị Spring Security chặn trước
khi tới tầng MVC, và FE báo lỗi CORS dù đã có `CorsConfig`.

Muốn đổi danh sách origin được phép, đặt biến môi trường:

```
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Tài khoản demo

Dùng dữ liệu do `DataSeeder` tạo:

| Tài khoản | Mật khẩu | Vai trò |
| --- | --- | --- |
| `admin` | `Admin@123` | ADMIN |
| `director.hn` | `Director@123` | DIRECTOR (Hà Nội) |
| `director.hcm` | `Director@123` | DIRECTOR (HCM) |
| `manager.it.hn` | `Manager@123` | MANAGER (IT Hà Nội) |
| `manager.acc.hn` | `Manager@123` | MANAGER (Kế toán Hà Nội) |
| `employee1` | `Employee@123` | chưa có vai trò |

## Cấu trúc

```
src/
  api/
    client.js       Fetch wrapper: gắn JWT, chuẩn hoá lỗi, xử lý 401
    endpoints.js    Một hàm cho mỗi endpoint backend
  context/
    AuthContext.jsx Quản lý token + thông tin người đăng nhập
  components/
    Layout.jsx          Khung sidebar + topbar, badge thông báo
    AssetFormModal.jsx  Form tài sản, sinh trường động theo EAV
    ui.jsx              Panel, Modal, Badge, Field, hàm định dạng
  pages/
    Login / Register
    Dashboard
    Assets / AssetDetail
    Requests / RequestDetail
    Tasks
    Notifications
```

## Phạm vi đã làm

- Đăng nhập, đăng ký
- Tổng quan: thống kê tài sản, việc chờ duyệt, yêu cầu gần đây
- Tài sản: danh sách + lọc, chi tiết, thêm/sửa (có thuộc tính động EAV),
  thao tác vòng đời, cấp phát trực tiếp cho ADMIN, hỗ trợ cả INDIVIDUAL và BULK
- Yêu cầu duyệt: tạo yêu cầu cấp phát/thanh lý, xem yêu cầu của tôi và tất cả
  yêu cầu, chi tiết kèm tiến trình từng bước
- Duyệt: danh sách việc chờ tôi duyệt, duyệt/từ chối
- Thông báo: danh sách, đánh dấu đã đọc, badge số chưa đọc

### Giai đoạn 2 (quản trị & tra cứu)

- Người dùng: danh sách + tìm kiếm, thêm/sửa/xoá, gán vai trò
- Chi nhánh & Phòng ban: CRUD cả hai, hai bảng cạnh nhau
- Danh mục & Thuộc tính động: CRUD danh mục, CRUD định nghĩa thuộc tính EAV
  (kiểu dữ liệu, bắt buộc hay không), lọc thuộc tính theo danh mục
- Quy trình duyệt: CRUD workflow, chọn workflow để xem/sửa các bước; CRUD bước
  duyệt với phạm vi (department/branch scope) và ngưỡng giá trị
- Nhật ký hệ thống: lọc theo hành động/đối tượng, tìm trong mô tả, link sang
  tài sản hoặc yêu cầu liên quan
- Lịch sử cấp phát: ai mượn gì, lọc lượt chưa trả

## Yêu cầu backend cho giai đoạn 2

Các endpoint dưới đây cần tồn tại. Kiểm tra bằng Swagger trước khi test giao diện:

| Màn hình | Endpoint |
| --- | --- |
| Người dùng | `GET/POST /api/users`, `PUT/DELETE /api/users/{id}`, `POST /api/users/{userId}/roles/{roleId}`, `GET /api/roles` |
| Chi nhánh & Phòng ban | `GET/POST /api/branches`, `PUT/DELETE /api/branches/{id}`, tương tự cho `/api/departments` |
| Danh mục & Thuộc tính | `GET/POST /api/categories`, `PUT/DELETE /api/categories/{id}`, `GET/POST /api/attribute-definitions`, `PUT/DELETE /api/attribute-definitions/{id}` |
| Quy trình duyệt | `GET/POST /api/approval-workflows`, `PUT/DELETE /api/approval-workflows/{id}`, tương tự cho `/api/approval-steps` |
| Nhật ký | `GET /api/audit-logs` |
| Lịch sử cấp phát | `GET /api/asset-histories` |

## Ghi chú kỹ thuật

- `POST /api/auth/login` trả JWT dạng **chuỗi thô** (không bọc JSON), nên
  `client.js` có chế độ `raw` đọc bằng `response.text()`.
- Token lưu ở `localStorage`. Mọi response `401` sẽ tự xoá token và đưa người
  dùng về trang đăng nhập.
- Backend chưa có WebSocket, nên số thông báo chưa đọc được poll lại mỗi 30 giây.
- Nút Duyệt/Từ chối chỉ hiện khi task nằm trong danh sách
  `GET /api/approval-tasks?status=PENDING` — tức backend đã xác nhận người dùng
  đủ điều kiện duyệt bước đó.
