# Bitcoin 前端调试系统使用指南

## 系统架构

```
bitcoin/
├── src/server/          # Express API 服务器
│   ├── app.ts          # 服务器入口
│   ├── state.ts        # 全局状态管理
│   └── routes/         # API 路由
│       ├── blockchain.ts
│       ├── wallet.ts
│       ├── transaction.ts
│       ├── mining.ts
│       └── merkle.ts
├── frontend/           # React 前端应用
│   ├── src/
│   │   ├── components/ # React 组件
│   │   ├── services/   # API 调用
│   │   ├── App.tsx     # 主应用
│   │   └── main.tsx    # 入口
│   └── vite.config.ts  # Vite 配置
└── src/                # 原有区块链核心代码
```

## 快速开始

### 1. 启动后端 API 服务器

```bash
# 在项目根目录
cd /Users/youxingzhi/ayou/bc/bitcoin
pnpm run server
```

API 服务器将运行在: `http://localhost:3001`

### 2. 启动前端应用

```bash
# 打开新终端，进入前端目录
cd /Users/youxingzhi/ayou/bc/bitcoin/frontend
pnpm run dev
```

前端应用将运行在: `http://localhost:3000`

### 3. 同时启动（推荐）

```bash
# 在项目根目录
pnpm run dev:all
```

## API 端点

### 区块链 API
- `GET /api/blockchain` - 获取完整区块链
- `GET /api/blockchain/stats` - 获取统计信息
- `GET /api/blockchain/blocks/:index` - 获取指定区块
- `GET /api/blockchain/blocks/:index/transactions` - 获取区块交易
- `GET /api/blockchain/validate` - 验证区块链

### 钱包 API
- `GET /api/wallets` - 获取所有钱包
- `POST /api/wallets` - 创建新钱包
- `GET /api/wallets/:address` - 获取钱包详情
- `GET /api/wallets/:address/balance` - 获取钱包余额
- `GET /api/wallets/:address/utxos` - 获取钱包 UTXO

### 交易 API
- `POST /api/transactions` - 创建交易
- `GET /api/transactions/pending` - 获取待处理交易
- `GET /api/transactions/:txId` - 获取交易详情
- `DELETE /api/transactions/pending` - 清空待处理交易

### 挖矿 API
- `POST /api/mine` - 挖矿
- `GET /api/mine/difficulty` - 获取难度

### Merkle API
- `POST /api/merkle/verify` - 验证 Merkle 证明
- `GET /api/merkle/tree/:blockIndex` - 获取 Merkle 树

## 功能说明

### 1. 区块链浏览器
- 查看所有区块
- 显示区块链统计信息（总区块数、UTXO 数量、当前难度等）
- 点击区块查看详情

### 2. 钱包管理
- 创建新钱包
- 查看所有钱包及余额
- 查看钱包详情（地址、公钥、私钥）
- 查看钱包的 UTXO 列表
- 复制地址/公钥/私钥

### 3. 交易创建
- 选择发送方钱包
- 输入接收方地址（或快速选择）
- 输入转账金额
- 快速选择余额百分比（25%、50%、75%、全部）
- 自动 UTXO 选择和找零计算
- 交易签名和验证

### 4. 挖矿面板
- 选择矿工地址
- 查看当前难度和下个区块难度
- 查看待处理交易列表
- 选择要打包的交易（或全选/取消全选）
- 一键挖矿
- 显示挖矿结果（区块哈希、Nonce、尝试次数、用时等）

### 5. UTXO 浏览器
- 查看所有 UTXO
- 按地址筛选 UTXO
- 显示 UTXO 详情（交易 ID、输出索引、金额、地址）
- 统计总 UTXO 数和总价值

### 6. Merkle 验证器
- 选择区块和交易
- 验证 Merkle 证明
- 显示 Merkle 路径
- 可视化证明过程

## 使用流程示例

### 场景1：创建钱包并转账

1. 进入「钱包」页面，创建 2 个新钱包
2. 进入「挖矿」页面，选择第一个钱包作为矿工，挖一个区块（获得 50 BTC）
3. 进入「交易创建」页面，从第一个钱包转 20 BTC 到第二个钱包
4. 进入「挖矿」页面，再次挖矿打包交易
5. 返回「钱包」页面，查看余额变化

### 场景2：验证 Merkle 证明

1. 进入「区块链」页面，选择任意区块
2. 进入「Merkle」页面
3. 选择刚才的区块和其中一笔交易
4. 点击验证，查看 Merkle 路径和验证结果

### 场景3：查看 UTXO

1. 进入「UTXO」页面
2. 查看系统中所有未花费的输出
3. 选择特定地址进行筛选
4. 观察交易和挖矿如何影响 UTXO 集合

## 技术栈

### 后端
- Node.js + TypeScript
- Express.js (API 服务器)
- CORS (跨域支持)

### 前端
- React 18
- TypeScript
- Vite (构建工具)
- React Router (路由)
- Axios (HTTP 客户端)
- Lucide React (图标)
- Tailwind CSS (样式)

## 开发说明

### 后端开发
```bash
# 开发模式（自动重启）
pnpm run server:dev

# 生产模式
pnpm run server
```

### 前端开发
```bash
cd frontend
pnpm run dev    # 开发模式
pnpm run build  # 构建生产版本
```

### 运行测试
```bash
# 运行区块链核心测试
pnpm test
```

## 注意事项

1. 每次重启服务器，区块链状态会重置
2. 前端通过 Vite 代理访问后端 API
3. 默认会创建 4 个钱包（Alice、Bob、Charlie、Miner）
4. 创世区块会分配 50 BTC 给矿工
5. 每次挖矿奖励 50 BTC
6. 难度每 10 个区块调整一次

## 故障排除

### 前端无法连接后端
- 确保后端服务器已启动（`http://localhost:3001`）
- 检查 Vite 代理配置（`frontend/vite.config.ts`）

### 样式不显示
- 确保 Tailwind CSS 已正确配置
- 检查 `frontend/src/index.css` 中的 `@tailwind` 指令

### API 请求失败
- 打开浏览器开发者工具查看网络请求
- 检查服务器控制台日志

## 下一步扩展

- [ ] 添加区块详情页面
- [ ] 添加交易详情页面
- [ ] 实时更新（WebSocket）
- [ ] 区块链可视化图表
- [ ] 导出/导入区块链数据
- [ ] 网络节点模拟
- [ ] 更多挖矿统计信息

