# 用户表（本地存储模拟）
interface User {
  id: string;
  username: string;
  passwordHash: string;
  nickname: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  createdAt: string;
  lastLoginAt: string;
}

// 用户认证状态
interface AuthState {
  currentUser: User | null;
  isLoggedIn: boolean;
  token: string | null;
}