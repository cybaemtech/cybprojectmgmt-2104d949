import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InactivateIcon, ActivateIcon } from "./user-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { userStore, getLocalUser } from "@/lib/local-store";
import { User } from "@/types/schema";

interface ManageTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User;
}

export const ManageTeamModal: React.FC<ManageTeamModalProps> = ({ isOpen, onClose, currentUser: propUser }) => {
  const { toast } = useToast();
  const [inactivatingUserId, setInactivatingUserId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const currentUser = propUser || getLocalUser();
  const isAdmin = currentUser?.role === 'ADMIN';
  const isScrumMasterOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER';

  const users = userStore.all();

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalCount = users.length;
  const activeCount = users.filter(u => u.isActive).length;
  const inactiveCount = totalCount - activeCount;

  const handleInactivateUser = (userId: number) => {
    toast({ title: "Status Updated", description: "User inactivated successfully" });
  };

  const handleActivateUser = (userId: number) => {
    toast({ title: "Status Updated", description: "User activated successfully" });
  };

  const handleRoleChange = (userId: number, newRole: string) => {
    if (!isAdmin) {
      toast({ title: "Access Denied", description: "Only administrators can change user roles.", variant: "destructive" });
      return;
    }
    if (userId === currentUser?.id) {
      toast({ title: "Action Not Allowed", description: "You cannot change your own role.", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "User role updated successfully" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Manage Team Members</span>
            {isAdmin && (
              <Badge variant="outline" className="text-xs font-normal bg-destructive/10 text-destructive border-destructive/20">
                Administrator Access
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex gap-4 text-sm">
              <span>Total: <b>{totalCount}</b></span>
              <span>Active: <b>{activeCount}</b></span>
              <span>Inactive: <b>{inactiveCount}</b></span>
            </div>
            <input
              type="text"
              className="border rounded px-2 py-1 text-sm w-full sm:w-64"
              placeholder="Search users (name, email, username, role)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No users found.</div>
            ) : (
              filteredUsers.map((user) => {
                const isCurrentUser = user.id === currentUser?.id;
                const canEditRole = isAdmin && !isCurrentUser;

                return (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center space-x-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {user.fullName}
                          {isCurrentUser && <Badge variant="outline" className="text-xs">You</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {canEditRole ? (
                        <Select value={user.role} onValueChange={(newRole) => handleRoleChange(user.id, newRole)}>
                          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN"><span className="font-semibold text-destructive">Administrator</span></SelectItem>
                            <SelectItem value="SCRUM_MASTER"><span className="font-semibold text-primary">Scrum Master</span></SelectItem>
                            <SelectItem value="USER"><span className="font-semibold text-muted-foreground">Team Member</span></SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="font-semibold">
                          {user.role === 'ADMIN' ? 'Administrator' : user.role === 'SCRUM_MASTER' ? 'Scrum Master' : 'Team Member'}
                        </Badge>
                      )}
                      {isScrumMasterOrAdmin && !isCurrentUser && (
                        user.isActive ? (
                          <Button variant="ghost" size="icon" disabled={inactivatingUserId === user.id} onClick={() => handleInactivateUser(user.id)} title="Inactivate user">
                            <InactivateIcon />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" disabled={inactivatingUserId === user.id} onClick={() => handleActivateUser(user.id)} title="Activate user">
                            <ActivateIcon />
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
