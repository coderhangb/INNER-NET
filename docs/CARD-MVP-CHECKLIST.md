# Checklist nghiệm thu Card MVP

Chỉ đánh dấu mục đã có kết quả thực tế.
Không suy ra toàn bộ tính năng đạt chỉ từ build thành công.

## Mốc đã xác nhận

- [x] Kho card có kiểm thử API đạt.
- [x] Nhận thêm card khi đủ 600 giây trên giao diện.
- [x] Kiểm thử logic thưởng đạt 5/5.
- [x] Kiểm thử transaction thưởng đạt 9/9.
- [x] Kiểm tra API thưởng đạt.
- [x] Kiểm thử transaction trao đổi đạt 9/9.
- [x] Trao đổi A/B trên giao diện thành công.
- [x] Nút truy cập trang trao đổi hoạt động.
- [x] Code trao đổi đã push với commit 5c12bcd.

## API trao đổi qua HTTP

- [ ] check:trades đạt toàn bộ.
- [ ] Tất cả endpoint yêu cầu đăng nhập.
- [ ] Tất cả POST chặn thiếu CSRF header.
- [ ] Body giả mạo role/actor/status/expiresAt bị chặn.
- [ ] Query và ID không hợp lệ bị chặn.

## Kiểm tra giao diện còn cần xác nhận

- [ ] Tải lại sau nhận thưởng không cấp thêm card.
- [ ] Hai tab không cộng thời gian nhanh gấp đôi.
- [ ] Tạm dừng và tiếp tục hoạt động đúng.
- [ ] Đổi tài khoản không hiện dữ liệu của tài khoản trước.
- [ ] Hủy đề nghị trên giao diện mở khóa card.
- [ ] Từ chối đề nghị trên giao diện mở khóa card.
- [ ] Metadata và ID bản card giữ nguyên sau trao đổi.
- [ ] Tổng số card A/B không đổi do riêng thao tác trao đổi.

## Vận hành

- [ ] Index thưởng đã được tạo trên database phát triển.
- [ ] Index trao đổi đã được tạo trên database phát triển.
- [ ] Worker hết hạn khởi động được.
- [ ] Hướng dẫn cài dependencies và cấu hình đã được đối chiếu.
- [ ] Frontend build thành công sau thay đổi giao diện cuối cùng.
- [ ] Không có .env hoặc khóa bí mật trong phần commit.
- [ ] Các file tài liệu đã commit và push.

## Trước khi merge

- [ ] Các lỗi đã biết được sửa hoặc ghi rõ.
- [ ] Pull Request mô tả phạm vi và kết quả kiểm tra.
- [ ] Đã review thay đổi trước khi merge vào main.

## Nhật ký

| Ngày | Người kiểm tra | Nội dung | Kết quả | Ghi chú |
|---|---|---|---|---|
| | | | | |