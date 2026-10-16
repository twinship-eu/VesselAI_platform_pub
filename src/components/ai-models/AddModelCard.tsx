import { Box, Text, Flex, Icon, useColorModeValue } from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";

export const AddModelCard = ({ onClick }: { onClick: () => void }) => {
  // Subtle brand-tinted hover bg that works in both themes
  // (was purple.50 — too white in dark mode).
  const hoverBg = useColorModeValue("brand.50", "whiteAlpha.50");

  return (
    <Box
      onClick={onClick}
      border="2px dashed"
      borderColor="gray.300"
      borderRadius="xl"
      p="24px"
      cursor="pointer"
      _hover={{ borderColor: "brand.500", bg: hoverBg }}
      transition="all 0.2s"
    >
      <Flex direction="column" align="center" justify="center" h="100%">
        <Icon as={AddIcon} w={6} h={6} mb="8px" color="brand.500" />
        <Text fontWeight="bold">Add your model</Text>
        <Text fontSize="sm" color="gray.500">
          Upload and deploy a new model
        </Text>
      </Flex>
    </Box>
  );
};