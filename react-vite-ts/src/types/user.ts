export interface LoginForm{
    email: string;
    password: string;
    verificationCode?: string;
}
export interface LoginResult {
    status: number
    message: string
    token: string
  }
  export interface UserInfo {
    id: number
    nickname: string
    avatar_url: string
    email: string
    create_time: string
  }