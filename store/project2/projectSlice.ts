import { createSlice } from "@reduxjs/toolkit";
import { User } from "../user/userSlice";
import { TaskInterface } from "../task/taskSlice";


export interface ProjectInterface {
    _id: string,
    name: string,
    team: string,
    color: string,
    description: string,
    owner: string,
    tasks: TaskInterface[]
    members: User[],
    isArchieved: boolean

}




const project: ProjectInterface | null = {
    _id: '',
    name: '',
    description: '',
    owner: '',
    color:"",
    team: '',
    tasks: [],
    members: [],
    isArchieved:false


}



const initialState = {
    currentProject: project || null,
    projects: [
        project
    ],

};

const projectSlice = createSlice({
    name: "project",
    initialState,
    reducers: {
        addProjects(state, action) {

            state.projects = action.payload
        },
        clearProjects(state) {

            state.projects = []
        },
        addCurrentProject(state, action) {
            state.currentProject = action.payload
        },
        clearCurrentProject(state) {
            state.currentProject = project
        },
        insertProject(state, action) {
            state.projects = [ { ...action.payload }, ...state.projects]
        },
        insertTaskInsideProject(state, action) {
            if (action.payload.project) {
                state.projects = state.projects.map((p: ProjectInterface) => {
                    if (p._id === action.payload.project) {
                        return {
                            ...p,
                            tasks: [...p.tasks, action.payload]
                        };
                    }
                    return p;
                });
            }
        },
        updateProject(state, action){
            state.projects = action.payload
        }
    },
});

export const { addProjects, addCurrentProject, clearCurrentProject, clearProjects, insertProject, insertTaskInsideProject , updateProject} = projectSlice.actions;

export default projectSlice.reducer;
