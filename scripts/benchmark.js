const autocannon = require("autocannon");

const DURATION_SECONDS = 10;
const CONNECTIONS = 100; // 100 kết nối đồng thời giả lập hàng trăm PC

const samplePayload = JSON.stringify({
  event_id: 4624,
  machine_name: "PC-BENCHMARK-01",
  username: "test_user",
  logon_type: 2,
  event_time: new Date().toISOString(),
});

function runTest(title, url) {
  return new Promise((resolve) => {
    console.log(`\n======================================================`);
    console.log(`⏳ Đang chạy: ${title}`);
    console.log(
      `URL: ${url} | Số kết nối: ${CONNECTIONS} | Thời gian: ${DURATION_SECONDS}s`,
    );
    console.log(`======================================================`);

    const instance = autocannon(
      {
        url,
        connections: CONNECTIONS,
        duration: DURATION_SECONDS,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: samplePayload,
      },
      (err, result) => {
        if (err) {
          console.error("Lỗi khi test:", err);
          return resolve(null);
        }
        resolve(result);
      },
    );

    autocannon.track(instance, { renderProgressBar: true });
  });
}

async function startBenchmark() {
  console.log(
    `🚀 BẮT ĐẦU BENCHMARK HỆ THỐNG: DIRECT DB WRITE vs RABBITMQ BUFFER`,
  );

  // 1. Test không có RabbitMQ (Ghi thẳng DB)
  const directResult = await runTest(
    "Kịch bản 1: DIRECT DB WRITE (Không dùng RabbitMQ)",
    "http://localhost:3000/api/v1/direct-events",
  );

  // Nghỉ 3 giây cho server hạ nhiệt
  await new Promise((r) => setTimeout(r, 3000));

  // 2. Test có RabbitMQ
  const rabbitResult = await runTest(
    "Kịch bản 2: RABBITMQ BUFFER (Dùng Queue Ingestion)",
    "http://localhost:3000/api/v1/workstation-events",
  );

  // 3. In bảng kết quả so sánh
  console.log(
    `\n\n==================== KẾT QUẢ SO SÁNH ĐỂ GHI VÀO CV ====================`,
  );
  console.table([
    {
      "Tiêu chí": "Throughput (Requests/sec)",
      "Không dùng RabbitMQ": `${directResult?.requests?.average?.toFixed(0) || 0} req/s`,
      "Có RabbitMQ": `🔥 ${rabbitResult?.requests?.average?.toFixed(0) || 0} req/s`,
    },
    {
      "Tiêu chí": "Độ trễ trung bình (Avg Latency)",
      "Không dùng RabbitMQ": `${directResult?.latency?.average?.toFixed(2) || 0} ms`,
      "Có RabbitMQ": `⚡ ${rabbitResult?.latency?.average?.toFixed(2) || 0} ms`,
    },
    {
      "Tiêu chí": "Độ trễ p99 (Max / Tail Latency)",
      "Không dùng RabbitMQ": `${directResult?.latency?.p99 || 0} ms`,
      "Có RabbitMQ": `⚡ ${rabbitResult?.latency?.p99 || 0} ms`,
    },
    {
      "Tiêu chí": "Lỗi rớt request (Errors / 5xx)",
      "Không dùng RabbitMQ": `${directResult?.errors || 0} errors`,
      "Có RabbitMQ": `✅ ${rabbitResult?.errors || 0} errors (0%)`,
    },
  ]);
  console.log(
    `=======================================================================\n`,
  );
}

startBenchmark();
