import { request } from '@/utils/request';
import type { LoginForm ,LoginResult} from '@/types/user';

export const sendCode = (email: string) => {
  return request.post('/api/sendCode', { email })
}
export const reguser = (data: LoginForm) => {
  return request.post('/api/reguser', data)
}
export const login = (data: LoginForm): Promise<LoginResult> => {
  return request.post('/api/login', data)
}

