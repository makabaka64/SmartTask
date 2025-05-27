import type { ApiResponse } from '@/types/api'

export function unwrap<T>(res: ApiResponse<T>): T {
  if (res.status !== 0 || res.data === undefined) {
    throw new Error(res.message || '请求失败')
  }
  return res.data
}