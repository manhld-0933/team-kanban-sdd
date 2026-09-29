# Implementation Plan: Bảng Kanban cho nhóm nhỏ

**Branch**: `001-team-kanban` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-team-kanban/spec.md`

## Summary

Xây dựng web application Kanban cho nhóm nhỏ với đăng ký/đăng nhập email-mật khẩu, giao diện tiếng Việt/English, board có vai trò chủ sở hữu/thành viên, column và card, kéo thả cập nhật tức thì có rollback, assign, comment và Activity Log. Hoàn thiện session lifecycle để auth page redirect đúng theo trạng thái đăng nhập, có logout từ workspace và hỗ trợ tạo một demo board idempotent riêng cho mỗi owner với cards mẫu được gán cho owner. Dùng Next.js App Router + TypeScript cho cả giao diện và backend-for-frontend, Supabase Auth cho danh tính và Supabase Postgres cho dữ liệu. Demo board không tạo Auth users hoặc board memberships ngoài owner hiện tại. Mọi dữ liệu board được bảo vệ bằng Row Level Security (RLS); các thao tác nhiều bản ghi cần tính nguyên tử, như tạo board mặc định, demo board hay di chuyển card và ghi log, thực hiện trong transaction ở Postgres.

## Technical Context

**Language/Version**: TypeScript 5.x (đã có trong repo), Node.js 20.9 trở lên theo yêu cầu Next.js hiện hành.

**Primary Dependencies**: Next.js 16.3.6, React 19.2.8, Supabase JS và `@supabase/ssr`. I18n dùng TypeScript message dictionaries nội bộ, không thêm thư viện runtime.

**Storage**: Supabase Postgres; Supabase Auth lưu danh tính và quản lý phiên email/mật khẩu.

**Testing**: Chưa có test runner trong repo. Plan yêu cầu kiểm chứng unit/domain, integration cho RLS và thao tác transaction, cùng end-to-end các luồng trong spec; lựa chọn thư viện test thuộc bước implementation.

**Target Platform**: Web hiện đại trên desktop/tablet; Next.js chạy trên Node-compatible hosting, Supabase cung cấp Auth và Postgres.

**Project Type**: Full-stack web application dùng một Next.js project cho FE và BE.

**Performance Goals**: Đạt SC-002: ít nhất 95% thao tác chuyển card được xác nhận trong 2 giây ở kết nối bình thường. Đạt SC-005 trên board 10 thành viên/500 card: mở board và tìm trạng thái card trong tối đa 5 giây ở ít nhất 90% lần thử. Kéo thả cập nhật optimistic; rollback nếu API/database từ chối thao tác.

**Constraints**: Phân quyền bắt buộc ở server/database; dùng Supabase publishable key ở browser cùng RLS/grants tối thiểu; không dùng service-role/secret key ở browser. Bật RLS trên các bảng exposed; mọi truy vấn giới hạn theo board membership và role. Ghi activity cùng transaction với thay đổi tương ứng. Không cache dữ liệu board cá nhân hóa hoặc response đang set auth cookies dùng chung giữa người dùng. Ưu tiên Server Components cho render/đọc dữ liệu và giới hạn Client Components ở board tương tác. UI dùng dictionaries có type-safe keys cho `vi` và `en`; locale mặc định `vi`, lưu trong cookie preference và khởi tạo ở root layout để SSR render đúng ngôn ngữ. Dịch system-generated strings, không dịch nội dung do người dùng nhập.

**Scale/Scope**: Nhóm tối đa khoảng 10 thành viên/board; kiểm thử trải nghiệm tới 500 card/board. MVP gồm auth, board, column, card, assign đơn, comment, activity log, logout/session routing và một demo board cho mỗi owner; không gồm email invitation, xác minh email, khôi phục mật khẩu, realtime push hay mobile chuyên biệt.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Đánh giá ban đầu | Thiết kế đáp ứng |
|---|---|---|
| Trải nghiệm mượt mà, nhất quán | PASS | Board render nhanh; thao tác kéo thả optimistic có rollback; loading/error/empty states rõ ràng. |
| Hiệu năng là yêu cầu sản phẩm | PASS | Server Components cho phần đọc/render; client bundle giới hạn trong tương tác; đo theo SC-002/SC-005. |
| Dữ liệu Kanban nhất quán và phục hồi | PASS | Transaction cho move/activity, kiểm soát vị trí và rollback khi lỗi; kiểm tra xung đột đồng thời. |
| Dễ sử dụng cho nhiều người dùng | PASS | Có thao tác thay thế kéo thả bằng bàn phím; trạng thái không phụ thuộc màu sắc; nội dung UI hỗ trợ tiếng Việt và tiếng Anh. |
| Chất lượng, bảo mật, khả năng quan sát | PASS | Supabase Auth cookie SSR, RLS + least-privilege grants, xác minh identity và quyền trong từng request; activity/log không lưu bí mật. |
| Tài liệu và quy trình dự án | PASS | Spec, plan và artifacts viết tiếng Việt; acceptance criteria được giữ làm chuẩn kiểm chứng. |

Không có vi phạm constitution cần exception.

**Post-design gate**: PASS sau khi rà soát `research.md`, `data-model.md` và contracts. RLS/grants, cookie session verification, no-cache cho auth responses và nguyên tử tính của move/activity được ghi thành ràng buộc trong các design artifacts.

## Project Structure

### Documentation (this feature)

```text
specs/001-team-kanban/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
└── tasks.md              # Sinh bởi $speckit-tasks, không thuộc plan này
```

### Source Code (repository root)

```text
app/
├── page.tsx
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (workspace)/
│   └── boards/[boardId]/page.tsx
└── api/v1/
    ├── boards/route.ts
    └── boards/[boardId]/
        ├── route.ts
        ├── members/route.ts
        ├── columns/route.ts
        ├── cards/route.ts
        ├── cards/[cardId]/route.ts
        ├── cards/[cardId]/move/route.ts
        ├── cards/[cardId]/assignee/route.ts
        ├── cards/[cardId]/comments/route.ts
        └── activity/route.ts
components/
├── board/
├── i18n/
├── auth/
└── ui/
lib/
├── i18n/
│   ├── config.ts
│   ├── messages.ts
│   └── server.ts
├── supabase/
│   ├── client.ts
│   └── server.ts
├── auth/
├── validation/
└── permissions/
supabase/
└── migrations/
tests/
├── unit/
├── integration/
└── e2e/
proxy.ts
```

**Structure Decision**: Dùng một Next.js App Router project hiện có, không tách frontend/backend thành hai ứng dụng. UI pages/layouts mặc định là Server Components; board drag/drop là Client Component riêng. Route Handlers trong `app/api/v1` là backend-for-frontend cho thao tác board cần JSON response/rollback. Server Components gọi trực tiếp data-access functions, không tự gọi HTTP ngược vào Route Handler. Supabase SSR clients dùng cookie `getAll`/`setAll`; `proxy.ts` đồng bộ/refresh session và hỗ trợ redirect sớm. Mỗi Route Handler vẫn xác minh identity (ví dụ qua `getClaims`, hoặc `getUser` khi cần xác minh user record) và quyền; Proxy không thay thế authorization ở data layer/RLS. Response ghi auth cookies phải mang header ngăn CDN/reverse-proxy cache. Migration SQL được lưu trong `supabase/migrations`.

## Complexity Tracking

Không có vi phạm constitution; không cần ngoại lệ.
