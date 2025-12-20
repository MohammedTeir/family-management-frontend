import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { calculateAge, getGenderInArabic, getRelationshipInArabic, calculateDetailedAge } from "@/lib/utils";
import OrphanForm from "@/components/forms/orphan-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useEffect } from "react";
import { apiClient } from "@/lib/api";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Header } from "@/components/layout/header";

// Define schema for orphans
const orphanSchema = z.object({
  orphanName: z.string().min(1, "اسم اليتيم مطلوب"),
  orphanBirthDate: z.string().min(1, "تاريخ ميلاد اليتيم مطلوب"),
  orphanID: z.string().regex(/^\d{9,15}$/, "رقم هوية اليتيم يجب أن يكون 9-15 رقم").optional(),
  gender: z.enum(['male', 'female'], {
    errorMap: (issue, ctx) => {
      if (issue.code === 'invalid_enum_value') {
        return { message: 'الجنس مطلوب' };
      }
      return { message: ctx.defaultError };
    }
  }),
  guardianName: z.string().min(1, "اسم الوصي مطلوب"),
  guardianID: z.string().regex(/^\d{9,15}$/, "رقم هوية الوصي يجب أن يكون 9-15 رقم").optional(),
  guardianBirthDate: z.string().min(1, "تاريخ ميلاد الوصي مطلوب"),
  fatherName: z.string().optional(),
  fatherID: z.string().regex(/^\d{9,15}$/, "رقم هوية الأب يجب أن يكون 9-15 رقم").optional(),
  martyrdomDate: z.string().optional(),
  // New orphan fields
  hasChronicIllness: z.boolean().optional(),
  chronicIllnessType: z.string().optional(),
  isDisabled: z.boolean().optional(),
  disabilityType: z.string().optional(),
  hasWarInjury: z.boolean().optional(),
  warInjuryType: z.string().optional(),
  // End new orphan fields
  bankAccountNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
  currentAddress: z.string().optional(),
  originalAddress: z.string().optional(),
  mobileNumber: z.string().regex(/^[\d\s+\-().]{10,15}$/, "رقم الجوال غير صحيح").optional(),
  backupMobileNumber: z.string().regex(/^[\d\s+\-().]{10,15}$/, "رقم الجوال الاحتياطي غير صحيح").optional(),
});

type OrphanFormData = z.infer<typeof orphanSchema>;

export default function Orphans() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrphan, setEditingOrphan] = useState<any>(null);
  const [deleteOrphan, setDeleteOrphan] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: family, isLoading: familyLoading } = useQuery({
    queryKey: ["/api/family"],
  });

  // Get orphans from family data
  const orphans = family?.orphans || [];

  const totalOrphans = orphans.length;

  const form = useForm<OrphanFormData>({
    resolver: zodResolver(orphanSchema),
    defaultValues: {
      orphanName: "",
      orphanBirthDate: "",
      orphanID: "",
      gender: "",
      guardianName: "",
      guardianID: "",
      guardianBirthDate: "",
      fatherName: "",
      fatherID: "",
      martyrdomDate: "",
      hasChronicIllness: false,
      chronicIllnessType: "",
      isDisabled: false,
      disabilityType: "",
      hasWarInjury: false,
      warInjuryType: "",
      bankAccountNumber: "",
      accountHolderName: "",
      currentAddress: "",
      originalAddress: "",
      mobileNumber: "",
      backupMobileNumber: "",
    },
  });

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingOrphan(null);
      form.reset({
        orphanName: "",
        orphanBirthDate: "",
        orphanID: "",
        gender: "",
        guardianName: "",
        guardianID: "",
        guardianBirthDate: "",
        fatherName: "",
        fatherID: "",
        martyrdomDate: "",
        hasChronicIllness: false,
        chronicIllnessType: "",
        isDisabled: false,
        disabilityType: "",
        hasWarInjury: false,
        warInjuryType: "",
        bankAccountNumber: "",
        accountHolderName: "",
        currentAddress: "",
        originalAddress: "",
        mobileNumber: "",
        backupMobileNumber: "",
        image: "",
      });
    }
  };

  const createOrphanMutation = useMutation({
    mutationFn: async (data: OrphanFormData) => {
      const response = await apiClient.post("/api/orphans", data);
      return response.data;
    },
    onSuccess: (newOrphan) => {
      // Update the cache manually instead of invalidating
      queryClient.setQueryData(["/api/family"], (oldData: any) => {
        if (oldData && oldData.orphans) {
          return {
            ...oldData,
            orphans: [...oldData.orphans, newOrphan]
          };
        } else if (oldData) {
          return {
            ...oldData,
            orphans: [newOrphan]
          };
        }
        return oldData;
      });

      toast({
        title: "تم الإضافة بنجاح",
        description: "تم إضافة اليتيم إلى الأسرة",
        variant: "default",
      });
      setIsDialogOpen(false);
      setEditingOrphan(null);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الإضافة",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateOrphanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      console.log('Updating orphan with ID:', id, 'Data:', data);

      const response = await apiClient.put(`/api/orphans/${id}`, data);

      console.log('Update response status:', response.status);

      return response.data;
    },
    onSuccess: (updatedOrphan) => {
      // Update the cache manually instead of invalidating
      queryClient.setQueryData(["/api/family"], (oldData: any) => {
        if (oldData && oldData.orphans) {
          return {
            ...oldData,
            orphans: oldData.orphans.map((orphan: any) =>
              orphan.id === updatedOrphan.id ? updatedOrphan : orphan
            )
          };
        }
        return oldData;
      });

      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث بيانات اليتيم",
        variant: "default",
      });
      setIsDialogOpen(false);
      setEditingOrphan(null);
    },
    onError: (error: any) => {
      console.error('Update mutation error:', error);
      toast({
        title: "خطأ في التحديث",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteOrphanMutation = useMutation({
    mutationFn: async (orphanId: number) => {
      console.log('Attempting to delete orphan with ID:', orphanId);
      console.log('Orphan ID type in mutation:', typeof orphanId);

      const response = await apiClient.delete(`/api/orphans/${orphanId}`);

      console.log('Delete response status:', response.status);

      // Return the deleted orphan ID for cache update
      return orphanId;
    },
    onSuccess: (deletedOrphanId) => {
      // Update the cache manually instead of invalidating
      queryClient.setQueryData(["/api/family"], (oldData: any) => {
        if (oldData && oldData.orphans) {
          return {
            ...oldData,
            orphans: oldData.orphans.filter((orphan: any) => orphan.id !== deletedOrphanId)
          };
        }
        return oldData;
      });

      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف اليتيم من الأسرة",
        variant: "default",
      });
      setIsDeleteDialogOpen(false);
      setDeleteOrphan(null);
    },
    onError: (error: any) => {
      console.error('Delete mutation error:', error);
      toast({
        title: "خطأ في الحذف",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OrphanFormData) => {
    console.log('Form submitted with data:', data);

    if (editingOrphan) {
      console.log('Updating existing orphan:', editingOrphan.id);
      updateOrphanMutation.mutate({ id: editingOrphan.id, data });
    } else {
      console.log('Creating new orphan');
      createOrphanMutation.mutate(data);
    }
  };

  const handleEdit = (orphan: any) => {
    console.log('Editing orphan:', orphan);
    // Ensure orphan has all required fields for the form
    const orphanWithDefaults = {
      id: orphan.id, // Critical: preserve the orphan ID
      orphanName: orphan.orphanName || "",
      orphanBirthDate: orphan.orphanBirthDate || "",
      orphanID: orphan.orphanID || "",
      gender: orphan.gender || "",
      guardianName: orphan.guardianName || "",
      guardianID: orphan.guardianID || "",
      guardianBirthDate: orphan.guardianBirthDate || "",
      fatherName: orphan.fatherName || "",
      fatherID: orphan.fatherID || "",
      martyrdomDate: orphan.martyrdomDate || "",
      martyrdomType: orphan.martyrdomType || "",
      hasChronicIllness: orphan.hasChronicIllness || false,
      chronicIllnessType: orphan.chronicIllnessType || "",
      isDisabled: orphan.isDisabled || false,
      disabilityType: orphan.disabilityType || "",
      hasWarInjury: orphan.hasWarInjury || false,
      warInjuryType: orphan.warInjuryType || "",
      bankAccountNumber: orphan.bankAccountNumber || "",
      accountHolderName: orphan.accountHolderName || "",
      currentAddress: orphan.currentAddress || "",
      originalAddress: orphan.originalAddress || "",
      mobileNumber: orphan.mobileNumber || "",
      backupMobileNumber: orphan.backupMobileNumber || "",
    };
    setEditingOrphan(orphanWithDefaults);
    form.reset(orphanWithDefaults);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingOrphan(null);
    form.reset({
      orphanName: "",
      orphanBirthDate: "",
      orphanID: "",
      gender: "",
      guardianName: "",
      guardianID: "",
      guardianBirthDate: "",
      fatherName: "",
      fatherID: "",
      martyrdomDate: "",
      martyrdomType: "",
      hasChronicIllness: false,
      chronicIllnessType: "",
      isDisabled: false,
      disabilityType: "",
      hasWarInjury: false,
      warInjuryType: "",
      bankAccountNumber: "",
      accountHolderName: "",
      currentAddress: "",
      originalAddress: "",
      mobileNumber: "",
      backupMobileNumber: "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (orphan: any) => {
    console.log('Delete clicked for orphan:', orphan);
    console.log('Orphan ID:', orphan.id);
    console.log('Orphan ID type:', typeof orphan.id);
    console.log('Orphan ID Number:', Number(orphan.id));
    console.log('Orphan ID String:', String(orphan.id));
    console.log('Full orphan object:', JSON.stringify(orphan, null, 2));
    setDeleteOrphan(orphan);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteOrphan) {
      console.log('Confirming delete for orphan:', deleteOrphan);
      console.log('Delete orphan ID:', deleteOrphan.id);
      console.log('Delete orphan ID type:', typeof deleteOrphan.id);

      // Ensure the ID is a number
      const orphanId = Number(deleteOrphan.id);
      console.log('Converted orphan ID:', orphanId);

      if (isNaN(orphanId)) {
        toast({
          title: "خطأ في المعرف",
          description: "معرف اليتيم غير صحيح",
          variant: "destructive",
        });
        return;
      }

      deleteOrphanMutation.mutate(orphanId);
    }
  };

  const totalPages = Math.ceil(orphans.length / pageSize);
  const paginatedOrphans = orphans.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  if (familyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">اليتامى</h1>
            <p className="text-sm sm:text-base text-muted-foreground">إدارة بيانات اليتامى</p>
          </div>

          <Button onClick={handleAdd} className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <Plus className="h-4 w-4" />
            <span className="text-sm sm:text-base">إضافة يتيم جديد</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="mr-3 sm:mr-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">إجمالي اليتامى</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {totalOrphans}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                </div>
                <div className="mr-3 sm:mr-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">عدد الأيتام أقل من 18 سنة</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {orphans.filter((orphan: any) => {
                      const age = calculateAge(orphan.orphanBirthDate);
                      return age < 18;
                    }).length}
                  </p>
                  <p className="text-xs text-muted-foreground">من الأيتام</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">قائمة اليتامى ({orphans.length} فرد)</CardTitle>
          </CardHeader>
          <CardContent>
            {orphans.length > 0 ? (
              <>
                {/* Mobile Card Layout */}
                <div className="block sm:hidden space-y-4">
                  {paginatedOrphans.map((orphan: any) => (
                    <Card key={orphan.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-base">{orphan.orphanName}</h3>
                              <p className="text-sm text-muted-foreground">رقم الهوية: {orphan.orphanID || 'غير محدد'}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(orphan)}
                                className="p-2"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteClick(orphan)}
                                className="p-2"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">تاريخ الميلاد:</span>
                              <p className="font-medium">{orphan.orphanBirthDate}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">الجنس:</span>
                              <p className="font-medium">{getGenderInArabic(orphan.gender) || 'غير محدد'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">العمر:</span>
                              <Badge variant="outline" className="text-xs">{calculateDetailedAge(orphan.orphanBirthDate)}</Badge>
                            </div>
                            <div>
                              <span className="text-muted-foreground">حالة الوفاة:</span>
                              <p className="font-medium">
                                {orphan.martyrdomType === 'war_2023' && 'شهيد حرب ٢٠٢٣'}
                                {orphan.martyrdomType === 'pre_2023_war' && 'شهيد حرب ما قبل ذلك'}
                                {orphan.martyrdomType === 'natural_death' && 'وفاة طبيعية'}
                                {!orphan.martyrdomType && 'غير محدد'}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">اسم الوصي:</span>
                              <p className="font-medium">{orphan.guardianName}</p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">رقم الجوال:</span>
                              <p className="font-medium">{orphan.mobileNumber || 'غير محدد'}</p>
                            </div>
                            {/* Image field is currently hidden - will be enabled later */}
                            {/*
                            {orphan.image && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">الصورة:</span>
                                <div className="mt-1 flex justify-center">
                                  <img
                                    src={orphan.image}
                                    alt="صورة اليتيم"
                                    className="max-h-20 max-w-full object-contain border rounded"
                                  />
                                </div>
                              </div>
                            )}
                            */}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-background">
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">اسم اليتيم</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">رقم الهوية</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">تاريخ الميلاد</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">الجنس</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">العمر</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">حالة الوفاة</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">اسم الوصي</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">رقم الجوال</th>
                        {/* Image column is currently hidden - will be enabled later */}
                        {/* <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">الصورة</th> */}
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrphans.map((orphan: any) => (
                        <tr key={orphan.id}>
                          <td className="border border-gray-300 px-3 sm:px-4 py-2 text-sm">{orphan.orphanName}</td>
                          <td className="border border-gray-300 px-3 sm:px-4 py-2 text-sm">{orphan.orphanID || 'غير محدد'}</td>
                          <td className="border border-gray-300 px-3 sm:px-4 py-2 text-sm">{orphan.orphanBirthDate}</td>
                          <td className="border border-gray-300 px-3 sm:px-4 py-2 text-sm">
                            {getGenderInArabic(orphan.gender) || 'غير محدد'}
                          </td>
                          <td className="border border-gray-300 px-3 sm:px-4 py-2">
                            <Badge variant="outline" className="text-xs">{calculateDetailedAge(orphan.orphanBirthDate)}</Badge>
                          </td>
                          <td className="border border-gray-300 px-3 sm:px-4 py-2 text-sm">
                            {orphan.martyrdomType === 'war_2023' && 'شهيد حرب ٢٠٢٣'}
                            {orphan.martyrdomType === 'pre_2023_war' && 'شهيد حرب ما قبل ذلك'}
                            {orphan.martyrdomType === 'natural_death' && 'وفاة طبيعية'}
                            {!orphan.martyrdomType && 'غير محدد'}
                          </td>
                          <td className="border border-gray-300 px-3 sm:px-4 py-2 text-sm">{orphan.guardianName}</td>
                          <td className="border border-gray-300 px-3 sm:px-4 py-2 text-sm">{orphan.mobileNumber || 'غير محدد'}</td>
                          {/* Image cell is currently hidden - will be enabled later */}
                          {/*
                          <td className="border border-gray-300 px-3 sm:px-4 py-2 text-sm">
                            {orphan.image ? (
                              <img
                                src={orphan.image}
                                alt="صورة اليتيم"
                                className="max-h-12 max-w-full object-contain border rounded mx-auto"
                              />
                            ) : (
                              <span className="text-muted-foreground text-xs">لا توجد صورة</span>
                            )}
                          </td>
                          */}
                          <td className="border border-gray-300 px-3 sm:px-4 py-2">
                            <div className="flex space-x-1 sm:space-x-2 space-x-reverse">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(orphan)}
                                className="p-1.5 sm:p-2"
                              >
                                <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteClick(orphan)}
                                className="p-1.5 sm:p-2"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="text-sm"
                  >
                    السابق
                  </Button>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="text-sm min-w-[32px] h-8"
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
                    className="text-sm"
                  >
                    التالي
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Users className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm sm:text-base text-muted-foreground">لا توجد أيتام مسجلين</p>
                <Button onClick={handleAdd} className="mt-4 w-full sm:w-auto">
                  إضافة يتيم جديد
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto sm:w-full">
            <DialogHeader className="px-4 sm:px-6">
              <DialogTitle className="text-lg sm:text-xl font-bold text-center">
                {editingOrphan ? "تعديل بيانات اليتيم" : "إضافة يتيم جديد"}
              </DialogTitle>
            </DialogHeader>

            <div className="px-4 sm:px-6 py-4">
              <OrphanForm
                initialData={editingOrphan}
                onSubmit={onSubmit}
                onCancel={() => {
                  setIsDialogOpen(false);
                  setEditingOrphan(null);
                }}
                isLoading={createOrphanMutation.isPending || updateOrphanMutation.isPending}
                isEdit={!!editingOrphan}
              />
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="w-[95vw] max-w-md mx-auto sm:w-full">
            <AlertDialogHeader className="px-4 sm:px-6">
              <AlertDialogTitle className="text-lg sm:text-xl font-bold text-center">
                تأكيد الحذف
              </AlertDialogTitle>
              <AlertDialogDescription className="text-right text-sm sm:text-base">
                هل أنت متأكد من حذف اليتيم "{deleteOrphan?.orphanName}"؟
                <br />
                لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row justify-center gap-2 px-4 sm:px-6 pb-4 sm:pb-6">
              <AlertDialogCancel className="w-full sm:w-auto">إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteOrphanMutation.isPending}
              >
                {deleteOrphanMutation.isPending ? "جاري الحذف..." : "حذف"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}