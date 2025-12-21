 ViewBoard - Notion 看板应用完整实施计划

 项目概述

 基于 React 18 + TypeScript + Vite 5 + Tauri 2 + Bun 构建跨平台 Notion 风格看板应用。

 关键决策:
 - 前端框架: React 18 + TypeScript
 - 包管理器: Bun (高性能)
 - 同步方式: WebDAV (支持坚果云/Nextcloud)
 - 目标平台: macOS (dmg) + Windows (exe)
 - 开发策略: 完整功能一次性开发

 ---
 实施步骤

 第一步：项目初始化

 操作命令:
 # 创建 Tauri + React 项目
 bun create tauri-app

 # 项目配置:
 # - Project name: viewboard
 # - Identifier: com.viewboard.app
 # - Package manager: bun
 # - UI template: React + TypeScript

 cd viewboard
 bun install

 安装核心依赖:
 # 拖拽库
 bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

 # 状态管理
 bun add zustand immer

 # UI 组件库
 bun add @radix-ui/react-dropdown-menu @radix-ui/react-dialog @radix-ui/react-select
 bun add lucide-react clsx tailwind-merge

 # 样式
 bun add -D tailwindcss postcss autoprefixer
 bunx tailwindcss init -p

 # WebDAV 客户端
 bun add tsdav

 # 离线存储
 bun add idb uuid nanoid
 bun add -D @types/uuid

 # 工具库
 bun add date-fns

 ---
 第二步：目录结构搭建

 创建以下目录结构:

 src/
 ├── components/
 │   ├── ui/                      # 基础 UI 组件 (Button, Dialog, Select)
 │   ├── kanban/                  # 看板组件
 │   │   ├── Board.tsx            # [关键] 看板容器，整合拖拽和状态
 │   │   ├── Column.tsx           # 列容器
 │   │   ├── Card.tsx             # 任务卡片
 │   │   └── DraggableCard.tsx    # 可拖拽卡片包装器
 │   ├── table/                   # 表格视图
 │   │   └── TableView.tsx
 │   └── shared/                  # 共享组件
 │       ├── TagPicker.tsx
 │       └── ViewSwitcher.tsx     # 表格/看板切换
 │
 ├── features/
 │   ├── tasks/
 │   │   ├── stores/
 │   │   │   └── taskStore.ts     # [关键] Zustand 任务状态管理
 │   │   ├── hooks/
 │   │   │   ├── useTasks.ts
 │   │   │   └── useDragDrop.ts   # [关键] 拖拽核心逻辑
 │   │   └── types/
 │   │       └── task.types.ts    # 任务类型定义
 │   │
 │   ├── sync/
 │   │   ├── services/
 │   │   │   ├── webdavClient.ts  # [关键] WebDAV 客户端封装
 │   │   │   └── syncEngine.ts    # [关键] 双向同步引擎
 │   │   └── hooks/
 │   │       └── useSync.ts
 │   │
 │   └── settings/
 │       └── components/
 │           └── WebDAVSettings.tsx
 │
 ├── lib/
 │   ├── db/
 │   │   ├── indexedDB.ts
 │   │   └── schema.ts            # [关键] IndexedDB 数据库模式
 │   ├── storage/
 │   │   ├── syncQueue.ts         # 同步队列管理
 │   │   └── cache.ts
 │   └── utils/
 │       └── uuid.ts
 │
 └── types/
     └── board.types.ts           # 全局类型定义

 Tauri 后端目录:
 src-tauri/
 ├── src/
 │   ├── main.rs                  # [关键] Rust 主入口，托盘配置
 │   └── commands/
 │       └── storage.rs           # Tauri Commands
 └── tauri.conf.json              # [关键] Tauri 应用配置

 ---
 第三步：数据模型设计

 核心数据结构 (src/features/tasks/types/task.types.ts):

 export interface Task {
   id: string;                    // UUID
   title: string;                 // 标题
   description?: string;          // 描述
   status: TaskStatus;            // 状态 (not-started/in-progress/completed/archived)
   tags: Tag[];                   // 标签
   priority?: Priority;           // 优先级
   createdAt: Date;
   updatedAt: Date;
   order: number;                 // 排序序号
   version: number;               // 版本号 (冲突检测)
   deletedAt?: Date;              // 软删除
 }

 export interface Tag {
   id: string;
   label: string;
   color: string;                 // Hex 颜色 (#3B82F6)
 }

 export interface Column {
   id: string;
   title: string;                 // 列标题
   status: TaskStatus;
   order: number;
   color?: string;
 }

 IndexedDB Schema (src/lib/db/schema.ts):
 interface ViewBoardDB extends DBSchema {
   tasks: {
     key: string;
     value: Task & {
       _syncStatus: 'synced' | 'pending' | 'conflict';
       _localVersion: number;
     };
     indexes: { 'by-status': string; 'by-updated': Date; };
   };

   syncQueue: {
     key: string;
     value: {
       id: string;
       operation: 'create' | 'update' | 'delete';
       entityId: string;
       data: any;
       timestamp: number;
       retryCount: number;
     };
   };

   conflicts: {
     key: string;
     value: {
       id: string;
       localVersion: Task;
       remoteVersion: Task;
       timestamp: number;
     };
   };
 }

 ---
 第四步：核心功能实现

 4.1 看板拖拽功能

 文件: src/features/tasks/hooks/useDragDrop.ts

 实现要点:
 - 使用 @dnd-kit 的 DndContext 包装看板
 - 实现 handleDragEnd 处理拖拽结束事件
 - 支持两种拖拽场景:
   a. 拖到列上 → 更改任务状态
   b. 拖到任务上 → 重新排序
 - 调用 Zustand store 更新状态

 核心逻辑:
 const handleDragEnd = (event: DragEndEvent) => {
   const { active, over } = event;

   // 场景1: 拖到列上，更改状态
   if (over?.id.toString().startsWith('column-')) {
     const newStatus = over.id.toString().replace('column-', '');
     updateTask(active.id, { status: newStatus });
   }

   // 场景2: 拖到任务上，重新排序
   if (over && over.id !== active.id) {
     const oldIndex = tasks.findIndex(t => t.id === active.id);
     const newIndex = tasks.findIndex(t => t.id === over.id);
     const reordered = arrayMove(tasks, oldIndex, newIndex);
     reorderTasks(reordered);
   }
 };

 4.2 WebDAV 同步引擎

 文件: src/features/sync/services/syncEngine.ts

 同步流程:
 用户操作 → 更新 Store → 写入 IndexedDB → 加入同步队列
                                               ↓
                                     后台同步任务 → WebDAV 服务器
                                               ↓
                                         更新同步状态

 核心方法:
 1. initialize(config) - 初始化 WebDAV 客户端
 2. sync() - 执行完整同步
   - uploadPendingChanges() - 上传本地待同步更改
   - downloadRemoteChanges() - 下载远程更改
   - resolveConflicts() - 解决冲突（最后写入优先）

 WebDAV 存储结构:
 /viewboard/
   ├── tasks/
   │   ├── task-{uuid}.json
   │   └── task-{uuid}.json
   └── metadata.json

 实现要点:
 - 使用 tsdav 库创建客户端
 - 批量同步减少网络请求
 - 实现冲突检测（比较 version 字段）
 - 离线队列保证数据不丢失

 4.3 状态管理

 文件: src/features/tasks/stores/taskStore.ts

 使用 Zustand 管理状态:
 interface TaskStore {
   tasks: Task[];
   columns: Column[];

   // CRUD 操作
   addTask: (task: Task) => void;
   updateTask: (id: string, updates: Partial<Task>) => void;
   deleteTask: (id: string) => void;
   reorderTasks: (tasks: Task[]) => void;

   // 同步状态
   syncStatus: 'idle' | 'syncing' | 'error';
   lastSyncTime?: Date;
 }

 整合 IndexedDB:
 - 所有状态更新同时写入 IndexedDB
 - 应用启动时从 IndexedDB 加载数据
 - 使用 immer 简化不可变更新

 ---
 第五步：UI 组件开发

 5.1 看板主组件

 文件: src/components/kanban/Board.tsx

 功能:
 - 渲染多列看板布局（未开始/进行中/完成/历史/自定义）
 - 集成 DndContext 包装拖拽功能
 - 显示每列的卡片数量统计
 - 响应式布局

 结构:
 <DndContext onDragEnd={handleDragEnd}>
   <div className="board-container">
     {columns.map(column => (
       <Column key={column.id} column={column}>
         {getTasksByStatus(column.status).map(task => (
           <DraggableCard key={task.id} task={task} />
         ))}
       </Column>
     ))}
   </div>
 </DndContext>

 5.2 任务卡片

 文件: src/components/kanban/Card.tsx

 显示内容:
 - 任务标题
 - 标签列表（彩色标签）
 - 优先级指示器（可选）

 交互:
 - 点击打开详情编辑对话框
 - 可拖拽

 5.3 表格视图

 文件: src/components/table/TableView.tsx

 功能:
 - 表格形式展示所有任务
 - 支持排序（按状态/创建时间/更新时间）
 - 支持筛选（按标签/状态）
 - 行内编辑

 ---
 第六步：Tauri 集成

 6.1 系统托盘配置

 文件: src-tauri/src/main.rs

 功能:
 - 创建系统托盘图标
 - 左键点击显示/隐藏窗口
 - 右键菜单（显示、设置、退出）
 - 最小化到托盘

 核心代码:
 use tauri::{Manager, tray::TrayIconBuilder};

 fn main() {
     tauri::Builder::default()
         .setup(|app| {
             let tray = TrayIconBuilder::with_id("main-tray")
                 .icon(app.default_window_icon().unwrap().clone())
                 .on_tray_icon_event(|tray, event| {
                     // 处理托盘点击事件
                 })
                 .build(app)?;
             Ok(())
         })
         .run(tauri::generate_context!())
         .expect("error");
 }

 6.2 应用配置

 文件: src-tauri/tauri.conf.json

 关键配置:
 {
   "productName": "ViewBoard",
   "identifier": "com.viewboard.app",
   "app": {
     "windows": [{
       "title": "Task List - week",
       "width": 1400,
       "height": 900,
       "minWidth": 1024,
       "minHeight": 768
     }],
     "trayIcon": { "iconPath": "icons/tray-icon.png" }
   },
   "bundle": {
     "targets": ["dmg", "msi"],
     "icon": ["icons/icon.png"]
   }
 }

 ---
 第七步：样式与主题

 Tailwind 配置 (tailwind.config.js):
 module.exports = {
   content: ['./src/**/*.{js,jsx,ts,tsx}'],
   theme: {
     extend: {
       colors: {
         'status-not-started': '#A0522D',  // 棕色
         'status-in-progress': '#3B82F6',  // 蓝色
         'status-completed': '#10B981',    // 绿色
         'status-archived': '#6B7280',     // 灰色
       },
     },
   },
 };

 全局样式:
 - 使用 Tailwind CSS 快速开发
 - Radix UI Headless 组件自定义样式
 - 参考 img.png 设计稿的配色方案

 ---
 第八步：开发与测试

 开发命令:
 bun run tauri dev    # 启动开发服务器

 测试重点:
 1. 拖拽功能（跨列拖动、排序）
 2. 数据持久化（刷新后数据保留）
 3. WebDAV 同步（创建/更新/删除同步）
 4. 冲突解决（模拟多设备修改）
 5. 离线功能（断网操作，恢复后同步）

 ---
 第九步：构建与打包

 生产构建:
 # macOS
 bun run tauri build --target dmg
 # 输出: src-tauri/target/release/bundle/dmg/ViewBoard_1.0.0_x64.dmg

 # Windows (需要在 Windows 环境)
 bun run tauri build --target msi
 # 输出: src-tauri/target/release/bundle/msi/ViewBoard_1.0.0_x64.msi

 图标准备:
 - 准备 1024x1024 PNG 图标
 - 使用 Tauri 工具生成各平台图标
 - 放置在 src-tauri/icons/ 目录

 ---
 关键文件清单

 实施此计划需要创建和配置以下关键文件:

 | 文件路径                                 | 功能                       | 优先级 |
 |------------------------------------------|----------------------------|--------|
 | src/components/kanban/Board.tsx          | 看板主组件，整合拖拽和渲染 | 🔴 高  |
 | src/features/tasks/hooks/useDragDrop.ts  | 拖拽核心逻辑               | 🔴 高  |
 | src/features/tasks/stores/taskStore.ts   | Zustand 状态管理           | 🔴 高  |
 | src/lib/db/schema.ts                     | IndexedDB 数据库模式       | 🔴 高  |
 | src/features/sync/services/syncEngine.ts | WebDAV 同步引擎            | 🔴 高  |
 | src-tauri/src/main.rs                    | Tauri 后端入口和托盘配置   | 🔴 高  |
 | src-tauri/tauri.conf.json                | Tauri 应用配置             | 🟡 中  |
 | src/components/kanban/Card.tsx           | 任务卡片组件               | 🟡 中  |
 | src/components/table/TableView.tsx       | 表格视图                   | 🟢 低  |

 ---
 开发里程碑

 预估开发周期: 30-40 天

 1. 搭建基础 (3天) - 项目初始化、依赖安装、目录搭建
 2. UI 组件 (4天) - 基础组件、看板布局、卡片设计
 3. 数据层 (4天) - 数据模型、IndexedDB、Zustand Store
 4. 拖拽功能 (6天) - 拖拽集成、状态更新、动画效果
 5. 表格视图 (3天) - 表格布局、排序筛选
 6. WebDAV 同步 (7天) - 客户端、同步引擎、冲突解决
 7. Tauri 集成 (4天) - 托盘、菜单、窗口管理
 8. 优化测试 (4天) - 性能优化、Bug 修复
 9. 打包发布 (3天) - 构建配置、生成安装包

 ---
 技术栈总览

 | 分类     | 技术            | 版本   | 用途            |
 |----------|-----------------|--------|-----------------|
 | 前端框架 | React           | 18     | UI 渲染         |
 | 语言     | TypeScript      | 5      | 类型安全        |
 | 构建工具 | Vite            | 5      | 快速构建        |
 | 包管理器 | Bun             | latest | 高性能安装/运行 |
 | 桌面框架 | Tauri           | 2      | 跨平台打包      |
 | 拖拽库   | @dnd-kit        | latest | 看板拖拽        |
 | 状态管理 | Zustand         | latest | 轻量级状态      |
 | 样式     | Tailwind CSS    | 3      | 快速样式开发    |
 | UI 组件  | Radix UI        | latest | Headless 组件   |
 | 离线存储 | IndexedDB (idb) | latest | 本地数据库      |
 | 同步协议 | WebDAV (tsdav)  | latest | 跨设备同步      |

 ---
 性能优化策略

 1. React 优化
   - React.memo 避免不必要的重渲染
   - useCallback 缓存回调函数
   - 虚拟滚动处理大量任务 (>100)
 2. IndexedDB 优化
   - 批量操作减少事务开销
   - 合理设计索引加速查询
   - 定期清理软删除数据
 3. WebDAV 优化
   - 批量同步（每 5 分钟或 10 个操作触发）
   - 差异同步（仅同步变更的任务）
   - 断点续传支持
 4. Tauri 优化
   - 最小化前后端 IPC 通信
   - 使用事件而非轮询

 ---
 额外功能建议 (可选)

 - 快捷键支持: 快速添加任务、搜索、视图切换
 - 多看板: 支持创建多个看板（工作/个人）
 - 子任务: 任务支持子任务嵌套
 - 附件: 任务支持附件上传（存储到 WebDAV）
 - 搜索功能: 全文搜索任务标题和描述
 - 统计面板: 任务完成率、趋势图表
 - 深色模式: 支持浅色/深色主题切换

 ---
 开始实施

 准备好后，按照以下顺序执行:

 1. 运行项目初始化命令
 2. 创建目录结构
 3. 复制数据模型定义
 4. 逐步实现核心功能
 5. 测试每个功能模块
 6. 构建生产版本