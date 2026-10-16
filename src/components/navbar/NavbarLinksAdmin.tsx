'use client';

import {
  Box,
  Button,
  Divider,
  Flex,
  Icon,
  Link,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorMode,
  useColorModeValue,
  Avatar,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import SpeedboatLoader from 'components/loaders/SpeedboatLoader';
import { sanitizeForLog } from '../../lib/sanitizeLog.js';
import { SearchBar } from 'components/navbar/searchBar/SearchBar';
import { IoMdMoon, IoMdSunny } from 'react-icons/io';
import { MdInfoOutline } from 'react-icons/md';
import { FiMenu } from 'react-icons/fi';
import { useAuth } from '../../providers/AuthProvider';
import { openReportProblem } from '../report-problem/reportProblem';

export default function HeaderLinks({
  secondary,
  onOpen,
  fixed,
}: {
  secondary: boolean;
  onOpen: any;
  fixed: any;
}) {
  const { colorMode, toggleColorMode } = useColorMode();
  const { user, logout, isLoading } = useAuth();
  
  const navbarIcon = useColorModeValue('gray.400', 'white');
  const menuBg = useColorModeValue('white', 'navy.800');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('#E6ECFA', 'rgba(135, 140, 189, 0.3)');
  const shadow = useColorModeValue(
    '14px 17px 40px 4px rgba(112, 144, 176, 0.18)',
    '14px 17px 40px 4px rgba(112, 144, 176, 0.06)'
  );
  const borderButton = useColorModeValue('secondaryGray.500', 'whiteAlpha.200');

  // Generate user initials for avatar
  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', sanitizeForLog(error));
    }
  };

  return (
    <Flex
      w={{ base: '100%', md: 'auto' }}
      alignItems="center"
      justifyContent={{ base: 'space-between', md: 'flex-start' }}
      flexDirection="row"
      bg={menuBg}
      p="10px"
      borderRadius="30px"
      boxShadow={shadow}
    >
      {/* Mobile menu button */}
      <IconButton
        aria-label="Open menu"
        icon={<FiMenu />}
        display={{ base: 'inline-flex', xl: 'none' }}
        variant="ghost"
        mr="8px"
        onClick={onOpen}
      />
      <SearchBar me="10px" borderRadius="30px" />
      <Menu>
        <MenuButton p="0px">
          <Icon as={MdInfoOutline} color={navbarIcon} w="18px" h="18px" me="10px" />
        </MenuButton>
        <MenuList p="20px" borderRadius="20px" bg={menuBg} mt="22px" boxShadow={shadow} minW="240px">
          <Text fontSize="md" fontWeight="600" color={textColor} mb="14px">Help</Text>
          <Flex flexDirection="column">
            <Link href={process.env.NEXT_PUBLIC_DOCS_URL || '#'} isExternal _hover={{ textDecoration: 'none' }}>
              <Button w="100%" mb="10px" variant="brand">Documentation</Button>
            </Link>
            <Button
              w="100%"
              border="1px solid"
              bg="transparent"
              borderColor={borderButton}
              color={textColor}
              onClick={() => openReportProblem()}
            >
              Report a problem
            </Button>
          </Flex>
        </MenuList>
      </Menu>

      <Button variant="no-hover" bg="transparent" onClick={toggleColorMode}>
        <Icon h="18px" w="18px" color={navbarIcon} as={colorMode === 'light' ? IoMdMoon : IoMdSunny} />
      </Button>

      {/* User Profile Menu - Updated with dynamic Keycloak user data */}
      <Menu>
        <MenuButton p="0px" style={{ position: 'relative' }}>
          {isLoading ? (
            <SpeedboatLoader size={20} />
          ) : (
            <>
              {user?.picture ? (
                <Avatar src={user.picture} size="sm" />
              ) : (
                <Box bg="#11047A" w="40px" h="40px" borderRadius="full">
                  <Center top={0} left={0} position="absolute" w="100%" h="100%">
                    <Text fontSize="xs" fontWeight="bold" color="white">
                      {getUserInitials(user?.name || 'User')}
                    </Text>
                  </Center>
                </Box>
              )}
            </>
          )}
        </MenuButton>
        <MenuList p="0px" mt="10px" borderRadius="20px" bg={menuBg}>
          <Flex w="100%" mb="0px" direction="column">
            <Text ps="20px" pt="16px" pb="10px" fontSize="sm" fontWeight="700" color={textColor} w="100%">
              👋 Hey, {user?.name || 'User'}
            </Text>
            <Divider borderColor={borderColor} />
          </Flex>
          <Flex flexDirection="column" p="10px">
            {user?.email && (
              <MenuItem px="14px">
                <Text fontSize="xs" color="gray.500">{user.email}</Text>
              </MenuItem>
            )}
            <MenuItem as={NextLink} href="/admin/settings" px="14px">
              <Text fontSize="sm">Settings</Text>
            </MenuItem>
            <MenuItem px="14px">
              <Text fontSize="sm">Newsletter Settings</Text>
            </MenuItem>
            <MenuItem px="14px" color="red.400" onClick={handleLogout}>
              <Text fontSize="sm">Log out</Text>
            </MenuItem>
          </Flex>
        </MenuList>
      </Menu>
    </Flex>
  );
}
