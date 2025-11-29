import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Eye, Users, Search, Download, X, DownloadIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { calculateAge, getGenderInArabic, getRelationshipInArabic, calculateDetailedAge } from "@/lib/utils";
import { Separator } from "@radix-ui/react-separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ExcelJS from 'exceljs';
import { Checkbox } from "@/components/ui/checkbox";
import JSZip from 'jszip';

export default function AdminOrphans() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [martyrdomFilter, setMartyrdomFilter] = useState("all");
  const [orphanAgeMin, setOrphanAgeMin] = useState('');
  const [orphanAgeMax, setOrphanAgeMax] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteOrphan, setDeleteOrphan] = useState<any>(null);
  const [isExcelDialogOpen, setIsExcelDialogOpen] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  const [editingOrphan, setEditingOrphan] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewingOrphan, setViewingOrphan] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [isBulkDownloadDialogOpen, setIsBulkDownloadDialogOpen] = useState(false);
  const [archiveName, setArchiveName] = useState('');
  const [bulkDownloadFilters, setBulkDownloadFilters] = useState({
    searchTerm: '',
    statusFilter: 'all',
    martyrdomFilter: 'all',
    orphanAgeMin: '',
    orphanAgeMax: '',
  });

  const pageSize = 10;

  const { data: orphans, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/orphans"],
    queryFn: async () => {
      const response = await apiClient.get("/api/admin/orphans");
      return response.data;
    },
  });

  // Excel column configuration
  const excelColumns = useMemo(() => [
    { key: 'orphanName', label: 'اسم اليتيم', checked: true },
    { key: 'orphanBirthDate', label: 'تاريخ الميلاد', checked: true },
    { key: 'orphanID', label: 'رقم الهوية', checked: true },
    { key: 'gender', label: 'الجنس', checked: true },
    { key: 'guardianName', label: 'اسم الوصي', checked: true },
    { key: 'guardianID', label: 'رقم هوية الوصي', checked: true },
    { key: 'guardianBirthDate', label: 'تاريخ ميلاد الوصي', checked: true },
    { key: 'fatherName', label: 'اسم الاب', checked: true },
    { key: 'fatherID', label: 'رقم الهوية', checked: true },
    { key: 'martyrdomDate', label: 'تاريخ الاستشهاد', checked: true },
    { key: 'bankAccountNumber', label: 'رقم حساب البنك', checked: true },
    { key: 'accountHolderName', label: 'اسم صاحب الحساب', checked: true },
    { key: 'currentAddress', label: 'العنوان الحالي', checked: true },
    { key: 'originalAddress', label: 'العنوان الاصلي', checked: true },
    { key: 'mobileNumber', label: 'رقم الجوال', checked: true },
    { key: 'backupMobileNumber', label: 'رقم جوال احتياطي', checked: true },
    { key: 'orphansUnder18Count', label: 'عدد الأيتام تحت 18', checked: true },
    { key: 'image', label: 'الصورة', checked: true },
  ], []);

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
  }, [excelColumns]);

  const handleExcelColumnChange = (key: string) => {
    setCheckedColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    setCheckedColumns(Object.fromEntries(excelColumns.map(col => [col.key, true])));
  };

  const handleDeselectAll = () => {
    setCheckedColumns(Object.fromEntries(excelColumns.map(col => [col.key, false])));
  };

  const allOrphans = orphans || [];

  // Fetch families to link with orphans
  const { data: families, isLoading: familiesLoading } = useQuery({
    queryKey: ["/api/admin/families"],
    queryFn: async () => {
      const response = await apiClient.get("/api/admin/families");
      return response.data;
    },
  });

  // Apply filters
  const filteredOrphans = allOrphans.filter(orphan => {
    const matchesSearch = 
      orphan.orphanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orphan.orphanID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orphan.guardianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (orphan.family?.husbandName || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMartyrdom =
      martyrdomFilter === "all" ||
      orphan.martyrdomType === martyrdomFilter;

    // Age filter
    const matchesAge = (orphanAgeMin === '' && orphanAgeMax === '') ||
                       (orphan.orphanBirthDate ? (() => {
                         const today = new Date();
                         const birth = new Date(orphan.orphanBirthDate);
                         let age = today.getFullYear() - birth.getFullYear();
                         const m = today.getMonth() - birth.getMonth();
                         if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

                         const minAge = parseInt(orphanAgeMin) || 0;
                         const maxAge = parseInt(orphanAgeMax) || Infinity;

                         // If only min age is provided
                         if (orphanAgeMin !== '' && orphanAgeMax === '') {
                           return age >= minAge;
                         }
                         // If only max age is provided
                         if (orphanAgeMin === '' && orphanAgeMax !== '') {
                           return age <= maxAge;
                         }
                         // If both min and max are provided
                         if (orphanAgeMin !== '' && orphanAgeMax !== '') {
                           return age >= minAge && age <= maxAge;
                         }
                         // If no age filter is applied, return true
                         return true;
                       })() : false);

    return matchesSearch && matchesMartyrdom && matchesAge;
  });

  const totalOrphans = allOrphans.length;
  const currentOrphans = filteredOrphans.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredOrphans.length / pageSize);

  // Calculate filtered orphans for bulk download dialog
  const filteredOrphansWithImages = useMemo(() => {
    return allOrphans.filter(orphan => {
      const matchesSearch =
        orphan.orphanName.toLowerCase().includes(bulkDownloadFilters.searchTerm.toLowerCase()) ||
        orphan.orphanID?.toLowerCase().includes(bulkDownloadFilters.searchTerm.toLowerCase()) ||
        orphan.guardianName.toLowerCase().includes(bulkDownloadFilters.searchTerm.toLowerCase()) ||
        (orphan.family?.husbandName || "").toLowerCase().includes(bulkDownloadFilters.searchTerm.toLowerCase());

      const matchesMartyrdom =
        bulkDownloadFilters.martyrdomFilter === "all" ||
        orphan.martyrdomType === bulkDownloadFilters.martyrdomFilter;

      // Age filter
      const matchesAge = (bulkDownloadFilters.orphanAgeMin === '' && bulkDownloadFilters.orphanAgeMax === '') ||
                         (orphan.orphanBirthDate ? (() => {
                           const today = new Date();
                           const birth = new Date(orphan.orphanBirthDate);
                           let age = today.getFullYear() - birth.getFullYear();
                           const m = today.getMonth() - birth.getMonth();
                           if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

                           const minAge = parseInt(bulkDownloadFilters.orphanAgeMin) || 0;
                           const maxAge = parseInt(bulkDownloadFilters.orphanAgeMax) || Infinity;

                           // If only min age is provided
                           if (bulkDownloadFilters.orphanAgeMin !== '' && bulkDownloadFilters.orphanAgeMax === '') {
                             return age >= minAge;
                           }
                           // If only max age is provided
                           if (bulkDownloadFilters.orphanAgeMin === '' && bulkDownloadFilters.orphanAgeMax !== '') {
                             return age <= maxAge;
                           }
                           // If both min and max are provided
                           if (bulkDownloadFilters.orphanAgeMin !== '' && bulkDownloadFilters.orphanAgeMax !== '') {
                             return age >= minAge && age <= maxAge;
                           }
                           // If no age filter is applied, return true
                           return true;
                         })() : false);

      return matchesSearch && matchesMartyrdom && matchesAge;
    });
  }, [allOrphans, bulkDownloadFilters]);

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

  // Clean up image preview when component unmounts
  useEffect(() => {
    return () => {
      if (newImagePreview) {
        URL.revokeObjectURL(newImagePreview);
      }
    };
  }, []);

  const queryClient = useQueryClient();

  const deleteOrphanMutation = useMutation({
    mutationFn: async (orphanId: number) => {
      const response = await apiClient.delete(`/api/admin/orphans/${orphanId}`);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف بيانات اليتيم",
      });
      setIsDeleteDialogOpen(false);
      setDeleteOrphan(null);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الحذف",
        description: error.message || "حدث خطأ أثناء حذف بيانات اليتيم",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (orphan: any) => {
    setDeleteOrphan(orphan);
    setIsDeleteDialogOpen(true);
  };

  // Update orphan mutation
  const updateOrphanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiClient.put(`/api/admin/orphans/${id}`, data);
      return response.data;
    },
    onSuccess: (updatedOrphan) => {
      // Update the cache manually instead of invalidating
      queryClient.setQueryData(["/api/admin/orphans"], (oldData: any) => {
        if (oldData) {
          return oldData.map((orphan: any) =>
            orphan.id === updatedOrphan.id ? updatedOrphan : orphan
          );
        }
        return oldData;
      });

      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث بيانات اليتيم",
      });
      setIsEditDialogOpen(false);
      setEditingOrphan(null);
      refetch(); // Refresh the data to ensure consistency
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في التحديث",
        description: error.message || "حدث خطأ أثناء تحديث بيانات اليتيم",
        variant: "destructive",
      });
    },
  });

  // Create orphan mutation
  const createOrphanMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/api/admin/orphans', data);
      return response.data;
    },
    onSuccess: (newOrphan) => {
      // Update the cache to include the new orphan
      queryClient.setQueryData(["/api/admin/orphans"], (oldData: any) => {
        if (oldData) {
          return [...oldData, newOrphan];
        }
        return [newOrphan];
      });

      toast({
        title: "تمت الإضافة بنجاح",
        description: "تمت إضافة بيانات اليتيم الجديدة",
      });
      setIsEditDialogOpen(false);
      setEditingOrphan(null);
      refetch(); // Refresh the data to ensure consistency
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الإضافة",
        description: error.message || "حدث خطأ أثناء إضافة بيانات اليتيم",
        variant: "destructive",
      });
    },
  });

  const handleEditOrphan = (orphan: any) => {
    // Clean up previous preview if exists
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
      setNewImagePreview(null);
    }
    setEditingOrphan(orphan);
    setIsEditDialogOpen(true);
  };

  const handleAddOrphan = () => {
    // Clean up any previous preview
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
      setNewImagePreview(null);
    }
    // Initialize a new orphan object
    setEditingOrphan({
      id: null, // Will be null for new orphans
      familyId: '', // Initialize with empty familyId for selection
      orphanName: '',
      orphanBirthDate: '',
      orphanID: '',
      gender: '',
      guardianName: '',
      guardianID: '',
      guardianBirthDate: '',
      fatherName: '',
      fatherID: '',
      martyrdomDate: '',
      martyrdomType: '',
      bankAccountNumber: '',
      accountHolderName: '',
      currentAddress: '',
      originalAddress: '',
      mobileNumber: '',
      backupMobileNumber: '',
      orphansUnder18Count: 0,
      image: null
    });
    setIsEditDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteOrphan) {
      deleteOrphanMutation.mutate(deleteOrphan.id);
    }
  };

  // Function to export data to Excel
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('الأيتام', { views: [{ rightToLeft: true }] });

      // Define styles
      const titleStyle: Partial<ExcelJS.Style> = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } }, // Light green color (accent 6, lighter 60%)
        font: { color: { argb: 'FF000000' }, bold: true, size: 16 }, // Black text
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      const headerStyle: Partial<ExcelJS.Style> = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } }, // Light green color (accent 6, lighter 60%)
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

      // Get selected columns
      const selectedCols = excelColumns.filter(col => checkedColumns[col.key]);

      // Create title row
      const titleCells = Array(selectedCols.length).fill('');
      titleCells[0] = 'بيانات الأيتام (تصدير)';
      const titleRow = worksheet.addRow(titleCells);
      titleRow.height = 30;
      const lastColLetter = worksheet.getColumn(selectedCols.length).letter;
      worksheet.mergeCells(`A1:${lastColLetter}1`);
      titleRow.getCell(1).style = titleStyle;
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      // Create header row
      const headerRow = worksheet.addRow(selectedCols.map(col => col.label));
      headerRow.height = 30;
      headerRow.eachCell(cell => {
        cell.style = headerStyle;
        cell.alignment = {
          ...headerStyle.alignment,
          wrapText: true
        };
      });

      // Add data rows
      filteredOrphans.forEach(orphan => {
        const rowData = selectedCols.map(col => {
          switch (col.key) {
            case 'orphanName': return orphan.orphanName || '';
            case 'orphanBirthDate': return orphan.orphanBirthDate || '';
            case 'orphanID': return orphan.orphanID || '';
            case 'gender': return getGenderInArabic(orphan.gender) || '';
            case 'guardianName': return orphan.guardianName || '';
            case 'guardianID': return orphan.guardianID || '';
            case 'guardianBirthDate': return orphan.guardianBirthDate || '';
            case 'fatherName': return orphan.fatherName || '';
            case 'fatherID': return orphan.fatherID || '';
            case 'martyrdomDate': return orphan.martyrdomDate || '';
            case 'bankAccountNumber': return orphan.bankAccountNumber || '';
            case 'accountHolderName': return orphan.accountHolderName || '';
            case 'currentAddress': return orphan.currentAddress || '';
            case 'originalAddress': return orphan.originalAddress || '';
            case 'mobileNumber': return orphan.mobileNumber || '';
            case 'backupMobileNumber': return orphan.backupMobileNumber || '';
            case 'orphansUnder18Count':
              return orphan.orphansUnder18Count || 0;
            case 'image':
              // Return Arabic text "موجود" if image exists, otherwise empty string
              return orphan.image ? 'موجود' : '';
            default: return '';
          }
        });

        const row = worksheet.addRow(rowData);
        row.height = 25;
        row.eachCell(cell => {
          cell.style = dataStyle;
          cell.alignment = {
            ...dataStyle.alignment,
            wrapText: true
          };
        });
      });

      // Auto-adjust column widths
      const columnWidths = (colKey: string): number => {
        // Extra wide columns for names and addresses
        if (colKey.includes('Name') || colKey.includes('name') ||
            colKey.includes('اسم') || colKey.includes('Address') ||
            colKey.includes('address') || colKey.includes('address') ||
            colKey.includes('accountHolderName')) {
          return 30;
        }
        // Wide columns for dates and IDs
        else if (colKey.includes('Date') || colKey.includes('date') ||
                 colKey.includes('ID') || colKey.includes('id') ||
                 colKey.includes('BirthDate') || colKey.includes('martyrdom')) {
          return 20;
        }
        // Medium columns for phone numbers
        else if (colKey.includes('Phone') || colKey.includes('phone') ||
                 colKey.includes('Mobile') || colKey.includes('mobile')) {
          return 18;
        }
        // Default width
        else {
          return 15;
        }
      };

      selectedCols.forEach((_, index) => {
        worksheet.getColumn(index + 1).width = columnWidths(selectedCols[index].key);
      });

      // Generate and download the file
      let fileName;
      if (customFileName.trim()) {
        // Use custom filename and ensure it has .xlsx extension
        fileName = customFileName.trim().endsWith('.xlsx') ? customFileName.trim() : customFileName.trim() + '.xlsx';
      } else {
        fileName = `orphans_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      }
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "تم التصدير بنجاح",
        description: `تم حفظ ملف Excel باسم: ${fileName}`,
      });
      // Reset custom filename after successful export
      setCustomFileName('');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير البيانات إلى Excel",
        variant: "destructive",
      });
    }
  };

  const handleBulkDownload = async () => {
    try {
      // Apply the same filters as in the main UI
      const filteredOrphans = allOrphans.filter(orphan => {
        const matchesSearch =
          orphan.orphanName.toLowerCase().includes(bulkDownloadFilters.searchTerm.toLowerCase()) ||
          orphan.orphanID?.toLowerCase().includes(bulkDownloadFilters.searchTerm.toLowerCase()) ||
          orphan.guardianName.toLowerCase().includes(bulkDownloadFilters.searchTerm.toLowerCase()) ||
          (orphan.family?.husbandName || "").toLowerCase().includes(bulkDownloadFilters.searchTerm.toLowerCase());

        const matchesMartyrdom =
          bulkDownloadFilters.martyrdomFilter === "all" ||
          orphan.martyrdomType === bulkDownloadFilters.martyrdomFilter;

        // Age filter
        const matchesAge = (bulkDownloadFilters.orphanAgeMin === '' && bulkDownloadFilters.orphanAgeMax === '') ||
                           (orphan.orphanBirthDate ? (() => {
                             const today = new Date();
                             const birth = new Date(orphan.orphanBirthDate);
                             let age = today.getFullYear() - birth.getFullYear();
                             const m = today.getMonth() - birth.getMonth();
                             if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

                             const minAge = parseInt(bulkDownloadFilters.orphanAgeMin) || 0;
                             const maxAge = parseInt(bulkDownloadFilters.orphanAgeMax) || Infinity;

                             // If only min age is provided
                             if (bulkDownloadFilters.orphanAgeMin !== '' && bulkDownloadFilters.orphanAgeMax === '') {
                               return age >= minAge;
                             }
                             // If only max age is provided
                             if (bulkDownloadFilters.orphanAgeMin === '' && bulkDownloadFilters.orphanAgeMax !== '') {
                               return age <= maxAge;
                             }
                             // If both min and max are provided
                             if (bulkDownloadFilters.orphanAgeMin !== '' && bulkDownloadFilters.orphanAgeMax !== '') {
                               return age >= minAge && age <= maxAge;
                             }
                             // If no age filter is applied, return true
                             return true;
                           })() : false);

        return matchesSearch && matchesMartyrdom && matchesAge;
      });

      // Filter to only include orphans with images
      const orphansWithImages = filteredOrphans.filter(orphan => orphan.image);

      if (orphansWithImages.length === 0) {
        toast({
          title: "لا توجد صور لتنزيلها",
          description: "لا توجد أيتام مطابقين للفلاتر المحددة يمتلكون صوراً",
          variant: "destructive",
        });
        return;
      }

      // Create a new zip file
      const zip = new JSZip();

      // Progress feedback
      toast({
        title: "جاري إعداد الأرشيف",
        description: `جاري تنزيل ${orphansWithImages.length} صورة`,
      });

      // Group orphans by guardian
      const orphansByGuardian: { [key: string]: any[] } = {};
      orphansWithImages.forEach(orphan => {
        const guardianName = orphan.guardianName || 'غير محدد';
        if (!orphansByGuardian[guardianName]) {
          orphansByGuardian[guardianName] = [];
        }
        orphansByGuardian[guardianName].push(orphan);
      });

      // Add each orphan's image to the appropriate folder structure
      for (const [guardianName, orphans] of Object.entries(orphansByGuardian)) {
        // Sanitize guardian name for folder name
        const sanitizedGuardianName = guardianName.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
        const guardianFolder = zip.folder(sanitizedGuardianName);

        for (const orphan of orphans) {
          if (orphan.image) {
            // Extract image data from base64 or URL
            let imageData: Uint8Array | null;
            let imageType = 'jpg'; // Default

            if (orphan.image.startsWith('data:')) {
              // Base64 image - convert to binary data for JSZip
              const imageDataParts = orphan.image.split(';base64,');
              if (imageDataParts.length === 2) {
                try {
                  // Extract base64 string and convert to binary data
                  const base64String = imageDataParts[1];
                  // Remove any whitespace or newlines
                  const cleanBase64String = base64String.replace(/\s/g, '');

                  // Convert base64 to binary data for JSZip
                  const binaryString = atob(cleanBase64String);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }

                  imageData = bytes;

                  // Extract image type from base64 header
                  const imageTypeMatch = orphan.image.match(/^data:image\/(\w+)/);
                  if (imageTypeMatch) {
                    imageType = imageTypeMatch[1];
                  }
                } catch (error) {
                  console.error(`Error decoding base64 image for orphan ${orphan.orphanName}:`, error);
                  continue; // Skip this image
                }
              }
            } else {
              // If it's a URL, fetch it
              try {
                const response = await fetch(orphan.image);
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                imageData = new Uint8Array(arrayBuffer);

                // Extract image type from the URL if possible
                // First try to get it from the URL file extension
                const urlExtension = response.url.match(/\.(\w+)(?:[?#]|$)/);
                if (urlExtension && urlExtension[1]) {
                  imageType = urlExtension[1].toLowerCase();
                } else {
                  // Default image type if not determinable
                  imageType = 'jpg';
                }
              } catch (error) {
                console.error(`Error fetching image for orphan ${orphan.orphanName}:`, error);
                continue; // Skip this image
              }
            }

            if (imageData && imageData.length > 0) {
              // Sanitize orphan name for folder name
              const sanitizedOrphanName = orphan.orphanName.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
              // Create a folder for the orphan and add the image
              const orphanFolder = guardianFolder!.folder(sanitizedOrphanName);
              orphanFolder!.file(`image.${imageType}`, imageData, { binary: true });
            }
          }
        }
      }

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${archiveName || 'صور_الأيتام'}_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "تم تنزيل الأرشيف بنجاح",
        description: `تم إنشاء أرشيف يحتوي على ${orphansWithImages.length} صورة`,
      });

      // Close the dialog
      setIsBulkDownloadDialogOpen(false);
      setArchiveName('');
    } catch (error) {
      console.error('Error in bulk download:', error);
      toast({
        title: "خطأ في تنزيل الصور",
        description: "حدث خطأ أثناء تنزيل صور الأيتام",
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

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">إدارة اليتامى</h1>
            <p className="text-sm sm:text-base text-muted-foreground">عرض وتعديل بيانات جميع الأيتام في النظام</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button onClick={handleAddOrphan} className="flex items-center gap-2 justify-center bg-green-600 hover:bg-green-700 text-white">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">إضافة يتيم</span>
              <span className="sm:hidden">إضافة</span>
            </Button>
            <Button onClick={() => setIsExcelDialogOpen(true)} variant="outline" className="flex items-center gap-2 justify-center">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">تصدير إلى Excel</span>
              <span className="sm:hidden">تصدير</span>
            </Button>
            <Button
              onClick={() => setIsBulkDownloadDialogOpen(true)}
              variant="outline"
              className="flex items-center gap-2 justify-center"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">تنزيل الصور</span>
              <span className="sm:hidden">صور</span>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center">
                <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div className="mr-3 md:mr-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">إجمالي اليتامى</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{totalOrphans}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center">
                <div className="p-2 md:p-3 bg-yellow-100 rounded-lg">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" />
                </div>
                <div className="mr-3 sm:mr-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">اليتامى أقل من 18 سنة</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {allOrphans.filter((orphan: any) => {
                      const age = calculateAge(orphan.orphanBirthDate);
                      return age < 18;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center">
                <div className="p-2 md:p-3 bg-red-100 rounded-lg">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
                </div>
                <div className="mr-3 sm:mr-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">شهداء حرب ٢٠٢٣</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {allOrphans.filter((orphan: any) => orphan.martyrdomType === 'war_2023').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center">
                <div className="p-2 md:p-3 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                </div>
                <div className="mr-3 sm:mr-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">شهداء أخرون</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {allOrphans.filter((orphan: any) => 
                      orphan.martyrdomType === 'pre_2023_war' || orphan.martyrdomType === 'natural_death'
                    ).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="بحث باسم اليتيم أو رقم الهوية أو اسم الوصي أو اسم رب الأسرة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={martyrdomFilter} onValueChange={setMartyrdomFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="نوع الوفاة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل حالات الوفاة</SelectItem>
                    <SelectItem value="war_2023">شهيد حرب ٢٠٢٣</SelectItem>
                    <SelectItem value="pre_2023_war">شهيد حرب ما قبل ٢٠٢٣</SelectItem>
                    <SelectItem value="natural_death">وفاة طبيعية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Age Filter Section */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-right mb-1">من عمر</label>
                  <Input
                    type="number"
                    min="0"
                    max="150"
                    value={orphanAgeMin}
                    onChange={(e) => setOrphanAgeMin(e.target.value)}
                    placeholder="العمر الأدنى"
                    className="w-full text-right"
                  />
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-right mb-1">إلى عمر</label>
                  <Input
                    type="number"
                    min="0"
                    max="150"
                    value={orphanAgeMax}
                    onChange={(e) => setOrphanAgeMax(e.target.value)}
                    placeholder="العمر الأعلى"
                    className="w-full text-right"
                  />
                </div>

                {(orphanAgeMin || orphanAgeMax) && (
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => { setOrphanAgeMin(''); setOrphanAgeMax(''); }}
                      className="w-full"
                    >
                      مسح
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground">
                تم العثور على {filteredOrphans.length} {filteredOrphans.length === 1 ? "يتيم" : "أيتام"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orphans List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>قائمة الأيتام ({filteredOrphans.length} فرد)</span>
              <span className="text-sm font-normal text-muted-foreground">
                عرض {currentOrphans.length} من {filteredOrphans.length} {filteredOrphans.length === 1 ? "يتيم" : "أيتام"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentOrphans.length > 0 ? (
              <>
                {/* Mobile Card Layout */}
                <div className="block sm:hidden space-y-4">
                  {currentOrphans.map((orphan: any) => (
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
                                onClick={() => handleEditOrphan(orphan)}
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
                              <span className="text-muted-foreground">رقم هوية الوصي:</span>
                              <p className="font-medium">{orphan.guardianID || 'غير محدد'}</p>
                            </div>

                            <div>
                              <span className="text-muted-foreground">اسم الأسرة:</span>
                              <p className="font-medium">{orphan.family?.husbandName || 'غير محدد'}</p>
                            </div>

                            <div>
                              <span className="text-muted-foreground">اسم الأب:</span>
                              <p className="font-medium">{orphan.fatherName || 'غير محدد'}</p>
                            </div>

                            <div>
                              <span className="text-muted-foreground">تاريخ الاستشهاد:</span>
                              <p className="font-medium">{orphan.martyrdomDate || 'غير محدد'}</p>
                            </div>

                            <div>
                              <span className="text-muted-foreground">رقم الجوال:</span>
                              <p className="font-medium">{orphan.mobileNumber || 'غير محدد'}</p>
                            </div>

                            {orphan.image && (
                              <div>
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
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">تاريخ الميلاد</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">رقم الهوية</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">اسم الوصي</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">رقم الجوال</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">الصورة</th>
                        <th className="border border-gray-300 px-3 sm:px-4 py-2 text-right font-medium text-muted-foreground text-sm">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentOrphans.map((orphan: any) => (
                        <tr key={orphan.id} className="hover:bg-muted">
                          <td className="border border-gray-300 px-3 sm:px-4 py-2 text-sm">{orphan.orphanName}</td>
                          <td className="border border-gray-300 px-3 sm:px-4 py-2 text-sm">{orphan.orphanBirthDate}</td>
                          <td className="border border-gray-300 px-3 sm:px-4 py-2 text-sm">{orphan.orphanID || 'غير محدد'}</td>
                          <td className="border border-gray-300 px-3 sm:px-4 py-2 text-sm">{orphan.guardianName || 'غير محدد'}</td>
                          <td className="border border-gray-300 px-3 sm:px-4 py-2 text-sm">{orphan.mobileNumber || 'غير محدد'}</td>
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
                          <td className="border border-gray-300 px-3 sm:px-4 py-2 text-sm">
                            <div className="flex space-x-1 sm:space-x-2 space-x-reverse">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditOrphan(orphan)}
                                className="p-1.5 sm:p-2"
                              >
                                <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setViewingOrphan(orphan);
                                  setIsViewDialogOpen(true);
                                }}
                                className="p-1.5 sm:p-2"
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
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
                <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="text-sm"
                  >
                    السابق
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="text-sm min-w-[32px] h-8"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
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
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد أيتام مسجلين</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="w-[95vw] max-w-md mx-auto sm:w-full">
            <AlertDialogHeader className="px-4 sm:px-6">
              <AlertDialogTitle className="text-lg sm:text-xl font-bold text-center">
                تأكيد الحذف
              </AlertDialogTitle>
              <AlertDialogDescription className="text-right text-sm sm:text-base">
                هل أنت متأكد من حذف اليتيم "{deleteOrphan?.orphanName}" من الأسرة "{deleteOrphan?.family?.husbandName}"؟
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
          <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] overflow-y-auto">
            <DialogHeader className="px-4 sm:px-6">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                <Download className="h-5 w-5" />
                <span>تصدير بيانات الأيتام إلى Excel</span>
              </DialogTitle>
              <div className="text-sm text-muted-foreground text-center">
                {filteredOrphans.length} {filteredOrphans.length === 1 ? 'يتيم' : 'أيتام'} سيتم تصديرها
              </div>
              <p className="text-sm text-muted-foreground text-right">
                حدد الأعمدة التي ترغب في تضمينها في التصدير
              </p>
            </DialogHeader>

            <div className="px-4 sm:px-6 py-4">
              {/* Results Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-center text-blue-800 font-medium">
                  سيتم تصدير {filteredOrphans.length} {filteredOrphans.length === 1 ? 'يتيم' : 'أيتام'}
                </p>
              </div>

              <div className="flex justify-end gap-2 mb-4">
                <Button type="button" variant="outline" onClick={handleSelectAll} className="text-sm">
                  تحديد الكل
                </Button>
                <Button type="button" variant="outline" onClick={handleDeselectAll} className="text-sm">
                  إلغاء التحديد
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4" dir="rtl">
                {excelColumns.map((col) => (
                  <label
                    key={col.key}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all select-none shadow-sm ${
                      checkedColumns[col.key] ? 'bg-green-50 border-green-500 text-green-800 font-bold ring-2 ring-green-200' : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
                    }`}
                  >
                    <Checkbox
                      checked={checkedColumns[col.key]}
                      onCheckedChange={() => handleExcelColumnChange(col.key)}
                      className="data-[state=checked]:bg-green-600 data-[state=checked]:text-white"
                    />
                    <span className="text-sm">{col.label}</span>
                  </label>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-right mb-2">
                  اسم ملف التصدير (اختياري)
                </label>
                <Input
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder="أدخل اسم الملف (مثلاً: الأيتام_المسجلين_٢٠٢٥)"
                  className="w-full text-right"
                />
              </div>

              <div className="flex justify-end mt-4">
                <Button onClick={exportToExcel} className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  تصدير إلى Excel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Orphan Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] overflow-y-auto">
            <DialogHeader className="px-4 sm:px-6">
              <DialogTitle className="text-lg sm:text-xl font-bold text-center">
                {editingOrphan?.id ? " تعديل بيانات اليتيم" : "إضافة يتيم جديد"}
              </DialogTitle>
            </DialogHeader>

            <div className="px-4 sm:px-6 py-4">
              {editingOrphan && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="orphanName" className="text-sm font-medium">اسم اليتيم *</Label>
                      <Input
                        id="orphanName"
                        value={editingOrphan.orphanName || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, orphanName: e.target.value})}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="orphanID" className="text-sm font-medium">رقم هوية اليتيم</Label>
                      <Input
                        id="orphanID"
                        value={editingOrphan.orphanID || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, orphanID: e.target.value})}
                        className="mt-1 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="orphanBirthDate" className="text-sm font-medium">تاريخ ميلاد اليتيم *</Label>
                      <Input
                        id="orphanBirthDate"
                        type="date"
                        value={editingOrphan.orphanBirthDate || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, orphanBirthDate: e.target.value})}
                        className="mt-1 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="gender" className="text-sm font-medium">الجنس</Label>
                      <select
                        id="gender"
                        value={editingOrphan.gender || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, gender: e.target.value})}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 mt-1 text-right"
                        dir="rtl"
                      >
                        <option value="">اختر الجنس</option>
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="guardianName" className="text-sm font-medium">اسم الوصي *</Label>
                      <Input
                        id="guardianName"
                        value={editingOrphan.guardianName || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, guardianName: e.target.value})}
                        className="mt-1 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="guardianID" className="text-sm font-medium">رقم هوية الوصي *</Label>
                      <Input
                        id="guardianID"
                        value={editingOrphan.guardianID || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, guardianID: e.target.value})}
                        className="mt-1 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="guardianBirthDate" className="text-sm font-medium">تاريخ ميلاد الوصي *</Label>
                      <Input
                        id="guardianBirthDate"
                        type="date"
                        value={editingOrphan.guardianBirthDate || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, guardianBirthDate: e.target.value})}
                        className="mt-1 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="fatherName" className="text-sm font-medium">اسم الأب</Label>
                      <Input
                        id="fatherName"
                        value={editingOrphan.fatherName || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, fatherName: e.target.value})}
                        className="mt-1 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="fatherID" className="text-sm font-medium">رقم هوية الأب</Label>
                      <Input
                        id="fatherID"
                        value={editingOrphan.fatherID || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, fatherID: e.target.value})}
                        className="mt-1 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="martyrdomDate" className="text-sm font-medium">تاريخ الاستشهاد</Label>
                      <Input
                        id="martyrdomDate"
                        type="date"
                        value={editingOrphan.martyrdomDate || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, martyrdomDate: e.target.value})}
                        className="mt-1 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="martyrdomType" className="text-sm font-medium">نوع الوفاة</Label>
                      <select
                        id="martyrdomType"
                        value={editingOrphan.martyrdomType || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, martyrdomType: e.target.value})}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 mt-1 text-right"
                        dir="rtl"
                      >
                        <option value="">اختر نوع الوفاة</option>
                        <option value="war_2023">شهيد حرب ٢٠٢٣</option>
                        <option value="pre_2023_war">شهيد حرب ما قبل ذلك</option>
                        <option value="natural_death">وفاة طبيعية</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="familyId" className="text-sm font-medium">العائلة</Label>
                      <select
                        id="familyId"
                        value={editingOrphan.familyId || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, familyId: e.target.value ? parseInt(e.target.value) : null})}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 mt-1 text-right"
                        dir="rtl"
                        disabled={familiesLoading}
                      >
                        <option value="">اختر عائلة...</option>
                        {families?.map((family: any) => (
                          <option key={family.id} value={family.id}>
                            {family.husbandName} ({family.husbandID})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="bankAccountNumber" className="text-sm font-medium">رقم حساب البنك</Label>
                      <Input
                        id="bankAccountNumber"
                        value={editingOrphan.bankAccountNumber || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, bankAccountNumber: e.target.value})}
                        className="mt-1 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="accountHolderName" className="text-sm font-medium">اسم صاحب الحساب</Label>
                      <Input
                        id="accountHolderName"
                        value={editingOrphan.accountHolderName || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, accountHolderName: e.target.value})}
                        className="mt-1 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="currentAddress" className="text-sm font-medium">العنوان الحالي</Label>
                      <Input
                        id="currentAddress"
                        value={editingOrphan.currentAddress || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, currentAddress: e.target.value})}
                        className="mt-1 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="originalAddress" className="text-sm font-medium">العنوان الأصلي</Label>
                      <Input
                        id="originalAddress"
                        value={editingOrphan.originalAddress || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, originalAddress: e.target.value})}
                        className="mt-1 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="mobileNumber" className="text-sm font-medium">رقم الجوال</Label>
                      <Input
                        id="mobileNumber"
                        value={editingOrphan.mobileNumber || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, mobileNumber: e.target.value})}
                        className="mt-1 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="backupMobileNumber" className="text-sm font-medium">رقم الجوال الاحتياطي</Label>
                      <Input
                        id="backupMobileNumber"
                        value={editingOrphan.backupMobileNumber || ""}
                        onChange={(e) => setEditingOrphan({...editingOrphan, backupMobileNumber: e.target.value})}
                        className="mt-1 text-right"
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="uploadImage" className="text-sm font-medium">رفع صورة اليتيم</Label>
                      <div className="mt-1">
                        <Input
                          id="uploadImage"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          dir="rtl"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Create preview for the selected file
                              const previewUrl = URL.createObjectURL(file);
                              setNewImagePreview(previewUrl);

                              // Convert image to base64 for sending to backend
                              const reader = new FileReader();
                              reader.onload = () => {
                                setEditingOrphan({...editingOrphan, image: reader.result as string});
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => document.getElementById('uploadImage')?.click()}
                        >
                          <span className="text-right flex-1">
                            {editingOrphan?.image ? 'تم اختيار ملف' : 'اختر ملف'}
                          </span>
                          <span className="text-xs text-muted-foreground mr-2">...</span>
                        </Button>
                      </div>
                    </div>

                    <div>
                      {(editingOrphan.image || newImagePreview) && (
                        <div>
                          <Label className="text-sm text-muted-foreground">معاينة الصورة:</Label>
                          <div className="mt-1 flex justify-center items-center">
                            <img
                              src={newImagePreview || editingOrphan.image}
                              alt="معاينة صورة اليتيم"
                              className="max-h-32 max-w-full object-contain border rounded"
                              onError={() => {
                                // If there's an error loading the preview, fallback to the original image
                                if (newImagePreview) {
                                  setNewImagePreview(null);
                                }
                              }}
                            />
                          </div>
                          {newImagePreview && (
                            <div className="text-xs text-muted-foreground text-center mt-1">
                              هذه معاينة للصورة المحددة حديثاً
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Clean up the preview URL to prevent memory leaks
                        if (newImagePreview) {
                          URL.revokeObjectURL(newImagePreview);
                          setNewImagePreview(null);
                        }
                        setIsEditDialogOpen(false);
                      }}
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        // Clean up the preview URL after successful update
                        if (newImagePreview) {
                          URL.revokeObjectURL(newImagePreview);
                          setNewImagePreview(null);
                        }

                        // Determine whether to create or update
                        if (editingOrphan.id) {
                          // Update existing orphan
                          updateOrphanMutation.mutate({id: editingOrphan.id, data: editingOrphan});
                        } else {
                          // Create new orphan
                          createOrphanMutation.mutate(editingOrphan);
                        }
                      }}
                      disabled={editingOrphan.id ? updateOrphanMutation.isPending : createOrphanMutation.isPending}
                    >
                      {editingOrphan.id
                        ? (updateOrphanMutation.isPending ? "جاري التحديث..." : "تحديث")
                        : (createOrphanMutation.isPending ? "جاري الإضافة..." : "إضافة")
                      }
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* View Orphan Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] overflow-y-auto">
            <DialogHeader className="px-4 sm:px-6">
              <DialogTitle className="text-lg sm:text-xl font-bold text-center">
                عرض بيانات اليتيم
              </DialogTitle>
            </DialogHeader>

            <div className="px-4 sm:px-6 py-4">
              {viewingOrphan && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">اسم اليتيم</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.orphanName || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">رقم هوية اليتيم</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.orphanID || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">تاريخ ميلاد اليتيم</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.orphanBirthDate || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">الجنس</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">
                        {getGenderInArabic(viewingOrphan.gender) || 'غير محدد'}
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">اسم الوصي</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.guardianName || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">رقم هوية الوصي</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.guardianID || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">تاريخ ميلاد الوصي</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.guardianBirthDate || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">اسم الأب</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.fatherName || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">رقم هوية الأب</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.fatherID || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">تاريخ الاستشهاد</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.martyrdomDate || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">نوع الوفاة</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">
                        {viewingOrphan.martyrdomType === 'war_2023' ? 'شهيد حرب ٢٠٢٣' :
                         viewingOrphan.martyrdomType === 'pre_2023_war' ? 'شهيد حرب ما قبل ذلك' :
                         viewingOrphan.martyrdomType === 'natural_death' ? 'وفاة طبيعية' : 'غير محدد'}
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">رقم حساب البنك</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.bankAccountNumber || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">اسم صاحب الحساب</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.accountHolderName || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">العنوان الحالي</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.currentAddress || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">العنوان الأصلي</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.originalAddress || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">رقم الجوال</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.mobileNumber || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">رقم الجوال الاحتياطي</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.backupMobileNumber || 'غير محدد'}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">العائلة</Label>
                      <p className="mt-1 p-2 bg-muted rounded text-sm">{viewingOrphan.family?.husbandName || 'غير محدد'}</p>
                    </div>

                    {viewingOrphan.image && (
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium">صورة اليتيم</Label>
                        <div className="mt-1 flex justify-center">
                          <img
                            src={viewingOrphan.image}
                            alt="صورة اليتيم"
                            className="max-h-40 max-w-full object-contain border rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsViewDialogOpen(false)}
                    >
                      إغلاق
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Download Images Dialog */}
        <Dialog open={isBulkDownloadDialogOpen} onOpenChange={setIsBulkDownloadDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] w-[95vw] overflow-y-auto">
            <DialogHeader className="px-4 sm:px-6">
              <DialogTitle className="text-lg sm:text-xl font-bold text-center">
                تنزيل صور الأيتام
              </DialogTitle>
              <div className="text-center text-sm text-muted-foreground">
                {filteredOrphansWithImages.length} {filteredOrphansWithImages.length === 1 ? 'يتيم' : 'أيتام'} مطابق للبحث
                {filteredOrphansWithImages.length > 0 ? ` (${filteredOrphansWithImages.filter(o => o.image).length} مع صور)` : ''}
              </div>
            </DialogHeader>

            <div className="px-4 sm:px-6 py-4">
              <div className="space-y-6">
                {/* Filters Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-right"> الفلاتر </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bulkSearchTerm" className="text-sm font-medium">بحث</Label>
                      <Input
                        id="bulkSearchTerm"
                        placeholder="بحث باسم اليتيم أو رقم الهوية أو اسم الوصي..."
                        value={bulkDownloadFilters.searchTerm}
                        onChange={(e) => setBulkDownloadFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                        className="mt-1 text-right"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bulkMartyrdomFilter" className="text-sm font-medium">نوع الوفاة</Label>
                      <Select
                        value={bulkDownloadFilters.martyrdomFilter}
                        onValueChange={(value) => setBulkDownloadFilters(prev => ({ ...prev, martyrdomFilter: value }))}
                      >
                        <SelectTrigger className="w-full text-right">
                          <SelectValue placeholder="اختر نوع الوفاة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">كل حالات الوفاة</SelectItem>
                          <SelectItem value="war_2023">شهيد حرب ٢٠٢٣</SelectItem>
                          <SelectItem value="pre_2023_war">شهيد حرب ما قبل ٢٠٢٣</SelectItem>
                          <SelectItem value="natural_death">وفاة طبيعية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="orphanAgeMin" className="text-sm font-medium">من عمر</Label>
                      <Input
                        type="number"
                        min="0"
                        max="150"
                        id="orphanAgeMin"
                        value={bulkDownloadFilters.orphanAgeMin}
                        onChange={(e) => setBulkDownloadFilters(prev => ({ ...prev, orphanAgeMin: e.target.value }))}
                        placeholder="العمر الأدنى"
                        className="mt-1 text-right"
                      />
                    </div>

                    <div>
                      <Label htmlFor="orphanAgeMax" className="text-sm font-medium">إلى عمر</Label>
                      <Input
                        type="number"
                        min="0"
                        max="150"
                        id="orphanAgeMax"
                        value={bulkDownloadFilters.orphanAgeMax}
                        onChange={(e) => setBulkDownloadFilters(prev => ({ ...prev, orphanAgeMax: e.target.value }))}
                        placeholder="العمر الأعلى"
                        className="mt-1 text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Archive Name Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-right"> إعدادات الأرشيف </h3>
                  <div>
                    <Label htmlFor="archiveName" className="text-sm font-medium">اسم الأرشيف</Label>
                    <Input
                      id="archiveName"
                      placeholder="أدخل اسم الأرشيف"
                      value={archiveName}
                      onChange={(e) => setArchiveName(e.target.value)}
                      className="mt-1 text-right"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsBulkDownloadDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="button"
                    onClick={handleBulkDownload}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    تنزيل الصور
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </PageWrapper>
  );
}