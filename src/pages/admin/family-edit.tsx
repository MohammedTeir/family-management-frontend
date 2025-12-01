import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Edit2, Plus, Trash2, ArrowLeft, Users } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getRelationshipInArabic, getGenderInArabic, calculateDetailedAge, getBranchInArabic, getDamageDescriptionInArabic, getSocialStatusInArabic } from "@/lib/utils";
import { compressImage } from "@/lib/image-compression";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
const DAMAGE_DESCRIPTIONS = [
  { value: "total_destruction_uninhabitable", label: "هدم كلي غير قابل للسكن" },
  { value: "partial_destruction_habitable", label: "هدم جزئي قابل للسكن" },
  { value: "minor_damage", label: "أضرار بسيطة" },
];
const RELATIONSHIPS = [
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
  { value: "other", label: "أخرى" },
];

export default function AdminFamilyEdit({ params }: { params: { id: string } }) {
  const id = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState("family");
  const [editingMember, setEditingMember] = useState<any>(null);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  // Custom fields for member (socialStatus and warDamageDescription no longer use custom options)
  const [customRelationship, setCustomRelationship] = useState("");
  const [showCustomRelationship, setShowCustomRelationship] = useState(false);
  const [showDisabilityType, setShowDisabilityType] = useState(false);
  const [customDisabilityType, setCustomDisabilityType] = useState("");
  const [showChronicIllnessType, setShowChronicIllnessType] = useState(false);
  const [customChronicIllnessType, setCustomChronicIllnessType] = useState("");
  // Fetch family details by ID
  const { data: family, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/families", id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/admin/families/${id}`);
      return response.data;
    },
    enabled: !!id,
  });


  // Update family mutation
  const updateFamilyMutation = useMutation({
    mutationFn: async (data: any) => {
      // Remove wives from data since they are handled directly now
      const { wives, userGender, ...familyData } = data;

      // Clean up wife data - if empty values, convert to null
      if (familyData.wifeName === "") familyData.wifeName = null;
      if (familyData.wifeID === "") familyData.wifeID = null;
      if (familyData.wifeBirthDate === "") familyData.wifeBirthDate = null;
      if (familyData.wifeJob === "") familyData.wifeJob = null;

      // Handle chronic illness fields
      if (familyData.hasChronicIllness === undefined) familyData.hasChronicIllness = false;
      if (familyData.hasChronicIllness === false) familyData.chronicIllnessType = null;

      if (familyData.wifeHasChronicIllness === undefined) familyData.wifeHasChronicIllness = false;
      if (familyData.wifeHasChronicIllness === false) familyData.wifeChronicIllnessType = null;

      // Handle disability fields
      if (familyData.hasDisability === undefined) familyData.hasDisability = false;
      if (familyData.hasDisability === false) familyData.disabilityType = null;

      if (familyData.wifeHasDisability === undefined) familyData.wifeHasDisability = false;
      if (familyData.wifeHasDisability === false) familyData.wifeDisabilityType = null;

      // Handle war injury fields
      if (familyData.hasWarInjury === undefined) familyData.hasWarInjury = false;
      if (familyData.hasWarInjury === false) familyData.warInjuryType = null;

      if (familyData.wifeHasWarInjury === undefined) familyData.wifeHasWarInjury = false;
      if (familyData.wifeHasWarInjury === false) familyData.wifeWarInjuryType = null;

      // First update the family
      const familyResponse = await apiClient.put(`/api/admin/families/${id}`, familyData);

      // Then update the user's gender if it was changed
      if (userGender !== undefined && family?.userId) {
        try {
          await apiClient.put(`/api/admin/users/${family.userId}`, {
            gender: userGender
          });
        } catch (error) {
          console.error("Error updating user gender:", error);
          // Don't throw error here since the family update was successful
        }
      }

      return familyResponse.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/families", id] });
      toast({ title: "تم التحديث بنجاح", description: "تم حفظ بيانات الأسرة" });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "خطأ في التحديث", description: error.message, variant: "destructive" });
    },
  });

  // Member mutations
  const createMemberMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.relationship === "other") data.relationship = customRelationship;
      if (data.isDisabled && data.disabilityType === "custom") data.disabilityType = customDisabilityType;
      const response = await apiClient.post(`/api/admin/families/${id}/members`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/families", id] });
      toast({ title: "تمت إضافة الفرد", description: "تمت إضافة الفرد بنجاح" });
      setIsMemberDialogOpen(false);
      setEditingMember(null);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "خطأ في الإضافة", description: error.message, variant: "destructive" });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, data }: { memberId: number; data: any }) => {
      if (data.relationship === "other") data.relationship = customRelationship;
      if (data.isDisabled && data.disabilityType === "custom") data.disabilityType = customDisabilityType;
      const response = await apiClient.put(`/api/members/${memberId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/families", id] });
      toast({ title: "تم التحديث", description: "تم تحديث بيانات الفرد" });
      setIsMemberDialogOpen(false);
      setEditingMember(null);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "خطأ في التحديث", description: error.message, variant: "destructive" });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      await apiClient.delete(`/api/members/${memberId}`);
      return memberId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/families", id] });
      toast({ title: "تم الحذف", description: "تم حذف الفرد بنجاح" });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "خطأ في الحذف", description: error.message, variant: "destructive" });
    },
  });

  // Orphan state and mutations
  const [editingOrphan, setEditingOrphan] = useState<any>(null);
  const [isOrphanDialogOpen, setIsOrphanDialogOpen] = useState(false);

  // Orphan mutations
  const createOrphanMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post(`/api/orphans`, { ...data, familyId: Number(id) });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/families", id] });
      toast({ title: "تمت إضافة اليتيم", description: "تمت إضافة اليتيم بنجاح" });
      setIsOrphanDialogOpen(false);
      setEditingOrphan(null);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "خطأ في الإضافة", description: error.message, variant: "destructive" });
    },
  });

  const updateOrphanMutation = useMutation({
    mutationFn: async ({ orphanId, data }: { orphanId: number; data: any }) => {
      const response = await apiClient.put(`/api/orphans/${orphanId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/families", id] });
      toast({ title: "تم التحديث", description: "تم تحديث بيانات اليتيم" });
      setIsOrphanDialogOpen(false);
      setEditingOrphan(null);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "خطأ في التحديث", description: error.message, variant: "destructive" });
    },
  });

  const deleteOrphanMutation = useMutation({
    mutationFn: async (orphanId: number) => {
      await apiClient.delete(`/api/orphans/${orphanId}`);
      return orphanId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/families", id] });
      toast({ title: "تم الحذف", description: "تم حذف اليتيم بنجاح" });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "خطأ في الحذف", description: error.message, variant: "destructive" });
    },
  });

  // Handle custom relationship and disability type for member form
  useEffect(() => {
    if (editingMember) {
      setShowCustomRelationship(!RELATIONSHIPS.some(r => r.value === editingMember.relationship));
      setCustomRelationship(editingMember.relationship && !RELATIONSHIPS.some(r => r.value === editingMember.relationship) ? editingMember.relationship : "");
      setShowDisabilityType(editingMember.isDisabled);
      setCustomDisabilityType(editingMember.disabilityType || "");
    } else {
      setShowCustomRelationship(false);
      setCustomRelationship("");
      setShowDisabilityType(false);
      setCustomDisabilityType("");
    }
  }, [editingMember]);

  // Family form state
  const [familyForm, setFamilyForm] = useState<any>(null);

  // When family data loads or changes, update the form state
  useEffect(() => {
    if (family) {
      // Ensure chronic illness fields are properly initialized
      setFamilyForm({
        ...family,
        hasChronicIllness: family.hasChronicIllness || false,
        wifeHasChronicIllness: family.wifeHasChronicIllness || false,
        hasDisability: family.hasDisability || false,
        wifeHasDisability: family.wifeHasDisability || false,
        hasWarInjury: family.hasWarInjury || false,
        wifeHasWarInjury: family.wifeHasWarInjury || false
      });
    }
  }, [family]);

  // When editing member changes, initialize custom states
  useEffect(() => {
    if (editingMember) {
      // Initialize custom states based on the editing member
      if (editingMember.isDisabled) {
        setCustomDisabilityType(editingMember.disabilityType || "");
        setShowDisabilityType(true);
      } else {
        setCustomDisabilityType("");
        setShowDisabilityType(false);
      }

      if (editingMember.hasChronicIllness) {
        setCustomChronicIllnessType(editingMember.chronicIllnessType || "");
        setShowChronicIllnessType(true);
      } else {
        setCustomChronicIllnessType("");
        setShowChronicIllnessType(false);
      }
    }
  }, [editingMember]);

  // Handle family form changes
  function handleFamilyChange(e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: string; type?: string; checked?: boolean } }) {
    const { name, value, type, checked } = e.target;
    setFamilyForm((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  // Handle family form submit
  function handleFamilySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    updateFamilyMutation.mutate({
      ...familyForm,
      branch: familyForm.branch,
    });
  }

  if (isLoading || !familyForm) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">جاري تحميل بيانات الأسرة...</div>
        </div>
      </PageWrapper>
    );
  }

  if (!family) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">لا توجد بيانات متاحة لهذه الأسرة.</div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6" dir="rtl">
          {/* Top right button for families page */}
          <div className="flex flex-row-reverse justify-end mb-4 w-full">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin/families")}
              className="flex flex-row-reverse items-center"
            >
              <ArrowLeft className="h-5 w-5 ml-2" /> عودة لقائمة الأسر
            </Button>
          </div>
          {/* Tabs and title bar */}
          <div className="mb-6 flex flex-col md:flex-row-reverse md:items-center md:justify-between w-full gap-4">
            <div className="flex flex-row-reverse items-center gap-4">
              <h1 className="text-lg md:text-2xl font-bold text-foreground ml-2 md:ml-4">
                تعديل بيانات الأسرة <Badge className="bg-blue-100 text-blue-800 text-xs md:text-sm">#{family.id}</Badge>
              </h1>
            </div>
            <Tabs value={tab} onValueChange={setTab} className="mb-0 w-full md:w-auto">
              <TabsList className="flex flex-row-reverse gap-1 md:gap-2 w-full md:w-auto">
                <TabsTrigger value="family" className="text-xs md:text-sm flex-1 md:flex-none">بيانات الأسرة</TabsTrigger>
                <TabsTrigger value="members" className="text-xs md:text-sm flex-1 md:flex-none">أفراد الأسرة</TabsTrigger>
                <TabsTrigger value="orphans" className="text-xs md:text-sm flex-1 md:flex-none">الأيتام</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Tabs value={tab} onValueChange={setTab} className="mb-8">
            <TabsContent value="family">
              <Card className="mb-8 border-blue-200 shadow-md">
                <CardHeader className="flex flex-row-reverse items-center gap-4">
                  <CardTitle className="flex items-center gap-2 text-blue-900">تعديل بيانات الأسرة <Badge className="bg-blue-200 text-blue-900">#{family.id}</Badge></CardTitle>
                </CardHeader>
                <CardContent>
                  <form id="family-form" onSubmit={handleFamilySubmit} className="space-y-6 md:space-y-8">
                    {/* Head of Household Card */}
                    <Card className="border-indigo-200 shadow-sm">
                      <CardHeader className="flex flex-row-reverse items-center gap-2 py-3">
                        <CardTitle className="text-indigo-700 text-base md:text-lg">
                          {familyForm.userGender === "female" ? "بيانات ربة الأسرة" : "بيانات رب الأسرة"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          {/* Personal Information Section */}
                          <div className="flex flex-col items-end">
                            <Label htmlFor="husbandName" className="text-right w-full mb-1">الاسم الرباعي *</Label>
                            <Input id="husbandName" name="husbandName" value={familyForm.husbandName || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                          </div>
                          <div className="flex flex-col items-end">
                            <Label htmlFor="husbandID" className="text-right w-full mb-1">رقم الهوية *</Label>
                            <Input id="husbandID" name="husbandID" value={familyForm.husbandID || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                          </div>
                          <div className="flex flex-col items-end">
                            <Label htmlFor="husbandBirthDate" className="text-right w-full mb-1">تاريخ الميلاد *</Label>
                            <Input id="husbandBirthDate" name="husbandBirthDate" type="date" value={familyForm.husbandBirthDate || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                          </div>
                          <div className="flex flex-col items-end">
                            <Label htmlFor="husbandJob" className="text-right w-full mb-1">المهنة *</Label>
                            <Input id="husbandJob" name="husbandJob" value={familyForm.husbandJob || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                          </div>

                          {/* Gender Section - moved up before health information */}
                          <div className="flex flex-col items-end">
                            <Label htmlFor="headGender" className="text-right w-full mb-1">جنس رب/ربة الأسرة</Label>
                            <Select
                              dir="rtl"
                              value={familyForm.userGender || family?.userGender || "male"}
                              onValueChange={(value) => setFamilyForm((prev: any) => ({ ...prev, userGender: value }))}
                            >
                              <SelectTrigger className="text-right w-full" dir="rtl">
                                <SelectValue placeholder="اختر الجنس" />
                              </SelectTrigger>
                              <SelectContent dir="rtl">
                                <SelectItem value="male">ذكر (رب أسرة)</SelectItem>
                                <SelectItem value="female">أنثى (ربة أسرة)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Contact Information Section */}
                          <div className="flex flex-col items-end">
                            <Label htmlFor="primaryPhone" className="text-right w-full mb-1">رقم الجوال الأساسي *</Label>
                            <Input id="primaryPhone" name="primaryPhone" value={familyForm.primaryPhone || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                          </div>
                          <div className="flex flex-col items-end">
                            <Label htmlFor="secondaryPhone" className="text-right w-full mb-1">رقم الجوال البديل</Label>
                            <Input id="secondaryPhone" name="secondaryPhone" value={familyForm.secondaryPhone || ""} onChange={handleFamilyChange} className="text-right mt-1" />
                          </div>

                          {/* Health Status Section - Switches with their text fields below when active */}
                          <div className="md:col-span-2">
                            <div className="flex flex-col md:flex-row-reverse gap-4">
                              <div className="rounded-md border border-input p-3">
                                <div className="flex items-center justify-end space-x-2 space-x-reverse">
                                  <Switch
                                    id="hasChronicIllness"
                                    name="hasChronicIllness"
                                    checked={!!familyForm.hasChronicIllness}
                                    onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, hasChronicIllness: checked }))}
                                  />
                                  <Label htmlFor="hasChronicIllness" className="cursor-pointer">يعاني من مرض مزمن</Label>
                                </div>
                              </div>
                              <div className="rounded-md border border-input p-3">
                                <div className="flex items-center justify-end space-x-2 space-x-reverse">
                                  <Switch
                                    id="hasDisability"
                                    name="hasDisability"
                                    checked={!!familyForm.hasDisability}
                                    onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, hasDisability: checked }))}
                                  />
                                  <Label htmlFor="hasDisability" className="cursor-pointer">يعاني من إعاقة</Label>
                                </div>
                              </div>
                              <div className="rounded-md border border-input p-3">
                                <div className="flex items-center justify-end space-x-2 space-x-reverse">
                                  <Switch
                                    id="hasWarInjury"
                                    name="hasWarInjury"
                                    checked={!!familyForm.hasWarInjury}
                                    onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, hasWarInjury: checked }))}
                                  />
                                  <Label htmlFor="hasWarInjury" className="cursor-pointer">يعاني من إصابة حرب</Label>
                                </div>
                              </div>
                            </div>
                            {familyForm.hasChronicIllness && (
                              <div className="flex flex-col items-end mt-4">
                                <Label htmlFor="chronicIllnessType" className="text-right w-full mb-1">نوع المرض المزمن</Label>
                                <Input id="chronicIllnessType" name="chronicIllnessType" value={familyForm.chronicIllnessType || ""} onChange={handleFamilyChange} className="text-right max-w-md w-full" />
                              </div>
                            )}
                            {familyForm.hasDisability && (
                              <div className="flex flex-col items-end mt-4">
                                <Label htmlFor="disabilityType" className="text-right w-full mb-1">نوع الإعاقة</Label>
                                <Input id="disabilityType" name="disabilityType" value={familyForm.disabilityType || ""} onChange={handleFamilyChange} className="text-right max-w-md w-full" />
                              </div>
                            )}
                            {familyForm.hasWarInjury && (
                              <div className="flex flex-col items-end mt-4">
                                <Label htmlFor="warInjuryType" className="text-right w-full mb-1">نوع إصابة الحرب</Label>
                                <Input id="warInjuryType" name="warInjuryType" value={familyForm.warInjuryType || ""} onChange={handleFamilyChange} className="text-right max-w-md w-full" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Spouse Information Card */}
                    <Card className="border-teal-200 shadow-sm">
                      <CardHeader className="flex flex-row-reverse items-center gap-2 py-3">
                        <CardTitle className="text-teal-700 text-base md:text-lg">
                          {familyForm.userGender === "female" ? "بيانات الزوج" : "بيانات الزوجة"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          {/* Personal Information Section */}
                          <div className="flex flex-col items-end">
                            <Label htmlFor="wifeName" className="text-right w-full mb-1">الاسم الرباعي</Label>
                            <Input id="wifeName" name="wifeName" value={familyForm.wifeName || ""} onChange={handleFamilyChange} className="text-right mt-1" />
                          </div>
                          <div className="flex flex-col items-end">
                            <Label htmlFor="wifeID" className="text-right w-full mb-1">رقم الهوية</Label>
                            <Input id="wifeID" name="wifeID" value={familyForm.wifeID || ""} onChange={handleFamilyChange} className="text-right mt-1" />
                          </div>
                          <div className="flex flex-col items-end">
                            <Label htmlFor="wifeBirthDate" className="text-right w-full mb-1">تاريخ الميلاد</Label>
                            <Input id="wifeBirthDate" name="wifeBirthDate" type="date" value={familyForm.wifeBirthDate || ""} onChange={handleFamilyChange} className="text-right mt-1" />
                          </div>
                          <div className="flex flex-col items-end">
                            <Label htmlFor="wifeJob" className="text-right w-full mb-1">المهنة</Label>
                            <Input id="wifeJob" name="wifeJob" value={familyForm.wifeJob || ""} onChange={handleFamilyChange} className="text-right mt-1" />
                          </div>

                          {/* Health Status and Pregnancy Section - Switches with their text fields below when active */}
                          {familyForm.userGender !== "female" ? ( // When head is male, show all three switches
                            <div className="md:col-span-2">
                              <div className="flex flex-col md:flex-row-reverse gap-4">
                                <div className="rounded-md border border-input p-3">
                                  <div className="flex items-center justify-end space-x-2 space-x-reverse">
                                    <Switch
                                      id="wifeHasChronicIllness"
                                      name="wifeHasChronicIllness"
                                      checked={!!familyForm.wifeHasChronicIllness}
                                      onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, wifeHasChronicIllness: checked }))}
                                    />
                                    <Label htmlFor="wifeHasChronicIllness" className="cursor-pointer">{familyForm.userGender === "female" ? "يعاني من مرض مزمن" : "تعاني من مرض مزمن"}</Label>
                                  </div>
                                </div>
                                <div className="rounded-md border border-input p-3">
                                  <div className="flex items-center justify-end space-x-2 space-x-reverse">
                                    <Switch
                                      id="wifeHasDisability"
                                      name="wifeHasDisability"
                                      checked={!!familyForm.wifeHasDisability}
                                      onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, wifeHasDisability: checked }))}
                                    />
                                    <Label htmlFor="wifeHasDisability" className="cursor-pointer">{familyForm.userGender === "female" ? "يعاني من إعاقة" : "تعاني من إعاقة"}</Label>
                                  </div>
                                </div>
                                <div className="rounded-md border border-input p-3">
                                  <div className="flex items-center justify-end space-x-2 space-x-reverse">
                                    <Switch
                                      id="wifeHasWarInjury"
                                      name="wifeHasWarInjury"
                                      checked={!!familyForm.wifeHasWarInjury}
                                      onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, wifeHasWarInjury: checked }))}
                                    />
                                    <Label htmlFor="wifeHasWarInjury" className="cursor-pointer">{familyForm.userGender === "female" ? "يعاني من إصابة حرب" : "تعاني من إصابة حرب"}</Label>
                                  </div>
                                </div>
                                <div className="rounded-md border border-input p-3">
                                  <div className="flex items-center justify-end space-x-2 space-x-reverse">
                                    <Switch
                                      id="wifePregnant"
                                      name="wifePregnant"
                                      checked={!!familyForm.wifePregnant}
                                      onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, wifePregnant: checked }))}
                                    />
                                    <Label htmlFor="wifePregnant" className="cursor-pointer">حامل</Label>
                                  </div>
                                </div>
                              </div>
                              {familyForm.wifeHasChronicIllness && (
                                <div className="flex flex-col items-end mt-4">
                                  <Label htmlFor="wifeChronicIllnessType" className="text-right w-full mb-1">نوع المرض المزمن</Label>
                                  <Input id="wifeChronicIllnessType" name="wifeChronicIllnessType" value={familyForm.wifeChronicIllnessType || ""} onChange={handleFamilyChange} className="text-right max-w-md w-full" />
                                </div>
                              )}
                              {familyForm.wifeHasDisability && (
                                <div className="flex flex-col items-end mt-4">
                                  <Label htmlFor="wifeDisabilityType" className="text-right w-full mb-1">نوع الإعاقة</Label>
                                  <Input id="wifeDisabilityType" name="wifeDisabilityType" value={familyForm.wifeDisabilityType || ""} onChange={handleFamilyChange} className="text-right max-w-md w-full" />
                                </div>
                              )}
                              {familyForm.wifeHasWarInjury && (
                                <div className="flex flex-col items-end mt-4">
                                  <Label htmlFor="wifeWarInjuryType" className="text-right w-full mb-1">نوع إصابة الحرب</Label>
                                  <Input id="wifeWarInjuryType" name="wifeWarInjuryType" value={familyForm.wifeWarInjuryType || ""} onChange={handleFamilyChange} className="text-right max-w-md w-full" />
                                </div>
                              )}
                            </div>
                          ) : ( // When head is female, only show two switches
                            <div className="md:col-span-2">
                              <div className="flex flex-col md:flex-row-reverse gap-4">
                                <div className="rounded-md border border-input p-3">
                                  <div className="flex items-center justify-end space-x-2 space-x-reverse">
                                    <Switch
                                      id="wifeHasChronicIllness"
                                      name="wifeHasChronicIllness"
                                      checked={!!familyForm.wifeHasChronicIllness}
                                      onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, wifeHasChronicIllness: checked }))}
                                    />
                                    <Label htmlFor="wifeHasChronicIllness" className="cursor-pointer">{familyForm.userGender === "female" ? "يعاني من مرض مزمن" : "تعاني من مرض مزمن"}</Label>
                                  </div>
                                </div>
                                <div className="rounded-md border border-input p-3">
                                  <div className="flex items-center justify-end space-x-2 space-x-reverse">
                                    <Switch
                                      id="wifeHasDisability"
                                      name="wifeHasDisability"
                                      checked={!!familyForm.wifeHasDisability}
                                      onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, wifeHasDisability: checked }))}
                                    />
                                    <Label htmlFor="wifeHasDisability" className="cursor-pointer">{familyForm.userGender === "female" ? "يعاني من إعاقة" : "تعاني من إعاقة"}</Label>
                                  </div>
                                </div>
                                <div className="rounded-md border border-input p-3">
                                  <div className="flex items-center justify-end space-x-2 space-x-reverse">
                                    <Switch
                                      id="wifeHasWarInjury"
                                      name="wifeHasWarInjury"
                                      checked={!!familyForm.wifeHasWarInjury}
                                      onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, wifeHasWarInjury: checked }))}
                                    />
                                    <Label htmlFor="wifeHasWarInjury" className="cursor-pointer">{familyForm.userGender === "female" ? "يعاني من إصابة حرب" : "تعاني من إصابة حرب"}</Label>
                                  </div>
                                </div>
                              </div>
                              {familyForm.wifeHasChronicIllness && (
                                <div className="flex flex-col items-end mt-4">
                                  <Label htmlFor="wifeChronicIllnessType" className="text-right w-full mb-1">نوع المرض المزمن</Label>
                                  <Input id="wifeChronicIllnessType" name="wifeChronicIllnessType" value={familyForm.wifeChronicIllnessType || ""} onChange={handleFamilyChange} className="text-right max-w-md w-full" />
                                </div>
                              )}
                              {familyForm.wifeHasDisability && (
                                <div className="flex flex-col items-end mt-4">
                                  <Label htmlFor="wifeDisabilityType" className="text-right w-full mb-1">نوع الإعاقة</Label>
                                  <Input id="wifeDisabilityType" name="wifeDisabilityType" value={familyForm.wifeDisabilityType || ""} onChange={handleFamilyChange} className="text-right max-w-md w-full" />
                                </div>
                              )}
                              {familyForm.wifeHasWarInjury && (
                                <div className="flex flex-col items-end mt-4">
                                  <Label htmlFor="wifeWarInjuryType" className="text-right w-full mb-1">نوع إصابة الحرب</Label>
                                  <Input id="wifeWarInjuryType" name="wifeWarInjuryType" value={familyForm.wifeWarInjuryType || ""} onChange={handleFamilyChange} className="text-right max-w-md w-full" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <div className="space-y-4">
                      {/* Housing Information Card */}
                      <Card className="border-blue-200 shadow-sm">
                        <CardHeader className="flex flex-row-reverse items-center gap-2 py-3">
                          <CardTitle className="text-blue-700 text-base md:text-lg">بيانات السكن</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-3 pb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="flex flex-col items-end">
                              <Label htmlFor="originalResidence" className="text-right w-full mb-1">السكن الأصلي *</Label>
                              <Input id="originalResidence" name="originalResidence" value={familyForm.originalResidence || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                            </div>
                            <div className="flex flex-col items-end">
                              <Label htmlFor="currentHousing" className="text-right w-full mb-1">السكن الحالي *</Label>
                              <Input id="currentHousing" name="currentHousing" value={familyForm.currentHousing || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                            </div>
                            <div className="flex flex-col items-end">
                              <Label htmlFor="landmarkNear" className="text-right w-full mb-1">أقرب معلم</Label>
                              <Input id="landmarkNear" name="landmarkNear" value={familyForm.landmarkNear || ""} onChange={handleFamilyChange} className="text-right mt-1" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Organization Information Card */}
                      <Card className="border-purple-200 shadow-sm">
                        <CardHeader className="flex flex-row-reverse items-center gap-2 py-3">
                          <CardTitle className="text-purple-700 text-base md:text-lg">المعلومات التنظيمية</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-3 pb-4">
                          <div className="grid grid-cols-1 gap-4 md:gap-6">
                            <div className="flex flex-col items-end">
                              <Label htmlFor="branch" className="text-right w-full mb-1">الفرع</Label>
                              <Select
                                value={BRANCHES.some(b => b.value === familyForm.branch) ? familyForm.branch : ""}
                                onValueChange={val => handleFamilyChange({ target: { name: "branch", value: val } })}
                                dir="rtl"
                              >
                                <SelectTrigger className="text-right w-full max-w-md">
                                  <SelectValue placeholder="اختر الفرع" />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  {BRANCHES.map(b => <SelectItem key={b.value} value={b.value}>{getBranchInArabic(b.value)}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              {BRANCHES.some(b => b.value === familyForm.branch) ? null : (
                                <div className="mt-2 flex flex-col items-end">
                                  <Input className="text-right max-w-md" placeholder="قيمة فرع غير صحيحة" value={familyForm.branch} disabled />
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Personal & Social Information Card */}
                      <Card className="border-orange-200 shadow-sm">
                        <CardHeader className="flex flex-row-reverse items-center gap-2 py-3">
                          <CardTitle className="text-orange-700 text-base md:text-lg">المعلومات الشخصية والاجتماعية</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-3 pb-4">
                          <div className="grid grid-cols-1 gap-4 md:gap-6">
                            <div className="flex flex-col items-end">
                              <Label htmlFor="socialStatus" className="text-right w-full mb-1">الحالة الاجتماعية</Label>
                              <Select
                                value={familyForm.socialStatus || ""}
                                onValueChange={val => handleFamilyChange({ target: { name: "socialStatus", value: val } })}
                                dir="rtl"
                              >
                                <SelectTrigger className="text-right w-full max-w-md">
                                  <SelectValue placeholder="اختر الحالة" />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  {SOCIAL_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{getSocialStatusInArabic(s.value)}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Welfare Information Card */}
                      <Card className="border-red-200 shadow-sm">
                        <CardHeader className="flex flex-row-reverse items-center gap-2 py-3">
                          <CardTitle className="text-red-700 text-base md:text-lg">المعلومات الاجتماعية والمعيشية</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-3 pb-4">
                          <div className="space-y-6">
                            {/* Damage Information Section */}
                            <div className="flex flex-col items-end">
                              <Label htmlFor="warDamageDescription" className="text-right w-full mb-1">وصف الضرر</Label>
                              <Select
                                value={familyForm.warDamageDescription || ""}
                                onValueChange={val => handleFamilyChange({ target: { name: "warDamageDescription", value: val } })}
                                dir="rtl"
                                className="w-full max-w-md"
                              >
                                <SelectTrigger className="text-right">
                                  <SelectValue placeholder="اختر وصف الضرر" />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  {DAMAGE_DESCRIPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{getDamageDescriptionInArabic(d.value)}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Status Fields Section */}
                            <div className="flex flex-col md:flex-row-reverse gap-4">
                              {/* Displacement Status */}
                              <div className="rounded-md border border-input p-3">
                                <div className="flex items-center justify-end space-x-2 space-x-reverse">
                                  <Switch id="isDisplaced" name="isDisplaced" checked={!!familyForm.isDisplaced} onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, isDisplaced: checked }))} />
                                  <Label htmlFor="isDisplaced" className="cursor-pointer">نازح؟</Label>
                                </div>
                              </div>

                              {/* Abroad Status */}
                              <div className="rounded-md border border-input p-3">
                                <div className="flex items-center justify-end space-x-2 space-x-reverse">
                                  <Switch id="isAbroad" name="isAbroad" checked={!!familyForm.isAbroad} onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, isAbroad: checked }))} />
                                  <Label htmlFor="isAbroad" className="cursor-pointer">مغترب؟</Label>
                                </div>
                              </div>
                            </div>
                            {familyForm.isDisplaced && (
                              <div className="flex flex-col items-end mt-4">
                                <Label htmlFor="displacedLocation" className="text-right w-full mb-1">مكان النزوح</Label>
                                <Input id="displacedLocation" name="displacedLocation" value={familyForm.displacedLocation || ""} onChange={handleFamilyChange} className="text-right max-w-md w-full" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Family Members Card */}
                      <Card className="border-green-200 shadow-sm">
                        <CardHeader className="flex flex-row-reverse items-center gap-2 py-3">
                          <CardTitle className="text-green-700 text-base md:text-lg">أفراد الأسرة</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-3 pb-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            <div className="flex flex-col items-end">
                              <Label htmlFor="totalMembers" className="text-right w-full mb-1">عدد الأفراد *</Label>
                              <Input id="totalMembers" name="totalMembers" value={familyForm.totalMembers || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                            </div>
                            <div className="flex flex-col items-end">
                              <Label htmlFor="numMales" className="text-right w-full mb-1">عدد الذكور *</Label>
                              <Input id="numMales" name="numMales" value={familyForm.numMales || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                            </div>
                            <div className="flex flex-col items-end">
                              <Label htmlFor="numFemales" className="text-right w-full mb-1">عدد الإناث *</Label>
                              <Input id="numFemales" name="numFemales" value={familyForm.numFemales || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="flex justify-end mt-6 md:mt-8">
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={updateFamilyMutation.isPending}>
                        {updateFamilyMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="members">
              <Card className="border-green-200 shadow-md">
                <CardHeader className="flex flex-col sm:flex-row-reverse sm:items-center sm:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 text-green-900 text-base md:text-lg"><Users className="h-5 w-5 ml-1 text-green-600" /> أفراد الأسرة</CardTitle>
                  <Button onClick={() => { setEditingMember(null); setIsMemberDialogOpen(true); }} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto text-sm"><Plus className="h-4 w-4 ml-2" /> إضافة فرد</Button>
                </CardHeader>
                <CardContent>
                  {/* Desktop table view */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-background">
                        <tr>
                          <th className="px-3 py-2">الإجراءات</th>
                          <th className="px-3 py-2">العمر</th>
                          <th className="px-3 py-2">تاريخ الميلاد</th>
                          <th className="px-3 py-2">القرابة</th>
                          <th className="px-3 py-2">الجنس</th>
                          <th className="px-3 py-2">الاسم</th>
                          <th className="px-3 py-2">الهوية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {family.members && family.members.length > 0 ? family.members.map((member: any) => (
                          <tr key={member.id} className="border-b hover:bg-background">
                            <td className="px-3 py-2 flex gap-2 justify-end">
                              <Button size="sm" variant="outline" onClick={() => { setEditingMember(member); setIsMemberDialogOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteMemberMutation.mutate(member.id)}><Trash2 className="h-4 w-4" /></Button>
                            </td>
                            <td className="px-3 py-2">{member.birthDate ? <Badge className="bg-green-100 text-green-800">{calculateDetailedAge(member.birthDate)}</Badge> : '-'}</td>
                            <td className="px-3 py-2">{member.birthDate || 'غير محدد'}</td>
                            <td className="px-3 py-2"><Badge className="bg-muted text-foreground">{getRelationshipInArabic(member.relationship)}</Badge></td>
                            <td className="px-3 py-2"><Badge className={member.gender === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}>{getGenderInArabic(member.gender)}</Badge></td>
                            <td className="px-3 py-2 font-medium">{member.fullName}</td>
                            <td className="px-3 py-2 font-medium text-muted-foreground">{member.memberID || 'غير محدد'}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={7} className="text-center text-muted-foreground py-4">لا يوجد أفراد مسجلين لهذه الأسرة.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile card view */}
                  <div className="md:hidden space-y-3">
                    {family.members && family.members.length > 0 ? family.members.map((member: any) => (
                      <div key={member.id} className="bg-muted/30 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1 flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">{member.memberID || 'غير محدد'}</span>
                              <h4 className="font-medium text-sm">{member.fullName}</h4>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <Badge className={member.gender === 'male' ? 'bg-blue-100 text-blue-800 text-xs' : 'bg-pink-100 text-pink-800 text-xs'}>{getGenderInArabic(member.gender)}</Badge>
                              <Badge className="bg-muted text-foreground text-xs">{getRelationshipInArabic(member.relationship)}</Badge>
                              {member.birthDate && <Badge className="bg-green-100 text-green-800 text-xs">{calculateDetailedAge(member.birthDate)}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">رقم الهوية: {member.memberID || 'غير محدد'}</p>
                            <p className="text-xs text-muted-foreground">تاريخ الميلاد: {member.birthDate || 'غير محدد'}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setEditingMember(member); setIsMemberDialogOpen(true); }} className="p-2"><Edit2 className="h-3 w-3" /></Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteMemberMutation.mutate(member.id)} className="p-2"><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-muted-foreground py-8">لا يوجد أفراد مسجلين لهذه الأسرة.</div>
                    )}
                  </div>
                  {/* Member Dialog */}
                  {isMemberDialogOpen && (
                    <MemberFormModal
                      initialData={editingMember}
                      onSubmit={editingMember ? (data: any) => updateMemberMutation.mutate({ memberId: editingMember.id, data }) : createMemberMutation.mutate}
                      isLoading={createMemberMutation.isPending || updateMemberMutation.isPending}
                      isEdit={!!editingMember}
                      onCancel={() => { setIsMemberDialogOpen(false); setEditingMember(null); }}
                      customRelationship={customRelationship}
                      setCustomRelationship={setCustomRelationship}
                      showCustomRelationship={showCustomRelationship}
                      setShowCustomRelationship={setShowCustomRelationship}
                      showDisabilityType={showDisabilityType}
                      setShowDisabilityType={setShowDisabilityType}
                      customDisabilityType={customDisabilityType}
                      setCustomDisabilityType={setCustomDisabilityType}
                      showChronicIllnessType={showChronicIllnessType}
                      setShowChronicIllnessType={setShowChronicIllnessType}
                      customChronicIllnessType={customChronicIllnessType}
                      setCustomChronicIllnessType={setCustomChronicIllnessType}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="orphans">
              <Card className="border-purple-200 shadow-md">
                <CardHeader className="flex flex-col sm:flex-row-reverse sm:items-center sm:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 text-purple-900 text-base md:text-lg"><Users className="h-5 w-5 ml-1 text-purple-600" /> الأيتام</CardTitle>
                  <Button onClick={() => { setEditingOrphan(null); setIsOrphanDialogOpen(true); }} className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto text-sm"><Plus className="h-4 w-4 ml-2" /> إضافة يتيم</Button>
                </CardHeader>
                <CardContent>
                  {/* Desktop table view */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-background">
                        <tr>
                          <th className="px-3 py-2">الإجراءات</th>
                          <th className="px-3 py-2">الجنس</th>
                          <th className="px-3 py-2">العمر</th>
                          <th className="px-3 py-2">تاريخ الميلاد</th>
                          <th className="px-3 py-2">حالة الوفاة</th>
                          <th className="px-3 py-2">اسم الوصي</th>
                          <th className="px-3 py-2">الاسم</th>
                          <th className="px-3 py-2">الهوية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {family.orphans && family.orphans.length > 0 ? family.orphans.map((orphan: any) => (
                          <tr key={orphan.id} className="border-b hover:bg-background">
                            <td className="px-3 py-2 flex gap-2 justify-end">
                              <Button size="sm" variant="outline" onClick={() => { setEditingOrphan(orphan); setIsOrphanDialogOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteOrphanMutation.mutate(orphan.id)}><Trash2 className="h-4 w-4" /></Button>
                            </td>
                            <td className="px-3 py-2"><Badge className={orphan.gender === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}>{getGenderInArabic(orphan.gender) || 'غير محدد'}</Badge></td>
                            <td className="px-3 py-2">{orphan.orphanBirthDate ? <Badge className="bg-purple-100 text-purple-800">{calculateDetailedAge(orphan.orphanBirthDate)}</Badge> : '-'}</td>
                            <td className="px-3 py-2">{orphan.orphanBirthDate || 'غير محدد'}</td>
                            <td className="px-3 py-2"><Badge className="bg-muted text-foreground">
                              {orphan.martyrdomType === 'war_2023' && 'شهيد حرب ٢٠٢٣'}
                              {orphan.martyrdomType === 'pre_2023_war' && 'شهيد حرب ما قبل ذلك'}
                              {orphan.martyrdomType === 'natural_death' && 'وفاة طبيعية'}
                              {!orphan.martyrdomType && 'غير محدد'}
                            </Badge></td>
                            <td className="px-3 py-2 font-medium text-muted-foreground">{orphan.guardianName}</td>
                            <td className="px-3 py-2 font-medium">{orphan.orphanName}</td>
                            <td className="px-3 py-2 font-medium text-muted-foreground">{orphan.orphanID || 'غير محدد'}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={7} className="text-center text-muted-foreground py-4">لا يوجد أيتام مسجلين لهذه الأسرة.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile card view */}
                  <div className="md:hidden space-y-3">
                    {family.orphans && family.orphans.length > 0 ? family.orphans.map((orphan: any) => (
                      <div key={orphan.id} className="bg-muted/30 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1 flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">{orphan.orphanID || 'غير محدد'}</span>
                              <h4 className="font-medium text-sm">{orphan.orphanName}</h4>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <Badge className={orphan.gender === 'male' ? 'bg-blue-100 text-blue-800 text-xs' : 'bg-pink-100 text-pink-800 text-xs'}>{getGenderInArabic(orphan.gender) || 'غير محدد'}</Badge>
                              {orphan.orphanBirthDate && <Badge className="bg-purple-100 text-purple-800 text-xs">{calculateDetailedAge(orphan.orphanBirthDate)}</Badge>}
                              <Badge className="bg-muted text-foreground text-xs">
                                {orphan.martyrdomType === 'war_2023' && 'شهيد حرب ٢٠٢٣'}
                                {orphan.martyrdomType === 'pre_2023_war' && 'شهيد حرب ما قبل ذلك'}
                                {orphan.martyrdomType === 'natural_death' && 'وفاة طبيعية'}
                                {!orphan.martyrdomType && 'غير محدد'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">رقم الهوية: {orphan.orphanID || 'غير محدد'}</p>
                            <p className="text-xs text-muted-foreground">تاريخ الميلاد: {orphan.orphanBirthDate || 'غير محدد'}</p>
                            <p className="text-xs text-muted-foreground">اسم الوصي: {orphan.guardianName}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setEditingOrphan(orphan); setIsOrphanDialogOpen(true); }} className="p-2"><Edit2 className="h-3 w-3" /></Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteOrphanMutation.mutate(orphan.id)} className="p-2"><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-muted-foreground py-8">لا يوجد أيتام مسجلين لهذه الأسرة.</div>
                    )}
                  </div>
                  {/* Orphan Dialog */}
                  {isOrphanDialogOpen && (
                    <OrphanFormModal
                      initialData={editingOrphan}
                      onSubmit={editingOrphan ? (data: any) => updateOrphanMutation.mutate({ orphanId: editingOrphan.id, data }) : (data: any) => createOrphanMutation.mutate(data)}
                      isLoading={createOrphanMutation.isPending || updateOrphanMutation.isPending}
                      isEdit={!!editingOrphan}
                      onCancel={() => { setIsOrphanDialogOpen(false); setEditingOrphan(null); }}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
              </div>
    </PageWrapper>
  );
}

// MemberFormModal is a custom modal for member add/edit, using the same logic as dashboard/member-form
interface MemberFormModalProps {
  initialData: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
  isEdit: boolean;
  customRelationship: string;
  setCustomRelationship: (val: string) => void;
  showCustomRelationship: boolean;
  setShowCustomRelationship: (val: boolean) => void;
  showDisabilityType: boolean;
  setShowDisabilityType: (val: boolean) => void;
  customDisabilityType: string;
  setCustomDisabilityType: (val: string) => void;
  showChronicIllnessType: boolean;
  setShowChronicIllnessType: (val: boolean) => void;
  customChronicIllnessType: string;
  setCustomChronicIllnessType: (val: string) => void;
}
function MemberFormModal({ initialData, onSubmit, onCancel, isLoading, isEdit, customRelationship, setCustomRelationship, showCustomRelationship, setShowCustomRelationship, showDisabilityType, setShowDisabilityType, customDisabilityType, setCustomDisabilityType, showChronicIllnessType, setShowChronicIllnessType, customChronicIllnessType, setCustomChronicIllnessType }: MemberFormModalProps) {
  const [form, setForm] = useState({
    fullName: initialData?.fullName || "",
    memberID: initialData?.memberID || "",
    birthDate: initialData?.birthDate || "",
    gender: initialData?.gender || "male",
    relationship: RELATIONSHIPS.some(r => r.value === initialData?.relationship) ? initialData?.relationship : (initialData?.relationship ? "other" : "son"),
    isDisabled: initialData?.isDisabled || false,
    disabilityType: initialData?.disabilityType || "",
    hasChronicIllness: initialData?.hasChronicIllness || false,
    chronicIllnessType: initialData?.chronicIllnessType || "",
    hasWarInjury: initialData?.hasWarInjury || false,
    warInjuryType: initialData?.warInjuryType || "",
  });

  // State to track validation errors
  const [errors, setErrors] = useState({
    fullName: "",
    memberID: "",
    birthDate: "",
    gender: "",
    relationship: "",
  });

  const [showWarInjuryType, setShowWarInjuryType] = useState(form.hasWarInjury);
  const [customWarInjuryType, setCustomWarInjuryType] = useState(form.warInjuryType || "");

  useEffect(() => {
    setShowCustomRelationship(form.relationship === "other");
  }, [form.relationship, setShowCustomRelationship]);

  useEffect(() => {
    setShowDisabilityType(form.isDisabled);
  }, [form.isDisabled, setShowDisabilityType]);

  useEffect(() => {
    setShowChronicIllnessType(form.hasChronicIllness);
    // Initialize customChronicIllnessType if there's a value in the form
    if (form.hasChronicIllness && form.chronicIllnessType) {
      setCustomChronicIllnessType(form.chronicIllnessType);
    }
  }, [form.hasChronicIllness, form.chronicIllnessType, setShowChronicIllnessType]);

  useEffect(() => {
    setShowWarInjuryType(form.hasWarInjury);
    // Initialize customWarInjuryType if there's a value in the form
    if (form.hasWarInjury && form.warInjuryType) {
      setCustomWarInjuryType(form.warInjuryType);
    }
  }, [form.hasWarInjury, form.warInjuryType, setShowWarInjuryType]);

  // Validation function
  const validateForm = () => {
    const newErrors = {
      fullName: !form.fullName || form.fullName.trim() === "" ? "الاسم مطلوب" : "",
      memberID: form.memberID && form.memberID.length > 0 && form.memberID.length !== 9 ? "رقم الهوية يجب أن يكون 9 أرقام" : "",
      birthDate: !form.birthDate ? "تاريخ الميلاد مطلوب" : "",
      gender: !form.gender ? "الجنس مطلوب" : "",
      relationship: !form.relationship ? "القرابة مطلوبة" : "",
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== "");
  };

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (name === "relationship" && value === "other") setCustomRelationship("");
    if (name === "isDisabled" && !checked) setCustomDisabilityType("");
    if (name === "hasChronicIllness" && !checked) setCustomChronicIllnessType("");
    if (name === "hasWarInjury" && !checked) setCustomWarInjuryType("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Run validation
    if (!validateForm()) {
      return; // Don't submit if validation fails
    }

    onSubmit({
      ...form,
      relationship: form.relationship === "other" ? customRelationship : form.relationship,
      disabilityType: showDisabilityType ? customDisabilityType : "",
      chronicIllnessType: showChronicIllnessType ? customChronicIllnessType : "",
      warInjuryType: showWarInjuryType ? customWarInjuryType : "",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-4">
      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <h2 className="text-lg font-semibold mb-4">{isEdit ? 'تعديل بيانات الفرد' : 'إضافة فرد جديد'}</h2>
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            <div>
              <Label htmlFor="fullName" className="text-sm sm:text-base font-medium">الاسم الكامل *</Label>
              <Input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} className={`text-right mt-1 ${errors.fullName ? 'border-destructive focus:ring-destructive' : ''}`} />
              {errors.fullName && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {errors.fullName}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="memberID" className="text-sm sm:text-base font-medium">رقم الهوية</Label>
              <Input id="memberID" name="memberID" value={form.memberID} onChange={handleChange} className={`text-right mt-1 ${errors.memberID ? 'border-destructive focus:ring-destructive' : ''}`} />
              {errors.memberID && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {errors.memberID}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="birthDate" className="text-sm sm:text-base font-medium">تاريخ الميلاد *</Label>
              <Input id="birthDate" name="birthDate" type="date" value={form.birthDate} onChange={handleChange} className={`text-right mt-1 ${errors.birthDate ? 'border-destructive focus:ring-destructive' : ''}`} />
              {errors.birthDate && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {errors.birthDate}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="gender" className="text-sm sm:text-base font-medium">الجنس *</Label>
              <Select value={form.gender} onValueChange={val => {
                setForm(f => ({ ...f, gender: val }));
                if (errors.gender) setErrors(prev => ({ ...prev, gender: "" }));
              }} dir="rtl">
                <SelectTrigger className={`text-right ${errors.gender ? 'border-destructive focus:ring-destructive' : ''}`}><SelectValue placeholder="اختر الجنس" className="text-right" /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="male" className="text-right">ذكر</SelectItem>
                  <SelectItem value="female" className="text-right">أنثى</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {errors.gender}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="relationship" className="text-sm sm:text-base font-medium">القرابة *</Label>
              <Select value={form.relationship} onValueChange={val => {
                setForm(f => ({ ...f, relationship: val }));
                if (errors.relationship) setErrors(prev => ({ ...prev, relationship: "" }));
              }} dir="rtl">
                <SelectTrigger className={`text-right ${errors.relationship ? 'border-destructive focus:ring-destructive' : ''}`}><SelectValue placeholder="اختر القرابة" className="text-right" /></SelectTrigger>
                <SelectContent dir="rtl">
                  {RELATIONSHIPS.map(r => <SelectItem key={r.value} value={r.value} className="text-right">{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {showCustomRelationship && (
                <Input className="mt-2 text-right" placeholder="أدخل القرابة" value={customRelationship} onChange={e => setCustomRelationship(e.target.value)} />
              )}
              {errors.relationship && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {errors.relationship}
                </p>
              )}
            </div>
            <div className="flex flex-col md:flex-row-reverse gap-4">
              <div className="rounded-md border border-input p-3">
                <div className="flex items-center justify-end space-x-2 space-x-reverse">
                  <Switch id="isDisabled" name="isDisabled" checked={form.isDisabled} onCheckedChange={checked => setForm(f => ({ ...f, isDisabled: checked }))} />
                  <Label htmlFor="isDisabled" className="cursor-pointer">يعاني من إعاقة</Label>
                </div>
              </div>
              <div className="rounded-md border border-input p-3">
                <div className="flex items-center justify-end space-x-2 space-x-reverse">
                  <Switch id="hasChronicIllness" name="hasChronicIllness" checked={form.hasChronicIllness} onCheckedChange={checked => setForm(f => ({ ...f, hasChronicIllness: checked }))} />
                  <Label htmlFor="hasChronicIllness" className="cursor-pointer">يعاني من مرض مزمن</Label>
                </div>
              </div>
              <div className="rounded-md border border-input p-3">
                <div className="flex items-center justify-end space-x-2 space-x-reverse">
                  <Switch id="hasWarInjury" name="hasWarInjury" checked={form.hasWarInjury} onCheckedChange={checked => setForm(f => ({ ...f, hasWarInjury: checked }))} />
                  <Label htmlFor="hasWarInjury" className="cursor-pointer">يعاني من إصابة حرب</Label>
                </div>
              </div>
            </div>
            {showDisabilityType && (
              <div>
                <Label htmlFor="disabilityType" className="text-sm sm:text-base font-medium">نوع الإعاقة</Label>
                <Input id="disabilityType" name="disabilityType" value={customDisabilityType} onChange={e => setCustomDisabilityType(e.target.value)} className="text-right mt-1" />
              </div>
            )}
            {showChronicIllnessType && (
              <div>
                <Label htmlFor="chronicIllnessType" className="text-sm sm:text-base font-medium">نوع المرض المزمن</Label>
                <Input id="chronicIllnessType" name="chronicIllnessType" value={customChronicIllnessType} onChange={e => setCustomChronicIllnessType(e.target.value)} className="text-right mt-1" />
              </div>
            )}
            {showWarInjuryType && (
              <div>
                <Label htmlFor="warInjuryType" className="text-sm sm:text-base font-medium">نوع إصابة الحرب</Label>
                <Input id="warInjuryType" name="warInjuryType" value={customWarInjuryType} onChange={e => setCustomWarInjuryType(e.target.value)} className="text-right mt-1" />
              </div>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">إلغاء</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" disabled={isLoading}>
              {isLoading ? "جاري الحفظ..." : isEdit ? "تحديث" : "إضافة"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// OrphanFormModal is a custom modal for orphan add/edit, using the same logic as dashboard/orphan-form
interface OrphanFormModalProps {
  initialData: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
  isEdit: boolean;
}

function OrphanFormModal({ initialData, onSubmit, onCancel, isLoading, isEdit }: OrphanFormModalProps) {
  // Use the same zod schema as in the dashboard orphan form
  const orphanSchema = z.object({
    orphanName: z.string().min(1, "اسم اليتيم مطلوب"),
    orphanBirthDate: z.string().min(1, "تاريخ ميلاد اليتيم مطلوب"),
    orphanID: z.string().regex(/^\d{9}$/, "رقم هوية اليتيم يجب أن يكون 9 أرقام").optional(),
    gender: z.enum(['male', 'female'], {
      errorMap: (issue, ctx) => {
        if (issue.code === 'invalid_enum_value') {
          return { message: 'الجنس مطلوب' };
        }
        return { message: ctx.defaultError };
      }
    }),
    guardianName: z.string().min(1, "اسم الوصي مطلوب"),
    guardianID: z.string().regex(/^\d{9}$/, "رقم هوية الوصي يجب أن يكون 9 أرقام"),
    guardianBirthDate: z.string().min(1, "تاريخ ميلاد الوصي مطلوب"),
    fatherName: z.string().min(1, "اسم الاب مطلوب"),
    fatherID: z.string().regex(/^\d{9}$/, "رقم هوية الاب يجب أن يكون 9 أرقام"),
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
    mobileNumber: z.string().regex(/^\d{10}$/, "رقم الجوال يجب أن يكون 10 أرقام"),
    backupMobileNumber: z.string().regex(/^\d{10}$/, "رقم الجوال الاحتياطي يجب أن يكون 10 أرقام").optional(),
    image: z.string().optional(), // Optional image field
  });

  type OrphanFormData = z.infer<typeof orphanSchema>;

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
      martyrdomType: "",
      bankAccountNumber: "",
      accountHolderName: "",
      currentAddress: "",
      originalAddress: "",
      mobileNumber: "",
      backupMobileNumber: "",
      image: "",
      ...initialData,
    },
  });

  const handleSubmit = (data: OrphanFormData) => {
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-4">
      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 md:space-y-6">
          <h2 className="text-lg font-semibold mb-4">{isEdit ? 'تعديل بيانات اليتيم' : 'إضافة يتيم جديد'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <Label htmlFor="orphanName" className="text-sm sm:text-base font-medium">اسم اليتيم *</Label>
              <Input
                id="orphanName"
                placeholder="اسم اليتيم"
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.orphanName ? 'border-destructive focus:ring-destructive' : ''}`}
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
              <Label htmlFor="orphanID" className="text-sm sm:text-base font-medium">رقم هوية اليتيم</Label>
              <Input
                id="orphanID"
                placeholder="رقم هوية اليتيم"
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.orphanID ? 'border-destructive focus:ring-destructive' : ''}`}
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
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.orphanBirthDate ? 'border-destructive focus:ring-destructive' : ''}`}
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
              <Label htmlFor="gender" className="text-sm sm:text-base font-medium">الجنس</Label>
              <Select
                value={["male", "female"].includes(form.watch("gender") || "") ? form.watch("gender") : ""}
                onValueChange={(value) => form.setValue("gender", value)}
                dir="rtl"
              >
                <SelectTrigger className={`h-10 sm:h-11 text-sm sm:text-base mt-1 ${form.formState.errors.gender ? 'border-destructive focus:ring-destructive' : ''}`}>
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
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.guardianName ? 'border-destructive focus:ring-destructive' : ''}`}
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
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.guardianID ? 'border-destructive focus:ring-destructive' : ''}`}
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
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.guardianBirthDate ? 'border-destructive focus:ring-destructive' : ''}`}
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
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.fatherName ? 'border-destructive focus:ring-destructive' : ''}`}
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
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.fatherID ? 'border-destructive focus:ring-destructive' : ''}`}
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
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.martyrdomDate ? 'border-destructive focus:ring-destructive' : ''}`}
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
                onValueChange={(value) => form.setValue("martyrdomType", value as any)}
                dir="rtl"
              >
                <SelectTrigger className={`h-10 sm:h-11 text-sm sm:text-base mt-1 ${form.formState.errors.martyrdomType ? 'border-destructive focus:ring-destructive' : ''}`}>
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
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.bankAccountNumber ? 'border-destructive focus:ring-destructive' : ''}`}
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
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.accountHolderName ? 'border-destructive focus:ring-destructive' : ''}`}
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
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.mobileNumber ? 'border-destructive focus:ring-destructive' : ''}`}
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
              <Label htmlFor="backupMobileNumber" className="text-sm sm:text-base font-medium">رقم جوال احتياطي</Label>
              <Input
                id="backupMobileNumber"
                placeholder="رقم جوال احتياطي"
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.backupMobileNumber ? 'border-destructive focus:ring-destructive' : ''}`}
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
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.currentAddress ? 'border-destructive focus:ring-destructive' : ''}`}
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
                className={`h-10 sm:h-11 text-sm sm:text-base mt-1 text-right ${form.formState.errors.originalAddress ? 'border-destructive focus:ring-destructive' : ''}`}
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
                      // First compress the image to reduce size
                      compressImage(file)
                        .then(compressedFile => {
                          // Convert the compressed image to base64 for sending to backend
                          const reader = new FileReader();
                          reader.onload = () => {
                            form.setValue("image", reader.result as string);
                          };
                          reader.readAsDataURL(compressedFile);
                        })
                        .catch(error => {
                          console.error('Error compressing image:', error);

                          // Fallback to original image if compression fails
                          // Convert original image to base64 for sending to backend
                          const reader = new FileReader();
                          reader.onload = () => {
                            form.setValue("image", reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        });
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
              {initialData?.image && (
                <div className="mt-2">
                  <Label className="text-sm text-muted-foreground">الصورة الحالية:</Label>
                  <div className="mt-1 flex justify-center items-center">
                    <img
                      src={initialData.image}
                      alt="صورة اليتيم"
                      className="max-h-32 max-w-full object-contain border rounded"
                    />
                  </div>
                </div>
              )}
              {form.formState.errors.image && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {form.formState.errors.image.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full sm:w-auto"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto"
            >
              {isLoading ? "جاري الحفظ..." : isEdit ? "تحديث" : "إضافة"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
 