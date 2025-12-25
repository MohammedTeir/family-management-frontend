import { useEffect, useState, useMemo, memo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, ChevronUp, ChevronDown, Filter, FileSpreadsheet } from "lucide-react";
import { getPriorityInArabic, getPriorityColor, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExcelJS from 'exceljs';
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

  // Excel export states
  const [isExcelDialogOpen, setIsExcelDialogOpen] = useState(false);
  const [includePriorityColor, setIncludePriorityColor] = useState(false);
  const [customFileName, setCustomFileName] = useState("");

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
      const response = await apiClient.put(`/api/families/${familyId}/priority`, { priority });
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

  // Excel export handler
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('أولويات العائلات', {views: [{rightToLeft: true}] });

      // Styles
      const titleStyle: Partial<ExcelJS.Style> = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } }, // Light green color
        font: { color: { argb: 'FF000000' }, bold: true, size: 16 }, // Black text
        alignment: { horizontal: 'center', vertical: 'middle' }
      };
      const headerStyle: Partial<ExcelJS.Style> = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } }, // Light green color
        font: { color: { argb: 'FF000000' }, bold: true, size: 12 }, // Black text
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: { top: { style: 'thin' as ExcelJS.BorderStyle }, bottom: { style: 'thin' as ExcelJS.BorderStyle }, left: { style: 'thin' as ExcelJS.BorderStyle }, right: { style: 'thin' as ExcelJS.BorderStyle } }
      };
      const dataStyle: Partial<ExcelJS.Style> = {
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: { top: { style: 'thin' as ExcelJS.BorderStyle }, bottom: { style: 'thin' as ExcelJS.BorderStyle }, left: { style: 'thin' as ExcelJS.BorderStyle }, right: { style: 'thin' as ExcelJS.BorderStyle } }
      };

      // Add title row
      const titleCells = ['أولويات العائلات (تصدير)'];
      const titleRow = sheet.addRow(titleCells);
      titleRow.height = 30;
      sheet.mergeCells(`A1:F1`);
      titleRow.getCell(1).style = titleStyle;
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      // Header row
      const headerRow = sheet.addRow([
        'رقم العائلة',
        'اسم رب الأسرة',
        'رقم الهوية',
        'عدد الأفراد',
        'الأولوية الحالية',
        'الحالة'
      ]);
      headerRow.height = 30;
      headerRow.eachCell(cell => {
        cell.style = headerStyle;
        cell.alignment = {
          ...headerStyle.alignment,
          wrapText: true
        };
      });

      // Data rows
      filteredFamilies.forEach(family => {
        const rowData = [
          family.id,
          family.husbandName,
          family.husbandID,
          family.totalMembers || 0,
          getPriorityInArabic(family.priority || 5),
          family.isDisplaced ? 'نازح' : family.warDamage2023 ? 'متضرر' : family.isAbroad ? 'مغترب' : 'عادي'
        ];

        const row = sheet.addRow(rowData);
        row.height = 25;
        row.eachCell((cell, colNumber) => {
          cell.style = dataStyle;
          cell.alignment = {
            ...dataStyle.alignment,
            wrapText: true
          };

          // Apply priority-based row coloring if the option is enabled
          if (includePriorityColor) {
            // Get the priority number for this family
            let priorityNumber = family.priority || 5;

            // Set background color based on priority
            switch (priorityNumber) {
              case 1: // Highest priority - Red
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFB6C1' } }; // Light red
                break;
              case 2: // High priority - Orange
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD580' } }; // Light orange
                break;
              case 3: // Medium priority - Yellow
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } }; // Light yellow
                break;
              case 4: // Low priority - Blue
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90CAF9' } }; // Light blue
                break;
              case 5: // Normal priority - Green
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } }; // Light green
                break;
              default: // Default color
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // White
            }
          }
        });
      });

      // Set column widths
      sheet.columns = [
        { width: 15 }, // Family ID
        { width: 30 }, // Husband Name
        { width: 20 }, // ID
        { width: 15 }, // Members count
        { width: 20 }, // Priority
        { width: 15 }  // Status
      ];

      // Download
      let fileName;
      if (customFileName.trim()) {
        fileName = customFileName.trim().endsWith('.xlsx') ? customFileName.trim() : customFileName.trim() + '.xlsx';
      } else {
        fileName = `priority_families_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      }
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      toast({ title: 'تم التصدير بنجاح', description: `تم حفظ ملف Excel باسم: ${fileName}`, variant: 'default' });
      // Reset custom filename after successful export
      setCustomFileName('');
    } catch (error) {
      toast({ title: 'خطأ في التصدير', description: 'حدث خطأ أثناء تصدير البيانات إلى Excel', variant: 'destructive' });
    }
  };

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

        {/* Excel Export Button */}
        <div className="flex justify-end mb-6">
          <Button onClick={() => setIsExcelDialogOpen(true)} variant="outline" className="flex items-center gap-2 justify-center">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">تصدير إلى Excel</span>
            <span className="sm:hidden">تصدير</span>
          </Button>
        </div>

        {/* Excel Export Dialog */}
        <Dialog
          open={isExcelDialogOpen}
          onOpenChange={(open) => {
            setIsExcelDialogOpen(open);
            if (!open) {
              setCustomFileName(''); // Clear the filename when dialog is closed
            }
          }}
        >
          <DialogContent className="max-w-md max-h-[90vh] w-[95vw] overflow-y-auto">
            <DialogHeader className="px-4 sm:px-6">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                <FileSpreadsheet className="h-5 w-5" />
                <span>تصدير بيانات الأولويات إلى Excel</span>
              </DialogTitle>
              <p className="text-sm text-muted-foreground text-right">
                تصدير بيانات العائلات مع تلوين الصفوف حسب الأولوية
              </p>
            </DialogHeader>

            <div className="px-4 sm:px-6 py-4 space-y-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-right mb-2">
                  اسم ملف التصدير (اختياري)
                </label>
                <Input
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder="أدخل اسم الملف (مثلاً: الأولويات_٢٠٢٥)"
                  className="w-full text-right"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includePriorityColor"
                  checked={includePriorityColor}
                  onChange={(e) => setIncludePriorityColor(e.target.checked)}
                  className="h-4 w-4 text-primary accent-primary focus:ring-primary"
                />
                <label htmlFor="includePriorityColor" className="mr-2 text-sm font-medium text-foreground">
                  تلوين الصفوف حسب الأولوية
                </label>
              </div>

              <div className="flex justify-end mt-4">
                <Button onClick={() => handleExportExcel()} className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  تصدير إلى Excel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
});

export default PriorityManagement;