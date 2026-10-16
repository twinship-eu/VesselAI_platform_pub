'use client';

import { useState, useCallback, useRef } from 'react';
import {
    Alert,
    AlertIcon,
    Box,
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    Button,
    Flex,
    HStack,
    Icon,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Spinner,
    Text,
    useColorModeValue,
    useDisclosure,
    VStack,
} from '@chakra-ui/react';
import {
    MdArrowBack,
    MdChevronRight,
    MdCloudUpload,
    MdFolder,
    MdInsertDriveFile,
    MdStorage,
} from 'react-icons/md';
import { minioClient, type Bucket, type BucketObject } from 'lib/minioClient';

interface CsvUploaderProps {
    helperText: string;
    exampleCsvUrl?: string;
    onFileSelect: (file: File, data: string[][]) => void;
    onClear: () => void;
    selectedFile: File | null;
    onDownloadExample?: () => Promise<void>;
}

export function CsvUploader({
    helperText,
    exampleCsvUrl,
    onFileSelect,
    onClear,
    selectedFile,
    onDownloadExample,
}: CsvUploaderProps) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Storage browser state — picks an example CSV from MinIO. The backend
    // already scopes bucket/object listings by user roles, so the modal only
    // surfaces what the current user can read.
    const { isOpen: isStorageOpen, onOpen: onStorageOpen, onClose: onStorageClose } = useDisclosure();
    const [storageBuckets, setStorageBuckets] = useState<Bucket[]>([]);
    const [storageObjects, setStorageObjects] = useState<BucketObject[]>([]);
    const [storageBucket, setStorageBucket] = useState<string>('');
    const [storagePrefix, setStoragePrefix] = useState<string>('');
    const [storageLoading, setStorageLoading] = useState(false);
    const [storageError, setStorageError] = useState<string>('');

    // Theme tokens for the modal (light/dark)
    const modalBg = useColorModeValue('white', 'navy.700');
    const modalText = useColorModeValue('secondaryGray.900', 'white');
    const modalDesc = useColorModeValue('gray.600', 'gray.400');
    const modalSubtle = useColorModeValue('gray.50', 'whiteAlpha.50');
    const modalBorder = useColorModeValue('gray.200', 'whiteAlpha.200');
    const dropzoneBorderColor = useColorModeValue('gray.300', 'whiteAlpha.300');

    const parseCsv = (text: string): string[][] => {
        const lines = text.trim().split('\n');
        return lines.map((line) => {
            const values: string[] = [];
            let current = '';
            let inQuotes = false;

            for (const char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());
            return values;
        });
    };

    const handleFile = useCallback(
        async (file: File) => {
            setError(null);

            if (!file.name.endsWith('.csv')) {
                setError('Please upload a CSV file');
                return;
            }

            try {
                const text = await file.text();
                const data = parseCsv(text);

                if (data.length < 2) {
                    setError('CSV must have a header row and at least one data row');
                    return;
                }

                onFileSelect(file, data);
            } catch {
                setError('Failed to parse CSV file');
            }
        },
        [onFileSelect]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragActive(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    // --- Storage browser helpers ---
    const openStorageBrowser = useCallback(async () => {
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
            console.error('[CsvUploader] listBuckets failed:', err);
        } finally {
            setStorageLoading(false);
        }
    }, [onStorageOpen]);

    const navigateToBucket = useCallback(async (bucketName: string) => {
        setStorageLoading(true);
        setStorageError('');
        setStorageBucket(bucketName);
        setStoragePrefix('');
        try {
            const objects = await minioClient.listObjects(bucketName, '', false);
            setStorageObjects(objects);
        } catch {
            setStorageError('Failed to list objects.');
        } finally {
            setStorageLoading(false);
        }
    }, []);

    const navigateToPrefix = useCallback(async (prefix: string) => {
        setStorageLoading(true);
        setStorageError('');
        setStoragePrefix(prefix);
        try {
            const objects = await minioClient.listObjects(storageBucket, prefix, false);
            setStorageObjects(objects);
        } catch {
            setStorageError('Failed to list objects.');
        } finally {
            setStorageLoading(false);
        }
    }, [storageBucket]);

    const navigateStorageUp = useCallback(() => {
        if (!storagePrefix) {
            setStorageBucket('');
            setStorageObjects([]);
            return;
        }
        const trimmed = storagePrefix.replace(/\/$/, '');
        const parentIdx = trimmed.lastIndexOf('/');
        const parent = parentIdx > 0 ? trimmed.substring(0, parentIdx + 1) : '';
        navigateToPrefix(parent);
    }, [storagePrefix, navigateToPrefix]);

    const selectStorageFile = useCallback(async (objectName: string) => {
        setStorageLoading(true);
        setStorageError('');
        try {
            const url = minioClient.getObjectURL(storageBucket, objectName);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
            const blob = await response.blob();
            const baseName = objectName.split('/').pop() || 'storage-file.csv';
            const file = new File([blob], baseName, { type: 'text/csv' });
            await handleFile(file);
            onStorageClose();
        } catch {
            setStorageError('Failed to load file from storage.');
        } finally {
            setStorageLoading(false);
        }
    }, [storageBucket, handleFile, onStorageClose]);

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

    /* ================= FILE SELECTED STATE ================= */

    if (selectedFile) {
        return (
            <Box
                borderWidth="1px"
                borderRadius="md"
                p="16px"
                bg={useColorModeValue('gray.50', 'whiteAlpha.100')}
            >
                <HStack justify="space-between">
                    <VStack align="start" spacing="2px">
                        <Text fontWeight="medium">{selectedFile.name}</Text>
                        <Text fontSize="xs" color="gray.500">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                        </Text>
                    </VStack>

                    <Button size="sm" variant="ghost" onClick={onClear}>
                        Clear
                    </Button>
                </HStack>
            </Box>
        );
    }

    /* ================= UPLOAD UI ================= */

    return (
        <VStack spacing="16px" align="stretch">
            <Box
                borderWidth="2px"
                borderStyle="dashed"
                borderColor={isDragActive ? 'brand.500' : dropzoneBorderColor}
                borderRadius="md"
                p={{ base: '24px', md: '40px' }}
                textAlign="center"
                bg={isDragActive ? useColorModeValue('brand.50', 'whiteAlpha.200') : useColorModeValue('gray.50', 'whiteAlpha.100')}
                _hover={{ borderColor: 'brand.500' }}
                transition="border-color 0.15s"
                onDrop={handleDrop}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragActive(true);
                }}
                onDragLeave={() => setIsDragActive(false)}
                position="relative"
                cursor="pointer"
                onClick={() => inputRef.current?.click()}
            >
                <Input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleInputChange}
                    display="none"
                />

                <Text fontWeight="medium">
                    Drop your CSV here or{' '}
                    <Text as="span" color={useColorModeValue('brand.500', 'cyan.300')}>
                        browse
                    </Text>
                </Text>
                <Text fontSize="sm" color="gray.500" mt="4px">
                    {helperText}
                </Text>
            </Box>

            {error && (
                <Alert status="error">
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            {/* Two equal-width buttons. flex=1 makes them stretch to match;
                size="sm" keeps height identical. */}
            <HStack spacing="12px" align="stretch">
                {onDownloadExample ? (
                    <Button
                        size="sm"
                        variant="outline"
                        flex={1}
                        onClick={async () => {
                            setError(null);
                            try {
                                await onDownloadExample();
                            } catch {
                                setError('Could not download the example CSV.');
                            }
                        }}
                    >
                        Download example CSV
                    </Button>
                ) : exampleCsvUrl ? (
                    <Button size="sm" variant="outline" as="a" href={exampleCsvUrl} download flex={1}>
                        Download example CSV
                    </Button>
                ) : null}

                {/* Browse Storage — brand.500 in both color modes. */}
                <Button
                    size="sm"
                    onClick={openStorageBrowser}
                    leftIcon={<Icon as={MdCloudUpload} />}
                    bg="brand.500"
                    color="white"
                    _hover={{ bg: 'brand.600' }}
                    _active={{ bg: 'brand.700' }}
                    flex={1}
                >
                    Browse VesselAI Storage
                </Button>
            </HStack>

            {/* Storage Browser Modal */}
            <Modal
                isOpen={isStorageOpen}
                onClose={onStorageClose}
                size="xl"
                scrollBehavior="inside"
                // Safe-by-default for stacking: lets the wheel reach the body
                // even if a parent ever wraps this in another modal.
                blockScrollOnMount={false}
                trapFocus={false}
            >
                <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
                <ModalContent bg={modalBg} borderRadius="xl" maxH="85vh" my="auto">
                    <ModalHeader color={modalText} pb={2}>
                        <HStack spacing={2}>
                            <Icon as={MdCloudUpload} boxSize={5} color="brand.500" />
                            <Text>Browse VesselAI Storage</Text>
                        </HStack>
                    </ModalHeader>
                    <ModalCloseButton color={modalDesc} />
                    <ModalBody pb={6} overflowY="auto">
                        {storageBucket && (
                            <HStack mb={4} spacing={2}>
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    onClick={navigateStorageUp}
                                    leftIcon={<Icon as={MdArrowBack} />}
                                    color={modalDesc}
                                >
                                    Back
                                </Button>
                                <Breadcrumb separator={<Icon as={MdChevronRight} color={modalDesc} boxSize={4} />} fontSize="sm">
                                    <BreadcrumbItem>
                                        <BreadcrumbLink
                                            onClick={() => { setStorageBucket(''); setStorageObjects([]); setStoragePrefix(''); }}
                                            color="brand.500"
                                            fontWeight="600"
                                        >
                                            Buckets
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink
                                            onClick={() => navigateToBucket(storageBucket)}
                                            color={storagePrefix ? 'brand.500' : modalText}
                                            fontWeight={storagePrefix ? '500' : '600'}
                                        >
                                            {storageBucket}
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    {storageBreadcrumbs.map((crumb, idx) => (
                                        <BreadcrumbItem key={crumb.prefix} isCurrentPage={idx === storageBreadcrumbs.length - 1}>
                                            <BreadcrumbLink
                                                onClick={() => navigateToPrefix(crumb.prefix)}
                                                color={idx === storageBreadcrumbs.length - 1 ? modalText : 'brand.500'}
                                                fontWeight={idx === storageBreadcrumbs.length - 1 ? '600' : '500'}
                                            >
                                                {crumb.label}
                                            </BreadcrumbLink>
                                        </BreadcrumbItem>
                                    ))}
                                </Breadcrumb>
                            </HStack>
                        )}

                        {storageError && (
                            <Alert status="error" borderRadius="lg" mb={4}>
                                <AlertIcon />
                                <Text fontSize="sm">{storageError}</Text>
                            </Alert>
                        )}

                        {storageLoading ? (
                            <Flex justify="center" align="center" py={12}>
                                <VStack spacing={3}>
                                    <Spinner size="lg" color="brand.500" thickness="3px" />
                                    <Text fontSize="sm" color={modalDesc}>Loading…</Text>
                                </VStack>
                            </Flex>
                        ) : !storageBucket ? (
                            <VStack spacing={2} align="stretch">
                                {storageBuckets.length === 0 && !storageError ? (
                                    <Text fontSize="sm" color={modalDesc} textAlign="center" py={8}>
                                        No accessible buckets found.
                                    </Text>
                                ) : (
                                    storageBuckets.map((b) => (
                                        <Flex
                                            key={b.name}
                                            align="center"
                                            justify="space-between"
                                            p={3}
                                            bg={modalSubtle}
                                            borderRadius="lg"
                                            cursor="pointer"
                                            transition="all 0.15s"
                                            _hover={{ borderColor: 'brand.500', boxShadow: 'sm' }}
                                            onClick={() => navigateToBucket(b.name)}
                                        >
                                            <HStack spacing={3}>
                                                <Icon as={MdStorage} boxSize={5} color="brand.500" />
                                                <VStack align="start" spacing={0}>
                                                    <Text fontSize="sm" fontWeight="600" color={modalText}>{b.name}</Text>
                                                    {b.visibility && (
                                                        <Text fontSize="xs" color={modalDesc}>{b.visibility}</Text>
                                                    )}
                                                </VStack>
                                            </HStack>
                                            <Icon as={MdChevronRight} boxSize={5} color={modalDesc} />
                                        </Flex>
                                    ))
                                )}
                            </VStack>
                        ) : (
                            <VStack spacing={2} align="stretch">
                                {storageObjects.length === 0 && !storageError ? (
                                    <Text fontSize="sm" color={modalDesc} textAlign="center" py={8}>
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
                                                bg={modalSubtle}
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
                                                        color={isDir || isCSV ? 'brand.500' : modalDesc}
                                                    />
                                                    <VStack align="start" spacing={0}>
                                                        <Text fontSize="sm" fontWeight="500" color={modalText}>
                                                            {displayName}
                                                        </Text>
                                                        {!isDir && obj.size != null && (
                                                            <Text fontSize="xs" color={modalDesc}>
                                                                {obj.size < 1024
                                                                    ? `${obj.size} B`
                                                                    : obj.size < 1024 * 1024
                                                                        ? `${(obj.size / 1024).toFixed(1)} KB`
                                                                        : `${(obj.size / (1024 * 1024)).toFixed(1)} MB`}
                                                            </Text>
                                                        )}
                                                    </VStack>
                                                </HStack>
                                                {isDir && <Icon as={MdChevronRight} boxSize={5} color={modalDesc} />}
                                                {isCSV && (
                                                    <Text fontSize="xs" fontWeight="600" color="brand.500">
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
                    <ModalFooter borderTop="1px solid" borderColor={modalBorder} pt={3}>
                        <Text fontSize="xs" color={modalDesc} flex={1}>
                            Only CSV files can be selected · Showing buckets you have access to
                        </Text>
                        <Button size="sm" variant="ghost" onClick={onStorageClose}>Cancel</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </VStack>
    );
}
