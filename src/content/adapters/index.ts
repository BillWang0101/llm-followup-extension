import type { SiteAdapter } from '../../shared/types';
import { chatgptAdapter } from './chatgpt';
import { claudeAdapter } from './claude';
import { deepseekAdapter } from './deepseek';
import { kimiAdapter } from './kimi';
import { genericAdapter } from './generic';

const adapters: SiteAdapter[] = [
  chatgptAdapter,
  claudeAdapter,
  deepseekAdapter,
  kimiAdapter,
];

export function pickAdapter(host: string = location.hostname): SiteAdapter {
  return adapters.find((a) => a.host.test(host)) ?? genericAdapter;
}
