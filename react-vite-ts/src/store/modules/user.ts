// 和用户相关的状态管理
import { createSlice } from '@reduxjs/toolkit'
import { setToken as _setToken, getToken, removeToken } from '@/utils'
import type { LoginForm } from '@/types/api'
import type { AppDispatch } from '@/store'
import { reguser, login ,sendCode, getUserInfo, logout} from '@/apis/user';

const userStore = createSlice({
  name: "user",
  // 数据状态
  initialState: {
    token: getToken() || '',
    userInfo: {
      id: 0,  
      nickname: '',
      email: '',
      avater_url: '',
      create_time: ''
    }
  },
  // 同步修改方法
  reducers: {
    setToken (state, action) {
      state.token = action.payload
      _setToken(action.payload)
    },
    setUserInfo (state, action) {
      state.userInfo = action.payload
    },
    clearUserInfo (state) {
      state.token = ''
      state.userInfo = {nickname: '', email: '', avater_url: '', create_time: '',id: 0}
      removeToken()
    }
  }
})


// 解构出actionCreater

const { setToken, setUserInfo, clearUserInfo } = userStore.actions

// 获取reducer函数

const userReducer = userStore.reducer

// 发送验证码异步方法封装
const fetchSendCode = (email: string) => async () => {
  try {
    await sendCode( email )
  } catch {
    alert('验证码发送失败')
  }
}

// 注册用户异步方法封装
const fetchRegister = (RegisterForm:LoginForm) => {
  return async () => {
    const res = await reguser(RegisterForm)
    if (res.status !== 0) {
      throw new Error('注册失败，请检查邮箱或验证码');
    }
  }
}

// 登录获取token异步方法封装
const fetchLogin = (LoginForm:LoginForm) => {
  return async (dispatch:AppDispatch) => {
    const res = await login(LoginForm)
    if (res.status !== 0) {
      throw new Error('登录失败，请检查邮箱或密码');
    }
    dispatch(setToken(res.token))
    console.log('登录成功，token:', res.token);
    
  }
}

// 登出模块
const fetchLogout = () => {
  return async (dispatch: AppDispatch) => {
    try {
      await logout() 
    } catch (e) {
      console.warn('退出登录请求失败:', e)
    } finally {
      dispatch(clearUserInfo())
    }
  }
}

// 获取个人用户信息异步方法
const fetchUserInfo = () => {
  return async (dispatch:AppDispatch) => {
    const res = await getUserInfo()
    if (res.status !== 0) {
      throw new Error('获取用户信息失败');
    } else {
      dispatch(setUserInfo(res.data))
    }
  }
}

export { fetchLogin, fetchUserInfo, clearUserInfo,fetchRegister,fetchSendCode,fetchLogout }

export default userReducer