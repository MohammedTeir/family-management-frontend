import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Search, User, Baby, FileText, Download } from "lucide-react";
import { Link } from "wouter";
import { apiClient } from "@/lib/api";
import { getGenderInArabic, getRelationshipInArabic, calculateDetailedAge, getBranchInArabic, getSocialStatusInArabic } from "@/lib/utils";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import ExcelJS from 'exceljs';

export default function AdminMembers() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [memberAgeMin, setMemberAgeMin] = useState("");
  const [memberAgeMax, setMemberAgeMax] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [relationshipFilter, setRelationshipFilter] = useState("all");
  const [disabilityFilter, setDisabilityFilter] = useState("all");
  const [chronicIllnessFilter, setChronicIllnessFilter] = useState("all");
  const [memberTypeFilter, setMemberTypeFilter] = useState("all"); // member or orphan
  const [branchFilter, setBranchFilter] = useState("all"); // family branch
  const [familyStatusFilter, setFamilyStatusFilter] = useState("all"); // family social status
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { data: families, isLoading: familiesLoading } = useQuery({
    queryKey: ["/api/admin/families"],
  });

  const { data: orphans, isLoading: orphansLoading } = useQuery({
    queryKey: ["/api/admin/orphans"],
  });

  // Process and flatten members and orphans data
  const allMembers = useMemo(() => {
    let members = [];

    // Process family members
    if (Array.isArray(families)) {
      families.forEach((family) => {
        if (Array.isArray(family.members)) {
          family.members.forEach((member) => {
            // Calculate age
            let age = 0;
            if (member.birthDate) {
              const today = new Date();
              const birth = new Date(member.birthDate);
              age = today.getFullYear() - birth.getFullYear();
              const m = today.getMonth() - birth.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            }

            members.push({
              ...member,
              familyId: family.id,
              familyName: family.husbandName,
              familyPrimaryPhone: family.primaryPhone,
              branch: family.branch,
              socialStatus: family.socialStatus,
              age,
              type: 'member', // Distinguish from orphans
              disabilityType: member.isDisabled ? member.disabilityType || 'غير محدد' : '',
              chronicIllnessType: member.hasChronicIllness ? member.chronicIllnessType || 'غير محدد' : '',
            });
          });
        }
      });
    }

    // Process orphans
    if (Array.isArray(orphans)) {
      orphans.forEach((orphan) => {
        // Calculate age
        let age = 0;
        if (orphan.orphanBirthDate) {
          const today = new Date();
          const birth = new Date(orphan.orphanBirthDate);
          age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        }

        // Find the family associated with this orphan to get branch and social status
        const associatedFamily = Array.isArray(families) ? families.find(family => family.id === orphan.familyId) : null;

        members.push({
          id: orphan.id,
          fullName: orphan.orphanName,
          memberID: orphan.orphanID,
          birthDate: orphan.orphanBirthDate,
          gender: orphan.gender,
          isDisabled: Boolean(orphan.isDisabled),
          hasChronicIllness: Boolean(orphan.hasChronicIllness),
          disabilityType: orphan.isDisabled ? orphan.disabilityType || 'غير محدد' : '',
          chronicIllnessType: orphan.hasChronicIllness ? orphan.chronicIllnessType || 'غير محدد' : '',
          familyId: orphan.familyId,
          familyName: associatedFamily?.husbandName || 'غير محدد',
          familyPrimaryPhone: associatedFamily?.primaryPhone,
          branch: associatedFamily?.branch || 'غير محدد',
          socialStatus: associatedFamily?.socialStatus || 'غير محدد',
          age,
          type: 'orphan', // Distinguish from members
          relationship: 'orphan', // For consistency in UI
        });
      });
    }

    return members;
  }, [families, orphans]);

  const isLoading = familiesLoading || orphansLoading;

  // Apply filters to members
  const filteredMembers = useMemo(() => {
    return allMembers.filter((member) => {
      // Search filter
      const matchesSearch = 
        searchTerm === "" ||
        member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.memberID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.familyName?.toLowerCase().includes(searchTerm.toLowerCase());

      // Gender filter
      const matchesGender = 
        genderFilter === "all" || 
        member.gender === genderFilter;

      // Relationship filter
      const matchesRelationship = 
        relationshipFilter === "all" || 
        member.relationship === relationshipFilter;

      // Disability filter
      const matchesDisability = 
        disabilityFilter === "all" || 
        (disabilityFilter === "yes" ? member.isDisabled : !member.isDisabled);

      // Chronic illness filter
      const matchesChronicIllness = 
        chronicIllnessFilter === "all" || 
        (chronicIllnessFilter === "yes" ? member.hasChronicIllness : !member.hasChronicIllness);

      // Age filter
      const matchesAge =
        (memberAgeMin === "" && memberAgeMax === "") ||
        (() => {
          const minAge = parseInt(memberAgeMin) || 0;
          const maxAge = parseInt(memberAgeMax) || Infinity;

          if (memberAgeMin !== "" && memberAgeMax === "") {
            return member.age >= minAge;
          }
          if (memberAgeMin === "" && memberAgeMax !== "") {
            return member.age <= maxAge;
          }
          if (memberAgeMin !== "" && memberAgeMax !== "") {
            return member.age >= minAge && member.age <= maxAge;
          }
          return true;
        })();

      // Member type filter (member or orphan)
      const matchesType =
        memberTypeFilter === "all" ||
        memberTypeFilter === member.type;

      // Branch filter
      const matchesBranch =
        branchFilter === "all" ||
        member.branch === branchFilter;

      // Family status filter
      const matchesFamilyStatus =
        familyStatusFilter === "all" ||
        member.socialStatus === familyStatusFilter;

      return (
        matchesSearch &&
        matchesGender &&
        matchesRelationship &&
        matchesDisability &&
        matchesChronicIllness &&
        matchesAge &&
        matchesType &&
        matchesBranch &&
        matchesFamilyStatus
      );
    });
  }, [
    allMembers,
    searchTerm,
    genderFilter,
    relationshipFilter,
    disabilityFilter,
    chronicIllnessFilter,
    memberTypeFilter,
    branchFilter,
    familyStatusFilter,
    memberAgeMin,
    memberAgeMax
  ]);

  // Relationship options
  const relationshipOptions = [
    { value: "son", label: "ابن" },
    { value: "daughter", label: "ابنة" },
    { value: "mother", label: "أم" },
    { value: "father", label: "أب" },
    { value: "brother", label: "أخ" },
    { value: "sister", label: "أخت" },
    { value: "grandfather", label: "جد" },
    { value: "grandmother", label: "جدة" },
    { value: "uncle", label: "عم" },
    { value: "aunt", label: "عمة" },
    { value: "orphan", label: "يتيم" },
    { value: "other", label: "أخرى" },
  ];

  // Constants for additional filters
  const BRANCHES = [
    { value: "abushalbia", label: "ابو شلبية (شلف - علاينة - عزايزة)" },
    { value: "alnaqra", label: "النقرة (الدوار)" },
    { value: "abuawda", label: "ابو عودة" },
    { value: "abunasr", label: "ابو نصر" },
    { value: "abumatar", label: "ابو مطر" }
  ];

  const SOCIAL_STATUSES = [
    { value: "married", label: "متزوج" },
    { value: "polygamous", label: "متعدد زوجات" },
    { value: "widowed", label: "ارملة" },
    { value: "vulnerable_family", label: "اسر هشة (ايتام)" },
    { value: "abandoned", label: "متروكة" },
    { value: "divorced", label: "مطلقة" },
    { value: "single", label: "عانس" },
  ];

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

  // Excel column configuration
  const excelColumns = useMemo(() => [
    { key: 'fullName', label: 'الاسم', checked: true },
    { key: 'age', label: 'العمر', checked: true },
    { key: 'gender', label: 'الجنس', checked: true },
    { key: 'relationship', label: 'العلاقة', checked: true },
    { key: 'memberID', label: 'رقم الهوية', checked: true },
    { key: 'birthDate', label: 'تاريخ الميلاد', checked: true },
    { key: 'familyName', label: 'اسم رب الأسرة', checked: true },
    { key: 'type', label: 'حالة الفرد', checked: true },
    { key: 'branch', label: 'فرع العائلة', checked: true },
    { key: 'socialStatus', label: 'الحالة الاجتماعية', checked: true },
    { key: 'isDisabled', label: 'هل لديه إعاقة', checked: true },
    { key: 'hasChronicIllness', label: 'هل لديه مرض مزمن', checked: true },
    { key: 'disabilityType', label: 'نوع الإعاقة', checked: true },
    { key: 'chronicIllnessType', label: 'نوع المرض المزمن', checked: true },
  ], []);

  const [checkedColumns, setCheckedColumns] = useState<{ [key: string]: boolean }>({});
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [customFileName, setCustomFileName] = useState('');

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

  // For export
  const selectedCols = excelColumns.filter(col => checkedColumns[col.key]);

  // Excel export function
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('الأفراد', { views: [{ rightToLeft: true }] });

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

      // Create title row
      const titleCells = Array(selectedCols.length).fill('');
      titleCells[0] = 'بيانات الأفراد (تصدير)';
      const titleRow = worksheet.addRow(titleCells);
      titleRow.height = 30;
      const lastColLetter = worksheet.getColumn(selectedCols.length).letter;
      worksheet.mergeCells(`A1:${lastColLetter}1`);
      titleRow.getCell(1).style = titleStyle;
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      // Create header row
      const headerRow = worksheet.addRow(selectedCols.map(col => col.label));
      headerRow.height = 35;
      headerRow.eachCell(cell => {
        cell.style = headerStyle;
        cell.alignment = {
          ...headerStyle.alignment,
          wrapText: true
        };
      });

      // Add data rows for filtered members
      filteredMembers.forEach(member => {
        const rowData = selectedCols.map(col => {
          switch (col.key) {
            case 'fullName': return member.fullName || '';
            case 'age': return member.age || '';
            case 'gender': return getGenderInArabic(member.gender) || '';
            case 'relationship':
              if (member.type === 'orphan') {
                return 'يتيم'; // Fixed to be in Arabic
              } else {
                return getRelationshipInArabic(member.relationship) || '';
              }
            case 'memberID': return member.memberID || '';
            case 'birthDate': return member.birthDate || '';
            case 'familyName': return member.familyName || '';
            case 'type': return member.type === 'member' ? 'فرد عائلة' : 'يتيم';
            case 'branch': return getBranchInArabic(member.branch) || ''; // Fixed to be in Arabic
            case 'socialStatus': return getSocialStatusInArabic(member.socialStatus) || ''; // Fixed to be in Arabic
            case 'isDisabled': return member.isDisabled ? 'نعم' : 'لا';
            case 'hasChronicIllness': return member.hasChronicIllness ? 'نعم' : 'لا';
            case 'disabilityType': return member.disabilityType || ''; // Add specific disability type
            case 'chronicIllnessType': return member.chronicIllnessType || ''; // Add specific illness type
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

      // Auto-adjust column widths based on content type
      const getColumnWidth = (columnKey: string): number => {
        // Extra wide columns for names and long text fields
        if (columnKey.includes('fullName') || columnKey.includes('familyName') ||
            columnKey.includes('name') || columnKey.includes('اسم') ||
            columnKey.includes('Notes') || columnKey.includes('ملاحظات') ||
            columnKey.includes('disabilityType') || columnKey.includes('chronicIllnessType')) {
          return 30; // Extra wide for names and long Arabic text
        }
        // Medium-wide columns for job and location fields
        else if (columnKey.includes('branch') || columnKey.includes('frع') ||
                 columnKey.includes('socialStatus') || columnKey.includes('الحالة')) {
          return 28; // Medium-wide for Arabic text
        }
        // Medium columns for phone numbers
        else if (columnKey.includes('Phone') || columnKey.includes('جوال')) {
          return 24; // Medium for phone numbers
        }
        // Medium-narrow columns for IDs and dates
        else if (columnKey.includes('ID') || columnKey.includes('هوية') ||
                 columnKey.includes('BirthDate') || columnKey.includes('ميلاد') ||
                 columnKey.includes('birthDate') || columnKey.includes('Date')) {
          return 20; // Medium-narrow for IDs and dates
        }
        // Narrow columns for numbers and booleans
        else if (columnKey.includes('age') || columnKey.includes('عمر') ||
                 columnKey.includes('type') || columnKey.includes('gender') ||
                 columnKey.includes('isDisabled') || columnKey.includes('hasChronicIllness')) {
          return 18; // Narrow for counts and yes/no
        }
        // Default width
        else {
          return 22;
        }
      };

      selectedCols.forEach((_, index) => {
        worksheet.getColumn(index + 1).width = getColumnWidth(selectedCols[index].key);
      });

      // Generate and download the file
      let fileName;
      if (customFileName.trim()) {
        // Use custom filename and ensure it has .xlsx extension
        fileName = customFileName.trim().endsWith('.xlsx') ? customFileName.trim() : customFileName.trim() + '.xlsx';
      } else {
        fileName = `members_export_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير البيانات إلى Excel",
        variant: "destructive",
      });
    }
  };

  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(filteredMembers.length / pageSize);

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
      <div className="space-y-6 w-full min-w-0 overflow-hidden">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">إدارة الأفراد واليتم</h1>
          <p className="text-muted-foreground">عرض وإدارة بيانات جميع أفراد الأسر واليتم (الأبناء، البنات، والأيتام)</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">إجمالي الأفراد</p>
                  <p className="text-2xl font-bold text-foreground">{allMembers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">الذكور</p>
                  <p className="text-2xl font-bold text-foreground">
                    {allMembers.filter(m => m.gender === 'male').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-pink-100 rounded-lg">
                  <User className="h-6 w-6 text-pink-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">الإناث</p>
                  <p className="text-2xl font-bold text-foreground">
                    {allMembers.filter(m => m.gender === 'female').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-lg">
                  <Users className="h-6 w-6 text-red-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">تحت 18 سنة</p>
                  <p className="text-2xl font-bold text-foreground">
                    {allMembers.filter(m => m.age < 18).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
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
                    placeholder="البحث بالاسم، رقم الهوية، أو اسم الأسرة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-right"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="flex flex-col items-center">
                  <label className="mb-1 text-sm text-foreground text-center w-full">العمر</label>
                  <p className="text-xs text-muted-foreground mb-1">من - إلى</p>
                  <div className="flex gap-2 w-full">
                    <Input
                      type="number"
                      min="0"
                      max="150"
                      value={memberAgeMin}
                      onChange={(e) => setMemberAgeMin(e.target.value)}
                      placeholder="من"
                      className="text-xs text-right"
                      dir="rtl"
                    />
                    <Input
                      type="number"
                      min="0"
                      max="150"
                      value={memberAgeMax}
                      onChange={(e) => setMemberAgeMax(e.target.value)}
                      placeholder="إلى"
                      className="text-xs text-right"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <label className="mb-1 text-sm text-foreground text-center w-full">الجنس</label>
                  <Select value={genderFilter} onValueChange={setGenderFilter} dir="rtl">
                    <SelectTrigger className="w-full text-right" dir="rtl">
                      <SelectValue className="text-right" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">كلا الجنسين</SelectItem>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col items-center">
                  <label className="mb-1 text-sm text-foreground text-center w-full">العلاقة</label>
                  <Select value={relationshipFilter} onValueChange={setRelationshipFilter} dir="rtl">
                    <SelectTrigger className="w-full text-right" dir="rtl">
                      <SelectValue className="text-right" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">جميع العلاقات</SelectItem>
                      {relationshipOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col items-center">
                  <label className="mb-1 text-sm text-foreground text-center w-full">الإعاقة</label>
                  <Select value={disabilityFilter} onValueChange={setDisabilityFilter} dir="rtl">
                    <SelectTrigger className="w-full text-right" dir="rtl">
                      <SelectValue className="text-right" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="yes">موجودة</SelectItem>
                      <SelectItem value="no">غير موجودة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col items-center">
                  <label className="mb-1 text-sm text-foreground text-center w-full">مرض مزمن</label>
                  <Select value={chronicIllnessFilter} onValueChange={setChronicIllnessFilter} dir="rtl">
                    <SelectTrigger className="w-full text-right" dir="rtl">
                      <SelectValue className="text-right" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="yes">موجود</SelectItem>
                      <SelectItem value="no">غير موجود</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col items-center">
                  <label className="mb-1 text-sm text-foreground text-center w-full">نوع الفرد</label>
                  <Select value={memberTypeFilter} onValueChange={setMemberTypeFilter} dir="rtl">
                    <SelectTrigger className="w-full text-right" dir="rtl">
                      <SelectValue className="text-right" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">جميع الأنواع</SelectItem>
                      <SelectItem value="member">عضو عائلة</SelectItem>
                      <SelectItem value="orphan">يتيـم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col items-center">
                  <label className="mb-1 text-sm text-foreground text-center w-full">الفرع</label>
                  <Select value={branchFilter} onValueChange={setBranchFilter} dir="rtl">
                    <SelectTrigger className="w-full text-right" dir="rtl">
                      <SelectValue className="text-right" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">جميع الأفرع</SelectItem>
                      {BRANCHES.map((branch) => (
                        <SelectItem key={branch.value} value={branch.value}>
                          {branch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col items-center">
                  <label className="mb-1 text-sm text-foreground text-center w-full">الحالة الاجتماعية</label>
                  <Select value={familyStatusFilter} onValueChange={setFamilyStatusFilter} dir="rtl">
                    <SelectTrigger className="w-full text-right" dir="rtl">
                      <SelectValue className="text-right" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      {SOCIAL_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>قائمة الأفراد ({filteredMembers.length})</CardTitle>
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>تصدير إلى Excel</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                  <DialogTitle>تصدير الأفراد إلى Excel</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">أعمدة التصدير</h3>
                      <p className="text-sm text-muted-foreground">حدد الأعمدة المراد تضمينها في التصدير</p>
                    </div>
                    <div className="flex space-x-2 space-x-reverse">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                      >
                        تحديد الكل
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAll}
                      >
                        إلغاء التحديد
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-64 overflow-y-auto p-2 border rounded-md">
                    {excelColumns.map((col) => (
                      <div key={col.key} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={`col-${col.key}`}
                          checked={checkedColumns[col.key]}
                          onCheckedChange={() => handleExcelColumnChange(col.key)}
                        />
                        <label
                          htmlFor={`col-${col.key}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {col.label}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">اسم الملف المخصص (اختياري)</label>
                    <Input
                      type="text"
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="أدخل اسم الملف المخصص لتصدير Excel"
                      dir="rtl"
                    />
                  </div>
                </div>

                <DialogFooter className="flex sm:justify-between sm:space-x-3 sm:space-x-reverse">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsExportDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="button"
                    onClick={exportToExcel}
                  >
                    تصدير
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {filteredMembers.length > 0 ? (
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الاسم</th>
                      <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">رقم الهوية</th>
                      <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">العمر</th>
                      <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الجنس</th>
                      <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">العلاقة</th>
                      <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">اسم رب الأسرة</th>
                      <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {paginatedMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-muted">
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {member.fullName}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {member.memberID || "غير محدد"}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {calculateDetailedAge(member.birthDate)}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {member.type === 'orphan' ? (member.gender ? getGenderInArabic(member.gender) : 'غير محدد') : (member.gender ? getGenderInArabic(member.gender) : 'غير محدد')}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {member.type === 'orphan' ? 'يتيم' : getRelationshipInArabic(member.relationship)}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {member.familyName}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-sm">
                          <div className="flex flex-wrap gap-1 md:flex-nowrap md:space-x-2 md:space-x-reverse min-w-[140px]">
                            {member.type === 'orphan' ? (
                              <Link href={`/admin/orphans`}>
                                <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </Link>
                            ) : (
                              <Link href={`/admin/families/${member.familyId}/edit`}>
                                <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                            {member.isDisabled && (
                              <Badge variant="destructive" className="text-xs mr-2">إعاقة</Badge>
                            )}
                            {member.hasChronicIllness && (
                              <Badge variant="outline" className="text-xs">مرض مزمن</Badge>
                            )}
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
                  {searchTerm || memberAgeMin || memberAgeMax
                    ? 'لا توجد أفراد تطابق معايير البحث'
                    : 'لا توجد أفراد مسجلين'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </PageWrapper>
  );
}