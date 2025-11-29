import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const orphanSchema = z.object({
  orphanName: z.string().min(1, "اسم اليتيم مطلوب"),
  orphanBirthDate: z.string().min(1, "تاريخ ميلاد اليتيم مطلوب"),
  orphanID: z.string().regex(/^\d{9}$/, "رقم هوية اليتيم يجب أن يكون 9 أرقام").min(1, "رقم الهوية مطلوب"),
  gender: z.enum(['male', 'female'], {
    errorMap: (issue, ctx) => {
      if (issue.code === 'invalid_enum_value') {
        return { message: 'الجنس مطلوب' };
      }
      return { message: ctx.defaultError };
    }
  }),
  guardianName: z.string().min(1, "اسم الوصي مطلوب"),
  guardianID: z.string().regex(/^\d{9}$/, "رقم هوية الوصي يجب أن يكون 9 أرقام").min(1, "رقم هوية الوصي مطلوب"),
  guardianBirthDate: z.string().min(1, "تاريخ ميلاد الوصي مطلوب"),
  fatherName: z.string().min(1, "اسم الاب مطلوب"),
  fatherID: z.string().regex(/^\d{9}$/, "رقم هوية الاب يجب أن يكون 9 أرقام").min(1, "رقم هوية الاب مطلوب"),
  martyrdomDate: z.string().min(1, "تاريخ الاستشهاد مطلوب"),
  martyrdomType: z.enum(['war_2023', 'pre_2023_war', 'natural_death'], {
    errorMap: (issue, ctx) => {
      if (issue.code === 'invalid_enum_value') {
        return { message: 'حالة الوفاة مطلوبة' };
      }
      return { message: ctx.defaultError };
    }
  }),
  bankAccountNumber: z.string().min(1, "رقم حساب البنك مطلوب"),
  accountHolderName: z.string().min(1, "اسم صاحب الحساب مطلوب"),
  currentAddress: z.string().min(1, "العنوان الحالي مطلوب"),
  originalAddress: z.string().min(1, "العنوان الاصلي مطلوب"),
  mobileNumber: z.string().regex(/^\d{10}$/, "رقم الجوال يجب أن يكون 10 أرقام").min(1, "رقم الجوال مطلوب"),
  backupMobileNumber: z.string().regex(/^\d{10}$/, "رقم الجوال الاحتياطي يجب أن يكون 10 أرقام").min(1, "رقم الجوال الاحتياطي مطلوب"),
  image: z.string().optional(), // Optional image field
});

type OrphanFormData = z.infer<typeof orphanSchema>;

interface OrphanFormProps {
  initialData?: Partial<OrphanFormData>;
  onSubmit: (data: OrphanFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

export default function OrphanForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  isEdit = false
}: OrphanFormProps) {
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null); // For newly selected image
  // Don't use state for hasNewImage since it's determined by whether newImagePreview exists


  const form = useForm<OrphanFormData>({
    resolver: zodResolver(orphanSchema),
    defaultValues: {
      orphanName: initialData?.orphanName || "",
      orphanBirthDate: initialData?.orphanBirthDate || "",
      orphanID: initialData?.orphanID || "",
      gender: initialData?.gender || "",
      guardianName: initialData?.guardianName || "",
      guardianID: initialData?.guardianID || "",
      guardianBirthDate: initialData?.guardianBirthDate || "",
      fatherName: initialData?.fatherName || "",
      fatherID: initialData?.fatherID || "",
      martyrdomDate: initialData?.martyrdomDate || "",
      martyrdomType: initialData?.martyrdomType || "",
      bankAccountNumber: initialData?.bankAccountNumber || "",
      accountHolderName: initialData?.accountHolderName || "",
      currentAddress: initialData?.currentAddress || "",
      originalAddress: initialData?.originalAddress || "",
      mobileNumber: initialData?.mobileNumber || "",
      backupMobileNumber: initialData?.backupMobileNumber || "",
      image: initialData?.image || "",
    },
  });



  // Clean up new image preview when component unmounts
  useEffect(() => {
    return () => {
      if (newImagePreview && newImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(newImagePreview);
      }
    };
  }, [newImagePreview]);

  const handleSubmit = (data: OrphanFormData) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 sm:space-y-4 lg:space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="orphanName" className="text-sm sm:text-base font-medium">اسم اليتيم *</Label>
          <Input
            id="orphanName"
            placeholder="اسم اليتيم"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("orphanName")}
          />
          {form.formState.errors.orphanName && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.orphanName.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="orphanID" className="text-sm sm:text-base font-medium">رقم هوية اليتيم *</Label>
          <Input
            id="orphanID"
            placeholder="رقم هوية اليتيم"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("orphanID")}
          />
          {form.formState.errors.orphanID && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.orphanID.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="orphanBirthDate" className="text-sm sm:text-base font-medium">تاريخ ميلاد اليتيم *</Label>
          <Input
            id="orphanBirthDate"
            type="date"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("orphanBirthDate")}
          />
          {form.formState.errors.orphanBirthDate && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.orphanBirthDate.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="gender" className="text-sm sm:text-base font-medium">الجنس *</Label>
          <Select
            value={["male", "female"].includes(form.watch("gender") || "") ? form.watch("gender") : ""}
            onValueChange={(value) => form.setValue("gender", value)}
            dir="rtl"
          >
            <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base mt-1">
              <SelectValue placeholder="اختر الجنس" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="male" className="text-sm sm:text-base">ذكر</SelectItem>
              <SelectItem value="female" className="text-sm sm:text-base">أنثى</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.gender && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.gender.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="guardianName" className="text-sm sm:text-base font-medium">اسم الوصي *</Label>
          <Input
            id="guardianName"
            placeholder="اسم الوصي"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("guardianName")}
          />
          {form.formState.errors.guardianName && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.guardianName.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="guardianID" className="text-sm sm:text-base font-medium">رقم هوية الوصي *</Label>
          <Input
            id="guardianID"
            placeholder="رقم هوية الوصي"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("guardianID")}
          />
          {form.formState.errors.guardianID && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.guardianID.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="guardianBirthDate" className="text-sm sm:text-base font-medium">تاريخ ميلاد الوصي *</Label>
          <Input
            id="guardianBirthDate"
            type="date"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("guardianBirthDate")}
          />
          {form.formState.errors.guardianBirthDate && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.guardianBirthDate.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="fatherName" className="text-sm sm:text-base font-medium">اسم الاب *</Label>
          <Input
            id="fatherName"
            placeholder="اسم الاب"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("fatherName")}
          />
          {form.formState.errors.fatherName && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.fatherName.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="fatherID" className="text-sm sm:text-base font-medium">رقم هوية الاب *</Label>
          <Input
            id="fatherID"
            placeholder="رقم هوية الاب"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("fatherID")}
          />
          {form.formState.errors.fatherID && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.fatherID.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="martyrdomDate" className="text-sm sm:text-base font-medium">تاريخ الاستشهاد *</Label>
          <Input
            id="martyrdomDate"
            type="date"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("martyrdomDate")}
          />
          {form.formState.errors.martyrdomDate && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.martyrdomDate.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="martyrdomType" className="text-sm sm:text-base font-medium">حالة الوفاة *</Label>
          <Select
            value={["war_2023", "pre_2023_war", "natural_death"].includes(form.watch("martyrdomType") || "") ? form.watch("martyrdomType") : ""}
            onValueChange={(value) => form.setValue("martyrdomType", value)}
            dir="rtl"
          >
            <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base mt-1">
              <SelectValue placeholder="اختر حالة الوفاة" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="war_2023" className="text-sm sm:text-base">شهيد حرب ٢٠٢٣</SelectItem>
              <SelectItem value="pre_2023_war" className="text-sm sm:text-base">شهيد حرب ما قبل ذلك</SelectItem>
              <SelectItem value="natural_death" className="text-sm sm:text-base">وفاة طبيعية</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.martyrdomType && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.martyrdomType.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="bankAccountNumber" className="text-sm sm:text-base font-medium">رقم حساب البنك *</Label>
          <Input
            id="bankAccountNumber"
            placeholder="رقم حساب البنك"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("bankAccountNumber")}
          />
          {form.formState.errors.bankAccountNumber && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.bankAccountNumber.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="accountHolderName" className="text-sm sm:text-base font-medium">اسم صاحب الحساب *</Label>
          <Input
            id="accountHolderName"
            placeholder="اسم صاحب الحساب"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("accountHolderName")}
          />
          {form.formState.errors.accountHolderName && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.accountHolderName.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="mobileNumber" className="text-sm sm:text-base font-medium">رقم الجوال *</Label>
          <Input
            id="mobileNumber"
            placeholder="رقم الجوال"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("mobileNumber")}
          />
          {form.formState.errors.mobileNumber && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.mobileNumber.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="backupMobileNumber" className="text-sm sm:text-base font-medium">رقم جوال احتياطي *</Label>
          <Input
            id="backupMobileNumber"
            placeholder="رقم جوال احتياطي"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("backupMobileNumber")}
          />
          {form.formState.errors.backupMobileNumber && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.backupMobileNumber.message}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="currentAddress" className="text-sm sm:text-base font-medium">العنوان الحالي *</Label>
          <Input
            id="currentAddress"
            placeholder="العنوان الحالي"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("currentAddress")}
          />
          {form.formState.errors.currentAddress && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.currentAddress.message}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="originalAddress" className="text-sm sm:text-base font-medium">العنوان الاصلي *</Label>
          <Input
            id="originalAddress"
            placeholder="العنوان الاصلي"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1 text-right"
            dir="rtl"
            {...form.register("originalAddress")}
          />
          {form.formState.errors.originalAddress && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.originalAddress.message}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="image" className="text-sm sm:text-base font-medium">رفع صورة اليتيم</Label>
          <div className="mt-1">
            <Input
              id="image"
              type="file"
              accept="image/*"
              className="hidden"
              dir="rtl"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Create preview for the selected file immediately
                  const previewUrl = URL.createObjectURL(file);
                  setNewImagePreview(previewUrl);

                  // Convert image to base64 for sending to backend
                  const reader = new FileReader();
                  reader.onload = () => {
                    // Set the base64 value to the form
                    form.setValue("image", reader.result as string);
                    // Update preview to the base64 version after FileReader completes
                    setNewImagePreview(reader.result as string);
                    // Clean up the blob preview URL since we're now using base64
                    URL.revokeObjectURL(previewUrl);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => document.getElementById('image')?.click()}
            >
              <span className="text-right flex-1">
                {form.watch('image') ? 'تم اختيار ملف' : 'اختر ملف'}
              </span>
              <span className="text-xs text-muted-foreground mr-2">...</span>
            </Button>
          </div>

          {/* Show image preview for newly selected image or current image when editing */}
          {(initialData?.image || newImagePreview) && (
            <div className="mt-2">
              <Label className="text-sm text-muted-foreground">معاينة الصورة:</Label>
              <div className="mt-1 flex justify-center items-center">
                <img
                  src={newImagePreview || initialData?.image}
                  alt="معاينة صورة اليتيم"
                  className="max-h-32 max-w-full object-contain border rounded"
                  onError={() => {
                    // If there's an error loading the preview, fallback to the initial image
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
              {!newImagePreview && initialData?.image && (
                <div className="text-xs text-muted-foreground text-center mt-1">
                  هذه صورة اليتيم الحالية
                </div>
              )}
            </div>
          )}

          {form.formState.errors.image && (
            <p className="text-xs sm:text-sm text-destructive mt-1">
              {form.formState.errors.image.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 sm:space-x-reverse pt-4 sm:pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base order-2 sm:order-1"
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base order-1 sm:order-2"
        >
          {isLoading ? "جاري الحفظ..." : isEdit ? "تحديث" : "إضافة"}
        </Button>
      </div>
    </form>
  );
}