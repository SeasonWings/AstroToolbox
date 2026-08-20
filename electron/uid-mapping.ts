import type { UidUnameMapping, UploadUidUnamePayload } from '../shared/index';
import { UID_MAPPING_API_BASE } from './config';

interface UidUnameApiResponse {
  success: boolean;
  data?: UidUnameMapping[];
  message?: string;
}

interface UidUnameUploadResponse {
  success: boolean;
  message?: string;
  affectedRows?: number;
}

export async function fetchUidUnameMappingsFromApi(): Promise<UidUnameMapping[]> {
  const response = await fetch(`${UID_MAPPING_API_BASE}/api/uid-uname-mappings`);

  if (!response.ok) {
    throw new Error('获取 UID 映射失败。');
  }

  const data = (await response.json()) as UidUnameApiResponse;

  if (!data.success || !Array.isArray(data.data)) {
    throw new Error(data.message || '获取 UID 映射失败。');
  }

  return data.data.filter((item): item is UidUnameMapping => Boolean(item?.uid && item?.uname));
}

export async function upsertUidUnameMappingToApi(payload: UploadUidUnamePayload): Promise<void> {
  const response = await fetch(`${UID_MAPPING_API_BASE}/api/uid-uname-mappings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('上传 UID 映射失败。');
  }

  const data = (await response.json()) as UidUnameUploadResponse;

  if (!data.success) {
    throw new Error(data.message || '上传 UID 映射失败。');
  }
}
