// 通用 API 响应类型
export interface ApiResponse<T = any> {
    status: number;
    message: string;
    data?: T;
  }
  // 登录表单
export interface LoginForm{
    email: string;
    password: string;
    verificationCode?: string;
}
export interface LoginResult {
    token: string
  }
  // 用户信息
  export interface UserInfo {
    id: number
    nickname: string
    avater_url: string
    email: string
    create_time: string
  }
  // 修改用户信息
export interface UpdateUserInfoData {
    id: number;
    nickname: string;
  }
  
  // 修改头像
  export interface UpdateAvatarData {
    avater_url: string;
  }
  
  // 修改密码
  export interface UpdatePasswordData {
    oldPwd: string;
    newPwd: string;
  }
  