// 与任务相关的状态管理
import { createSlice } from "@reduxjs/toolkit";
import type { AppDispatch } from "@/store";
import {getTaskList} from "@/apis/task";

const taskSlice = createSlice({
  name: "task",
    // 数据状态
  initialState: {
    tasklist: [] ,
    // 任务摘要
    taskSummary: {} as Record<string, { taskId:string, summary: string }>
  },
  reducers: {
    // 设置任务详情
    setTaskList(state, action) {
      state.tasklist = action.payload;
    },
    // 任务的AI 摘要
    setTaskSummary(state, action) {
    const { taskId, summary } = action.payload;
    const prev = state.taskSummary[taskId]?.summary || '';
    state.taskSummary[taskId] = { taskId, summary: prev + summary };
    },
    // 清除任务摘要
    clearTaskSummary(state, action) {
      const taskId = action.payload;
      state.taskSummary[taskId] = { taskId, summary: '' };
    }
  },
});

export const { setTaskList,setTaskSummary,clearTaskSummary } = taskSlice.actions;
const taskReducer = taskSlice.reducer;
// 异步获取任务详情 
export const fetchTaskList = () => {
    return async (dispatch: AppDispatch) => {
      try {
        const res = await getTaskList();
        // console.log("获取任务详情成功:", res.data);
        const list = res.data
        const sortList = list?.sort((a:any, b:any) => { // 通过item_index进行排序
          return a.item_index - b.item_index
        })
        dispatch(setTaskList(sortList));
      } catch (error) {
        console.error("获取任务详情失败:", error);
      }
    };
  }
export default taskReducer;