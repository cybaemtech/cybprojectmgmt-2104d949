import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Shield, Lock, AtSign, Play } from "lucide-react";
import { login } from "@/hooks/useAuth";
import { useDemoMode } from "@/hooks/useDemoMode";
import cybaemLogo from "@/assets/cybaem-logo-full.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password should be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { enableDemoMode } = useDemoMode();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    const result = await login(data.email, data.password);
    if (result.success) {
      toast({ title: "Login successful", description: "Welcome back!" });
      // Small delay to let onAuthStateChange update the user before navigating
      setTimeout(() => navigate("/dashboard"), 300);
    } else {
      toast({ variant: "destructive", title: "Login failed", description: result.error });
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[hsl(205,70%,15%)] relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute top-[-120px] left-[-120px] w-[400px] h-[400px] rounded-full border border-white/5" />
        <div className="absolute bottom-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full border border-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(207,90%,54%,0.06)]" />

        <img src={cybaemLogo} alt="Cybaem Tech" className="w-72 mb-10 relative z-10" />
        <h1 className="text-3xl font-bold text-white mb-4 relative z-10 text-center">
          Agile Project Management
        </h1>
        <p className="text-[hsl(210,20%,70%)] text-center max-w-sm relative z-10 leading-relaxed">
          Plan sprints, track progress, and deliver projects on time with your team.
        </p>

        <div className="mt-16 grid grid-cols-3 gap-8 relative z-10">
          {[
            { label: "Projects", value: "100+" },
            { label: "Teams", value: "50+" },
            { label: "Uptime", value: "99.9%" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-[hsl(210,20%,60%)] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex justify-center mb-6">
            <img src={cybaemLogo} alt="Cybaem Tech" className="h-10" />
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-full py-2 px-4 mx-auto w-fit">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>Offline mode — no backend required</span>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Email address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="you@company.com" {...field} className="pl-10 h-11 bg-background border-input" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="password" placeholder="••••••••" {...field} className="pl-10 h-11 bg-background border-input" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in…
                  </span>
                ) : "Sign in"}
              </Button>
            </form>
          </Form>

          {/* Demo mode */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-11 gap-2"
            onClick={() => { enableDemoMode(); navigate("/dashboard"); }}
          >
            <Play className="h-4 w-4" />
            Explore Demo
          </Button>

          {/* Credentials hint */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm mb-2">Test credentials:</p>
            <p><span className="font-mono">admin@cybaemtech.com</span> / <span className="font-mono">admin123</span></p>
            <p><span className="font-mono">demo@cybaemtech.com</span> / <span className="font-mono">demo123</span></p>
            <p><span className="font-mono">user@cybaemtech.com</span> / <span className="font-mono">user123</span></p>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-4">
            © {new Date().getFullYear()} Cybaem Tech. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
