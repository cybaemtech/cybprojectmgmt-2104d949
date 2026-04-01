import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Team } from "@/types/schema";
import { UserPlus, UserMinus, Users, Trash2 } from "lucide-react";
import { teamStore, teamMemberStore, userStore, getLocalUser } from "@/lib/local-store";

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  onMembersChange?: () => void;
  onTeamDeleted?: () => void;
}

export function TeamMembersModal({ isOpen, onClose, team, onMembersChange, onTeamDeleted }: TeamMembersModalProps) {
  const { toast } = useToast();
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("MEMBER");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const userInputRef = useRef<HTMLInputElement | null>(null);

  const currentUser = getLocalUser();
  const isAdmin = currentUser?.role === 'ADMIN';
  const isScrumMasterOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER';

  const allUsers = userStore.all();
  const teamMembers = teamMemberStore.byTeam(team.id);
  const memberUsers = teamMemberStore.usersForTeam(team.id);

  const memberUserIds = new Set(teamMembers.map(m => m.userId));
  const availableUsers = allUsers.filter(u => !memberUserIds.has(u.id));
  const filteredUsers = availableUsers.filter(u => {
    const q = userSearch.toLowerCase();
    return u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
  }).slice(0, 10);

  useEffect(() => { setHighlightedIndex(0); }, [userSearch, showUserDropdown, filteredUsers.length]);

  const handleAddMember = () => {
    if (!selectedUserId) {
      toast({ title: "Error", description: "Please select a user to add.", variant: "destructive" });
      return;
    }
    teamMemberStore.add(team.id, parseInt(selectedUserId), selectedRole);
    setSelectedUserId("");
    setUserSearch("");
    setSelectedRole("MEMBER");
    setRefreshKey(k => k + 1);
    onMembersChange?.();
    toast({ title: "Member added", description: "Team member has been added successfully." });
  };

  const handleRemoveMember = (userId: number) => {
    teamMemberStore.remove(team.id, userId);
    setRefreshKey(k => k + 1);
    onMembersChange?.();
    toast({ title: "Member removed", description: "Team member has been removed successfully." });
  };

  const handleDeleteTeam = () => {
    teamStore.delete(team.id);
    setShowDeleteDialog(false);
    onTeamDeleted?.();
    onClose();
    toast({ title: "Team deleted", description: `Team "${team.name}" has been deleted successfully.` });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Manage Team Members - {team.name}
          </DialogTitle>
          {isScrumMasterOrAdmin && (
            <div className="flex justify-end pt-2">
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete Team
              </Button>
            </div>
          )}
        </DialogHeader>

        <div className="overflow-y-auto space-y-6 pr-2 max-h-[calc(90vh-120px)]">
          {/* Add member section */}
          {isScrumMasterOrAdmin && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <h3 className="font-medium text-base">Add New Member</h3>
              </div>
              <div className="flex flex-col space-y-3">
                <div className="relative z-10">
                  <label className="block text-sm font-medium mb-1">Search Members</label>
                  <input
                    ref={userInputRef}
                    type="text"
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={availableUsers.length === 0 ? "No available users" : "Search user by name or email..."}
                    value={userSearch}
                    onChange={e => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                    onFocus={() => setShowUserDropdown(true)}
                    onBlur={() => setTimeout(() => setShowUserDropdown(false), 150)}
                    onKeyDown={e => {
                      if (!showUserDropdown || filteredUsers.length === 0) return;
                      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, filteredUsers.length - 1)); }
                      else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, 0)); }
                      else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (filteredUsers[highlightedIndex]) {
                          setSelectedUserId(filteredUsers[highlightedIndex].id.toString());
                          setUserSearch(filteredUsers[highlightedIndex].fullName);
                          setShowUserDropdown(false);
                        }
                      }
                    }}
                    disabled={availableUsers.length === 0}
                  />
                  {showUserDropdown && filteredUsers.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-background border rounded-md shadow-xl z-[10000] max-h-60 overflow-y-auto">
                      {filteredUsers.map((user, idx) => (
                        <button
                          key={user.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${highlightedIndex === idx ? 'bg-accent' : ''}`}
                          onMouseDown={() => {
                            setSelectedUserId(user.id.toString());
                            setUserSearch(user.fullName);
                            setShowUserDropdown(false);
                          }}
                        >
                          {user.fullName} <span className="text-muted-foreground">({user.email})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium">Role</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleAddMember} disabled={!selectedUserId} className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" /> Add Member
                </Button>
              </div>
            </div>
          )}

          {/* Current members */}
          <div>
            <h3 className="font-medium mb-3 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Current Members ({memberUsers.length})
            </h3>
            <div className="space-y-2">
              {memberUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No members in this team yet.</p>
              ) : (
                memberUsers.map(user => {
                  const tm = teamMembers.find(m => m.userId === user.id);
                  return (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{tm?.role || 'MEMBER'}</Badge>
                        {isScrumMasterOrAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(user.id)} title="Remove member">
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{team.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
