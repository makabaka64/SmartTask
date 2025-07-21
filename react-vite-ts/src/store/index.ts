// 组合redux子模块 + 导出store实例
import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage' // 默认使用 localStorage
import { combineReducers } from 'redux'

import userReducer from './modules/user'
import taskReducer from './modules/taskSlice'
import NotificationReducer from './modules/notification'

// 将多个 reducer 合并
const rootReducer = combineReducers({
  user: userReducer,
  task: taskReducer,
  notification: NotificationReducer
})

//配置redux-persist
const persistConfig = {
  key: 'root',
  storage
}
const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // 关闭序列化检查（redux-persist 需要）
    })
})
// 导出持久化控制器
export const persistor = persistStore(store)
// 获取类型
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store