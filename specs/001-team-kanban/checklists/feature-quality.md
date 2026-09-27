# Feature Requirements Quality Checklist: Bảng Kanban cho nhóm nhỏ

**Purpose**: Review độ đầy đủ, rõ ràng, nhất quán và khả năng đo lường của requirements cho feature Kanban
**Created**: 2026-09-27
**Feature**: [spec.md](../spec.md)

**Note**: Checklist này đánh giá chất lượng nội dung requirements, không đánh giá implementation.
**Review Ownership**: Checklist thuộc reviewer; chỉ đánh dấu `[x]` khi reviewer xác nhận tiêu chí chất lượng requirements đã đạt.
**Marker Semantics**: `[x]` nghĩa là yêu cầu được viết đủ rõ/đủ đầy đủ; không có nghĩa implementation đã hoàn thành.

## Requirement Completeness

- [x] CHK001 Các requirements có mô tả đầy đủ vòng đời board từ lúc tạo đến lúc thêm/xóa thành viên không? [Completeness, Spec §FR-001, §FR-010]
- [x] CHK002 Quyền owner và member có được phân biệt cho tất cả thao tác board, column, card, comment, assign và Activity Log không? [Coverage, Spec §FR-003, §FR-004, §FR-006, §FR-010]
- [x] CHK003 Phạm vi đăng ký, đăng nhập, đăng xuất, xác minh email và khôi phục mật khẩu có được xác định nhất quán giữa requirements và assumptions không? [Consistency, Spec §FR-015, Assumptions]
- [x] CHK004 Danh sách sự kiện cần ghi vào Activity Log có bao phủ các thay đổi được nêu trong user scenarios và functional requirements không? [Completeness, Spec §FR-008, User Story 3]
- [x] CHK005 Yêu cầu xử lý thành viên bị xóa nhưng đang được assign có xác định rõ hành vi cần thiết không? [Gap, Spec §FR-010, Edge Cases]

## Requirement Clarity

- [x] CHK006 Hành vi kéo thả có quy định rõ việc đổi column, đổi thứ tự trong cùng column và vị trí card sau khi thả không? [Ambiguity, Spec §FR-005]
- [x] CHK007 Thời điểm optimistic update, điều kiện rollback và thông tin lỗi cần thông báo có được mô tả đủ cụ thể không? [Clarity, Spec §FR-005, §FR-012]
- [x] CHK008 Cách giải quyết khi hai thành viên cùng di chuyển hoặc cập nhật một card có xác định kết quả được giữ lại và thông tin người dùng nhận được không? [Ambiguity, Spec §FR-012, Edge Cases]
- [x] CHK009 Quy trình xóa column có chỉ rõ các lựa chọn xử lý card đang nằm trong column và kết quả của mỗi lựa chọn không? [Clarity, Spec §FR-003, Edge Cases]
- [x] CHK010 Điều kiện một tài khoản được xem là thành viên hợp lệ để assign có được định nghĩa rõ khi membership bị gỡ hoặc thay đổi không? [Clarity, Spec §FR-006, §FR-010]
- [x] CHK011 Quy tắc nhận diện “kết nối hoạt động bình thường” dùng để đánh giá thời gian lưu thao tác có tiêu chí khách quan không? [Ambiguity, Spec §SC-002, Assumptions]

## Requirement Consistency

- [x] CHK012 Quyền tạo, sửa và xóa card có nhất quán giữa user scenarios, FR-004 và bảng quyền trong plan/data model không? [Consistency, Spec §FR-004, User Story 2]
- [x] CHK013 Quy tắc assign tối đa một người và quyền mọi thành viên được assign có thống nhất giữa requirements và data model không? [Consistency, Spec §FR-006, Key Entities]
- [x] CHK014 Các mục Activity Log có nhất quán về việc ghi nhận actor, đối tượng, timestamp và phạm vi sự kiện không? [Consistency, Spec §FR-008, §FR-009]
- [x] CHK015 Giả định email verification ngoài phạm vi có thống nhất với hành vi signup/sign-in và việc thêm thành viên đã có tài khoản không? [Consistency, Spec §FR-015, Assumptions]

## Acceptance Criteria Quality

- [x] CHK016 Các Success Criteria có định nghĩa rõ cách đo, mẫu thử và điều kiện bắt đầu/kết thúc thời gian cho từng chỉ số không? [Measurability, Spec §SC-001–SC-005]
- [x] CHK017 Ngưỡng hiệu năng cho thao tác move và tìm card có được gắn với điều kiện tải/kết nối đủ lặp lại không? [Clarity, Spec §SC-002, §SC-005]
- [x] CHK018 Tiêu chí “không người dùng nào ngoài thành viên được cấp quyền” có xác định phạm vi tài nguyên và loại truy cập cần đánh giá không? [Measurability, Spec §SC-006]

## Scenario and Edge Case Coverage

- [x] CHK019 Requirements có bao phủ trạng thái session hết hạn trong lúc xem board hoặc gửi mutation không? [Gap, Spec §FR-011, §FR-015]
- [x] CHK020 Các trạng thái empty, loading và error có yêu cầu riêng đủ rõ cho board, comments và Activity Log không? [Coverage, Spec §FR-014, Edge Cases]
- [x] CHK021 Yêu cầu bàn phím có mô tả đủ để thay thế thao tác kéo thả và duy trì khả năng nhận biết vị trí/thứ tự card không? [Coverage, Spec §FR-013]
- [x] CHK022 Quy tắc xử lý card khi member bị gỡ khỏi board có bao phủ cả quyền đọc và trạng thái assignee trên các card hiện có không? [Coverage, Spec §FR-010, Edge Cases]

## Non-Functional Requirements

- [x] CHK023 Yêu cầu bảo mật có xác định rõ hành vi khi truy cập trái phép tới board, card, comment và activity thay vì chỉ nêu chung “xác thực quyền” không? [Clarity, Spec §FR-011, §SC-006]
- [x] CHK024 Yêu cầu accessibility có nêu tiêu chí có thể đánh giá cho keyboard, labels, contrast và trạng thái không chỉ dựa vào màu sắc không? [Measurability, Spec §FR-013, Constitution §IV]
- [x] CHK025 Mục tiêu trải nghiệm desktop/tablet và phạm vi mobile có nhất quán giữa requirements, success criteria và assumptions không? [Consistency, Spec §SC-005, Assumptions]

## Dependencies and Assumptions

- [x] CHK026 Giới hạn nhóm 10 thành viên và 500 card có được xác nhận là scope mục tiêu hay chỉ là baseline kiểm thử tạm thời không? [Assumption, Spec §SC-005, Assumptions]
- [x] CHK027 Cách owner tìm và thêm tài khoản đã đăng ký có được mô tả đủ để tránh mơ hồ về input và phản hồi khi tài khoản không tồn tại không? [Gap, Spec §FR-010, Assumptions]

## Ambiguities and Conflicts

- [x] CHK028 Cụm “hoàn tác về vị trí đã lưu” có xác định snapshot cần khôi phục khi có thay đổi đồng thời từ thành viên khác không? [Ambiguity, Spec §FR-005, Edge Cases]
- [x] CHK029 Quy tắc giữa việc gỡ member và yêu cầu chỉ member hiện tại mới được assign có xác định rõ assignment hiện tại bị xóa, giữ lại hay yêu cầu owner xử lý trước không? [Conflict, Spec §FR-006, §FR-010, Edge Cases]

## Notes

- Focus: review toàn bộ feature requirements; ưu tiên kéo thả/assign, auth/permissions và các luồng lỗi/phục hồi.
- Depth: Standard. Audience: reviewer trước planning/implementation.
- Các checkbox đều để unchecked; reviewer quyết định trạng thái sau khi đánh giá chất lượng requirements.
- `$speckit-implement` đọc trạng thái checklist như một gate nhưng không được thay đổi checkbox.
- `requirements.md` là checklist chất lượng spec built-in, có lifecycle riêng do `$speckit-specify` và `$speckit-clarify` quản lý.
