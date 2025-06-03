# Novel Reading Platform - Frontend (Isto é fork, vai para o original pra evitar problemas! Obrigado você por visitar e ao Dev por criar esse sistema! Amém! 

## 🔗 Related Repositories |
- **Backend Repository: [novel-reading-backend](https://github.com/CJ020328/Novel-Reading-Website-Backend)

## 🌍 Live Demo |
- **Frontend (User Interface)**: [https://elfnovel-read.vercel.app/]
- **Backend (API Server) | 后端（API服务器）**: [https://elfnovel-read-website-backend.onrender.com/]

## Overview
This is the frontend part of a novel reading platform, a personal side project aimed at creating a space where anyone can easily share their stories and novels. The goal is to encourage more people to become authors while providing readers with an enjoyable reading experience.

The platform features a modern, responsive UI built with React, allowing users to read, write, and manage novels across different devices. It includes comprehensive author tools, reader features, and community interaction functions.

## Features
- **Dynamic Homepage**: Immersive UI design with featured novels and categories
- **User Authentication**: Complete login, registration, and profile management
- **Author Dashboard**: Tools for creating and managing novels and chapters
- **Reader Experience**: Customizable reading settings and history tracking
- **Community Interaction**: Comments and rating system
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Theme Support**: Light and dark mode options

## Technology Stack
- **React**: Core framework for building the user interface
- **React Router**: For navigation and routing
- **React Context API**: For state management (themes, user authentication)
- **Bootstrap 5**: For responsive design components
- **CSS/CSS-in-JS**: For custom styling and theming
- **Axios**: For API communication with the backend

## Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/novel-reading-frontend.git
cd novel-reading-frontend
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Build for production
```bash
npm run build
```

## Project Structure
```
src/
├── assets/         # Images and static resources
├── components/     # Reusable UI components
├── contexts/       # React Context providers
├── pages/          # Page components
│   ├── author/     # Author-specific pages
│   └── reader/     # Reader-specific pages
├── services/       # API services and utilities
├── styles/         # Global styles and CSS files
└── utils/          # Utility functions
```

## Connect with Backend
The frontend is designed to work with the accompanying backend API. By default, it's configured to connect to `https://novel-reading-website-backend.onrender.com/`. You can modify this in `src/services/api.js`.

---

# 小说阅读平台 - 前端

## 🔗 相关仓库
- **后端仓库**: [novel-reading-backend](https://github.com/CJ020328/Novel-Reading-Website-Backend)

## 🌍 在线访问
- **前端（用户界面）**: [https://novel-reading-frontend.vercel.app/]
- **后端（API 服务器）**: [https://novel-reading-website-backend.onrender.com/]

## 概述
这是小说阅读平台的前端部分，是一个个人项目，旨在创建一个空间，让任何人都能轻松分享自己的故事和小说。该项目的目标是鼓励更多人成为作者，同时为读者提供愉悦的阅读体验。

该平台具有使用React构建的现代化响应式UI，允许用户在不同设备上阅读、创作和管理小说。它包括全面的作者工具、读者功能和社区互动功能。

## 特点
- **动态首页**：沉浸式UI设计，展示精选小说和分类
- **用户认证**：完整的登录、注册和个人资料管理
- **作者仪表盘**：创建和管理小说与章节的工具
- **阅读体验**：可定制的阅读设置和历史记录跟踪
- **社区互动**：评论和评分系统
- **响应式设计**：适用于桌面、平板和移动设备
- **主题支持**：明亮和暗黑模式选项

## 技术栈
- **React**：构建用户界面的核心框架
- **React Router**：用于导航和路由
- **React Context API**：用于状态管理（主题、用户认证）
- **Bootstrap 5**：用于响应式设计组件
- **CSS/CSS-in-JS**：用于自定义样式和主题
- **Axios**：用于与后端API通信

## 安装

1. 克隆仓库
```bash
git clone https://github.com/your-username/novel-reading-frontend.git
cd novel-reading-frontend
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm start
```

4. 构建生产版本
```bash
npm run build
```

## 项目结构
```
src/
├── assets/         # 图片和静态资源
├── components/     # 可复用UI组件
├── contexts/       # React Context提供者
├── pages/          # 页面组件
│   ├── author/     # 作者相关页面
│   └── reader/     # 读者相关页面
├── services/       # API服务和工具
├── styles/         # 全局样式和CSS文件
└── utils/          # 实用工具函数
```

## 连接后端
前端设计为与配套的后端API一起工作。默认情况下，它配置为连接到`https://novel-reading-website-backend.onrender.com/`。您可以在`src/services/api.js`中修改此设置。
