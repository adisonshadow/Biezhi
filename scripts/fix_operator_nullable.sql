-- 修复 operators 表，使 codePath、entryPoint、operatorType 可以为 NULL
-- 用于支持纯前端可视化算子

-- SQLite 不支持直接修改列约束，需要重建表
-- 步骤：
-- 1. 创建新表
-- 2. 复制数据
-- 3. 删除旧表
-- 4. 重命名新表

BEGIN TRANSACTION;

-- 创建新表（codePath、entryPoint、operatorType 可以为 NULL）
CREATE TABLE operators_new (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    author VARCHAR(100) NOT NULL,
    license VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    tags TEXT,
    codePath VARCHAR(500),
    entryPoint VARCHAR(200),
    operatorType VARCHAR(50),
    inputs TEXT,
    outputs TEXT,
    operatorParams TEXT,
    executionConfig TEXT,
    dataVisualization TEXT,
    mockdata TEXT,
    metadata TEXT,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL
);

-- 复制数据
INSERT INTO operators_new 
SELECT * FROM operators;

-- 删除旧表
DROP TABLE operators;

-- 重命名新表
ALTER TABLE operators_new RENAME TO operators;

-- 修复 workflow_nodes 表，使 operatorType 可以为 NULL
CREATE TABLE workflow_nodes_new (
    id VARCHAR(100) PRIMARY KEY,
    workflowId VARCHAR(100) NOT NULL,
    operatorId VARCHAR(100) NOT NULL,
    operatorType VARCHAR(50),
    nodeType VARCHAR(50),
    config TEXT,
    positionX INTEGER,
    positionY INTEGER,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL
);

-- 复制数据
INSERT INTO workflow_nodes_new 
SELECT * FROM workflow_nodes;

-- 删除旧表
DROP TABLE workflow_nodes;

-- 重命名新表
ALTER TABLE workflow_nodes_new RENAME TO workflow_nodes;

COMMIT;
