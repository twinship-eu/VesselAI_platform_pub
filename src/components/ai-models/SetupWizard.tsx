import { useState, useEffect } from "react";
import Papa from "papaparse";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  Select,
  Switch,
  Checkbox,
  Box,
  Flex,
  Text,
  Heading,
  HStack,
  VStack,
  IconButton,
  Divider,
  Step, StepIndicator, StepStatus, StepTitle, Stepper, StepSeparator, StepIcon, StepNumber,
  Tag, TagLabel,
  SimpleGrid,
  Card,
  CardBody,
  Spinner,
  Alert, AlertIcon, AlertTitle, AlertDescription, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay,
  useToast, useDisclosure,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Badge,
  Icon,
  useColorModeValue,
  List, ListItem,
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  Tooltip
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon, AddIcon, RepeatIcon, AttachmentIcon } from "@chakra-ui/icons";
import {
  MdDelete,MdCloudUpload, MdStorage, MdFolder, MdInsertDriveFile, MdChevronRight, MdArrowBack, MdCheckCircle
} from "react-icons/md";
import { aiModelsClient, type AccessOptions } from '@/lib/aiModels/client';
import { getAccessInfo } from '@/lib/aiModels/access';
import { minioClient, type Bucket, type BucketObject } from 'lib/minioClient';
import { categories } from '@/components/ai-models/CategoryTabs';


const STEPS = [
  { title: "Basics", description: "Name & categories" },
  { title: "Implementations", description: "Algorithms" },
  { title: "Input Config", description: "Input schema" },
  { title: "Validation", description: "Test inference" },
  { title: "Output Config", description: "Outputs & results display" },
  { title: "Review", description: "Confirm & submit" },
];

const CATEGORIES = ["emissions", "navigational", "predictive", "detection"] as const;

const KNOWN_IMPLEMENTATIONS = [
  // Tree-Based
  { id: 'RFR', label: 'Random Forest Regressor' },
  { id: 'XGB', label: 'XGBoost Regressor' },
  { id: 'LGBM', label: 'LightGBM' },
  
  // Neural Networks
  { id: 'MLP', label: 'Multi-layer Perceptron' },
  { id: 'GRU', label: 'Gated Recurrent Unit' },
  { id: 'BIGRU', label: 'Bidirectional GRU' },
  { id: 'LSTM', label: 'Long Short-Term Memory' },
  { id: 'CNN', label: 'Convolutional Neural Network' },

  // Statistical/Other
  { id: 'SVR', label: 'Support Vector Regressor' },
  { id: 'LIN', label: 'Linear Regression' },
  { id: 'ENS', label: 'Ensemble Model' },
  
  { id: 'OTHER', label: 'Other' },
];

const FRAMEWORK_CONFIG: Record<string, { label: string; accept: string; runtime: string }> = {
  sklearn: { 
    label: "Model Asset (.joblib / .pkl)", 
    accept: ".joblib,.pkl",
    runtime: "mlserver_sklearn.SKLearnModel"
  },
  xgboost: { 
    label: "Model Asset (.json / .bst)", 
    accept: ".json,.bst",
    runtime: "mlserver_xgboost.XGBoostModel" 
  },
  // tensorflow: { 
  //   label: "Model Archive (.zip / Folder)", 
  //   accept: ".zip",
  //   runtime: "mlserver_tensorflow.TensorflowModel" 
  // },
  // "mlserver-custom": { 
  //   label: "Python File (.py)", 
  //   accept: ".py",
  //   runtime: "runtimes.custom_runtime.CustomRuntime"
  // },
};

interface SchemaField {
  name: string;
  type: string;
  description: string;
  required: boolean;
  group?: string;
}

type ValidationStatus = "idle" | "running" | "success" | "error";

interface ValidationResult {
  status: ValidationStatus;
  message?: string;
  extractedOutput?: SchemaField[];
  // Sample predictions from the validation run: one array of values per CSV row.
  samplePredictions?: any[][];
}

export interface ModelMetadata {
  name: string;
  slug: string;
  version: string;
  status: 'active' | 'beta' | 'deprecated';
  categories: string[];
  
  short_description: string;
  long_description: string;
  
  input_type: "csv" | "form" | "file";
  input_helper_text: string;
  output_type: "table" | "map" | "image";
  inference_hint: string;

  framework: string;
  framework_runtime: string;
  implementation_id: string;
  implementation_name: string;
  
  input_schema: SchemaField[];
  output_schema: SchemaField[];

  // Access
  required_roles: string[];   // data-* roles a viewer must hold
  restrict_to_org: boolean;   // true = only the uploader's organization
}


export interface WizardState extends ModelMetadata {
  model_file: File | null;
  model_uri: string | "";
  csv_file: File | null;
}

const initialData: WizardState = {
  name: "",
  slug: "",
  version: "1.0.0",
  status: "beta",
  categories: [],
  
  short_description: "", 
  long_description: "",

  input_type: "csv",
  input_helper_text: "",
  output_type: "table",
  inference_hint: "",

  framework: "sklearn",
  framework_runtime : FRAMEWORK_CONFIG["sklearn"].runtime,
  implementation_id: "",
  implementation_name: "",
  
  model_file: null,
  model_uri: "",
  csv_file: null,

  input_schema: [],
  output_schema: [],

  required_roles: [],
  restrict_to_org: false,
};

/**
 * Exactly what is sent to POST /register
 */
function buildRegisterPayload(data: WizardState) {
  return {
    slug: data.slug,
    name: data.name.trim(),
    version: data.version.trim(),
    status: data.status,
    categories: data.categories,
    short_description: data.short_description.trim(),
    long_description: data.long_description,

    input_type: data.input_type,
    input_helper_text: data.input_helper_text,
    input_schema: data.input_schema.map((f) => ({
      name: f.name,                       // must match the CSV header exactly
      type: f.type,
      description: f.description,
      required: f.required,
      group: f.group?.trim() || null,
    })),

    output_type: "table",
    output_schema: data.output_schema.map((f) => ({
      name: f.name.trim(),
      type: f.type,
      description: f.description,
      required: true,
    })),
    inference_hint: data.inference_hint,

    framework_runtime: data.framework_runtime,
    model_uri: data.model_uri,
    implementation_id: data.implementation_id,
    implementation_name: data.implementation_name,

    required_roles: data.required_roles,
    restrict_to_org: data.restrict_to_org,
  };
}

export type RegisterPayload = ReturnType<typeof buildRegisterPayload>;


interface AddModelWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered?: () => void;
}

export function AddModelWizard({ open, onOpenChange, onRegistered }: AddModelWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardState>({ ...initialData });
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({ status: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessOptions, setAccessOptions] = useState<AccessOptions | null>(null);
  const toast = useToast();
  const {
    isOpen: isCloseConfirmOpen,
    onOpen: openCloseConfirm,
    onClose: closeCloseConfirm,
  } = useDisclosure();

  // Storage browser (MinIO) for picking an example CSV from a bucket the user can access.
  const {
    isOpen: isStorageOpen,
    onOpen: onStorageOpen,
    onClose: onStorageClose,
  } = useDisclosure();
  const [storageBuckets, setStorageBuckets] = useState<Bucket[]>([]);
  const [storageObjects, setStorageObjects] = useState<BucketObject[]>([]);
  const [storageBucket, setStorageBucket] = useState<string>('');
  const [storagePrefix, setStoragePrefix] = useState<string>('');
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageError, setStorageError] = useState<string>('');

  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

  const update = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const cardBg = useColorModeValue("white", "navy.700");
  const subtleBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const dropzoneBorder = useColorModeValue("gray.300", "whiteAlpha.300");
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const descColor = useColorModeValue("gray.600", "gray.400");
  // Keep the brand color stable across modes so icons stay vibrant in dark mode.
  const brandColor = "brand.500";
  const successBg = useColorModeValue("green.50", "green.900");
  const successBorder = useColorModeValue("green.200", "green.700");
  const successText = useColorModeValue("green.700", "green.200");
  const reviewHeaderBg = useColorModeValue("brand.50", "whiteAlpha.100");
  const reviewHeaderText = useColorModeValue("brand.900", "white");
  const reviewHeaderSub = useColorModeValue("brand.600", "brand.200");

  const fieldBg = useColorModeValue("white", "whiteAlpha.50");
  const fieldBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const focusGlow = "brand.500";
  const fieldStyles = {
    bg: fieldBg,
    color: textColor,
    borderColor: fieldBorder,
    borderRadius: "xl" as const,
    _placeholder: { color: descColor },
    _hover: { borderColor: focusGlow },
    _focus: { borderColor: focusGlow, boxShadow: `0 0 0 1px var(--chakra-colors-brand-500)` },
    _focusVisible: { borderColor: focusGlow, boxShadow: `0 0 0 1px var(--chakra-colors-brand-500)` },
  };
  const selectOptionStyles = useColorModeValue(
    {},
    { option: { color: "white", bg: "#1B254B" } }
  );

  // Load once per wizard opening. On failure the model can still be registered, just without restrictions (the backend enforces the same rule).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAccessOptions(null);
    aiModelsClient
      .accessOptions()
      .then((opts) => {
        if (!cancelled) setAccessOptions({ dataRoles: opts?.dataRoles ?? [], orgs: opts?.orgs ?? [] });
      })
      .catch((err) => {
        console.error("[AddModelWizard] accessOptions failed:", err);
        if (!cancelled) setAccessOptions({ dataRoles: [], orgs: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // ── Derived values ──
  const userOrg = accessOptions?.orgs[0] ?? "";
  const access = getAccessInfo(
    data.required_roles,
    data.restrict_to_org && userOrg ? [userOrg] : []
  );

  // Field names offered in the map dropdowns: model outputs first, then input columns.
  const outputNames = data.output_schema.map((f) => f.name.trim());
  const outputNamesMissing = outputNames.some((n) => n === "");
  const outputNamesDuplicated = new Set(outputNames).size !== outputNames.length;
  const sampleColumnCount = validation.samplePredictions?.[0]?.length ?? 0;
  const outputCountMismatch = sampleColumnCount > 0 && sampleColumnCount !== data.output_schema.length;


  const canProceed = (): boolean => {
    switch (step) {
      case 0: // Step: Basics
        return (
          data.name.trim().length >= 3 && 
          data.slug.trim() !== "" && 
          data.short_description.trim() !== "" &&
          data.categories.length > 0
        );
      case 1: // Step: Implementation & Upload
        return (
            data.framework !== null && 
            data.model_file !== null && 
            data.implementation_id.trim() !== "" 
          );
      case 2: // Step: Schema Discovery
        return data.input_schema.length > 0;
      case 3: // Step: Validation
        return validation.status === "success";
      case 4: // Step: Output Config
        return data.output_schema.length > 0 && !outputNamesMissing && !outputNamesDuplicated;
      default:
        return true;
    }
  };


  const handleNext = async () => {
    if (!canProceed()) return;

    try {
      setIsAdvancing(true);

      switch (step) {
        case 0: {
          const res = await aiModelsClient.validateBasics(data.name);

          setData((prev) => ({
            ...prev,
            slug: res.slug,
          }));

          break;
        }

        case 1:
          break;

        case 2:
          break;
      }

      setStep((s) => s + 1);

    } catch (err: any) {
      toast({
        title: "Cannot continue",
        description: err.message || "Validation failed, try choosing a different name.",
        status: "error",
      });
    } finally {
      setIsAdvancing(false);
    }
  };

  useEffect(() => {
    if (step === 3 && validation.status === "idle") {
      runValidation();
    }
  }, [step]);

  
  const runValidation = async () => {
  if (!data.model_file || !data.csv_file) {
      setValidation({
        status: "error",
        message: !data.model_file ? "No model file found." : "No sample CSV file found.",
      });
      return;
    }

    setValidation({ status: "running" });

    try {
      const formData = new FormData();
      formData.append("model_file", data.model_file);
      formData.append("sample_csv", data.csv_file);
      formData.append("runtime", data.framework_runtime);
      formData.append("slug", data.slug);
      formData.append("version", data.version);
      formData.append("input_schema", JSON.stringify(data.input_schema));

      const result: any = await aiModelsClient.validate(formData);

      // One array of values per CSV row (single-output models give one value).
      const sampleRows: any[][] = Array.isArray(result.predictions)
        ? result.predictions.map((p: any) => (Array.isArray(p) ? p : [p]))
        : [];

      let outputs: SchemaField[] = (result.outputs || []).map((o: any) => ({
        name: o.name || "",
        type: !o.type || o.type === "unknown" ? "number" : o.type,
        description: "",
        required: true,
      }));

      // A model with several outputs (e.g. lat + lon) comes back as ONE tensor.
      // Use the sample row width to create one field per actual output value.
      const columns = sampleRows[0]?.length ?? 0;
      if (columns > 1 && outputs.length <= 1) {
        const base = outputs[0]?.name || "output";
        const type = outputs[0]?.type || "number";
        outputs = Array.from({ length: columns }, (_, i) => ({
          name: `${base}_${i + 1}`,
          type,
          description: "",
          required: true,
        }));
      }

      setValidation({
        status: "success",
        message: result.message || "Model verified successfully!",
        extractedOutput: outputs,
        samplePredictions: sampleRows,
      });

      setData((prev) => ({
        ...prev,
        model_uri: result.uri || prev.model_uri,
        output_schema: outputs.length ? outputs : prev.output_schema,
      }));

    } catch (err: any) {
      setValidation({
        status: "error",
        message:
          err.message || "Model failed to process the sample data.",
      });
    }
  };

  // Throw away the validation result and everything derived from it, and clean up the temporary model on the server.
  const invalidateValidation = async () => {
    const slugToDiscard =
      validation.status === "success" || validation.status === "error" ? data.slug : "";

    setValidation({ status: "idle" });
    setData((prev) => ({
      ...prev,
      model_uri: "",
      output_schema: [],
      display_mode: "table",
      map_lat: "",
      map_lon: "",
      map_label: "",
      map_color_by: "",
    }));

    if (slugToDiscard) {
      try {
        await aiModelsClient.delete(slugToDiscard, "discard");
      } catch (err) {
        console.error("Cleanup failed:", err);
      }
    }
  };

  // Call before any edit that makes an earlier validation meaningless
  const markValidationStale = () => {
    if (validation.status === "success" || validation.status === "error") {
      void invalidateValidation();
    }
  };

  // Parse an example CSV and apply the inferred schema.
  const applyCsvFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 20,
      complete: (results) => {
        const headers = results.meta.fields || [];
        if (headers.length === 0) {
          toast({ title: "CSV has no header row", status: "error", duration: 3000 });
          return;
        }
        const rows = results.data as Record<string, string>[];

        const inferType = (values: string[]): string => {
          const nonEmpty = values.filter((v) => v !== "" && v != null);
          if (nonEmpty.length === 0) return "string";
          if (nonEmpty.every((v) => !isNaN(Number(v)))) return "number";
          if (nonEmpty.every((v) => /^\d{4}-\d{2}-\d{2}/.test(v))) return "datetime";
          if (nonEmpty.every((v) => ["true", "false", "0", "1"].includes(v.toLowerCase())))
            return "boolean";
          return "string";
        };

        const schema: SchemaField[] = headers.map((header) => ({
          name: header,
          type: inferType(rows.map((r) => r[header] || "")),
          description: "",
          required: true,
        }));

        update("input_schema", schema);
        update("csv_file", file);
        setValidation({ status: "idle" });
        toast({
          title: `Extracted ${schema.length} fields from CSV`,
          description: "Review and adjust the inferred types below.",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
      },
      error: () => {
        toast({ title: "Failed to parse CSV", status: "error", duration: 3000 });
      },
    });
  };

  // --- Storage browser helpers (MinIO) ---
  // The backend `/api/v1/minio/buckets` and `/objects` endpoints enforce
  // user-scoped visibility, so the modal only surfaces what this user can read.
  const openStorageBrowser = async () => {
    setStorageLoading(true);
    setStorageError('');
    setStorageBucket('');
    setStoragePrefix('');
    setStorageObjects([]);
    onStorageOpen();
    try {
      const buckets = await minioClient.listBuckets();
      setStorageBuckets(buckets);
    } catch (err) {
      const msg = (err as Error)?.message || 'Failed to load buckets. Please try again.';
      setStorageError(msg);
      console.error('[AddModelWizard] listBuckets failed:', err);
    } finally {
      setStorageLoading(false);
    }
  };

  const navigateToBucket = async (bucketName: string) => {
    setStorageLoading(true);
    setStorageError('');
    setStorageBucket(bucketName);
    setStoragePrefix('');
    try {
      const objects = await minioClient.listObjects(bucketName, '', false);
      setStorageObjects(objects);
    } catch (err) {
      setStorageError('Failed to list objects.');
    } finally {
      setStorageLoading(false);
    }
  };

  const navigateToPrefix = async (prefix: string) => {
    setStorageLoading(true);
    setStorageError('');
    setStoragePrefix(prefix);
    try {
      const objects = await minioClient.listObjects(storageBucket, prefix, false);
      setStorageObjects(objects);
    } catch (err) {
      setStorageError('Failed to list objects.');
    } finally {
      setStorageLoading(false);
    }
  };

  const navigateStorageUp = () => {
    if (!storagePrefix) {
      setStorageBucket('');
      setStorageObjects([]);
      return;
    }
    const trimmed = storagePrefix.replace(/\/$/, '');
    const parentIdx = trimmed.lastIndexOf('/');
    const parent = parentIdx > 0 ? trimmed.substring(0, parentIdx + 1) : '';
    navigateToPrefix(parent);
  };

  const selectStorageFile = async (objectName: string) => {
    setStorageLoading(true);
    setStorageError('');
    try {
      const url = minioClient.getObjectURL(storageBucket, objectName);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
      const blob = await response.blob();
      const baseName = objectName.split('/').pop() || 'storage-file.csv';
      const file = new File([blob], baseName, { type: 'text/csv' });
      await invalidateValidation();
      applyCsvFile(file);
      onStorageClose();
    } catch (err) {
      setStorageError('Failed to load file from storage.');
    } finally {
      setStorageLoading(false);
    }
  };

  const storageBreadcrumbs = (() => {
    const crumbs: { label: string; prefix: string }[] = [];
    if (storagePrefix) {
      const parts = storagePrefix.replace(/\/$/, '').split('/');
      let acc = '';
      for (const p of parts) {
        acc += p + '/';
        crumbs.push({ label: p, prefix: acc });
      }
    }
    return crumbs;
  })();

  const hasProgress = (): boolean => {
    return (
      step > 0 ||
      data.name.trim() !== "" ||
      data.short_description.trim() !== "" ||
      data.categories.length > 0 ||
      data.model_file !== null ||
      data.csv_file !== null
    );
  };

  // True once a validation was attempted: the model file has been uploaded
  // (and, on success, loaded), so there is something on the server to remove.
  const requiresDiscardCleanup = (): boolean => {
    return validation.status === "success" || validation.status === "error";
  };

  const resetWizard = () => {
    setStep(0);
    setData({ ...initialData });
    setValidation({ status: "idle" });
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await aiModelsClient.register({
        ...buildRegisterPayload(data),
        restrict_to_org: data.restrict_to_org && !!userOrg,
      });

      toast({
        title: "Model registered successfully!",
        description: `"${data.name}" has been added to the registry.`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });

      // Reset state after success
      onRegistered?.();
      resetWizard();

    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "Something went wrong",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!hasProgress()) {
      resetWizard();
      return;
    }

    openCloseConfirm();
  };

  const confirmClose = async () => {
    try {
      if (requiresDiscardCleanup() && data.slug) {
        await aiModelsClient.delete(data.slug, "discard");
      }
    } catch (err) {
      console.error("Discard cleanup failed:", err);
    } finally {
      closeCloseConfirm();
      resetWizard();
    }
  };

  const addSchemaField = (target: "input_schema" | "output_schema") => {
    if (target === "input_schema") markValidationStale();
    setData((prev) => ({
      ...prev,
      [target]: [
        ...prev[target],
        {
          name: "",
          type: target === "output_schema" ? "number" : "string",
          description: "",
          required: true,
        },
      ],
    }));
  };

  const updateSchemaField = (
    target: "input_schema" | "output_schema",
    idx: number,
    field: keyof SchemaField,
    value: string | boolean
  ) => {
    // Renaming or retyping an input column changes what the model receives.
    if (target === "input_schema" && (field === "name" || field === "type")) {
      markValidationStale();
    }
    setData((prev) => {
      const list = [...prev[target]];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, [target]: list };
    });
  };


  const removeSchemaField = (target: "input_schema" | "output_schema", idx: number) => {
    if (target === "input_schema") markValidationStale();
    setData((prev) => ({ ...prev, [target]: prev[target].filter((_, i) => i !== idx) }));
  };

  const toggleCategory = (cat: string) => {
    if (data.categories.includes(cat)) {
      update("categories", data.categories.filter((c) => c !== cat));
    } else {
      update("categories", [...data.categories, cat]);
    }
  };


  const handleNameChange = (newName: string) => {
    // The slug (and so the validated model's location) depends on the name.
    markValidationStale();
    update("name", newName);
    // Auto-generate slug: lowercase, replace spaces with hyphens, remove special chars
    const generatedSlug = newName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");
    update("slug", generatedSlug);
  };

  const handleFrameworkChange = (selectedFramework: string) => {
    let runtimeValue = FRAMEWORK_CONFIG[selectedFramework]?.runtime || "";

    // "Custom Python": dynamic path
    if (selectedFramework === "mlserver-custom" && data.slug) {
      const safeSlug = data.slug.replace(/-/g, '_');
      runtimeValue = `runtimes.${safeSlug}.runtime.ModelRuntime`;
    }

    markValidationStale();
    update("framework", selectedFramework);
    update("framework_runtime", runtimeValue);
  };


  return (
    <>
      <Modal isOpen={open} onClose={handleClose} size="4xl" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent maxH="85vh">
          <ModalHeader pb={2}>
            <Heading size="lg" mb={1} color={textColor}>Register New Model</Heading>
            <Text fontSize="sm" color={descColor}>
              Provide the configuration for your custom AI model.
            </Text>
            <ModalCloseButton />

            <Box mt={4}>
              <Stepper index={step} size="sm" colorScheme="brand">
                {STEPS.map((s, i) => (
                  <Step
                    key={s.title}
                    onClick={() => i < step && setStep(i)}
                    style={{ cursor: i < step ? "pointer" : "default" }}
                  >
                    <StepIndicator>
                      <StepStatus
                        complete={<StepIcon />}
                        incomplete={<StepNumber />}
                        active={<StepNumber />}
                      />
                    </StepIndicator>
                    <Box flexShrink={0} display={{ base: "none", sm: "block" }}>
                      <StepTitle>{s.title}</StepTitle>
                    </Box>
                    <StepSeparator />
                  </Step>
                ))}
              </Stepper>
            </Box>
          </ModalHeader>

          <Divider />

          <ModalBody py={5}>
            {step === 0 && (
            <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                  <FormLabel>Model Name</FormLabel>
                  <Input
                    placeholder="e.g. Voyage CO₂ Estimator"
                    value={data.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    {...fieldStyles}
                  />

                </FormControl>

                <SimpleGrid columns={2} spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Version</FormLabel>
                    <Input
                      value={data.version}
                      onChange={(e) => update("version", e.target.value)}
                      {...fieldStyles}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl isRequired>
                  <FormLabel>Categories</FormLabel>
                  <HStack spacing={2} flexWrap="wrap">
                    {CATEGORIES.map((cat) => (
                      <Tag
                        key={cat}
                        size="md"
                        variant={data.categories.includes(cat) ? "solid" : "outline"}
                        colorScheme={data.categories.includes(cat) ? "brand" : "gray"}
                        cursor="pointer"
                        onClick={() => toggleCategory(cat)}
                        textTransform="capitalize"
                        borderRadius="full"
                      >
                        <TagLabel>{cat}</TagLabel>
                      </Tag>
                    ))}
                  </HStack>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Short Description</FormLabel>
                  <Input
                    placeholder="Brief one-liner for the model card"
                    value={data.short_description}
                    onChange={(e) => update("short_description", e.target.value)}
                    {...fieldStyles}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Long Description (Optional)</FormLabel>
                  <Textarea
                    placeholder="Detailed explanation, methodology, etc."
                    value={data.long_description}
                    onChange={(e) => update("long_description", e.target.value)}
                    {...fieldStyles}
                  />
                </FormControl>

              </VStack>
            )}

            {step === 1 && (
              <VStack spacing={5} align="stretch">
                <FormControl isRequired>
                  <FormLabel fontWeight="bold">Model Framework</FormLabel>
                  <Select
                    placeholder="Select framework"
                    value={data.framework || ""}
                    onChange={(e) => handleFrameworkChange(e.target.value)}
                    {...fieldStyles}
                    sx={selectOptionStyles}
                  >
                    <option value="sklearn">Scikit-Learn (.joblib/.pkl)</option>
                    <option value="xgboost">XGBoost (.json/.bst)</option>
                    {/* /<option value="tensorflow">TensorFlow (SavedModel)</option> */}
                    {/* <option value="mlserver-custom">Custom Python</option> */}
                  </Select>

                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontWeight="bold">Algorithm / Implementation</FormLabel>
                  <Select
                    placeholder="Select algorithm type"
                    value={data.implementation_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const found = KNOWN_IMPLEMENTATIONS.find(i => i.id === selectedId);
                      update("implementation_id", selectedId);
                      if (found && selectedId !== 'OTHER') {
                        update("implementation_name", found.label);
                      }
                    }}
                    {...fieldStyles}
                    sx={selectOptionStyles}
                  >
                    {KNOWN_IMPLEMENTATIONS.map(impl => (
                      <option key={impl.id} value={impl.id}>{impl.label} ({impl.id})</option>
                    ))}
                  </Select>
                </FormControl>

                {/* Custom Inputs για το OTHER */}
                {data.implementation_id === 'OTHER' && (
                  <VStack spacing={4} mt={2} p={4} bg={subtleBg} borderRadius="xl" borderLeft="4px solid" borderColor={brandColor}>
                    <FormControl isRequired>
                      <FormLabel fontSize="sm">Custom Algorithm Name</FormLabel>
                      <Input
                        placeholder="e.g. LightGBM"
                        value={data.implementation_name}
                        onChange={(e) => update("implementation_name", e.target.value)}
                        {...fieldStyles}
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel fontSize="sm">Custom ID (Uppercase)</FormLabel>
                      <Input
                        placeholder="e.g. LGBM"
                        value={data.implementation_id}
                        onChange={(e) => update("implementation_id", e.target.value.toUpperCase().replace(/\s+/g, ''))}
                        {...fieldStyles}
                      />
                    </FormControl>
                  </VStack>
                )}

                <Divider />

                {/* 4. DYNAMIC FILE UPLOAD */}
                <FormControl isRequired isDisabled={!data.framework}>
                      <FormLabel fontWeight="bold">
                        {data.framework ? FRAMEWORK_CONFIG[data.framework].label : "Model Asset"}
                      </FormLabel>
                      
                      <Box p={1}>
                        {data.model_file ? (
                          <Flex
                            align="center"
                            justify="space-between"
                            p={4}
                            border="1px solid"
                            borderColor={borderColor}
                            borderRadius="xl"
                            bg={cardBg}
                            boxShadow="sm"
                          >
                            <HStack spacing={4}>
                              <AttachmentIcon color={brandColor} boxSize={5} />
                              <VStack align="start" spacing={0}>
                                <Text fontWeight="bold" fontSize="sm" color={textColor}>
                                  {data.model_file.name}
                                </Text>
                                <Text fontSize="xs" color={descColor}>
                                  {(data.model_file.size / 1024 / 1024).toFixed(2)} MB
                                </Text>
                              </VStack>
                            </HStack>

                            <HStack spacing={3}>
                              <Badge colorScheme="green" variant="subtle" borderRadius="full" px={2}>
                                Ready
                              </Badge>
                              <IconButton
                                aria-label="Remove"
                                icon={<Icon as={MdDelete} boxSize={4} />}
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                onClick={async (e) => {
                                  e.stopPropagation();

                                  await invalidateValidation();

                                  update("model_file", null);
                                }}
                              />
                            </HStack>
                          </Flex>
                        ) : (
                          /* EMPTY STATE */
                          <Box
                            p={10}
                            border="2px dashed"
                            borderColor={dropzoneBorder}
                            borderRadius="xl"
                            bg={subtleBg}
                            textAlign="center"
                            cursor={data.framework ? "pointer" : "not-allowed"}
                            transition="all 0.2s"
                            _hover={data.framework ? { borderColor: brandColor } : {}}
                            onClick={() => data.framework && document.getElementById("model-upload")?.click()}
                          >
                            <input
                              id="model-upload"
                              type="file"
                              hidden
                              accept={data.framework ? FRAMEWORK_CONFIG[data.framework].accept : "*"}
                              onChange={(e) => update("model_file", e.target.files?.[0] || null)}
                            />
                            <VStack spacing={2}>
                              <AddIcon w={6} h={6} color={data.framework ? brandColor : descColor} />
                              <Text fontWeight="medium" color={data.framework ? brandColor : descColor}>
                                {data.framework ? "Click to upload model asset" : "Please select framework first"}
                              </Text>
                              <Text fontSize="xs" color={descColor}>
                                The file will be validated in the next step
                              </Text>
                            </VStack>
                          </Box>
                        )}
                      </Box>
                    </FormControl>
                  </VStack>
                )}



              {step === 2 && (
                <VStack spacing={5} align="stretch">
                  {/* Explanatory banner */}
                  <Alert status="info" borderRadius="md" variant="left-accent" fontSize="sm">
                    <AlertIcon />
                    <Box>
                      <AlertTitle fontSize="sm" mb={1}>Upload sample input data to</AlertTitle>
                      <AlertDescription fontSize="sm" color={descColor}>
                        <List>
                          <ListItem>
                            • Auto-extract input schema (column names & types)
                          </ListItem>
                          <ListItem>
                            • Run a validation inference test at the next step.
                          </ListItem>
                        </List>
                      </AlertDescription>
                    </Box>
                  </Alert>

                  {/* CSV upload / file display */}
                  {data.csv_file ? (
                    <Flex
                      align="center"
                      justify="space-between"
                      p={4}
                      border="1px solid"
                      borderColor={successBorder}
                      borderRadius="xl"
                      bg={successBg}
                    >
                      <HStack spacing={4}>
                        <AttachmentIcon color={successText} boxSize={5} />
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold" fontSize="sm" color={textColor}>
                            {data.csv_file.name}
                          </Text>
                          <Text fontSize="xs" color={descColor}>
                            {(data.csv_file.size / 1024).toFixed(1)} KB · {data.input_schema.length} fields extracted
                          </Text>
                        </VStack>
                      </HStack>
                      <HStack spacing={2}>
                        <IconButton
                          aria-label="Remove CSV"
                          icon={<Icon as={MdDelete} boxSize={4} />}
                          size="xs"
                          colorScheme="red"
                          variant="ghost"
                          onClick={async () => {
                            await invalidateValidation();

                            update("csv_file", null);
                            update("input_schema", []);
                          }}
                        />
                      </HStack>
                    </Flex>
                  ) : (
                    <Box
                      p={8}
                      borderRadius="xl"
                      border="2px dashed"
                      borderColor={dropzoneBorder}
                      bg={subtleBg}
                      textAlign="center"
                      cursor="pointer"
                      _hover={{ borderColor: brandColor }}
                      transition="all 0.2s"
                      onClick={() => document.getElementById("csv-schema-upload")?.click()}
                    >
                      <VStack spacing={2}>
                        <AddIcon w={5} h={5} color={brandColor} />
                        <Text fontSize="sm" fontWeight="medium" color={textColor}>
                          Click to upload an example CSV
                        </Text>
                        <Text fontSize="xs" color={descColor}>
                          Headers → field names · Sample rows → inferred types
                        </Text>
                      </VStack>
                    </Box>
                  )}

                  {!data.csv_file && (
                    <Button
                      onClick={openStorageBrowser}
                      variant="outline"
                      colorScheme="brand"
                      size="sm"
                      leftIcon={<Icon as={MdCloudUpload} />}
                      alignSelf="stretch"
                    >
                      Browse VesselAI Storage
                    </Button>
                  )}

                  {/* Hidden file input */}
                  <input
                    id="csv-schema-upload"
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      applyCsvFile(file);
                      e.target.value = "";
                    }}
                  />

                  <FormControl isRequired>
                    <Flex justify="space-between" align="center" mb={2}>
                      <FormLabel mb={0}>Input Schema</FormLabel>
                      <HStack spacing={2}>
                        {data.input_schema.length > 0 && (
                          <Button
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            leftIcon={<Icon as={MdDelete} boxSize={4} />}
                            onClick={() => {
                              markValidationStale();
                              update("input_schema", []);
                            }}
                          >
                            Clear All
                          </Button>
                        )}
                        <Button
                          leftIcon={<AddIcon />}
                          variant="outline"
                          size="xs"
                          onClick={() => addSchemaField("input_schema")}
                        >
                          Add Field
                        </Button>
                      </HStack>
                    </Flex>
                    <VStack spacing={2} align="stretch">
                      {data.input_schema.map((field, idx) => (
                        <SchemaFieldRow
                          key={idx}
                          field={field}
                          onChange={(f, v) => updateSchemaField("input_schema", idx, f, v)}
                          onRemove={() => removeSchemaField("input_schema", idx)}
                          showGroup
                        />
                      ))}
                      {data.input_schema.length === 0 && (
                        <Box textAlign="center" py={4} border="1px dashed" borderColor={dropzoneBorder} borderRadius="xl">
                          <Text fontSize="sm" color={descColor}>
                            No fields yet. Upload a CSV or click "Add Field" to define the input schema.
                          </Text>
                        </Box>
                      )}
                    </VStack>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Helper Text</FormLabel>
                    <Textarea
                      placeholder="Instructions shown to the user about the expected input..."
                      rows={2}
                      value={data.input_helper_text}
                      onChange={(e) => update("input_helper_text", e.target.value)}
                      {...fieldStyles}
                    />
                  </FormControl>
                </VStack>
              )}


              {/* Step 3: Validation */}
              {step === 3 && (
                <VStack spacing={6} align="stretch">
                  {validation.status === "running" && (
                    <Flex direction="column" align="center" gap={4} py={8}>
                      <Spinner size="xl" color={brandColor} thickness="3px" />
                      <VStack spacing={1}>
                        <Text fontSize="sm" fontWeight="medium" color={textColor}>
                          Validating model & running inference test…
                        </Text>
                        <Text fontSize="xs" color={descColor}>
                          Checking schema compatibility and running a sample prediction
                        </Text>
                      </VStack>
                    </Flex>
                  )}
                  {validation.status === "success" && (
                    <VStack spacing={4} align="stretch">
                      <Alert status="success" borderRadius="md" variant="left-accent">
                        <AlertIcon />
                        <Box>
                          <AlertTitle fontSize="sm">Validation Passed</AlertTitle>
                          <AlertDescription fontSize="xs">{validation.message}</AlertDescription>
                        </Box>
                      </Alert>
                      {validation.extractedOutput && validation.extractedOutput.length > 0 && (
                        <Box>
                          <Text fontSize="sm" fontWeight="medium" mb={2} color={descColor}>
                            Extracted Output Fields
                          </Text>
                          <VStack spacing={2} align="stretch">
                            {validation.extractedOutput.map((field, idx) => (
                              <Box
                                key={idx}
                                p={3}
                                borderRadius="xl"
                                border="1px solid"
                                borderColor={successBorder}
                                bg={successBg}
                              >
                                <Flex justify="space-between" align="center">
                                  <HStack spacing={3}>
                                    <Text fontSize="sm" fontWeight="medium" color={textColor}>
                                      {field.name}
                                    </Text>
                                    <Tag size="sm" colorScheme="green" variant="subtle">
                                      {field.type}
                                    </Tag>
                                  </HStack>
                                </Flex>
                              </Box>
                            ))}
                          </VStack>
                          <Text fontSize="xs" color={descColor} mt={2}>
                            These fields will pre-populate your output schema in the next step.
                          </Text>
                        </Box>
                      )}
                    </VStack>
                  )}
                  {validation.status === "error" && (
                    <VStack spacing={4} align="stretch">
                      <Alert status="error" borderRadius="md" variant="left-accent">
                        <AlertIcon />
                        <Box>
                          <AlertTitle fontSize="sm">Validation Failed</AlertTitle>
                          <AlertDescription fontSize="xs">{validation.message}</AlertDescription>
                        </Box>
                      </Alert>
                      <Flex justify="center">
                        <Button
                          size="sm"
                          colorScheme="brand"
                          variant="outline"
                          leftIcon={<RepeatIcon />}
                          onClick={runValidation}
                        >
                          Retry Validation
                        </Button>
                      </Flex>
                      <Text fontSize="xs" color={descColor} textAlign="center">
                        You can go back to fix your input schema or re-upload your CSV.
                      </Text>
                    </VStack>
                  )}
                </VStack>
              )}



              {/* Step 4: Output Config — name the outputs, choose how results are shown */}
              {step === 4 && (
                <VStack spacing={6} align="stretch">
                  <FormControl isRequired>
                    <Flex justify="space-between" align="center" mb={1}>
                      <FormLabel mb={0}>Output Schema</FormLabel>
                      <Button leftIcon={<AddIcon />} variant="outline" size="xs" onClick={() => addSchemaField("output_schema")}>
                        Add Field
                      </Button>
                    </Flex>
        
                    <VStack spacing={2} align="stretch">
                    <Text fontSize="xs" color={descColor}>
                      Give each field a clear name, and keep them in the order the model returns them.
                    </Text>
                      {data.output_schema.map((field, idx) => (
                        <SchemaFieldRow
                          key={idx}
                          field={field}
                          onChange={(f, v) => updateSchemaField("output_schema", idx, f, v)}
                          onRemove={() => removeSchemaField("output_schema", idx)}
                          showRequired={false}
                        />
                      ))}
                      {data.output_schema.length === 0 && (
                        <Box textAlign="center" py={4} border="1px dashed" borderColor={dropzoneBorder} borderRadius="xl">
                          <Text fontSize="sm" color={descColor}>
                            No fields yet. Click "Add Field" to define the output schema.
                          </Text>
                        </Box>
                      )}
                    </VStack>

                    {outputNamesDuplicated && !outputNamesMissing && (
                      <Text fontSize="xs" color="red.400" mt={2}>
                        Each output needs a different name.
                      </Text>
                    )}
                    {outputCountMismatch && (
                      <Alert status="warning" borderRadius="md" variant="left-accent" fontSize="xs" mt={3}>
                        <AlertIcon />
                        The model returned {sampleColumnCount} value{sampleColumnCount === 1 ? "" : "s"} per row in the
                        validation test, but {data.output_schema.length} output field
                        {data.output_schema.length === 1 ? " is" : "s are"} defined. They should match.
                      </Alert>
                    )}
                  </FormControl>

                  <Divider />

                  <FormControl>
                    <FormLabel>Inference Hint</FormLabel>
                    <Textarea
                      placeholder="Optional hint shown during inference, e.g. processing time expectations..."
                      rows={2}
                      value={data.inference_hint}
                      onChange={(e) => update("inference_hint", e.target.value)}
                      {...fieldStyles}
                    />
                  </FormControl>
                </VStack>
              )}

              {step === 5 && (
                <VStack spacing={4} align="stretch">
                  {/* Model preview card */}
                  <Card variant="outline" borderRadius="xl" overflow="hidden" bg={cardBg} borderColor={borderColor}>
                    <Box bg={reviewHeaderBg} px={5} pt={4} pb={3}>
                      <Flex justify="space-between" align="start" gap={4}>
                        <Box>
                          <HStack spacing={3}>
                            <Heading size="md" color={reviewHeaderText}>{data.name}</Heading>
                            <Tooltip label="Validated" hasArrow placement="top">
                              <span>
                                <Icon as={MdCheckCircle} boxSize={5} color="green.400" display="block" />
                              </span>
                            </Tooltip>
                          </HStack>
                          <Text fontSize="xs" color={reviewHeaderSub} mt={0.5}>v{data.version}</Text>
                        </Box>
                        <HStack spacing={2} flexWrap="wrap" justify="flex-end">
                          {data.categories.map((c) => (
                            <Tag key={c} size="sm" colorScheme="purple" variant="subtle" borderRadius="full">
                              <TagLabel fontSize="xs">{categoryLabel(c)}</TagLabel>
                            </Tag>
                          ))}
                          <Tag size="sm" variant="outline" colorScheme="gray" borderRadius="full">
                            <Icon as={access.icon} boxSize={3} mr={1} />
                            <TagLabel fontSize="xs">{access.label}</TagLabel>
                          </Tag>
                        </HStack>
                      </Flex>
                    </Box>

                    <CardBody px={5} pt={3} pb={4}>
                      <VStack spacing={3} align="stretch">
                        <Flex justify="space-between" align="center" gap={4}>
                          <Box>
                            <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                              Visible to my organization only
                            </Text>
                            {!userOrg && (
                              <Text fontSize="xs" color={descColor}>
                                {accessOptions === null
                                  ? "Checking your organization…"
                                  : "No organization found for your account, so the model will be public."}
                              </Text>
                            )}
                          </Box>
                          <Switch
                            colorScheme="brand"
                            isChecked={data.restrict_to_org && !!userOrg}
                            isDisabled={!userOrg}
                            onChange={(e) => update("restrict_to_org", e.target.checked)}
                          />
                        </Flex>
                        <Divider />
                        {/* Implementation row */}
                        <Flex justify="space-between" align="center" fontSize="sm">
                          <Text color={descColor}>Implementation</Text>
                          <HStack spacing={2}>
                            <Text fontWeight="medium" color={textColor}>{data.implementation_name}</Text>
                            {/* <Tag size="sm" variant="outline" colorScheme="gray" borderRadius="full">
                              <TagLabel fontSize="xs">{data.implementation_id}</TagLabel>
                            </Tag> */}
                          </HStack>
                        </Flex>

                        {/* <Flex justify="space-between" align="center" fontSize="sm">
                          <Text color={descColor}>Input type</Text>
                          <Text fontWeight="medium" textTransform="capitalize" color={textColor}>{data.input_type}</Text>
                        </Flex> */}

                        {/* Collapsible schemas */}
                        <Accordion allowMultiple>
                          <AccordionItem border="none">
                            <AccordionButton px={0} py={2} _hover={{ bg: "transparent" }}>
                              <Flex flex="1" align="center" gap={2}>
                                <Text fontSize="sm" fontWeight="semibold" color={textColor}>Input Schema</Text>
                                <Badge colorScheme="blue" variant="subtle" fontSize="10px" borderRadius="full">
                                  {data.input_schema.length} fields
                                </Badge>
                              </Flex>
                              <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel px={0} pb={2}>
                              <TableContainer maxH="200px" overflowY="auto">
                                <Table size="sm" variant="simple" layout="fixed">
                                  <Thead>
                                    <Tr>
                                      <Th fontSize="xs" px={2} py={1} w="35%">Name</Th>
                                      <Th fontSize="xs" px={2} py={1} w="35%">Type</Th>
                                      <Th fontSize="xs" px={2} py={1} w="25%">Required</Th>
                                    </Tr>
                                  </Thead>
                                  <Tbody>
                                    {data.input_schema.map((f, i) => (
                                      <Tr key={`${f.name}-${i}`}>
                                        <Td px={2} py={1} fontSize="xs" fontFamily="mono" color={textColor}>{f.name}</Td>
                                        <Td px={2} py={1} fontSize="xs" color={descColor}>{f.type}</Td>
                                        <Td px={2} py={1} fontSize="xs" color={textColor}>{f.required ? "✓" : "—"}</Td>
                                      </Tr>
                                    ))}
                                  </Tbody>
                                </Table>
                              </TableContainer>
                            </AccordionPanel>
                          </AccordionItem>

                          <AccordionItem border="none">
                            <AccordionButton px={0} py={2} _hover={{ bg: "transparent" }}>
                              <Flex flex="1" align="center" gap={2}>
                                <Text fontSize="sm" fontWeight="semibold" color={textColor}>Output Schema</Text>
                                <Badge colorScheme="green" variant="subtle" fontSize="10px" borderRadius="full">
                                  {data.output_schema.length} fields
                                </Badge>
                              </Flex>
                              <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel px={0} pb={2}>
                              <TableContainer maxH="200px" overflowY="auto">
                                <Table size="sm" variant="simple">
                                  <Thead>
                                    <Tr>
                                      <Th fontSize="xs" px={2} py={1}>Name</Th>
                                      <Th fontSize="xs" px={2} py={1}>Type</Th>
                                    </Tr>
                                  </Thead>
                                  <Tbody>
                                    {data.output_schema.map((f, i) => (
                                      <Tr key={`${f.name}-${i}`}>
                                        <Td px={2} py={1} fontSize="xs" fontFamily="mono" color={textColor}>{f.name}</Td>
                                        <Td px={2} py={1} fontSize="xs" color={descColor}>{f.type}</Td>
                                      </Tr>
                                    ))}
                                  </Tbody>
                                </Table>
                              </TableContainer>
                            </AccordionPanel>
                          </AccordionItem>
                        </Accordion>

                        {data.inference_hint && (
                          <>
                            <Divider />
                            <Box>
                              <Text fontSize="xs" color={descColor} fontWeight="semibold" textTransform="uppercase" mb={1}>
                                Inference Hint
                              </Text>
                              <Text fontSize="sm" color={textColor}>{data.inference_hint}</Text>
                            </Box>
                          </>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                </VStack>
              )}
          </ModalBody>

          <Divider />

          <ModalFooter justifyContent="space-between">
            <Button
              variant="ghost"
              leftIcon={<ChevronLeftIcon />}
              onClick={() => setStep((s) => s - 1)}
              isDisabled={step === 0}
              size="sm"
            >
              Back
            </Button>

            <Text fontSize="xs" color={descColor}>
              Step {step + 1} of {STEPS.length}
            </Text>

            {step < STEPS.length - 1 ? (
              <Button
                bg="brand.500"
                color="white"
                _hover={{ bg: "brand.600" }}
                _focus={{ bg: "brand.500", boxShadow: "none" }}
                _active={{ bg: "brand.700" }}
                rightIcon={<ChevronRightIcon />}
                onClick={handleNext}
                isDisabled={!canProceed() || isAdvancing}
                isLoading={isAdvancing}
                loadingText="Checking..."
                size="sm"
              >
                Next
              </Button>
            ) : (
              <Button
                bg="brand.500"
                color="white"
                _hover={{ bg: "brand.600" }}
                _focus={{ bg: "brand.500", boxShadow: "none" }}
                _active={{ bg: "brand.700" }}
                leftIcon={<CheckIcon />}
                onClick={handleSubmit}
                isLoading={isSubmitting}
                loadingText="Registering..."
                size="sm"
              >
                Register Model
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
      <AlertDialog
        isOpen={isCloseConfirmOpen}
        onClose={closeCloseConfirm}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="xl">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Discard Model Setup?
            </AlertDialogHeader>

            <AlertDialogBody>
              {requiresDiscardCleanup()
                ? "Your progress will be lost and temporary validation resources will be removed."
                : "Your progress will be lost. Are you sure you want to close?"}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                bg="brand.500"
                color="white"
                _hover={{ bg: "brand.600" }}
                _focus={{ bg: "brand.500", boxShadow: "none" }}
                _active={{ bg: "brand.700" }}
                onClick={closeCloseConfirm}
              >
                Continue Editing
              </Button>

              <Button
                bg="brand.500"
                color="white"
                _hover={{ bg: "brand.600" }}
                _focus={{ bg: "brand.500", boxShadow: "none" }}
                _active={{ bg: "brand.700" }}
                ml={3}
                onClick={confirmClose}
              >
                Discard
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Storage Browser Modal — pick an example CSV from MinIO.
          Sibling to the wizard Modal so Chakra's focus trap works for both. */}
      <Modal isOpen={isStorageOpen} onClose={onStorageClose} size="xl" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent bg={cardBg} borderRadius="xl">
          <ModalHeader color={textColor} pb={2}>
            <HStack spacing={2}>
              <Icon as={MdCloudUpload} boxSize={5} color={brandColor} />
              <Text>Browse VesselAI Storage</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color={descColor} />
          <ModalBody pb={6}>
            {/* Breadcrumbs */}
            {storageBucket && (
              <HStack mb={4} spacing={2}>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={navigateStorageUp}
                  leftIcon={<Icon as={MdArrowBack} />}
                  color={descColor}
                >
                  Back
                </Button>
                <Breadcrumb separator={<Icon as={MdChevronRight} color={descColor} boxSize={4} />} fontSize="sm">
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      onClick={() => { setStorageBucket(''); setStorageObjects([]); setStoragePrefix(''); }}
                      color={brandColor}
                      fontWeight="600"
                    >
                      Buckets
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      onClick={() => navigateToBucket(storageBucket)}
                      color={storagePrefix ? brandColor : textColor}
                      fontWeight={storagePrefix ? '500' : '600'}
                    >
                      {storageBucket}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {storageBreadcrumbs.map((crumb, idx) => (
                    <BreadcrumbItem key={crumb.prefix} isCurrentPage={idx === storageBreadcrumbs.length - 1}>
                      <BreadcrumbLink
                        onClick={() => navigateToPrefix(crumb.prefix)}
                        color={idx === storageBreadcrumbs.length - 1 ? textColor : brandColor}
                        fontWeight={idx === storageBreadcrumbs.length - 1 ? '600' : '500'}
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  ))}
                </Breadcrumb>
              </HStack>
            )}

            {/* Error */}
            {storageError && (
              <Alert status="error" borderRadius="lg" mb={4}>
                <AlertIcon />
                <Text fontSize="sm">{storageError}</Text>
              </Alert>
            )}

            {/* Loading / bucket list / object list */}
            {storageLoading ? (
              <Flex justify="center" align="center" py={12}>
                <VStack spacing={3}>
                  <Spinner size="lg" color={brandColor} thickness="3px" />
                  <Text fontSize="sm" color={descColor}>Loading…</Text>
                </VStack>
              </Flex>
            ) : !storageBucket ? (
              <VStack spacing={2} align="stretch">
                {storageBuckets.length === 0 && !storageError ? (
                  <Text fontSize="sm" color={descColor} textAlign="center" py={8}>
                    No accessible buckets found.
                  </Text>
                ) : (
                  storageBuckets.map((b) => (
                    <Flex
                      key={b.name}
                      align="center"
                      justify="space-between"
                      p={3}
                      bg={subtleBg}
                      borderRadius="lg"
                      cursor="pointer"
                      transition="all 0.15s"
                      _hover={{ borderColor: brandColor, boxShadow: 'sm' }}
                      onClick={() => navigateToBucket(b.name)}
                    >
                      <HStack spacing={3}>
                        <Icon as={MdStorage} boxSize={5} color={brandColor} />
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight="600" color={textColor}>{b.name}</Text>
                          {b.visibility && (
                            <Text fontSize="xs" color={descColor}>{b.visibility}</Text>
                          )}
                        </VStack>
                      </HStack>
                      <Icon as={MdChevronRight} boxSize={5} color={descColor} />
                    </Flex>
                  ))
                )}
              </VStack>
            ) : (
              <VStack spacing={2} align="stretch">
                {storageObjects.length === 0 && !storageError ? (
                  <Text fontSize="sm" color={descColor} textAlign="center" py={8}>
                    This location is empty.
                  </Text>
                ) : (
                  storageObjects.map((obj) => {
                    const isDir = obj.isDir || obj.name.endsWith('/');
                    const isCSV = !isDir && obj.name.toLowerCase().endsWith('.csv');
                    const displayName = obj.name.replace(storagePrefix, '').replace(/\/$/, '');

                    return (
                      <Flex
                        key={obj.name}
                        align="center"
                        justify="space-between"
                        p={3}
                        bg={subtleBg}
                        borderRadius="lg"
                        cursor={isDir || isCSV ? 'pointer' : 'default'}
                        opacity={!isDir && !isCSV ? 0.5 : 1}
                        transition="all 0.15s"
                        _hover={isDir || isCSV ? { boxShadow: 'sm' } : {}}
                        onClick={() => {
                          if (isDir) navigateToPrefix(obj.name);
                          else if (isCSV) selectStorageFile(obj.name);
                        }}
                      >
                        <HStack spacing={3}>
                          <Icon
                            as={isDir ? MdFolder : MdInsertDriveFile}
                            boxSize={5}
                            color={isDir || isCSV ? brandColor : descColor}
                          />
                          <VStack align="start" spacing={0}>
                            <Text fontSize="sm" fontWeight="500" color={textColor}>
                              {displayName}
                            </Text>
                            {!isDir && obj.size != null && (
                              <Text fontSize="xs" color={descColor}>
                                {obj.size < 1024
                                  ? `${obj.size} B`
                                  : obj.size < 1024 * 1024
                                    ? `${(obj.size / 1024).toFixed(1)} KB`
                                    : `${(obj.size / (1024 * 1024)).toFixed(1)} MB`}
                              </Text>
                            )}
                          </VStack>
                        </HStack>
                        {isDir && <Icon as={MdChevronRight} boxSize={5} color={descColor} />}
                        {isCSV && (
                          <Text fontSize="xs" fontWeight="600" color={brandColor}>
                            Select
                          </Text>
                        )}
                      </Flex>
                    );
                  })
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor={borderColor} pt={3}>
            <Text fontSize="xs" color={descColor} flex={1}>
              Only CSV files can be selected · Showing buckets you have access to
            </Text>
            <Button size="sm" variant="ghost" onClick={onStorageClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// ── Sub-components ──

function SchemaFieldRow({
  field,
  onChange,
  onRemove,
  showGroup,
  showRequired = true,
}: {
  field: SchemaField;
  onChange: (field: keyof SchemaField, value: string | boolean) => void;
  onRemove: () => void;
  showGroup?: boolean;
  showRequired?: boolean;   // output fields have no "required" concept
}) {
  const rowBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const rowBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const fieldBg = useColorModeValue("white", "whiteAlpha.50");
  const fieldBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const descColor = useColorModeValue("gray.600", "gray.400");
  const focusGlow = "brand.500";
  const fieldStyles = {
    bg: fieldBg,
    color: textColor,
    borderColor: fieldBorder,
    borderRadius: "xl" as const,
    _placeholder: { color: descColor },
    _hover: { borderColor: focusGlow },
    _focus: { borderColor: focusGlow, boxShadow: `0 0 0 1px var(--chakra-colors-brand-500)` },
    _focusVisible: { borderColor: focusGlow, boxShadow: `0 0 0 1px var(--chakra-colors-brand-500)` },
  };
  const selectOptionStyles = useColorModeValue(
    {},
    { option: { color: "white", bg: "#1B254B" } }
  );
  return (
    <Box p={3} borderRadius="xl" border="1px solid" borderColor={rowBorder} bg={rowBg}>
      <Flex align="center" gap={2} mb={2}>
        <SimpleGrid columns={3} spacing={2} flex={1}>
          <Input size="sm" placeholder="Field name" value={field.name} onChange={(e) => onChange("name", e.target.value)} {...fieldStyles} />
          <Select size="sm" value={field.type} onChange={(e) => onChange("type", e.target.value)} {...fieldStyles} sx={selectOptionStyles}>
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="datetime">datetime</option>
          <option value="boolean">boolean</option>
          <option value="object">object</option>
          <option value="array">array</option>
          {/* <option value="image">image</option>
          <option value="geojson">geojson</option>           */}
          </Select>
          <Input size="sm" placeholder="Description" value={field.description} onChange={(e) => onChange("description", e.target.value)} {...fieldStyles} />
        </SimpleGrid>
        <IconButton
          aria-label="Remove field"
          icon={<Icon as={MdDelete} boxSize={4} />}
          size="xs"
          colorScheme="red"
          variant="ghost"
          flexShrink={0}
          onClick={onRemove}
        />
      </Flex>
      <Flex align="center" gap={4}>
        {showRequired && (
          <Checkbox size="sm" isChecked={field.required} onChange={(e) => onChange("required", e.target.checked)}>
            <Text fontSize="xs">Required</Text>
          </Checkbox>
        )}
        {showGroup && (
          <Input size="xs" placeholder="Group" value={field.group || ""} onChange={(e) => onChange("group", e.target.value)} maxW="160px" {...fieldStyles} />
        )}
        <Box flex={1} />
      </Flex>
    </Box>
  );
}