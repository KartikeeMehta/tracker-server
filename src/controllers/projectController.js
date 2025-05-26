import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/config";
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  FileText,
  Calendar,
  User,
  ArrowLeft,
  Clock,
  Building2,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

// Helper function to get status display properties
const getStatusDisplay = (status) => {
  switch (status) {
    case "active":
      return { text: "Active", color: "bg-blue-500 text-blue-50" };
    case "completed":
      return { text: "Completed", color: "bg-green-500 text-green-50" };
    case "on_hold":
      return { text: "On Hold", color: "bg-amber-500 text-amber-50" };
    case "cancelled":
      return { text: "Cancelled", color: "bg-red-500 text-red-50" };
    default:
      return { text: "Unknown", color: "bg-gray-500 text-gray-50" };
  }
};

export default function Projects() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    clientName: "",
    startDate: "",
    endDate: "",
    projectLead: "",
    members: [],
    status: "active", // Add default status
  });
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [isCompletingProject, setIsCompletingProject] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      console.log("User not authenticated:", { user, isAuthenticated });
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "Please login to access projects",
      });
      navigate("/login");
      return;
    }

    fetchProjects();
    fetchUsers();
  }, [isAuthenticated, authLoading, navigate, toast, user]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("auth.token");
      console.log("Fetching users with token:", token);

      const response = await fetch(`${API_BASE_URL}/users/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Failed to fetch users:", errorData);
        throw new Error(errorData?.message || "Failed to fetch users");
      }

      const data = await response.json();
      console.log("Fetched users data:", data);

      if (!Array.isArray(data)) {
        console.error("Users data is not an array:", data);
        throw new Error("Invalid users data received");
      }

      setUsers(data);
      return data;
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load users",
      });
      return [];
    }
  };

  const fetchProjects = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("auth.token");
      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to fetch projects");
      }

      const data = await response.json();
      console.log("Fetched projects:", data);

      // Filter projects based on user role
      const filteredProjects = data.filter((project) => {
        if (user?.role === "admin") return true;

        // For team members, show only projects where they are a member or lead
        if (user?.role === "team_member") {
          const isMember = project.members.some(
            (member) => member._id === user._id || member === user._id
          );
          const isLead =
            project.projectLead?._id === user._id ||
            project.projectLead === user._id;
          return isMember || isLead;
        }

        return false;
      });

      setProjects(filteredProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load projects",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    try {
      const token = localStorage.getItem("auth.token");

      // Validate required fields
      if (!newProject.name || !newProject.projectLead) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Project name and project lead are required",
        });
        return;
      }

      // Ensure project lead is in members array
      const members = [...newProject.members];
      if (newProject.projectLead && !members.includes(newProject.projectLead)) {
        members.push(newProject.projectLead);
      }

      const projectData = {
        name: newProject.name,
        description: newProject.description || "",
        clientName: newProject.clientName || "",
        projectLead: newProject.projectLead,
        members: members,
        companyId: user.companyId,
        startDate: newProject.startDate || undefined,
        endDate: newProject.endDate || undefined,
        status: newProject.status || "active", // Use status from state
      };

      console.log("Sending project data:", projectData);

      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData?.message || `Server error: ${response.status}`
        );
      }

      toast({
        title: "Success",
        description: "Project created successfully",
      });
      setShowAddForm(false);
      setNewProject({
        name: "",
        description: "",
        clientName: "",
        startDate: "",
        endDate: "",
        projectLead: "",
        members: [],
        status: "active",
      });
      fetchProjects();
    } catch (error) {
      console.error("Error creating project:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create project",
      });
    }
  };

  const handleMemberChange = (userId) => {
    setNewProject((prev) => {
      const members = prev.members.includes(userId)
        ? prev.members.filter((id) => id !== userId)
        : [...prev.members, userId];
      return { ...prev, members };
    });
  };

  const handleEditMemberChange = (userId) => {
    setProjectToEdit((prev) => {
      if (!prev.members) {
        prev.members = [];
      }
      if (userId === prev.projectLead) {
        return prev;
      }
      const members = prev.members.includes(userId)
        ? prev.members.filter((id) => id !== userId)
        : [...prev.members, userId];
      return { ...prev, members };
    });
  };

  const handleEditProject = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !projectToEdit) return;

    try {
      const token = localStorage.getItem("auth.token");

      // Log the current state
      console.log("Current projectToEdit state:", projectToEdit);
      console.log("Current users:", users);

      // Ensure all members are valid user IDs
      const memberIds = projectToEdit.members.map((member) => {
        const memberId = typeof member === "object" ? member._id : member;
        console.log(
          "Processing member for update:",
          member,
          "to ID:",
          memberId
        );
        return memberId;
      });

      // Verify all member IDs exist in users array
      const invalidMembers = memberIds.filter(
        (id) => !users.some((u) => u._id === id)
      );
      if (invalidMembers.length > 0) {
        console.error("Invalid member IDs found:", invalidMembers);
        throw new Error(`Invalid member IDs: ${invalidMembers.join(", ")}`);
      }

      // Ensure project lead is in members array
      const projectLeadId =
        typeof projectToEdit.projectLead === "object"
          ? projectToEdit.projectLead._id
          : projectToEdit.projectLead;

      if (projectLeadId && !memberIds.includes(projectLeadId)) {
        console.log("Adding project lead to members array for update");
        memberIds.push(projectLeadId);
      }

      // Prepare the project data for update
      const projectData = {
        name: projectToEdit.name,
        description: projectToEdit.description,
        clientName: projectToEdit.clientName,
        startDate: projectToEdit.startDate,
        endDate: projectToEdit.endDate,
        projectLead: projectLeadId,
        members: memberIds,
        status: projectToEdit.status, // Include status in update
      };

      console.log("Sending update data:", projectData);

      const response = await fetch(
        `${API_BASE_URL}/projects/${projectToEdit._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(projectData),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Server response:", responseData);
        throw new Error(responseData.message || "Failed to update project");
      }

      toast({
        title: "Success",
        description: "Project updated successfully",
      });

      // Close the edit form
      setShowEditForm(false);
      setProjectToEdit(null);

      // Fetch updated projects
      await fetchProjects();

      // If we're in project details view, update the selected project
      if (showProjectDetails && selectedProject) {
        const updatedProject = await fetch(
          `${API_BASE_URL}/projects/${selectedProject._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ).then((res) => res.json());

        setSelectedProject(updatedProject);
      }
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update project",
      });
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!isAuthenticated) return;

    try {
      const token = localStorage.getItem("auth.token");
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete project");
      }

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });

      // Close project details if open
      setShowProjectDetails(false);
      setSelectedProject(null);

      // Refresh the projects list
      await fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete project",
      });
    }
  };

  const startEditProject = async (project) => {
    console.log("Starting edit for project:", project);

    // Ensure we have the latest user data
    let currentUsers = users;
    if (!currentUsers || currentUsers.length === 0) {
      console.log("No users data, fetching users...");
      currentUsers = await fetchUsers();
    }

    console.log("Current users data:", currentUsers);

    // Handle both object and ID formats for project lead
    const projectLeadId =
      typeof project.projectLead === "object"
        ? project.projectLead._id
        : project.projectLead;
    console.log("Project lead ID:", projectLeadId);

    // Find the project lead user
    const leadUser = currentUsers.find((u) => u._id === projectLeadId);
    console.log("Found lead user:", leadUser);

    if (!leadUser) {
      console.error("Could not find lead user with ID:", projectLeadId);
      console.log("Available users:", currentUsers);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not find project lead information",
      });
      return;
    }

    // Process members to ensure they are all IDs
    const memberIds = project.members.map((member) => {
      const memberId = typeof member === "object" ? member._id : member;
      console.log("Processing member:", member, "to ID:", memberId);
      return memberId;
    });

    console.log("Processed member IDs:", memberIds);

    const projectToEdit = {
      ...project,
      startDate: project.startDate
        ? new Date(project.startDate).toISOString().split("T")[0]
        : "",
      endDate: project.endDate
        ? new Date(project.endDate).toISOString().split("T")[0]
        : "",
      members: memberIds,
      projectLead: projectLeadId,
      status: project.status, // Include existing status for editing
    };

    // Ensure project lead is in members array
    if (projectLeadId && !projectToEdit.members.includes(projectLeadId)) {
      console.log("Adding project lead to members array");
      projectToEdit.members.push(projectLeadId);
    }

    console.log("Final project to edit:", projectToEdit);
    setProjectToEdit(projectToEdit);
    setShowEditForm(true);
  };

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setShowProjectDetails(true);
  };

  const handleRemoveMember = (userId) => {
    if (userId === projectToEdit.projectLead) return;

    setProjectToEdit((prev) => ({
      ...prev,
      members: prev.members.filter((id) => id !== userId),
    }));
  };

  const handleAddMember = (userId) => {
    setProjectToEdit((prev) => ({
      ...prev,
      members: [...prev.members, userId],
    }));
  };

  const isProjectExpiring = (endDate) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const daysUntilEnd = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return daysUntilEnd <= 7 && daysUntilEnd > 0;
  };

  const isProjectExpired = (endDate) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    return end < now;
  };

  const handleCompleteProject = async (projectId) => {
    if (!isAuthenticated || user?.role !== "admin") return;

    try {
      setIsCompletingProject(true);
      const token = localStorage.getItem("auth.token");
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/complete`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to complete project");
      }

      toast({
        title: "Success",
        description: "Project marked as completed successfully",
      });

      // Refresh projects list
      await fetchProjects();

      // Update selected project if it's the one being completed
      if (selectedProject && selectedProject._id === projectId) {
        setShowProjectDetails(false);
        setSelectedProject(null);
      }
    } catch (error) {
      console.error("Error completing project:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to complete project",
      });
    } finally {
      setIsCompletingProject(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will be redirected by useEffect
  }

  if (showAddForm) {
    // Only show team member selection if a lead is selected
    const showTeamMemberSection = !!newProject.projectLead;
    // Exclude the lead and already selected members from the dropdown
    const availableUsers = users.filter(
      (user) =>
        user._id !== newProject.projectLead &&
        !newProject.members.includes(user._id)
    );
    // List of selected members (excluding the lead)
    const selectedMembers = users.filter(
      (user) =>
        newProject.members.includes(user._id) &&
        user._id !== newProject.projectLead
    );
    // The lead user object
    const leadUser = users.find((u) => u._id === newProject.projectLead);

    return (
      <div className="p-6">
        <div className="max-w-[90%] mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                Create New Project
              </h2>
            </div>
            <form onSubmit={handleAddProject} className="space-y-6">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                />
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  value={newProject.clientName}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      clientName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Project Lead */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Lead
                </label>
                <div className="relative">
                  <select
                    value={newProject.projectLead}
                    onChange={(e) => {
                      const newLeadId = e.target.value;
                      setNewProject((prev) => {
                        // Remove old lead from members if they were only there because they were lead
                        const members = prev.members.filter(
                          (id) =>
                            id !== prev.projectLead ||
                            (id === prev.projectLead &&
                              prev.members.filter((m) => m === id).length > 1)
                        );
                        // Add new lead to members if not already there
                        if (newLeadId && !members.includes(newLeadId)) {
                          members.push(newLeadId);
                        }
                        return {
                          ...prev,
                          projectLead: newLeadId,
                          members,
                        };
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Project Lead</option>
                    {users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.firstName} {user.lastName}
                      </option>
                    ))}
                  </select>
                  <User
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>
                {leadUser && (
                  <p className="mt-1 text-sm text-blue-600">
                    Selected Lead: {leadUser.firstName} {leadUser.lastName}
                  </p>
                )}
              </div>

              {/* Team Members */}
              {showTeamMemberSection && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Team Members
                    </label>
                    {availableUsers.length > 0 && (
                      <div className="relative">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleMemberChange(e.target.value);
                              e.target.value = ""; // Reset select after adding
                            }
                          }}
                          className="px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Add Member
                          </option>
                          {availableUsers.map((user) => (
                            <option key={user._id} value={user._id}>
                              {user.firstName} {user.lastName}
                            </option>
                          ))}
                        </select>
                        <Plus
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                          size={16}
                        />
                      </div>
                    )}
                  </div>

                  {/* Current Members List */}
                  <div className="border rounded-lg divide-y">
                    {/* Show the lead at the top of the list */}
                    {leadUser && (
                      <div className="flex items-center justify-between p-3 bg-blue-50">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-500" />
                          <span className="text-gray-700 font-semibold">
                            {leadUser.firstName} {leadUser.lastName}
                            <span className="ml-2 text-xs text-blue-600">
                              (Project Lead)
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Show selected members (excluding the lead) */}
                    {selectedMembers.length > 0 ? (
                      selectedMembers.map((member) => (
                        <div
                          key={member._id}
                          className="flex items-center justify-between p-3 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-500" />
                            <span className="text-gray-700">
                              {member.firstName} {member.lastName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewProject((prev) => ({
                                ...prev,
                                members: prev.members.filter(
                                  (id) => id !== member._id
                                ),
                              }));
                            }}
                            className="p-1 text-gray-500 hover:text-red-600 transition"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-gray-500 text-center">
                        No team members added yet
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Total Members: {selectedMembers.length + (leadUser ? 1 : 0)}
                  </p>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={newProject.status || "active"}
                    onChange={(e) =>
                      setNewProject({ ...newProject, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <Clock
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={newProject.startDate}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          startDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Calendar
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={newProject.endDate}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          endDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Calendar
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <Plus size={20} />
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (showEditForm && projectToEdit) {
    console.log("Rendering edit form with project:", projectToEdit);
    console.log("Current users:", users);

    // Get current members with their full user data
    const currentMembers = users.filter((user) =>
      projectToEdit.members.includes(user._id)
    );

    // Get available users (not current members and not the project lead)
    const availableUsers = users.filter(
      (user) =>
        !projectToEdit.members.includes(user._id) &&
        user._id !== projectToEdit.projectLead
    );

    return (
      <div className="p-6">
        <div className="max-w-[90%] mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setProjectToEdit(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Edit Project</h2>
            </div>
            <form onSubmit={handleEditProject} className="space-y-6">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectToEdit.name}
                  onChange={(e) =>
                    setProjectToEdit({ ...projectToEdit, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={projectToEdit.description}
                  onChange={(e) =>
                    setProjectToEdit({
                      ...projectToEdit,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                />
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  value={projectToEdit.clientName}
                  onChange={(e) =>
                    setProjectToEdit({
                      ...projectToEdit,
                      clientName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Project Lead */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Lead
                </label>
                <div className="relative">
                  <select
                    value={projectToEdit.projectLead || ""}
                    disabled={true}
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 cursor-not-allowed"
                  >
                    <option value={projectToEdit.projectLead}>
                      {(() => {
                        const leadUserInSelect = users.find(
                          (u) => u._id === projectToEdit.projectLead
                        );
                        console.log(
                          "Found lead user in select:",
                          leadUserInSelect
                        );
                        if (!leadUserInSelect) {
                          console.log(
                            "Project lead ID in select:",
                            projectToEdit.projectLead
                          );
                          console.log("Available users in select:", users);
                        }
                        return leadUserInSelect
                          ? `${leadUserInSelect.firstName} ${leadUserInSelect.lastName}`
                          : "Loading...";
                      })()}
                    </option>
                  </select>
                  <User
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-blue-600" />
                    <span className="text-blue-700 font-medium">
                      Current Project Lead:{" "}
                      {(() => {
                        const leadUserInDisplay = users.find(
                          (u) => u._id === projectToEdit.projectLead
                        );
                        console.log(
                          "Found lead user in display:",
                          leadUserInDisplay
                        );
                        if (!leadUserInDisplay) {
                          console.log(
                            "Project lead ID in display:",
                            projectToEdit.projectLead
                          );
                          console.log("Available users in display:", users);
                        }
                        return leadUserInDisplay
                          ? `${leadUserInDisplay.firstName} ${leadUserInDisplay.lastName}`
                          : "Loading...";
                      })()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Project lead cannot be changed after creation
                  </p>
                </div>
              </div>

              {/* Team Members */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Team Members
                  </label>
                  {availableUsers.length > 0 && (
                    <div className="relative">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddMember(e.target.value);
                            e.target.value = ""; // Reset select after adding
                          }
                        }}
                        className="px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Add Member
                        </option>
                        {availableUsers.map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.firstName} {user.lastName}
                          </option>
                        ))}
                      </select>
                      <Plus
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        size={16}
                      />
                    </div>
                  )}
                </div>

                {/* Current Members List */}
                <div className="border rounded-lg divide-y">
                  {/* Show the lead at the top of the list */}
                  {projectToEdit.projectLead && (
                    <div className="flex items-center justify-between p-3 bg-blue-50">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-500" />
                        <span className="text-gray-700 font-semibold">
                          {
                            users.find(
                              (u) => u._id === projectToEdit.projectLead
                            )?.firstName
                          }{" "}
                          {
                            users.find(
                              (u) => u._id === projectToEdit.projectLead
                            )?.lastName
                          }
                          <span className="ml-2 text-xs text-blue-600">
                            (Project Lead)
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Show selected members (excluding the lead) */}
                  {currentMembers.length > 0 ? (
                    currentMembers
                      .filter(
                        (member) => member._id !== projectToEdit.projectLead
                      )
                      .map((member) => (
                        <div
                          key={member._id}
                          className="flex items-center justify-between p-3 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-500" />
                            <span className="text-gray-700">
                              {member.firstName} {member.lastName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member._id)}
                            className="p-1 text-gray-500 hover:text-red-600 transition"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))
                  ) : (
                    <div className="p-3 text-gray-500 text-center">
                      No team members added yet
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Total Members: {currentMembers.length}
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={projectToEdit.status || "active"}
                    onChange={(e) =>
                      setProjectToEdit({
                        ...projectToEdit,
                        status: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <Clock
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={projectToEdit.startDate}
                      onChange={(e) =>
                        setProjectToEdit({
                          ...projectToEdit,
                          startDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Calendar
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={projectToEdit.endDate}
                      onChange={(e) =>
                        setProjectToEdit({
                          ...projectToEdit,
                          endDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Calendar
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <Edit2 size={20} />
                  Update Project
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (showProjectDetails && selectedProject) {
    console.log("Selected Project:", selectedProject);
    console.log("Available Users:", users);

    // Find the project lead user
    const projectLead = users.find(
      (user) =>
        user._id ===
        (typeof selectedProject.projectLead === "object"
          ? selectedProject.projectLead._id
          : selectedProject.projectLead)
    );
    console.log("Found Project Lead:", projectLead);

    // Get all team members with proper ID handling
    const teamMembers = selectedProject.members
      .map((member) => {
        const memberId = typeof member === "object" ? member._id : member;
        const user = users.find((u) => u._id === memberId);
        console.log(
          "Processing member:",
          member,
          "ID:",
          memberId,
          "Found user:",
          user
        );
        return user;
      })
      .filter((member) => member !== undefined);

    console.log("Team Members:", teamMembers);

    return (
      <div className="p-6">
        <div className="max-w-[90%] mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => {
                  setShowProjectDetails(false);
                  setSelectedProject(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                Project Details
              </h2>
            </div>

            <div className="space-y-8">
              {/* Project Header */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedProject.name}
                    </h3>
                    {user?.role === "admin" && (
                      <div className="flex gap-2">
                        {selectedProject.status === "completed" ? (
                          <span className="flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium bg-green-100 text-green-700">
                            <CheckCircle2 size={16} />
                            Project Completed
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              handleCompleteProject(selectedProject._id)
                            }
                            disabled={isCompletingProject}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                              isCompletingProject
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            }`}
                          >
                            <CheckCircle2 size={16} />
                            {isCompletingProject
                              ? "Completing..."
                              : "Mark as Completed"}
                          </button>
                        )}
                        <button
                          onClick={() => startEditProject(selectedProject)}
                          className="p-2 text-gray-500 hover:text-blue-600 transition"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteProject(selectedProject._id)
                          }
                          className="p-2 text-gray-500 hover:text-red-600 transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Building2 size={16} />
                      <span>
                        {selectedProject.clientName || "No client specified"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>
                        {selectedProject.startDate
                          ? new Date(
                              selectedProject.startDate
                            ).toLocaleDateString()
                          : "No start date"}{" "}
                        -
                        {selectedProject.endDate
                          ? new Date(
                              selectedProject.endDate
                            ).toLocaleDateString()
                          : "Ongoing"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Display */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    Status
                  </h4>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      getStatusDisplay(selectedProject.status).color
                    }`}
                  >
                    {getStatusDisplay(selectedProject.status).text}
                  </span>
                </div>

                {/* Description */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText size={18} className="text-gray-500" />
                    Description
                  </h4>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {selectedProject.description || "No description provided"}
                  </p>
                </div>

                {/* Project Lead */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <User size={18} className="text-gray-500" />
                    Project Lead
                  </h4>
                  {projectLead ? (
                    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                      <User size={16} className="text-blue-600" />
                      <span className="text-gray-700">
                        {projectLead.firstName} {projectLead.lastName}
                      </span>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <p>No project lead assigned</p>
                      <p className="text-sm mt-1">
                        Project Lead ID:{" "}
                        {typeof selectedProject.projectLead === "object"
                          ? selectedProject.projectLead._id
                          : selectedProject.projectLead}
                      </p>
                    </div>
                  )}
                </div>

                {/* Team Members */}
                <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Users size={18} className="text-gray-500" />
                    Team Members
                  </h4>
                  {teamMembers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {teamMembers
                        .filter(
                          (member) =>
                            member._id !==
                            (typeof selectedProject.projectLead === "object"
                              ? selectedProject.projectLead._id
                              : selectedProject.projectLead)
                        )
                        .map((member) => (
                          <div
                            key={member._id}
                            className="flex items-center gap-2 p-2 bg-white rounded-lg border"
                          >
                            <User size={16} className="text-gray-500" />
                            <span className="text-gray-700">
                              {member.firstName} {member.lastName}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <p>No team members assigned</p>
                      <p className="text-sm mt-1">
                        Member IDs: {JSON.stringify(selectedProject.members)}
                      </p>
                    </div>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    Total Members:{" "}
                    {
                      teamMembers.filter(
                        (member) =>
                          member._id !==
                          (typeof selectedProject.projectLead === "object"
                            ? selectedProject.projectLead._id
                            : selectedProject.projectLead)
                      ).length
                    }
                  </p>
                </div>

                {/* Project Timeline */}
                <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Calendar size={18} className="text-gray-500" />
                    Project Timeline
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm text-gray-500">Start Date</p>
                      <p className="text-gray-700">
                        {selectedProject.startDate
                          ? new Date(
                              selectedProject.startDate
                            ).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm text-gray-500">End Date</p>
                      <p className="text-gray-700">
                        {selectedProject.endDate
                          ? new Date(
                              selectedProject.endDate
                            ).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                    {selectedProject.status === "completed" &&
                      selectedProject.completedAt && (
                        <div className="bg-white p-3 rounded-lg border md:col-span-2">
                          <p className="text-sm text-gray-500">
                            Completion Date
                          </p>
                          <p className="text-gray-700">
                            {new Date(
                              selectedProject.completedAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-[90%] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === "admin" ? "All Projects" : "My Projects"}
          </h1>
          {user?.role === "admin" && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Add Project
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border">
            <FileText size={48} className="text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {user?.role === "admin"
                ? "No Projects Yet"
                : "No Projects Assigned"}
            </h3>
            <p className="text-gray-500 mb-4">
              {user?.role === "admin"
                ? "Get started by creating your first project"
                : "You haven't been assigned to any projects yet"}
            </p>
            {user?.role === "admin" && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={20} />
                Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const isExpiring = isProjectExpiring(project.endDate);
              const isExpired = isProjectExpired(project.endDate);
              const statusDisplay = getStatusDisplay(project.status);

              return (
                <div
                  key={project._id}
                  onClick={() => handleProjectClick(project)}
                  className={`bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition cursor-pointer flex flex-col ${
                    isExpired ? "border-red-200 bg-red-50" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex-grow mr-2">
                      {project.name}
                    </h3>
                    {/* Status Tag */}
                    {project.status && (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.color}`}
                      >
                        {statusDisplay.text}
                      </span>
                    )}
                  </div>
                  {/* Existing expiring/expired indicators */}
                  {(isExpiring && !isExpired) || isExpired ? (
                    <div className="flex items-center gap-4 text-sm mb-4">
                      {isExpiring && !isExpired && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <AlertCircle size={14} />
                          <span>Ending soon</span>
                        </div>
                      )}
                      {isExpired && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertCircle size={14} />
                          <span>Expired</span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <p className="text-gray-600 mb-4 flex-grow">
                    {project.description || "No description provided"}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500 mt-auto">
                    <div className="flex items-center gap-2">
                      <Users size={16} />
                      <span>{project.members?.length || 0} members</span>
                    </div>
                    {project.endDate && (
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>
                          {new Date(project.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
