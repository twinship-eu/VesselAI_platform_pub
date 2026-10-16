'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Heading,
  Text,
  Image,
  useColorModeValue,
  Card,
  CardBody,
  Center,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useAuth } from '../../../providers/AuthProvider';
import { useRouter } from 'next/navigation';
import SpeedboatLoader from 'components/loaders/SpeedboatLoader';

export default function SignInPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const bg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/admin/default');
    }
    // Read NextAuth error from querystring (if redirect returned with error)
    try {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err) setError(err);
    } catch (e) {
      // ignore (server renders)
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <Center h="100vh" bg={bg}>
        <VStack spacing={4}>
          <SpeedboatLoader size={80} />
          <Text>Loading...</Text>
        </VStack>
      </Center>
    );
  }

  if (isAuthenticated) {
    return (
      <Center h="100vh" bg={bg}>
        <VStack spacing={4}>
          <SpeedboatLoader size={80} />
          <Text>Redirecting to dashboard...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box minH="100vh" bg={bg} display="flex" alignItems="center" justifyContent="center">
      <Card maxW="md" w="full" bg={cardBg} shadow="xl">
        <CardBody p={8}>
          <VStack spacing={8}>
            {/* Logo */}
            <Box textAlign="center">
              <Image
                src="/logo-dark.png"
                alt="VesselAI Logo"
                h="100px"
                mx="auto"
                mb={4}
              />
              <Heading size="lg" mb={2}>
                Welcome to VesselAI
              </Heading>
              <Text color="gray.600" fontSize="sm">
                Sign in to access your maritime analytics dashboard
              </Text>
            </Box>

            {/* Sign In Button */}
            <Button
              colorScheme="blue"
              size="lg"
              w="full"
              onClick={() => login()}
              isLoading={isLoading}
              loadingText="Signing in..."
            >
              SSO Sign in
            </Button>

            {/* Debug / Error info */}
            {error && (
              <Box mt={2} textAlign="center">
                <Text color="red.500" fontSize="sm">Sign in error: {error}</Text>
              </Box>
            )}

            <Box textAlign="center" mt={2}>
              <Text fontSize="xs" color="gray.500">
                If the button does nothing you can try the direct sign-in endpoint:
              </Text>
              <Text fontSize="xs" color="blue.500">
                <Link href="/api/auth/signin/keycloak">/api/auth/signin/keycloak</Link>
              </Text>
            </Box>

            {/* Additional Info */}
            <Box textAlign="center">
              <Text fontSize="xs" color="gray.500">
                Secure authentication powered by Keycloak
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
}
