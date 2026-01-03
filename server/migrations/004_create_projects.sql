-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(255) PRIMARY KEY,
    companyId VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    startDate DATE,
    endDate DATE,
    budget DECIMAL(12,2),
    progress INT DEFAULT 0,
    priority VARCHAR(50) DEFAULT 'medium',
    location VARCHAR(255),
    metadata JSON,
    createdBy VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_company (companyId),
    INDEX idx_status (status),
    INDEX idx_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project members table
CREATE TABLE IF NOT EXISTS project_members (
    id VARCHAR(255) PRIMARY KEY,
    projectId VARCHAR(255) NOT NULL,
    userId VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    addedBy VARCHAR(255),
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addedBy) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_project_user (projectId, userId),
    INDEX idx_project (projectId),
    INDEX idx_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
