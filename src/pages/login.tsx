import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Shield, Lock, AtSign, Play, Eye, EyeOff, User, ArrowLeft } from "lucide-react";
import { login, signup } from "@/hooks/useAuth";
import { useDemoMode } from "@/hooks/useDemoMode";
import { refreshStore } from "@/lib/local-store";
import { ForgotPasswordModal } from "@/components/modals/forgot-password-modal";
import cybaemLogo from "@/assets/cybaem-logo-full.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password should be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password should be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { enableDemoMode } = useDemoMode();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "confirm">("login");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const onLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    const result = await login(data.email, data.password);
    if (result.success) {
      toast({ title: "Login successful", description: "Welcome back!" });
      setTimeout(() => navigate("/dashboard"), 300);
    } else {
      toast({ variant: "destructive", title: "Login failed", description: result.error });
    }
    setIsLoading(false);
  };

  const onSignup = async (data: SignupFormValues) => {
    setIsLoading(true);
    const result = await signup(data.email, data.password, data.fullName);
    if (result.success) {
      setConfirmEmail(data.email);
      setMode("confirm");
      toast({ title: "Account created!", description: "Please check your email to confirm your account." });
    } else {
      toast({ variant: "destructive", title: "Sign up failed", description: result.error });
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
          Project Management
        </h1>
        <p className="text-[hsl(210,20%,70%)] text-center max-w-sm relative z-10 leading-relaxed">
          Plan smarter, align teams faster, and deliver projects with complete visibility — all from one intelligent workspace!
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

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex justify-center mb-6">
            <img src={cybaemLogo} alt="Cybaem Tech" className="h-10" />
          </div>

          {/* ─── EMAIL CONFIRMATION VIEW ─── */}
          {mode === "confirm" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <AtSign className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  We've sent a confirmation link to <span className="font-medium text-foreground">{confirmEmail}</span>.
                  Please click the link in your email to activate your account.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
                <p>Didn't receive the email? Check your spam folder or try signing up again.</p>
              </div>
              <Button variant="outline" className="w-full h-11 gap-2" onClick={() => { setMode("login"); }}>
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Button>
            </div>
          )}

          {/* ─── LOGIN VIEW ─── */}
          {mode === "login" && (
            <>
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
                <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-full py-2 px-4 mx-auto w-fit">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>Secure authentication</span>
              </div>

              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                  <FormField control={loginForm.control} name="email" render={({ field }) => (
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
                  )} />

                  <FormField control={loginForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-foreground">Password</FormLabel>
                        <button type="button" className="text-xs text-primary hover:underline" onClick={() => setForgotPasswordOpen(true)}>
                          Forgot password?
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="pl-10 pr-10 h-11 bg-background border-input" />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

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

              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button type="button" className="text-primary hover:underline font-medium" onClick={() => setMode("signup")}>
                  Sign up
                </button>
              </div>

              {/* Demo mode */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button variant="outline" className="w-full h-11 gap-2" onClick={async () => { enableDemoMode(); await refreshStore(); navigate("/dashboard"); }}>
                <Play className="h-4 w-4" /> Explore Demo
              </Button>
            </>
          )}

          {/* ─── SIGN UP VIEW ─── */}
          {mode === "signup" && (
            <>
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h2>
                <p className="text-sm text-muted-foreground">Sign up to get started with your team</p>
              </div>

              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-5">
                  <FormField control={signupForm.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Full name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="John Doe" {...field} className="pl-10 h-11 bg-background border-input" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={signupForm.control} name="email" render={({ field }) => (
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
                  )} />

                  <FormField control={signupForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="pl-10 pr-10 h-11 bg-background border-input" />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Confirm password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} className="pl-10 pr-10 h-11 bg-background border-input" />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}>
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating account…
                      </span>
                    ) : "Sign up"}
                  </Button>
                </form>
              </Form>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button type="button" className="text-primary hover:underline font-medium" onClick={() => setMode("login")}>
                  Sign in
                </button>
              </div>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground pt-4">
            © {new Date().getFullYear()} Cybaem Tech. All rights reserved.
          </p>
        </div>
      </div>

      <ForgotPasswordModal isOpen={forgotPasswordOpen} onClose={() => setForgotPasswordOpen(false)} />
    </div>
  );
}
