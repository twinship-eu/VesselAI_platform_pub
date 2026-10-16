'use client';

import {
  Badge,
  Button,
  Text,
  Heading,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
  useToast,
  IconButton,
  useDisclosure,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Avatar
} from '@chakra-ui/react';
import { Tooltip } from '@chakra-ui/react';
import { MdDelete, MdPublic, MdAdminPanelSettings, MdVerifiedUser, MdGroup } from 'react-icons/md';
import { useRef } from 'react';

import Card from '@/components/card/Card';
import { useQueryClient } from '@tanstack/react-query';

import { useRouter } from 'next/navigation';
import { aiModelsClient } from '@/lib/aiModels/client';

interface ModelCardProps {
  model: {
    slug: string;
    name: string;
    version: string;
    shortDescription: string;
    categories: string[];
    status: "active" | "beta" | "deprecated";
    owner: string | null;
    isOwner: boolean;
    canDelete: boolean;
    requiredRoles: string[];
    allowedOrgs: string[];
    lastUpdated: string;
    implementations: string[];
  };
}

export function ModelCard({ model }: ModelCardProps) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();


  const { isOpen, onOpen, onClose } = useDisclosure();
    const cancelRef = useRef<HTMLButtonElement>(null);

  const canDelete = model.canDelete;
  const orgOnly = model.allowedOrgs.length > 0;
  const roleRestricted = model.requiredRoles.length > 0;
  const orgLabel = model.allowedOrgs.join(', ').toUpperCase();

  const access =
    orgOnly && roleRestricted ? { icon: MdAdminPanelSettings , label: `Role restricted - ${orgLabel}` } :
    orgOnly                   ? { icon: MdGroup , label: orgLabel } :
    roleRestricted            ? { icon: MdVerifiedUser ,     label: 'Role restricted' } :
                                { icon: MdPublic,   label: 'Public' };

  const handleRunInference = () => {
    router.push(`/admin/ai/models/${model.slug}`);
  };

  const handleDelete = async () => {
    try {
      await aiModelsClient.delete(model.slug);

      toast({
        title: 'Model deleted',
        description: `Successfully removed ${model.slug}`,
        status: 'success',
      });

      queryClient.invalidateQueries({ queryKey: ['models'] });
    } catch (err: any) {
      toast({
        title: 'Delete failed',
        description: err.message || 'Could not delete the model.',
        status: 'error',
      });
    } finally {
      onClose();
    }
  };

  const statusColorScheme: Record<string, string> = {
    active: 'green',
    deprecated: 'red',
    beta: 'orange',
  };

  const cardBg = useColorModeValue('white', 'navy.800');

  return (
    <>
    <Card
      p="16px"
      h="100%"
      bg={cardBg}
      display="flex"
      flexDirection="column"
      cursor="pointer"
      position="relative"
      _hover={{ transform: 'translateY(-2px)' }}
      transition="all 0.2s"
      onClick={() => router.push(`/admin/ai/models/${model.slug}`)}
    >
    
      {canDelete && (
        <IconButton
            aria-label="Delete model"
            icon={<Icon as={MdDelete} boxSize={5} />}
            size="md"
            variant="ghost"
            colorScheme="red"
            position="absolute"
            top="8px"
            right="8px"
            onClick={(e) => {
                e.stopPropagation();
                onOpen();
            }}
        />
      )}

      <VStack align="start" spacing="8px" mb="12px">
        <HStack justify="space-between" w="100%" pr={canDelete ? '48px' : '0'}>
          <Heading size="md" lineHeight="short">
            {model.name}
          </Heading>

        <Tooltip label={access.label} hasArrow placement="top">
          <span onClick={(e) => e.stopPropagation()}>
            <Icon as={access.icon} boxSize={5} color="gray.400" flexShrink={0} />
          </span>
        </Tooltip>
        </HStack>

        <HStack spacing="4px" wrap="wrap">
          {model.implementations.map((impl) => (
            <Badge
              key={impl}
              fontSize="xs"
              colorScheme="purple"
              variant="subtle"
            >
              {impl}
            </Badge>
          ))}
        </HStack>
      </VStack>

      <Text
        fontSize="sm"
        color={useColorModeValue('gray.600', 'white')}
        noOfLines={3}
        mb="12px"
      >
        {model.shortDescription}
      </Text>
      
      <HStack w="100%" justify="space-between" align="center" spacing={3}>
        <Text
          fontSize="xs"
          color={useColorModeValue("gray.500", "gray.400")}
          noOfLines={1}
        >
          Updated {new Date(model.lastUpdated).toLocaleDateString()}
        </Text>

      {model.owner && (
        <HStack
          spacing="4px"
          fontSize="xs"
          color={useColorModeValue("gray.500", "gray.400")}
          fontWeight="medium"
          flexShrink={0}
          maxW="120px"
        >
          <Avatar name={model.owner} size="2xs" bg="brand.100" color="brand.600" />
          <Text noOfLines={1}>{model.owner}</Text>
        </HStack>
      )}
      </HStack>

      <Button
        mt="16px"
        size="sm"
        bg="brand.500"
        color="white"
        _hover={{ bg: 'brand.600' }}
        onClick={handleRunInference}
      >
        Run inference
      </Button>
    </Card>

    <AlertDialog
    isOpen={isOpen}
    leastDestructiveRef={cancelRef}
    onClose={onClose}
    isCentered
    >
    <AlertDialogOverlay>
        <AlertDialogContent borderRadius="xl">
        <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Model
        </AlertDialogHeader>

        <AlertDialogBody>
            Are you sure you want to delete "{model.name}"?
        </AlertDialogBody>

        <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
            Cancel
            </Button>

            <Button colorScheme="red" onClick={handleDelete} ml={3}>
            Delete
            </Button>
        </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialogOverlay>
    </AlertDialog>
    </>
  );
}