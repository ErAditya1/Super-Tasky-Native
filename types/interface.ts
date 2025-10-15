type CreateProject = {
    name:string,
    description:string
}

type CreateTeam ={
    name:string,
    description:string
}

type CreateTask={
    title:string,
    description:string,
    priority:string,
    dueDate:Date,
    project?: string | undefined; 
    dueTime?: string | undefined; 
    tags?: string | undefined; 
}
