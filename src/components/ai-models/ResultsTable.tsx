'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
    Box,
    Button,
    Text,
    HStack,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    useColorModeValue,
} from '@chakra-ui/react';
import type { OutputField } from '@/lib/aiModels/types';

type Cell = string | number | null | undefined;
type RawCell = Cell | Cell[];

interface ResultsTableProps {
    headers: string[];
    rows: RawCell[][];
    outputSchema: OutputField[];
    onDownload: () => void;
}

const ROWS_PER_PAGE = 10;

const formatCell = (v: Cell) =>
    typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 6 }) : v ?? '';


function normaliseResults(headers: string[], rows: RawCell[][], outputSchema: OutputField[]) {
    const outputNames = outputSchema.map((f) => f.name);

    // width of each column: 1 for plain values, N for an array of N values
    const widths = headers.map((_, col) =>
        rows.reduce((max, row) => (Array.isArray(row[col]) ? Math.max(max, (row[col] as Cell[]).length) : max), 0)
    );
    const packedColumns = widths.filter((w) => w > 0).length;

    const flatHeaders: string[] = [];
    const predicted = new Set<number>();

    headers.forEach((header, col) => {
        const width = widths[col];
        if (width === 0) {
            if (outputNames.includes(header)) predicted.add(flatHeaders.length);
            flatHeaders.push(header);
            return;
        }
        const useSchemaNames = packedColumns === 1 && outputNames.length === width;
        for (let i = 0; i < width; i++) {
            predicted.add(flatHeaders.length);
            flatHeaders.push(useSchemaNames ? outputNames[i] : width === 1 ? header : `${header}_${i + 1}`);
        }
    });

    const flatRows: Cell[][] = rows.map((row) =>
        headers.flatMap((_, col) => {
            const width = widths[col];
            if (width === 0) return [row[col] as Cell];
            const values = Array.isArray(row[col]) ? (row[col] as Cell[]) : [row[col] as Cell];
            return Array.from({ length: width }, (_, i) => values[i]);
        })
    );

    if (predicted.size === 0 && flatHeaders.length > 0) predicted.add(flatHeaders.length - 1);

    return { headers: flatHeaders, rows: flatRows, predicted };
}

export function ResultsTable({
    headers: rawHeaders,
    rows: rawRows,
    outputSchema,
    onDownload,
}: ResultsTableProps) {
    const [visibleRows, setVisibleRows] = useState(ROWS_PER_PAGE);
    const inputScrollRef = useRef<HTMLDivElement>(null);
    const predScrollRef = useRef<HTMLDivElement>(null);

    // One column per predicted value; every prediction column is highlighted.
    const { headers, rows, predicted } = useMemo(
        () => normaliseResults(rawHeaders, rawRows, outputSchema),
        [rawHeaders, rawRows, outputSchema]
    );

    const outputColumnIndices = headers.map((_, i) => i).filter((i) => predicted.has(i));
    const inputColumnIndices = headers.map((_, i) => i).filter((i) => !predicted.has(i));

    const displayedRows = rows.slice(0, visibleRows);
    const hasMoreRows = visibleRows < rows.length;

    const handleShowMore = () => {
        setVisibleRows((prev) => Math.min(prev + ROWS_PER_PAGE, rows.length));
    };

    const handleShowLess = () => {
        setVisibleRows(ROWS_PER_PAGE);
    };

    // Synchronise vertical scroll between the two panels
    useEffect(() => {
        const inputEl = inputScrollRef.current;
        const predEl = predScrollRef.current;
        if (!inputEl || !predEl) return;

        let syncing = false;
        const syncScroll = (source: HTMLDivElement, target: HTMLDivElement) => () => {
            if (syncing) return;
            syncing = true;
            target.scrollTop = source.scrollTop;
            syncing = false;
        };

        const handleInput = syncScroll(inputEl, predEl);
        const handlePred = syncScroll(predEl, inputEl);

        inputEl.addEventListener('scroll', handleInput);
        predEl.addEventListener('scroll', handlePred);
        return () => {
            inputEl.removeEventListener('scroll', handleInput);
            predEl.removeEventListener('scroll', handlePred);
        };
    }, []);

    // ── Dark / light tokens ─────────────────────────────
    const inputHeaderBg = useColorModeValue('purple.50', 'purple.900');
    const inputHeaderColor = useColorModeValue('purple.700', 'purple.200');
    const stripeBg = useColorModeValue('purple.50', 'whiteAlpha.50');
    const rowCountColor = useColorModeValue('gray.800', 'gray.200');

    // Prediction column colours (branded, stands out)
    const predHeaderBg = useColorModeValue('brand.100', 'brand.800');
    const predCellBg = useColorModeValue('brand.50', 'rgba(67, 24, 255, 0.08)');
    const predBorder = useColorModeValue('brand.200', 'brand.600');
    const predTextColor = useColorModeValue('brand.600', 'brand.200');

    return (
        <Box>
            {/* Header row */}
            <HStack justify="space-between" mb="12px">
                <Text fontSize="sm" color="gray.500">
                    Total rows processed:{' '}
                    <Text as="span" fontWeight="medium" color={rowCountColor}>
                        {rows.length}
                    </Text>
                    {visibleRows < rows.length && (
                        <Text as="span" ml="8px">
                            (showing {visibleRows})
                        </Text>
                    )}
                </Text>

                <Button size="sm" variant="outline" onClick={onDownload}>
                    Download CSV
                </Button>
            </HStack>

            {/* Split layout: scrollable inputs | fixed prediction */}
            <Box borderWidth="1px" borderRadius="md" overflow="hidden">
                <HStack align="stretch" spacing="0">
                    {/* LEFT: scrollable input columns */}
                    <Box flex="1" minW="0">
                        <Box
                            ref={inputScrollRef}
                            overflowX="auto"
                            overflowY="auto"
                            maxH="400px"
                        >
                            <Table size="sm">
                                <Thead position="sticky" top="0" zIndex={1}>
                                    <Tr>
                                        {inputColumnIndices.map((idx) => (
                                            <Th
                                                key={idx}
                                                whiteSpace="nowrap"
                                                textAlign="center"
                                                color={inputHeaderColor}
                                                bg={inputHeaderBg}
                                            >
                                                {headers[idx]}
                                            </Th>
                                        ))}
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {displayedRows.map((row, rowIndex) => (
                                        <Tr key={rowIndex} h="37px" bg={rowIndex % 2 === 1 ? stripeBg : undefined}>
                                            {inputColumnIndices.map((idx) => (
                                                <Td key={idx} whiteSpace="nowrap" textAlign="center">
                                                    {formatCell(row[idx])}
                                                </Td>
                                            ))}
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </Box>
                    </Box>

                    {/* RIGHT: fixed prediction column */}
                    {outputColumnIndices.length > 0 && (
                        <Box
                            flexShrink={0}
                            borderLeftWidth="2px"
                            borderColor={predBorder}
                            boxShadow="-4px 0 12px -2px rgba(0,0,0,0.08)"
                        >
                            <Box
                                ref={predScrollRef}
                                overflowY="auto"
                                overflowX="hidden"
                                maxH="400px"
                                /* hide scrollbar – scroll is synced from input panel */
                                css={{
                                    '&::-webkit-scrollbar': { display: 'none' },
                                    scrollbarWidth: 'none',
                                }}
                            >
                                <Table size="sm">
                                    <Thead position="sticky" top="0" zIndex={1}>
                                        <Tr>
                                            {outputColumnIndices.map((idx) => (
                                                <Th key={idx} whiteSpace="nowrap" color={predTextColor} textAlign="center" bg={predHeaderBg}>
                                                    {headers[idx]}
                                                </Th>
                                            ))}
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {displayedRows.map((row, rowIndex) => (
                                            <Tr key={rowIndex} h="37px">
                                                {outputColumnIndices.map((idx) => (
                                                    <Td
                                                        key={idx}
                                                        whiteSpace="nowrap"
                                                        fontWeight="semibold"
                                                        color={predTextColor}
                                                        textAlign="center"
                                                        bg={predCellBg}
                                                    >
                                                        {formatCell(row[idx])}
                                                    </Td>
                                                ))}
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </Box>
                        </Box>
                    )}
                </HStack>
            </Box>

            {/* Pagination */}
            <HStack justify="center" mt="16px" spacing="12px">
                {hasMoreRows && (
                    <Button size="sm" variant="outline" onClick={handleShowMore}>
                        Show {Math.min(ROWS_PER_PAGE, rows.length - visibleRows)} more
                    </Button>
                )}

                {visibleRows > ROWS_PER_PAGE && (
                    <Button size="sm" variant="ghost" onClick={handleShowLess}>
                        Show less
                    </Button>
                )}
            </HStack>
        </Box>
    );
}