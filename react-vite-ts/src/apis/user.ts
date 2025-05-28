import { request } from '@/utils/request';
import type {
  LoginForm,
  LoginResult,
  ApiResponse,
  UserInfo,
  UpdateUserInfoData,
  UpdateAvatarData,
  UpdatePasswordData,
} from '@/types/api';

// 登录注册模块
export const sendCode = (email: string): Promise<ApiResponse> => {
  return request.post('/api/sendCode', { email });
};

export const reguser = (data: LoginForm): Promise<ApiResponse> => {
  return request.post('/api/reguser', data);
};

export const login = (data: LoginForm): Promise<LoginResult> => {
  return request.post('/api/login', data);
};

export const logout = (): Promise<ApiResponse> => {
  return request.post('/api/logout');
}

export const refreshToken = (): Promise<LoginResult> => {
  return request.get('/api/refresh');
}

// 个人信息模块
export const getUserInfo = ():  Promise<ApiResponse<UserInfo>> => {
  return request.get('/my/userinfo');
};

export const updateUserInfo = (data: UpdateUserInfoData): Promise<ApiResponse> => {
  return request.post('/my/userinfo', data);
};

export const updateAvatar = (data: UpdateAvatarData): Promise<ApiResponse> => {
  return request.post('/my/update/avatar', data);
};

export const updatePassword = (data: UpdatePasswordData): Promise<ApiResponse> => {
  return request.post('/my/updatepwd', data);
};