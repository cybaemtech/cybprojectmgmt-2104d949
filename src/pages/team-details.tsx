import React from "react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Mail, Calendar, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/data-utils";
import { User, Project } from "@/types/schema";
import { useToast } from "@/hooks/use-toast";
import { teamStore, teamMemberStore, userStore, projectStore, getLocalUser } from "@/lib/local-store";

export default function TeamDetails() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  const { id: teamId } = useParams<{ id: string }>();
  const teamIdNum = teamId ? parseInt(teamId) : 0;

  const currentUser = getLocalUser();
  const teams = teamStore.all();
  const team = teamStore.get(teamIdNum);
  const projects = projectStore.all();
  const users = userStore.all();
  const teamMembers = teamMemberStore.byTeam(teamIdNum);
  const memberUsers = teamMemberStore.usersForTeam(teamIdNum);

  const isAdminOrScrum = currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER';

  const teamProjects = projects.filter((p: Project) => p.teamId === teamIdNum);
  const availableProjects = isAdminOrScrum ? projects.filter((p: Project) => p.teamId !== teamIdNum) : [];

  const assignTeamToProject = (projectId: number) => {
    const project = projectStore.get(projectId);
    if (project) {
      projectStore.save({ ...project, teamId: teamIdNum });
      setRefreshKey(k => k + 1);
      toast({ title: "Success", description: "Team assigned to project successfully" });
    }
  };

  const unassignTeamFromProject = (projectId: number) => {
    const project = projectStore.get(projectId);
    if (project) {
      projectStore.save({ ...project, teamId: null });
      setRefreshKey(k => k + 1);
      toast({ title: "Success", description: "Team unassigned from project successfully" });
    }
  };

  const handleAddMember = (userId: number) => {
    teamMemberStore.add(teamIdNum, userId);
    setRefreshKey(k => k + 1);
    toast({ title: "Member added", description: "Team member has been added successfully." });
  };

  const handleRemoveMember = (userId: number) => {
    teamMemberStore.remove(teamIdNum, userId);
    setRefreshKey(k => k + 1);
    toast({ title: "Member removed", description: "Team member has been removed successfully." });
  };

  // Get users not in team for adding
  const memberUserIds = new Set(teamMembers.map(m => m.userId));
  const availableMembers = users.filter(u => !memberUserIds.has(u.id));

  return (
    <div className="p-6">
          <div className="flex items-center mb-6">
            <Button variant="ghost" className="mr-6 font-medium" onClick={() => navigate('/teams')}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to teams
            </Button>
            {team && <h1 className="text-2xl font-bold">{team.name}</h1>}
          </div>

          {!team ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Team not found.</p>
              <Button onClick={() => navigate('/teams')} className="mt-4">Back to Teams</Button>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="members">Members ({memberUsers.length})</TabsTrigger>
                <TabsTrigger value="projects">Projects ({teamProjects.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <Card className="max-w-[400px]">
                  <CardHeader><CardTitle className="text-xl">Team Information</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                        <p className="mt-1">{team.description || "No description provided"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                        <p className="mt-1">{formatDate(team.createdAt)}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Team Lead</h3>
                        <div className="flex items-center mt-1">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback>
                              {team.createdBy ? users.find(u => u.id === team.createdBy)?.fullName?.split(' ').map(n => n[0]).join('') || 'TL' : 'TL'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{team.createdBy ? users.find(u => u.id === team.createdBy)?.fullName || 'Team Lead' : 'Team Lead'}</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Total Members</h3>
                        <p className="mt-1 text-lg font-semibold">{memberUsers.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="members">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl flex items-center">
                      <Users className="h-5 w-5 mr-2" /> Team Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {memberUsers.length === 0 ? (
                      <div className="text-center py-12 border rounded-lg bg-muted/20">
                        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-1">No team members yet</p>
                        <p className="text-sm text-muted-foreground">Start building your team by adding members</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                          <div className="flex items-center space-x-3">
                            <Users className="h-5 w-5 text-primary" />
                            <p className="text-lg font-semibold">{memberUsers.length} Member{memberUsers.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="border rounded-lg divide-y bg-background">
                          {memberUsers.map((member: User) => {
                            const tm = teamMembers.find(m => m.userId === member.id);
                            return (
                              <div key={member.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                                <div className="flex items-center space-x-4 min-w-0 flex-1">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={member.avatarUrl || undefined} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                      {member.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center space-x-2">
                                      <h3 className="font-medium truncate">{member.fullName}</h3>
                                      <Badge variant="secondary" className="text-xs">{tm?.role || 'MEMBER'}</Badge>
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                                      <Mail className="h-3 w-3 mr-1" />
                                      <span className="truncate">{member.email}</span>
                                    </div>
                                  </div>
                                </div>
                                {isAdminOrScrum && (
                                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleRemoveMember(member.id)}>
                                    Remove
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Add member section */}
                    {isAdminOrScrum && availableMembers.length > 0 && (
                      <div className="mt-6 border-t pt-6">
                        <h3 className="font-medium mb-3">Add Members</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {availableMembers.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">{user.fullName?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{user.fullName}</p>
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                              <Button size="sm" onClick={() => handleAddMember(user.id)}>Add</Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="projects">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl flex items-center">
                      <Calendar className="h-5 w-5 mr-2" /> Team Projects
                    </CardTitle>
                    <Badge variant="outline">{teamProjects.length} Project{teamProjects.length !== 1 ? 's' : ''}</Badge>
                  </CardHeader>
                  <CardContent>
                    {teamProjects.length === 0 ? (
                      <div className="text-center py-12 border rounded-lg bg-muted/20">
                        <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-1">No projects assigned</p>
                        <p className="text-sm text-muted-foreground">This team doesn't have any projects yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {teamProjects.map((project: Project) => (
                          <div key={project.id} className="border rounded-lg p-6 hover:bg-accent/50 transition-all">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div>
                                  <h3 className="font-semibold text-lg cursor-pointer hover:underline" onClick={() => navigate(`/projects/${project.id}`)}>
                                    {project.name}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">{project.key}</Badge>
                                    <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">{project.status}</Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project.id}`)}>View</Button>
                                {isAdminOrScrum && (
                                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => unassignTeamFromProject(project.id)}>Unassign</Button>
                                )}
                              </div>
                            </div>
                            {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {isAdminOrScrum && availableProjects.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center">
                        <Shield className="h-5 w-5 mr-2" /> Available Projects to Assign
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {availableProjects.map((project: Project) => (
                          <div key={project.id} className="border rounded-lg p-4 flex items-center justify-between hover:bg-accent/50">
                            <div>
                              <h3 className="font-semibold">{project.name}</h3>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{project.key}</Badge>
                                <Badge variant="secondary" className="text-xs">{project.status}</Badge>
                              </div>
                            </div>
                            <Button size="sm" onClick={() => assignTeamToProject(project.id)}>Assign to Team</Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
    </div>
  );
}
