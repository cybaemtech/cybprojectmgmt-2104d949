import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { supabaseCustom } from "@/lib/supabase-custom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Team } from "@/types/schema";
import { useToast } from "@/hooks/use-toast";
import { validateCorporateEmails } from "@/lib/email-validation";

// Define the form schema with validation
const inviteFormSchema = z.object({
  teamId: z.string(),
  emails: z.string().min(1, "Email addresses are required"),
  role: z.string(),
  newTeamName: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  onCreateTeam: (name: string) => Promise<Team>;
}

export function InviteModal({ 
  isOpen, 
  onClose, 
  teams,
  onCreateTeam 
}: InviteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Set up the form
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      teamId: teams.length > 0 ? teams[0].id.toString() : "new",
      emails: "",
      role: "MEMBER",
      newTeamName: "",
    },
  });
  
  const selectedTeamId = form.watch("teamId");
  const isNewTeam = selectedTeamId === "new";

  // Mutation for inviting users
  const inviteMutation = useMutation({
    mutationFn: async (inviteData: { emails: string[], teamId: string, role: string }) => {
      const results = [];
      console.log("Sending invites with data:", inviteData);
      
      for (const email of inviteData.emails) {
        try {
          const trimmedEmail = email.trim().toLowerCase();
          console.log(`Inviting ${trimmedEmail} with role ${inviteData.role} to team ${inviteData.teamId}`);
          
          // Check if user already exists in profiles
          const { data: existingProfile } = await supabaseCustom
            .from("profiles")
            .select("id")
            .eq("email", trimmedEmail)
            .maybeSingle();
          
          if (!existingProfile) {
            results.push({ 
              success: false, 
              email: trimmedEmail, 
              error: `No account found for ${trimmedEmail}. User must sign up first.` 
            });
            continue;
          }
          
          // Check if already a team member
          const { data: existingMember } = await supabaseCustom
            .from("team_members")
            .select("id")
            .eq("team_id", parseInt(inviteData.teamId))
            .eq("user_id", existingProfile.id)
            .maybeSingle();
          
          if (existingMember) {
            results.push({ 
              success: false, 
              email: trimmedEmail, 
              error: `${trimmedEmail} is already a member of this team.` 
            });
            continue;
          }
          
          // Add user to the team
          const { error: insertError } = await supabaseCustom
            .from("team_members")
            .insert({
              team_id: parseInt(inviteData.teamId),
              user_id: existingProfile.id,
              role: inviteData.role as any,
            });
          
          if (insertError) throw insertError;
          
          results.push({ 
            success: true, 
            email: trimmedEmail, 
          });
        } catch (error) {
          console.error(`Invite error for ${email}:`, error);
          results.push({ 
            success: false, 
            email, 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      console.log("Final invite results:", results);
      return results;
    },
    onSuccess: async (results) => {
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/users'] });
      queryClient.invalidateQueries({ queryKey: ['/teams'] });

      // Send invitation emails for successful invites
      const selectedTeam = teams.find(t => t.id.toString() === form.getValues("teamId"));
      const role = form.getValues("role");
      const roleLabels: Record<string, string> = {
        MEMBER: "Team Member",
        LEAD: "Team Lead",
        MANAGER: "Project Manager",
        ADMIN: "Administrator",
      };
      const loginUrl = `${window.location.origin}/login`;

      for (const result of successful) {
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              templateName: "invitation",
              recipientEmail: result.email,
              templateData: {
                teamName: selectedTeam?.name || "the team",
                role: roleLabels[role] || role,
                loginUrl,
              },
            },
          });
          console.log(`Invitation email sent to ${result.email}`);
        } catch (emailErr) {
          console.error(`Failed to send invitation email to ${result.email}:`, emailErr);
        }
      }
      
      if (successful.length > 0) {
        const emails = successful.map(r => r.email).join(', ');
        toast({
          title: "Invitations sent successfully",
          description: `${successful.length} invitation${successful.length > 1 ? "s" : ""} sent to: ${emails}`,
        });
      }
      
      if (failed.length > 0) {
        console.error("Failed invitations:", failed);
        toast({
          title: `${failed.length} invitation${failed.length > 1 ? "s" : ""} failed`,
          description: failed.length === 1 ? 
            `${failed[0].email}: ${failed[0].error}` :
            `Multiple invitations failed. Check console for details.`,
          variant: "destructive",
        });
      }
      
      // Close modal if at least one invitation was successful or if all processed
      if (successful.length > 0 || results.length > 0) {
        onClose();
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not send invitations. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const onSubmit = async (data: InviteFormValues) => {
    try {
      // Validate email addresses
      const emails = data.emails.split(/[\s,]+/).filter(email => email.trim());
      const { valid, invalid } = validateCorporateEmails(emails);
      
      if (invalid.length > 0) {
        toast({
          title: "Invalid emails",
          description: `The following emails are not corporate addresses: ${invalid.join(", ")}`,
          variant: "destructive",
        });
        return;
      }
      
      if (valid.length === 0) {
        toast({
          title: "No valid emails",
          description: "Please enter at least one valid corporate email address.",
          variant: "destructive",
        });
        return;
      }
      
      // Handle new team creation if needed
      let teamId = data.teamId;
      if (isNewTeam) {
        if (!data.newTeamName || data.newTeamName.trim() === "") {
          toast({
            title: "Team name required",
            description: "Please enter a name for the new team.",
            variant: "destructive",
          });
          return;
        }
        
        const newTeam = await onCreateTeam(data.newTeamName);
        teamId = newTeam.id.toString();
      }
      
      // Trigger the invitation mutation
      inviteMutation.mutate({
        emails: valid,
        teamId: teamId,
        role: data.role
      });
      
    } catch (error) {
      console.error("Error sending invitations:", error);
      toast({
        title: "Error",
        description: "Could not send invitations. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Invite Team Members</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="new">Create New Team...</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {isNewTeam && (
              <FormField
                control={form.control}
                name="newTeamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Team Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter team name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="emails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Addresses</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Enter email addresses separated by commas"
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Only corporate email domains are allowed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MEMBER">
                        <div className="flex flex-col">
                          <span>Team Member</span>
                          <span className="text-xs text-muted-foreground font-normal">Can view and create Stories, Tasks & Bugs</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="LEAD">
                        <div className="flex flex-col">
                          <span>Team Lead</span>
                          <span className="text-xs text-muted-foreground font-normal">Full access to project features & team oversight</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="MANAGER">
                        <div className="flex flex-col">
                          <span>Project Manager</span>
                          <span className="text-xs text-muted-foreground font-normal">Manages projects, timelines & team assignments</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ADMIN">
                        <div className="flex flex-col">
                          <span>Administrator</span>
                          <span className="text-xs text-muted-foreground font-normal">Full system access including settings & user management</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button variant="outline" type="button" onClick={onClose} disabled={inviteMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? "Sending..." : "Send Invitations"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
