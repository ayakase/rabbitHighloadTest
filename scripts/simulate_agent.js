const http = require("http");

const API_HOST = "localhost";
const API_PORT = 3000;
const API_PATH = "/api/v1/workstation-events";

// Giả lập danh sách 500 máy trạm và 500 nhân viên trong công ty
const TOTAL_COMPUTERS = 500;
const COMPUTERS = Array.from(
  { length: TOTAL_COMPUTERS },
  (_, i) => `PC-OFFICE-${String(i + 1).padStart(3, "0")}`,
);
const USERS = Array.from(
  { length: TOTAL_COMPUTERS },
  (_, i) => `employee_${String(i + 1).padStart(3, "0")}`,
);

// Danh sách mã Event chuẩn của Windows
const EVENT_TYPES = [
  { event_id: 4624, logon_type: 2, desc: "Logon" },
  { event_id: 4800, logon_type: null, desc: "Locked" },
  { event_id: 4801, logon_type: 2, desc: "Unlocked" },
  { event_id: 4647, logon_type: null, desc: "Logoff" },
];

function sendEvent(payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: API_HOST,
        port: API_PORT,
        path: API_PATH,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        res.on("data", () => {});
        res.on("end", () => resolve(res.statusCode));
      },
    );

    req.on("error", (err) => resolve(`ERR: ${err.message}`));
    req.write(data);
    req.end();
  });
}

function getRandomEvent(machineIndex) {
  const comp = COMPUTERS[machineIndex];
  const user = USERS[machineIndex];
  const randomType =
    EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];

  return {
    event_id: randomType.event_id,
    machine_name: comp,
    username: user,
    logon_type: randomType.logon_type,
    event_time: new Date().toISOString(),
  };
}

// Kịch bản 1: Đột biến tải đầu giờ sáng (Spike Burst)
async function simulateMorningSpike(count = 1000) {
  console.log(
    `\n🔥 [SPIKE BURST] 8:00 AM - Giả lập ${count} máy tính đồng loạt Login vào ca...`,
  );
  const startTime = Date.now();

  const promises = [];
  for (let i = 0; i < count; i++) {
    const machineIndex = i % TOTAL_COMPUTERS;
    const event = {
      event_id: 4624, // Logon
      machine_name: COMPUTERS[machineIndex],
      username: USERS[machineIndex],
      logon_type: 2,
      event_time: new Date().toISOString(),
    };
    promises.push(sendEvent(event));
  }

  const results = await Promise.all(promises);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const successCount = results.filter((status) => status === 202).length;

  console.log(
    `✅ [SPIKE HOÀN TẤT] Gửi ${count} events trong ${elapsed}s (Thành công vào queue: ${successCount}/${count})`,
  );
}

// Kịch bản 2: Hoạt động trong ca bình thường (Normal Office Flow)
function startContinuousSimulation(intervalMs = 200) {
  console.log(
    `\n🟢 [NORMAL FLOW] Đang giả lập ${TOTAL_COMPUTERS} máy gửi log ngẫu nhiên (mỗi ${intervalMs}ms)...`,
  );
  console.log(`👉 Bấm Ctrl + C để dừng.\n`);

  setInterval(async () => {
    const randomMachineIndex = Math.floor(Math.random() * TOTAL_COMPUTERS);
    const event = getRandomEvent(randomMachineIndex);
    const status = await sendEvent(event);
    console.log(
      `[Event Sent] ${event.machine_name} | User: ${event.username} | EventID: ${event.event_id} | Status: ${status}`,
    );
  }, intervalMs);
}

// Chạy kịch bản
async function main() {
  const mode = process.argv[2] || "spike";
  if (mode === "spike") {
    await simulateMorningSpike(2000); // Bắn 2.000 log tức thì
  } else {
    startContinuousSimulation(100); // 10 log / giây
  }
}

main();
