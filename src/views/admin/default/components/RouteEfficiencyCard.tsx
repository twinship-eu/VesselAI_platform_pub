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
import { MdSpeed, MdTimeline, MdTrendingUp } from 'react-icons/md';

export default function RouteEfficiencyCard() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const secondaryColor = useColorModeValue('gray.600', 'gray.400');
  const brandColor = useColorModeValue('brand.500', 'brand.500');
  const brandBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const progressBg = useColorModeValue('gray.100', 'whiteAlpha.100');

  const efficiencyScore = 94.8;

  return (
    <Card p="5">
      <Flex justify="space-between" align="center" mb={4}>
        <HStack spacing={2}>
          <Box p={2} borderRadius="lg" bg={brandBg}>
            <Icon as={MdTimeline} boxSize={5} color={brandColor} />
          </Box>
          <Text fontSize="lg" fontWeight="bold" color={textColor}>
            Route Efficiency
          </Text>
        </HStack>
        <HStack spacing={1} color="green.500" fontSize="sm">
          <Icon as={MdTrendingUp} boxSize={4} />
          <Text fontWeight="500">+2.3%</Text>
        </HStack>
      </Flex>

      <VStack spacing={5} align="stretch">
        {/* Efficiency Score */}
        <Box textAlign="center" py={4}>
          <Box position="relative" w="100px" h="100px" mx="auto">
            <svg width="100%" height="100%" style={{ transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke={useColorModeValue('#E2E8F0', 'rgba(255,255,255,0.1)')}
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#4318FF"
                strokeWidth="3"
                strokeDasharray={`${efficiencyScore} 100`}
                strokeLinecap="round"
              />
            </svg>
            <Flex
              position="absolute"
              inset={0}
              align="center"
              justify="center"
              flexDirection="column"
            >
              <Text fontSize="xl" fontWeight="bold" color={brandColor}>{efficiencyScore}%</Text>
              <Text fontSize="xs" color={secondaryColor}>Score</Text>
            </Flex>
          </Box>
        </Box>

        {/* Speed Metrics */}
        <Box>
          <Flex justify="space-between" mb={2}>
            <HStack spacing={2}>
              <Icon as={MdSpeed} boxSize={4} color={secondaryColor} />
              <Text fontSize="sm" color={secondaryColor}>Average Speed</Text>
            </HStack>
            <Text fontSize="sm" fontWeight="600" color={textColor}>14.2 kn</Text>
          </Flex>
          <Progress
            value={82}
            size="sm"
            borderRadius="full"
            colorScheme="brand"
            bg={progressBg}
          />
          <Flex justify="space-between" mt={1}>
            <Text fontSize="xs" color={secondaryColor}>Target: 14.0 kn</Text>
            <Text fontSize="xs" color="green.500">+1.4%</Text>
          </Flex>
        </Box>

        {/* ETA Status */}
        <Box
          bg={useColorModeValue('green.50', 'rgba(72, 187, 120, 0.1)')}
          borderRadius="xl"
          p={4}
          border="1px solid"
          borderColor={useColorModeValue('green.200', 'rgba(72, 187, 120, 0.3)')}
        >
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" color="green.600">On Schedule</Text>
              <Text fontSize="sm" fontWeight="600" color={textColor}>Arriving 30 min early</Text>
            </Box>
            <Box w="8px" h="8px" borderRadius="full" bg="green.400" />
          </Flex>
        </Box>
      </VStack>
    </Card>
  );
}
