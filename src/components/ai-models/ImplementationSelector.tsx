'use client';

import {
    Box,
    Text,
    Select,
    useColorModeValue,
} from '@chakra-ui/react';

interface Implementation {
    id: string;
    label: string;
    description?: string;
}

interface ImplementationSelectorProps {
    implementations: Implementation[];
    value: string;
    onChange: (value: string) => void;
}

export function ImplementationSelector({
    implementations,
    value,
    onChange,
}: ImplementationSelectorProps) {
    const selected = implementations.find((impl) => impl.id === value);
    const hasMultiple = implementations.length > 1;
    const singleImpl = implementations[0];

    const helperColor = useColorModeValue('gray.500', 'gray.300');
    const optionStyles = useColorModeValue({}, { option: { color: 'white', bg: '#1B254B' } });
    const singleBg = useColorModeValue('gray.50', 'whiteAlpha.100');
    const singleBorder = useColorModeValue('gray.200', 'whiteAlpha.200');
    const singleText = useColorModeValue('gray.700', 'white');

    return (
        <Box>
            {/* HELPER TEXT */}
            <Text fontSize="sm" color={helperColor} mb="12px">
                {hasMultiple
                    ? 'Select which model implementation to use. Both accept the same input and produce the same output.'
                    : 'This model has only the following available implementation:'}
            </Text>

            {/* MULTIPLE IMPLEMENTATIONS */}
            {hasMultiple ? (
                <Select
                    value={value}
                    maxW={{ base: '100%', md: '320px' }}
                    onChange={(e) => onChange(e.target.value)}
                    sx={optionStyles}
                >
                    {implementations.map((impl) => (
                        <option key={impl.id} value={impl.id}>
                            {impl.label}
                        </option>
                    ))}
                </Select>
            ) : (
                /* SINGLE IMPLEMENTATION – AIRY INFO BOX */
                <Box
                    mt="8px"
                    px="16px"
                    py="14px"
                    maxW={{ base: '100%', md: '360px' }}
                    border="1px solid"
                    borderColor={singleBorder}
                    borderRadius="lg"
                    bg={singleBg}
                >
                    <Text fontSize="sm" fontWeight="medium" color={singleText}>
                        {singleImpl?.label}
                    </Text>
                </Box>
            )}

            {/* DESCRIPTION */}
            {selected?.description && (
                <Text mt="10px" fontSize="xs" color={helperColor}>
                    {selected.description}
                </Text>
            )}
        </Box>
    );
}
