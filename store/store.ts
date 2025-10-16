// store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './user/userSlice';
import settingReducer from './setting/settingSlice';
import teamReducer from './team/teamSlice';
import taskReducer from './task/taskSlice';
import projectReducer from './project2/projectSlice'

export const store = configureStore({
  reducer: {
    auth: userReducer,
    setting:settingReducer,
    team: teamReducer,
    project: projectReducer,
    task: taskReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
