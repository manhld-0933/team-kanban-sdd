# Data Model: Team Kanban

## Quy ước chung

- Mọi primary key là UUID; `created_at`/`updated_at` dùng timestamp có timezone, lưu UTC.
- Danh tính do Supabase Auth quản lý; các foreign key người dùng tham chiếu `auth.users.id`. Không tạo bản sao mật khẩu hoặc session trong bảng ứng dụng.
- SSR session dùng cookie adapter `getAll`/`setAll`; xác minh JWT với `getClaims()` cho authorization và dùng `getUser()` khi cần bản ghi user mới nhất. Không xem `getSession()` như xác minh server-side.
- Response cập nhật auth cookies phải được trả về cùng headers và không được CDN/reverse proxy cache.
- Bảng ứng dụng trong schema exposed phải bật RLS. Mọi truy vấn theo board có `board_id`; quyền được xác định từ quan hệ membership và role.
- Cấu hình grants riêng bên cạnh RLS policies; publishable key chỉ an toàn khi grants/RLS được cấu hình đúng. Secret/service-role key bypass RLS, không được gửi xuống browser.
- Owner được biểu diễn như một membership có role `owner`; mỗi board đúng một owner. Các collaborator có role `member`.
- Bản ghi `activity_log` chỉ được append bởi thao tác nghiệp vụ; client không được sửa/xóa log.

## Entities

### User (Supabase Auth)

| Field | Rule |
|---|---|
| `id` | UUID do Auth cấp, identity duy nhất. |
| `email` | Duy nhất theo Auth; chỉ dùng đăng nhập và thêm thành viên đã đăng ký. |

Email verification/password recovery ngoài MVP theo spec. Dữ liệu nhạy cảm xác thực không được nhân đôi ở bảng app.

### Board

| Field | Rule |
|---|---|
| `id` | UUID primary key. |
| `name` | Bắt buộc, trim whitespace, độ dài giới hạn ở boundary. |
| `created_by` | FK tới Auth user đã tạo; không đổi sau tạo. |
| `created_at`, `updated_at` | UTC; cập nhật khi board metadata đổi. |

Board phải được tạo cùng membership role `owner` và ba column mặc định To Do, In Progress, Done trong một transaction. Board có nhiều membership; chỉ một owner.

### BoardMember

| Field | Rule |
|---|---|
| `board_id` | FK Board. |
| `user_id` | FK Auth user. |
| `role` | `owner` hoặc `member`. |
| `joined_at` | UTC. |

Composite primary key `(board_id, user_id)` ngăn thêm cùng user hai lần. Partial unique constraint bảo đảm tối đa một `owner` mỗi board; tạo board transaction bảo đảm ít nhất một owner. Chỉ owner thêm/xóa member; thao tác xóa owner bị cấm. Gỡ member phải xử lý assignment của họ trước hoặc cùng transaction, theo quy tắc sản phẩm.

### Column

| Field | Rule |
|---|---|
| `id` | UUID primary key. |
| `board_id` | FK Board; immutable. |
| `name` | Bắt buộc sau trim. |
| `position` | Số nguyên >= 0, thứ tự trong board. |
| `created_at`, `updated_at` | UTC. |

Constraint unique `(board_id, id)` hỗ trợ FK composite từ Card. Owner quản lý columns. Column mặc định có position lần lượt 0, 1, 2. Khi xóa column còn card, owner phải chỉ định column đích hoặc xử lý card trước; không được xóa card âm thầm.

### Card

| Field | Rule |
|---|---|
| `id` | UUID primary key. |
| `board_id` | FK Board. |
| `column_id` | Thuộc cùng board, FK composite `(board_id, column_id)`. |
| `title` | Bắt buộc, không chỉ whitespace. |
| `description` | Nullable, văn bản thuần; giới hạn độ dài ở boundary. |
| `assignee_user_id` | Nullable; phải là user có membership hiện tại trong cùng board. |
| `position` | Số nguyên >= 0, thứ tự card trong column. |
| `version` | Số nguyên tăng khi card thay đổi để phát hiện cập nhật stale/concurrent. |
| `created_by`, `created_at`, `updated_at` | Creator là Auth user; timestamps UTC. |

Một card thuộc đúng một board/column và có tối đa một assignee. Tạo/sửa/xóa do member; đổi column/position qua atomic move operation. Unique ordering xử lý theo transaction (có thể deferred constraint hoặc renumber trong transaction).

### Comment

| Field | Rule |
|---|---|
| `id` | UUID primary key. |
| `board_id`, `card_id` | FK card cùng board. |
| `author_user_id` | FK Auth user và membership tại thời điểm tạo. |
| `body` | Bắt buộc sau trim, plain text, có giới hạn độ dài. |
| `created_at`, `updated_at` | UTC. |

Member có quyền board tạo và đọc comments. Sửa/xóa comment không được yêu cầu trong spec; không đưa vào MVP nếu chưa được xác nhận.

### ActivityLogEntry

| Field | Rule |
|---|---|
| `id` | UUID primary key. |
| `board_id` | FK Board. |
| `actor_user_id` | FK Auth user thực hiện sự kiện. |
| `entity_type`, `entity_id` | Loại và id đối tượng liên quan. |
| `action` | Enum/string allowlist: board/column/card/member create/update/delete, card move, assignee change, comment create. |
| `summary` | Mô tả ngắn không chứa bí mật; ưu tiên dựng từ loại sự kiện và dữ liệu cần thiết. |
| `metadata` | JSON tối thiểu, không chứa credential/session hay toàn bộ comment nếu không cần. |
| `created_at` | UTC; append-only. |

Activity được ghi cùng transaction với hành động tương ứng. Thành viên board được đọc theo thứ tự mới nhất trước; không có quyền sửa/xóa.

## Relationships

```text
Auth User 1 ── * BoardMember * ── 1 Board
Board 1 ── * Column
Board 1 ── * Card
Column 1 ── * Card
BoardMember 1 ── 0..* Card (assignee)
Card 1 ── * Comment
Board 1 ── * ActivityLogEntry
Auth User 1 ── * Comment (author)
Auth User 1 ── * ActivityLogEntry (actor)
```

## Authorization và RLS

| Hành động | Owner | Member | Không thuộc board |
|---|---:|---:|---:|
| Đọc board/column/card/comment/activity | Có | Có | Từ chối |
| Đổi tên board, quản lý columns/members | Có | Từ chối | Từ chối |
| Tạo/sửa/xóa card, move, comment, assign | Có | Có | Từ chối |
| Gán assignee | Chỉ member hiện tại trên cùng board | Chỉ member hiện tại trên cùng board | Từ chối |
| Insert activity | Chỉ qua nghiệp vụ được phép | Chỉ qua nghiệp vụ được phép | Từ chối |

RLS policy phải giới hạn thao tác theo `auth.uid()` và membership. Tránh policy đệ quy khi bảng membership tự truy vấn; ưu tiên helper chạy invoker hoặc thiết kế policy không đệ quy. Nếu cần `SECURITY DEFINER`, đặt `search_path` an toàn, thu hẹp execute grants, review quyền owner function và chỉ trả boolean/quyền tối thiểu. Grants và RLS policies phải được cấu hình riêng. Service-role key không dùng trong browser và không cần cho request người dùng thông thường.

## Indexes đề xuất

- `board_members(user_id, board_id)` và primary key `(board_id, user_id)` cho truy vấn board/member và policy.
- `columns(board_id, position)`.
- `cards(board_id, column_id, position)`; index `cards(assignee_user_id)` khi cần danh sách việc theo người.
- `comments(card_id, created_at)`.
- `activity_log(board_id, created_at DESC)`.

## State transitions

- **Card move**: cùng board; `column_id` và `position` cập nhật nguyên tử. Optimistic UI rollback về snapshot nếu lỗi. `version` hỗ trợ phát hiện conflict; response conflict cung cấp state mới nhất.
- **Assignment**: null ↔ user là BoardMember đang hoạt động. Gỡ member cần gỡ assignment hoặc yêu cầu owner xử lý trước; không để assignee mất quyền mà giao diện vẫn thể hiện như đang được phân công.
- **Column deletion**: chỉ owner; nếu có card phải chọn column đích hoặc di chuyển/xóa card trước khi commit.
- **Membership removal**: chỉ owner; quyền đọc/ghi chấm dứt sau commit và mọi thao tác kế tiếp bị RLS từ chối.
