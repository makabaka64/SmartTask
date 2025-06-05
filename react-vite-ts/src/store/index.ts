// 组合redux子模块 + 导出store实例
import { configureStore } from '@reduxjs/toolkit'
import userReducer from './modules/user'
import taskReducer from './modules/taskSlice'

const store = configureStore({
  reducer: {
    user: userReducer,
    task: taskReducer
  }
})

// 获取类型
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store