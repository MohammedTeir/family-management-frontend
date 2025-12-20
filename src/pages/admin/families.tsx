import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Search, Eye, Printer, Phone, MapPin, FileSpreadsheet, Edit2, Trash2, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FamiliesSkeleton } from "@/components/ui/families-skeleton";
import { Link, useLocation } from "wouter";
import { formatDate } from "@/lib/utils";
import { getRelationshipInArabic, getGenderInArabic, calculateDetailedAge, getRequestTypeInArabic, getRequestStatusInArabic, getSocialStatusInArabic, isChild, getBranchInArabic, getDamageDescriptionInArabic } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ExcelJS from 'exceljs';
import { useSettingsContext } from "@/contexts/SettingsContext";
import { PageWrapper } from "@/components/layout/page-wrapper";

// 🚀 PERFORMANCE: Memoized component to prevent unnecessary re-renders
const AdminFamilies = memo(function AdminFamilies() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [branchFilter, setBranchFilter] = useState('all');
  const [displacedFilter, setDisplacedFilter] = useState('all');
  const [damagedFilter, setDamagedFilter] = useState('all');
  const [abroadFilter, setAbroadFilter] = useState('all');
  const [socialStatusFilter, setSocialStatusFilter] = useState('all');
  const [pregnantFilter, setPregnantFilter] = useState('all');
  const [childrenFilter, setChildrenFilter] = useState('all');
  const [membersFilter, setMembersFilter] = useState('all');
  const [childrenMinCount, setChildrenMinCount] = useState('');
  const [childrenMaxCount, setChildrenMaxCount] = useState('');
  const [membersMinCount, setMembersMinCount] = useState('');
  const [membersMaxCount, setMembersMaxCount] = useState('');
  const [isExcelDialogOpen, setIsExcelDialogOpen] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  const [memberAgeMin, setMemberAgeMin] = useState('');
  const [memberAgeMax, setMemberAgeMax] = useState('');
  const [completenessFilter, setCompletenessFilter] = useState('all');
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

  // Helper to get age
  const getAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Helper to get housing status for export
  const getHousingStatus = (family: any) => {
    if (family.isAbroad) {
      return family.abroadLocation || 'مغترب بالخارج';
    } else if (family.isDisplaced) {
      return 'نازح';
    } else {
      return 'مقيم';
    }
  };

  // Families data fetching
  const { data: families, isLoading } = useQuery({
    queryKey: ["/api/admin/families"],
  });

  const { data: familyDetails, isLoading: familyDetailsLoading, error: familyDetailsError } = useQuery({
    queryKey: ["/api/admin/families", selectedFamily?.id],
    enabled: !!selectedFamily?.id,
    queryFn: async () => {
      const response = await apiClient.get(`/api/admin/families/${selectedFamily.id}`);
      const data = response.data;

      // Transform spouse data based on head's gender to avoid field name conflicts
      const headGender = data.userGender || 'male';

      // Store gender-appropriate spouse labels without overwriting head of household fields
      if (data.spouse) {
        // Add transformed spouse fields with different names to avoid conflicts
        if (headGender === 'female') {
          // When head is female, the spouse object should have 'husband' prefixed fields
          data.spouseAsHusbandName = data.spouse.husbandName || data.spouse.wifeName;
          data.spouseAsHusbandID = data.spouse.husbandID || data.spouse.wifeID;
          data.spouseAsHusbandBirthDate = data.spouse.husbandBirthDate || data.spouse.wifeBirthDate;
          data.spouseAsHusbandJob = data.spouse.husbandJob || data.spouse.wifeJob;
          data.spouseAsHusbandPregnant = data.spouse.husbandPregnant || data.spouse.wifePregnant; // This should typically be false for husbands
          data.spouseAsHusbandHasChronicIllness = data.spouse.husbandHasChronicIllness || data.spouse.wifeHasChronicIllness;
          data.spouseAsHusbandChronicIllnessType = data.spouse.husbandChronicIllnessType || data.spouse.wifeChronicIllnessType;
          data.spouseAsHusbandHasDisability = data.spouse.husbandHasDisability || data.spouse.wifeHasDisability;
          data.spouseAsHusbandDisabilityType = data.spouse.husbandDisabilityType || data.spouse.wifeDisabilityType;
        } else {
          // When head is male, the spouse object should have 'wife' prefixed fields
          data.spouseAsWifeName = data.spouse.wifeName;
          data.spouseAsWifeID = data.spouse.wifeID;
          data.spouseAsWifeBirthDate = data.spouse.wifeBirthDate;
          data.spouseAsWifeJob = data.spouse.wifeJob;
          data.spouseAsWifePregnant = data.spouse.wifePregnant;
          data.spouseAsWifeHasChronicIllness = data.spouse.wifeHasChronicIllness;
          data.spouseAsWifeChronicIllnessType = data.spouse.wifeChronicIllnessType;
          data.spouseAsWifeHasDisability = data.spouse.wifeHasDisability;
          data.spouseAsWifeDisabilityType = data.spouse.wifeDisabilityType;
        }
      } else if (data.wifeName) {
        // Fallback: if no spouse object but raw spouse fields exist
        if (headGender === 'female') {
          data.spouseAsHusbandName = data.wifeName;
          data.spouseAsHusbandID = data.wifeID;
          data.spouseAsHusbandBirthDate = data.wifeBirthDate;
          data.spouseAsHusbandJob = data.wifeJob;
          data.spouseAsHusbandPregnant = data.wifePregnant; // This should typically be false for husbands
          data.spouseAsHusbandHasChronicIllness = data.wifeHasChronicIllness;
          data.spouseAsHusbandChronicIllnessType = data.wifeChronicIllnessType;
          data.spouseAsHusbandHasDisability = data.wifeHasDisability;
          data.spouseAsHusbandDisabilityType = data.wifeDisabilityType;
        } else {
          data.spouseAsWifeName = data.wifeName;
          data.spouseAsWifeID = data.wifeID;
          data.spouseAsWifeBirthDate = data.wifeBirthDate;
          data.spouseAsWifeJob = data.wifeJob;
          data.spouseAsWifePregnant = data.wifePregnant;
          data.spouseAsWifeHasChronicIllness = data.wifeHasChronicIllness;
          data.spouseAsWifeChronicIllnessType = data.wifeChronicIllnessType;
          data.spouseAsWifeHasDisability = data.wifeHasDisability;
          data.spouseAsWifeDisabilityType = data.wifeDisabilityType;
        }
      }

      return data;
    }
  });

  const deleteFamilyMutation = useMutation({
    mutationFn: async (familyId: number) => {
      await apiClient.delete(`/api/admin/families/${familyId}`);
      return familyId;
    },
    onSuccess: () => {
      toast({ title: "تم حذف الأسرة", description: "تم حذف الأسرة بنجاح" });
      // Refetch families
      window.location.reload(); // or use queryClient.invalidateQueries if available
    },
    onError: (error: any) => {
      toast({ title: "خطأ في الحذف", description: error.message, variant: "destructive" });
    },
  });

  // 🚀 PERFORMANCE: Memoize unique branches extraction
  const branchOptions = useMemo(() => {
    const branches = Array.from(new Set((families || []).map((f: any) => f.branch).filter(Boolean)));
    // Add special option for families with no branch
    branches.push('no_branch');
    return branches;
  }, [families]);

  // 🚀 PERFORMANCE: Memoize expensive filtering logic
  const filteredFamilies = useMemo(() => {
    if (!Array.isArray(families)) return [];

    return families.filter((family: any) => {
      // Cache toLowerCase to avoid repeated calls
      const lowerSearchTerm = searchTerm.toLowerCase();
      const lowerHusbandName = family.husbandName.toLowerCase();
      const branchInArabic = getBranchInArabic(family.branch);
      const lowerBranchArabic = branchInArabic?.toLowerCase() || '';

      const matchesSearch =
        lowerHusbandName.includes(lowerSearchTerm) ||
        family.husbandID.includes(searchTerm) ||
        lowerBranchArabic.includes(lowerSearchTerm);

      const matchesBranch = branchFilter === 'all' ||
                           (branchFilter === 'no_branch' ? !family.branch : family.branch === branchFilter);
      const matchesDisplaced = displacedFilter === 'all' || (displacedFilter === 'yes' ? family.isDisplaced : !family.isDisplaced);
      const matchesDamaged = damagedFilter === 'all' || (damagedFilter === 'yes' ? family.warDamage2023 : !family.warDamage2023);
      const matchesAbroad = abroadFilter === 'all' || (abroadFilter === 'yes' ? family.isAbroad : !family.isAbroad);

      // Social status filter
      const matchesSocialStatus = socialStatusFilter === 'all' || family.socialStatus === socialStatusFilter;

      // Members count filter
      const matchesMembers = membersFilter === 'all' ||
                            (membersFilter === 'small' && family.totalMembers <= 3) ||
                            (membersFilter === 'medium' && family.totalMembers > 3 && family.totalMembers <= 6) ||
                            (membersFilter === 'large' && family.totalMembers > 6) ||
                            (membersFilter === 'custom' &&
                             (membersMinCount === '' || (family.totalMembers !== null && family.totalMembers !== undefined && family.totalMembers >= (parseInt(membersMinCount) || 0))) &&
                             (membersMaxCount === '' || (family.totalMembers !== null && family.totalMembers !== undefined && family.totalMembers <= (parseInt(membersMaxCount) || Infinity))));

      // Pregnant filter
      const matchesPregnant = pregnantFilter === 'all' ||
                             (pregnantFilter === 'yes' ? family.wifePregnant : !family.wifePregnant);

      // Children filter
      // Calculate children count (under 2 years old)
      const children = family.members?.filter((member: any) => {
        if (!member.birthDate) return false;
        const today = new Date();
        const birth = new Date(member.birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age < 2;
      }) || [];

      const matchesChildren = childrenFilter === 'all' ||
                             (childrenFilter === 'yes' ? children.length > 0 : children.length === 0) ||
                             (childrenFilter === 'many' && children.length >= 3) ||
                             (childrenFilter === 'few' && children.length > 0 && children.length < 3) ||
                             (childrenFilter === 'custom' &&
                              (childrenMinCount === '' || children.length >= parseInt(childrenMinCount)) &&
                              (childrenMaxCount === '' || children.length <= parseInt(childrenMaxCount)));

      // Age filter for members and orphans
      const hasMatchingMemberAge = (memberAgeMin === '' && memberAgeMax === '') ||
                                   (Array.isArray(family.members) && family.members.some((member: any) => {
                                     if (!member.birthDate) return false;
                                     const today = new Date();
                                     const birth = new Date(member.birthDate);

                                     // Skip if birth date is in the future (invalid data)
                                     if (birth > today) return false;

                                     let age = today.getFullYear() - birth.getFullYear();
                                     const m = today.getMonth() - birth.getMonth();
                                     if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

                                     const minAge = parseInt(memberAgeMin) || 0;
                                     const maxAge = parseInt(memberAgeMax) || Infinity;

                                     // If only min age is provided
                                     if (memberAgeMin !== '' && memberAgeMax === '') {
                                       return age >= minAge;
                                     }
                                     // If only max age is provided
                                     if (memberAgeMin === '' && memberAgeMax !== '') {
                                       return age <= maxAge;
                                     }
                                     // If both min and max are provided
                                     if (memberAgeMin !== '' && memberAgeMax !== '') {
                                       return age >= minAge && age <= maxAge;
                                     }
                                     // If no age filter is applied, return true
                                     return true;
                                   }));

      // Age filter for orphans (if available)
      const hasMatchingOrphanAge = (memberAgeMin === '' && memberAgeMax === '') ||
                                   (!Array.isArray(family.orphans) ? false : family.orphans.some((orphan: any) => {
                                     if (!orphan.orphanBirthDate) return false;
                                     const today = new Date();
                                     const birth = new Date(orphan.orphanBirthDate);

                                     // Skip if birth date is in the future (invalid data)
                                     if (birth > today) return false;

                                     let age = today.getFullYear() - birth.getFullYear();
                                     const m = today.getMonth() - birth.getMonth();
                                     if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

                                     const minAge = parseInt(memberAgeMin) || 0;
                                     const maxAge = parseInt(memberAgeMax) || Infinity;

                                     // If only min age is provided
                                     if (memberAgeMin !== '' && memberAgeMax === '') {
                                       return age >= minAge;
                                     }
                                     // If only max age is provided
                                     if (memberAgeMin === '' && memberAgeMax !== '') {
                                       return age <= maxAge;
                                     }
                                     // If both min and max are provided
                                     if (memberAgeMin !== '' && memberAgeMax !== '') {
                                       return age >= minAge && age <= maxAge;
                                     }
                                     // If no age filter is applied, return true
                                     return true;
                                   }));

      const matchesMemberAge = hasMatchingMemberAge || hasMatchingOrphanAge;

      // Completeness filter - check if family has all required fields filled
      const isComplete = family.husbandName &&
                         family.husbandBirthDate &&
                         family.primaryPhone &&
                         family.originalResidence &&
                         family.branch &&
                         family.socialStatus &&
                         family.numMales !== null &&
                         family.numMales !== undefined &&
                         family.numFemales !== null &&
                         family.numFemales !== undefined &&
                         (family.numMales > 0 || family.numFemales > 0) &&
                         (family.currentHousing || family.displacedLocation);

      const matchesCompleteness = completenessFilter === 'all' ||
                                 (completenessFilter === 'complete' && isComplete) ||
                                 (completenessFilter === 'incomplete' && !isComplete);

      return matchesSearch && matchesBranch && matchesDisplaced &&
             matchesDamaged && matchesAbroad && matchesSocialStatus && matchesMembers &&
             matchesPregnant && matchesChildren && matchesMemberAge && matchesCompleteness;
    });
  }, [families, searchTerm, branchFilter, displacedFilter, damagedFilter, abroadFilter, socialStatusFilter, pregnantFilter, childrenFilter, membersFilter, membersMinCount, membersMaxCount, childrenMinCount, childrenMaxCount, memberAgeMin, memberAgeMax, completenessFilter]);

  // 🚀 PERFORMANCE: Memoize expensive max counts calculation
  const { maxSons, maxChildren, maxWives, maxOrphans } = useMemo(() => {
    const safeFamilies = Array.isArray(filteredFamilies) ? filteredFamilies : [];

    if (safeFamilies.length === 0) {
      return { maxSons: 0, maxChildren: 0, maxWives: 0, maxOrphans: 0 };
    }

    let maxS = 0, maxC = 0, maxW = 0, maxO = 0;

    // Single pass through families for better performance
    safeFamilies.forEach(family => {
      const members = Array.isArray(family.members) ? family.members : [];
      // Include orphans in the calculation for son/children max counts
      const orphans = Array.isArray(family.orphans) ? family.orphans : [];
      // Convert orphans to member-like structure to calculate with same logic
      const allMembers = [...members];
      if (Array.isArray(orphans)) {
        const orphansAsMembers = orphans.map(orph => ({
          ...orph,
          fullName: orph.orphanName || orph.fullName,
          memberID: orph.orphanID || orph.memberID,
          birthDate: orph.orphanBirthDate || orph.birthDate,
          isDisabled: orph.isDisabled || orph.orphanIsDisabled,
          disabilityType: orph.disabilityType || orph.orphanDisabilityType,
          hasChronicIllness: orph.hasChronicIllness || orph.orphanHasChronicIllness,
          chronicIllnessType: orph.chronicIllnessType || orph.orphanChronicIllnessType,
          hasWarInjury: orph.hasWarInjury || orph.orphanHasWarInjury,
          warInjuryType: orph.warInjuryType || orph.orphanWarInjuryType,
        }));
        allMembers.push(...orphansAsMembers);
      }
      const sons = allMembers.filter((m: any) => !isChild(m.birthDate)).length;
      const children = allMembers.filter((m: any) => isChild(m.birthDate)).length;
      const wives = family.wife ? 1 : (family.wifeName ? 1 : 0);

      if (sons > maxS) maxS = sons;
      if (children > maxC) maxC = children;
      if (wives > maxW) maxW = wives;
      if (orphans.length > maxO) maxO = orphans.length;
    });

    return { maxSons: maxS, maxChildren: maxC, maxWives: maxW, maxOrphans: maxO };
  }, [filteredFamilies]);

  // 🚀 PERFORMANCE: Memoize expensive Excel columns generation
  const excelColumns = useMemo(() => [
    { key: 'husbandName', label: 'اسم رب/ربة الأسرة رباعي', checked: true },
    { key: 'husbandID', label: 'رقم هوية رب/ربة الأسرة', checked: true },
    { key: 'husbandJob', label: 'عمل رب/ربة الأسرة', checked: true },
    { key: 'husbandBirthDate', label: 'تاريخ ميلاد رب/ربة الأسرة', checked: true },
    { key: 'husbandAge', label: 'عمر رب/ربة الأسرة', checked: true },
    { key: 'hasChronicIllness', label: 'هل يعاني رب الأسرة من مرض مزمن', checked: true },
    { key: 'chronicIllnessType', label: 'نوع مرض رب الأسرة المزمن', checked: true },
    { key: 'hasDisability', label: 'هل يعاني رب الأسرة من إعاقة', checked: true },
    { key: 'disabilityType', label: 'نوع إعاقة رب الأسرة', checked: true },
    { key: 'hasWarInjury', label: 'هل يعاني رب الأسرة من إصابة حرب', checked: true },
    { key: 'warInjuryType', label: 'نوع إصابة حرب رب الأسرة', checked: true },
    // Wife columns (individual wife fields)
    ...(maxWives > 0 ? [
      { key: 'wifeName', label: 'اسم الزوج/ة رباعي', checked: true },
      { key: 'wifeID', label: 'رقم هوية الزوج/ة', checked: true },
      { key: 'wifeJob', label: 'عمل الزوج/ة', checked: true },
      { key: 'wifeBirthDate', label: 'تاريخ ميلاد الزوج/ة', checked: true },
      { key: 'wifeAge', label: 'عمر الزوج/ة', checked: true },
      { key: 'wifePregnant', label: 'هل الزوج/ة حامل', checked: true },
      { key: 'wifeHasChronicIllness', label: 'هل يعاني/تعاني الزوج/ة من مرض مزمن', checked: true },
      { key: 'wifeChronicIllnessType', label: 'نوع مرض الزوج/ة المزمن', checked: true },
      { key: 'wifeHasDisability', label: 'هل يعاني/تعاني الزوج/ة من إعاقة', checked: true },
      { key: 'wifeDisabilityType', label: 'نوع إعاقة الزوج/ة', checked: true },
      { key: 'wifeHasWarInjury', label: 'هل يعاني/تعاني الزوج/ة من إصابة حرب', checked: true },
      { key: 'wifeWarInjuryType', label: 'نوع إصابة حرب الزوج/ة', checked: true },
    ] : []),
    { key: 'primaryPhone', label: 'رقم الجوال للتواصل', checked: true },
    { key: 'secondaryPhone', label: 'رقم الجوال البديل', checked: true },
    { key: 'originalResidence', label: 'السكن الأصلي', checked: true },
    { key: 'currentHousing', label: 'حالة السكن الحالي', checked: true },
    { key: 'displacedLocation', label: 'اقرب معلم لك في حال كنت نازح حاليا', checked: true },
    { key: 'warDamageDescription', label: 'الاضرار الناجمة عن حرب 2023', checked: true },
    { key: 'branch', label: 'الفرع', checked: true },
    { key: 'totalMembers', label: 'عدد افراد الأسرة مع الأب والأم', checked: true },
    { key: 'hasDisabledMembers', label: 'هل يوجد افراد ذوي اعاقة في العائلة', checked: true },
    { key: 'disabilityTypes', label: 'اذا كان يوجد أشخاص ذوي اعاقة اذكر نوع الإعاقة', checked: true },
    { key: 'hasChildrenUnderTwo', label: 'عدد الابناء اقل من سنتين', checked: true },
    { key: 'hasChildren2To5', label: 'عدد الابناء من 2-5 سنوات', checked: true },
    { key: 'hasChildren6To10', label: 'عدد الابناء من 6-10 سنوات', checked: true },
    { key: 'hasChildren11To15', label: 'عدد الابناء من 11-15 سنوات', checked: true },
    // Sons columns (dynamic, only if maxSons > 0)
    ...(maxSons > 0 ? Array.from({length: maxSons}).flatMap((_, i) => [
      { key: `sonName${i+1}`, label: `اسم الابن ${i+1}`, checked: true },
      { key: `sonID${i+1}`, label: `رقم هوية الابن ${i+1}`, checked: true },
      { key: `sonBirthDate${i+1}`, label: `تاريخ الميلاد`, checked: true },
      { key: `sonIsDisabled${i+1}`, label: `هل الابن ${i+1} معاق`, checked: true },
      { key: `sonDisabilityType${i+1}`, label: `نوع إعاقة الابن ${i+1}`, checked: true },
      { key: `sonHasChronicIllness${i+1}`, label: `هل الابن ${i+1} يعاني من مرض مزمن`, checked: true },
      { key: `sonChronicIllnessType${i+1}`, label: `نوع مرض الابن ${i+1} المزمن`, checked: true },
      { key: `sonHasWarInjury${i+1}`, label: `هل الابن ${i+1} يعاني من إصابة حرب`, checked: true },
      { key: `sonWarInjuryType${i+1}`, label: `نوع إصابة حرب الابن ${i+1}`, checked: true },
    ]) : []),
    // Children columns (dynamic, only if maxChildren > 0)
    ...(maxChildren > 0 ? Array.from({length: maxChildren}).flatMap((_, i) => [
      { key: `childName${i+1}`, label: `اسم الطفل رباعي ${i+1}`, checked: true },
      { key: `childID${i+1}`, label: `رقم هوية الطفل ${i+1}`, checked: true },
      { key: `childBirthDate${i+1}`, label: `تاريخ الميلاد`, checked: true },
      { key: `childIsDisabled${i+1}`, label: `هل الطفل ${i+1} معاق`, checked: true },
      { key: `childDisabilityType${i+1}`, label: `نوع إعاقة الطفل ${i+1}`, checked: true },
      { key: `childHasChronicIllness${i+1}`, label: `هل الطفل ${i+1} يعاني من مرض مزمن`, checked: true },
      { key: `childChronicIllnessType${i+1}`, label: `نوع مرض الطفل ${i+1} المزمن`, checked: true },
      { key: `childHasWarInjury${i+1}`, label: `هل الطفل ${i+1} يعاني من إصابة حرب`, checked: true },
      { key: `childWarInjuryType${i+1}`, label: `نوع إصابة حرب الطفل ${i+1}`, checked: true },
    ]) : []),
    { key: 'hasChildrenAboveTwo', label: 'هل لديك ابناء أكبر من سنتين', checked: true },
    { key: 'numMales', label: 'عدد الافراد الذكور', checked: true },
    { key: 'numFemales', label: 'عدد الافراد الاناث', checked: true },
    { key: 'socialStatus', label: 'الحالة الاجتماعية لرب الاسرة', checked: true },
    { key: 'abroadLocation', label: 'اسم الدولة إذا كنت مغترب خارج البلاد', checked: true },
    { key: 'adminNotes', label: 'ملاحظات إدارية', checked: true },
  ], [maxSons, maxChildren, maxWives, maxOrphans]);

  const [checkedColumns, setCheckedColumns] = useState<{ [key: string]: boolean }>({});

  // Sync checkedColumns with available columns
  useEffect(() => {
    setCheckedColumns(prev => {
      const next: { [key: string]: boolean } = {};
      for (const col of excelColumns) {
        next[col.key] = prev[col.key] !== undefined ? prev[col.key] : true;
      }
      return next;
    });
  }, [excelColumns]);

  // Checkbox toggle handler
  const handleExcelColumnChange = (key: string) => {
    setCheckedColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Group toggles
  const handleGroupToggle = (group: "sons" | "children") => {
    setCheckedColumns(prev => {
      const next = { ...prev };
      const groupCols = excelColumns.filter(col =>
        group === "sons" ? col.key.startsWith("son") :
        col.key.startsWith("child")
      );
      const allChecked = groupCols.every(col => prev[col.key]);
      for (const col of groupCols) {
        next[col.key] = !allChecked;
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setCheckedColumns(Object.fromEntries(excelColumns.map(col => [col.key, true])));
  };

  const handleDeselectAll = () => {
    setCheckedColumns(Object.fromEntries(excelColumns.map(col => [col.key, false])));
  };

  // For UI
  const sonCols = excelColumns.filter(col => col.key.startsWith('son'));
  const childCols = excelColumns.filter(col => col.key.startsWith('child'));
  const wifeCols = excelColumns.filter(col => col.key.startsWith('wife'));
  const husbandCols = excelColumns.filter(col => col.key.startsWith('husband'));
  const isSonsChecked = sonCols.length > 0 && sonCols.every(col => checkedColumns[col.key]);
  const isChildrenChecked = childCols.length > 0 && childCols.every(col => checkedColumns[col.key]);
  const isWivesChecked = wifeCols.length > 0 && wifeCols.every(col => checkedColumns[col.key]);

  // For export
  const selectedCols = excelColumns.filter(col => checkedColumns[col.key]);

  // Excel export handler (RTL, mapped to user headers)
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('قائمة الأسر', {views: [{rightToLeft: true}] });
      // Styles
      const titleStyle: Partial<ExcelJS.Style> = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } }, // Light green color (accent 6, lighter 60%)
        font: { color: { argb: 'FF000000' }, bold: true, size: 16 }, // Black text
        alignment: { horizontal: 'center', vertical: 'middle' }
      };
      const headerStyle: Partial<ExcelJS.Style> = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } }, // Light green color (accent 6, lighter 60%)
        font: { color: { argb: 'FF000000' }, bold: true, size: 12 }, // Black text
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: { top: { style: 'thin' as ExcelJS.BorderStyle }, bottom: { style: 'thin' as ExcelJS.BorderStyle }, left: { style: 'thin' as ExcelJS.BorderStyle }, right: { style: 'thin' as ExcelJS.BorderStyle } }
      };
      // For style alignment, use correct ExcelJS alignment type
      const dataStyle: Partial<ExcelJS.Style> = {
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: { top: { style: 'thin' as ExcelJS.BorderStyle }, bottom: { style: 'thin' as ExcelJS.BorderStyle }, left: { style: 'thin' as ExcelJS.BorderStyle }, right: { style: 'thin' as ExcelJS.BorderStyle } }
      };
      // RTL: reverse columns for visual order
      // Add title row above header row, merge all cells, and center
      // Create a title row with the same number of cells as the header row
      const titleCells = Array(selectedCols.length).fill('');
      titleCells[0] = 'قائمة الأسر (تصدير)';
      const titleRow = sheet.addRow(titleCells);
      titleRow.height = 30;
      // Merge all cells in the title row (A1 to last column)
      const lastColLetter = sheet.getColumn(selectedCols.length).letter;
      sheet.mergeCells(`A1:${lastColLetter}1`);
      titleRow.getCell(1).style = titleStyle;
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      // Header row
      const headerRow = sheet.addRow(selectedCols.map(c => c.label));
      headerRow.height = 30; // Increased height for better header readability
      headerRow.eachCell(cell => { 
        cell.style = headerStyle;
        // Ensure text wrapping is enabled for headers
        cell.alignment = { 
          ...headerStyle.alignment,
          wrapText: true
        };
      });
      // Data rows
      (Array.isArray(filteredFamilies) ? filteredFamilies : []).forEach(family => {
        const members: any[] = Array.isArray(family?.members) ? family.members : [];
        const orphans: any[] = Array.isArray(family?.orphans) ? family.orphans : [];
        // Combine members and orphans for export purposes
        // Convert orphans to the same structure as members for proper export
        const allMembers = [...members];

        // Add orphans to the allMembers array with appropriate field mapping
        if (Array.isArray(orphans)) {
          const orphansAsMembers = orphans.map(orph => ({
            ...orph,
            // Map orphan fields to member fields for consistent processing
            fullName: orph.orphanName || orph.fullName,
            memberID: orph.orphanID || orph.memberID,
            birthDate: orph.orphanBirthDate || orph.birthDate,
            isDisabled: orph.isDisabled || orph.orphanIsDisabled,
            disabilityType: orph.disabilityType || orph.orphanDisabilityType,
            hasChronicIllness: orph.hasChronicIllness || orph.orphanHasChronicIllness,
            chronicIllnessType: orph.chronicIllnessType || orph.orphanChronicIllnessType,
            hasWarInjury: orph.hasWarInjury || orph.orphanHasWarInjury,
            warInjuryType: orph.warInjuryType || orph.orphanWarInjuryType,
            // Keep original orphan fields for reference if needed
            isOrphan: true
          }));
          allMembers.push(...orphansAsMembers);
        }

        // Debug: log members, sons, children, and orphans to console
        console.log('Exporting family:', {
          id: family.id,
          husbandName: family.husbandName,
          members,
          orphans,
          allMembers, // This now includes orphans
          sons: allMembers.filter((m: any) => !isChild(m.birthDate)).map((s: any) => ({ fullName: s.fullName, birthDate: s.birthDate })),
          children: allMembers.filter((m: any) => isChild(m.birthDate)).map((c: any) => ({ fullName: c.fullName, birthDate: c.birthDate })),
        });

        // Use isChild for children, !isChild for sons (age-based only)
        const children: any[] = Array.isArray(allMembers) ? allMembers.filter((member: any) => isChild(member.birthDate)) : [];
        const sons: any[] = Array.isArray(allMembers) ? allMembers.filter((member: any) => !isChild(member.birthDate)) : [];
        const wives: any[] = family.wife ? [family.wife] : (family.wifeName ? [{
          wifeName: family.wifeName,
          wifeID: family.wifeID,
          wifeJob: family.wifeJob,
          wifeBirthDate: family.wifeBirthDate,
          wifePregnant: family.wifePregnant,
          wifeHasChronicIllness: family.wifeHasChronicIllness,
          wifeChronicIllnessType: family.wifeChronicIllnessType,
          wifeHasDisability: family.wifeHasDisability,
          wifeDisabilityType: family.wifeDisabilityType,
          wifeHasWarInjury: family.wifeHasWarInjury,
          wifeWarInjuryType: family.wifeWarInjuryType
        }] : []);
        const sonsData: (any|null)[] = Array.isArray(sons) ? Array.from({length: maxSons}).map((_, i) => sons[i] || null) : [];
        const childrenData: (any|null)[] = Array.isArray(children) ? Array.from({length: maxChildren}).map((_, i) => children[i] || null) : [];
        const orphansData: (any|null)[] = Array.isArray(orphans) ? Array.from({length: maxOrphans}).map((_, i) => orphans[i] || null) : [];
        const wivesData: (any|null)[] = wives.length > 0 ? [wives[0]] : [null];
        const disabledMembers: any[] = Array.isArray(allMembers) ? allMembers.filter((m: any) => m.isDisabled) : [];
        const disabilityTypes = Array.isArray(disabledMembers) ? disabledMembers.map((m: any) => m.disabilityType || '').filter(Boolean).join(', ') : '';
        const rowData = Array.isArray(selectedCols) ? selectedCols.map(col => {
          // Wife data export (single wife)
          // Wives: wifeName, wifeID, wifeJob, wifeBirthDate, wifeAge, wifePregnant
          if (col.key === 'wifeName') {
            return wives.length > 0 ? wives[0].wifeName || '' : '';
          }
          if (col.key === 'wifeID') {
            return wives.length > 0 ? wives[0].wifeID || '' : '';
          }
          if (col.key === 'wifeJob') {
            return wives.length > 0 ? wives[0].wifeJob || '' : '';
          }
          if (col.key === 'wifeBirthDate') {
            return wives.length > 0 ? wives[0].wifeBirthDate || '' : '';
          }
          if (col.key === 'wifeAge') {
            return wives.length > 0 && wives[0].wifeBirthDate ? getAge(wives[0].wifeBirthDate) : '';
          }
          if (col.key === 'wifePregnant') {
            return wives.length > 0 ? (wives[0].wifePregnant ? 'نعم' : 'لا') : '';
          }
          if (col.key === 'wifeHasChronicIllness') {
            return wives.length > 0 ? (wives[0].wifeHasChronicIllness ? 'نعم' : 'لا') : '';
          }
          if (col.key === 'wifeChronicIllnessType') {
            return wives.length > 0 ? (wives[0].wifeChronicIllnessType || '') : '';
          }
          if (col.key === 'wifeHasDisability') {
            return wives.length > 0 ? (wives[0].wifeHasDisability ? 'نعم' : 'لا') : '';
          }
          if (col.key === 'wifeDisabilityType') {
            return wives.length > 0 ? (wives[0].wifeDisabilityType || '') : '';
          }
          if (col.key === 'wifeHasWarInjury') {
            return wives.length > 0 ? (wives[0].wifeHasWarInjury ? 'نعم' : 'لا') : '';
          }
          if (col.key === 'wifeWarInjuryType') {
            return wives.length > 0 ? (wives[0].wifeWarInjuryType || '') : '';
          }
          // Dynamic sons/children export
          // Sons: sonNameX, sonIDX, sonBirthDateX
          const sonNameMatch = typeof col.key === 'string' ? col.key.match(/^sonName(\d+)$/) : null;
          const sonIDMatch = typeof col.key === 'string' ? col.key.match(/^sonID(\d+)$/) : null;
          const sonBirthDateMatch = typeof col.key === 'string' ? col.key.match(/^sonBirthDate(\d+)$/) : null;
          if (sonNameMatch) {
            const idx = parseInt(sonNameMatch[1], 10) - 1;
            if (Array.isArray(sons) && sons[idx]) {
              const son = sons[idx];
              let name = son.fullName || '';
              // Add (يتيم) next to orphan names if this person is an orphan
              if (son.isOrphan) {
                // Use 'يتيم' for males and 'يتيمة' for females, default to 'يتيم'
                const orphanText = son.gender === 'female' ? ' (يتيمة)' : ' (يتيم)';
                name += orphanText;
              }
              return name;
            }
            return '';
          }
          if (sonIDMatch) {
            const idx = parseInt(sonIDMatch[1], 10) - 1;
            return Array.isArray(sons) && sons[idx] ? sons[idx].memberID || '' : '';
          }
          if (sonBirthDateMatch) {
            const idx = parseInt(sonBirthDateMatch[1], 10) - 1;
            return Array.isArray(sons) && sons[idx] ? sons[idx].birthDate || '' : '';
          }
          // Sons: sonIsDisabledX, sonDisabilityTypeX, sonHasChronicIllnessX, sonChronicIllnessTypeX, sonHasWarInjuryX, sonWarInjuryTypeX
          const sonIsDisabledMatch = typeof col.key === 'string' ? col.key.match(/^sonIsDisabled(\d+)$/) : null;
          const sonDisabilityTypeMatch = typeof col.key === 'string' ? col.key.match(/^sonDisabilityType(\d+)$/) : null;
          const sonHasChronicIllnessMatch = typeof col.key === 'string' ? col.key.match(/^sonHasChronicIllness(\d+)$/) : null;
          const sonChronicIllnessTypeMatch = typeof col.key === 'string' ? col.key.match(/^sonChronicIllnessType(\d+)$/) : null;
          const sonHasWarInjuryMatch = typeof col.key === 'string' ? col.key.match(/^sonHasWarInjury(\d+)$/) : null;
          const sonWarInjuryTypeMatch = typeof col.key === 'string' ? col.key.match(/^sonWarInjuryType(\d+)$/) : null;
          if (sonIsDisabledMatch) {
            const idx = parseInt(sonIsDisabledMatch[1], 10) - 1;
            return Array.isArray(sons) && sons[idx] ? (sons[idx].isDisabled ? 'نعم' : 'لا') : '';
          }
          if (sonDisabilityTypeMatch) {
            const idx = parseInt(sonDisabilityTypeMatch[1], 10) - 1;
            return Array.isArray(sons) && sons[idx] ? (sons[idx].disabilityType || '') : '';
          }
          if (sonHasChronicIllnessMatch) {
            const idx = parseInt(sonHasChronicIllnessMatch[1], 10) - 1;
            return Array.isArray(sons) && sons[idx] ? (sons[idx].hasChronicIllness ? 'نعم' : 'لا') : '';
          }
          if (sonChronicIllnessTypeMatch) {
            const idx = parseInt(sonChronicIllnessTypeMatch[1], 10) - 1;
            return Array.isArray(sons) && sons[idx] ? (sons[idx].chronicIllnessType || '') : '';
          }
          if (sonHasWarInjuryMatch) {
            const idx = parseInt(sonHasWarInjuryMatch[1], 10) - 1;
            return Array.isArray(sons) && sons[idx] ? (sons[idx].hasWarInjury ? 'نعم' : 'لا') : '';
          }
          if (sonWarInjuryTypeMatch) {
            const idx = parseInt(sonWarInjuryTypeMatch[1], 10) - 1;
            return Array.isArray(sons) && sons[idx] ? (sons[idx].warInjuryType || '') : '';
          }
          // Children: childNameX, childIDX, childBirthDateX
          const childNameMatch = typeof col.key === 'string' ? col.key.match(/^childName(\d+)$/) : null;
          const childIDMatch = typeof col.key === 'string' ? col.key.match(/^childID(\d+)$/) : null;
          const childBirthDateMatch = typeof col.key === 'string' ? col.key.match(/^childBirthDate(\d+)$/) : null;
          if (childNameMatch) {
            const idx = parseInt(childNameMatch[1], 10) - 1;
            if (Array.isArray(children) && children[idx]) {
              const child = children[idx];
              let name = child.fullName || '';
              // Add (يتيم) next to orphan names if this person is an orphan
              if (child.isOrphan) {
                // Use 'يتيم' for males and 'يتيمة' for females, default to 'يتيم'
                const orphanText = child.gender === 'female' ? ' (يتيمة)' : ' (يتيم)';
                name += orphanText;
              }
              return name;
            }
            return '';
          }
          if (childIDMatch) {
            const idx = parseInt(childIDMatch[1], 10) - 1;
            return Array.isArray(children) && children[idx] ? children[idx].memberID || '' : '';
          }
          if (childBirthDateMatch) {
            const idx = parseInt(childBirthDateMatch[1], 10) - 1;
            return Array.isArray(children) && children[idx] ? children[idx].birthDate || '' : '';
          }
          // Children: childIsDisabledX, childDisabilityTypeX, childHasChronicIllnessX, childChronicIllnessTypeX, childHasWarInjuryX, childWarInjuryTypeX
          const childIsDisabledMatch = typeof col.key === 'string' ? col.key.match(/^childIsDisabled(\d+)$/) : null;
          const childDisabilityTypeMatch = typeof col.key === 'string' ? col.key.match(/^childDisabilityType(\d+)$/) : null;
          const childHasChronicIllnessMatch = typeof col.key === 'string' ? col.key.match(/^childHasChronicIllness(\d+)$/) : null;
          const childChronicIllnessTypeMatch = typeof col.key === 'string' ? col.key.match(/^childChronicIllnessType(\d+)$/) : null;
          const childHasWarInjuryMatch = typeof col.key === 'string' ? col.key.match(/^childHasWarInjury(\d+)$/) : null;
          const childWarInjuryTypeMatch = typeof col.key === 'string' ? col.key.match(/^childWarInjuryType(\d+)$/) : null;
          if (childIsDisabledMatch) {
            const idx = parseInt(childIsDisabledMatch[1], 10) - 1;
            return Array.isArray(children) && children[idx] ? (children[idx].isDisabled ? 'نعم' : 'لا') : '';
          }
          if (childDisabilityTypeMatch) {
            const idx = parseInt(childDisabilityTypeMatch[1], 10) - 1;
            return Array.isArray(children) && children[idx] ? (children[idx].disabilityType || '') : '';
          }
          if (childHasChronicIllnessMatch) {
            const idx = parseInt(childHasChronicIllnessMatch[1], 10) - 1;
            return Array.isArray(children) && children[idx] ? (children[idx].hasChronicIllness ? 'نعم' : 'لا') : '';
          }
          if (childChronicIllnessTypeMatch) {
            const idx = parseInt(childChronicIllnessTypeMatch[1], 10) - 1;
            return Array.isArray(children) && children[idx] ? (children[idx].chronicIllnessType || '') : '';
          }
          if (childHasWarInjuryMatch) {
            const idx = parseInt(childHasWarInjuryMatch[1], 10) - 1;
            return Array.isArray(children) && children[idx] ? (children[idx].hasWarInjury ? 'نعم' : 'لا') : '';
          }
          if (childWarInjuryTypeMatch) {
            const idx = parseInt(childWarInjuryTypeMatch[1], 10) - 1;
            return Array.isArray(children) && children[idx] ? (children[idx].warInjuryType || '') : '';
          }
          // Static columns
          switch (col.key) {
            case 'husbandName': return family.husbandName || '';
            case 'husbandID': return family.husbandID || '';
            case 'husbandJob': return family.husbandJob || '';
            case 'husbandBirthDate': return family.husbandBirthDate || '';
            case 'husbandAge': return family.husbandBirthDate ? getAge(family.husbandBirthDate) : '';
            case 'hasChronicIllness': return family.hasChronicIllness ? 'نعم' : 'لا';
            case 'chronicIllnessType': return family.chronicIllnessType || '';
            case 'hasDisability': return family.hasDisability ? 'نعم' : 'لا';
            case 'disabilityType': return family.disabilityType || '';
            case 'hasWarInjury': return family.hasWarInjury ? 'نعم' : 'لا';
            case 'warInjuryType': return family.warInjuryType || '';
            case 'primaryPhone': return family.primaryPhone || '';
            case 'secondaryPhone': return family.secondaryPhone || '';
            case 'originalResidence': return family.originalResidence || '';
            case 'currentHousing': return getHousingStatus(family);
            case 'displacedLocation': return family.displacedLocation || '';
            case 'warDamageDescription': return getDamageDescriptionInArabic(family.warDamageDescription) || '';
            case 'branch': return getBranchInArabic(family.branch) || '';
            case 'totalMembers': return family.totalMembers || '';
            case 'hasDisabledMembers': return Array.isArray(disabledMembers) && disabledMembers.length > 0 ? 'نعم' : 'لا';
            case 'disabilityTypes': return disabilityTypes;
            case 'hasChildrenUnderTwo': return Array.isArray(children) ? children.filter((member: any) => {
              if (!member.birthDate) return false;
              const age = getAge(member.birthDate);
              return age < 2;
            }).length : 0;
            case 'hasChildren2To5': {
              const children2To5 = Array.isArray(allMembers) ? allMembers.filter((member: any) => {
                if (!member.birthDate) return false;
                const age = getAge(member.birthDate);
                return age >= 2 && age <= 5;
              }) : [];
              return children2To5.length;
            }
            case 'hasChildren6To10': {
              const children6To10 = Array.isArray(allMembers) ? allMembers.filter((member: any) => {
                if (!member.birthDate) return false;
                const age = getAge(member.birthDate);
                return age >= 6 && age <= 10;
              }) : [];
              return children6To10.length;
            }
            case 'hasChildren11To15': {
              const children11To15 = Array.isArray(allMembers) ? allMembers.filter((member: any) => {
                if (!member.birthDate) return false;
                const age = getAge(member.birthDate);
                return age >= 11 && age <= 15;
              }) : [];
              return children11To15.length;
            }
            case 'hasChildrenAboveTwo': return Array.isArray(sons) && sons.length > 0 ? 'نعم' : 'لا';
            case 'numMales': return family.numMales || '';
            case 'numFemales': return family.numFemales || '';
            case 'socialStatus': return family.socialStatus ? getSocialStatusInArabic(family.socialStatus) : '';
            case 'abroadLocation': return family.abroadLocation || '';
            case 'adminNotes': return family.adminNotes || '';
            default: return '';
          }
        }) : [];
        // Log the rowData, sons, children and orphans before adding to Excel
        console.log('Excel rowData:', {
          familyId: family.id,
          husbandName: family.husbandName,
          rowData,
          sons,
          children,
          orphans,
        });
        const row = sheet.addRow(rowData);
        row.height = 25; // Increased row height for better readability
        row.eachCell(cell => { 
          cell.style = dataStyle;
          // Enable text wrapping for long content
          cell.alignment = { 
            ...dataStyle.alignment,
            wrapText: true
          };
        });
      });
      // Set intelligent column widths based on content type
      const getColumnWidth = (columnKey: string): number => {
        // Extra wide columns for names and long text fields
        if (columnKey.includes('Name') || columnKey.includes('name') || 
            columnKey.includes('اسم') || columnKey.includes('Notes') ||
            columnKey.includes('ملاحظات') || columnKey.includes('originalResidence') ||
            columnKey.includes('displacedLocation') || columnKey.includes('warDamageDescription') ||
            columnKey.includes('disabilityTypes') || columnKey.includes('abroadLocation')) {
          return 40; // Extra wide for names and long Arabic text
        }
        // Medium-wide columns for jobs and locations
        else if (columnKey.includes('Job') || columnKey.includes('عمل') ||
                 columnKey.includes('branch') || columnKey.includes('فرع') ||
                 columnKey.includes('currentHousing') || columnKey.includes('socialStatus')) {
          return 28; // Medium-wide for jobs and status in Arabic
        }
        // Medium columns for phone numbers  
        else if (columnKey.includes('Phone') || columnKey.includes('جوال')) {
          return 24; // Medium for phone numbers with Arabic labels
        }
        // Medium-narrow columns for IDs and dates
        else if (columnKey.includes('ID') || columnKey.includes('هوية') ||
                 columnKey.includes('BirthDate') || columnKey.includes('ميلاد') ||
                 columnKey.includes('Age') || columnKey.includes('عمر')) {
          return 20; // Medium-narrow for IDs and dates with Arabic labels
        }
        // Narrow columns for numbers and booleans
        else if (columnKey.includes('num') || columnKey.includes('عدد') ||
                 columnKey.includes('total') || columnKey.includes('has') ||
                 columnKey.includes('Pregnant') || columnKey.includes('حامل')) {
          return 18; // Narrow for counts and yes/no with Arabic labels
        }
        // Default width (increased for Arabic content)
        else {
          return 22;
        }
      };

      // Apply intelligent column widths based on the selected columns
      const selectedColumns = excelColumns.filter(col => checkedColumns[col.key]);
      sheet.columns.forEach((col, i) => { 
        const columnInfo = selectedColumns[i];
        if (columnInfo) {
          col.width = getColumnWidth(columnInfo.key);
        } else {
          col.width = 20; // Default fallback
        }
      });
      // Download
      let fileName;
      if (customFileName.trim()) {
        // Use custom filename and ensure it has .xlsx extension
        fileName = customFileName.trim().endsWith('.xlsx') ? customFileName.trim() : customFileName.trim() + '.xlsx';
      } else {
        fileName = `families_export_${new Date().toISOString().split('T')[0]}.xlsx`;
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

  // Pagination logic
  const totalPages = Math.ceil(filteredFamilies.length / pageSize);
  const paginatedFamilies = filteredFamilies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleViewFamily = (family: any) => {
    setSelectedFamily(family);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <FamiliesSkeleton />
      </PageWrapper>
    );
  }

  const totalFamilies = families?.length || 0;
  const displacedFamilies = families?.filter((family: any) => family.isDisplaced) || [];
  const damagedFamilies = families?.filter((family: any) => family.warDamage2023) || [];
  const abroadFamilies = families?.filter((family: any) => family.isAbroad) || [];

  return (
    <PageWrapper>
      <div className="space-y-6 w-full min-w-0 overflow-hidden">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">إدارة الأسر</h1>
            <p className="text-muted-foreground">عرض وإدارة بيانات جميع الأسر المسجلة</p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-muted-foreground">إجمالي الأسر</p>
                    <p className="text-2xl font-bold text-foreground">{totalFamilies}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <MapPin className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-muted-foreground">أسر نازحة</p>
                    <p className="text-2xl font-bold text-foreground">{displacedFamilies.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-warning/10 rounded-lg">
                    <Users className="h-6 w-6 text-warning" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-muted-foreground">أسر متضررة</p>
                    <p className="text-2xl font-bold text-foreground">{damagedFamilies.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-secondary/10 rounded-lg">
                    <Users className="h-6 w-6 text-secondary" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-muted-foreground">مغتربون</p>
                    <p className="text-2xl font-bold text-foreground">{abroadFamilies.length}</p>
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
                      placeholder="البحث بالاسم، رقم الهوية، أو الموقع..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 text-right"
                      dir="rtl"
                    />
                  </div>
                </div>
                {/* Filters */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex flex-col items-center">
                    <label className="mb-1 text-sm text-foreground text-center w-full">الفرع</label>
                    <Select value={branchFilter} onValueChange={setBranchFilter} dir="rtl">
                      <SelectTrigger className="w-full text-right" dir="rtl">
                        <SelectValue className="text-right" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">كل الفروع</SelectItem>
                        <SelectItem value="abushalbia">ابو شلبية (شلف - علاينة - عزايزة)</SelectItem>
                        <SelectItem value="alnaqra">النقرة (الدوار)</SelectItem>
                        <SelectItem value="abuawda">ابو عودة</SelectItem>
                        <SelectItem value="abunasr">ابو نصر</SelectItem>
                        <SelectItem value="abumatar">ابو مطر</SelectItem>
                        <SelectItem value="no_branch">لا يوجد فرع محدد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="mb-1 text-sm text-foreground text-center w-full">نازح</label>
                    <Select value={displacedFilter} onValueChange={setDisplacedFilter} dir="rtl">
                      <SelectTrigger className="w-full text-right" dir="rtl">
                        <SelectValue className="text-right" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">كل الحالات</SelectItem>
                        <SelectItem value="yes">نازح</SelectItem>
                        <SelectItem value="no">غير نازح</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="mb-1 text-sm text-foreground text-center w-full">متضرر</label>
                    <Select value={damagedFilter} onValueChange={setDamagedFilter} dir="rtl">
                      <SelectTrigger className="w-full text-right" dir="rtl">
                        <SelectValue className="text-right" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">كل الحالات</SelectItem>
                        <SelectItem value="yes">متضرر</SelectItem>
                        <SelectItem value="no">غير متضرر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="mb-1 text-sm text-foreground text-center w-full">مغترب</label>
                    <Select value={abroadFilter} onValueChange={setAbroadFilter} dir="rtl">
                      <SelectTrigger className="w-full text-right" dir="rtl">
                        <SelectValue className="text-right" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">كل الحالات</SelectItem>
                        <SelectItem value="yes">مغترب</SelectItem>
                        <SelectItem value="no">غير مغترب</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="mb-1 text-sm text-foreground text-center w-full">الحالة الاجتماعية</label>
                    <Select value={socialStatusFilter} onValueChange={setSocialStatusFilter} dir="rtl">
                      <SelectTrigger className="w-full text-right" dir="rtl">
                        <SelectValue className="text-right" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="married">متزوج</SelectItem>
                        <SelectItem value="polygamous">متعدد زوجات</SelectItem>
                        <SelectItem value="widowed">ارملة</SelectItem>
                        <SelectItem value="vulnerable_family">اسر هشة (ايتام)</SelectItem>
                        <SelectItem value="abandoned">متروكة</SelectItem>
                        <SelectItem value="divorced">مطلقة</SelectItem>
                        <SelectItem value="single">عانس</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="mb-1 text-sm text-foreground text-center w-full">عدد الأفراد</label>
                    <Select value={membersFilter} onValueChange={setMembersFilter} dir="rtl">
                      <SelectTrigger className="w-full text-right" dir="rtl">
                        <SelectValue className="text-right" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">جميع الأحجام</SelectItem>
                        <SelectItem value="small">صغيرة (1-3)</SelectItem>
                        <SelectItem value="medium">متوسطة (4-6)</SelectItem>
                        <SelectItem value="large">كبيرة (7+)</SelectItem>
                        <SelectItem value="custom">مخصص</SelectItem>
                      </SelectContent>
                    </Select>
                    {membersFilter === 'custom' && (
                      <div className="mt-2 grid grid-cols-2 gap-2 w-full">
                        <div>
                          <label className="text-xs text-muted-foreground block text-center">الحد الأدنى</label>
                          <Input
                            type="number"
                            min="0"
                            value={membersMinCount}
                            onChange={(e) => setMembersMinCount(e.target.value)}
                            placeholder="0"
                            className="text-xs text-right"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block text-center">الحد الأقصى</label>
                          <Input
                            type="number"
                            min="0"
                            value={membersMaxCount}
                            onChange={(e) => setMembersMaxCount(e.target.value)}
                            placeholder="10"
                            className="text-xs text-right"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="mb-1 text-sm text-foreground text-center w-full">أم حامل</label>
                    <Select value={pregnantFilter} onValueChange={setPregnantFilter} dir="rtl">
                      <SelectTrigger className="w-full text-right" dir="rtl">
                        <SelectValue className="text-right" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="yes">نعم</SelectItem>
                        <SelectItem value="no">لا</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="mb-1 text-sm text-foreground text-center w-full">تحديث البيانات</label>
                    <Select value={completenessFilter} onValueChange={setCompletenessFilter} dir="rtl">
                      <SelectTrigger className="w-full text-right" dir="rtl">
                        <SelectValue className="text-right" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">جميع الأسر</SelectItem>
                        <SelectItem value="complete">البيانات مكتملة</SelectItem>
                        <SelectItem value="incomplete">البيانات ناقصة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="mb-1 text-sm text-foreground text-center w-full">العمر</label>
                    <p className="text-xs text-muted-foreground mb-1">الأبناء أو الأيتام</p>
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Families Table */}
          <Card>
            <CardHeader>
              <CardTitle>قائمة الأسر ({filteredFamilies.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredFamilies.length > 0 ? (
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-background">
                      <tr>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">رب الأسرة</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">رقم الهوية</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">أفراد الأسرة</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الحالة</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">تاريخ التسجيل</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {paginatedFamilies.map((family: any) => (
                        <tr key={family.id} className="hover:bg-muted">
                          <td className="px-3 md:px-6 py-4">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">{family.husbandName}</div>
                              {family.primaryPhone && (
                                <div className="text-sm text-muted-foreground flex items-center truncate">
                                  <Phone className="h-3 w-3 ml-1 flex-shrink-0" />
                                  <span className="truncate">{family.primaryPhone}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {family.husbandID}
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm font-medium text-foreground">{family.totalMembers || 0}</div>
                            <div className="text-xs text-muted-foreground">
                              {family.numMales || 0} ذكور، {family.numFemales || 0} إناث
                            </div>
                          </td>
                          <td className="px-3 md:px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[120px]">
                              {family.isDisplaced && (
                                <Badge variant="destructive" className="text-xs">نازح</Badge>
                              )}
                              {family.warDamage2023 && (
                                <Badge variant="outline" className="text-xs">متضرر</Badge>
                              )}
                              {family.isAbroad && (
                                <Badge className="bg-primary/10 text-primary text-xs">مغترب</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-muted-foreground hidden lg:table-cell">
                            {formatDate(family.createdAt)}
                          </td>
                          <td className="px-3 md:px-6 py-4 text-sm">
                            <div className="flex flex-wrap gap-1 md:flex-nowrap md:space-x-2 md:space-x-reverse min-w-[140px]">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewFamily(family)}
                                className="w-8 h-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/admin/families/${family.id}/edit`)}
                                className="w-8 h-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Link href={`/admin/families/${family.id}/summary`} target="_blank">
                                <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (window.confirm("هل أنت متأكد أنك تريد حذف هذه الأسرة؟ سيتم حذف جميع الأفراد والبيانات المرتبطة بها.")) {
                                    deleteFamilyMutation.mutate(family.id);
                                  }
                                }}
                                className="w-8 h-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
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
                    {searchTerm ? 'لم يتم العثور على أسر تطابق البحث' : 'لا توجد أسر مسجلة'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Family Details Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] md:w-full overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-center w-full">تفاصيل الأسرة - {familyDetails?.husbandName || ''}</DialogTitle>
              </DialogHeader>
              {familyDetailsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-muted-foreground">جاري تحميل التفاصيل...</div>
                </div>
              ) : familyDetailsError ? (
                <div className="flex flex-col items-center justify-center h-32 text-red-600">
                  <div>حدث خطأ أثناء تحميل بيانات الأسرة.</div>
                  <div className="text-xs text-muted-foreground mt-2">{familyDetailsError.message || 'يرجى المحاولة مرة أخرى لاحقاً.'}</div>
                </div>
              ) : !familyDetails ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <div>لا توجد بيانات متاحة لهذه الأسرة.</div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Family Info */}
                  <div className="bg-background rounded-lg p-4 border mb-2">
                    <div className="flex flex-wrap gap-4 items-center mb-2">
                      <Badge className="bg-blue-100 text-blue-800">رقم الأسرة: {familyDetails.id}</Badge>
                      {familyDetails.isDisplaced && <Badge variant="destructive">نازح</Badge>}
                      {familyDetails.warDamage2023 && <Badge variant="outline">متضرر</Badge>}
                      {familyDetails.isAbroad && <Badge className="bg-blue-100 text-blue-800">مغترب</Badge>}
                      {familyDetails.branch && <Badge className="bg-green-100 text-green-800">{getBranchInArabic(familyDetails.branch)}</Badge>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">العنوان الأصلي:</span>
                        <span className="mr-2">{familyDetails.originalResidence || 'غير محدد'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">مكان السكن الحالي:</span>
                        <span className="mr-2">{familyDetails.currentHousing || 'غير محدد'}</span>
                      </div>
                      {familyDetails.isDisplaced && (
                        <div>
                          <span className="font-medium text-muted-foreground">موقع النزوح:</span>
                          <span className="mr-2">{familyDetails.displacedLocation || 'غير محدد'}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-muted-foreground">أقرب معلم:</span>
                        <span className="mr-2">{familyDetails.landmarkNear || 'غير محدد'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">ملاحظات الإدارة:</span>
                        <span className="mr-2">{familyDetails.adminNotes || 'لا يوجد'}</span>
                      </div>
                    </div>
                          </div>
                  {/* Husband & Wife Info */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <div className="bg-white rounded-lg p-3 md:p-4 border">
                      <h4 className="font-semibold text-blue-900 mb-3 flex flex-wrap items-center gap-2">رب الأسرة <Badge className="bg-blue-200 text-blue-900">{familyDetails.husbandName}</Badge></h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex flex-col sm:flex-row"><span className="font-medium text-muted-foreground">رقم الهوية:</span> <span className="sm:mr-2">{familyDetails.husbandID}</span></div>
                        <div className="flex flex-col sm:flex-row"><span className="font-medium text-muted-foreground">تاريخ الميلاد:</span> <span className="sm:mr-2">{familyDetails.husbandBirthDate || 'غير محدد'}{familyDetails.husbandBirthDate && <> (<span className="text-green-700">{calculateDetailedAge(familyDetails.husbandBirthDate)}</span>)</>}</span></div>
                        <div className="flex flex-col sm:flex-row"><span className="font-medium text-muted-foreground">المهنة:</span> <span className="sm:mr-2">{familyDetails.husbandJob || 'غير محدد'}</span></div>
                        <div className="flex flex-col sm:flex-row"><span className="font-medium text-muted-foreground">المرض المزمن:</span> <span className="sm:mr-2">{familyDetails.hasChronicIllness ? (familyDetails.chronicIllnessType || 'نعم') : 'لا'}</span></div>
                        <div className="flex flex-col sm:flex-row"><span className="font-medium text-muted-foreground">الإعاقة:</span> <span className="sm:mr-2">{familyDetails.hasDisability ? (familyDetails.disabilityType || 'نعم') : 'لا'}</span></div>
                        <div className="flex flex-col sm:flex-row"><span className="font-medium text-muted-foreground">الجوال:</span> <span className="sm:mr-2">{familyDetails.primaryPhone || 'غير محدد'}</span></div>
                        <div className="flex flex-col sm:flex-row"><span className="font-medium text-muted-foreground">الجوال الإضافي:</span> <span className="sm:mr-2">{familyDetails.secondaryPhone || 'غير محدد'}</span></div>
                          </div>
                    </div>
                    {/* Wives Information */}
                    {(familyDetails.spouse || familyDetails.wifeName) && (
                      <div className="bg-card rounded-lg p-3 md:p-4 border">
                        <h4 className="font-semibold text-card-foreground mb-3">
                          {familyDetails.userGender === 'female' ? 'الزوج' : 'الزوجة'}
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="secondary">{familyDetails.userGender === 'female' ? familyDetails.spouseAsHusbandName : familyDetails.spouseAsWifeName}</Badge>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex flex-col sm:flex-row"><span className="font-medium text-muted-foreground">رقم الهوية:</span> <span className="sm:mr-2">{familyDetails.userGender === 'female' ? familyDetails.spouseAsHusbandID : familyDetails.spouseAsWifeID || 'غير محدد'}</span></div>
                            <div className="flex flex-col sm:flex-row"><span className="font-medium text-muted-foreground">تاريخ الميلاد:</span> <span className="sm:mr-2">{(familyDetails.userGender === 'female' ? familyDetails.spouseAsHusbandBirthDate : familyDetails.spouseAsWifeBirthDate) || 'غير محدد'}{(familyDetails.userGender === 'female' ? familyDetails.spouseAsHusbandBirthDate : familyDetails.spouseAsWifeBirthDate) && <> (<span className="text-primary">{calculateDetailedAge(familyDetails.userGender === 'female' ? familyDetails.spouseAsHusbandBirthDate : familyDetails.spouseAsWifeBirthDate)}</span>)</>}</span></div>
                            <div className="flex flex-col sm:flex-row"><span className="font-medium text-muted-foreground">المهنة:</span> <span className="sm:mr-2">{familyDetails.userGender === 'female' ? familyDetails.spouseAsHusbandJob : familyDetails.spouseAsWifeJob || 'غير محدد'}</span></div>
                            <div className="flex flex-col sm:flex-row"><span className="font-medium text-muted-foreground">المرض المزمن:</span> <span className="sm:mr-2">{(familyDetails.userGender === 'female' ? familyDetails.spouseAsHusbandHasChronicIllness : familyDetails.spouseAsWifeHasChronicIllness) ? ((familyDetails.userGender === 'female' ? familyDetails.spouseAsHusbandChronicIllnessType : familyDetails.spouseAsWifeChronicIllnessType) || 'نعم') : 'لا'}</span></div>
                            <div className="flex flex-col sm:flex-row"><span className="font-medium text-muted-foreground">الإعاقة:</span> <span className="sm:mr-2">{(familyDetails.userGender === 'female' ? familyDetails.spouseAsHusbandHasDisability : familyDetails.spouseAsWifeHasDisability) ? ((familyDetails.userGender === 'female' ? familyDetails.spouseAsHusbandDisabilityType : familyDetails.spouseAsWifeDisabilityType) || 'نعم') : 'لا'}</span></div>
                            {familyDetails.userGender !== 'female' && ( // Only show pregnancy field when head is male (i.e., spouse could be pregnant)
                            <div className="flex flex-col sm:flex-row"><span className="font-medium text-muted-foreground">حامل:</span> <span className="sm:mr-2">{(familyDetails.userGender === 'female' ? familyDetails.spouseAsHusbandPregnant : familyDetails.spouseAsWifePregnant) ? <Badge variant="outline" className="border-warning text-warning">نعم</Badge> : 'لا'}</span></div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Members */}
                  {familyDetails.members && familyDetails.members.length > 0 ? (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">أفراد الأسرة</h4>
                      <div className="overflow-x-auto">
                        <div className="block md:hidden space-y-2">
                          {familyDetails.members.map((member: any) => (
                            <div key={member.id} className="border rounded-lg p-3 text-sm">
                              <div className="font-medium mb-1">{member.fullName}</div>
                              <div className="text-muted-foreground space-y-1">
                                <div>الجنس: {getGenderInArabic(member.gender)}</div>
                                <div>القرابة: {getRelationshipInArabic(member.relationship)}</div>
                                <div>تاريخ الميلاد: {member.birthDate || 'غير محدد'}{member.birthDate && <> (<span className="text-primary">{calculateDetailedAge(member.birthDate)}</span>)</>}</div>
                                <div>الإعاقة: {member.isDisabled ? (member.disabilityType || 'نعم') : 'لا'}</div>
                                <div>المرض المزمن: {member.hasChronicIllness ? (member.chronicIllnessType || 'نعم') : 'لا'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <table className="hidden md:table w-full text-sm">
                          <thead className="bg-background">
                            <tr>
                              <th className="px-3 py-2 text-right">الاسم</th>
                              <th className="px-3 py-2 text-right">الجنس</th>
                              <th className="px-3 py-2 text-right">القرابة</th>
                              <th className="px-3 py-2 text-right">تاريخ الميلاد</th>
                              <th className="px-3 py-2 text-right">إعاقة</th>
                              <th className="px-3 py-2 text-right">مرض مزمن</th>
                            </tr>
                          </thead>
                          <tbody>
                            {familyDetails.members.map((member: any) => (
                              <tr key={member.id} className="border-b">
                                <td className="px-3 py-2">{member.fullName}</td>
                                <td className="px-3 py-2">{getGenderInArabic(member.gender)}</td>
                                <td className="px-3 py-2">{getRelationshipInArabic(member.relationship)}</td>
                                <td className="px-3 py-2">{member.birthDate || 'غير محدد'}{member.birthDate && <> (<span className="text-primary">{calculateDetailedAge(member.birthDate)}</span>)</>}</td>
                                <td className="px-3 py-2">{member.isDisabled ? (member.disabilityType || 'نعم') : 'لا'}</td>
                                <td className="px-3 py-2">{member.hasChronicIllness ? (member.chronicIllnessType || 'نعم') : 'لا'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">لا يوجد أفراد مسجلين لهذه الأسرة.</div>
                  )}
                  {/* Recent Requests */}
                  {familyDetails.requests && familyDetails.requests.length > 0 ? (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">الطلبات الأخيرة</h4>
                      <div className="space-y-2">
                        {familyDetails.requests.slice(0, 3).map((request: any) => (
                          <div key={request.id} className="flex items-center justify-between p-3 bg-background rounded border">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{getRequestTypeInArabic(request.type)}</span>
                              <span className="text-muted-foreground text-xs">{formatDate(request.createdAt)}</span>
                            </div>
                            <Badge variant={
                              request.status === 'approved' ? 'default' :
                              request.status === 'rejected' ? 'destructive' :
                              'secondary'
                            } className={
                              request.status === 'approved' ? 'bg-primary text-primary-foreground' :
                              request.status === 'rejected' ? '' :
                              'bg-warning text-warning-foreground'
                            }>
                              {getRequestStatusInArabic(request.status)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">لا توجد طلبات حديثة لهذه الأسرة.</div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
          
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
            <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] overflow-y-auto">
              <DialogHeader className="px-4 sm:px-6">
                <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span>تصدير بيانات الأسر إلى Excel</span>
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
                  {/* Husband columns */}
                  {excelColumns.filter(col => col.key.startsWith('husband')).map((col, idx) => (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all select-none shadow-sm ${checkedColumns[col.key] ?? true ? 'bg-green-50 border-green-500 text-green-800 font-bold ring-2 ring-green-200' : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'}`}
                      style={{ order: idx + 1 }}
                    >
                      <input
                        type="checkbox"
                        checked={checkedColumns[col.key] ?? true}
                        onChange={() => handleExcelColumnChange(col.key)}
                        className="accent-green-600 w-4 h-4"
                      />
                      <span className="text-sm">{col.label}</span>
                    </label>
                  ))}
                  {/* Wife columns - place immediately after husband columns */}
                  {excelColumns.filter(col => col.key.startsWith('wife')).map((col, idx) => (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all select-none shadow-sm ${checkedColumns[col.key] ?? true ? 'bg-green-50 border-green-500 text-green-800 font-bold ring-2 ring-green-200' : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'}`}
                      style={{ order: idx + excelColumns.filter(c => c.key.startsWith('husband')).length + 1 }}
                    >
                      <input
                        type="checkbox"
                        checked={checkedColumns[col.key] ?? true}
                        onChange={() => handleExcelColumnChange(col.key)}
                        className="accent-green-600 w-4 h-4"
                      />
                      <span className="text-sm">{col.label}</span>
                    </label>
                  ))}
                  {/* Sons group checkbox */}
                  {sonCols.length > 0 && (
                    <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all select-none shadow-sm ${isSonsChecked ? 'bg-green-50 border-green-500 text-green-800 font-bold ring-2 ring-green-200' : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'}`}
                      style={{ order: excelColumns.filter(c => c.key.startsWith('husband')).length + excelColumns.filter(c => c.key.startsWith('wife')).length + 1 }}>
                      <input type="checkbox" checked={isSonsChecked} onChange={() => handleGroupToggle('sons')} className="accent-green-600 w-4 h-4" />
                      <span className="text-sm">الأبناء</span>
                    </label>
                  )}
                  {/* Children group checkbox */}
                  {childCols.length > 0 && (
                    <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all select-none shadow-sm ${isChildrenChecked ? 'bg-green-50 border-green-500 text-green-800 font-bold ring-2 ring-green-200' : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'}`}
                      style={{ order: excelColumns.filter(c => c.key.startsWith('husband')).length + excelColumns.filter(c => c.key.startsWith('wife')).length + 2 }}>
                      <input type="checkbox" checked={isChildrenChecked} onChange={() => handleGroupToggle('children')} className="accent-green-600 w-4 h-4" />
                      <span className="text-sm">الأطفال</span>
                    </label>
                  )}
                  {/* Render the rest of the columns */}
                  {excelColumns.filter(col => !col.key.startsWith('son') && !col.key.startsWith('child') && !col.key.startsWith('orphan') && !col.key.startsWith('wife') && !col.key.startsWith('husband')).map((col, idx) => (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all select-none shadow-sm ${checkedColumns[col.key] ?? true ? 'bg-green-50 border-green-500 text-green-800 font-bold ring-2 ring-green-200' : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'}`}
                      style={{ order: idx + excelColumns.filter(c => c.key.startsWith('husband')).length + excelColumns.filter(c => c.key.startsWith('wife')).length + 3 }}
                    >
                      <input
                        type="checkbox"
                        checked={checkedColumns[col.key] ?? true}
                        onChange={() => handleExcelColumnChange(col.key)}
                        className="accent-green-600 w-4 h-4"
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
                    placeholder="أدخل اسم الملف (مثلاً: الأسر_المسجلة_٢٠٢٥)"
                    className="w-full text-right"
                  />
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

export default AdminFamilies;
