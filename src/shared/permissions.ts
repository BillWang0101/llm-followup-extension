import { PROVIDERS, type Provider } from './types';

/** 从 endpoint 派生 origin + /* pattern，用于 chrome.permissions API */
export function providerOriginPattern(provider: Provider): string {
  const endpoint = PROVIDERS[provider].endpoint;
  const u = new URL(endpoint);
  return `${u.protocol}//${u.host}/*`;
}

export function hasProviderPermission(provider: Provider): Promise<boolean> {
  return chrome.permissions.contains({ origins: [providerOriginPattern(provider)] });
}

/**
 * 请求 provider API 域的 host 权限。
 * 必须在用户手势上下文调用（click / keydown），否则 Chrome 会拒绝。
 */
export function requestProviderPermission(provider: Provider): Promise<boolean> {
  return chrome.permissions.request({ origins: [providerOriginPattern(provider)] });
}
