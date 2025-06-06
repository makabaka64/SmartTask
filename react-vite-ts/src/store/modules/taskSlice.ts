// 与任务相关的状态管理
import { createSlice } from "@reduxjs/toolkit";
import type { AppDispatch } from "@/store";
import {getTaskList} from "@/apis/task";

const taskSlice = createSlice({
  name: "task",
    // 数据状态
  initialState: {
    tasklist: [] ,
  },
  reducers: {
    // 设置任务详情
    setTaskList(state, action) {
      state.tasklist = action.payload;
    },
  },
});

export const { setTaskList } = taskSlice.actions;
const taskReducer = taskSlice.reducer;
// 异步获取任务详情 
export const fetchTaskList = () => {
    return async (dispatch: AppDispatch) => {
      try {
        const res = await getTaskList();
        console.log("获取任务详情成功:", res.data);
        dispatch(setTaskList(res.data));
      } catch (error) {
        console.error("获取任务详情失败:", error);
      }
    };
  }
export default taskReducer;