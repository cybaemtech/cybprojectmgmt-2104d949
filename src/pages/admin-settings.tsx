import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Database, Loader2, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getLocalUser } from "@/lib/local-store";
import { seedDatabase, resetDatabase } from "@/lib/seed-data";
import { useNavigate } from "react-router-dom";

export default function AdminSettings() {
  const { user: authUser } = useAuth();
  const currentUser = authUser || getLocalUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSeedDialog, setShowSeedDialog] = useState(false);

  // Guard: only admins
  if (currentUser?.role !== "ADMIN") {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground text-sm">Only administrators can access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSeed = async () => {
    setShowSeedDialog(false);
    setSeeding(true);
    try {
      const result = await seedDatabase();
      toast({
        title: "Data Seeded Successfully",
        description: `Created ${result.teams} teams, ${result.projects} projects, and ${result.workItems} work items.`,
      });
    } catch (err: any) {
      toast({ title: "Seed Failed", description: err.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    setShowResetDialog(false);
    setResetting(true);
    try {
      await resetDatabase();
      toast({
        title: "Data Reset Successfully",
        description: "All teams, projects, and work items have been deleted.",
      });
    } catch (err: any) {
      toast({ title: "Reset Failed", description: err.message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
          <Badge variant="destructive" className="text-xs">ADMIN ONLY</Badge>
        </div>
        <p className="text-muted-foreground">Manage database seed data and system configuration</p>
      </div>

      {/* Data Management Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Data Management</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seed Data Card */}
          <Card className="border-2 hover:border-primary/30 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Seed Test Data</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Populate the database with sample data
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>This will create:</p>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  <li>10 teams with descriptions</li>
                  <li>25 projects (client & in-house)</li>
                  <li>~500 work items (Epics, Features, Stories, Tasks, Bugs)</li>
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  Will fail if database already has sufficient data. Reset data first to re-seed.
                </p>
              </div>
              <Button
                className="w-full"
                disabled={seeding || resetting}
                onClick={() => setShowSeedDialog(true)}
              >
                {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                {seeding ? "Seeding..." : "Seed Test Data"}
              </Button>
            </CardContent>
          </Card>

          {/* Reset Data Card */}
          <Card className="border-2 hover:border-destructive/30 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-base">Reset All Data</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Delete all teams, projects, and work items
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>This will permanently delete:</p>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  <li>All work items and their history</li>
                  <li>All projects and project members</li>
                  <li>All teams and team members</li>
                  <li>All comments and attachments</li>
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-800">
                  This action is irreversible. All data will be permanently lost.
                </p>
              </div>
              <Button
                variant="destructive"
                className="w-full"
                disabled={seeding || resetting}
                onClick={() => setShowResetDialog(true)}
              >
                {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {resetting ? "Resetting..." : "Reset All Data"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Seed Confirmation Dialog */}
      <AlertDialog open={showSeedDialog} onOpenChange={setShowSeedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Seed Test Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will populate the database with 10 teams, 25 projects, and approximately 500 work items.
              If the database already has data, seeding will fail — reset data first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSeed}>Proceed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Reset All Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL teams, projects, work items, comments, attachments,
              and activity logs from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
