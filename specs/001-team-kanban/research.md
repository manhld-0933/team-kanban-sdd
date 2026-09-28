# Nghiên cứu và quyết định kỹ thuật

## 1. Next.js cho FE và BE

**Decision**: Dùng Next.js 16 App Router và TypeScript trong một project. Dùng Server Components mặc định cho layout, trang board và đọc dữ liệu ban đầu; chỉ vùng board cần kéo thả, state tức thì và controls dùng Client Components. Dùng Route Handlers làm BFF JSON cho mutation từ giao diện tương tác. Server Components gọi data-access functions trực tiếp thay vì tự gọi HTTP đến Route Handler.

**Rationale**: Đây là cấu trúc phù hợp repo hiện tại (`next@16.3.6`, App Router và TypeScript đã có), giảm client JavaScript và tránh tách/hai lần round-trip. Route Handlers cung cấp ranh giới rõ cho các hành động từ client. Mọi Route Handler là entry point công khai và phải tự xác thực, phân quyền.

**Alternatives considered**: Client-only SPA tăng lượng JavaScript và đưa nhiều logic dữ liệu vào browser. Tách BE riêng không cần thiết cho quy mô MVP. Server Actions phù hợp mutation từ client, nhất là form; Route Handlers được chọn cho board mutations cần JSON response, status codes và rollback contract. Không dùng Route Handler làm proxy nội bộ cho truy vấn từ Server Component vì tạo thêm HTTP round-trip và có thể lỗi khi prerender.

**Sources**: Context7 `/vercel/next.js/v16.2.9` (Server/Client Components, BFF, Proxy boundary and data security); tài liệu Next.js 16.3.6 trong `node_modules/next/dist/docs/01-app/01-getting-started/{05-server-and-client-components,15-route-handlers,16-proxy}.md`; [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [Authentication](https://nextjs.org/docs/app/guides/authentication).

## 2. Supabase Auth và SSR

**Decision**: Dùng Supabase Auth email/password và `@supabase/ssr` với cookie-based session. Tạo browser/server clients riêng; server client dùng cookie adapter `getAll`/`setAll`. Dùng `getClaims()` để xác minh identity JWT ở server; dùng `getUser()` khi cần user record mới nhất từ Auth. Không dùng dữ liệu trả từ `getSession()` như bằng chứng identity server-side vì nó đọc session từ cookie/storage mà không tự xác minh với Auth server. Dùng Next.js 16 `proxy.ts` cho refresh/sync cookie và redirect sớm; xác thực và phân quyền vẫn phải chạy trong từng Route Handler/data access/RLS.

**Rationale**: Phù hợp FR-015 và hỗ trợ session cho render server-side. Server Components có thể không ghi được cookie trong render, nên refresh token cần chạy ở Proxy hoặc response-capable request layer. Adapter `setAll` cần chuyển cả cookies và headers về response; response đặt auth cookies phải có `Cache-Control: private, no-cache, no-store...` để không làm lộ session qua CDN/reverse proxy. Pin package version và cô lập API trong adapter.

**Decision from spec**: Email verification và password recovery ngoài MVP; sign-up dùng cấu hình cho phép phiên hoạt động ngay. Đây là trade-off để giữ luồng đăng ký đơn giản; chỉ thành viên đã có tài khoản mới được owner thêm vào board.

**Alternatives considered**: Chỉ dùng Supabase client ở browser không phù hợp SSR/session cookies. Tự quản lý password/session làm tăng phạm vi bảo mật và không cần thiết.

**Sources**: Context7 `/supabase/ssr` (createServerClient API, cookie adapter, session verification and cache headers); [Supabase SSR Auth](https://supabase.com/docs/guides/auth/server-side), [Creating a Supabase client for SSR with Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&package-manager=npm&queryGroups=framework&queryGroups=package-manager), [Password security](https://supabase.com/docs/guides/auth/password-security).

## 3. Supabase Postgres, quan hệ và RLS

**Decision**: Dùng quan hệ Postgres chuẩn; `auth.users.id` là identity key được tham chiếu bởi board membership, owner, assignee, comment author và activity actor. Bật RLS cho mọi bảng ứng dụng có thể truy cập qua Data API và cấu hình grants riêng theo least privilege. Policy giới hạn board theo membership; thao tác board/column/member chỉ owner, còn thao tác card/comment/assign/log theo quyền member. Dùng publishable key cho client; secret/service-role key chỉ ở môi trường server có nhu cầu quản trị đặc biệt. Thêm index cho khóa dùng trong policy và truy vấn board.

**Rationale**: RLS áp dụng authorization tại lớp dữ liệu, kể cả khi Route Handler có lỗi; server handler vẫn xác thực và áp dụng quyền để trả lỗi nghiệp vụ dễ hiểu. Policies không thay thế grants và không tự thu hồi quyền truy cập bảng; migrations cần thiết lập cả hai. Publishable key có thể được expose khi RLS và grants đã đúng; secret/service-role key bypass RLS nên tuyệt đối không đưa ra client.

**Alternatives considered**: Chỉ kiểm soát quyền trong UI hoặc Route Handler không bảo vệ trực tiếp trước truy vấn Data API. Database riêng nằm ngoài Supabase làm tăng hạ tầng và không tận dụng stack người dùng chọn.

**Sources**: Context7 `/supabase/supabase` (RLS, grants, security-definer functions and key safety); [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Securing the Data API](https://supabase.com/docs/guides/api/securing-your-api), [Managing user data](https://supabase.com/docs/guides/auth/managing-user-data).

## 4. Tính nguyên tử khi di chuyển card và ghi Activity Log

**Decision**: API move gọi một Postgres function/RPC transaction duy nhất để xác minh board/column, cập nhật column + position và ghi activity entry nguyên tử. Ưu tiên function chạy với quyền caller/RLS (invoker). Nếu implementation bắt buộc `SECURITY DEFINER`, đặt `search_path` an toàn, thu hẹp execute grants, review quyền owner function và chỉ expose quyền tối thiểu. Client cập nhật optimistic trước request; nếu validation, permission hoặc persistence thất bại, rollback snapshot và hiển thị lỗi. Gửi position và phiên bản/vị trí mong đợi để xử lý cập nhật đồng thời; conflict trả về 409 cùng board state mới nhất hoặc yêu cầu refresh.

**Rationale**: Hai lệnh ghi tách rời có thể để card đã di chuyển nhưng thiếu log (hoặc ngược lại). Transaction cho tính nhất quán cần bởi constitution; rollback thực hiện theo lựa chọn clarify.

**Alternatives considered**: Ghi activity bằng request thứ hai không đảm bảo atomicity. Chỉ reorder ở client không duy trì thứ tự bền vững giữa các thành viên.

**Sources**: [Supabase Database Functions](https://supabase.com/docs/guides/database/functions), [Postgres Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 5. API và phân lớp dữ liệu

**Decision**: Dùng JSON Route Handler contracts cùng status/error envelope nhất quán. Route Handler tạo request-scoped Supabase server client từ cookie, xác minh identity, validate payload, kiểm tra role, gọi data-access/transaction function và trả DTO tối thiểu. Server Component đọc qua cùng data-access layer trực tiếp. Tránh cache chung cho kết quả phụ thuộc người dùng; mọi response ghi/refresh auth cookies phải cấm shared caching.

**Rationale**: Tách rõ transport, authorization và persistence, đồng thời đáp ứng phản hồi lỗi để client hoàn tác tương tác optimistic. Next.js không cache Route Handler mặc định theo docs hiện hành, nhưng server fetch/cache vẫn phải được xem xét rõ theo từng luồng người dùng.

**Alternatives considered**: Gọi database trực tiếp từ mọi Client Component làm ranh giới authorization và quản lý lỗi khó thống nhất. Tạo REST server độc lập là quá mức cho MVP.

**Sources**: Context7 `/vercel/next.js/v16.2.9` (Server/Client Components, BFF, Proxy boundaries and data security); [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [Next.js Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend), [Next.js Data Security](https://nextjs.org/docs/app/guides/data-security).

## 6. Internationalization cho Vietnamese và English

**Decision**: Giai đoạn đầu dùng TypeScript dictionaries nội bộ với `vi`/`en`, type-safe message keys, React context/provider và cookie preference `team-kanban-locale`. Mặc định `vi`; root layout đọc cookie để render đúng locale ngay từ server, language switcher cập nhật UI tức thì và lưu lựa chọn một năm. Server Actions đọc cùng preference để trả validation/auth messages đúng locale. Chỉ system-generated UI text được dịch; board names, card titles, comments và dữ liệu người dùng khác giữ nguyên.

**Rationale**: MVP chỉ cần hai ngôn ngữ và không cần locale nằm trong URL/SEO. Cookie preference tránh đổi route hay auth redirect, đồng thời dùng chung được cho server/client rendering. Không thêm dependency i18n runtime; dictionary được tách theo namespace khi các story mở rộng.

**Constraints**: Mọi story mới phải dùng translation keys cho labels, accessibility text và loading/empty/error states; không hard-code thêm câu hiển thị cho user. Message keys bắt buộc có bản dịch ở cả `vi` và `en`.

**Alternatives considered**: Locale trong URL phù hợp khi cần chia sẻ link/SEO theo ngôn ngữ nhưng sẽ làm đổi route structure. Browser `Accept-Language` không được dùng làm preference chính vì sản phẩm yêu cầu default Vietnamese và có lựa chọn tường minh của user.

## Công cụ tra cứu

Context7 đã được truy vấn trong phiên cập nhật này cho `/vercel/next.js/v16.2.9`, `/supabase/ssr` và `/supabase/supabase`. Repository đang cài Next.js 16.3.6; đối chiếu thêm docs cài trong `node_modules/next/dist/docs` vì version Context7 gần nhất được trả về là 16.2.9. Các nguồn và quyết định được rà soát ngày 2026-09-27; xác nhận package versions trước implementation.
