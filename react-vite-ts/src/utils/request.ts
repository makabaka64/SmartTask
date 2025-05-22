// axios的封装处理
import axios from "axios"
import { getToken, removeToken } from "./token"

const request = axios.create({
  baseURL: 'http://127.0.0.1:3001',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json' 
  }
})

// 请求拦截器
request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

// 添加响应拦截器
request.interceptors.response.use((response) => {
  return response.data
}, (error) => {
  console.dir(error)
  if (error.response.status === 401) {
    removeToken()
    
    window.location.reload()
  }
  return Promise.reject(error)
})

export { request }


