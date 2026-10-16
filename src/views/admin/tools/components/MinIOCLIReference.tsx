'use client';

import {
  Box,
  Heading,
  Text,
  Code,
  VStack,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useColorModeValue,
} from '@chakra-ui/react';
import Card from 'components/card/Card';

export default function MinIOCLIReference() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const descColor = useColorModeValue('gray.600', 'gray.400');
  const cardBg = useColorModeValue('white', 'navy.800');
  const codeBg = useColorModeValue('gray.100', 'navy.900');

  const commands = [
    {
      title: 'Configuration',
      items: [
        {
          name: 'Set MinIO alias',
          command: 'docker exec -it minio mc alias set myminio <MINIO_URL> <ACCESS_KEY> <SECRET_KEY>',
          description: 'Configure mc to access your MinIO instance',
        },
        {
          name: 'List configured aliases',
          command: 'docker exec -it minio mc alias list',
          description: 'Show all configured MinIO instances',
        },
      ],
    },
    {
      title: 'Bucket Operations',
      items: [
        {
          name: 'List buckets',
          command: 'docker exec -it minio mc ls myminio',
          description: 'List all buckets',
        },
        {
          name: 'Create bucket',
          command: 'docker exec -it minio mc mb myminio/mybucket',
          description: 'Create a new bucket named "mybucket"',
        },
        {
          name: 'Remove bucket',
          command: 'docker exec -it minio mc rb myminio/mybucket',
          description: 'Remove an empty bucket',
        },
        {
          name: 'Remove bucket (force)',
          command: 'docker exec -it minio mc rb --force myminio/mybucket',
          description: 'Remove bucket and all its contents',
        },
      ],
    },
    {
      title: 'Object Operations',
      items: [
        {
          name: 'List objects',
          command: 'docker exec -it minio mc ls myminio/mybucket',
          description: 'List all objects in a bucket',
        },
        {
          name: 'Upload file',
          command: 'docker exec -it minio mc cp /local/file.txt myminio/mybucket/',
          description: 'Upload a file to bucket',
        },
        {
          name: 'Upload directory',
          command: 'docker exec -it minio mc cp --recursive /local/dir/ myminio/mybucket/',
          description: 'Upload entire directory recursively',
        },
        {
          name: 'Download file',
          command: 'docker exec -it minio mc cp myminio/mybucket/file.txt /local/path/',
          description: 'Download a file from bucket',
        },
        {
          name: 'Remove object',
          command: 'docker exec -it minio mc rm myminio/mybucket/file.txt',
          description: 'Delete an object',
        },
      ],
    },
    {
      title: 'Bucket Policies',
      items: [
        {
          name: 'Public read',
          command: 'docker exec -it minio mc anonymous set download myminio/mybucket',
          description: 'Allow public read access to bucket',
        },
        {
          name: 'Public read/write',
          command: 'docker exec -it minio mc anonymous set public myminio/mybucket',
          description: 'Allow public read and write access',
        },
        {
          name: 'Private',
          command: 'docker exec -it minio mc anonymous set private myminio/mybucket',
          description: 'Make bucket private (default)',
        },
        {
          name: 'Get policy',
          command: 'docker exec -it minio mc anonymous get myminio/mybucket',
          description: 'View current bucket policy',
        },
      ],
    },
    {
      title: 'Statistics & Info',
      items: [
        {
          name: 'Disk usage',
          command: 'docker exec -it minio mc du myminio/mybucket',
          description: 'Show bucket size and object count',
        },
        {
          name: 'Object info',
          command: 'docker exec -it minio mc stat myminio/mybucket/file.txt',
          description: 'Get detailed info about an object',
        },
        {
          name: 'Server info',
          command: 'docker exec -it minio mc admin info myminio',
          description: 'Display MinIO server information',
        },
      ],
    },
    {
      title: 'Advanced Features',
      items: [
        {
          name: 'Enable versioning',
          command: 'docker exec -it minio mc version enable myminio/mybucket',
          description: 'Enable object versioning',
        },
        {
          name: 'List versions',
          command: 'docker exec -it minio mc ls --versions myminio/mybucket',
          description: 'List all object versions',
        },
        {
          name: 'Create presigned URL',
          command: 'docker exec -it minio mc share download myminio/mybucket/file.txt --expire=7d',
          description: 'Generate temporary download link (7 days)',
        },
        {
          name: 'Set retention',
          command: 'docker exec -it minio mc retention set --default GOVERNANCE 30d myminio/mybucket',
          description: 'Set 30-day retention policy',
        },
      ],
    },
  ];

  return (
    <Card bg={cardBg} p="20px">
      <Heading size="md" color={textColor} mb="10px">
        MinIO CLI Commands Reference
      </Heading>
      <Text fontSize="sm" color={descColor} mb="20px">
        Quick reference for managing MinIO via command line interface (mc)
      </Text>

      <Accordion allowMultiple>
        {commands.map((section, idx) => (
          <AccordionItem key={idx} border="none">
            <AccordionButton _hover={{ bg: codeBg }} borderRadius="8px">
              <Box flex="1" textAlign="left">
                <Text fontWeight="bold" color={textColor}>
                  {section.title}
                </Text>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <VStack align="stretch" spacing="15px">
                {section.items.map((item, itemIdx) => (
                  <Box key={itemIdx}>
                    <Text fontSize="sm" fontWeight="semibold" color={textColor} mb="5px">
                      {item.name}
                    </Text>
                    <Code
                      display="block"
                      p="10px"
                      borderRadius="6px"
                      bg={codeBg}
                      color={textColor}
                      fontSize="xs"
                      whiteSpace="pre-wrap"
                      mb="5px"
                    >
                      {item.command}
                    </Code>
                    <Text fontSize="xs" color={descColor}>
                      {item.description}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
}
