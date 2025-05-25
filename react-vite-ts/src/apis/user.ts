import { request } from '@/utils/request';
import type { LoginForm ,LoginResult} from '@/types/user';

// 登录注册模块
export const sendCode = (email: string) => {
  return request.post('/api/sendCode', { email })
}
export const reguser = (data: LoginForm) => {
  return request.post('/api/reguser', data)
}
export const login = (data: LoginForm): Promise<LoginResult> => {
  return request.post('/api/login', data)
}

// 个人信息模块
export const getUserInfo = () => {
  return request.get('/my/userinfo')
}
export const updateUserInfo = (data: any) => {
  return request.post('/my/userinfo', data)
}
export const updateAvatar = (data: any) => {
  return request.post('/my/update/avatar', data)
}
export const updatePassword = (data: any) => {
  return request.post('/my/updatepwd', data)
}
