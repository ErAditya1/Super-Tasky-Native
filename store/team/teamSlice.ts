import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UserInterface {
    name: string;
    email: string;
    username: string;
    isOnline: boolean;
    _id: string;
    avatar: {
        url: string;
    };
}

export interface TeamInterface {
    _id: string;
    name: string;
    description: string;
    owner: string;
    avatar: {
        url: string;
    };
    members: {
        user: UserInterface;
        role: string;

    }[];
    projects:{
        name:string
    }[]
}

export interface InviteInterface {
    email: string;
    invitedBy: UserInterface;
    role: string;
    status: string;
}

interface TeamState {
    activeTeam: TeamInterface | null;
    teams: TeamInterface[];
    team: TeamInterface | null;
    invites: InviteInterface[];
}

const initialState: TeamState = {
    activeTeam: null,
    teams: [],
    team: null,
    invites: []
};

const teamSlice = createSlice({
    name: "team",
    initialState,
    reducers: {
        addTeams(state, action: PayloadAction<TeamInterface[]>) {
            state.teams = action.payload;
        },
        updatedTeam(state, action) {
            state.teams=state.teams.map(team => {
                if (team._id.toString() === action.payload._id.toString()) {
                    state.activeTeam = action.payload
                    return action.payload
                }
                return team
            })
        },
        addActiveTeam(state, action: PayloadAction<TeamInterface>) {
            state.activeTeam = action.payload;
        },
        insertTeam(state, action: PayloadAction<TeamInterface>) {
            state.teams.push(action.payload);
        },
        addTeamData(state, action: PayloadAction<TeamInterface>) {
            state.team = action.payload;
        },
        addInvites(state, action: PayloadAction<InviteInterface[]>) {
            state.invites = action.payload;
        },
        insertInviteMember(state,action){
            state.invites.push(action.payload)
        }
    }
});

export const {
    addTeams,
    updatedTeam,
    addActiveTeam,
    insertTeam,
    addTeamData,
    addInvites,
    insertInviteMember,
} = teamSlice.actions;

export default teamSlice.reducer;
