import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Users, FileText, Hash, Loader2, RotateCcw, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Header } from "@/components/layout/header";

export default function ImportHeads() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [activeErrorTab, setActiveErrorTab] = useState("all");
  const [importSession, setImportSession] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");
  const [importStatus, setImportStatus] = useState<any>(null);
  const [chunkSize, setChunkSize] = useState(50); // Number of records per chunk
  const [processedCount, setProcessedCount] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  // Initialize import session
  const initializeImportSession = async () => {
    if (!selectedFile) {
      toast({
        title: "لا يوجد ملف",
        description: "يرجى اختيار ملف Excel أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('excel', selectedFile);

      const response = await apiRequest("POST", "/api/admin/import-heads/init", formData, {
        headers: {
          // Don't set Content-Type, let the browser set it for FormData
        }
      });

      if (response.data.sessionId) {
        setImportSession(response.data);
        setProgress(0);
        setProcessedCount(0);
        setTotalRecords(response.data.totalRecords);
        setCurrentStatus(`تم تهيئة جلسة الاستيراد: ${response.data.totalRecords} سجل (${response.data.validRecords} صحيح، ${response.data.invalidRecords} غير صحيح)`);

        // Show appropriate toast based on validation results
        if (response.data.invalidRecords > 0) {
          toast({
            title: `تم تهيئة الجلسة مع ${response.data.invalidRecords} سجل غير صحيح`,
            description: `تم تخطي ${response.data.invalidRecords} سجل غير صحيح. سيتم استيراد ${response.data.validRecords} سجل صالح فقط.`,
            variant: "default",
          });
        } else {
          toast({
            title: "تم تهيئة الجلسة بنجاح",
            description: `تم تهيئة جلسة الاستيراد لـ ${response.data.validRecords} سجل`
          });
        }
      } else {
        throw new Error(response.data.message || "فشل في تهيئة جلسة الاستيراد");
      }
    } catch (error: any) {
      console.error('Error initializing import session:', error);
      toast({
        title: "خطأ في تهيئة الجلسة",
        description: error.message || "فشل في تهيئة جلسة الاستيراد",
        variant: "destructive",
      });
    }
  };

  // Process the import in chunks
  const processImportChunks = async () => {
    if (!importSession?.sessionId) {
      toast({
        title: "لا توجد جلسة",
        description: "يرجى تهيئة جلسة الاستيراد أولاً",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setCurrentStatus("جاري بدء معالجة الجلسة...");

    try {
      // Process in chunks until completion
      let startIdx = 0;
      let allDone = false;

      while (!allDone && importSession?.sessionId) {
        const response = await apiRequest("POST", "/api/admin/import-heads/chunk", {
          sessionId: importSession.sessionId,
          startIdx,
          chunkSize
        });

        if (response.data.success) {
          setProcessedCount(response.data.processed);
          setProgress(response.data.progress);
          setCurrentStatus(`جاري المعالجة: ${response.data.processed}/${response.data.total} (${response.data.progress}%)`);

          if (response.data.done) {
            allDone = true;
            // Get final results
            const finalResponse = await apiRequest("GET", `/api/admin/import-heads/status/${importSession.sessionId}`);
            setImportStatus(finalResponse.data);

            // Finalize the session
            await apiRequest("POST", "/api/admin/import-heads/finalize", {
              sessionId: importSession.sessionId
            });

            setIsProcessing(false);
            setImportSession(null);
            setCurrentStatus("اكتمل الاستيراد بنجاح!");

            toast({
              title: "اكتمل الاستيراد",
              description: `تم استيراد ${response.data.processed} سجل بنجاح`,
            });

            setImportResults({
              successCount: response.data.processed,
              errorCount: 0,
              validRecords: importSession.validRecords,
              invalidRecords: importSession.invalidRecords,
              invalidRows: importSession.invalidRows,
              message: importSession.invalidRecords > 0
                ? `تم استيراد ${response.data.processed} سجل من أصل ${importSession.validRecords} سجل صالح (تم تخطي ${importSession.invalidRecords} سجل غير صحيح)`
                : `تم استيراد ${response.data.processed} سجل`
            });
          } else {
            // Move to next chunk
            startIdx = response.data.processed;
          }
        } else {
          throw new Error(response.data.message || "فشل في معالجة جزء من البيانات");
        }

        // Small delay to not overwhelm the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error('Error processing import chunks:', error);
      setIsProcessing(false);
      toast({
        title: "خطأ في معالجة البيانات",
        description: error.message || "فشل في معالجة جزء من البيانات",
        variant: "destructive",
      });
    }
  };

  // Get current import status
  const checkImportStatus = async () => {
    if (!importSession?.sessionId) return;

    try {
      const response = await apiRequest("GET", `/api/admin/import-heads/status/${importSession.sessionId}`);
      setImportStatus(response.data);
      setProgress(response.data.progress);
      setProcessedCount(response.data.processed);
    } catch (error) {
      console.error('Error checking import status:', error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isProcessing && importSession?.sessionId) {
      interval = setInterval(checkImportStatus, 2000); // Check every 2 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, importSession?.sessionId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        toast({
          title: "نوع الملف غير صحيح",
          description: "يرجى اختيار ملف Excel (.xlsx أو .xls)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setImportResults(null);
      setImportSession(null);
      setProgress(0);
      setProcessedCount(0);
      setTotalRecords(0);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "لا يوجد ملف",
        description: "يرجى اختيار ملف Excel أولاً",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 20MB for chunked imports)
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast({
        title: "حجم الملف كبير",
        description: "يجب أن يكون حجم الملف أقل من 20 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    // Clear previous results
    setImportResults(null);
    setImportStatus(null);

    // Initialize import session
    await initializeImportSession();
  };

  const handleStartImport = async () => {
    if (!importSession?.sessionId) {
      toast({
        title: "لا توجد جلسة",
        description: "يرجى تهيئة جلسة الاستيراد أولاً",
        variant: "destructive",
      });
      return;
    }

    await processImportChunks();
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        husbandName: "محمد أحمد ابو طير",
        husbandID: "123456789",
        husbandBirthDate: "1980-01-15",
        husbandJob: "مهندس",
        // Wife data (optional fields)
        wifeName: "فاطمة محمد ابو طير",
        wifeID: "123456788",
        wifeBirthDate: "1982-05-20",
        wifeJob: "معلمة",
        wifePregnant: "لا",
        wifeHasDisability: "لا",
        wifeDisabilityType: "",
        wifeHasChronicIllness: "لا",
        wifeChronicIllnessType: "",
        primaryPhone: "0599123456",
        secondaryPhone: "0567789123",
        originalResidence: "غزة - الشجاعية",
        currentHousing: "رفح - البرازيل",
        isDisplaced: "نعم",
        displacedLocation: "رفح",
        isAbroad: "لا",
        warDamage2023: "نعم",
        warDamageDescription: "تدمير كامل للمنزل",
        branch: "غزة",
        landmarkNear: "بجانب مسجد الشهداء",
        totalMembers: "5",
        numMales: "3",
        numFemales: "2",
        socialStatus: "متزوج",
        adminNotes: "ملاحظات إضافية"
      }
    ];

    const csvContent = Object.keys(templateData[0]).join(',') + '\n' +
                      templateData.map(row => {
                        // Properly escape values that might contain commas
                        return Object.values(row).map(value => {
                          if (typeof value === 'string' && value.includes(',')) {
                            return `"${value}"`;
                          }
                          return value;
                        }).join(',');
                      }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template-heads-import.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Categorize errors based on their content
  const categorizeErrors = (errors: string[]) => {
    const categories = {
      duplicateIds: [] as string[],
      otherErrors: [] as string[]
    };

    errors.forEach(error => {
      if (error.includes('مسجل مسبقاً')) {
        categories.duplicateIds.push(error);
      } else {
        categories.otherErrors.push(error);
      }
    });

    return categories;
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Upload className="h-5 w-5 sm:h-6 sm:w-6" />
              استيراد رؤساء العائلات من Excel (طريقة محسنة)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>تعليمات الاستيراد المحسّن:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>الحقول المطلوبة: اسم رب الأسرة (husbandName) ورقم الهوية (husbandID)</li>
                    <li>رقم الهوية يجب أن يكون 9 أرقام</li>
                    <li>يتم استخدام رقم الهوية كاسم مستخدم وكلمة مرور افتراضية</li>
                    <li>الحقول الاختيارية: معلومات الزوجة (wifeName, wifeID، إلخ)، تاريخ الميلاد، المهنة، أرقام الهواتف، عنوان السكن، إلخ</li>
                    <li>تتم معالجة الملفات الكبيرة على دفعات لمنع حدوث أخطاء المهلة</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {/* Template Download */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-4 border rounded-lg">
              <div className="flex-1">
                <h3 className="font-semibold text-sm sm:text-base">تحميل نموذج Excel</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  نموذج يحتوي على جميع الأعمدة المطلوبة والاختيارية
                </p>
              </div>
              <Button variant="outline" onClick={downloadTemplate} className="w-full sm:w-auto">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                <span className="text-sm">تحميل النموذج</span>
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <Label htmlFor="excel-file">اختر ملف Excel</Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />

              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  تم اختيار الملف: {selectedFile.name}
                </div>
              )}
            </div>

            {/* Import Session Info */}
            {importSession && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <h4 className="font-semibold text-blue-800">معلومات الجلسة</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-800">
                    <div>عدد السجلات الكلي: <span className="font-medium">{importSession.totalRecords}</span></div>
                    <div>رقم الجلسة: <span className="font-mono text-xs">{importSession.sessionId}</span></div>
                    <div>السجلات الصحيحة: <span className="font-medium text-green-600">{importSession.validRecords}</span></div>
                    <div>السجلات غير الصحيحة: <span className="font-medium text-red-600">{importSession.invalidRecords}</span></div>
                  </div>

                  {/* Show invalid rows if any */}
                  {importSession.invalidRecords > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h5 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        السجلات غير الصحيحة ({importSession.invalidRecords})
                      </h5>
                      <div className="max-h-40 overflow-y-auto text-xs text-yellow-700">
                        {(importSession.invalidRows || []).map((error: string, index: number) => (
                          <div key={index} className="py-1 border-b border-yellow-100 last:border-0">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>مستوى التقدم</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {processedCount} من {importSession.validRecords} سجل تمت معالجتها
                  </div>
                </div>

                {/* Status Message */}
                {currentStatus && (
                  <div className="flex items-center gap-2 text-sm p-3 bg-yellow-50 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                    <span>{currentStatus}</span>
                  </div>
                )}
              </div>
            )}

            {/* Import Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {!importSession ? (
                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري التهيئة...
                    </div>
                  ) : (
                    "تهيئة جلسة الاستيراد"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleStartImport}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      المعالجة جارية...
                    </div>
                  ) : (
                    "ابدأ الاستيراد"
                  )}
                </Button>
              )}

              {importSession && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setImportSession(null);
                    setProgress(0);
                    setProcessedCount(0);
                    setTotalRecords(0);
                    setImportResults(null);
                  }}
                  className="w-full sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  إعادة تعيين
                </Button>
              )}
            </div>

            {/* Enhanced Loading message for large imports */}
            {isProcessing && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <div className="text-center">
                    <p className="font-medium text-blue-800 text-lg">جاري معالجة الملف...</p>
                    <p className="text-sm text-blue-700 mt-1">
                      يتم استيراد البيانات من ملف: <span className="font-medium">{selectedFile?.name}</span>
                    </p>
                    <p className="text-xs text-blue-600 mt-3 bg-blue-100 p-2 rounded">
                      ⏱️ العمليات الكبيرة قد تستغرق من 5-15 دقيقة حسب حجم الملف
                      <br />
                      🚫 يرجى عدم إغلاق الصفحة أو إعادة تحديثها أثناء المعالجة
                      <br />
                      ⚡ يتم إنشاء حسابات وعائلات جديدة في النظام
                    </p>
                  </div>
                </div>

                {/* Progress hint */}
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span>المعالجة جارية... يرجى الانتظار</span>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Results */}
        {importResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importResults.errorCount === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                نتائج الاستيراد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-center p-4 sm:p-6 bg-green-50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {importResults.successCount}
                  </div>
                  <div className="text-xs sm:text-sm text-green-800">تم الاستيراد بنجاح</div>
                </div>
                <div className="text-center p-4 sm:p-6 bg-red-50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-red-600">
                    {importResults.errorCount}
                  </div>
                  <div className="text-xs sm:text-sm text-red-800">فشل في الاستيراد</div>
                </div>
              </div>

              {importResults.errors && importResults.errors.length > 0 && (() => {
                const errorCategories = categorizeErrors(importResults.errors);
                const totalErrors = importResults.errors.length;

                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="font-semibold text-red-600 flex items-center gap-2 text-sm sm:text-base">
                        <AlertTriangle className="h-4 w-4" />
                        تفاصيل الأخطاء ({totalErrors})
                      </h4>
                      {importResults.errorCount > 20 && (
                        <Badge variant="outline" className="text-xs self-start sm:self-auto">
                          عرض أول 20 خطأ
                        </Badge>
                      )}
                    </div>

                    <Tabs value={activeErrorTab} onValueChange={setActiveErrorTab}>
                      <TabsList className="flex w-full gap-1 mb-4 h-auto p-1 overflow-x-auto overflow-y-hidden">
                        <TabsTrigger value="all" className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 flex-shrink-0 whitespace-nowrap">
                          <span className="hidden sm:inline">جميع الأخطاء</span>
                          <span className="sm:hidden">الكل</span>
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {totalErrors}
                          </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="duplicate" className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 flex-shrink-0 whitespace-nowrap" disabled={errorCategories.duplicateIds.length === 0}>
                          <Users className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">هويات مكررة</span>
                          <span className="sm:hidden">مكرر</span>
                          {errorCategories.duplicateIds.length > 0 && (
                            <Badge variant="destructive" className="ml-1 text-xs">
                              {errorCategories.duplicateIds.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="all">
                        <div className="max-h-60 overflow-y-auto space-y-1">
                          {importResults.errors.map((error: string, index: number) => (
                            <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded border-l-4 border-red-500">
                              {error}
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="duplicate">
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground mb-2">
                            👥 أرقام هوية موجودة مسبقاً في النظام
                          </div>
                          <div className="max-h-60 overflow-y-auto space-y-1">
                            {errorCategories.duplicateIds.map((error: string, index: number) => (
                              <div key={index} className="text-sm text-blue-600 bg-blue-50 p-2 rounded border-l-4 border-blue-500">
                                {error}
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                );
              })()}

              {/* Display invalid records if any */}
              {importResults.invalidRecords && importResults.invalidRecords > 0 && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-center gap-2 font-semibold text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>السجلات غير الصحيحة (تم تخطيها: {importResults.invalidRecords})</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {(importResults.invalidRows || []).map((error: string, index: number) => (
                      <div key={`invalid-${index}`} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded border-l-4 border-yellow-500">
                        {error}
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-muted-foreground mt-2">
                    هذه السجلات تم تخطيها بسبب عدم استيفائها لشروط الاستيراد.
                    يُرجى تصحيحها في ملف Excel وإعادة المحاولة.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}