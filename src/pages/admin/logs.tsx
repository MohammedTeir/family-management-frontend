import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { Activity, BarChart3, Users, FileText } from "lucide-react";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";

const PAGE_SIZE = 20;

export default function AdminLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ["/api/admin/logs", { page, search, type: typeFilter, userId: userFilter, startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("pageSize", String(PAGE_SIZE));
      if (search) params.append("search", search);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (userFilter !== "all") params.append("userId", userFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const response = await apiClient.get(`/api/admin/logs?${params.toString()}`);
      return response.data;
    },
    keepPreviousData: true,
  });

  // Fetch statistics
  const { data: statistics } = useQuery({
    queryKey: ["/api/admin/logs/statistics", { startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const response = await apiClient.get(`/api/admin/logs/statistics?${params.toString()}`);
      return response.data;
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const { data: allUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await apiClient.get("/api/admin/users");
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { settings } = useSettingsContext();

  useEffect(() => {
    if (settings.siteTitle) {
      document.title = settings.siteTitle;
    }
    if (settings.language) {
      document.documentElement.lang = settings.language;
      document.body.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [settings.siteTitle, settings.language]);

  // Map log types to Arabic descriptions
  const getLogTypeInArabic = (type: string) => {
    switch (type) {
      // Family operations
      case 'family_creation':
        return 'إنشاء عائلة';
      case 'family_update':
        return 'تحديث عائلة';
      case 'family_deletion':
        return 'حذف عائلة';
      case 'admin_family_update':
        return 'تحديث عائلة من قبل المشرف';

      // Member operations
      case 'member_creation':
        return 'إنشاء فرد';
      case 'member_update':
        return 'تحديث فرد';
      case 'member_deletion':
        return 'حذف فرد';
      case 'admin_member_creation':
        return 'إنشاء فرد من قبل المشرف';
      case 'admin_member_deletion':
        return 'حذف فرد من قبل المشرف';

      // Orphan operations
      case 'orphan_creation':
        return 'إنشاء يتيم';
      case 'orphan_update':
        return 'تحديث يتيم';
      case 'orphan_deletion':
        return 'حذف يتيم';
      case 'admin_orphan_creation':
        return 'إنشاء يتيم من قبل المشرف';
      case 'admin_orphan_update':
        return 'تحديث يتيم من قبل المشرف';
      case 'admin_orphan_deletion':
        return 'حذف يتيم من قبل المشرف';

      // Spouse operations
      case 'spouse_update':
        return 'تحديث بيانات الزوج/الزوجة';

      // Authentication
      case 'login':
        return 'تسجيل دخول';
      case 'failed_login':
        return 'محاولة تسجيل دخول فاشلة';

      // Default case
      default:
        return type;
    }
  };

  // Extract unique log types for filter dropdown
  const logTypes = Array.from(
    new Set(logs?.map((log: any) => log.type).filter(Boolean))
  );

  // Use only admin and root users for filter dropdown (exclude heads)
  const allUsersForFilter = allUsers ? allUsers.filter(user => user.role === 'admin' || user.role === 'root') : [];

  return (
    <PageWrapper>
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                <Activity className="inline-block ml-2 h-5 w-5 sm:h-6 sm:w-6" />
                سجل النشاطات
              </CardTitle>
            </CardHeader>

            {/* Statistics Section */}
            <CardContent>
              <div className="mb-6 sm:mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    إحصائيات السجلات
                  </h2>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-auto text-sm"
                    />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-auto text-sm"
                    />
                  </div>
                </div>

                {/* Main Statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <StatCard
                    title="إجمالي السجلات"
                    value={statistics?.total || 0}
                    icon={<FileText className="h-5 w-5" />}
                    color="bg-blue-100 text-blue-800"
                  />
                  <StatCard
                    title="العائلات الفريدة"
                    value={statistics?.familyCount || 0}
                    icon={<Users className="h-5 w-5" />}
                    color="bg-green-100 text-green-800"
                  />
                  <StatCard
                    title="أنواع السجلات"
                    value={statistics?.byType?.length || 0}
                    icon={<BarChart3 className="h-5 w-5" />}
                    color="bg-purple-100 text-purple-800"
                  />
                  <StatCard
                    title="المستخدمون النشطون"
                    value={statistics?.byUser?.length || 0}
                    icon={<Activity className="h-5 w-5" />}
                    color="bg-orange-100 text-orange-800"
                  />
                </div>

                {/* Log Type Statistics - Unique Families Count */}
                <div className="mb-4">
                  <h3 className="text-base sm:text-lg font-medium text-foreground mb-3">السجلات حسب النوع - مجمعة حسب العائلات الفريدة</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    <StatCard
                      title="إنشاء عائلة"
                      value={statistics?.typeFamilyCounts?.family_creation || 0}
                      icon={<FileText className="h-5 w-5" />}
                      color="bg-green-100 text-green-800"
                    />
                    <StatCard
                      title="تحديث عائلة"
                      value={statistics?.typeFamilyCounts?.family_update || 0}
                      icon={<FileText className="h-5 w-5" />}
                      color="bg-amber-100 text-amber-800"
                    />
                    <StatCard
                      title="تحديث بيانات الزوج/الزوجة"
                      value={statistics?.typeFamilyCounts?.spouse_update || 0}
                      icon={<Users className="h-5 w-5" />}
                      color="bg-blue-100 text-blue-800"
                    />
                    <StatCard
                      title="تحديث العائلة من قبل المشرف"
                      value={statistics?.typeFamilyCounts?.admin_family_update || 0}
                      icon={<Activity className="h-5 w-5" />}
                      color="bg-red-100 text-red-800"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">بحث</label>
                  <Input
                    placeholder="بحث في الرسائل..."
                    value={search}
                    onChange={e => {
                      setPage(1);
                      setSearch(e.target.value);
                    }}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">نوع السجل</label>
                  <Select
                    value={typeFilter}
                    onValueChange={(value) => {
                      setPage(1);
                      setTypeFilter(value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="كل الأنواع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الأنواع</SelectItem>
                      {logTypes.map(type => (
                        <SelectItem key={type} value={type}>{getLogTypeInArabic(type)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">المستخدم</label>
                  <Select
                    value={userFilter}
                    onValueChange={(value) => {
                      setPage(1);
                      setUserFilter(value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="جميع المستخدمين" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المستخدمين</SelectItem>
                      {allUsersForFilter.map(user => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.username} ({user.role === "root" ? "مشرف رئيسي" : user.role === "admin" ? "مشرف" : "مستخدم"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">من تاريخ</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => {
                      setPage(1);
                      setStartDate(e.target.value);
                    }}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">إلى تاريخ</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => {
                      setPage(1);
                      setEndDate(e.target.value);
                    }}
                    className="w-full"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setTypeFilter("all");
                      setUserFilter("all");
                      setStartDate("");
                      setEndDate("");
                      setPage(1);
                    }}
                    className="w-full"
                  >
                    تصفية
                  </Button>
                </div>
              </div>
              {isLoading ? (
                <div className="text-center py-8 sm:py-12 text-muted-foreground">جاري تحميل السجلات...</div>
              ) : logs && logs.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-full bg-card">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 lg:px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">#</th>
                          <th className="px-3 lg:px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">النوع</th>
                          <th className="px-3 lg:px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الرسالة</th>
                          <th className="px-3 lg:px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">المستخدم</th>
                          <th className="px-3 lg:px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {logs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-muted">
                            <td className="px-3 lg:px-4 py-2 text-sm text-foreground">{log.id}</td>
                            <td className="px-3 lg:px-4 py-2">
                              <Badge variant="secondary" className="text-xs">{getLogTypeInArabic(log.type)}</Badge>
                            </td>
                            <td className="px-3 lg:px-4 py-2 text-sm text-foreground max-w-xs truncate">{log.message}</td>
                            <td className="px-3 lg:px-4 py-2 text-sm text-foreground">
                              {log.user
                                ? `${log.user.username} (${log.user.role === "root" ? "مشرف رئيسي" : log.user.role === "admin" ? "مشرف" : "مستخدم"})`
                                : "—"}
                            </td>
                            <td className="px-3 lg:px-4 py-2 text-sm text-muted-foreground">{formatDate(log.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {logs.map((log: any) => (
                      <Card key={log.id} className="border border-border">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className="text-xs">{getLogTypeInArabic(log.type)}</Badge>
                              <span className="text-xs text-muted-foreground">#{log.id}</span>
                            </div>
                            <p className="text-sm text-foreground break-words">{log.message}</p>
                            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 xs:gap-2 pt-2 border-t border-border">
                              <span className="text-xs text-foreground">
                                {log.user
                                  ? `${log.user.username} (${log.user.role === "root" ? "مشرف رئيسي" : log.user.role === "admin" ? "مشرف" : "مستخدم"})`
                                  : "—"}
                              </span>
                              <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 sm:py-12 text-muted-foreground">لا توجد سجلات.</div>
              )}
              {/* Pagination */}
              <div className="flex flex-col xs:flex-row justify-center items-center gap-3 xs:gap-4 mt-4 sm:mt-6">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="w-full xs:w-auto text-sm"
                >
                  السابق
                </Button>
                <span className="text-sm sm:text-base text-foreground order-first xs:order-none">صفحة {page}</span>
                <Button
                  variant="outline"
                  disabled={!logs || logs.length < PAGE_SIZE}
                  onClick={() => setPage(p => p + 1)}
                  className="w-full xs:w-auto text-sm"
                >
                  التالي
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
    </PageWrapper>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card className="border border-border">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 