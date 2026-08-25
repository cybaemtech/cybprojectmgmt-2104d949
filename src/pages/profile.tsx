import { useAuth } from "@/hooks/useAuth";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Shield, Calendar, UserCheck, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <div className="container max-w-4xl py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Left Col - Avatar & Basic Info */}
                <Card className="w-full md:w-80 overflow-hidden border-none shadow-lg bg-gradient-to-br from-background to-muted/30">
                    <div className="h-32 bg-primary/10 relative">
                        <div className="absolute inset-0 bg-grid-white/10" />
                    </div>
                    <CardContent className="pt-0 relative flex flex-col items-center">
                        <div className="-mt-16 p-1 bg-background rounded-full shadow-xl">
                            <Avatar className="h-32 w-32 border-4 border-background">
                                <AvatarImage src={user.avatarUrl || ""} />
                                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                                    {user.fullName?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        <div className="mt-4 text-center">
                            <h2 className="text-xl font-bold text-foreground">{user.fullName}</h2>
                            <p className="text-sm text-muted-foreground italic">@{user.username}</p>

                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <Badge variant={user.role === 'ADMIN' ? "destructive" : "secondary"} className="uppercase font-semibold tracking-wider px-3">
                                    <Shield className="h-3 w-3 mr-1" />
                                    {user.role}
                                </Badge>
                                {user.isActive && (
                                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                                        <UserCheck className="h-3 w-3 mr-1" />
                                        Active
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="w-full mt-8 space-y-4 text-sm">
                            <div className="flex items-center text-muted-foreground gap-3">
                                <Mail className="h-4 w-4" />
                                <span className="truncate">{user.email}</span>
                            </div>
                            <div className="flex items-center text-muted-foreground gap-3">
                                <Calendar className="h-4 w-4" />
                                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <Button className="w-full mt-8 gap-2 group transition-all duration-300">
                            <Edit3 className="h-4 w-4 transition-transform group-hover:scale-110" />
                            Edit Profile
                        </Button>
                    </CardContent>
                </Card>

                {/* Right Col - Details & Settings */}
                <div className="flex-1 space-y-6">
                    <Card className="border-border/50 shadow-md">
                        <CardHeader>
                            <CardTitle>Account Statistics</CardTitle>
                            <CardDescription>Overview of your activity in the system</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                {[
                                    { label: "Tasks Completed", value: "12" },
                                    { label: "Active Projects", value: "3" },
                                    { label: "Team Count", value: "1" },
                                ].map((stat) => (
                                    <div key={stat.label} className="space-y-1">
                                        <p className="text-muted-foreground text-xs uppercase tracking-tight">{stat.label}</p>
                                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-md">
                        <CardHeader>
                            <CardTitle>Preferences</CardTitle>
                            <CardDescription>Customize your workspace experience</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between py-2 border-b border-border/50">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium">Email Notifications</p>
                                    <p className="text-xs text-muted-foreground">Receive updates about project changes</p>
                                </div>
                                <Badge variant="outline">Enabled</Badge>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-border/50">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium">Theme Preference</p>
                                    <p className="text-xs text-muted-foreground">System default</p>
                                </div>
                                <Badge variant="outline">Auto</Badge>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium">Security</p>
                                    <p className="text-xs text-muted-foreground">Two-factor authentication status</p>
                                </div>
                                <Badge variant="outline" className="text-amber-500 border-amber-500/30">Not Set</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
