# Feature Specification: Bảng Kanban cho nhóm nhỏ

**Feature Branch**: `001-team-kanban`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "Xây dựng Kanban board cho nhóm nhỏ (To Do / In Progress / Done). Người dùng tạo Board, List/Column, Card (task), kéo–thả để đổi trạng thái, comment và gán người phụ trách. Có Activity Log cơ bản."

## Clarifications

### Session 2026-09-27

- Q: Khi kéo card sang column khác, bạn muốn trạng thái mới được cập nhật tức thì rồi hoàn tác nếu lưu thất bại, hay chỉ đổi vị trí sau khi lưu thành công? → A: Cập nhật tức thì; nếu lưu thất bại thì hoàn tác về vị trí đã lưu và báo lỗi.
- Q: Ai được phép gán người phụ trách cho một card? → A: Bất kỳ thành viên board nào cũng có thể gán hoặc bỏ gán bất kỳ thành viên board nào.
- Q: Thành viên sẽ đăng nhập vào Team Kanban bằng cách nào? → A: Người dùng tự đăng ký và đăng nhập bằng email cùng mật khẩu.
- Q: Những quyền nào nên dành riêng cho chủ sở hữu board, còn thành viên thường được phép làm gì? → A: Chủ sở hữu quản lý board, column và thành viên; thành viên quản lý card/comment, assign và xem Activity Log.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tổ chức công việc trên board (Priority: P1)

Người tạo board thiết lập một không gian công việc cho nhóm, tạo các column và card, rồi cập nhật trạng thái bằng cách di chuyển card giữa các column. Board mới có sẵn To Do, In Progress và Done để nhóm có thể bắt đầu ngay.

**Why this priority**: Đây là luồng cốt lõi tạo giá trị Kanban; nhóm có thể theo dõi tiến độ ngay cả khi chưa dùng các chức năng cộng tác khác.

**Independent Test**: Tạo board, thêm card, chuyển card qua các trạng thái và xác nhận board hiển thị đúng nội dung cùng thứ tự sau khi tải lại.

**Acceptance Scenarios**:

1. **Given** người dùng đã đăng nhập và chưa có board, **When** họ tạo board với tên hợp lệ, **Then** họ trở thành chủ sở hữu và board mới xuất hiện với các column To Do, In Progress và Done.
2. **Given** một board, **When** chủ sở hữu tạo, sửa hoặc xóa column, **Then** board phản ánh thay đổi và không làm mất các card còn tồn tại mà không có thông báo.
3. **Given** một column, **When** người dùng tạo card với tiêu đề, **Then** card xuất hiện trong column đó.
4. **Given** một card trong board, **When** người dùng kéo card sang column khác, **Then** trạng thái và vị trí mới được lưu, hiển thị nhất quán sau khi tải lại.
5. **Given** thao tác kéo thả không thành công, **When** hệ thống báo lỗi, **Then** card được hoàn tác về vị trí đã lưu.

---

### User Story 2 - Phối hợp và phân công công việc (Priority: P2)

Thành viên trong nhóm xem board dùng chung, gán người phụ trách cho card và trao đổi bối cảnh qua comment để biết ai đang làm gì và cần phối hợp ra sao.

**Why this priority**: Phân công và trao đổi giúp board trở thành công cụ làm việc nhóm, sau khi nền tảng theo dõi trạng thái đã hoạt động.

**Independent Test**: Với board có nhiều thành viên, gán một thành viên cho card, thêm comment, rồi xác nhận thành viên khác nhìn thấy người phụ trách và nội dung trao đổi.

**Acceptance Scenarios**:

1. **Given** board có thành viên, **When** bất kỳ thành viên board nào gán hoặc bỏ gán một thành viên board trên card, **Then** người phụ trách hiện tại được hiển thị rõ ràng trên card.
2. **Given** card, **When** thành viên đăng comment, **Then** comment cùng người viết và thời điểm được hiển thị trong trao đổi của card.
3. **Given** board hoặc card mà người dùng không có quyền truy cập, **When** họ thử xem hoặc thay đổi nội dung, **Then** hệ thống từ chối thao tác và không tiết lộ nội dung riêng tư.
4. **Given** một board, **When** chủ sở hữu thêm hoặc xóa thành viên, **Then** quyền truy cập được cập nhật và thành viên đã bị xóa không thể tiếp tục xem hoặc thay đổi board.
5. **Given** một thành viên thường, **When** họ thử đổi tên board, quản lý thành viên hoặc sửa/xóa column, **Then** thao tác bị từ chối và dữ liệu không thay đổi.

---

### User Story 3 - Theo dõi hoạt động gần đây (Priority: P3)

Thành viên xem Activity Log của board để biết các thay đổi quan trọng như tạo card, đổi trạng thái, thay đổi người phụ trách và comment.

**Why this priority**: Nhật ký giúp nhóm hiểu tiến trình và truy nguyên thay đổi, nhưng không cần thiết để tạo và quản lý công việc cơ bản.

**Independent Test**: Thực hiện các thay đổi được ghi nhận trên board, mở Activity Log và kiểm tra từng mục có nội dung, người thực hiện và thời điểm phù hợp.

**Acceptance Scenarios**:

1. **Given** thành viên thực hiện thay đổi được hỗ trợ, **When** thay đổi được lưu, **Then** Activity Log ghi lại hành động, người thực hiện, đối tượng liên quan và thời điểm.
2. **Given** Activity Log có nhiều mục, **When** thành viên mở nhật ký, **Then** các hoạt động mới nhất được hiển thị trước.
3. **Given** người dùng không có quyền truy cập board, **When** họ yêu cầu Activity Log, **Then** nội dung nhật ký không được tiết lộ.

### User Story 4 - Sử dụng giao diện tiếng Việt hoặc tiếng Anh (Priority: P2)

Người dùng chọn Vietnamese hoặc English để đọc giao diện theo ngôn ngữ họ quen dùng. Lựa chọn được giữ khi chuyển trang và tải lại trên cùng trình duyệt; nội dung do người dùng nhập được giữ nguyên.

**Why this priority**: Nhóm có thể phối hợp dù thành viên quen dùng ngôn ngữ giao diện khác nhau, đồng thời lựa chọn ngôn ngữ không làm thay đổi dữ liệu công việc.

**Independent Test**: Chuyển từ tiếng Việt sang English ở trang đăng nhập, mở trang đăng ký và quay lại; xác nhận nhãn/trạng thái đổi ngôn ngữ và lựa chọn vẫn còn sau tải lại. Lặp lại theo chiều ngược lại.

**Acceptance Scenarios**:

1. **Given** người dùng chưa chọn ngôn ngữ, **When** họ mở ứng dụng, **Then** giao diện hiển thị tiếng Việt.
2. **Given** người dùng chọn English, **When** họ chuyển giữa các trang hoặc tải lại, **Then** giao diện tiếp tục hiển thị English.
3. **Given** giao diện đang dùng một trong hai ngôn ngữ, **When** người dùng đổi lựa chọn, **Then** nội dung UI, validation, loading, empty và error states dùng ngôn ngữ mới mà không cần đăng xuất.
4. **Given** board có nội dung do người dùng nhập, **When** người dùng đổi ngôn ngữ giao diện, **Then** tên board, column, card và comment vẫn được giữ nguyên.

### User Story 5 - Quản lý phiên đăng nhập và tạo dữ liệu mẫu (Priority: P2)

Người dùng đang đăng nhập được đưa thẳng về danh sách board nếu mở lại màn login/signup; họ có thể đăng xuất từ workspace để đăng nhập bằng tài khoản khác. Người dùng cũng có thể tạo một board mẫu có card, membership và Activity Log để khám phá giao diện.

**Why this priority**: Hành vi phiên rõ ràng giúp tránh trạng thái auth khó hiểu; dữ liệu mẫu giúp người dùng xem nhanh các luồng board mà không phải tự nhập dữ liệu ban đầu.

**Independent Test**: Đăng nhập, mở `/login` và xác nhận được chuyển về `/boards`; đăng xuất và xác nhận về `/login`, sau đó `/boards` yêu cầu đăng nhập. Nhấn tạo dữ liệu mẫu và xác nhận chỉ có tối đa một demo board cho tài khoản, có ba column mặc định, sample cards, membership của owner và Activity Log được ghi.

**Acceptance Scenarios**:

1. **Given** người dùng đã đăng nhập, **When** họ mở `/login` hoặc `/signup`, **Then** server chuyển họ về `/boards` và không render auth form.
2. **Given** người dùng đang ở workspace, **When** họ chọn đăng xuất, **Then** Supabase session/cookie được xóa và trình duyệt chuyển tới `/login`; truy cập lại `/boards` yêu cầu đăng nhập.
3. **Given** người dùng đã đăng nhập và chưa có demo board, **When** họ chọn tạo dữ liệu mẫu, **Then** hệ thống tạo một board riêng cho owner hiện tại với ba column mặc định, các card ví dụ do owner phụ trách, owner membership và activity tương ứng.
4. **Given** người dùng đã có demo board hoặc gửi request tạo lặp lại, **When** họ tạo dữ liệu mẫu lần nữa, **Then** hệ thống trả về demo board hiện có và không tạo bản sao.
5. **Given** hai request tạo demo board đồng thời, **When** chúng được xử lý, **Then** database chỉ giữ một demo board cho owner và cả hai request nhận cùng board đó.

### Edge Cases

- Tiêu đề board, column hoặc card rỗng hay chỉ gồm khoảng trắng bị từ chối với thông báo có thể hiểu được.
- Khi xóa column còn card, người dùng được thông báo và phải chọn cách xử lý card trước khi hoàn tất.
- Khi thành viên được gán bị xóa khỏi board, card không bị mất; trạng thái phân công được làm rõ và có thể gán lại.
- Nếu hai thành viên sửa cùng một card gần như đồng thời, hệ thống không được âm thầm ghi đè dữ liệu mới hơn; kết quả hoặc xung đột phải được thông báo.
- Nếu mất kết nối trong lúc di chuyển card, giao diện hoàn tác card về vị trí đã lưu và báo thao tác chưa thành công.
- Board chưa có card, comment hoặc activity vẫn hiển thị trạng thái trống và cách bắt đầu phù hợp.
- Nội dung comment dài hoặc có ký tự đặc biệt được hiển thị an toàn và không làm hỏng board.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Người dùng MUST có thể tạo board với tên không rỗng và xem danh sách board họ được phép truy cập.
- **FR-002**: Khi tạo board, hệ thống MUST tạo sẵn ba column To Do, In Progress và Done theo đúng thứ tự.
- **FR-003**: Chỉ chủ sở hữu board MUST có thể tạo, đổi tên, sắp xếp và xóa column; khi xóa column còn card, hệ thống MUST yêu cầu xử lý card trước khi xóa.
- **FR-004**: Thành viên board MUST có thể tạo, sửa và xóa card; card MUST có tiêu đề và thuộc một column.
- **FR-005**: Khi người dùng kéo card sang column khác, giao diện MUST cập nhật vị trí và trạng thái tức thì; nếu lưu thất bại, MUST hoàn tác card về vị trí đã lưu và thông báo lỗi.
- **FR-006**: Bất kỳ thành viên board nào MUST có thể gán hoặc bỏ gán bất kỳ thành viên board nào làm người phụ trách card.
- **FR-007**: Thành viên có quyền truy cập card MUST có thể thêm comment và xem các comment cùng người viết và thời điểm tạo.
- **FR-008**: Hệ thống MUST duy trì Activity Log theo board cho các sự kiện: tạo, sửa, xóa card; thay đổi column hoặc thứ tự card; thay đổi người phụ trách; tạo comment; và các thay đổi column. Mỗi mục MUST có loại hành động, người thực hiện, đối tượng liên quan và thời điểm.
- **FR-009**: Activity Log MUST hiển thị hoạt động mới nhất trước và chỉ người có quyền truy cập board mới được xem.
- **FR-010**: Board MUST có hai vai trò: chủ sở hữu và thành viên. Người tạo board là chủ sở hữu; chỉ chủ sở hữu MUST có thể đổi tên board, quản lý column và thêm hoặc xóa thành viên. Thành viên MUST có thể quản lý card, comment, assign người phụ trách và xem Activity Log. Chỉ thành viên hiện tại mới có thể được gán làm người phụ trách.
- **FR-011**: Hệ thống MUST xác thực quyền truy cập ở mỗi thao tác đọc hoặc thay đổi board, card, comment và Activity Log.
- **FR-012**: Các thao tác lưu thành công hoặc thất bại MUST có phản hồi rõ ràng; giao diện MUST giữ trạng thái dữ liệu nhất quán sau lỗi hoặc xung đột cập nhật.
- **FR-013**: Các thao tác chính MUST dùng được bằng bàn phím; di chuyển card MUST có cách thao tác thay thế không phụ thuộc kéo thả.
- **FR-014**: Khi không có dữ liệu, đang tải hoặc xảy ra lỗi, giao diện MUST hiển thị trạng thái và hướng xử lý phù hợp bằng tiếng Việt.
- **FR-015**: Người dùng MUST có thể đăng ký bằng email và mật khẩu, đăng nhập, đăng xuất và chỉ truy cập board sau khi đăng nhập thành công. Người tạo board là chủ sở hữu; người được chủ sở hữu thêm vào board là thành viên.
- **FR-016**: Email tài khoản MUST là duy nhất; khi đăng nhập thất bại, hệ thống MUST thông báo lỗi mà không tiết lộ email có đăng ký hay không.
- **FR-017**: Giao diện MUST hỗ trợ tiếng Việt và tiếng Anh, mặc định là tiếng Việt, cho phép đổi ngôn ngữ mà không cần đăng xuất và ghi nhớ lựa chọn trên cùng trình duyệt. Mọi system-generated UI text, gồm validation, accessibility labels và các trạng thái loading/empty/error, MUST dùng ngôn ngữ đang chọn; nội dung do người dùng nhập MUST giữ nguyên.
- **FR-018**: Người dùng có session hợp lệ khi mở `/login` hoặc `/signup` MUST được redirect ở server tới `/boards`; người dùng chưa đăng nhập khi truy cập workspace MUST được redirect tới `/login`.
- **FR-019**: Workspace MUST cung cấp thao tác đăng xuất để kết thúc Supabase session, xóa auth cookies và redirect tới `/login`; thao tác thất bại MUST hiển thị thông báo phù hợp.
- **FR-020**: Người dùng đã đăng nhập MUST có thể tạo dữ liệu mẫu gồm đúng một demo board riêng cho mỗi owner, ba column mặc định, cards mẫu được gán cho owner, owner membership và Activity Log. Thao tác MUST idempotent và transaction bảo đảm không tạo board trùng khi request lặp hoặc đồng thời; MUST NOT tạo Auth users hoặc board memberships mẫu.
- **FR-021**: Chủ sở hữu MUST có thể xóa board từ danh sách boards sau khi xác nhận; thao tác xóa MUST xóa dữ liệu board phụ thuộc và từ chối member thường.

### Key Entities

- **Board**: Không gian công việc do người dùng tạo, có tên, chủ sở hữu, các thành viên với vai trò chủ sở hữu hoặc thành viên, danh sách column và Activity Log.
- **Column**: Nhóm trạng thái trong board, có tên và vị trí sắp xếp; mỗi card thuộc một column.
- **Card (Task)**: Đơn vị công việc có tiêu đề, nội dung mô tả tùy chọn, trạng thái/vị trí trong board, người phụ trách tùy chọn và các comment.
- **Thành viên**: Người dùng có tài khoản được cấp quyền truy cập board ở vai trò chủ sở hữu hoặc thành viên; quyền thao tác phụ thuộc vai trò và thành viên có thể được gán phụ trách card.
- **Comment**: Nội dung trao đổi gắn với card, có người viết và thời điểm tạo.
- **Activity Log Entry**: Bản ghi một sự kiện trên board, gồm hành động, người thực hiện, đối tượng và thời điểm.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người dùng mới có thể tạo board và card đầu tiên trong tối đa 2 phút trong ít nhất 90% lần thử có hướng dẫn cơ bản.
- **SC-002**: Ít nhất 95% thao tác chuyển card được xác nhận thành công trong vòng 2 giây khi kết nối hoạt động bình thường.
- **SC-003**: Ít nhất 90% người dùng thử nghiệm hoàn thành việc phân công một card và thêm comment mà không cần trợ giúp.
- **SC-004**: 100% các sự kiện thuộc phạm vi FR-008 xuất hiện trong Activity Log với người thực hiện và thời điểm chính xác sau khi thao tác được lưu thành công.
- **SC-005**: Trong thử nghiệm với 10 thành viên và 500 card trên một board, người dùng có thể mở board và xác định trạng thái của một card trong tối đa 5 giây ở ít nhất 90% lần thử.
- **SC-006**: Không người dùng nào ngoài thành viên được cấp quyền có thể xem board, comment hoặc Activity Log trong các kiểm tra truy cập trái phép.
- **SC-007**: Người dùng có thể chuyển đổi Vietnamese/English và tiếp tục thấy ngôn ngữ đã chọn sau điều hướng hoặc tải lại; dữ liệu board do người dùng nhập không đổi khi chuyển ngôn ngữ.
- **SC-008**: 100% phiên đăng nhập đã có hiệu lực được redirect khỏi `/login` và `/signup`; sau logout, truy cập workspace không còn được phép cho đến khi đăng nhập lại.
- **SC-009**: Gọi thao tác tạo dữ liệu mẫu lặp lại hoặc đồng thời vẫn chỉ tạo một demo board cho cùng owner; board có ba column, cards, membership và activity entries sau khi transaction commit.

## Assumptions

- Phiên bản đầu phục vụ nhóm nhỏ, tối đa khoảng 10 thành viên cùng cộng tác trên một board; giới hạn này là giả định kiểm thử và có thể được điều chỉnh khi có baseline sử dụng.
- Người dùng tạo tài khoản bằng email và mật khẩu; xác minh email và khôi phục mật khẩu chưa thuộc phạm vi phiên bản đầu.
- Thành viên cần có tài khoản trước khi người tạo board thêm họ vào board; mời qua email chưa thuộc phạm vi yêu cầu hiện tại.
- Người tạo board đồng thời là chủ sở hữu ban đầu của board.
- Mỗi card thuộc đúng một board và một column tại một thời điểm; mỗi card có tối đa một người phụ trách.
- Comment được giữ cùng card; Activity Log là nhật ký cơ bản để theo dõi hoạt động gần đây, không bao gồm xuất báo cáo hay cấu hình retention.
- Giao diện responsive trên màn hình desktop và tablet; trải nghiệm mobile chuyên biệt chưa phải tiêu chí phát hành của phiên bản đầu.
- Phản hồi hiệu năng đo trong Success Criteria giả định kết nối hoạt động bình thường; ngưỡng được xem xét lại khi có dữ liệu sử dụng thực tế.
- Ngôn ngữ mặc định là tiếng Việt; lựa chọn Vietnamese/English được lưu bằng browser preference trên cùng trình duyệt, chưa đồng bộ giữa các thiết bị hay tài khoản.
