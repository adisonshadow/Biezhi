#!/usr/bin/env node
/**
 * TypeScript 算子执行脚本
 * 通过 stdin 接收 JSON 数据，执行算子，通过 stdout 输出结果
 * 使用 CommonJS 格式
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

interface ExecutionData {
  operator_path: string;
  code_file: string;
  entry_point: string;
  config: any;
  inputs: any;
}

function installDependencies(operatorPath: string): Promise<void> {
  const packageJsonPath = path.join(operatorPath, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    // 如果没有 package.json，跳过安装
    return Promise.resolve();
  }

  // 检查 node_modules 是否存在
  const nodeModulesPath = path.join(operatorPath, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    // 如果 node_modules 已存在，跳过安装（可选：可以检查是否需要更新）
    return Promise.resolve();
  }

  // 使用 spawn 执行 npm install
  // 注意：移除 shell 选项以避免安全警告
  // npm 和 install 都是硬编码的，不存在命令注入风险
  return new Promise((resolve, reject) => {
    const npmProcess = spawn('npm', ['install'], {
      cwd: operatorPath,
      stdio: 'inherit',
      // 不设置 shell，避免安全警告
    });

    npmProcess.on('close', (code) => {
      if (code !== 0) {
        // 安装失败，但不阻止执行（可能是依赖问题，但代码可能仍能运行）
        console.error(`警告: npm install 失败，退出码: ${code}`, { error: 'dependency_install_failed' });
      }
      resolve();
    });

    npmProcess.on('error', (error) => {
      // 启动失败，但不阻止执行
      console.error(`警告: 无法启动 npm install: ${error.message}`, { error: 'npm_start_failed' });
      resolve();
    });
  });
}

async function main() {
  try {
    // 从 stdin 读取 JSON 数据
    let inputData = '';
    process.stdin.setEncoding('utf8');
    
    for await (const chunk of process.stdin) {
      inputData += chunk;
    }
    
    const execData: ExecutionData = JSON.parse(inputData);
    
    const { operator_path, code_file, entry_point, config, inputs } = execData;
    
    if (!operator_path || !entry_point) {
      throw new Error('缺少必要参数: operator_path 和 entry_point');
    }

    const codePath = path.join(operator_path, code_file);
    
    if (!fs.existsSync(codePath)) {
      throw new Error(`代码文件不存在: ${codePath}`);
    }

    // 安装依赖（不阻塞，如果失败也继续）
    await installDependencies(operator_path).catch(() => {
      // 忽略安装错误，继续执行
    });

    // 将项目根目录和算子路径添加到模块搜索路径
    const projectRoot = path.resolve(__dirname, '../../../');
    const tsOperatorSdkPath = path.join(projectRoot, 'ts_operator_sdk');
    
    // 设置 NODE_PATH 环境变量
    const nodePath = [
      operator_path,
      tsOperatorSdkPath,
      projectRoot,
      ...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []),
    ].join(path.delimiter);
    
    process.env.NODE_PATH = nodePath;

    // 如果是 .ts 文件，需要注册 ts-node
    if (code_file.endsWith('.ts')) {
      try {
        // 注册 ts-node，支持 TypeScript 文件
        require('ts-node').register({
          transpileOnly: true,
          compilerOptions: {
            module: 'commonjs',
            esModuleInterop: true,
            skipLibCheck: true,
            resolveJsonModule: true,
          },
        });
      } catch (e: any) {
        // 如果 ts-node 不可用，尝试使用编译后的 .js 文件
        const jsPath = codePath.replace(/\.ts$/, '.js');
        if (fs.existsSync(jsPath)) {
          // 使用编译后的 JavaScript 文件
          try {
            const resolvedPath = require.resolve(jsPath);
            if (require.cache[resolvedPath]) {
              delete require.cache[resolvedPath];
            }
            const operatorModule = require(jsPath);
            const OperatorClass = operatorModule[entry_point] || operatorModule.default || operatorModule;
            
            if (!OperatorClass) {
              throw new Error(`无法找到算子类: ${entry_point}`);
            }

            const operator = new OperatorClass(config);
            const result = operator.execute(inputs);
            
            if (result instanceof Promise) {
              const finalResult = await result;
              console.log(JSON.stringify(finalResult, null, 2));
            } else {
              console.log(JSON.stringify(result, null, 2));
            }
            return;
          } catch (jsError: any) {
            throw new Error(`无法加载编译后的 JavaScript 文件: ${jsError.message}`);
          }
        } else {
          throw new Error(`TypeScript 文件需要 ts-node 或编译后的 JavaScript 文件。错误: ${e.message}`);
        }
      }
    }

    // 清除 require 缓存（如果已加载）
    try {
      const resolvedPath = require.resolve(codePath);
      if (require.cache[resolvedPath]) {
        delete require.cache[resolvedPath];
      }
    } catch (e) {
      // 如果无法解析，继续尝试加载
    }

    // 加载算子模块
    const operatorModule = require(codePath);
    
    // 获取算子类（支持多种导出方式）
    const OperatorClass = operatorModule[entry_point] || operatorModule.default || operatorModule;
    
    if (!OperatorClass) {
      throw new Error(`无法找到算子类: ${entry_point}`);
    }

    // 创建算子实例
    const operator = new OperatorClass(config);
    
    // 执行算子
    const result = operator.execute(inputs);
    
    // 处理 Promise 结果
    if (result instanceof Promise) {
      const finalResult = await result;
      console.log(JSON.stringify(finalResult, null, 2));
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error: any) {
    const errorResult = {
      error: error.message || String(error),
      error_type: error.constructor?.name || 'Error',
    };
    console.error(JSON.stringify(errorResult, null, 2));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
