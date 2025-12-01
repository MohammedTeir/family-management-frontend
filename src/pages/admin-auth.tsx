import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield } from "lucide-react";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { AuthSkeleton } from "@/components/ui/auth-skeleton";

const adminLoginSchema = z.object({
  loginType: z.enum(["admin", "root"]),
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

export default function AdminAuthPage() {
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();
  const [loginType, setLoginType] = useState<"admin" | "root">("admin");
  const { settings, isLoading: settingsLoading } = useSettingsContext();

  const loginForm = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      loginType: "admin",
      username: "",
      password: "",
    },
  });

  const onLogin = (data: AdminLoginFormData) => {
    loginMutation.mutate(
      {
        username: data.username,
        password: data.password,
      },
      {
        onSuccess: (user: any) => {
          toast({
            title: `مرحباً ${user.username}`,
            description: "تم تسجيل الدخول بنجاح!",
          });
        },
        // Error handling is already done in the useAuth hook
      }
    );
  };

  // Redirect if already logged in and user is not an admin/root
  if (user) {
    if (user.role === "head") {
      // If a head is already logged in, redirect them to their dashboard
      return <Redirect to="/dashboard" />;
    } else {
      // If an admin/root is already logged in, redirect them to admin panel
      return <Redirect to="/admin" />;
    }
  }

  // Show skeleton while settings are loading
  if (settingsLoading) {
    return <AuthSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Hero Section */}
        <div className="flex lg:hidden flex-col justify-center items-center text-center p-4 sm:p-6 mb-4">
          <div className="mb-6">
            <div className="mb-4 mx-auto flex items-center justify-center">
              {settings.authPageIcon ? (
                <img src={settings.authPageIcon} alt="Logo" className="h-24 w-24 sm:h-32 sm:w-32 object-contain" />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-full flex items-center justify-center">
                  <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 sm:mb-4">
              {settings.authPageTitle || "نظام إدارة البيانات العائلية - المشرفين"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              لوحة تحكم المشرفين
            </p>
          </div>
        </div>

        {/* Desktop Hero Section */}
        <div className="hidden lg:flex flex-col justify-center items-center text-center p-8">
          <div className="mb-8">
            <div className="mb-6 mx-auto flex items-center justify-center">
              {settings.authPageIcon ? (
                <img src={settings.authPageIcon} alt="Logo" className="h-20 w-20 lg:h-24 lg:w-24 object-contain" />
              ) : (
                <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center">
                  <Shield className="h-12 w-12 text-white" />
                </div>
              )}
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              {settings.authPageTitle || "نظام إدارة البيانات العائلية - المشرفين"}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {settings.authPageSubtitle || "نظام شامل لإدارة بيانات الأسر وتقديم الطلبات والخدمات"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 max-w-md">
            <div className="flex items-center p-4 bg-card border rounded-lg shadow-sm">
              <Shield className="h-8 w-8 text-primary ml-4 flex-shrink-0" />
              <div className="text-right">
                <h3 className="font-semibold text-card-foreground">إدارة المستخدمين</h3>
                <p className="text-sm text-muted-foreground">إنشاء وتعديل حسابات المستخدمين</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-card border rounded-lg shadow-sm">
              <Shield className="h-8 w-8 text-secondary ml-4 flex-shrink-0" />
              <div className="text-right">
                <h3 className="font-semibold text-card-foreground">نظام الإشعارات</h3>
                <p className="text-sm text-muted-foreground">إرسال ومشاهدة الإشعارات</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-card border rounded-lg shadow-sm">
              <Shield className="h-8 w-8 text-accent ml-4 flex-shrink-0" />
              <div className="text-right">
                <h3 className="font-semibold text-card-foreground">إدارة الطلبات</h3>
                <p className="text-sm text-muted-foreground">مراجعة واعتماد طلبات المساعدة</p>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl font-bold">تسجيل دخول المشرف</CardTitle>
              <CardDescription className="text-sm sm:text-base">يرجى إدخال بيانات الحساب</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4 sm:space-y-5">
                <div>
                  <Label htmlFor="loginType" className="text-sm sm:text-base font-medium">نوع الحساب</Label>
                  <Select
                    value={loginType}
                    onValueChange={(value: "admin" | "root") => {
                      setLoginType(value);
                      loginForm.setValue("loginType", value);
                    }}
                  >
                    <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin" className="text-sm sm:text-base">مشرف</SelectItem>
                      <SelectItem value="root" className="text-sm sm:text-base">مشرف رئيسي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="username" className="text-sm sm:text-base font-medium">اسم المستخدم</Label>
                  <Input
                    id="username"
                    placeholder="admin أو username"
                    {...loginForm.register("username")}
                    className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                  />
                  {loginForm.formState.errors.username && (
                    <p className="text-xs sm:text-sm text-destructive mt-1">
                      {loginForm.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm sm:text-base font-medium">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...loginForm.register("password")}
                    className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-xs sm:text-sm text-destructive mt-1">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 sm:h-11 text-sm sm:text-base mt-2"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}