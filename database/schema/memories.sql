CREATE TABLE memories (
    id SERIAL PRIMARY KEY,
    raw_text TEXT NOT NULL,
    decision TEXT,
    reasoning TEXT,
    context TEXT,
    alternative TEXT,
    action TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);