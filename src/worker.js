const { getRabbitChannel } = require("./config/rabbitmq");
const db = require("./config/db");
require("dotenv").config();

const PREFETCH = parseInt(process.env.PREFETCH_COUNT || "10", 10);

async function startWorker() {
  try {
    const channel = await getRabbitChannel();

    // Khống chế lượng message worker nhận cùng lúc (Backpressure)
    channel.prefetch(PREFETCH);
    console.log(
      `👷 Worker started. Listening on '${process.env.QUEUE_NAME}' (Prefetch: ${PREFETCH})...`,
    );

    channel.consume(
      process.env.QUEUE_NAME,
      async (msg) => {
        if (!msg) return;

        try {
          const event = JSON.parse(msg.content.toString());
          const { event_id, machine_name, username, logon_type, event_time } =
            event;

          // 1. Xác định trạng thái máy theo mã chuẩn Windows
          let status = "ONLINE";
          let activeUser = username;

          if (event_id === 4800) {
            status = "LOCKED"; // Khóa máy đi ra ngoài
          } else if (event_id === 4647) {
            status = "OFFLINE"; // Đăng xuất về nhà
            activeUser = null;
          }

          // 2. Upsert cập nhật trạng thái máy trạm
          await db.query(
            `INSERT INTO workstations (machine_name, active_user, status, last_event_id, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (machine_name) 
             DO UPDATE SET 
                active_user = EXCLUDED.active_user,
                status = EXCLUDED.status,
                last_event_id = EXCLUDED.last_event_id,
                updated_at = NOW()`,
            [machine_name, activeUser, status, event_id],
          );

          // 3. Ghi nhật ký vào Audit Logs
          await db.query(
            `INSERT INTO workstation_audit_logs (event_id, machine_name, username, logon_type, event_time)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              event_id,
              machine_name,
              username,
              logon_type,
              event_time || new Date(),
            ],
          );
          // Giả lập xử lý nghiệp vụ nặng mất 50ms
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // 4. Báo Ack để RabbitMQ giải phóng message
          channel.ack(msg);
          // 4. Báo Ack để RabbitMQ giải phóng message
        } catch (err) {
          console.error("❌ Error processing message:", err.message);
          // Nack và không requeue nếu tin nhắn lỗi format để tránh lặp vô tận
          channel.nack(msg, false, false);
        }
      },
      { noAck: false },
    );
  } catch (error) {
    console.error("❌ Worker error:", error);
  }
}

startWorker();
