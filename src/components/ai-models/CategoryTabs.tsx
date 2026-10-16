'use client';

import { HStack, Button, Box, useColorModeValue } from '@chakra-ui/react';

export const categories = [
    { id: 'all', label: 'All Models' },
    { id: 'emissions', label: 'Emissions' },
    { id: 'navigational', label: 'Navigational' },
    { id: 'predictive', label: 'Predictive' },
    { id: 'detection', label: 'Detection' },
];

interface CategoryTabsProps {
    activeCategory: string;
    onCategoryChange: (category: string) => void;
}

export function CategoryTabs({
    activeCategory,
    onCategoryChange,
}: CategoryTabsProps) {
    // Same tokens as ActiveWorkflowsTab
    const tabActiveBg = useColorModeValue('brand.500', 'brand.500');
    const tabInactiveBg = useColorModeValue('gray.100', 'whiteAlpha.200');
    const tabActiveColor = 'white';
    const tabInactiveColor = useColorModeValue('gray.600', 'gray.300');
    const tabActiveHoverBg = useColorModeValue('brand.600', 'brand.600');
    const tabHoverBg = useColorModeValue('gray.200', 'whiteAlpha.300');

    return (
        <Box overflowX="auto" sx={{ scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        <HStack spacing={2} minW="max-content">
            {categories.map((category) => {
                const isActive = activeCategory === category.id;

                return (
                    <Button
                        key={category.id}
                        onClick={() => onCategoryChange(category.id)}
                        bg={isActive ? tabActiveBg : tabInactiveBg}
                        color={isActive ? tabActiveColor : tabInactiveColor}
                        borderRadius="full"
                        px={{ base: 3, md: 4 }}
                        py={2}
                        size="sm"
                        fontSize="sm"
                        fontWeight="600"
                        flexShrink={0}
                        whiteSpace="nowrap"
                        _hover={{
                            bg: isActive ? tabActiveHoverBg : tabHoverBg,
                        }}
                        _active={{
                            bg: isActive ? 'brand.700' : tabHoverBg,
                        }}
                        _focus={{
                            boxShadow: 'none',
                        }}
                        transition="all 0.2s"
                    >
                        {category.label}
                    </Button>
                );
            })}
        </HStack>
        </Box>
    );
}
