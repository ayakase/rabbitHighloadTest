CREATE TABLE IF NOT EXISTS workstations (
    machine_name VARCHAR(100) PRIMARY KEY,
    active_user VARCHAR(100),
    status VARCHAR(50) DEFAULT 'OFFLINE', -- ONLINE, LOCKED, OFFLINE
    last_event_id INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workstation_audit_logs (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL,
    machine_name VARCHAR(100) NOT NULL,
    username VARCHAR(100),
    logon_type INT,
    event_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_machine ON workstation_audit_logs(machine_name);
CREATE INDEX IF NOT EXISTS idx_logs_user ON workstation_audit_logs(username);