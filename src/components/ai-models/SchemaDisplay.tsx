'use client';

import { useState } from 'react';
import {
    Box,
    Button,
    Text,
    Badge,
    Collapse,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    VStack,
    HStack,
    useColorModeValue,
    Icon,
    SimpleGrid,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons';
import type { InputField } from '@/lib/aiModels/types';

interface SchemaDisplayProps {
    schema: InputField[];
}

export function SchemaDisplay({ schema }: SchemaDisplayProps) {
    const [isOpen, setIsOpen] = useState(true); // Default open for better UX

    // Colors
    const tableBg = useColorModeValue('white', 'navy.800');
    const headerBg = useColorModeValue('gray.50', 'navy.900');
    const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
    const codeBg = useColorModeValue('brand.50', 'purple.800');
    const codeColor = useColorModeValue('brand.600', 'purple.200');
    const textColor = useColorModeValue('gray.700', 'gray.200');
    const mutedColor = useColorModeValue('gray.500', 'gray.400');
    const groupLabelColor = useColorModeValue('gray.600', 'gray.300');

    // Group fields by group
    const hasAnyGroup = schema.some((f) => !!f.group);

    const groupedFields: Record<string, InputField[]> = hasAnyGroup
        ? schema.reduce((acc, field) => {
            const group = field.group || 'Other';
            if (!acc[group]) acc[group] = [];
            acc[group].push(field);
            return acc;
        }, {} as Record<string, InputField[]>)
        : { all: schema };

    const fieldCount = schema.length;

    if (fieldCount === 0) {
        return null;
    }
    const hasDescriptions = schema.some((f) => f.description?.trim());

    return (
        <Box>
            {/* Trigger */}
            <Button
                variant="ghost"
                size="sm"
                leftIcon={<Icon as={isOpen ? ChevronDownIcon : ChevronRightIcon} />}
                onClick={() => setIsOpen((prev) => !prev)}
                fontWeight="600"
                color={useColorModeValue('brand.500', 'white')}
                _hover={{ bg: useColorModeValue('gray.100', 'whiteAlpha.100') }}
            >
                {isOpen ? 'Hide' : 'View'} Required Schema
                <Badge ml="8px" colorScheme={useColorModeValue('brand', 'purple')} variant="subtle" fontSize="xs">
                    {fieldCount} columns
                </Badge>
            </Button>

            {/* Content */}
            <Collapse in={isOpen} animateOpacity>
                <Box mt="16px">
                    <Text fontSize="sm" color={mutedColor} mb="20px">
                        Your CSV must include all required columns below. Column names are case-sensitive.
                    </Text>

                    {/* Stacked layout for consistent column alignment */}
                    <VStack spacing="24px" align="stretch">
                        {Object.entries(groupedFields).map(([group, fields]) => (
                            <Box key={group}>
                                {hasAnyGroup && (
                                    <HStack mb="12px" spacing="8px">
                                        <Text
                                            fontSize="sm"
                                            fontWeight="700"
                                            color={groupLabelColor}
                                            textTransform="uppercase"
                                            letterSpacing="wide"
                                        >
                                            {group}
                                        </Text>
                                        <Badge
                                            colorScheme="gray"
                                            variant="subtle"
                                            fontSize="xs"
                                            borderRadius="full"
                                        >
                                            {fields.length}
                                        </Badge>
                                    </HStack>
                                )}
                                <Box
                                    borderWidth="1px"
                                    borderColor={borderColor}
                                    borderRadius="lg"
                                    overflow="hidden"
                                    bg={tableBg}
                                    boxShadow="sm"
                                >
                                    <Table size="sm" variant="simple">
                                        <Thead bg={headerBg}>
                                            <Tr>
                                                <Th
                                                    py="12px"
                                                    fontSize="xs"
                                                    fontWeight="700"
                                                    textTransform="uppercase"
                                                    letterSpacing="wider"
                                                    color={mutedColor}
                                                    w="40%"
                                                >
                                                    Column
                                                </Th>
                                                <Th
                                                    py="12px"
                                                    fontSize="xs"
                                                    fontWeight="700"
                                                    textTransform="uppercase"
                                                    letterSpacing="wider"
                                                    color={mutedColor}
                                                    w="15%"
                                                    textAlign="center"
                                                >
                                                    Type
                                                </Th>
                                                {hasDescriptions && <Th
                                                    py="12px"
                                                    fontSize="xs"
                                                    fontWeight="700"
                                                    textTransform="uppercase"
                                                    letterSpacing="wider"
                                                    color={mutedColor}
                                                >
                                                    Description
                                                </Th>}
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {fields.map((field, idx) => (
                                                <Tr
                                                    key={field.name}
                                                    _hover={{ bg: useColorModeValue('gray.50', 'whiteAlpha.50') }}
                                                    borderBottomWidth={idx === fields.length - 1 ? 0 : '1px'}
                                                    borderColor={borderColor}
                                                >
                                                    <Td py="10px">
                                                        <HStack spacing="8px">
                                                            <Text
                                                                as="code"
                                                                fontSize="xs"
                                                                bg={codeBg}
                                                                color={codeColor}
                                                                px="8px"
                                                                py="4px"
                                                                borderRadius="md"
                                                                fontWeight="600"
                                                                fontFamily="mono"
                                                            >
                                                                {field.name}
                                                            </Text>

                                                            {!field.required && (
                                                                <Badge
                                                                    fontSize="xs"
                                                                    colorScheme="orange"
                                                                    variant="subtle"
                                                                >
                                                                    optional
                                                                </Badge>
                                                            )}
                                                        </HStack>
                                                    </Td>

                                                    <Td py="10px" textAlign="center">
                                                        <Badge
                                                            colorScheme="purple"
                                                            variant="subtle"
                                                            fontSize="xs"
                                                            fontWeight="500"
                                                        >
                                                            {field.type}
                                                        </Badge>
                                                    </Td>

                                                    {hasDescriptions && <Td>{field.description}</Td>}
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                </Box>
                            </Box>
                        ))}
                    </VStack>
                </Box>
            </Collapse>
        </Box>
    );
}

