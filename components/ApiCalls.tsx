"use client";

import { getCurrentTeam, getInvites, getTeams } from "@/lib/api/team";
import { addInvites, addTeamData, addTeams } from "@/store/team/teamSlice";
import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useAppSelector } from "@/store/hooks";
import { getProjectWithTasks } from "@/lib/api/project";
import {
  getFavouriteTasks,
  getTasks,
  getTasksGroupedByStatus,
} from "@/lib/api/task";
import {
  addFavouriteTasks,
  addStatusGroupedTasks,
  addTasks,
  clearTasks,
} from "@/store/task/taskSlice";
import { useToast } from "./Toast";
import { addProjects, clearProjects } from "@/store/project2/projectSlice";
// import { addProjects, clearProjects } from "@/store/project/projectSlice";

function ApiCalls() {
  const { activeTeam } = useAppSelector((state) => state.team);
  const dispatch = useDispatch();
  const { show } = useToast();

  const fetchTeamData = async () => {
    const res = await getCurrentTeam();
    if (res.success) {
      // console.log("Members fetched:", res.data.data);
      // setMembers(res.data.data.members);
      const data = res.data.data;
      dispatch(addTeamData(data));
    } else {
      console.error("Failed to fetch members:", res?.message);
      show(res.message || "Team fetch failed", "danger");
    }
  };

  const fetchInvites = async () => {
    const res = await getInvites();
    if (res.success) {
      console.log("Invites fetched:", res.data.data);
      const data = res.data.data;
      dispatch(addInvites(data));
    } else {
      dispatch(addInvites([]));
    }
  };

  const loadProjects = async () => {
    const res = await getProjectWithTasks();
    if (res.success) {
      const projects = res.data.data;
      // console.log(projects)

      dispatch(addProjects(projects));
    } else {
      dispatch(clearProjects());
      console.log(res);
    }
  };

  const getTasksByStatus = async () => {
    const res = await getTasksGroupedByStatus();
    if (res.success) {
      const tasks = res.data.data;
      // console.log(tasks);
      dispatch(addStatusGroupedTasks(tasks));
    } else {
      console.log(res.message);
    }
  };

  const getFavourite = async () => {
    const res = await getFavouriteTasks();
    if (res.success) {
      dispatch(addFavouriteTasks(res.data.data));
    } else {
      console.log(res.message);
    }
  };
  const fetchTeams = async () => {
    try {
      const res = await getTeams();
      dispatch(addTeams(res.data.data));
    } catch (err) {
      console.error("Failed to fetch teams", err);
    } finally {
    }
  };

  const getTasksHandler = async () => {
    dispatch(clearTasks());
    const res = await getTasks();
    if (res.success) {
      console.log("tasks fetched");
      // console.log(res.data.data);
      dispatch(addTasks(res.data.data));
    } else {
      console.log("task cleared");
    }
  };

  useEffect(() => {
    getTasksHandler();
    loadProjects();
    fetchInvites();
    fetchTeamData();
    getTasksByStatus();
    getFavourite();
    fetchTeams();
  }, [activeTeam]);

  return <></>;
}

export default ApiCalls;
