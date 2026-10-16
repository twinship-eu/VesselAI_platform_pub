/* eslint-disable react/no-unescaped-entities */
'use client';

import { Box, Center, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import SpeedboatLoader from 'components/loaders/SpeedboatLoader';

export default function OAuthCallbackPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bg = useColorModeValue('gray.50', 'gray.900');

  const returnTo = useMemo(() => {
    const rt = searchParams?.get('returnTo');
    // Basic safety: only allow same-origin paths
    if (rt && /^\//.test(rt)) return rt;
    return '/admin/default';
  }, [searchParams]);

  useEffect(() => {
    // When the session is authenticated, give a tiny pause for cookies/state to settle,
    // then continue to the intended destination.
    // Allow tuning via NEXT_PUBLIC env or URL (?delay=ms). Fallbacks are sensible defaults.
    const envAuthDelay = Number(process.env.NEXT_PUBLIC_AUTH_CALLBACK_DELAY_MS);
    const envPendingDelay = Number(process.env.NEXT_PUBLIC_AUTH_CALLBACK_PENDING_DELAY_MS);
    const overrideFromUrl = Number(searchParams?.get('delay'));

    const authDelay = Number.isFinite(envAuthDelay) && envAuthDelay > 0 ? envAuthDelay : 500;
    const pendingDelay = Number.isFinite(envPendingDelay) && envPendingDelay > 0 ? envPendingDelay : 1800;
    const computed = status === 'authenticated' ? authDelay : pendingDelay;
    const delay = Number.isFinite(overrideFromUrl) && overrideFromUrl >= 0 ? overrideFromUrl : computed;
    const t = setTimeout(() => {
      router.replace(returnTo);
    }, delay);
    return () => clearTimeout(t);
  }, [status, router, returnTo, searchParams]);

  return (
    <Box minH="100vh" bg={bg} display="flex" alignItems="center" justifyContent="center">
      <Center h="100vh">
        <VStack spacing={4}>
          <SpeedboatLoader size={96} />
          <Text fontSize="lg">
            {status === 'authenticated' ? 'Completing sign-in…' : 'Preparing your session…'}
          </Text>
          <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.300')}>
            You’ll be redirected shortly.
          </Text>
        </VStack>
      </Center>
    </Box>
  );
}
