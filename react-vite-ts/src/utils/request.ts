// axios的封装处理
import axios from "axios"
import { getToken, removeToken, setToken } from "./token"

const request = axios.create({
  baseURL: 'http://127.0.0.1:3001',
  timeout: 5000,
  withCredentials: true, // 允许发送 cookie（refresh_token）
  headers: {
    'Content-Type': 'application/json' 
  }
}) 


// 刷新 Token 核心逻辑
let isRefreshing = false  // 标记是否正在刷新
let requestQueue: ((token: string) => void)[] = []  // 待重试请求队列
const handleTokenRefresh = async (error: any) => {
  const originalRequest = error.config

  if (isRefreshing) {
    // 已在刷新中，将当前请求添加到队列中等待新 token
    return new Promise((resolve) => {
      requestQueue.push((newToken: string) => {
        originalRequest.headers.Authorization = newToken
        resolve(request(originalRequest))
      })
    })
  }

  isRefreshing = true

  try {
    const res = await axios.get('/api/refresh', {
      withCredentials: true
    })

    const newToken = res.data.token
    setToken(newToken)

    // 执行队列中的请求
    requestQueue.forEach(callback => callback(newToken))
    requestQueue = []
    originalRequest.headers.Authorization = newToken
    return request(originalRequest)
  } catch (refreshError) {
    removeToken()
    requestQueue = []
    window.location.href = '/login'
    return Promise.reject(refreshError)
  } finally {
    isRefreshing = false
  }
}


// 请求拦截器
request.interceptors.request.use((config) => {
  const token = getToken()  // 从 localStorage 获取 Access Token
  if (token) {
    config.headers.Authorization = token
  }
  return config
}, (error) => {
  return Promise.reject(error)
})


// 响应拦截器：处理 401 自动刷新 Token
request.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      return handleTokenRefresh(error)
    }
    return Promise.reject(error)
  }
);
// request.interceptors.response.use((response) => {
//   return response.data
// }, (error) => {
//   console.dir(error)
//   if (error.response.status === 401) {
//     removeToken()
//     alert('登录过期，请重新登录')
//   }
//   return Promise.reject(error)
// })

export { request }


