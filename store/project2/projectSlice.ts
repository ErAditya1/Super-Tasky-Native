import { createSlice } from "@reduxjs/toolkit";
import { User, UserInterface } from "../user/userSlice";


export interface ProjectInterface {
    _id: string,
    name: string,
    team: string,
    color: string,
    description: string,
    owner: string,
    tasks: {
        _id: string,
        title: string
    }[]
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
            state.projects = [...state.projects, { ...action.payload }]
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
        }
    },
});

export const { addProjects, addCurrentProject, clearCurrentProject, clearProjects, insertProject, insertTaskInsideProject } = projectSlice.actions;

export default projectSlice.reducer;
