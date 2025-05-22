// 和用户相关的状态管理
import { createSlice } from '@reduxjs/toolkit'
import { setToken as _setToken, getToken, removeToken } from '@/utils'
import type { LoginForm } from '@/types/user'
import type { AppDispatch } from '@/store'
import { reguser, login ,sendCode } from '@/apis/user';
import { message } from 'antd';

const userStore = createSlice({
  name: "user",
  // 数据状态
  initialState: {
    token: getToken() || '',
    userInfo: {}
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
      state.userInfo = {}
      removeToken()
    }
  }
})


// 解构出actionCreater

const { setToken,  clearUserInfo } = userStore.actions

// 获取reducer函数

const userReducer = userStore.reducer

// 发送验证码异步方法封装
const fetchSendCode = (email: string) => async () => {
  try {
    await sendCode( email )
  } catch {
    message.error('发送验证码失败')
  }
}

// 注册用户异步方法封装
const fetchRegister = (RegisterForm:LoginForm) => {
  return async () => {
    const res = await reguser(RegisterForm)
    if (res.status !== 0) {
      message.error('注册失败')
    }
  }
}

// 登录获取token异步方法封装
const fetchLogin = (LoginForm:LoginForm) => {
  return async (dispatch:AppDispatch) => {
    const res = await login(LoginForm)
    console.log(res);
    
    dispatch(setToken(res.token))
  }
}

// 获取个人用户信息异步方法
const fetchUserInfo = () => {
  return async (dispatch:AppDispatch) => {
    console.log(dispatch);
    
    // const res = await register()
    // dispatch(setUserInfo(res.data))
  }
}

export { fetchLogin, fetchUserInfo, clearUserInfo,fetchRegister,fetchSendCode }

export default userReducer