# HTTP Contracts: Team Kanban BFF

Contract cho JSON Route Handlers dưới `/api/v1`. Đăng ký/đăng nhập/đăng xuất dùng Supabase Auth qua form server-side hoặc SDK và session cookie; không proxy password qua API nghiệp vụ.

## Quy ước

- Request cần session hợp lệ ngoại trừ signup/login. Danh tính lấy từ cookie đã được xác minh; không nhận `user_id` làm căn cứ phân quyền.
- SSR server client đọc/ghi session qua cookie `getAll`/`setAll`; dùng `getClaims()` để xác minh JWT, hoặc `getUser()` khi cần xác minh user record với Auth. Không dùng `getSession()` đơn lẻ như authorization proof.
- Response cập nhật auth cookie phải chuyển tiếp cookie và security/cache headers; không được cache ở CDN/reverse proxy.
- Payload JSON; response theo DTO tối thiểu. Timestamp ISO-8601 UTC.
- Lỗi dạng `{ "error": { "code": "...", "message": "...", "details": {} } }`.
- `401` chưa đăng nhập/hết phiên; `403` đã đăng nhập nhưng thiếu quyền; `404` id không tồn tại hoặc không thuộc board mà caller được phép thấy; `409` conflict/version stale; `422` payload hợp lệ JSON nhưng sai domain; `429` rate limit nếu được áp dụng.
- Route Handlers và data-access layer đều phải kiểm tra quyền theo board role; Proxy chỉ hỗ trợ refresh/redirect, không phải lớp authorization duy nhất.
- Mutation cần validate input, membership và role phía server; RLS vẫn là lớp bảo vệ dữ liệu cuối cùng.
- GET trả dữ liệu riêng tư không được cache dùng chung. Server Components có thể gọi data-access layer trực tiếp thay vì gọi HTTP nội bộ.

## Auth

| Operation | Hành vi |
|---|---|
| `POST /signup` (Auth flow) | Tạo tài khoản email/password; theo MVP không yêu cầu email verification. Trả session hoặc kết quả xác nhận và chuyển tới workspace. |
| `POST /login` (Auth flow) | Xác thực email/password; lỗi chung không tiết lộ email tồn tại hay không. |
| `POST /logout` (Auth flow) | Thu hồi/clear session cookie. |

Auth flow do Supabase Auth xử lý; nơi triển khai UI phải dùng cookie session SSR. Không ghi password vào application logs.

- Người có session hợp lệ mở `/login` hoặc `/signup` được server redirect tới `/boards`; người chưa đăng nhập mở workspace được redirect tới `/login`.
- Logout gọi Supabase `signOut()`, chuyển tiếp cookie xóa session về browser và redirect tới `/login`.

## Boards

### `GET /api/v1/boards`

Liệt kê board mà current user là member. `200 { "data": [{ "id", "name", "role", "createdAt" }] }`.

### `POST /api/v1/demo/board`

Người dùng đã đăng nhập tạo/mở demo board riêng cho mình. Request không có body. Lần đầu trả `201 { "data": { "id", "name", "isDemo": true } }`; các lần gọi sau trả `200` cùng demo board hiện có. RPC transaction tạo board với owner membership, ba column mặc định, cards mẫu do owner phụ trách và Activity Log; unique partial index xử lý request đồng thời. Demo board không tạo hoặc thêm Auth users.

### `POST /api/v1/boards`

Owner tạo board. Body: `{ "name": "Team Alpha" }`. `201 { "data": { "id", "name", "role": "owner", "columns": [...] } }`. Tạo board + owner membership + 3 columns mặc định trong một transaction; lỗi thì không để lại board một phần.

### `GET /api/v1/boards/{boardId}`

Member đọc board, columns, cards, member summaries và assignee summary. `200 { "data": { "id", "name", "role", "members": [...], "columns": [{ "id", "name", "position", "cards": [...] }] } }`. Board không thuộc quyền truy cập trả `404`.

### `PATCH /api/v1/boards/{boardId}`

Chỉ owner đổi tên. Body `{ "name": "..." }`; trả `200 { "data": { "id", "name", "updatedAt" } }`.

### `DELETE /api/v1/boards/{boardId}`

Chỉ owner xóa board. Không có request body; xác nhận được thực hiện ở UI trước request. Trả `204` khi đã xóa board cùng cards, comments, members, columns và activity liên quan; non-owner nhận `403`.

## Members

### `GET /api/v1/boards/{boardId}/members`

Member xem danh sách thành viên và role. `200 { "data": [...] }`.

### `POST /api/v1/boards/{boardId}/members`

Chỉ owner thêm tài khoản đã tồn tại. Body `{ "email": "person@example.com" }`; `201 { "data": { "userId", "email", "role": "member" } }`. Email chưa đăng ký và member đã có trên board trả cùng một lỗi chung; flow invitation ngoài MVP.

### `DELETE /api/v1/boards/{boardId}/members/{userId}`

Chỉ owner xóa member. Nếu member còn là assignee, trả `409 MEMBER_ASSIGNED` để owner unassign trước. `204` khi thành công. Owner không thể tự xóa membership owner.

## Columns

### `POST /api/v1/boards/{boardId}/columns`

Chỉ owner tạo column. Body `{ "name": "Review", "position": 3 }`; trả `201` column DTO.

### `PATCH /api/v1/boards/{boardId}/columns/{columnId}`

Chỉ owner đổi tên/vị trí. Body chứa field thay đổi; trả `200` column DTO. Column đích của mọi card move phải thuộc cùng board.

### `DELETE /api/v1/boards/{boardId}/columns/{columnId}`

Chỉ owner. Nếu column còn card, body yêu cầu `moveCardsToColumnId` thuộc cùng board hoặc endpoint trả `409 COLUMN_NOT_EMPTY`; xử lý toàn bộ card + xóa column nguyên tử. Trả `204`.

## Cards

### `POST /api/v1/boards/{boardId}/cards`

Member tạo card. Body `{ "columnId", "title", "description?" }`; trả `201` Card DTO với `version: 1`.

### `PATCH /api/v1/boards/{boardId}/cards/{cardId}`

Member sửa `title`/`description`; không dùng endpoint này để move/assign. Gửi `expectedVersion`; stale version trả `409 VERSION_CONFLICT` cùng state mới nhất được phép đọc.

### `DELETE /api/v1/boards/{boardId}/cards/{cardId}`

Member xóa card và ghi activity tương ứng nguyên tử. Trả `204`.

### `POST /api/v1/boards/{boardId}/cards/{cardId}/move`

Member di chuyển/reorder card. Body `{ "toColumnId": "uuid", "toPosition": 2, "expectedVersion": 4 }`. Server xác minh card/column cùng board và version, transaction cập nhật thứ tự + card + activity. `200 { "data": { "cardId", "columnId", "position", "version", "updatedAt", "board" } }`; `board` là snapshot mới nhất để client đồng bộ sau optimistic move. Trả `409 VERSION_CONFLICT` cùng card state mới nhất khi state đã đổi; client rollback rồi refresh board.

### `PUT /api/v1/boards/{boardId}/cards/{cardId}/assignee`

Member gán người phụ trách. Body `{ "userId": "uuid", "expectedVersion": 4 }`; user phải là member hiện tại cùng board. Trả card cùng assignee summary. Dùng `{ "userId": null, "expectedVersion": 4 }` để bỏ gán. Ghi Activity Log trong cùng transaction.

## Comments

### `GET /api/v1/boards/{boardId}/cards/{cardId}/comments`

Member đọc comments theo thời gian tăng dần hoặc cursor; DTO có `author`, `body`, `createdAt`.

### `POST /api/v1/boards/{boardId}/cards/{cardId}/comments`

Member thêm comment. Body `{ "body": "..." }`; body bắt buộc sau trim, plain text, tối đa 5000 ký tự; `201` trả comment DTO gồm author/time. Insert comment + activity là một transaction.

## Activity

### `GET /api/v1/boards/{boardId}/activity?cursor={cursor}&limit={limit}`

Member đọc activity mới nhất trước, giới hạn page size từ 1 đến 50; response `{ "data": { "items": [...], "nextCursor": "..." } }`. Mọi entry gồm action, actor summary, entity summary và `createdAt`. Không có mutation endpoint cho Activity Log.

## Error codes chính

| Code | HTTP | Ý nghĩa |
|---|---:|---|
| `UNAUTHENTICATED` | 401 | Session thiếu/hết hạn/không hợp lệ. |
| `FORBIDDEN` | 403 | Không đủ role cho thao tác. |
| `NOT_FOUND` | 404 | Tài nguyên không tồn tại hoặc không thuộc board khả kiến. |
| `VALIDATION_ERROR` | 422 | Thiếu field, text rỗng, giới hạn kích thước hoặc tham chiếu sai domain. |
| `VERSION_CONFLICT` | 409 | Dữ liệu đã được thay đổi bởi thao tác khác. |
| `COLUMN_NOT_EMPTY` | 409 | Xóa column cần xử lý card trước. |
| `INTERNAL_ERROR` | 500 | Lỗi không dự kiến; response không lộ SQL, secrets hay stack trace. |
