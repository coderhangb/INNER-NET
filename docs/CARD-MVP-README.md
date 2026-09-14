# INNER-NET — Bản nhận và trao đổi card

## Phạm vi

- Kho card riêng cho từng tài khoản.
- Nhận một card sau 600 giây hoạt động hợp lệ.
- Tối đa 6 card thưởng/ngày theo múi giờ Việt Nam.
- Trao đổi 1 card lấy 1 card giữa hai tài khoản student.
- Ghi lịch sử cấp thưởng và chuyển quyền sở hữu.
- Chưa tích hợp ví hoặc tài sản trên blockchain.

## Yêu cầu môi trường

- Node.js và npm tương thích với package.json/package-lock.json.
- MongoDB hỗ trợ transaction: replica set hoặc MongoDB Atlas.
- Hai tài khoản student để thử giao diện.
- Backend mặc định: http://localhost:3000
- Frontend mặc định: http://localhost:5173

## Cài dependencies

Chạy tại thư mục gốc:

```bat
cd backend
npm ci
cd ../frontend
npm ci
```

Không sửa package-lock.json chỉ để bỏ qua lỗi cài đặt.
Kiểm tra phiên bản Node và lỗi thực tế nếu npm ci thất bại.

## Cấu hình backend

Tạo backend/.env bằng thông tin riêng của môi trường.

Các biến cần kiểm tra:

- MONGO_URI: địa chỉ kết nối MongoDB.
- MONGO_DB_NAME: inner-net-card-dev khi phát triển.
- JWT_SECRET: khóa ký token riêng của môi trường.
- NODE_ENV: development khi phát triển.
- CLIENT_URL: http://localhost:5173
- PORT: 3000
- CARD_REWARD_PROFILE: standard
- GEMINI_API_KEY: dùng cho chat AI.

Không commit .env hoặc khóa bí mật.

Giữ nguyên các biến khác mà dự án hiện tại yêu cầu.
Nếu thay cổng frontend, cập nhật cấu hình CORS tương ứng.

## Tạo index

Chạy trong backend:

```bat
npm run indexes:rewards
npm run indexes:trades
```

## Chạy ứng dụng

CMD 1 — backend:

```bat
cd backend
npm run dev
```

CMD 2 — frontend:

```bat
cd frontend
npm run dev
```

CMD 3 — worker hết hạn:

```bat
cd backend
npm run worker:trades
```

Worker cần được chạy liên tục khi vận hành.
Khi triển khai, dùng cơ chế quản lý tiến trình để tự khởi động lại worker.

## Các trang

- /collection: bộ sưu tập.
- /trades: trao đổi card.
- Có nút Trao đổi card trong trang Bộ sưu tập.

## Quy tắc hoạt động và thưởng

- Chỉ student nhận thưởng.
- Trang hiển thị và có tương tác gần đây mới được ghi nhận.
- Quá 120 giây không tương tác thì tạm dừng.
- Heartbeat chuẩn khoảng 30 giây/lần.
- Một phiên được ghi nhận thời gian cho mỗi tài khoản.
- Phiên có thời hạn thuê 90 giây.
- Không cộng bù thời gian offline.
- Bộ đếm mỗi giây trên giao diện là ước tính.
- Server quyết định thời gian hợp lệ và cấp card.
- Card thưởng có ID riêng, grant riêng và lịch sử riêng.
- Tiến độ, grant, card và sự kiện được cập nhật trong transaction.

## Quy tắc trao đổi

- Chỉ student được trao đổi.
- Người dùng chia sẻ mã trao đổi công khai.
- Không dùng email hoặc mật khẩu để tìm người trao đổi.
- Tạo đề nghị chỉ khóa card người gửi.
- Card người nhận được kiểm tra lại khi chấp nhận.
- Đề nghị có hiệu lực 24 giờ.
- Mỗi người gửi có tối đa 10 đề nghị đang chờ.
- Chỉ người gửi được hủy.
- Chỉ người nhận được chấp nhận hoặc từ chối.
- Chấp nhận đổi chủ hai card và ghi hai sự kiện trong transaction.
- Hủy/từ chối/hết hạn mở khóa đúng card của đề nghị.
- Card muốn nhận không còn phù hợp thì đề nghị có thể thành invalid.
- Không thay metadataSnapshot, templateId hoặc nguồn gốc card khi đổi chủ.
- Lịch sử trao đổi trên giao diện cập nhật bằng nút Làm mới.

## Kiểm tra

Trong backend với database phát triển:

```bat
npm run test:rewards
npm run check:rewards -- STUDENT_USER_ID
npm run check:trades -- STUDENT_USER_ID
```

Kiểm thử thưởng trên database riêng, trong CMD mới:

```bat
set NODE_ENV=test
set MONGO_DB_NAME=inner-net-rewards-test
set CARD_REWARD_PROFILE=standard
npm run test:rewards:integration
```

Đóng CMD sau khi chạy.

Kiểm thử trao đổi trên database riêng, trong CMD mới:

```bat
set NODE_ENV=test
set MONGO_DB_NAME=inner-net-trades-test
npm run test:trades
```

Đóng CMD sau khi chạy.

Trong frontend:

```bat
npm run build
```

## Tình huống thường gặp

### API không kết nối được

Kiểm tra CMD backend, cổng 3000 và kết nối MongoDB.

### POST trả 403

Kiểm tra cookie đăng nhập, Origin và header X-CSRF-Protection: 1.

### Tiến độ báo phiên khác đang hoạt động

Đóng tab trùng, chờ phiên cũ hết hạn rồi mở một tab.
Không tạo phiên thủ công trong Console khi tracker đang chạy.

### Card đang trao đổi chưa được mở khóa

Kiểm tra trạng thái đề nghị và worker hết hạn.
Không sửa lockId hoặc ownerId trực tiếp trên database ứng dụng.

### Gửi giao dịch bị timeout

Chưa thể kết luận giao dịch thất bại.
Làm mới danh sách đề nghị và kiểm tra trạng thái trước khi thao tác tiếp.

## Giới hạn hiện tại

- Card được quản lý trong MongoDB, chưa phải NFT.
- Bộ kiểm tra tự động không thay thế kiểm tra giao diện.
- Chưa có cập nhật đề nghị theo thời gian thực giữa hai thiết bị.
- Cần cấu hình vận hành, giám sát và bảo vệ chống lạm dụng
  trước khi mở dịch vụ công khai.