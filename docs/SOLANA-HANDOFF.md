# Bàn giao để tích hợp Solana

## Hiện trạng

Card hiện là bản ghi MongoDB, chưa có tài sản tương ứng trên blockchain.

Không được coi sourceGrantId, templateId hoặc CardInstance._id
là địa chỉ tài sản Solana.

Solana Pay phục vụ luồng thanh toán.
Việc tạo hoặc chuyển tài sản card trên blockchain cần thiết kế riêng.

## Các model hiện có

### CardInstance

- _id: mã bản card.
- ownerId: chủ sở hữu trong ứng dụng.
- templateId, templateVersion: mẫu card và phiên bản.
- metadataSnapshot: metadata tại thời điểm cấp.
- sourceType: fixture hoặc reward.
- sourceGrantId: phần thưởng tạo ra card, nếu có.
- status: trạng thái card.
- lockId: thao tác đang giữ khóa.
- version: tăng khi trạng thái hoặc quyền sở hữu thay đổi.

### RewardGrant

Lưu lần cấp thưởng.
Không tạo thêm grant chỉ để thử lại một yêu cầu xuất tài sản.

### AssetEvent

Lưu lịch sử tài sản.
Trao đổi trong ứng dụng dùng eventType trade_transferred.

### TradeOffer

Lưu đề nghị, hai card, hai bên tham gia, thời hạn và trạng thái.

## Quy tắc cần giữ

1. Quyền của người dùng được xác minh tại backend.
2. Không tin ownerId hoặc role do client tự truyền.
3. Chỉ card available và không có lockId mới được đưa vào thao tác mới.
4. Card trade_locked không được xuất đồng thời.
5. Card export_locked không được dùng để trao đổi.
6. Mở khóa phải đối chiếu đúng lockId của thao tác.
7. Retry không tạo thêm tài sản hoặc chuyển card lần hai.
8. Giữ nguyên lịch sử nguồn gốc và metadataSnapshot.
9. Không cho frontend tùy ý sửa trạng thái exported.
10. Không dùng dữ liệu hoặc khóa mainnet để kiểm thử devnet.

## API hiện tại

Tất cả API dưới đây yêu cầu đăng nhập.
POST cần X-CSRF-Protection: 1.

### Hoạt động và thưởng

GET /api/rewards/progress
POST /api/activity/sessions
POST /api/activity/heartbeat

### Kho card

GET /api/cards/templates
GET /api/cards/me
GET /api/cards/:id

/api/cards/:id chỉ đọc card thuộc tài khoản hiện tại.

### Trao đổi

POST /api/trades/profile
GET /api/trades/partners/:code
GET /api/trades
POST /api/trades
POST /api/trades/:id/accept
POST /api/trades/:id/decline
POST /api/trades/:id/cancel

## Phần chưa triển khai

- Kết nối ví và xác minh quyền sở hữu ví.
- Liên kết ví với tài khoản.
- Tạo yêu cầu xuất tài sản.
- Tạo và gửi giao dịch Solana.
- Theo dõi kết quả trên chuỗi.
- Đối soát trường hợp giao dịch thành công nhưng ứng dụng mất kết nối.
- Ghi sự kiện xuất tài sản và trạng thái đồng bộ.
- Giao diện phí và xác nhận giao dịch.

## Định hướng xuất tài sản

Cần một bản ghi thao tác xuất riêng, có ID ổn định để xử lý retry.

Luồng dự kiến:

available → export_locked → exported

Việc xử lý thất bại phải dựa trên kết quả đối soát.
Timeout hoặc người dùng đóng popup không đủ để kết luận giao dịch thất bại
và mở khóa card ngay.

MongoDB transaction không thể bao trùm giao dịch blockchain.
Cần cơ chế trạng thái và đối soát giữa hai hệ thống.

## Tiêu chí thử devnet

- Xác minh ví thuộc người đang đăng nhập.
- Không xuất card của người khác.
- Không xuất card đang trade_locked.
- Hai yêu cầu đồng thời không tạo hai tài sản.
- Retry dùng cùng thao tác.
- Kiểm tra giao dịch on-chain trước khi đánh dấu exported.
- Mất mạng không làm mất khả năng đối soát.
- Có lịch sử để truy vết từ CardInstance sang thao tác xuất
  và giao dịch blockchain.

Tài liệu này là yêu cầu bàn giao, không phải xác nhận đã tích hợp Solana.