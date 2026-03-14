/**
 * B站API配置
 * 用于存储用户的认证信息
 */

export interface BiliAuthConfig {
  // Cookie中的关键信息
  cookie?: string;
  // 其他可能的认证头
  headers?: Record<string, string>;
}

// 用户认证配置（需要用户手动配置）
export const authConfig: BiliAuthConfig = {
  // 示例：从浏览器开发者工具中复制Cookie
  // cookie: 'SESSDATA=xxx; bili_jct=xxx; DedeUserID=xxx; ...',
  // headers: {
  //   'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  // }
};

/**
 * 获取认证头
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json'
  };

  if (authConfig.cookie) {
    headers['Cookie'] = authConfig.cookie;
  }

  if (authConfig.headers) {
    Object.assign(headers, authConfig.headers);
  }

  return headers;
}

/**
 * 设置认证配置
 */
export function setAuthConfig(config: Partial<BiliAuthConfig>): void {
  Object.assign(authConfig, config);
}
