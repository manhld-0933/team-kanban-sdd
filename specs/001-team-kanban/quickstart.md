# Quickstart Validation: Team Kanban

Hướng dẫn smoke-test sau khi implementation hoàn tất. Đây là luồng xác minh thủ công; không cài hoặc chạy test runner trong giai đoạn planning.

## Prerequisites

- Node.js đáp ứng yêu cầu phiên bản Next.js (20.9+), npm và repository.
- Supabase project có Auth email/password và Postgres.
- Migrations của feature đã được áp dụng, RLS/grants được bật và biến môi trường đã cấu hình.
- Tạo hai tài khoản thử nghiệm bằng email/password: owner và member. Email confirmation tắt theo assumption MVP.

## Setup và chạy local

1. Cài dependencies sau khi implementation đã thêm Supabase packages:

   ```bash
   npm install
   ```

2. Tạo `.env.local` từ biến môi trường Supabase được cung cấp trong dashboard:

   ```text
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```

   Publishable key được phép ở browser khi grants/RLS đã cấu hình đúng. Không đặt secret/service-role key trong biến `NEXT_PUBLIC_*` hoặc gửi tới browser. Nếu migration/tooling yêu cầu service-role key, chỉ dùng trong môi trường server/tool riêng và không commit.

3. Áp dụng các SQL migrations trong `supabase/migrations` lên project Supabase dev. Xác nhận mọi bảng exposed bật RLS, grants tối thiểu và policies được áp dụng.

4. Chạy app:

   ```bash
   npm run dev
   ```

5. Mở `http://localhost:3000`.

## Scenario A — Signup/login và quyền board

1. Đăng ký owner bằng email/password, đăng xuất rồi đăng nhập lại.
2. Tạo board mới.
3. Xác nhận board có đúng ba column mặc định To Do, In Progress, Done; owner có thể đổi tên board và quản lý column.
4. Đăng ký member bằng email/password khác; owner thêm email member vào board.
5. Mở board trong session member. Xác nhận member xem được board và không thể đổi tên board, quản lý thành viên hoặc sửa/xóa column.
6. Đăng xuất member; truy cập lại URL board. Xác nhận bị chuyển tới login hoặc không thấy nội dung board.
7. Với tài khoản không thuộc board, thử gọi đường dẫn/API board trực tiếp; xác nhận không thể đọc board, comments hay activity.

**Expected**: Các quyền đúng theo vai trò; thao tác bị từ chối không làm thay đổi dữ liệu và response không tiết lộ dữ liệu board.

## Scenario B — Vietnamese / English

1. Mở landing page khi chưa có preference; xác nhận UI mặc định là tiếng Việt.
2. Chọn `English`; xác nhận heading, mô tả, nút và language accessibility label đổi ngay mà không cần tải lại.
3. Mở trang đăng ký rồi quay lại trang đăng nhập; xác nhận English vẫn được chọn.
4. Tải lại trang; xác nhận English được giữ. Chọn `Tiếng Việt` và xác nhận giao diện đổi lại ngay.
5. Trên board có tên/card/comment do người dùng nhập, đổi locale và xác nhận dữ liệu đó không bị dịch hay sửa.

**Expected**: Locale mặc định là `vi`, preference sống qua điều hướng/tải lại trong cùng browser; mọi system-generated UI text dùng đúng locale và user-generated content không đổi.

## Scenario C — Card, assign, comment và activity

1. Member tạo card trong To Do; owner và member đều thấy card.
2. Member gán owner làm assignee; xác nhận assignee hiển thị. Bỏ gán rồi gán member lại.
3. Member thêm comment; xác nhận người viết và thời điểm hiển thị.
4. Mở Activity Log; xác nhận card create, assignment changes và comment xuất hiện theo thứ tự mới nhất trước, actor/time chính xác.

**Expected**: Chỉ member hiện tại của board được assign; comment và activity chỉ hiển thị với người có quyền board.

## Scenario D — Drag/drop, rollback và keyboard

1. Kéo card từ To Do sang In Progress; xác nhận UI đổi ngay mà không chờ response.
2. Tải lại board; xác nhận column và thứ tự được lưu.
3. Mô phỏng request move bị từ chối hoặc offline; xác nhận card rollback về vị trí đã lưu và thông báo lỗi.
4. Thực hiện move/reorder bằng phương án bàn phím, không dùng kéo thả.
5. Với hai session, di chuyển cùng card gần như đồng thời; xác nhận thao tác stale báo conflict/refresh thay vì âm thầm ghi đè.

**Expected**: UI optimistic khớp persistence; lỗi/conflict không để trạng thái giả thành công; bàn phím cung cấp khả năng tương đương.

## Scenario E — Board và tải dữ liệu

1. Tạo board thử nghiệm có tối đa 10 thành viên và 500 card phân bố trên các column.
2. Đo 20 lần mở board và tìm trạng thái một card; ghi nhận thời gian và tính tỷ lệ lần thử hoàn tất trong 5 giây.
3. Thực hiện tối thiểu 20 thao tác move trong kết nối bình thường; ghi nhận thời gian xác nhận và tỷ lệ hoàn tất trong 2 giây.

**Expected**: Đạt SC-002 (>=95% trong 2 giây) và SC-005 (>=90% trong 5 giây). Ghi lại môi trường và chất lượng mạng để kết quả có thể lặp lại.

## References

- API payloads/statuses: [contracts/api.md](contracts/api.md)
- Entities, constraints and RLS matrix: [data-model.md](data-model.md)
- User acceptance criteria: [spec.md](spec.md)
