'use client';

import React from 'react';
import {
  Box,
  Button,
  VStack,
  Heading,
  Text,
  useColorModeValue,
  Icon,
} from '@chakra-ui/react';
import { MdLock } from 'react-icons/md';
import { useAuth } from '../../providers/AuthProvider';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const bg = useColorModeValue('gray.50', 'gray.900');

  const handleGoBack = () => {
    router.back();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Box minH="100vh" bg={bg} display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={8} textAlign="center" maxW="md">
        <Icon as={MdLock} boxSize={20} color="red.500" />
        
        <VStack spacing={4}>
          <Heading size="xl" color="red.500">
            Access Denied
          </Heading>
          <Text fontSize="lg" color="gray.600">
            You don&apos;t have permission to access this resource.
          </Text>
          <Text fontSize="sm" color="gray.500">
            Contact your administrator if you believe this is an error.
          </Text>
        </VStack>

        <VStack spacing={4} w="full">
          <Button colorScheme="blue" onClick={handleGoBack}>
            Go Back
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            Sign Out
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
}
