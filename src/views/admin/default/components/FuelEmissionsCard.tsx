'use client';

import {
  Box,
  Flex,
  HStack,
  Icon,
  Progress,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import { MdLocalGasStation, MdCloud, MdTrendingDown } from 'react-icons/md';

export default function FuelEmissionsCard() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const secondaryColor = useColorModeValue('gray.600', 'gray.400');
  const brandColor = useColorModeValue('brand.500', 'brand.500');
  const brandBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const progressBg = useColorModeValue('gray.100', 'whiteAlpha.100');

  return (
    <Card p="5">
      <Flex justify="space-between" align="center" mb={4}>
        <HStack spacing={2}>
          <Box p={2} borderRadius="lg" bg={brandBg}>
            <Icon as={MdLocalGasStation} boxSize={5} color={brandColor} />
          </Box>
          <Text fontSize="lg" fontWeight="bold" color={textColor}>
            Fuel & Emissions
          </Text>
        </HStack>
        <HStack spacing={1} color="green.500" fontSize="sm">
          <Icon as={MdTrendingDown} boxSize={4} />
          <Text fontWeight="500">-8.5%</Text>
        </HStack>
      </Flex>

      <VStack spacing={5} align="stretch">
        {/* Fuel Consumption */}
        <Box>
          <Flex justify="space-between" mb={2}>
            <Text fontSize="sm" color={secondaryColor}>Daily Fuel Consumption</Text>
            <Text fontSize="sm" fontWeight="600" color={textColor}>2.1 MT/day</Text>
          </Flex>
          <Progress
            value={65}
            size="sm"
            borderRadius="full"
            colorScheme="brand"
            bg={progressBg}
          />
          <Flex justify="space-between" mt={1}>
            <Text fontSize="xs" color={secondaryColor}>Optimal range</Text>
            <Text fontSize="xs" color={secondaryColor}>Max: 3.2 MT</Text>
          </Flex>
        </Box>

        {/* CO2 Emissions */}
        <Box>
          <Flex justify="space-between" mb={2}>
            <HStack spacing={2}>
              <Icon as={MdCloud} boxSize={4} color={secondaryColor} />
              <Text fontSize="sm" color={secondaryColor}>CO₂ Emissions Rate</Text>
            </HStack>
            <Text fontSize="sm" fontWeight="600" color={textColor}>6.7 MT/day</Text>
          </Flex>
          <Progress
            value={58}
            size="sm"
            borderRadius="full"
            colorScheme="green"
            bg={progressBg}
          />
          <Text fontSize="xs" color="green.500" mt={1}>12% below target</Text>
        </Box>

        {/* Summary Stats */}
        <Box
          bg={useColorModeValue('gray.50', 'whiteAlpha.50')}
          borderRadius="xl"
          p={4}
          border="1px solid"
          borderColor={borderColor}
        >
          <Flex justify="space-between">
            <VStack spacing={0} align="flex-start">
              <Text fontSize="xs" color={secondaryColor}>Voyage Total</Text>
              <Text fontSize="lg" fontWeight="600" color={textColor}>21 MT</Text>
            </VStack>
            <VStack spacing={0} align="flex-end">
              <Text fontSize="xs" color={secondaryColor}>CO₂ Total</Text>
              <Text fontSize="lg" fontWeight="600" color={textColor}>67 MT</Text>
            </VStack>
          </Flex>
        </Box>
      </VStack>
    </Card>
  );
}
