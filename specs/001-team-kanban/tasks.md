# Tasks: Bảng Kanban cho nhóm nhỏ

**Input**: Design documents from `specs/001-team-kanban/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md), [quickstart.md](quickstart.md)

**Tests**: Không tạo test tasks riêng vì spec không yêu cầu TDD. Mỗi user story vẫn có tiêu chí kiểm chứng độc lập; hướng dẫn manual smoke validation nằm trong `quickstart.md`.

**Organization**: Tasks được nhóm theo user story và ưu tiên P1 → P2 → P3. Các task được đánh dấu `[P]` chỉ khi có thể thực hiện song song mà không sửa cùng file/chờ task chưa hoàn thành.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Có thể chạy song song với task khác trong cùng phase.
- **[Story]**: Nhãn user story tương ứng trong `spec.md`.
- Mọi task ghi rõ file path cần tạo hoặc sửa.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bổ sung dependencies và cấu hình môi trường cho Next.js + Supabase.

- [X] T001 [P] Thêm `@supabase/supabase-js` và `@supabase/ssr` vào `package.json`, cập nhật `package-lock.json`.
- [X] T002 [P] Tạo `.env.example` với `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; tạo `lib/env.ts` để kiểm tra biến môi trường bắt buộc.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cung cấp Supabase clients, session/auth guards, error contract, auth flow và i18n foundation `vi`/`en` mà mọi user story cần.

- [X] T003 [P] Tạo request-scoped Supabase server client trong `lib/supabase/server.ts` dùng cookie adapter `getAll`/`setAll`, đồng thời chuyển tiếp cache-prevention headers khi response cập nhật auth cookies.
- [X] T004 [P] Tạo Supabase browser client trong `lib/supabase/client.ts` bằng publishable key; không đọc hoặc chứa service-role/secret key ở client.
- [X] T005 Tạo `proxy.ts` để refresh/sync Supabase cookie session và hỗ trợ redirect sớm; không dùng Proxy làm authorization duy nhất.
- [X] T006 Tạo `lib/auth/require-user.ts` để xác minh identity bằng `getClaims()` (hoặc `getUser()` khi cần xác minh user record) và `lib/permissions/board.ts` để xác định owner/member quyền trên board.
- [X] T007 [P] Tạo response/error envelope dùng chung trong `lib/http/api-response.ts` và validation primitives trong `lib/validation/common.ts` theo `contracts/api.md`.
- [X] T008 Tạo signup, login, logout actions và auth form trong `app/(auth)/actions.ts`, `app/(auth)/signup/page.tsx`, `app/(auth)/login/page.tsx` và `components/auth/auth-form.tsx`; dùng email/password, lỗi login không tiết lộ email có đăng ký hay không, không yêu cầu email confirmation và mọi nhãn/trạng thái auth dùng dictionary theo ngôn ngữ đang chọn.
- [X] T031 [US4] (depends on T008) Tạo i18n foundation trong `lib/i18n/config.ts`, `lib/i18n/messages.ts`, `lib/i18n/server.ts` và `components/i18n/locale-provider.tsx`, `components/i18n/language-switcher.tsx`; hỗ trợ `vi`/`en`, mặc định `vi`, lưu lựa chọn trong cookie một năm, khởi tạo locale ở root layout, dịch metadata và action validation; thay landing page mẫu bằng landing page dùng hai ngôn ngữ.

**Checkpoint**: Auth cookie hoạt động; server có thể xác minh user; mọi API có chuẩn phản hồi lỗi và kiểm tra role dùng chung.

---

## Phase 3: User Story 1 — Tổ chức công việc trên board (Priority: P1) 🎯 MVP

**Goal**: Người dùng đăng nhập, tạo board với ba column mặc định, quản lý card và đổi trạng thái bằng thao tác mượt mà có rollback.

**Independent Test**: Đăng ký/đăng nhập, tạo board, xác nhận To Do / In Progress / Done, tạo card, di chuyển card giữa columns, tải lại để xác nhận thứ tự/trạng thái đã lưu; mô phỏng lỗi move và xác nhận card trở về vị trí đã lưu.

### Implementation

- [ ] T009 [US1] Tạo `supabase/migrations/202609270001_board_core.sql` cho `boards`, `board_members`, `columns`, `cards` và `activity_log`; giữ các rule trong data model: tên board “Bắt buộc, trim whitespace, độ dài giới hạn ở boundary”; column name “Bắt buộc sau trim”, `position` “Số nguyên >= 0”; card title “Bắt buộc, không chỉ whitespace”, description “Nullable, văn bản thuần; giới hạn độ dài ở boundary”, `assignee_user_id` nullable và phải là member cùng board, card position “Số nguyên >= 0”, version tăng khi card thay đổi; role chỉ `owner`/`member`, một owner mỗi board; card thuộc column cùng board; activity append-only. Bật RLS và cấu hình grants tối thiểu cho mọi bảng exposed.
- [ ] T010 [US1] (depends on T009) Tạo `supabase/migrations/202609270002_create_board.sql` với hàm transaction tạo board, membership owner và ba columns To Do/In Progress/Done theo `position` 0/1/2; nếu dùng `SECURITY DEFINER`, đặt `search_path` an toàn, fully qualify object names và giới hạn execute grants cho authenticated.
- [ ] T011 [P] [US1] (depends on T009) Tạo data access queries cho board/card trong `lib/boards/queries.ts` và `lib/cards/queries.ts`; chỉ trả DTO tối thiểu, sắp xếp columns/cards ổn định và không cache chung dữ liệu board theo user.
- [ ] T012 [US1] (depends on T010, T011) Tạo list/create board handlers trong `app/api/v1/boards/route.ts` và read/update board handler trong `app/api/v1/boards/[boardId]/route.ts`; chỉ owner được đổi tên, board mới phải tạo qua transaction T010.
- [ ] T013 [P] [US1] (depends on T009, T011) Tạo column create/update/delete handlers trong `app/api/v1/boards/[boardId]/columns/route.ts` và `app/api/v1/boards/[boardId]/columns/[columnId]/route.ts`; chỉ owner được thao tác, tên bắt buộc sau trim, position là số nguyên không âm, xóa column còn card phải nhận column đích cùng board hoặc trả `409 COLUMN_NOT_EMPTY`.
- [ ] T014 [P] [US1] (depends on T009, T011) Tạo card create/update/delete handlers trong `app/api/v1/boards/[boardId]/cards/route.ts` và `app/api/v1/boards/[boardId]/cards/[cardId]/route.ts`; owner/member có quyền board được CRUD, title bắt buộc không chỉ whitespace, description nullable plain text có giới hạn độ dài ở boundary, card phải thuộc column cùng board.
- [ ] T015 [US1] (depends on T009, T014) Tạo transaction move function trong `supabase/migrations/202609270003_move_card.sql` và handler `app/api/v1/boards/[boardId]/cards/[cardId]/move/route.ts`; kiểm tra column cùng board, `expectedVersion`, vị trí không âm, cập nhật thứ tự/version nguyên tử và trả `409 VERSION_CONFLICT` kèm state mới nhất khi dữ liệu stale.
- [ ] T016 [P] [US1] (depends on T011, T012, T031) Tạo trang danh sách board `app/(workspace)/boards/page.tsx`, trang board `app/(workspace)/boards/[boardId]/page.tsx` và form tạo board `components/board/create-board-form.tsx`; server pages đọc trực tiếp qua data access thay vì gọi HTTP nội bộ tới Route Handlers; mọi UI text dùng message dictionary `vi`/`en`.
- [ ] T017 [US1] (depends on T013, T014, T031) Tạo board view và column/card presentation trong `components/board/board-view.tsx`, `components/board/column.tsx` và `components/board/card.tsx`; hiển thị thứ tự đã lưu, dịch label và trạng thái mặc định, giữ nguyên user-generated content, giới hạn Client Component chỉ ở vùng tương tác.
- [ ] T018 [US1] (depends on T015, T017, T031) Tạo kéo thả optimistic với snapshot rollback khi mutation lỗi, trạng thái pending/error và cách move/reorder bằng bàn phím trong `components/board/kanban-board.tsx` và `components/board/card-move-controls.tsx`; mọi thông báo và accessibility labels dùng locale hiện tại; đảm bảo người dùng biết thao tác chưa lưu khi mất kết nối.

**Checkpoint**: US1 tự cung cấp giá trị Kanban cơ bản; board/card/state tồn tại sau reload và lỗi move không để UI báo thành công giả.

---

## Phase 4: User Story 2 — Phối hợp và phân công công việc (Priority: P2)

**Goal**: Owner quản lý thành viên; thành viên assign lẫn nhau, trao đổi comment và chỉ người có quyền mới đọc được nội dung.

**Independent Test**: Trên board đã có card và hai tài khoản, owner thêm member; member gán/bỏ gán owner hoặc member khác, thêm comment; tài khoản ngoài board không đọc được board/comment.

**Dependencies**: Cần board, card, membership và quyền nền từ US1.

### Implementation

- [ ] T019 [P] [US2] Tạo `supabase/migrations/202609270004_comments.sql` cho bảng comments; giữ rule “Bắt buộc sau trim, plain text, có giới hạn độ dài ở boundary”, author phải là member tại thời điểm tạo; bật RLS và grants tối thiểu, chỉ member cùng board được đọc/tạo.
- [ ] T020 [P] [US2] (depends on T009) Tạo `GET/POST /api/v1/boards/[boardId]/members` trong `app/api/v1/boards/[boardId]/members/route.ts` và remove handler `app/api/v1/boards/[boardId]/members/[userId]/route.ts`; owner mới được thêm/xóa, chỉ thêm account đã đăng ký, không cho gỡ owner, trả `409` nếu member còn là assignee để owner xử lý trước.
- [ ] T021 [P] [US2] (depends on T009) Tạo assign/unassign handler `app/api/v1/boards/[boardId]/cards/[cardId]/assignee/route.ts`; mọi owner/member của board được gán bất kỳ owner/member hiện tại nào cùng board hoặc gửi `userId: null` để bỏ gán; thay đổi và activity entry phải nguyên tử.
- [ ] T022 [US2] (depends on T019) Tạo comment queries và handlers trong `lib/comments/queries.ts` và `app/api/v1/boards/[boardId]/cards/[cardId]/comments/route.ts`; owner/member đọc/tạo, body bắt buộc sau trim, plain text có giới hạn độ dài ở boundary, lưu author/time và ghi activity nguyên tử.
- [ ] T023 [US2] (depends on T020, T031) Tạo UI quản lý thành viên song ngữ (thêm account đã đăng ký, xác nhận gỡ và thông báo khi account còn assignee) trong `components/board/member-management.tsx`.
- [ ] T024 [US2] (depends on T021, T022, T031) Tạo card detail UI song ngữ gồm assign picker cho mọi member, bỏ gán và comments có author/time trong `components/board/card-details.tsx`; localized errors/labels, giữ board state nhất quán khi mutation thất bại và không dịch user-generated comments.

**Checkpoint**: US2 cộng tác được trên board US1; role owner/member được thực thi cả ở server và RLS.

---

## Phase 5: User Story 3 — Theo dõi hoạt động gần đây (Priority: P3)

**Goal**: Member xem nhật ký hoạt động board mới nhất trước, có actor, đối tượng và thời điểm.

**Independent Test**: Tạo/sửa/xóa card, move/reorder, đổi assignee, tạo comment và thay đổi column; mở Activity Log và đối chiếu mỗi entry có đúng actor/action/object/time; tài khoản ngoài board không đọc được log.

**Dependencies**: Cần mutation paths của US1 và US2 để Activity Log phản ánh đầy đủ các sự kiện FR-008.

### Implementation

- [ ] T025 [P] [US3] (depends on T009, T012-T024) Tạo `supabase/migrations/202609270005_activity_triggers.sql` để ghi append-only activity cho card create/update/delete/move (phân biệt action), assignee changes, column changes và comment creation; actor lấy từ identity đã xác minh, không lưu password/session/comment trọn bộ; ghi trong transaction cùng mutation và chỉ member được đọc log.
- [ ] T026 [P] [US3] (depends on T009) Tạo activity query với cursor/limit trong `lib/activity/queries.ts` và `GET /api/v1/boards/[boardId]/activity/route.ts`; sắp xếp mới nhất trước, giới hạn page size, trả DTO actor/action/entity/time tối thiểu và từ chối non-member.
- [ ] T027 [US3] (depends on T025, T026, T031) Tạo activity feed song ngữ trong `components/board/activity-feed.tsx` và tích hợp vào `app/(workspace)/boards/[boardId]/page.tsx`; dịch action labels, empty/loading/error states, pagination/cursor và chỉ trình bày dữ liệu người xem được phép đọc.

**Checkpoint**: Log bao phủ toàn bộ sự kiện FR-008, bất biến với người dùng thường và không rò rỉ dữ liệu nhạy cảm.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Hoàn thiện khả năng truy cập, hiệu năng và hướng dẫn chạy/đánh giá sau khi các story đã tích hợp.

- [ ] T028 [P] Rà soát board query và render trong `lib/boards/queries.ts`, `lib/cards/queries.ts` và `components/board/board-view.tsx` để chỉ lấy field cần thiết, giữ ordering ổn định và đạt scope 10 members/500 cards theo SC-005 mà không cache chéo user.
- [ ] T029 [P] Hoàn thiện focus order, labels cho công nghệ hỗ trợ bằng cả hai ngôn ngữ, contrast và trạng thái không chỉ dùng màu trong `components/board/kanban-board.tsx`, `components/board/card-move-controls.tsx` và `app/globals.css` theo FR-013, FR-017 và constitution Principle IV.
- [ ] T030 Cập nhật `specs/001-team-kanban/quickstart.md` để khớp migrations, env vars, signup, locale switching, role checks, drag/drop rollback, activity scenarios và cách ghi nhận SC-002/SC-005 sau implementation.
- [ ] T032 [P] Rà soát message dictionary `lib/i18n/messages.ts` và toàn bộ UI để không còn system-generated text hard-coded, mọi message key có đủ `vi`/`en`, locale switch/persistence hoạt động trên từng story và user-generated content giữ nguyên.

---

## Dependencies & Execution Order

### Dependency Graph

```text
Setup (T001-T002)
  └── Foundation (T003-T008, T031)
        └── US1 P1 (T009-T018; UI tasks depend on T031)
              └── US2 P2 (T019-T024)
                    └── US3 P3 (T025-T027)
                          └── Polish (T028-T032)
```

### Story Dependencies

- **US1 (P1)**: Sau Foundation và T031; không phụ thuộc user story khác.
- **US2 (P2)**: Sau US1 vì card, board page và membership base là nơi cộng tác/assign/comment diễn ra.
- **US3 (P3)**: Sau US1 và US2 để ghi nhận đầy đủ card/column changes, assignment và comments theo FR-008.
- **Polish**: Sau các story muốn phát hành; hoàn thiện a11y/performance/docs và audit coverage `vi`/`en`.

### Parallel Opportunities

- **Setup**: T001 và T002 có thể chạy song song vì sửa các file khác nhau.
- **Foundation**: Sau T001-T002, T003, T004 và T007 có thể làm song song; T005 phụ thuộc T003/T004; T006 phụ thuộc server client; T008 phụ thuộc auth client/actions/guards; T031 tích hợp i18n với auth/layout sau T008.
- **US1**: Sau T009, T011 có thể song song với T010; T013 và T014 tách route/file nên có thể song song khi data model đã rõ. T015 cần schema và card model; T016 cần query layer; T018 cần T015 và board UI.
- **US2**: T019, T020 và T021 tách migration/route files nên có thể song song sau US1; T022 phụ thuộc T019; T024 phụ thuộc T021/T022.
- **US3**: T025 (ghi log) và T026 (đọc log/API) có thể làm song song vì tách migration/write và query/read; T027 cần cả hai.
- **Polish**: T028 và T029 có thể làm song song trên phần query/performance và accessibility/style riêng; T030 tổng hợp sau implementation.

### Parallel Example: US1

```text
Sau khi T009 hoàn tất:
- T010: transaction tạo board/default columns
- T011: board/card read queries

Sau khi T009 và T011 hoàn tất:
- T012: board endpoints
- T013: column endpoints
- T014: card endpoints

Sau khi API nền hoàn tất:
- T016: server pages/list/create board
- T017: board/column/card presentation
```

### Parallel Example: US2

```text
Sau khi US1 hoàn tất:
- T019: comments schema và RLS
- T020: owner member-management API
- T021: assign/unassign API

Sau khi T019 hoàn tất:
- T022: comments API/data access

Sau khi các API sẵn sàng:
- T023: member management UI
- T024: card assignment/comment UI
```

### Parallel Example: US3

```text
Sau khi US1 và US2 hoàn tất:
- T025: activity write triggers
- T026: activity read query/API

Sau khi T025 và T026 hoàn tất:
- T027: activity feed UI
```

## Implementation Strategy

### MVP First

1. Hoàn thành Setup, Foundation và i18n base (T031).
2. Hoàn thành US1 (T009-T018) để phát hành luồng tạo board, columns, cards và move.
3. Dừng ở checkpoint US1 để đánh giá độc lập bằng scenario A/C trong `quickstart.md`.
4. Bổ sung US2 để nhóm cộng tác, sau đó US3 để có Activity Log đầy đủ.

### Incremental Delivery

1. Setup + Foundation → auth và data access sẵn sàng.
2. US1 → MVP Kanban hoạt động độc lập.
3. US2 → thêm member, assign và comment.
4. US3 → ghi/đọc Activity Log cho mutation của US1/US2.
5. Polish → a11y, hiệu năng 500-card và quickstart khớp sản phẩm.

## Notes

- Mỗi dòng task tuân thủ `- [ ] T### [P?] [US#?] ...` và có file path cụ thể.
- `[P]` chỉ gắn cho task sửa file tách biệt và không phụ thuộc task chưa xong.
- Không thêm test tasks theo rule của `$speckit-tasks`; tiêu chí độc lập mô tả cách xác nhận giá trị story, còn `quickstart.md` giữ hướng dẫn thủ công.
- Field constraints được trích trong task migration/API để implementation không tự bỏ qua required/nullable/enum/same-board rules.
- Mọi UI/system message của các story MUST dùng `lib/i18n/messages.ts`; chỉ dịch system-generated text, giữ nguyên nội dung do người dùng nhập.
