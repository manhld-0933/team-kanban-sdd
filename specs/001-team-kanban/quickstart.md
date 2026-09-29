# Quickstart Validation: Team Kanban

Hướng dẫn smoke-test sau khi implementation hoàn tất. Đây là luồng xác minh thủ công; không cài hoặc chạy test runner trong giai đoạn planning.

## Prerequisites

- Node.js đáp ứng yêu cầu phiên bản Next.js (20.9+), npm và repository.
- Docker Desktop/Engine đang chạy và Supabase CLI (`npx supabase` dùng CLI theo project mà không cần cài global).
- Supabase local có Auth email/password và Postgres; `supabase/config.toml` đặt `enable_confirmations = false` cho luồng MVP.
- RLS/grants và mọi migration đang có đã được áp dụng.
- Tạo hai tài khoản thử nghiệm bằng email/password: owner và member. Email confirmation tắt theo assumption MVP.

## Setup và chạy local

1. Cài dependencies:

   ```bash
   npm install
   ```

2. Khởi động local Supabase và xem API URL cùng publishable key:

   ```bash
   npx supabase start
   npx supabase status
   ```

   Tạo `.env.local` ở repo root bằng `API_URL` và `PUBLISHABLE_KEY` CLI vừa in ra:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   Publishable key được phép ở browser khi grants/RLS đã cấu hình đúng. Demo board chỉ dùng session hiện tại, không cần Supabase Auth Admin key.

3. Áp dụng migration đang chờ theo cách incremental, không xóa dữ liệu local:

   ```bash
   npx supabase migration list --local
   npx supabase db push --local
   npx supabase migration list --local
   ```

   `db push --local` áp dụng migration chưa chạy. Tránh `db reset` nếu cần giữ data local vì lệnh đó dựng lại database.

4. Chạy app:

   ```bash
   npm run dev
   ```

5. Mở `http://localhost:3000`. Studio local ở `http://127.0.0.1:54323`; tài khoản xem tại **Authentication → Users**.

## Scenario A — Signup/login và quyền board

1. Đăng ký owner bằng email/password, đăng xuất rồi đăng nhập lại.
2. Khi đang đăng nhập, mở `/login` và `/signup`; xác nhận server chuyển tới `/boards`.
3. Tạo board mới.
4. Xác nhận board có đúng ba column mặc định To Do, In Progress, Done; owner có thể đổi tên board và quản lý column.
5. Đăng ký member bằng email/password khác; owner thêm email member vào board.
6. Mở board trong session member. Xác nhận member xem được board và không thể đổi tên board, quản lý thành viên hoặc sửa/xóa column.
7. Đăng xuất member; truy cập lại URL board. Xác nhận bị chuyển tới login hoặc không thấy nội dung board.
8. Với tài khoản không thuộc board, thử gọi đường dẫn/API board trực tiếp; xác nhận không thể đọc board, comments hay activity.

**Expected**: Các quyền đúng theo vai trò; thao tác bị từ chối không làm thay đổi dữ liệu và response không tiết lộ dữ liệu board.

## Scenario F — Session lifecycle và demo board

1. Khi đang đăng nhập, mở trực tiếp `/login` hoặc `/signup`; xác nhận cả hai route chuyển tới `/boards`.
2. Chọn logout ở workspace; xác nhận session kết thúc, UI chuyển về `/login`, và truy cập `/boards` lại yêu cầu đăng nhập.
3. Đăng nhập lại và tạo demo board; nếu board đã tồn tại, chọn **Mở board mẫu**. Xác nhận owner có một demo board riêng với ba column, cards mẫu được gán cho owner và activity entries; không tạo thêm Auth user hoặc member.
4. Gọi thao tác tạo demo board lần nữa hoặc gửi hai request đồng thời; xác nhận cùng một demo board được trả về và không có bản ghi trùng.

**Expected**: Auth redirects giữ trạng thái nhất quán và tạo demo board idempotent không nhân bản dữ liệu.

## Scenario G — Xóa board

1. Từ danh sách boards, xác nhận owner thấy nút xóa trên board của mình.
2. Hủy hộp thoại xác nhận; xác nhận board vẫn còn.
3. Xác nhận xóa; board biến mất khỏi danh sách và cards, comments, members, columns, activity liên quan được xóa cùng transaction.
4. Đăng nhập bằng member của board khác; xác nhận không có nút xóa và DELETE API bị từ chối.

**Expected**: Chỉ owner xóa được board; xóa board dọn dữ liệu phụ thuộc nhất quán.

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
4. Thử gỡ member đang được assign; xác nhận API từ chối. Bỏ gán người đó khỏi các card rồi gỡ member thành công.
5. Mở Activity Log; xác nhận card create/update/delete, move/reorder, assignment changes, comment, thay đổi column và member xuất hiện mới nhất trước, actor/time chính xác. Dùng “Tải thêm” để đọc trang cũ hơn.

**Expected**: Chỉ member hiện tại của board được assign; comment và activity chỉ hiển thị với thành viên hiện tại. Gỡ member có assignment bị từ chối để owner unassign trước.

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
