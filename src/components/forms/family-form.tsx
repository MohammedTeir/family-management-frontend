import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const familySchema = z.object({
  headName: z.string().min(1, "الاسم مطلوب"),
  headID: z.string().regex(/^\d{9}$/, "رقم الهوية يجب أن يكون 9 أرقام"),
  headBirthDate: z.string().min(1, "تاريخ الميلاد مطلوب"),
  headJob: z.string().min(1, "المهنة مطلوبة"),
  headGender: z.enum(['male', 'female', 'other']).default('male'),
  primaryPhone: z.string().regex(/^(?:\d{9}|\d{10})$/, "رقم الجوال يجب أن يكون 9 أو 10 أرقام"),
  secondaryPhone: z.string().regex(/^(?:\d{9}|\d{10})$/, "رقم الجوال البديل يجب أن يكون 9 أو 10 أرقام").optional(),
  spouseName: z.string().optional(),
  spouseID: z.string().regex(/^\d{9}$/, "رقم هوية الزوج/ة يجب أن يكون 9 أرقام").optional(),
  spouseBirthDate: z.string().optional(),
  spouseJob: z.string().optional(),
  spousePregnant: z.string().optional(),
  originalResidence: z.string().optional(),
  currentHousingStatus: z.string().optional(),
  isDisplaced: z.boolean().default(false),
  displacedLocation: z.string().optional(),
  isAbroad: z.boolean().default(false),
  warDamage2023: z.string().optional(),
  branch: z.string().optional(),
  landmarkNear: z.string().optional(),
  socialStatus: z.string().optional(),
}).refine((data) => {
  // If head is female (wife), then husband (spouse) is mandatory
  if (data.headGender === 'female' && (!data.spouseName || data.spouseName.trim() === "")) {
    return false;
  }
  // If head is female (wife), then husband ID (spouseID) is mandatory
  if (data.headGender === 'female' && (!data.spouseID || data.spouseID.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "بيانات الزوج مطلوبة عندما تكون رب الأسرة أنثى",
  path: ["spouseName"] // This will show the error on the spouseName field
});

type FamilyFormData = z.infer<typeof familySchema>;

interface FamilyFormProps {
  initialData?: Partial<FamilyFormData>;
  onSubmit: (data: FamilyFormData) => void;
  isLoading?: boolean;
  isEditable?: boolean;
}

export default function FamilyForm({ 
  initialData, 
  onSubmit, 
  isLoading = false,
  isEditable = true 
}: FamilyFormProps) {
  const form = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      headName: initialData?.headName || initialData?.husbandName || "",
      headID: initialData?.headID || initialData?.husbandID || "",
      headBirthDate: initialData?.headBirthDate || initialData?.husbandBirthDate || "",
      headJob: initialData?.headJob || initialData?.husbandJob || "",
      headGender: initialData?.headGender || 'male',
      primaryPhone: initialData?.primaryPhone || "",
      secondaryPhone: initialData?.secondaryPhone || "",
      spouseName: initialData?.spouseName || initialData?.wifeName || "",
      spouseID: initialData?.spouseID || initialData?.wifeID || "",
      spouseBirthDate: initialData?.spouseBirthDate || initialData?.wifeBirthDate || "",
      spouseJob: initialData?.spouseJob || initialData?.wifeJob || "",
      spousePregnant: initialData?.spousePregnant?.toString() || initialData?.wifePregnant?.toString() || "",
      spouseHasDisability: initialData?.spouseHasDisability !== undefined ? initialData?.spouseHasDisability : initialData?.wifeHasDisability,
      spouseDisabilityType: initialData?.spouseDisabilityType || initialData?.wifeDisabilityType || "",
      spouseHasChronicIllness: initialData?.spouseHasChronicIllness !== undefined ? initialData?.spouseHasChronicIllness : initialData?.wifeHasChronicIllness,
      spouseChronicIllnessType: initialData?.spouseChronicIllnessType || initialData?.wifeChronicIllnessType || "",
      originalResidence: initialData?.originalResidence || "",
      currentHousingStatus: initialData?.currentHousingStatus || "",
      isDisplaced: initialData?.isDisplaced || false,
      displacedLocation: initialData?.displacedLocation || "",
      isAbroad: initialData?.isAbroad || false,
      warDamage2023: initialData?.warDamage2023 || "",
      branch: initialData?.branch || "",
      landmarkNear: initialData?.landmarkNear || "",
      socialStatus: initialData?.socialStatus || "",
      ...initialData,
    },
  });

  const handleSubmit = (data: FamilyFormData) => {
    // Map the form fields to the backend format (backward compatibility)
    const backendData = {
      ...data,
      husbandName: data.headName,
      husbandID: data.headID,
      husbandBirthDate: data.headBirthDate,
      husbandJob: data.headJob,
      wifeName: data.spouseName,
      wifeID: data.spouseID,
      wifeBirthDate: data.spouseBirthDate,
      wifeJob: data.spouseJob,
      wifePregnant: data.spousePregnant,
      // Remove the form-specific field names that aren't expected by backend
      headName: undefined,
      headID: undefined,
      headBirthDate: undefined,
      headJob: undefined,
      spouseName: undefined,
      spouseID: undefined,
      spouseBirthDate: undefined,
      spouseJob: undefined,
      spousePregnant: undefined,
    };

    onSubmit(backendData);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Head of Household Information */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">بيانات رب/ربة الأسرة</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label htmlFor="headName" className="text-sm sm:text-base font-medium">الاسم الرباعي *</Label>
              <Input
                id="headName"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("headName")}
              />
              {form.formState.errors.headName && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {form.formState.errors.headName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="headID" className="text-sm sm:text-base font-medium">رقم الهوية *</Label>
              <Input
                id="headID"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("headID")}
              />
              {form.formState.errors.headID && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {form.formState.errors.headID.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="headBirthDate" className="text-sm sm:text-base font-medium">تاريخ الميلاد *</Label>
              <Input
                id="headBirthDate"
                type="date"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("headBirthDate")}
              />
              {form.formState.errors.headBirthDate && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {form.formState.errors.headBirthDate.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="headJob" className="text-sm sm:text-base font-medium">المهنة *</Label>
              <Input
                id="headJob"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("headJob")}
              />
              {form.formState.errors.headJob && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {form.formState.errors.headJob.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="headGender" className="text-sm sm:text-base font-medium">الجنس</Label>
              <Select
                disabled={!isEditable}
                value={form.watch("headGender")}
                onValueChange={(value) => form.setValue("headGender", value)}
              >
                <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base mt-1">
                  <SelectValue placeholder="اختر الجنس" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male" className="text-sm sm:text-base">ذكر</SelectItem>
                  <SelectItem value="female" className="text-sm sm:text-base">أنثى</SelectItem>
                  <SelectItem value="other" className="text-sm sm:text-base">آخر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="primaryPhone" className="text-sm sm:text-base font-medium">رقم الجوال الأساسي *</Label>
              <Input
                id="primaryPhone"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("primaryPhone")}
              />
              {form.formState.errors.primaryPhone && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {form.formState.errors.primaryPhone.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="secondaryPhone" className="text-sm sm:text-base font-medium">رقم الجوال البديل</Label>
              <Input
                id="secondaryPhone"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("secondaryPhone")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spouse Information */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">
            {form.watch("headGender") === "female" ? "بيانات الزوج" : "بيانات الزوجة"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label htmlFor="spouseName" className="text-sm sm:text-base font-medium">
                {form.watch("headGender") === "female" ? "الاسم الرباعي *" : "الاسم الرباعي"}
              </Label>
              <Input
                id="spouseName"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("spouseName")}
              />
              {form.formState.errors.spouseName && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {form.formState.errors.spouseName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="spouseID" className="text-sm sm:text-base font-medium">
                {form.watch("headGender") === "female" ? "رقم الهوية *" : "رقم الهوية"}
              </Label>
              <Input
                id="spouseID"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("spouseID")}
              />
              {form.formState.errors.spouseID && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {form.formState.errors.spouseID.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="spouseBirthDate" className="text-sm sm:text-base font-medium">تاريخ الميلاد</Label>
              <Input
                id="spouseBirthDate"
                type="date"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("spouseBirthDate")}
              />
            </div>

            <div>
              <Label htmlFor="spouseJob" className="text-sm sm:text-base font-medium">المهنة</Label>
              <Input
                id="spouseJob"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("spouseJob")}
              />
            </div>

            <div>
              <Label htmlFor="spousePregnant" className="text-sm sm:text-base font-medium">حالة الحمل</Label>
              <Input
                id="spousePregnant"
                disabled={!isEditable}
                placeholder="حامل - الشهر السادس"
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("spousePregnant")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Housing Information */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">بيانات السكن</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label htmlFor="originalResidence" className="text-sm sm:text-base font-medium">السكن الأصلي</Label>
              <Input
                id="originalResidence"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("originalResidence")}
              />
            </div>

            <div>
              <Label htmlFor="currentHousingStatus" className="text-sm sm:text-base font-medium">السكن الحالي</Label>
              <Input
                id="currentHousingStatus"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("currentHousingStatus")}
              />
            </div>

            <div>
              <Label htmlFor="branch" className="text-sm sm:text-base font-medium">الفرع/الموقع</Label>
              <Input
                id="branch"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("branch")}
              />
            </div>

            <div>
              <Label htmlFor="landmarkNear" className="text-sm sm:text-base font-medium">أقرب معلم</Label>
              <Input
                id="landmarkNear"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("landmarkNear")}
              />
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch
                id="isDisplaced"
                disabled={!isEditable}
                checked={form.watch("isDisplaced")}
                onCheckedChange={(checked) => form.setValue("isDisplaced", checked)}
              />
              <Label htmlFor="isDisplaced" className="text-sm sm:text-base font-medium">أسرة نازحة</Label>
            </div>

            {form.watch("isDisplaced") && (
              <div>
                <Label htmlFor="displacedLocation" className="text-sm sm:text-base font-medium">موقع النزوح</Label>
                <Input
                  id="displacedLocation"
                  disabled={!isEditable}
                  className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                  {...form.register("displacedLocation")}
                />
              </div>
            )}

            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch
                id="isAbroad"
                disabled={!isEditable}
                checked={form.watch("isAbroad")}
                onCheckedChange={(checked) => form.setValue("isAbroad", checked)}
              />
              <Label htmlFor="isAbroad" className="text-sm sm:text-base font-medium">مغترب بالخارج</Label>
            </div>

            <div>
              <Label htmlFor="warDamage2023" className="text-sm sm:text-base font-medium">أضرار 2023</Label>
              <Textarea
                id="warDamage2023"
                disabled={!isEditable}
                className="min-h-20 sm:min-h-24 text-sm sm:text-base mt-1"
                {...form.register("warDamage2023")}
              />
            </div>

            <div>
              <Label htmlFor="socialStatus" className="text-sm sm:text-base font-medium">الحالة الاجتماعية</Label>
              <Select
                disabled={!isEditable}
                value={form.watch("socialStatus") || ""}
                onValueChange={(value) => form.setValue("socialStatus", value)}
              >
                <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base mt-1">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="married" className="text-sm sm:text-base">متزوج</SelectItem>
                  <SelectItem value="polygamous" className="text-sm sm:text-base">متعدد زوجات</SelectItem>
                  <SelectItem value="widowed" className="text-sm sm:text-base">ارملة</SelectItem>
                  <SelectItem value="vulnerable_family" className="text-sm sm:text-base">اسر هشة (ايتام)</SelectItem>
                  <SelectItem value="abandoned" className="text-sm sm:text-base">متروكة</SelectItem>
                  <SelectItem value="divorced" className="text-sm sm:text-base">مطلقة</SelectItem>
                  <SelectItem value="single" className="text-sm sm:text-base">عانس</SelectItem>
                  <SelectItem value="custom" className="text-sm sm:text-base">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isEditable && (
        <div className="flex justify-end pt-2 sm:pt-4">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2 sm:px-8 sm:py-3 text-sm sm:text-base"
          >
            {isLoading ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      )}
    </form>
  );
}
