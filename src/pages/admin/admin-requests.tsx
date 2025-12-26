import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Edit } from "lucide-react";
import ExcelJS from 'exceljs';
import { FileText, Search, Eye, Check, X, Clock, Filter, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getRequestStatusInArabic, getRequestTypeInArabic, formatDate } from "@/lib/utils";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";

export default function AdminRequests() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [adminComment, setAdminComment] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    status: "pending",
    adminComment: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/requests"],
  });

  const { data: families, isLoading: familiesLoading } = useQuery({
    queryKey: ["/api/admin/families"],
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, adminComment }: { id: number; status: string; adminComment?: string }) => {
      const res = await apiRequest("PUT", `/api/requests/${id}`, { status, adminComment });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setAdminComment("");
      toast({
        title: "تم تحديث الطلب",
        description: "تم تحديث حالة الطلب بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في التحديث",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredRequests = Array.isArray(requests) ? requests.filter((request: any) => {
    // Get family info to search by head name and ID
    let family = request.family;
    if (!family && Array.isArray(families)) {
      family = families.find((f: any) => f.id === request.familyId);
    }

    const matchesSearch = request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          request.id.toString().includes(searchTerm) ||
                          (family?.husbandName && family.husbandName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (family?.husbandID && family.husbandID.includes(searchTerm));
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesType = typeFilter === "all" || request.type === typeFilter;

    // Date filter logic - ensure proper date comparison by creating date objects at start of day for start date and end of day for end date
    const requestDate = new Date(request.createdAt);
    const matchesStartDate = !startDateFilter || requestDate >= new Date(startDateFilter + 'T00:00:00');
    const matchesEndDate = !endDateFilter || requestDate <= new Date(endDateFilter + 'T23:59:59');

    return matchesSearch && matchesStatus && matchesType && matchesStartDate && matchesEndDate;
  }) : [];

  const totalPages = Math.ceil(filteredRequests.length / pageSize);
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleViewRequest = (request: any) => {
    let reqWithFamily = request;
    if (!request.family && Array.isArray(families)) {
      const foundFamily = families.find((f: any) => f.id === request.familyId);
      if (foundFamily) {
        reqWithFamily = { ...request, family: foundFamily };
      }
    }
    setSelectedRequest(reqWithFamily);
    setAdminComment(request.adminComment || "");
    setIsDialogOpen(true);
    setIsEditMode(false); // Ensure it's not in edit mode when viewing
  };

  const handleUpdateRequest = (status: string) => {
    if (selectedRequest) {
      updateRequestMutation.mutate({
        id: selectedRequest.id,
        status,
        adminComment: adminComment.trim() || undefined
      });
    }
  };

  const handleEditRequest = () => {
    setIsEditMode(true);
    setEditFormData({
      status: selectedRequest.status,
      adminComment: selectedRequest.adminComment || "",
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditFormData({
      status: selectedRequest.status,
      adminComment: selectedRequest.adminComment || "",
    });
  };

  const handleSaveEdit = () => {
    if (selectedRequest) {
      updateRequestMutation.mutate({
        id: selectedRequest.id,
        status: editFormData.status,
        adminComment: editFormData.adminComment.trim() || undefined,
      });
      setIsEditMode(false);
    }
  };

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

  // Excel column configuration for export
  const excelColumns = [
    { key: 'id', label: 'رقم الطلب', checked: true },
    { key: 'type', label: 'نوع الطلب', checked: true },
    { key: 'description', label: 'الوصف', checked: true },
    { key: 'createdAt', label: 'التاريخ', checked: true },
    { key: 'status', label: 'الحالة', checked: true },
    { key: 'familyName', label: 'اسم رب الأسرة', checked: true },
    { key: 'familyId', label: 'رقم هوية رب الأسرة', checked: true },
    { key: 'adminComment', label: 'تعليق إداري', checked: true },
  ];

  const [checkedColumns, setCheckedColumns] = useState<{ [key: string]: boolean }>({});

  // Sync checkedColumns with available columns
  useEffect(() => {
    setCheckedColumns(prev => {
      const next: { [key: string]: boolean } = {};
      for (const col of excelColumns) {
        next[col.key] = prev[col.key] !== undefined ? prev[col.key] : col.checked;
      }
      return next;
    });
  }, []);

  const handleExcelColumnChange = (key: string) => {
    setCheckedColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    setCheckedColumns(Object.fromEntries(excelColumns.map(col => [col.key, true])));
  };

  const handleDeselectAll = () => {
    setCheckedColumns(Object.fromEntries(excelColumns.map(col => [col.key, false])));
  };

  // For export
  const selectedCols = excelColumns.filter(col => checkedColumns[col.key]);

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('الطلبات', { views: [{ rightToLeft: true }] });

      // Define styles
      const titleStyle: Partial<ExcelJS.Style> = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } }, // Green color for title
        font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 16 }, // White text
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      const headerStyle: Partial<ExcelJS.Style> = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF81C784' } }, // Light green color for headers
        font: { color: { argb: 'FF000000' }, bold: true, size: 12 }, // Black text
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
          top: { style: 'thin' as ExcelJS.BorderStyle },
          bottom: { style: 'thin' as ExcelJS.BorderStyle },
          left: { style: 'thin' as ExcelJS.BorderStyle },
          right: { style: 'thin' as ExcelJS.BorderStyle }
        }
      };

      const dataStyle: Partial<ExcelJS.Style> = {
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
          top: { style: 'thin' as ExcelJS.BorderStyle },
          bottom: { style: 'thin' as ExcelJS.BorderStyle },
          left: { style: 'thin' as ExcelJS.BorderStyle },
          right: { style: 'thin' as ExcelJS.BorderStyle }
        }
      };

      // Create title row
      const titleCells = Array(selectedCols.length).fill('');
      titleCells[0] = 'قائمة الطلبات (تصدير)';
      const titleRow = worksheet.addRow(titleCells);
      titleRow.height = 30;
      const lastColLetter = worksheet.getColumn(selectedCols.length).letter;
      worksheet.mergeCells(`A1:${lastColLetter}1`);
      titleRow.getCell(1).style = titleStyle;
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      // Create header row
      const headerRow = worksheet.addRow(selectedCols.map(c => c.label));
      headerRow.height = 35;
      headerRow.eachCell(cell => {
        cell.style = headerStyle;
        cell.alignment = {
          ...headerStyle.alignment,
          wrapText: true
        };
      });

      // Add filtered requests data to the worksheet
      filteredRequests.forEach((request: any) => {
        let family = request.family;
        if (!family && Array.isArray(families)) {
          family = families.find((f: any) => f.id === request.familyId);
        }

        const rowData: any = {};
        selectedCols.forEach(col => {
          switch (col.key) {
            case 'id':
              rowData[col.key] = request.id;
              break;
            case 'type':
              rowData[col.key] = getRequestTypeInArabic(request.type);
              break;
            case 'description':
              rowData[col.key] = request.description;
              break;
            case 'createdAt':
              // Format date with time for Excel export - Arabic locale with full date and time
              const date = new Date(request.createdAt);
              rowData[col.key] = date.toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              });
              break;
            case 'status':
              rowData[col.key] = getRequestStatusInArabic(request.status);
              break;
            case 'familyName':
              rowData[col.key] = family?.husbandName || '';
              break;
            case 'familyId':
              rowData[col.key] = family?.husbandID || '';
              break;
            case 'adminComment':
              rowData[col.key] = request.adminComment || '';
              break;
            default:
              rowData[col.key] = '';
          }
        });

        worksheet.addRow(rowData);
      });

      // Apply data styles to all rows
      const startRow = 3; // Title and header rows are 1 and 2
      for (let i = startRow; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        row.height = 25;
        row.eachCell(cell => {
          cell.style = dataStyle;
          cell.alignment = {
            ...dataStyle.alignment,
            wrapText: true
          };
        });
      }

      // Auto-adjust column widths based on content type
      worksheet.columns.forEach((column, index) => {
        const headerKey = selectedCols[index].key;
        // Extra wide columns for names and long text fields
        if (headerKey.includes('description') || headerKey.includes('adminComment')) {
          column.width = 40; // Extra wide for description and comments
        }
        // Medium-wide columns for names
        else if (headerKey.includes('familyName')) {
          column.width = 28; // Medium-wide for Arabic names
        }
        // Medium columns for dates
        else if (headerKey.includes('createdAt')) {
          column.width = 24; // Medium for dates
        }
        // Medium-narrow columns for IDs and status
        else if (headerKey.includes('id') || headerKey.includes('familyId') || headerKey.includes('status') || headerKey.includes('type')) {
          column.width = 20; // Medium-narrow for IDs and status
        }
        // Default width
        else {
          column.width = 15;
        }
      });

      // Generate and download the file
      const fileName = `طلبات_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "تم التصدير بنجاح",
        description: `تم حفظ ملف Excel باسم: ${fileName}`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير البيانات إلى Excel",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
    <PageWrapper>
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">جاري تحميل البيانات...</div>
      </div>
    </PageWrapper>
  );
  }

  const totalRequests = Array.isArray(requests) ? requests.length : 0;
  const pendingRequests = Array.isArray(requests) ? requests.filter((req: any) => req.status === 'pending') : [];
  const approvedRequests = Array.isArray(requests) ? requests.filter((req: any) => req.status === 'approved') : [];
  const rejectedRequests = Array.isArray(requests) ? requests.filter((req: any) => req.status === 'rejected') : [];

  return (
    <PageWrapper>
      <div className="space-y-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">إدارة الطلبات</h1>
            <p className="text-muted-foreground">مراجعة والرد على طلبات الأسر</p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div className="mr-3 md:mr-4">
                    <p className="text-xs md:text-sm text-muted-foreground">إجمالي الطلبات</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground">{totalRequests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 bg-yellow-100 rounded-lg">
                    <Clock className="h-5 w-5 md:h-6 md:w-6 text-warning" />
                  </div>
                  <div className="mr-3 md:mr-4">
                    <p className="text-xs md:text-sm text-muted-foreground">قيد المراجعة</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground">{pendingRequests.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 bg-green-100 rounded-lg">
                    <Check className="h-5 w-5 md:h-6 md:w-6 text-secondary" />
                  </div>
                  <div className="mr-3 md:mr-4">
                    <p className="text-xs md:text-sm text-muted-foreground">موافق عليها</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground">{approvedRequests.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 bg-red-100 rounded-lg">
                    <X className="h-5 w-5 md:h-6 md:w-6 text-destructive" />
                  </div>
                  <div className="mr-3 md:mr-4">
                    <p className="text-xs md:text-sm text-muted-foreground">مرفوضة</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground">{rejectedRequests.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                البحث والتصفية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-3 gap-4">
                <div className="relative md:col-span-1">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="البحث برقم الطلب أو الوصف أو اسم رب الأسرة أو رقم هويته..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 md:col-span-2 md:grid-cols-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="تصفية بالحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="pending">قيد المراجعة</SelectItem>
                      <SelectItem value="approved">موافق عليها</SelectItem>
                      <SelectItem value="rejected">مرفوضة</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="تصفية بالنوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأنواع</SelectItem>
                      <SelectItem value="financial">مساعدة مالية</SelectItem>
                      <SelectItem value="medical">مساعدة طبية</SelectItem>
                      <SelectItem value="damage">تقرير أضرار</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">من تاريخ</label>
                      <Input
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        className="w-full"
                        max={endDateFilter || undefined}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">إلى تاريخ</label>
                      <Input
                        type="date"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        className="w-full"
                        min={startDateFilter || undefined}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requests Table */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>قائمة الطلبات ({filteredRequests.length})</CardTitle>
              <Button onClick={() => setIsExportDialogOpen(true)} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                تصدير إلى Excel
              </Button>
            </CardHeader>
            <CardContent>
              {filteredRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-background">
                      <tr>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">رقم الطلب</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">نوع الطلب</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">الوصف</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">التاريخ</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الحالة</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {paginatedRequests.map((request: any) => (
                        <tr key={request.id} className="hover:bg-muted">
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            #{request.id}
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            <div className="flex flex-col">
                              <span>{getRequestTypeInArabic(request.type)}</span>
                              <span className="lg:hidden text-xs text-muted-foreground mt-1">{formatDate(request.createdAt)}</span>
                              <span className="md:hidden text-xs text-muted-foreground mt-1 truncate max-w-32">{request.description}</span>
                            </div>
                          </td>
                          <td className="px-3 md:px-6 py-4 text-sm text-foreground max-w-xs truncate hidden md:table-cell">
                            {request.description}
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-muted-foreground hidden lg:table-cell">
                            {formatDate(request.createdAt)}
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                            <Badge variant={
                              request.status === 'pending' ? 'default' :
                              request.status === 'approved' ? 'success' : 'destructive'
                            } className="text-xs">
                              {getRequestStatusInArabic(request.status)}
                            </Badge>
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex flex-wrap gap-1 md:flex-nowrap md:space-x-2 md:space-x-reverse">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewRequest(request)}
                                disabled={updateRequestMutation.isPending}
                                className="w-8 h-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {request.status === 'pending' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-secondary w-8 h-8 p-0"
                                    onClick={() => handleUpdateRequest('approved')}
                                    disabled={updateRequestMutation.isPending}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-destructive w-8 h-8 p-0"
                                    onClick={() => handleUpdateRequest('rejected')}
                                    disabled={updateRequestMutation.isPending}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Pagination Controls */}
                  <div className="flex justify-center items-center gap-2 mt-4 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      السابق
                    </Button>
                    <div className="flex gap-1 flex-wrap justify-center">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-8"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      التالي
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== "all" || typeFilter !== "all" 
                      ? 'لم يتم العثور على طلبات تطابق المعايير' 
                      : 'لا توجد طلبات'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Details Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl w-[95vw] md:w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-center">تفاصيل الطلب #{selectedRequest?.id}</DialogTitle>
                <DialogDescription className="text-center">
                  عرض تفاصيل الطلب مع إمكانية الموافقة أو الرفض
                </DialogDescription>
              </DialogHeader>
              {selectedRequest && (
                <div className="space-y-6">
                  {/* Request Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">معلومات الطلب</h4>
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <span className="text-muted-foreground">نوع الطلب:</span>
                          <span className="font-medium">{getRequestTypeInArabic(selectedRequest.type)}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                          <span className="text-muted-foreground">الحالة:</span>
                          <Badge variant={
                            selectedRequest.status === 'pending' ? 'default' :
                            selectedRequest.status === 'approved' ? 'default' : 'destructive'
                          }>
                            {getRequestStatusInArabic(selectedRequest.status)}
                          </Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <span className="text-muted-foreground">تاريخ التقديم:</span>
                          <span className="font-medium">{formatDate(selectedRequest.createdAt)}</span>
                        </div>
                        {selectedRequest.updatedAt && (
                          <div className="flex flex-col sm:flex-row sm:justify-between">
                            <span className="text-muted-foreground">آخر تحديث:</span>
                            <span className="font-medium">{formatDate(selectedRequest.updatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">معلومات مقدم الطلب</h4>
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <span className="text-muted-foreground">اسم رب الأسرة:</span>
                          <span className="font-medium text-right">{selectedRequest.family?.husbandName || 'غير محدد'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <span className="text-muted-foreground">رقم الهوية:</span>
                          <span className="font-medium">{selectedRequest.family?.husbandID || 'غير محدد'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <span className="text-muted-foreground">رقم الجوال:</span>
                          <span className="font-medium">{selectedRequest.family?.primaryPhone || 'غير محدد'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <span className="text-muted-foreground">الوصف:</span>
                          <span className="font-medium text-right break-words">{selectedRequest.description || 'غير محدد'}</span>
                        </div>
                        {selectedRequest.adminComment && (
                          <div className="flex flex-col sm:flex-row sm:justify-between">
                            <span className="text-muted-foreground">التعليق الإداري:</span>
                            <span className="font-medium text-right text-blue-600 break-words">{selectedRequest.adminComment}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Admin Comment Field - Show in both view and edit modes for pending requests */}
                  {selectedRequest.status === 'pending' && (
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-semibold text-foreground">
                        {isEditMode ? 'تعديل حالة الطلب' : 'إجراء على الطلب'}
                      </h4>
                      {isEditMode && (
                        <div className="space-y-2">
                          <Label htmlFor="editStatus">حالة الطلب</Label>
                          <Select
                            value={editFormData.status}
                            onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر حالة الطلب" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">معلق</SelectItem>
                              <SelectItem value="approved">تمت الموافقة</SelectItem>
                              <SelectItem value="rejected">مرفوض</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {/* Admin Comment Field */}
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                          <div className="flex-1">
                            <Label htmlFor="adminComment">تعليق إداري</Label>
                            <Input
                              id="adminComment"
                              placeholder="أضف تعليقاً إدارياً (اختياري)"
                              value={adminComment}
                              onChange={(e) => setAdminComment(e.target.value)}
                            />
                          </div>
                          {/* Save Comment Button (only if not in edit mode) */}
                          {!isEditMode && (
                            <Button
                              variant="secondary"
                              disabled={updateRequestMutation.isPending || adminComment.trim() === (selectedRequest.adminComment || "").trim()}
                              onClick={() => {
                                updateRequestMutation.mutate({
                                  id: selectedRequest.id,
                                  status: selectedRequest.status,
                                  adminComment: adminComment.trim() || undefined,
                                });
                              }}
                              className="w-full sm:w-auto whitespace-nowrap"
                            >
                              حفظ التعليق
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Edit Mode Fields - Only for non-pending requests */}
                  {isEditMode && selectedRequest.status !== 'pending' && (
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-semibold text-foreground">تعديل حالة الطلب</h4>
                      <div className="space-y-2">
                        <Label htmlFor="editStatus">حالة الطلب</Label>
                        <Select
                          value={editFormData.status}
                          onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر حالة الطلب" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">معلق</SelectItem>
                            <SelectItem value="approved">تمت الموافقة</SelectItem>
                            <SelectItem value="rejected">مرفوض</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Admin Comment Field */}
                      <div className="space-y-2">
                        <Label htmlFor="adminComment">تعليق إداري</Label>
                        <Input
                          id="adminComment"
                          placeholder="أضف تعليقاً إدارياً (اختياري)"
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                    />
                  </div>
                    </div>
                  )}
                  {/* Action Buttons */}
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-0 sm:space-x-3 sm:space-x-reverse pt-4 border-t">
                    {isEditMode ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="w-full sm:w-auto"
                        >
                          إلغاء التعديل
                        </Button>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                          onClick={handleSaveEdit}
                          disabled={updateRequestMutation.isPending}
                        >
                          حفظ التعديلات
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          className="w-full sm:w-auto"
                        >
                          {selectedRequest.status === 'pending' ? 'إلغاء' : 'إغلاق'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleEditRequest}
                          className="w-full sm:w-auto"
                        >
                          <Edit className="h-4 w-4 ml-2" />
                          تعديل
                        </Button>
                        {selectedRequest.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 w-full sm:w-auto"
                              onClick={() => {
                                handleUpdateRequest('rejected');
                                setIsDialogOpen(false);
                              }}
                              disabled={updateRequestMutation.isPending}
                            >
                              <X className="h-4 w-4 ml-2" />
                              رفض الطلب
                            </Button>
                            <Button
                              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                              onClick={() => {
                                handleUpdateRequest('approved');
                                setIsDialogOpen(false);
                              }}
                              disabled={updateRequestMutation.isPending}
                            >
                              <Check className="h-4 w-4 ml-2" />
                              موافقة
                            </Button>
                          </>
                        )}
                      </>
                    )}
                    </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Excel Export Dialog */}
          <Dialog
            open={isExportDialogOpen}
            onOpenChange={(open) => {
              setIsExportDialogOpen(open);
            }}
          >
            <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] overflow-y-auto">
              <DialogHeader className="px-4 sm:px-6">
                <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                  <Download className="h-5 w-5" />
                  <span>تصدير بيانات الطلبات إلى Excel</span>
                </DialogTitle>
                <p className="text-sm text-muted-foreground text-right">
                  حدد الأعمدة التي ترغب في تضمينها في التصدير
                </p>
              </DialogHeader>

              <div className="px-4 sm:px-6 py-4">
                <div className="flex justify-end gap-2 mb-4">
                  <Button type="button" variant="outline" onClick={handleSelectAll} className="text-sm">
                    تحديد الكل
                  </Button>
                  <Button type="button" variant="outline" onClick={handleDeselectAll} className="text-sm">
                    إلغاء التحديد
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4" dir="rtl">
                  {excelColumns.map((col, idx) => (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all select-none shadow-sm ${checkedColumns[col.key] ? 'bg-green-50 border-green-500 text-green-800 font-bold ring-2 ring-green-200' : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'}`}
                      style={{ order: idx + 1 }}
                    >
                      <input
                        type="checkbox"
                        checked={checkedColumns[col.key]}
                        onChange={() => handleExcelColumnChange(col.key)}
                        className="accent-green-600 w-4 h-4"
                      />
                      <span className="text-sm">{col.label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end mt-4">
                  <Button onClick={exportToExcel} className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span>تصدير إلى Excel</span>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
              </div>
    </PageWrapper>
  );
}
