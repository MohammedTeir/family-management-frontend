import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Users, Plus, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { getSocialStatusInArabic, getDamageDescriptionInArabic, getBranchInArabic } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { isChild, calculateDetailedAge } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Header } from "@/components/layout/header";

export default function FamilyData() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteWifeId, setDeleteWifeId] = useState<number | null>(null);

  const { data: family, isLoading } = useQuery({
    queryKey: ["/api/family"],
    select: (data) => {
      // Add gender information to the family data for UI purposes
      if (!data) return data;

      // If the API returns userGender, use it to determine labels
      const headGender = data.userGender || 'male'; // default to male if not specified

      return {
        ...data,
        // Store gender-appropriate spouse labels separately to avoid overwriting head of household fields
        ...(data.spouse ? {
          // Add transformed spouse fields with different names to avoid conflicts
          ...((headGender === 'female') ? {
            spouseAsHusbandName: data.spouse.husbandName || data.spouse.wifeName,
            spouseAsHusbandID: data.spouse.husbandID || data.spouse.wifeID,
            spouseAsHusbandBirthDate: data.spouse.husbandBirthDate || data.spouse.wifeBirthDate,
            spouseAsHusbandJob: data.spouse.husbandJob || data.spouse.wifeJob,
            spouseAsHusbandPregnant: data.spouse.husbandPregnant || data.spouse.wifePregnant,
            spouseAsHusbandHasChronicIllness: data.spouse.husbandHasChronicIllness || data.spouse.wifeHasChronicIllness,
            spouseAsHusbandChronicIllnessType: data.spouse.husbandChronicIllnessType || data.spouse.wifeChronicIllnessType,
            spouseAsHusbandHasDisability: data.spouse.husbandHasDisability || data.spouse.wifeHasDisability,
            spouseAsHusbandDisabilityType: data.spouse.husbandDisabilityType || data.spouse.wifeDisabilityType,
            spouseAsHusbandHasWarInjury: data.spouse.husbandHasWarInjury || data.spouse.wifeHasWarInjury,
            spouseAsHusbandWarInjuryType: data.spouse.husbandWarInjuryType || data.spouse.wifeWarInjuryType,
          } : {
            spouseAsWifeName: data.spouse.wifeName,
            spouseAsWifeID: data.spouse.wifeID,
            spouseAsWifeBirthDate: data.spouse.wifeBirthDate,
            spouseAsWifeJob: data.spouse.wifeJob,
            spouseAsWifePregnant: data.spouse.wifePregnant,
            spouseAsWifeHasChronicIllness: data.spouse.wifeHasChronicIllness,
            spouseAsWifeChronicIllnessType: data.spouse.wifeChronicIllnessType,
            spouseAsWifeHasDisability: data.spouse.wifeHasDisability,
            spouseAsWifeDisabilityType: data.spouse.wifeDisabilityType,
            spouseAsWifeHasWarInjury: data.spouse.wifeHasWarInjury,
            spouseAsWifeWarInjuryType: data.spouse.wifeWarInjuryType,
          }),
        } : (data.wifeName ? { // Fallback: if no spouse object but raw spouse fields exist
          ...((headGender === 'female') ? {
            spouseAsHusbandName: data.wifeName,
            spouseAsHusbandID: data.wifeID,
            spouseAsHusbandBirthDate: data.wifeBirthDate,
            spouseAsHusbandJob: data.wifeJob,
            spouseAsHusbandPregnant: data.wifePregnant,
            spouseAsHusbandHasChronicIllness: data.wifeHasChronicIllness,
            spouseAsHusbandChronicIllnessType: data.wifeChronicIllnessType,
            spouseAsHusbandHasDisability: data.wifeHasDisability,
            spouseAsHusbandDisabilityType: data.wifeDisabilityType,
            spouseAsHusbandHasWarInjury: data.wifeHasWarInjury,
            spouseAsHusbandWarInjuryType: data.wifeWarInjuryType,
          } : {
            spouseAsWifeName: data.wifeName,
            spouseAsWifeID: data.wifeID,
            spouseAsWifeBirthDate: data.wifeBirthDate,
            spouseAsWifeJob: data.wifeJob,
            spouseAsWifePregnant: data.wifePregnant,
            spouseAsWifeHasChronicIllness: data.wifeHasChronicIllness,
            spouseAsWifeChronicIllnessType: data.wifeChronicIllnessType,
            spouseAsWifeHasDisability: data.wifeHasDisability,
            spouseAsWifeDisabilityType: data.wifeDisabilityType,
            spouseAsWifeHasWarInjury: data.wifeHasWarInjury,
            spouseAsWifeWarInjuryType: data.wifeWarInjuryType,
          }),
        } : {})),
        headGender, // Add head gender for UI logic
      };
    },
  });
  const [, navigate] = useLocation();
  const { settings } = useSettingsContext();

  // State for form data using controlled components
  const [formData, setFormData] = useState({
    husbandName: "",
    husbandID: "",
    husbandBirthDate: "",
    husbandJob: "",
    primaryPhone: "",
    secondaryPhone: "",
    spouseName: "",
    spouseID: "",
    spouseBirthDate: "",
    spouseJob: "",
    spousePregnant: false,
    originalResidence: "",
    currentHousing: "",
    isDisplaced: false,
    displacedLocation: "",
    isAbroad: false,
    warDamage2023: false,
    warDamageDescription: "",
    branch: "",
    landmarkNear: "",
    socialStatus: "",
    totalMembers: 0,
    numMales: 0,
    numFemales: 0,
    hasChronicIllness: false,
    chronicIllnessType: "",
    spouseHasChronicIllness: false,
    spouseChronicIllnessType: "",
    hasDisability: false,
    disabilityType: "",
    spouseHasDisability: false,
    spouseDisabilityType: "",
    hasWarInjury: false,
    warInjuryType: "",
    spouseHasWarInjury: false,
    spouseWarInjuryType: "",
    headGender: "male",
  });

  useEffect(() => {
    if (family) {
      // Set form data with proper values
      const headGender = family.headGender || family.userGender || 'male';
      setFormData({
        ...family,
        headGender: headGender,
        // Handle head of household fields (these should use original values, not transformed)
        husbandName: family.husbandName || "",  // Original head of household name
        husbandID: family.husbandID || "",
        husbandBirthDate: family.husbandBirthDate ? formatDateForInput(family.husbandBirthDate) : "",
        husbandJob: family.husbandJob || "",
        // Handle spouse fields (these should use new transformed values based on head's gender)
        spouseName: (headGender === 'female' ? family.spouseAsHusbandName : family.spouseAsWifeName) || "",
        spouseID: (headGender === 'female' ? family.spouseAsHusbandID : family.spouseAsWifeID) || "",
        spouseBirthDate: (headGender === 'female' ? family.spouseAsHusbandBirthDate : family.spouseAsWifeBirthDate) || "",
        spouseJob: (headGender === 'female' ? family.spouseAsHusbandJob : family.spouseAsWifeJob) || "",
        spousePregnant: (headGender === 'female' ? family.spouseAsHusbandPregnant : family.spouseAsWifePregnant) || false,
        // Health information for spouse
        spouseHasChronicIllness: (headGender === 'female' ? family.spouseAsHusbandHasChronicIllness : family.spouseAsWifeHasChronicIllness) || false,
        spouseChronicIllnessType: (headGender === 'female' ? family.spouseAsHusbandChronicIllnessType : family.spouseAsWifeChronicIllnessType) || "",
        spouseHasDisability: (headGender === 'female' ? family.spouseAsHusbandHasDisability : family.spouseAsWifeHasDisability) || false,
        spouseDisabilityType: (headGender === 'female' ? family.spouseAsHusbandDisabilityType : family.spouseAsWifeDisabilityType) || "",
        // War injury for spouse
        spouseHasWarInjury: (headGender === 'female' ? family.spouseAsHusbandHasWarInjury : family.spouseAsWifeHasWarInjury) || false,
        spouseWarInjuryType: (headGender === 'female' ? family.spouseAsHusbandWarInjuryType : family.spouseAsWifeWarInjuryType) || "",
        // Other fields
        socialStatus: family.socialStatus || "",
        branch: family.branch || "",
        warDamageDescription: family.warDamageDescription || "",
        hasChronicIllness: family.hasChronicIllness || false,
        chronicIllnessType: family.chronicIllnessType || "",
        hasDisability: family.hasDisability || false,
        disabilityType: family.disabilityType || "",
        hasWarInjury: family.hasWarInjury || false,
        warInjuryType: family.warInjuryType || "",
      });
    }
  }, [family]);


  useEffect(() => {
    if (settings.siteTitle) {
      document.title = settings.siteTitle;
    }
    if (settings.language) {
      document.documentElement.lang = settings.language;
      document.body.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [settings.siteTitle, settings.language]);

  const updateFamilyMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/family/${family.id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      setIsEditing(false);
      toast({
        title: "تم التحديث بنجاح",
        description: "تم حفظ بيانات الأسرة",
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

  const createFamilyMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/family", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      setIsEditing(false);
      toast({
        title: "تم الإنشاء بنجاح",
        description: "تم إنشاء بيانات الأسرة",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في الإنشاء",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteWifeMutation = useMutation({
    mutationFn: async () => {
      const familyId = family?.id;
      if (!familyId) {
        throw new Error("Family ID is required");
      }
      // Update the family record to clear wife data
      const res = await apiRequest("PUT", `/api/family/${familyId}`, {
        wifeName: null,
        wifeID: null,
        wifeBirthDate: null,
        wifeJob: null,
        wifePregnant: false
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف بيانات الزوجة",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في الحذف",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation for required fields
    const requiredFields = [
      { field: 'husbandName', label: 'اسم رب/ربة الأسرة' },
      { field: 'husbandID', label: 'رقم هوية رب/ربة الأسرة' },
      { field: 'husbandJob', label: 'مهنة رب/ربة الأسرة' },
      { field: 'primaryPhone', label: 'الهاتف الأساسي' },
      { field: 'originalResidence', label: 'السكن الأصلي' },
      { field: 'currentHousing', label: 'السكن الحالي' },
      { field: 'totalMembers', label: 'إجمالي الأفراد' },
      { field: 'numMales', label: 'عدد الذكور' },
      { field: 'numFemales', label: 'عدد الإناث' }
    ];

    const emptyFields = requiredFields.filter(req => !formData[req.field as keyof typeof formData]);

    if (emptyFields.length > 0) {
      const fieldNames = emptyFields.map(field => field.label);
      toast({
        title: "خطأ في التحقق",
        description: `يرجى مراجعة الحقول المطلوبة: ${fieldNames.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Clean up optional fields that might be empty strings
    const cleanedData = {
      ...formData,
      // Convert empty strings appropriately
      secondaryPhone: formData.secondaryPhone || "",
      spouseName: formData.spouseName || null,
      spouseID: formData.spouseID || "",
      spouseBirthDate: formData.spouseBirthDate || null,
      spouseJob: formData.spouseJob || "",
      displacedLocation: formData.displacedLocation || null,
      warDamageDescription: formData.warDamageDescription || null,
      branch: formData.branch || null,
      landmarkNear: formData.landmarkNear || "",
      socialStatus: formData.socialStatus || null,
      chronicIllnessType: formData.chronicIllnessType || "",
      spouseChronicIllnessType: formData.spouseChronicIllnessType || "",
      disabilityType: formData.disabilityType || "",
      spouseDisabilityType: formData.spouseDisabilityType || "",
      warInjuryType: formData.warInjuryType || "",
      spouseWarInjuryType: formData.spouseWarInjuryType || "",
    };

    // Map form fields back to backend format
    // The backend expects husband fields for head of household and wife fields for spouse
    const mappedData = {
      ...cleanedData,
      // Map head of household fields back to husband fields for backend
      husbandName: cleanedData.husbandName,
      husbandID: cleanedData.husbandID,
      husbandBirthDate: cleanedData.husbandBirthDate,
      husbandJob: cleanedData.husbandJob,
      // Map spouse fields back to wife fields for backend
      wifeName: cleanedData.spouseName,
      wifeID: cleanedData.spouseID,
      wifeBirthDate: cleanedData.spouseBirthDate,
      wifeJob: cleanedData.spouseJob,
      wifePregnant: cleanedData.spousePregnant,
      wifeHasChronicIllness: cleanedData.spouseHasChronicIllness,
      wifeChronicIllnessType: cleanedData.spouseChronicIllnessType,
      wifeHasDisability: cleanedData.spouseHasDisability,
      wifeDisabilityType: cleanedData.spouseDisabilityType,
      wifeHasWarInjury: cleanedData.spouseHasWarInjury,
      wifeWarInjuryType: cleanedData.spouseWarInjuryType,
      // Head of household war injury fields
      hasWarInjury: cleanedData.hasWarInjury,
      warInjuryType: cleanedData.warInjuryType,
    };

    // Safeguard: Ensure we don't send empty values for existing family
    if (family) {
      // If head gender has changed, update the user profile first, then the family
      if (mappedData.headGender && family.headGender !== mappedData.headGender) {
        // Update user gender via profile API first
        apiRequest("PUT", "/api/user/profile", {
          gender: mappedData.headGender
        })
        .then(() => {
          // Update family data after user profile is updated
          updateFamilyMutation.mutate(mappedData);
        })
        .catch(error => {
          console.error("Error updating user gender:", error);
          toast({
            title: "خطأ",
            description: "فشل تحديث جنس رب/ربة الأسرة",
            variant: "destructive",
          });
          // Still update family data even if user profile update fails
          updateFamilyMutation.mutate(mappedData);
        });
      } else {
        // Update family data directly if no gender change
        updateFamilyMutation.mutate(mappedData);
      }
    } else {
      createFamilyMutation.mutate(mappedData);
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle switch changes
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };


  // Helper function to format date for display
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy", { locale: ar });
    } catch {
      return dateString;
    }
  };

  // Helper function to format date for input
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, "yyyy-MM-dd");
    } catch {
      return dateString;
    }
  };

  // Filter children (under 2 years old)
  const children = family?.members.filter((member: any) => isChild(member.birthDate)) || [];

  if (isLoading) {
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">بيانات الأسرة</h1>
          <p className="text-sm sm:text-base text-muted-foreground">إدارة وتحديث بيانات الأسرة الشخصية</p>
        </div>
        <Link href="/dashboard/members">
          <Button variant="outline" className="mb-4 w-full sm:w-auto">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 ml-2 sm:ml-3" />
            <span className="text-sm sm:text-base">عرض أفراد الأسرة</span>
          </Button>
        </Link>
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Husband Information */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg sm:text-xl">بيانات رب الأسرة</CardTitle>
              {!isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto text-sm sm:text-base"
                >
                  تعديل
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="husbandName">الاسم الرباعي *</Label>
                  <Input
                    id="husbandName"
                    name="husbandName"
                    value={formData.husbandName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="text-right"
                  />
                </div>

                <div>
                  <Label htmlFor="husbandID">رقم الهوية *</Label>
                  <Input
                    id="husbandID"
                    name="husbandID"
                    value={formData.husbandID}
                    onChange={handleInputChange}
                    disabled={true}
                    className="text-right"
                  />
                </div>

                <div>
                  <Label htmlFor="husbandBirthDate">تاريخ الميلاد</Label>
                  <div className="flex items-center space-x-2 space-x-reverse">
                  <Input
                    id="husbandBirthDate"
                    name="husbandBirthDate"
                    type="date"
                    value={formData.husbandBirthDate}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                    {formData.husbandBirthDate && (
                      <Badge variant="outline">
                        {calculateDetailedAge(formData.husbandBirthDate)}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="husbandJob">المهنة *</Label>
                  <Input
                    id="husbandJob"
                    name="husbandJob"
                    value={formData.husbandJob}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="text-right"
                  />
                </div>

                <div>
                  <Label htmlFor="headGender">الجنس</Label>
                  <Select
                    value={formData.headGender}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, headGender: value }))}
                    disabled={!isEditing}
                    dir="rtl"
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر الجنس" className="text-right" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="male" className="text-right">ذكر</SelectItem>
                      <SelectItem value="female" className="text-right">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="primaryPhone">رقم الجوال الأساسي *</Label>
                  <Input
                    id="primaryPhone"
                    name="primaryPhone"
                    value={formData.primaryPhone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="text-right"
                  />
                </div>

                <div>
                  <Label htmlFor="secondaryPhone">رقم الجوال البديل</Label>
                  <Input
                    id="secondaryPhone"
                    name="secondaryPhone"
                    value={formData.secondaryPhone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="text-right"
                  />
                </div>

                {/* Health switches */}
                <div className="sm:col-span-2">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="rounded-md border border-input p-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch
                          id="hasChronicIllness"
                          disabled={!isEditing}
                          checked={formData.hasChronicIllness}
                          onCheckedChange={(checked) => handleSwitchChange("hasChronicIllness", checked)}
                        />
                        <Label htmlFor="hasChronicIllness" className="cursor-pointer">يعاني من مرض مزمن</Label>
                      </div>
                    </div>

                    <div className="rounded-md border border-input p-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch
                          id="hasDisability"
                          disabled={!isEditing}
                          checked={formData.hasDisability}
                          onCheckedChange={(checked) => handleSwitchChange("hasDisability", checked)}
                        />
                        <Label htmlFor="hasDisability" className="cursor-pointer">يعاني من إعاقة</Label>
                      </div>
                    </div>

                    <div className="rounded-md border border-input p-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch
                          id="hasWarInjury"
                          disabled={!isEditing}
                          checked={formData.hasWarInjury}
                          onCheckedChange={(checked) => handleSwitchChange("hasWarInjury", checked)}
                        />
                        <Label htmlFor="hasWarInjury" className="cursor-pointer">يعاني من إصابة حرب</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {formData.hasChronicIllness && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="chronicIllnessType">نوع المرض المزمن</Label>
                    <Input
                      id="chronicIllnessType"
                      name="chronicIllnessType"
                      placeholder="اذكر نوع المرض المزمن"
                      value={formData.chronicIllnessType}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                )}

                {formData.hasDisability && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="disabilityType">نوع الإعاقة</Label>
                    <Input
                      id="disabilityType"
                      name="disabilityType"
                      placeholder="اذكر نوع الإعاقة"
                      value={formData.disabilityType}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                )}

                {formData.hasWarInjury && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="warInjuryType">نوع إصابة الحرب</Label>
                    <Input
                      id="warInjuryType"
                      name="warInjuryType"
                      placeholder="اذكر نوع إصابة الحرب"
                      value={formData.warInjuryType}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                )}

                {(formData.headGender || family?.headGender || "male") === "female" && ( // Show pregnancy field when head is female (the head herself could be pregnant)
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="spousePregnant"
                    disabled={!isEditing}
                    checked={formData.spousePregnant}
                    onCheckedChange={(checked) => handleSwitchChange("spousePregnant", checked)}
                  />
                  <Label htmlFor="spousePregnant">حالة الحمل (ربة الأسرة)</Label>
                </div>
                )}

              </div>
            </CardContent>
          </Card>
        </form>

        {/* Wife Information - Integrated into Family Form when editing */}
          {isEditing && (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg sm:text-xl">
                {(formData.headGender || family?.headGender || "male") === "female" ? "بيانات الزوج" : "بيانات الزوجة"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="spouseName">{(formData.headGender || family?.headGender || "male") === "female" ? "اسم الزوج" : "اسم الزوجة"}</Label>
                  <Input
                    id="spouseName"
                    name="spouseName"
                    value={formData.spouseName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="text-right"
                  />
                </div>

                <div>
                  <Label htmlFor="spouseID">{(formData.headGender || family?.headGender || "male") === "female" ? "رقم هوية الزوج" : "رقم هوية الزوجة"}</Label>
                  <Input
                    id="spouseID"
                    name="spouseID"
                    value={formData.spouseID}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="text-right"
                  />
                </div>

                <div>
                  <Label htmlFor="spouseBirthDate">{(formData.headGender || family?.headGender || "male") === "female" ? "تاريخ ميلاد الزوج" : "تاريخ ميلاد الزوجة"}</Label>
                  <Input
                    id="spouseBirthDate"
                    name="spouseBirthDate"
                    type="date"
                    value={formData.spouseBirthDate}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="text-right"
                  />
                </div>

                <div>
                  <Label htmlFor="spouseJob">{(formData.headGender || family?.headGender || "male") === "female" ? "مهنة الزوج" : "مهنة الزوجة"}</Label>
                  <Input
                    id="spouseJob"
                    name="spouseJob"
                    value={formData.spouseJob}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="text-right"
                  />
                </div>

                {/* Health switches */}
                <div className="sm:col-span-2">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="rounded-md border border-input p-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch
                          id="spouseHasChronicIllness"
                          disabled={!isEditing}
                          checked={formData.spouseHasChronicIllness}
                          onCheckedChange={(checked) => handleSwitchChange("spouseHasChronicIllness", checked)}
                        />
                        <Label htmlFor="spouseHasChronicIllness" className="cursor-pointer">{(formData.headGender || family?.headGender || "male") === "female" ? "يعاني من مرض مزمن" : "تعاني من مرض مزمن"}</Label>
                      </div>
                    </div>

                    <div className="rounded-md border border-input p-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch
                          id="spouseHasDisability"
                          disabled={!isEditing}
                          checked={formData.spouseHasDisability}
                          onCheckedChange={(checked) => handleSwitchChange("spouseHasDisability", checked)}
                        />
                        <Label htmlFor="spouseHasDisability" className="cursor-pointer">{(formData.headGender || family?.headGender || "male") === "female" ? "يعاني من إعاقة" : "تعاني من إعاقة"}</Label>
                      </div>
                    </div>

                    <div className="rounded-md border border-input p-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch
                          id="spouseHasWarInjury"
                          disabled={!isEditing}
                          checked={formData.spouseHasWarInjury}
                          onCheckedChange={(checked) => handleSwitchChange("spouseHasWarInjury", checked)}
                        />
                        <Label htmlFor="spouseHasWarInjury" className="cursor-pointer">{(formData.headGender || family?.headGender || "male") === "female" ? "يعاني من إصابة حرب" : "تعاني من إصابة حرب"}</Label>
                      </div>
                    </div>

                    {(formData.headGender || family?.headGender || "male") === "male" && ( // Show pregnancy field when head is male (so spouse could be pregnant)
                    <div className="rounded-md border border-input p-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch
                          id="spousePregnant"
                          disabled={!isEditing}
                          checked={formData.spousePregnant}
                          onCheckedChange={(checked) => handleSwitchChange("spousePregnant", checked)}
                        />
                        <Label htmlFor="spousePregnant" className="cursor-pointer">حالة الحمل (الزوجة)</Label>
                      </div>
                    </div>
                    )}
                  </div>
                </div>

                {formData.spouseHasChronicIllness && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="spouseChronicIllnessType">{(formData.headGender || family?.headGender || "male") === "female" ? "نوع مرض الزوج المزمن" : "نوع مرض الزوجة المزمن"}</Label>
                    <Input
                      id="spouseChronicIllnessType"
                      name="spouseChronicIllnessType"
                      placeholder="اذكر نوع المرض المزمن"
                      value={formData.spouseChronicIllnessType}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                )}

                {formData.spouseHasDisability && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="spouseDisabilityType">{(formData.headGender || family?.headGender || "male") === "female" ? "نوع إعاقة الزوج" : "نوع إعاقة الزوجة"}</Label>
                    <Input
                      id="spouseDisabilityType"
                      name="spouseDisabilityType"
                      placeholder="اذكر نوع الإعاقة"
                      value={formData.spouseDisabilityType}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                )}

                {formData.spouseHasWarInjury && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="spouseWarInjuryType">{(formData.headGender || family?.headGender || "male") === "female" ? "نوع إصابة الحرب للزوج" : "نوع إصابة الحرب للزوجة"}</Label>
                    <Input
                      id="spouseWarInjuryType"
                      name="spouseWarInjuryType"
                      placeholder="اذكر نوع إصابة الحرب"
                      value={formData.spouseWarInjuryType}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Display Spouse Information when NOT editing */}
          {!isEditing && (family?.headGender === "female" ? family?.spouseAsHusbandName : family?.spouseAsWifeName) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">
                  {(family?.headGender || family?.userGender || "male") === "female" ? "بيانات الزوج" : "بيانات الزوجة"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="space-y-4">
                  <div key={family.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="cursor-not-allowed">
                        <h4 className="font-semibold text-lg text-muted-foreground">{(family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandName : family.spouseAsWifeName}</h4>
                        {((family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandID : family.spouseAsWifeID) && (
                          <p className="text-sm text-muted-foreground">رقم الهوية: {(family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandID : family.spouseAsWifeID}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm opacity-70">
                      {((family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandBirthDate : family.spouseAsWifeBirthDate) && (
                        <div className="cursor-not-allowed">
                          <span className="text-muted-foreground">{(family?.headGender || family?.userGender || "male") === "female" ? "تاريخ ميلاد الزوج: " : "تاريخ ميلاد الزوجة: "}</span>
                          <span className="text-muted-foreground">{formatDateForDisplay((family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandBirthDate : family.spouseAsWifeBirthDate)}</span>
                          <Badge variant="outline" className="ml-2">
                            {calculateDetailedAge((family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandBirthDate : family.spouseAsWifeBirthDate)}
                          </Badge>
                        </div>
                      )}
                      {((family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandJob : family.spouseAsWifeJob) && (
                        <div className="cursor-not-allowed">
                          <span className="text-muted-foreground">{(family?.headGender || family?.userGender || "male") === "female" ? "مهنة الزوج: " : "مهنة الزوجة: "}</span>
                          <span className="text-muted-foreground">{(family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandJob : family.spouseAsWifeJob}</span>
                        </div>
                      )}
                      {((family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandHasChronicIllness : family.spouseAsWifeHasChronicIllness) &&
                       ((family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandChronicIllnessType : family.spouseAsWifeChronicIllnessType) && (
                        <div className="cursor-not-allowed">
                          <span className="text-muted-foreground">{(family?.headGender || family?.userGender || "male") === "female" ? "مرض الزوج المزمن: " : "مرض الزوجة المزمن: "}</span>
                          <span className="text-muted-foreground">{(family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandChronicIllnessType : family.spouseAsWifeChronicIllnessType}</span>
                        </div>
                      )}
                      {((family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandHasDisability : family.spouseAsWifeHasDisability) &&
                       ((family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandDisabilityType : family.spouseAsWifeDisabilityType) && (
                        <div className="cursor-not-allowed">
                          <span className="text-muted-foreground">{(family?.headGender || family?.userGender || "male") === "female" ? "نوع إعاقة الزوج: " : "نوع إعاقة الزوجة: "}</span>
                          <span className="text-muted-foreground">{(family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandDisabilityType : family.spouseAsWifeDisabilityType}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 opacity-70">
                      {(family?.headGender || family?.userGender || "male") === "male" && (family.spouseAsWifePregnant) && ( // Only show pregnancy badge if head is male (i.e., head is male, so spouse could be pregnant)
                        <Badge variant="secondary" className="cursor-not-allowed">حامل</Badge>
                      )}
                      {((family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandHasChronicIllness : family.spouseAsWifeHasChronicIllness) && (
                        <Badge variant="destructive" className="cursor-not-allowed">{(family?.headGender || family?.userGender || "male") === "female" ? "الزوج يعاني من مرض مزمن" : "الزوجة تعاني من مرض مزمن"}</Badge>
                      )}
                      {((family?.headGender || family?.userGender || "male") === "female" ? family.spouseAsHusbandHasDisability : family.spouseAsWifeHasDisability) && (
                        <Badge variant="destructive" className="cursor-not-allowed">{(family?.headGender || family?.userGender || "male") === "female" ? "الزوج يعاني من إعاقة" : "الزوجة تعاني من إعاقة"}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show "No Spouse" message when NOT editing and no spouse data */}
          {!isEditing && !((family?.headGender || family?.userGender || "male") === "female" ? family?.spouseAsHusbandName : family?.spouseAsWifeName) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">
                  {(family?.headGender || family?.userGender || "male") === "female" ? "بيانات الزوج" : "بيانات الزوجة"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  {(family?.headGender || family?.userGender || "male") === "female" ? "لا يوجد زوج مسجل" : "لا توجد زوجة مسجلة"}
                </div>
              </CardContent>
            </Card>
          )}


        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Family Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">عدد أفراد الأسرة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="totalMembers">إجمالي الأفراد *</Label>
                  <Input
                    id="totalMembers"
                    name="totalMembers"
                    type="number"
                    min={1}
                    value={formData.totalMembers}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="text-right"
                  />
                </div>
                <div>
                  <Label htmlFor="numMales">عدد الذكور *</Label>
                  <Input
                    id="numMales"
                    name="numMales"
                    type="number"
                    min={0}
                    value={formData.numMales}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="text-right"
                  />
                </div>
                <div>
                  <Label htmlFor="numFemales">عدد الإناث *</Label>
                  <Input
                    id="numFemales"
                    name="numFemales"
                    type="number"
                    min={0}
                    value={formData.numFemales}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="text-right"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Housing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">بيانات السكن</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="originalResidence">السكن الأصلي *</Label>
                  <Input
                    id="originalResidence"
                    name="originalResidence"
                    value={formData.originalResidence}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="text-right"
                  />
                </div>
                <div>
                  <Label htmlFor="currentHousing">السكن الحالي *</Label>
                  <Input
                    id="currentHousing"
                    name="currentHousing"
                    value={formData.currentHousing}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="text-right"
                  />
                </div>
                <div>
                  <Label htmlFor="landmarkNear">أقرب معلم</Label>
                  <Input
                    id="landmarkNear"
                    name="landmarkNear"
                    value={formData.landmarkNear}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="text-right"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">المعلومات التنظيمية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label>الفرع</Label>
                  {!isEditing ? (
                    // Display mode: show the selected value in a styled div
                    <div className="w-full">
                      <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-not-allowed opacity-70">
                        <span className="text-muted-foreground">
                          {(() => {
                            // Check if the branch is a custom value (not one of the predefined options)
                            const isCustom = !["abushalbia", "alnaqra", "abuawda", "abunasr", "abumatar"].includes(family?.branch || "");
                            return isCustom ? (family?.branch || "غير محدد") : getBranchInArabic(family?.branch || "");
                          })()}
                        </span>
                      </div>
                      {/* Show custom value when not in editing mode and branch is custom */}
                      {!isEditing && family?.branch && !["abushalbia", "alnaqra", "abuawda", "abunasr", "abumatar"].includes(family.branch) && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          القيمة المخصصة: {family.branch}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Edit mode: show the select component with custom input if needed
                    <>
                      <Select
                        disabled={!isEditing}
                        value={formData.branch}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value }))}
                        dir="rtl"
                      >
                        <SelectTrigger className="text-right">
                          <SelectValue placeholder="اختر الفرع" className="text-right" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="abushalbia" className="text-right">ابو شلبية (شلف - علاينة - عزايزة)</SelectItem>
                          <SelectItem value="alnaqra" className="text-right">النقرة (الدوار)</SelectItem>
                          <SelectItem value="abuawda" className="text-right">ابو عودة</SelectItem>
                          <SelectItem value="abunasr" className="text-right">ابو نصر</SelectItem>
                          <SelectItem value="abumatar" className="text-right">ابو مطر</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal & Social Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">المعلومات الشخصية والاجتماعية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label>الحالة الاجتماعية</Label>
                  {!isEditing ? (
                    // Display mode: show the selected value in a disabled select
                    <div className="w-full">
                      <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-not-allowed opacity-70">
                        <span className="text-muted-foreground">
                          {(() => {
                            // Display the social status in Arabic if it's one of the predefined options
                            const isPredefined = ["married", "polygamous", "widowed", "vulnerable_family", "abandoned", "divorced", "single"].includes(family?.socialStatus || "");
                            return isPredefined ? getSocialStatusInArabic(family?.socialStatus || "") : (family?.socialStatus || "غير محدد");
                          })()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    // Edit mode: show the select component with custom input if needed
                    <>
                      <Select
                        disabled={!isEditing}
                        value={formData.socialStatus}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, socialStatus: value }))}
                        dir="rtl"
                      >
                        <SelectTrigger className="text-right">
                          <SelectValue placeholder="اختر الحالة" className="text-right" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="married" className="text-right">متزوج</SelectItem>
                          <SelectItem value="polygamous" className="text-right">متعدد زوجات</SelectItem>
                          <SelectItem value="widowed" className="text-right">ارملة</SelectItem>
                          <SelectItem value="vulnerable_family" className="text-right">اسر هشة (ايتام)</SelectItem>
                          <SelectItem value="abandoned" className="text-right">متروكة</SelectItem>
                          <SelectItem value="divorced" className="text-right">مطلقة</SelectItem>
                          <SelectItem value="single" className="text-right">عانس</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Welfare Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">المعلومات الاجتماعية والمعيشية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="space-y-4">
                {/* All switches grouped together */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="rounded-md border border-input p-3">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Switch
                        id="isDisplaced"
                        disabled={!isEditing}
                        checked={formData.isDisplaced}
                        onCheckedChange={(checked) => handleSwitchChange("isDisplaced", checked)}
                      />
                      <Label htmlFor="isDisplaced" className="cursor-pointer">أسرة نازحة</Label>
                    </div>
                  </div>
                  <div className="rounded-md border border-input p-3">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Switch
                        id="isAbroad"
                        disabled={!isEditing}
                        checked={formData.isAbroad}
                        onCheckedChange={(checked) => handleSwitchChange("isAbroad", checked)}
                      />
                      <Label htmlFor="isAbroad" className="cursor-pointer">مغترب بالخارج</Label>
                    </div>
                  </div>
                  <div className="rounded-md border border-input p-3">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Switch
                        id="warDamage2023"
                        disabled={!isEditing}
                        checked={formData.warDamage2023}
                        onCheckedChange={(checked) => handleSwitchChange("warDamage2023", checked)}
                      />
                      <Label htmlFor="warDamage2023" className="cursor-pointer">أضرار 2023</Label>
                    </div>
                  </div>
                </div>

                {formData.isDisplaced && (
                  <div>
                    <Label htmlFor="displacedLocation">موقع النزوح</Label>
                    <Input
                      id="displacedLocation"
                      name="displacedLocation"
                      value={formData.displacedLocation}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="text-right"
                    />
                  </div>
                )}

                {(!isEditing || formData.warDamage2023) && (
                  <div className="space-y-4">
                    <div>
                      <Label>نوع الأضرار</Label>
                      {!isEditing ? (
                        // Display mode: show the selected value in a styled div
                        <div className="w-full">
                          <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-not-allowed opacity-70">
                            <span className="text-muted-foreground">
                              {(() => {
                                // Display the damage description in Arabic if it's one of the predefined options
                                const isPredefined = ["total_destruction_uninhabitable", "partial_destruction_habitable", "minor_damage"].includes(family?.warDamageDescription || "");
                                return isPredefined ? getDamageDescriptionInArabic(family?.warDamageDescription || "") : (family?.warDamageDescription || "غير محدد");
                              })()}
                            </span>
                          </div>
                        </div>
                      ) : (
                        // Edit mode: show the select component
                        <>
                          <Select
                            disabled={!isEditing}
                            value={formData.warDamageDescription}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, warDamageDescription: value }))}
                            dir="rtl"
                          >
                            <SelectTrigger className="text-right">
                              <SelectValue placeholder="اختر نوع الأضرار" className="text-right" />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              <SelectItem value="total_destruction_uninhabitable" className="text-right">هدم كلي غير قابل للسكن</SelectItem>
                              <SelectItem value="partial_destruction_habitable" className="text-right">هدم جزئي قابل للسكن</SelectItem>
                              <SelectItem value="minor_damage" className="text-right">اضرار بسيطة</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {isEditing && (
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="w-full sm:w-auto order-2 sm:order-1 text-sm sm:text-base"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isLoading || updateFamilyMutation.isPending || createFamilyMutation.isPending}
                className="w-full sm:w-auto order-1 sm:order-2 text-sm sm:text-base"
              >
                {isLoading ? "جاري التحميل..." : (updateFamilyMutation.isPending || createFamilyMutation.isPending) ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          )}
        </form>
      </div>

    </div>
  );
}
