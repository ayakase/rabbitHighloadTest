const express = require("express");
const path = require("path");
const { getRabbitChannel } = require("./config/rabbitmq");
const db = require("./config/db");
require("dotenv").config();

const app = express();
app.use(express.json());
// Phục vụ thư mục public chứa file index.html
app.use(express.static(path.join(__dirname, "..", "public")));

let rabbitChannel = null;

getRabbitChannel()
  .then((ch) => {
    rabbitChannel = ch;
  })
  .catch((err) => {
    console.error("❌ RabbitMQ Connection Error:", err.message);
  });

// 1. ENDPOINT QUA RABBITMQ (PRODUCER)
app.post("/api/v1/workstation-events", (req, res) => {
  try {
    const event = req.body;
    if (!rabbitChannel) {
      return res
        .status(503)
        .json({ error: "Queue service temporarily unavailable" });
    }

    rabbitChannel.sendToQueue(
      process.env.QUEUE_NAME,
      Buffer.from(JSON.stringify(event)),
      { persistent: true },
    );

    return res.status(202).json({ status: "queued" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. ENDPOINT GHI TRỰC TIẾP DB
app.post("/api/v1/direct-events", async (req, res) => {
  const { event_id, machine_name, username, logon_type, event_time } = req.body;
  try {
    await db.query(
      `INSERT INTO workstation_audit_logs (event_id, machine_name, username, logon_type, event_time)
       VALUES ($1, $2, $3, $4, $5)`,
      [event_id, machine_name, username, logon_type, event_time || new Date()],
    );
    return res.status(200).json({ status: "inserted" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ==================== CÁC API PHỤC VỤ DASHBOARD UI ====================

// API 1: Lấy danh sách máy trạm (Sơ đồ vị trí)
app.get("/api/v1/workstations", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM workstations ORDER BY updated_at DESC LIMIT 100`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API 2: Lấy Audit Logs có phân trang (Pagination)
app.get("/api/v1/audit-logs", async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "15", 10);
    const offset = (page - 1) * limit;

    const [countRes, dataRes] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total FROM workstation_audit_logs`),
      db.query(
        `SELECT * FROM workstation_audit_logs ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
    ]);

    const total = parseInt(countRes.rows[0].total, 10);
    res.json({
      data: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Ingestion API Server listening on port ${PORT}`);
  console.log(`📊 UI Dashboard is live at: http://localhost:${PORT}`);
});
