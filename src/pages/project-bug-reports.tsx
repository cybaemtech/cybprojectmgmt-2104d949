import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseCustom as supabase } from "@/lib/supabase-custom";
import { Bug, Edit2, Trash2, Check, X, Camera, Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCachedUser } from "@/lib/supabase-store";

export default function ProjectBugReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = getCachedUser();

  // Feedback form state
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Screenshot upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Edit/delete state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editComment, setEditComment] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'resolved' | 'not-resolved'>('all');

  // Fetch all bug reports from Supabase
  const { data: allBugReports = [], isLoading: reportsLoading, refetch } = useQuery({
    queryKey: ['bug-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles for name mapping
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username');
      if (error) throw error;
      return data || [];
    },
  });

  // Helper to get user name by UUID
  const getUserName = (id: string) => {
    const profile = profiles.find((p: any) => p.id === id);
    return profile ? profile.full_name || profile.username : 'Unknown';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ variant: "destructive", title: "Invalid file", description: "Please select an image file." });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: "destructive", title: "File too large", description: "Max size is 5MB." });
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    const fileInput = document.getElementById('screenshot-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const isAdminOrScrum = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SCRUM_MASTER');

  const bugReports = allBugReports.filter((r: any) => {
    if (statusFilter === 'all') return true;
    return (r.resolution_status || 'not-resolved') === statusFilter;
  });

  const handleEditSave = async (id: number) => {
    try {
      const { error } = await supabase
        .from('bug_reports')
        .update({ comment: editComment, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      setEditingId(null);
      setEditComment("");
      toast({ title: "Updated", description: "Comment updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('bug_reports').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Report deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    }
    setDeletingId(null);
  };

  const handleToggleResolution = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'resolved' ? 'not-resolved' : 'resolved';
    try {
      const { error } = await supabase
        .from('bug_reports')
        .update({ resolution_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Status update failed", description: error.message });
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim() || !currentUser?.id) return;

    setSubmitting(true);
    setSubmitSuccess(false);

    try {
      let screenshotBase64 = null;
      if (selectedFile) {
        screenshotBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });
      }

      const { error } = await supabase.from('bug_reports').insert({
        comment: feedback,
        created_by: currentUser.id,
        resolution_status: 'not-resolved',
        screenshot_blob: screenshotBase64,
        screenshot_path: selectedFile ? selectedFile.name : null,
      });

      if (error) throw error;

      setSubmitSuccess(true);
      setFeedback("");
      removeSelectedFile();
      toast({ title: "Feedback Submitted", description: "Thank you for your report!" });
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });

      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({ variant: "destructive", title: "Submission failed", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center">
          <Bug className="h-6 w-6 mr-2 text-red-500" /> Submit Feedback | Report an Issue
        </h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-md border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">{allBugReports.length}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-md">
                <Bug className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-md border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Your Reports</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentUser ? allBugReports.filter((r: any) => r.created_by === currentUser.id).length : 0}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-md">
                <Bug className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-md border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved Reports</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allBugReports.filter((r: any) => r.resolution_status === 'resolved').length}
                </p>
                <p className="text-xs text-gray-500">All time</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-md">
                <Bug className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Feedback Form */}
        <div className="max-w-lg mb-8">
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div>
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                Describe the issue or feedback
              </label>
              <textarea
                id="feedback"
                className="border rounded px-3 py-2 w-full min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the issue or feedback..."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* Screenshot Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Screenshot (Optional)
              </label>

              {!selectedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    id="screenshot-input"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={submitting}
                  />
                  <label
                    htmlFor="screenshot-input"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Camera className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      Click to upload a screenshot
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PNG, JPG, GIF up to 5MB
                    </span>
                  </label>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <Image className="h-6 w-6 text-blue-500 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {previewUrl && (
                        <div className="mt-2">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-w-full h-auto max-h-32 rounded border"
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeSelectedFile}
                      disabled={submitting}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting || !feedback.trim()}
              className="w-full"
            >
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
            {submitSuccess && (
              <div className="text-green-600 text-sm font-medium">
                Feedback submitted successfully!
              </div>
            )}
          </form>
        </div>

        {/* Bug Reports Table */}
        <div className="w-full mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Submitted Bug Reports</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className="text-xs"
              >
                All ({allBugReports.length})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'resolved' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('resolved')}
                className={`text-xs ${statusFilter === 'resolved' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-600 text-green-600 hover:bg-green-50'
                  }`}
              >
                Resolved ({allBugReports.filter((r: any) => (r.resolution_status || 'not-resolved') === 'resolved').length})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'not-resolved' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('not-resolved')}
                className={`text-xs ${statusFilter === 'not-resolved' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-red-600 text-red-600 hover:bg-red-50'
                  }`}
              >
                Not Resolved ({allBugReports.filter((r: any) => (r.resolution_status || 'not-resolved') === 'not-resolved').length})
              </Button>
            </div>
          </div>

          {bugReports.length === 0 ? (
            reportsLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading reports...
              </div>
            ) : (
              <div className="text-neutral-500 p-4 text-center border rounded-md bg-white">
                No reports found.
              </div>
            )
          ) : (
            <div className="bg-white border rounded-md shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-100 border-b">
                      <th className="p-3 text-left font-medium w-16">ID</th>
                      <th className="p-3 text-left font-medium min-w-[300px]">Comment</th>
                      <th className="p-3 text-left font-medium w-32">Screenshot</th>
                      <th className="p-3 text-left font-medium w-32">Created By</th>
                      <th className="p-3 text-left font-medium w-32">Status</th>
                      <th className="p-3 text-left font-medium w-40">Created At</th>
                      <th className="p-3 text-right font-medium w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bugReports.map((r: any) => (
                      <tr key={r.id} className="border-b hover:bg-neutral-50">
                        <td className="p-3 font-mono text-gray-600">#{r.id}</td>
                        <td className="p-3">
                          {editingId === r.id ? (
                            <textarea
                              className="border rounded px-2 py-1 w-full min-h-[60px] resize-none"
                              value={editComment}
                              onChange={e => setEditComment(e.target.value)}
                              placeholder="Edit bug report comment..."
                            />
                          ) : (
                            <div className="whitespace-pre-wrap break-words">
                              {r.comment}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          {r.screenshot_blob ? (
                            <div className="flex items-center">
                              <img
                                src={r.screenshot_blob}
                                alt="Bug screenshot"
                                className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-75"
                                onClick={() => {
                                  const win = window.open();
                                  win?.document.write(`<img src="${r.screenshot_blob}" style="max-width: 100%;">`);
                                }}
                                title="Click to view full size"
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No screenshot</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs mr-2 uppercase">
                              {getUserName(r.created_by).substring(0, 1)}
                            </div>
                            <span className="text-sm font-medium">
                              {getUserName(r.created_by)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${r.resolution_status === 'resolved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {r.resolution_status === 'resolved' ? 'Resolved' : 'Not Resolved'}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">
                          <div className="text-xs">
                            <div>{new Date(r.created_at).toLocaleDateString()}</div>
                            <div className="text-gray-500">{new Date(r.created_at).toLocaleTimeString()}</div>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          {/* Show actions for the creator of the bug report OR admin/scrum master */}
                          {(() => {
                            const canEdit = currentUser && (r.created_by === currentUser.id || isAdminOrScrum);
                            return canEdit;
                          })() ? (
                            editingId === r.id ? (
                              <div className="flex gap-1 justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => handleEditSave(r.id)}
                                  className="h-8 w-8 p-0"
                                  title="Save"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingId(null)}
                                  className="h-8 w-8 p-0"
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-1 justify-end">
                                <Button
                                  size="sm"
                                  variant={r.resolution_status === 'resolved' ? 'default' : 'outline'}
                                  onClick={() => handleToggleResolution(r.id, r.resolution_status || 'not-resolved')}
                                  className={`h-8 w-8 p-0 ${r.resolution_status === 'resolved'
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'border-green-600 text-green-600 hover:bg-green-50'
                                    }`}
                                  title={r.resolution_status === 'resolved' ? 'Mark as Unresolved' : 'Mark as Resolved'}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setEditingId(r.id); setEditComment(r.comment); }}
                                  className="h-8 w-8 p-0"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(r.id)}
                                  disabled={deletingId === r.id}
                                  className="h-8 w-8 p-0"
                                  title="Delete"
                                >
                                  {deletingId === r.id ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            )
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}