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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const familySchema = z.object({
  husbandName: z.string({ required_error: "الاسم مطلوب", invalid_type_error: "الاسم يجب أن يكون نص" }).min(1, "الاسم مطلوب"),
  husbandID: z.string({ required_error: "رقم الهوية مطلوب", invalid_type_error: "رقم الهوية يجب أن يكون نص" }).regex(/^\d{9}$/, "رقم الهوية يجب أن يكون 9 أرقام"),
  husbandBirthDate: z.string({ required_error: "تاريخ الميلاد مطلوب", invalid_type_error: "تاريخ الميلاد يجب أن يكون نص" }).min(1, "تاريخ الميلاد مطلوب"),
  husbandJob: z.string({ required_error: "المهنة مطلوبة", invalid_type_error: "المهنة يجب أن تكون نص" }).min(1, "المهنة مطلوبة"),
  primaryPhone: z.string({ required_error: "رقم الجوال مطلوب", invalid_type_error: "رقم الجوال يجب أن يكون نص" }).regex(/^(?:\d{9}|\d{10})$/, "رقم الجوال يجب أن يكون 9 أو 10 أرقام"),
  secondaryPhone: z.string({ invalid_type_error: "رقم الجوال البديل يجب أن يكون نص" }).nullable().optional(),
  spouseName: z.string({ invalid_type_error: "اسم الزوج/ة يجب أن يكون نص" }).nullable().optional(),
  spouseID: z.string({ invalid_type_error: "رقم هوية الزوج/ة يجب أن يكون نص" }).regex(/^\d{9}$/, "رقم هوية الزوج/ة يجب أن يكون 9 أرقام").nullable().optional(),
  spouseBirthDate: z.string({ invalid_type_error: "تاريخ ميلاد الزوج/ة يجب أن يكون نص" }).nullable().optional(),
  spouseJob: z.string({ invalid_type_error: "مهنة الزوج/ة يجب أن تكون نص" }).nullable().optional(),
  spousePregnant: z.boolean({ invalid_type_error: "حقل الحمل يجب أن يكون صحيح أو خطأ" }).default(false),
  originalResidence: z.string({ required_error: "السكن الأصلي مطلوب", invalid_type_error: "السكن الأصلي يجب أن يكون نص" }).min(1, "السكن الأصلي مطلوب"),
  currentHousing: z.string({ required_error: "السكن الحالي مطلوب", invalid_type_error: "السكن الحالي يجب أن يكون نص" }).min(1, "السكن الحالي مطلوب"),
  isDisplaced: z.boolean({ invalid_type_error: "حقل النزوح يجب أن يكون صحيح أو خطأ" }).default(false),
  displacedLocation: z.string({ invalid_type_error: "موقع النزوح يجب أن يكون نص" }).nullable().optional(),
  isAbroad: z.boolean({ invalid_type_error: "حقل الاغتراب يجب أن يكون صحيح أو خطأ" }).default(false),
  warDamage2023: z.boolean({ invalid_type_error: "حقل أضرار 2023 يجب أن يكون صحيح أو خطأ" }).default(false),
  warDamageDescription: z.string({ invalid_type_error: "وصف الأضرار يجب أن يكون نص" }).nullable().optional(),
  branch: z.string({ invalid_type_error: "الفرع يجب أن يكون نص" }).nullable().optional(),
  landmarkNear: z.string({ invalid_type_error: "أقرب معلم يجب أن يكون نص" }).nullable().optional(),
  socialStatus: z.string({ invalid_type_error: "الحالة الاجتماعية يجب أن يكون نص" }).nullable().optional(),
  totalMembers: z.coerce.number({ required_error: "عدد الأفراد مطلوب", invalid_type_error: "عدد الأفراد يجب أن يكون رقم" }).min(1, "عدد الأفراد مطلوب"),
  numMales: z.coerce.number({ required_error: "عدد الذكور مطلوب", invalid_type_error: "عدد الذكور يجب أن يكون رقم" }).min(0, "عدد الذكور مطلوب"),
  numFemales: z.coerce.number({ required_error: "عدد الإناث مطلوب", invalid_type_error: "عدد الإنات يجب أن يكون رقم" }).min(0, "عدد الإنات مطلوب"),
  // Chronic illness for head of household
  hasChronicIllness: z.boolean().default(false),
  chronicIllnessType: z.string({ invalid_type_error: "نوع المرض المزمن يجب أن يكون نص" }).nullable().optional(),
  // Chronic illness for spouse
  spouseHasChronicIllness: z.boolean().default(false),
  spouseChronicIllnessType: z.string({ invalid_type_error: "نوع مرض الزوج/ة المزمن يجب أن يكون نص" }).nullable().optional(),
  // Disability for head of household
  hasDisability: z.boolean().default(false),
  disabilityType: z.string({ invalid_type_error: "نوع الإعاقة يجب أن يكون نص" }).nullable().optional(),
  // Disability for spouse
  spouseHasDisability: z.boolean().default(false),
  spouseDisabilityType: z.string({ invalid_type_error: "نوع إعاقة الزوج/ة يجب أن يكون نص" }).nullable().optional(),
  // War injury for head of household
  hasWarInjury: z.boolean().default(false),
  warInjuryType: z.string({ invalid_type_error: "نوع إصابة الحرب يجب أن يكون نص" }).nullable().optional(),
  // War injury for spouse
  spouseHasWarInjury: z.boolean().default(false),
  spouseWarInjuryType: z.string({ invalid_type_error: "نوع إصابة الحرب للزوج/ة يجب أن يكون نص" }).nullable().optional(),
  headGender: z.enum(['male', 'female']).optional(),
}).refine((data) => {
  // If head is female (wife), then husband (spouse) is mandatory
  if (data.headGender === 'female') {
    if (!data.spouseName || data.spouseName.trim() === "") {
      return false;
    }
    if (!data.spouseID || data.spouseID.trim() === "") {
      return false;
    }
  }
  return true;
}, {
  message: "بيانات الزوج مطلوبة عندما تكون رب الأسرة أنثى",
  path: ["spouseName"] // This will show the error on the spouseName field
});

type FamilyFormData = z.infer<typeof familySchema>;

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

  const form = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      husbandName: "",
      husbandID: "",
      husbandBirthDate: "",
      husbandJob: "",
      primaryPhone: "",
      secondaryPhone: "",
      spouseName: null,
      spouseID: null,
      spouseBirthDate: null,
      spouseJob: null,
      spousePregnant: false,
      originalResidence: "",
      currentHousing: "",
      isDisplaced: false,
      displacedLocation: null,
      isAbroad: false,
      warDamage2023: false,
      warDamageDescription: null,
      branch: null,
      landmarkNear: "",
      socialStatus: null,
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
      headGender: "male", // Default value
    },
  });

  // Track current form values to ensure UI updates (must be after form declaration)
  const currentBranch = form.watch("branch");
  const currentSocialStatus = form.watch("socialStatus");
  const currentWarDamageDescription = form.watch("warDamageDescription");


  useEffect(() => {
    if (family) {
      // Reset form with proper values
      const headGender = family.headGender || family.userGender || 'male';
      const formData = {
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
      };

      form.reset(formData);
    }
  }, [family, form]);


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
    mutationFn: async (data: FamilyFormData) => {
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
    mutationFn: async (data: FamilyFormData) => {
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

  const onSubmit = (data: FamilyFormData) => {
    // Clean up optional fields that might be empty strings
    const cleanedData = {
      ...data,
      // Convert empty strings appropriately based on each field's Zod schema
      // For strings: send empty string "" instead of undefined/null to ensure backend receives the update
      secondaryPhone: data.secondaryPhone || "",        // Send empty string to backend to clear value
      spouseName: data.spouseName || null,              // .nullable().optional() - can be null
      spouseID: data.spouseID || "",                    // Send empty string to backend to clear value
      spouseBirthDate: data.spouseBirthDate || null,    // .nullable().optional() - can be null
      spouseJob: data.spouseJob || "",                  // Send empty string to backend to clear value
      displacedLocation: data.displacedLocation || null, // .nullable().optional() - can be null
      warDamageDescription: data.warDamageDescription || null, // .nullable().optional() - can be null
      branch: data.branch || null,                      // .nullable().optional() - can be null
      landmarkNear: data.landmarkNear || "",            // Send empty string to backend to clear value
      socialStatus: data.socialStatus || null,          // .nullable().optional() - can be null
      chronicIllnessType: data.chronicIllnessType || "", // Send empty string to backend to clear value
      spouseChronicIllnessType: data.spouseChronicIllnessType || "", // Send empty string to backend to clear value
      disabilityType: data.disabilityType || "",        // Send empty string to backend to clear value
      spouseDisabilityType: data.spouseDisabilityType || "", // Send empty string to backend to clear value
      warInjuryType: data.warInjuryType || "",          // Send empty string to backend to clear value
      spouseWarInjuryType: data.spouseWarInjuryType || "", // Send empty string to backend to clear value
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
      wifeName: cleanedData.spouseName || null,
      wifeID: cleanedData.spouseID || null,
      wifeBirthDate: cleanedData.spouseBirthDate || null,
      wifeJob: cleanedData.spouseJob || null,
      wifePregnant: cleanedData.spousePregnant || false,
      wifeHasChronicIllness: cleanedData.spouseHasChronicIllness || false,
      wifeChronicIllnessType: cleanedData.spouseChronicIllnessType || null,
      wifeHasDisability: cleanedData.spouseHasDisability || false,
      wifeDisabilityType: cleanedData.spouseDisabilityType || null,
      wifeHasWarInjury: cleanedData.spouseHasWarInjury || false,
      wifeWarInjuryType: cleanedData.spouseWarInjuryType || null,
      // Head of household war injury fields
      hasWarInjury: cleanedData.hasWarInjury || false,
      warInjuryType: cleanedData.warInjuryType || null,
      // Remove form-specific field names that aren't expected by backend
      spouseName: undefined,
      spouseID: undefined,
      spouseBirthDate: undefined,
      spouseJob: undefined,
      spousePregnant: undefined,
      spouseHasChronicIllness: undefined,
      spouseChronicIllnessType: undefined,
      spouseHasDisability: undefined,
      spouseDisabilityType: undefined,
      spouseHasWarInjury: undefined,
      spouseWarInjuryType: undefined,
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

  // Handle submission with validation error toast
  const handleFormSubmit = form.handleSubmit(
    onSubmit,
    // onError callback for validation errors
    (errors) => {
      // Define the actual required fields based on the schema (no .optional() or .nullable())
      const requiredFields = [
        'husbandName', 'husbandID', 'husbandBirthDate', 'husbandJob',
        'primaryPhone', 'originalResidence', 'currentHousing',
        'totalMembers', 'numMales', 'numFemales'
      ];

      // Only include required fields that have validation errors
      const requiredErrorFields = Object.keys(errors).filter(field =>
        requiredFields.includes(field)
      );

      // Check if head is female and spouse fields are missing
      const headGender = form.watch("headGender") || family?.headGender || "male";
      let spouseNameError = false;
      let spouseIdError = false;

      if (headGender === 'female') {
        if (errors.spouseName) {
          spouseNameError = true;
        }
        if (errors.spouseID) {
          spouseIdError = true;
        }
      }

      if (requiredErrorFields.length > 0 || spouseNameError || spouseIdError) {
        // Map field names to Arabic labels
        const fieldLabels: { [key: string]: string } = {
          husbandName: 'اسم رب/ربة الأسرة',
          husbandID: 'رقم هوية رب/ربة الأسرة',
          husbandJob: 'مهنة رب/ربة الأسرة',
          husbandBirthDate: 'تاريخ ميلاد رب/ربة الأسرة',
          primaryPhone: 'الهاتف الأساسي',
          originalResidence: 'السكن الأصلي',
          currentHousing: 'السكن الحالي',
          totalMembers: 'إجمالي الأفراد',
          numMales: 'عدد الذكور',
          numFemales: 'عدد الإناث',
        };

        let errorFieldNames = requiredErrorFields.map(field => fieldLabels[field] || field);

        if (spouseNameError) {
          errorFieldNames.push('اسم الزوج');
        }
        if (spouseIdError) {
          errorFieldNames.push('رقم هوية الزوج');
        }

        toast({
          title: "خطأ في التحقق",
          description: `يرجى مراجعة الحقول المطلوبة: ${errorFieldNames.join(', ')}`,
          variant: "destructive",
        });
      }
      // Note: We removed the general error message as requested
    }
  );


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
        <form onSubmit={handleFormSubmit} className="space-y-6 sm:space-y-8">
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
                    disabled={!isEditing}
                    className="text-right"
                    {...form.register("husbandName")}
                  />
                  {form.formState.errors.husbandName && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.husbandName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="husbandID">رقم الهوية *</Label>
                  <Input
                    id="husbandID"
                    disabled={true}
                    className="text-right"
                    {...form.register("husbandID")}
                  />
                  {form.formState.errors.husbandID && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.husbandID.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="husbandBirthDate">تاريخ الميلاد</Label>
                  <div className="flex items-center space-x-2 space-x-reverse">
                  <Input
                    id="husbandBirthDate"
                    type="date"
                    disabled={!isEditing}
                    {...form.register("husbandBirthDate")}
                  />
                    {form.watch("husbandBirthDate") && (
                      <Badge variant="outline">
                        {calculateDetailedAge(form.watch("husbandBirthDate"))}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="husbandJob">المهنة *</Label>
                  <Input
                    id="husbandJob"
                    disabled={!isEditing}
                    className="text-right"
                    {...form.register("husbandJob")}
                  />
                </div>

                <div>
                  <Label htmlFor="headGender">الجنس</Label>
                  <Select
                    value={form.watch("headGender") || family?.userGender || "male"}
                    onValueChange={(value) => form.setValue("headGender", value)}
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
                    disabled={!isEditing}
                    className="text-right"
                    {...form.register("primaryPhone")}
                  />
                </div>

                <div>
                  <Label htmlFor="secondaryPhone">رقم الجوال البديل</Label>
                  <Input
                    id="secondaryPhone"
                    disabled={!isEditing}
                    className="text-right"
                    {...form.register("secondaryPhone")}
                  />
                  {form.formState.errors.secondaryPhone && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.secondaryPhone.message}
                    </p>
                  )}
                </div>

                {/* Health switches */}
                <div className="sm:col-span-2">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="rounded-md border border-input p-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch
                          id="hasChronicIllness"
                          disabled={!isEditing}
                          checked={form.watch("hasChronicIllness")}
                          onCheckedChange={(checked) => form.setValue("hasChronicIllness", checked)}
                        />
                        <Label htmlFor="hasChronicIllness" className="cursor-pointer">يعاني من مرض مزمن</Label>
                      </div>
                    </div>

                    <div className="rounded-md border border-input p-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch
                          id="hasDisability"
                          disabled={!isEditing}
                          checked={form.watch("hasDisability")}
                          onCheckedChange={(checked) => form.setValue("hasDisability", checked)}
                        />
                        <Label htmlFor="hasDisability" className="cursor-pointer">يعاني من إعاقة</Label>
                      </div>
                    </div>

                    <div className="rounded-md border border-input p-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch
                          id="hasWarInjury"
                          disabled={!isEditing}
                          checked={form.watch("hasWarInjury")}
                          onCheckedChange={(checked) => form.setValue("hasWarInjury", checked)}
                        />
                        <Label htmlFor="hasWarInjury" className="cursor-pointer">يعاني من إصابة حرب</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {form.watch("hasChronicIllness") && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="chronicIllnessType">نوع المرض المزمن</Label>
                    <Input
                      id="chronicIllnessType"
                      placeholder="اذكر نوع المرض المزمن"
                      disabled={!isEditing}
                      {...form.register("chronicIllnessType")}
                    />
                  </div>
                )}

                {form.watch("hasDisability") && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="disabilityType">نوع الإعاقة</Label>
                    <Input
                      id="disabilityType"
                      placeholder="اذكر نوع الإعاقة"
                      disabled={!isEditing}
                      {...form.register("disabilityType")}
                    />
                  </div>
                )}

                {form.watch("hasWarInjury") && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="warInjuryType">نوع إصابة الحرب</Label>
                    <Input
                      id="warInjuryType"
                      placeholder="اذكر نوع إصابة الحرب"
                      disabled={!isEditing}
                      {...form.register("warInjuryType")}
                    />
                  </div>
                )}

                {(form.watch("headGender") || family?.headGender || "male") === "female" && ( // Show pregnancy field when head is female (the head herself could be pregnant)
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="spousePregnant"
                    disabled={!isEditing}
                    checked={form.watch("spousePregnant")}
                    onCheckedChange={(checked) => form.setValue("spousePregnant", checked)}
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
                {(form.watch("headGender") || family?.headGender || "male") === "female" ? "بيانات الزوج" : "بيانات الزوجة"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="spouseName">{(form.watch("headGender") || family?.headGender || "male") === "female" ? "اسم الزوج *" : "اسم الزوجة"}</Label>
                  <Input
                    id="spouseName"
                    disabled={!isEditing}
                    className="text-right"
                    {...form.register("spouseName")}
                  />
                  {form.formState.errors.spouseName && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.spouseName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="spouseID">{(form.watch("headGender") || family?.headGender || "male") === "female" ? "رقم هوية الزوج *" : "رقم هوية الزوجة"}</Label>
                  <Input
                    id="spouseID"
                    disabled={!isEditing}
                    className="text-right"
                    {...form.register("spouseID")}
                  />
                  {form.formState.errors.spouseID && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.spouseID.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="spouseBirthDate">{(form.watch("headGender") || family?.headGender || "male") === "female" ? "تاريخ ميلاد الزوج" : "تاريخ ميلاد الزوجة"}</Label>
                  <Input
                    id="spouseBirthDate"
                    type="date"
                    disabled={!isEditing}
                    className="text-right"
                    {...form.register("spouseBirthDate")}
                  />
                </div>

                <div>
                  <Label htmlFor="spouseJob">{(form.watch("headGender") || family?.headGender || "male") === "female" ? "مهنة الزوج" : "مهنة الزوجة"}</Label>
                  <Input
                    id="spouseJob"
                    disabled={!isEditing}
                    className="text-right"
                    {...form.register("spouseJob")}
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
                          checked={form.watch("spouseHasChronicIllness")}
                          onCheckedChange={(checked) => form.setValue("spouseHasChronicIllness", checked)}
                        />
                        <Label htmlFor="spouseHasChronicIllness" className="cursor-pointer">{(form.watch("headGender") || family?.headGender || "male") === "female" ? "يعاني من مرض مزمن" : "تعاني من مرض مزمن"}</Label>
                      </div>
                    </div>

                    <div className="rounded-md border border-input p-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch
                          id="spouseHasDisability"
                          disabled={!isEditing}
                          checked={form.watch("spouseHasDisability")}
                          onCheckedChange={(checked) => form.setValue("spouseHasDisability", checked)}
                        />
                        <Label htmlFor="spouseHasDisability" className="cursor-pointer">{(form.watch("headGender") || family?.headGender || "male") === "female" ? "يعاني من إعاقة" : "تعاني من إعاقة"}</Label>
                      </div>
                    </div>

                    <div className="rounded-md border border-input p-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch
                          id="spouseHasWarInjury"
                          disabled={!isEditing}
                          checked={form.watch("spouseHasWarInjury")}
                          onCheckedChange={(checked) => form.setValue("spouseHasWarInjury", checked)}
                        />
                        <Label htmlFor="spouseHasWarInjury" className="cursor-pointer">{(form.watch("headGender") || family?.headGender || "male") === "female" ? "يعاني من إصابة حرب" : "تعاني من إصابة حرب"}</Label>
                      </div>
                    </div>

                    {(form.watch("headGender") || family?.headGender || "male") === "male" && ( // Show pregnancy field when head is male (so spouse could be pregnant)
                    <div className="rounded-md border border-input p-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch
                          id="spousePregnant"
                          disabled={!isEditing}
                          checked={form.watch("spousePregnant")}
                          onCheckedChange={(checked) => form.setValue("spousePregnant", checked)}
                        />
                        <Label htmlFor="spousePregnant" className="cursor-pointer">حالة الحمل (الزوجة)</Label>
                      </div>
                    </div>
                    )}
                  </div>
                </div>

                {form.watch("spouseHasChronicIllness") && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="spouseChronicIllnessType">{(form.watch("headGender") || family?.headGender || "male") === "female" ? "نوع مرض الزوج المزمن" : "نوع مرض الزوجة المزمن"}</Label>
                    <Input
                      id="spouseChronicIllnessType"
                      placeholder="اذكر نوع المرض المزمن"
                      disabled={!isEditing}
                      {...form.register("spouseChronicIllnessType")}
                    />
                  </div>
                )}

                {form.watch("spouseHasDisability") && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="spouseDisabilityType">{(form.watch("headGender") || family?.headGender || "male") === "female" ? "نوع إعاقة الزوج" : "نوع إعاقة الزوجة"}</Label>
                    <Input
                      id="spouseDisabilityType"
                      placeholder="اذكر نوع الإعاقة"
                      disabled={!isEditing}
                      {...form.register("spouseDisabilityType")}
                    />
                  </div>
                )}

                {form.watch("spouseHasWarInjury") && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="spouseWarInjuryType">{(form.watch("headGender") || family?.headGender || "male") === "female" ? "نوع إصابة الحرب للزوج" : "نوع إصابة الحرب للزوجة"}</Label>
                    <Input
                      id="spouseWarInjuryType"
                      placeholder="اذكر نوع إصابة الحرب"
                      disabled={!isEditing}
                      {...form.register("spouseWarInjuryType")}
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


        <form onSubmit={handleFormSubmit} className="space-y-6 sm:space-y-8">
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
                    type="number"
                    min={1}
                    disabled={!isEditing}
                    className="text-right"
                    {...form.register("totalMembers")}
                  />
                  {form.formState.errors.totalMembers && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.totalMembers.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="numMales">عدد الذكور *</Label>
                  <Input
                    id="numMales"
                    type="number"
                    min={0}
                    disabled={!isEditing}
                    className="text-right"
                    {...form.register("numMales")}
                  />
                  {form.formState.errors.numMales && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.numMales.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="numFemales">عدد الإناث *</Label>
                  <Input
                    id="numFemales"
                    type="number"
                    min={0}
                    disabled={!isEditing}
                    className="text-right"
                    {...form.register("numFemales")}
                  />
                  {form.formState.errors.numFemales && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.numFemales.message}
                    </p>
                  )}
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
                    disabled={!isEditing}
                    className="text-right"
                    {...form.register("originalResidence")}
                  />
                  {form.formState.errors.originalResidence && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.originalResidence.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="currentHousing">السكن الحالي *</Label>
                  <Input
                    id="currentHousing"
                    disabled={!isEditing}
                    className="text-right"
                    {...form.register("currentHousing")}
                  />
                  {form.formState.errors.currentHousing && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.currentHousing.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="landmarkNear">أقرب معلم</Label>
                  <Input
                    id="landmarkNear"
                    disabled={!isEditing}
                    className="text-right"
                    {...form.register("landmarkNear")}
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
                        value={["abushalbia", "alnaqra", "abuawda", "abunasr", "abumatar"].includes(currentBranch) ? currentBranch : ""}
                        onValueChange={(value) => {
                          form.setValue("branch", value);
                        }}
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
                        value={currentSocialStatus || ""}
                        onValueChange={(value) => {
                          form.setValue("socialStatus", value);
                        }}
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
                        checked={form.watch("isDisplaced")}
                        onCheckedChange={(checked) => form.setValue("isDisplaced", checked)}
                      />
                      <Label htmlFor="isDisplaced" className="cursor-pointer">أسرة نازحة</Label>
                    </div>
                  </div>
                  <div className="rounded-md border border-input p-3">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Switch
                        id="isAbroad"
                        disabled={!isEditing}
                        checked={form.watch("isAbroad")}
                        onCheckedChange={(checked) => form.setValue("isAbroad", checked)}
                      />
                      <Label htmlFor="isAbroad" className="cursor-pointer">مغترب بالخارج</Label>
                    </div>
                  </div>
                  <div className="rounded-md border border-input p-3">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Switch
                        id="warDamage2023"
                        disabled={!isEditing}
                        checked={form.watch("warDamage2023")}
                        onCheckedChange={(checked) => form.setValue("warDamage2023", checked)}
                      />
                      <Label htmlFor="warDamage2023" className="cursor-pointer">أضرار 2023</Label>
                    </div>
                  </div>
                </div>

                {form.watch("isDisplaced") && (
                  <div>
                    <Label htmlFor="displacedLocation">موقع النزوح</Label>
                    <Input
                      id="displacedLocation"
                      disabled={!isEditing}
                      className="text-right"
                      {...form.register("displacedLocation")}
                    />
                  </div>
                )}

                {(!isEditing || form.watch("warDamage2023")) && (
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
                            value={currentWarDamageDescription || ""}
                            onValueChange={(value) => {
                              form.setValue("warDamageDescription", value);
                            }}
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
