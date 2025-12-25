import { useEffect, useState, useMemo, memo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, ChevronUp, ChevronDown, Filter } from "lucide-react";
import { getPriorityInArabic, getPriorityColor, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { PageWrapper } from "@/components/layout/page-wrapper";

// 🚀 PERFORMANCE: Memoized component to prevent unnecessary re-renders
const PriorityManagement = memo(function PriorityManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  // Families data fetching
  const { data: families, isLoading } = useQuery({
    queryKey: ["/api/admin/families"],
    select: (data) => {
      // Ensure priority field is present in all families (default to 5 if not present)
      return data?.map((family: any) => ({
        ...family,
        priority: family.priority !== undefined ? family.priority : 5
      })) || [];
    }
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async ({ familyId, priority }: { familyId: number; priority: number }) => {
      const response = await apiClient.patch(`/api/families/${familyId}/priority`, { priority });
      return response.data;
    },
    onSuccess: (updatedFamily) => {
      toast({ title: "تم تحديث الأولوية", description: "تم تحديث أولوية العائلة بنجاح" });
      // Update the cached data to avoid full page reload
      queryClient.setQueryData(['/api/admin/families'], (oldData: any[]) => {
        if (!oldData) return oldData;
        return oldData.map(family => 
          family.id === updatedFamily.id ? { ...family, priority: updatedFamily.priority } : family
        );
      });
    },
    onError: (error: any) => {
      toast({ title: "خطأ في التحديث", description: error.message, variant: "destructive" });
    },
  });

  // 🚀 PERFORMANCE: Memoize expensive filtering logic
  const filteredFamilies = useMemo(() => {
    if (!Array.isArray(families)) return [];

    return families.filter((family: any) => {
      // Cache toLowerCase to avoid repeated calls
      const lowerSearchTerm = searchTerm.toLowerCase();
      const lowerHusbandName = family.husbandName.toLowerCase();
      const lowerHusbandID = family.husbandID.toLowerCase();

      const matchesSearch = 
        lowerHusbandName.includes(lowerSearchTerm) ||
        lowerHusbandID.includes(lowerSearchTerm);

      const matchesPriority = priorityFilter === 'all' || 
                              (priorityFilter !== 'all' && family.priority === parseInt(priorityFilter));

      return matchesSearch && matchesPriority;
    });
  }, [families, searchTerm, priorityFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredFamilies.length / pageSize);
  const paginatedFamilies = filteredFamilies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </PageWrapper>
    );
  }

  const priorityStats = [1, 2, 3, 4, 5].map(priority => ({
    priority,
    label: getPriorityInArabic(priority),
    count: families?.filter((f: any) => f.priority === priority).length || 0
  }));

  return (
    <PageWrapper>
      <div className="space-y-6 w-full min-w-0 overflow-hidden">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">إدارة الأولويات</h1>
          <p className="text-muted-foreground">إدارة وتحديث أولويات العائلات حسب احتياجات الدعم</p>
        </div>

        {/* Priority Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {priorityStats.map((stat) => (
            <Card key={stat.priority} className={`${getPriorityColor(stat.priority)} text-white`}>
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold">{stat.count}</span>
                  <span className="text-sm">{stat.label}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>البحث والتصفية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" dir="rtl">
              {/* Search Field */}
              <div className="flex justify-center">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="البحث بالاسم أو رقم الهوية..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-right"
                    dir="rtl"
                  />
                </div>
              </div>
              
              {/* Priority Filter */}
              <div className="flex flex-col items-center">
                <label className="mb-1 text-sm text-foreground text-center w-full">تصفية حسب الأولوية</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter} dir="rtl">
                  <SelectTrigger className="w-full text-right" dir="rtl">
                    <SelectValue className="text-right" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">جميع الأولويات</SelectItem>
                    <SelectItem value="1">أولوية قصوى</SelectItem>
                    <SelectItem value="2">أولوية عالية</SelectItem>
                    <SelectItem value="3">أولوية متوسطة</SelectItem>
                    <SelectItem value="4">أولوية منخفضة</SelectItem>
                    <SelectItem value="5">أولوية عادية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Families Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة العائلات ({filteredFamilies.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredFamilies.length > 0 ? (
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">رقم العائلة</th>
                      <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">اسم رب الأسرة</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">رقم الهوية</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">عدد الأفراد</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الأولوية الحالية</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">تحديث الأولوية</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {paginatedFamilies.map((family: any) => (
                      <tr key={family.id} className="hover:bg-muted">
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {family.id}
                        </td>
                        <td className="px-3 md:px-6 py-4">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{family.husbandName}</div>
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {family.husbandID}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm font-medium text-foreground">{family.totalMembers || 0}</div>
                        </td>
                        <td className="px-3 md:px-6 py-4">
                          <Badge className={`${getPriorityColor(family.priority || 5)} text-white text-xs`}>
                            {getPriorityInArabic(family.priority || 5)}
                          </Badge>
                        </td>
                        <td className="px-3 md:px-6 py-4">
                          <div className="flex items-center space-x-1 space-x-reverse">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (family.priority > 1) {
                                  updatePriorityMutation.mutate({ familyId: family.id, priority: family.priority - 1 });
                                }
                              }}
                              className="w-8 h-8 p-0"
                              disabled={family.priority <= 1}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (family.priority < 5) {
                                  updatePriorityMutation.mutate({ familyId: family.id, priority: family.priority + 1 });
                                }
                              }}
                              className="w-8 h-8 p-0"
                              disabled={family.priority >= 5}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination Controls */}
                <div className="flex justify-between items-center mt-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                    >
                      الأول
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      السابق
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    صفحة {currentPage} من {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      التالي
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      الأخير
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || priorityFilter !== 'all' ? 'لم يتم العثور على عائلات تطابق البحث' : 'لا توجد عائلات مسجلة'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
});

export default PriorityManagement;