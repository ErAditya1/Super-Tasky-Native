import { createSlice } from "@reduxjs/toolkit";
import { ProjectInterface } from "../project2/projectSlice";
import { User, UserInterface } from "../user/userSlice";



//  points:{
//       type: String,
//       enum: ["No Estimate", "1 Point", "2 Point", "3 Point", "4 Point", "5 Point"],
//       default: "No Estimate",
//     },
//     type:{
//       type:"string",
//       enum:["Task","Feature", "Improvement", "Research", "Testing", "Bug"],
//       default:"Task"
//     },

//     team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
//     project: { type: Schema.Types.ObjectId, ref: "Project", null:true },
//     assignedToUser: { type: Schema.Types.ObjectId, ref: "User" },
//     assignedToTeam: { type: Schema.Types.ObjectId, ref: "Team" }, // cross-team
//     dueDate: { type: Date },
//     tags: [{ type: String }],
//     isFocused: { type: Boolean, default: false }, // for Zen Focus
//     completedAt: { type: Date },
//     repeatDaily: { type: Boolean, default: false },



export interface TaskInterface {
    _id: string,
    title: string,
    team: string,
    description: string,
    user: string,
    status: "pending" | "in_progress" | "completed" | "canceled";
    priority: "low" | "medium" | "high" | "critical" | "none";
    category:string,
    points: string,
    type: "Task" | "Feature" | "Improvement" | "Research" | "Testing" | "Bug";
    lastSeen:string,
    isFavourite:boolean
    project: {
        _id:string
        name:string
        color:string
,
    },
    assignedToUser: {
        _id:string,
        name:string,
        avatar: {
            url:string
        }
    } ,
    assignedToTeam: string | null,
    dueDate: Date | null | string,
    tags: string[],
    isFocused: boolean,
    completedAt: Date | string | null,
    repeatDaily: boolean,
    createdAt: Date | string | null,
    updatedAt: Date | string | null,
    __v: number,


}

// create interface for TaskInterface with all the staus grouped task

export interface TaskGroupedByStatus {
    status: string;
    tasks: TaskInterface[];
}



const task: TaskInterface | null = {
    _id: '',
    title: '',
    description: '',
    user: '',
    team: '',
    status: "pending",
    priority: 'medium',
    category:'',
    points: '',
    type: 'Task',
    lastSeen :"",
    isFavourite:false,
    project: {
        _id:"",
        name:"",
        color:"",

    },
    assignedToUser: {
        _id:"",
        name:"",
        avatar:{
            url:"",
        }
    },
    assignedToTeam: null,
    dueDate: null,
    tags: [],
    isFocused: false,
    completedAt: null,
    repeatDaily: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    __v: 0,


}



const initialState = {
    tasks: [task],
    currentTask: task || null,
    tasksGroupedByStatus: [] as TaskGroupedByStatus[],
    tasksGroupedByUser: [] as { user: string; tasks: TaskInterface[] }[],
    favourtiteTasks: [] as TaskInterface[]

};

const taskSlice = createSlice({
    name: "task",
    initialState,
    reducers: {
        addTasks(state, action) {
            state.tasks = action.payload;
        },
        clearTasks(state) {
            state.tasks = [];
        },
        addCurrentTask(state, action) {
            state.currentTask = state.tasks.filter(t => t._id === action.payload)[0];
        },
        clearCurrentTask(state) {
            state.currentTask = task;
        },
        insertTask(state, action) {
            state.tasks = [...state.tasks, { ...action.payload }];
        },

        updateTask(state, action) {
            const { taskId, updatedTask } = action.payload;
            const taskIndex = state.tasks.findIndex(t => t._id === taskId);
            if (taskIndex !== -1) {
                state.tasks[taskIndex] = { ...state.tasks[taskIndex], ...updatedTask };
            }
            
        },
        deleteTask(state, action) {
            const taskId = action.payload;
            state.tasks = state.tasks.filter(t => t._id !== taskId);
        },
        groupTasksByStatus(state) {
            const grouped: { [key: string]: TaskInterface[] } = {};
            state.tasks.forEach(task => {
                if (!grouped[task?.status]) {
                    grouped[task?.status] = [];
                }
                grouped[task.status].push(task);
            });
            state.tasksGroupedByStatus = Object.entries(grouped).map(([status, tasks]) => ({ status, tasks }));
        },
        addStatusGroupedTasks(state, action) {
            state.tasksGroupedByStatus = action.payload
        },
        addFavouriteTasks(state, action) {
            state.favourtiteTasks = action.payload
        },
        insertFavouriteTask(state,action){
            if(action.payload.isFavourite){

                state.favourtiteTasks.push(action.payload)
            }else{
                state.favourtiteTasks = state.favourtiteTasks.filter((t)=>t._id !== action.payload._id)
            }
        }

    }
});

export const { addTasks, clearTasks,insertTask, addCurrentTask, clearCurrentTask, updateTask, deleteTask, groupTasksByStatus, addStatusGroupedTasks, addFavouriteTasks, insertFavouriteTask} = taskSlice.actions;

export default taskSlice.reducer;
