// 与通知相关的状态管理
import { createSlice } from "@reduxjs/toolkit";
// import type { AppDispatch } from "@/store";
import  type { Notification } from "@/types/notification";

interface NotificationState {
    list: Notification[];
  }
  const initialState: NotificationState = {
    list: [],
  };
  
const notification = createSlice({
  name: "notification",
   initialState,
  reducers: {
    setNotificationList(state, action) {
      state.list = action.payload;
    },
    addNotification(state, action) {
      state.list.unshift(action.payload);
    },
      clearNotifications: (state) => {
        state.list = [];
      },
    // 标记已读
    markAsRead(state, action) {
      const notificationId = action.payload;
      const notification = state.list.find((n) => n.id === notificationId);
      if (notification) {
        notification.status = 'read';
      }
    }
  },
});

export const { setNotificationList,addNotification, clearNotifications,markAsRead} = notification.actions;
const NotificationReducer = notification.reducer;

export default NotificationReducer;