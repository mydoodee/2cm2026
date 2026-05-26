-- Create ai_conversations table if not exists
CREATE TABLE IF NOT EXISTS ai_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_id VARCHAR(36) NULL,
    project_id CHAR(36) NULL,
    title VARCHAR(255) NULL,
    messages JSON NOT NULL, -- Holds array of messages: [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
    mode ENUM('chat', 'analyze', 'report', 'query') DEFAULT 'chat',
    model_used VARCHAR(100) DEFAULT 'qwen2.5-coder:14b',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_project_id (project_id)
);
