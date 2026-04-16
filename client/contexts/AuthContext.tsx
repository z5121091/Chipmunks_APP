/**
 * 通用认证上下文
 *
 * 基于固定的 API 接口实现，可复用到其他项目
 * 其他项目使用时，只需修改 @api 的导入路径指向项目的 api 模块
 *
 * 注意：
 * - 如果需要登录/鉴权场景，请扩展本文件，完善 login/logout、token 管理、用户信息获取与刷新等逻辑
 * - 将示例中的占位实现替换为项目实际的接口调用与状态管理
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/** 用户信息接口 */
interface UserInfo {
  /** 用户ID */
  id?: number;
  /** 用户名 */
  username?: string;
  /** 昵称 */
  nickname?: string;
  /** 头像URL */
  avatar?: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
  /** 其他自定义字段 */
  [key: string]: unknown;
}

/** 认证上下文类型 */
interface AuthContextType {
  /** 当前用户信息 */
  user: UserInfo | null;
  /** 认证令牌 */
  token: string | null;
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 登录 */
  login: (token: string, userInfo?: UserInfo) => Promise<void>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 更新用户信息 */
  updateUser: (userData: Partial<UserInfo>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 登录
   * @param token - 认证令牌
   * @param userInfo - 用户信息（可选）
   */
  const login = useCallback(async (authToken: string, userInfo?: UserInfo) => {
    setIsLoading(true);
    try {
      // TODO: 根据实际需求实现登录逻辑
      // 例如：调用 API 验证 token，获取用户信息等
      setToken(authToken);
      if (userInfo) {
        setUser(userInfo);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 登出
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: 根据实际需求实现登出逻辑
      // 例如：调用 API 清除服务端会话，清除本地存储等
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 更新用户信息
   * @param userData - 要更新的用户数据
   */
  const updateUser = useCallback((userData: Partial<UserInfo>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null));
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * 使用认证上下文
 * @throws 如果不在 AuthProvider 内调用，会抛出错误
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
