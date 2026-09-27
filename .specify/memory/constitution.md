<!--
Sync Impact Report
- Version change: template → 1.0.0 (initial constitution)
- Modified principles: none (initial adoption)
- Added sections: Core Principles, Ràng buộc sản phẩm và kỹ thuật, Quy trình phát triển
- Removed sections: none
- Follow-up TODOs: xác nhận ngày ratification ban đầu
-->
# Team Kanban Constitution

## Core Principles

### I. Trải nghiệm mượt mà, nhất quán
Mọi luồng chính — xem board, tạo và cập nhật task, kéo thả card, lọc và cộng tác — MUST có phản hồi rõ ràng, trạng thái tải/lỗi/thành công dễ hiểu và hành vi nhất quán. Thao tác trực tiếp trên board MUST hạn chế gián đoạn và bảo toàn ngữ cảnh người dùng. Thiết kế MUST ưu tiên khả năng học nhanh và giảm thao tác thừa.

### II. Hiệu năng là yêu cầu sản phẩm
Các tính năng MUST được thiết kế để giao diện phản hồi nhanh và ổn định khi dữ liệu tăng. Tác vụ tốn thời gian MUST không chặn tương tác không liên quan; tải dữ liệu MUST có giới hạn và phân trang hoặc cơ chế tương đương khi phù hợp. Thay đổi có nguy cơ làm chậm các luồng chính MUST được đánh giá bằng profiling hoặc phép đo phù hợp trước khi phát hành.

### III. Dữ liệu Kanban nhất quán và có thể phục hồi
Thao tác trên task, board, trạng thái và thứ tự MUST duy trì các invariant miền nghiệp vụ. Cập nhật đồng thời MUST có quy tắc xử lý xung đột xác định; giao diện MUST thông báo khi thao tác thất bại và cung cấp cách thử lại hoặc khôi phục khi phù hợp. Không được báo thành công trước khi hệ thống xác nhận hoặc có cơ chế optimistic update được hoàn tác an toàn.

### IV. Dễ sử dụng cho nhiều người dùng
Các luồng cốt lõi MUST hỗ trợ điều hướng bằng bàn phím, nhãn có ý nghĩa cho công nghệ hỗ trợ, độ tương phản phù hợp và trạng thái không chỉ biểu đạt bằng màu sắc. Tương tác kéo thả MUST có phương án thay thế dùng được mà không cần kéo thả. Nội dung giao diện và thông báo lỗi MUST rõ ràng, nhất quán bằng tiếng Việt; thuật ngữ IT tiếng Anh có thể dùng khi phổ biến và chính xác hơn.

### V. Chất lượng, bảo mật và khả năng quan sát
Thay đổi MUST được chia thành phần dễ hiểu, có ranh giới trách nhiệm rõ và tránh độ phức tạp không cần thiết. Dữ liệu người dùng MUST được kiểm tra ở ranh giới tin cậy; quyền truy cập MUST được xác thực và phân quyền ở phía server. Lỗi vận hành MUST có đủ log hoặc telemetry để chẩn đoán mà không ghi lộ thông tin nhạy cảm. Các hành vi quan trọng MUST có kiểm chứng phù hợp ở cấp unit, integration hoặc end-to-end.

## Ràng buộc sản phẩm và kỹ thuật

Team Kanban là web application tập trung vào trải nghiệm mượt mà và hiệu năng. Các quyết định về framework, lưu trữ, giao tiếp mạng và triển khai MUST phù hợp với mục tiêu này và kiến trúc hiện hành của repository. Tài liệu spec, plan và tasks MUST được viết bằng tiếng Việt, có thể sử dụng thuật ngữ IT tiếng Anh để giữ tính chính xác. Không tự đặt ngưỡng hiệu năng định lượng nếu chưa có yêu cầu hoặc baseline được thống nhất; khi có baseline, các thay đổi liên quan MUST ghi rõ cách đo và ngưỡng áp dụng.

## Quy trình phát triển

Mỗi thay đổi MUST nêu rõ hành vi người dùng hoặc vấn đề kỹ thuật cần giải quyết, cùng các tiêu chí chấp nhận có thể kiểm chứng. Review MUST xem xét mức tuân thủ constitution, tác động đến trải nghiệm và hiệu năng, tính nhất quán dữ liệu, accessibility và bảo mật theo phạm vi thay đổi. Tài liệu thiết kế MUST ghi nhận trade-off đáng kể và cách xác minh các yêu cầu phi chức năng. Khi không thể tuân thủ một nguyên tắc, đề xuất MUST nêu lý do, phạm vi ảnh hưởng và phương án giảm thiểu để reviewer đánh giá.

## Governance

Constitution này là chuẩn quản trị cao nhất cho việc tạo và thay đổi tài liệu Spec Kit của dự án. Mọi spec, plan, task và thay đổi sản phẩm MUST được rà soát về mức tuân thủ các nguyên tắc áp dụng. Ngoại lệ MUST được ghi nhận cùng lý do, ảnh hưởng và biện pháp giảm thiểu trong tài liệu liên quan.

Đề xuất sửa constitution MUST mô tả nội dung hiện tại, thay đổi đề xuất và ảnh hưởng đến tài liệu hoặc quy trình hiện có. Bản sửa chỉ có hiệu lực sau khi được review và chấp thuận theo quy trình review của dự án. Khi nguyên tắc thay đổi, các artifact chịu ảnh hưởng MUST được cập nhật hoặc ghi nhận thành follow-up.

Version dùng Semantic Versioning dạng MAJOR.MINOR.PATCH: MAJOR cho thay đổi không tương thích hoặc loại bỏ nguyên tắc; MINOR cho nguyên tắc hay mục quản trị mới hoặc mở rộng đáng kể; PATCH cho làm rõ câu chữ không đổi nghĩa. Mọi lần sửa phải cập nhật version và ngày amended. Reviewers MUST kiểm tra version, ngày tháng, tính nhất quán của Sync Impact Report và các follow-up trước khi chấp thuận.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): xác nhận ngày thông qua constitution ban đầu | **Last Amended**: 2026-09-27
