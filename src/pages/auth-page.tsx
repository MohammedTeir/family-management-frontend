import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, UserCheck } from "lucide-react";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { AuthSkeleton } from "@/components/ui/auth-skeleton";

const headLoginSchema = z.object({
  headID: z.string().regex(/^\d{9}$/, "رقم الهوية يجب أن يكون 9 أرقام"),
});

type HeadLoginFormData = z.infer<typeof headLoginSchema>;

export default function HeadAuthPage() {
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();
  const { settings, isLoading: settingsLoading } = useSettingsContext();
  const [pendingWelcome, setPendingWelcome] = useState<null | { username: string; role: string }>(null);

  const loginForm = useForm<HeadLoginFormData>({
    resolver: zodResolver(headLoginSchema),
    defaultValues: {
      headID: "",
    },
  });

  // Custom login handling for heads (no password required)
  const onLogin = (data: HeadLoginFormData) => {
    loginMutation.mutate(
      {
        username: data.headID,
        password: "", // Empty password for heads
      },
      {
        onSuccess: (user: any) => {
          // Show welcome toast with full name if available
          setPendingWelcome({ username: user.username, role: user.role });
          // For head, wait for family info
          // (toast will be shown in useEffect below)
        },
        // Error handling is already done in the useAuth hook, no need to duplicate
      }
    );
  };

  // Fetch family info for heads after login to get full name
  const { data: family } = useQuery({
    queryKey: ["/api/family"],
    enabled: !!pendingWelcome && pendingWelcome.role === "head",
  });

  // Show welcome toast for head after family info is loaded
  useEffect(() => {
    if (pendingWelcome && pendingWelcome.role === "head" && family) {
      toast({
        title: `مرحباً ${family.husbandName || pendingWelcome.username}`,
        description: "تم تسجيل الدخول بنجاح!",
      });
      setPendingWelcome(null);
    }
  }, [pendingWelcome, family, toast]);

  // Redirect if already logged in and user is not a head
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
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 sm:mb-4">
              {settings.authPageTitle || "نظام إدارة البيانات العائلية - رؤساء الأسر"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {settings.authPageSubtitle || "نظام شامل لإدارة بيانات الأسرة"}
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
                  <Users className="h-12 w-12 text-white" />
                </div>
              )}
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              {settings.authPageTitle || "نظام إدارة البيانات العائلية - رؤساء الأسر"}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {settings.authPageSubtitle || "نظام شامل لإدارة بيانات الأسر وتقديم الطلبات والخدمات"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 max-w-md">
            <div className="flex items-center p-4 bg-card border rounded-lg shadow-sm">
              <UserCheck className="h-8 w-8 text-primary ml-4 flex-shrink-0" />
              <div className="text-right">
                <h3 className="font-semibold text-card-foreground">إدارة بيانات الأسرة</h3>
                <p className="text-sm text-muted-foreground">تسجيل وتحديث بيانات أفراد الأسرة</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-card border rounded-lg shadow-sm">
              <Users className="h-8 w-8 text-secondary ml-4 flex-shrink-0" />
              <div className="text-right">
                <h3 className="font-semibold text-card-foreground">تقديم الطلبات</h3>
                <p className="text-sm text-muted-foreground">طلبات المساعدة والخدمات المختلفة</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-card border rounded-lg shadow-sm">
              <Users className="h-8 w-8 text-accent ml-4 flex-shrink-0" />
              <div className="text-right">
                <h3 className="font-semibold text-card-foreground">عرض البيانات</h3>
                <p className="text-sm text-muted-foreground">الاطلاع على بيانات الأسرة والطلبات</p>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="flex flex-col items-center justify-center gap-4">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl font-bold">تسجيل دخول رب الأسرة</CardTitle>
              <CardDescription className="text-sm sm:text-base">يرجى إدخال رقم الهوية</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4 sm:space-y-5">
                <div>
                  <Label htmlFor="headID" className="text-sm sm:text-base font-medium">رقم الهوية</Label>
                  <Input
                    id="headID"
                    placeholder="رقم الهوية (9 ارقام)"
                    {...loginForm.register("headID")}
                    className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                  />
                  {loginForm.formState.errors.headID && (
                    <p className="text-xs sm:text-sm text-destructive mt-1">
                      {loginForm.formState.errors.headID.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 sm:h-11 text-sm sm:text-base mt-2"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "جاري تسجيل الدخول..." : "تسجيل دخول رب الأسرة"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Button
            type="button"
            variant="outline"
            className="w-full max-w-md h-10 sm:h-11 text-sm sm:text-base"
            onClick={() => window.location.href = "/admin-auth"}
          >
            تسجيل دخول المشرف
          </Button>
          <div className="mt-6 text-center text-xs text-muted-foreground" dir="rtl">
    &copy; {new Date().getFullYear()} جميع الحقوق محفوظة
    <br/>
    |
    تم التطوير بواسطة: م. محمد فتح أبو طير
    <br/>
    |
    تم الإشراف بواسطة: م. أحمد شحادة أبو طير (أبو يزن) و م. ميسرة أبو طير
</div>
          
        </div>
      </div>
    </div>
  );
}
