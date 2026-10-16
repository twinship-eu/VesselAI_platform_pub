'use client';

/**
 * "What's new on the platform" — the overview page's changelog card.
 * Entries live in ./whatsNew.ts; edit that file when a feature ships.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Link,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import Card from 'components/card/Card';
import { MdNewReleases, MdArrowForward, MdOpenInNew } from 'react-icons/md';
import { useAuth } from '../../../../providers/AuthProvider';
import { WHATS_NEW, MAX_VISIBLE, type WhatsNewEntry } from './whatsNew';

const SEEN_KEY = 'vesselai-whats-new-seen-v1';

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function EntryLink({ entry }: { entry: WhatsNewEntry }) {
  if (!entry.href) return null;
  const external = /^https?:\/\//.test(entry.href);
  const label = entry.linkLabel || 'Open';
  const common = {
    fontSize: 'xs' as const,
    fontWeight: '600',
    color: 'brand.500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    mt: 1,
    _hover: { textDecoration: 'underline' },
  };
  return external ? (
    <Link href={entry.href} isExternal {...common}>
      {label} <Icon as={MdOpenInNew} boxSize={3} />
    </Link>
  ) : (
    <Link as={NextLink} href={entry.href} {...common}>
      {label} <Icon as={MdArrowForward} boxSize={3} />
    </Link>
  );
}

export default function WhatsNewCard() {
  const { user } = useAuth();
  const roles: string[] = user?.roles || [];

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const secondaryColor = useColorModeValue('gray.600', 'gray.400');
  const brandColor = useColorModeValue('brand.500', 'brand.500');
  const brandBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');

  const [showAll, setShowAll] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  // Entries the user has not seen get a "New" badge; once rendered they are
  // marked seen so the badge only appears on the first visit after a release.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      setSeen(new Set(raw ? (JSON.parse(raw) as string[]) : []));
      localStorage.setItem(SEEN_KEY, JSON.stringify(WHATS_NEW.map((e) => e.id)));
    } catch {
      /* storage unavailable: no badges, card still renders */
    }
  }, []);

  const entries = useMemo(
    () =>
      WHATS_NEW.filter((e) => !e.roles || e.roles.some((r) => roles.includes(r))).sort((a, b) =>
        b.date.localeCompare(a.date)
      ),
    [roles]
  );
  const visible = showAll ? entries : entries.slice(0, MAX_VISIBLE);

  return (
    <Card p="5">
      <Flex justify="space-between" align="center" mb={4}>
        <HStack spacing={2}>
          <Box p={2} borderRadius="lg" bg={brandBg}>
            <Icon as={MdNewReleases} boxSize={5} color={brandColor} />
          </Box>
          <Text fontSize="lg" fontWeight="bold" color={textColor}>
            What&apos;s new on the platform
          </Text>
        </HStack>
      </Flex>

      <VStack align="stretch" spacing={0}>
        {visible.map((entry, i) => {
          const isNew = seen.size > 0 ? !seen.has(entry.id) : false;
          return (
            <Box
              key={entry.id}
              py={3}
              borderTop={i === 0 ? 'none' : '1px solid'}
              borderColor={borderColor}
            >
              <Flex justify="space-between" align="flex-start" gap={3}>
                <Box>
                  <HStack spacing={2} mb={1}>
                    <Text fontSize="sm" fontWeight="600" color={textColor}>
                      {entry.title}
                    </Text>
                    {i === 0 && (
                      <Badge colorScheme="brand" borderRadius="full" px={2} fontSize="9px">
                        Latest
                      </Badge>
                    )}
                    {isNew && i !== 0 && (
                      <Badge colorScheme="green" borderRadius="full" px={2} fontSize="9px">
                        New
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize="xs" color={secondaryColor} lineHeight="1.5">
                    {entry.description}
                  </Text>
                  <EntryLink entry={entry} />
                </Box>
                <Text fontSize="xs" color={secondaryColor} whiteSpace="nowrap" flexShrink={0}>
                  {formatDate(entry.date)}
                </Text>
              </Flex>
            </Box>
          );
        })}
      </VStack>

      {entries.length > MAX_VISIBLE && (
        <Button
          variant="ghost"
          size="xs"
          mt={2}
          alignSelf="flex-start"
          color={brandColor}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? 'Show less' : `Show all (${entries.length})`}
        </Button>
      )}
    </Card>
  );
}
