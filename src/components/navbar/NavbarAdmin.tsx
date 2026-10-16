/* eslint-disable */
// Chakra Imports
import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  Link,
  Text,
  useColorModeValue,
  Icon
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import AdminNavbarLinks from 'components/navbar/NavbarLinksAdmin'
import { MdHome } from 'react-icons/md'

export default function AdminNavbar(props: {
  secondary: boolean
  message: string | boolean
  brandText: string
  logoText: string
  fixed: boolean
  onOpen: (...args: any[]) => any
}) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // You now have access to `window`
      window.addEventListener('scroll', changeNavbar)

      return () => {
        window.removeEventListener('scroll', changeNavbar)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { secondary, message, brandText } = props

  // Here are all the props that may change depending on navbar's type or state.(secondary, variant, scrolled)
  let mainText = useColorModeValue('navy.700', 'white')
  let secondaryText = useColorModeValue('gray.700', 'white')
  let navbarPosition = 'fixed' as const
  let navbarFilter = 'none'
  // Disable backdrop blur to prevent interference with modals
  let navbarBackdrop = 'none'
  // With blur disabled, the bg must go opaque on scroll or page content
  // shows through the fixed navbar
  let navbarShadow = scrolled ? '0px 7px 23px rgba(0, 0, 0, 0.05)' : 'none'
  let navbarBg = useColorModeValue(
    scrolled ? 'rgba(244, 247, 254, 1)' : 'rgba(244, 247, 254, 0.2)',
    scrolled ? 'rgba(11, 20, 55, 1)' : 'rgba(11,20,55,0.5)'
  )
  let navbarBorder = 'transparent'
  let secondaryMargin = '0px'
  let paddingX = '15px'
  let gap = '0px'
  const changeNavbar = () => {
    if (typeof window !== 'undefined' && window.scrollY > 1) {
      setScrolled(true)
    } else {
      setScrolled(false)
    }
  }

  return (
    <Box
      position={navbarPosition}
      boxShadow={navbarShadow}
      bg={navbarBg}
      borderColor={navbarBorder}
      filter={navbarFilter}
      backdropFilter={navbarBackdrop}
      backgroundPosition='center'
      backgroundSize='cover'
      borderRadius='16px'
      borderWidth='1.5px'
      borderStyle='solid'
      transitionDelay='0s, 0s, 0s, 0s'
      transitionDuration=' 0.25s, 0.25s, 0.25s, 0s'
      transition-property='box-shadow, background-color, filter, border'
      transitionTimingFunction='linear, linear, linear, linear'
      alignItems={{ xl: 'center' }}
      display={secondary ? 'block' : 'flex'}
      minH={{ base: '110px', md: '75px' }}
      justifyContent={{ xl: 'center' }}
      lineHeight='25.6px'
      mx='auto'
      mt={secondaryMargin}
      pb='8px'
      right={{ base: '12px', md: '30px', lg: '30px', xl: '30px' }}
      left={{ base: '12px', md: '30px', lg: '30px', xl: '310px' }}
      px={{
        sm: paddingX,
        md: '10px'
      }}
      ps={{
        xl: '12px'
      }}
      pt='8px'
      top={{ base: '12px', md: '16px', xl: '18px' }}
      zIndex={9}
    >
      <Flex
        w='100%'
        flexDirection={{
          base: 'column',
          md: 'row'
        }}
        alignItems={{ xl: 'center' }}
        mb={gap}
      >
        <Box mb={{ base: '8px', md: '0px' }}>
          <Breadcrumb>
            <BreadcrumbItem color={secondaryText} fontSize='sm' mb='5px'>
              <BreadcrumbLink href='/admin/default' color={secondaryText}>
                <Icon as={MdHome} boxSize={4} mr={1} />
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbItem color={secondaryText} fontSize='sm'>
              <BreadcrumbLink href='#' color={secondaryText}>
                {brandText}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
          {/* Here we create navbar brand, based on route name */}
          <Link
            color={mainText}
            href='#'
            bg='inherit'
            borderRadius='inherit'
            fontWeight='bold'
            fontSize='34px'
            _hover={{ color: { mainText } }}
            _active={{
              bg: 'inherit',
              transform: 'none',
              borderColor: 'transparent'
            }}
            _focus={{
              boxShadow: 'none'
            }}
          >
            {brandText}
          </Link>
        </Box>
        <Box ms='auto' w={{ base: '100%', md: 'unset' }}>
          <AdminNavbarLinks
            onOpen={props.onOpen}
            secondary={props.secondary}
            fixed={props.fixed}
          />
        </Box>
      </Flex>
    </Box>
  )
}
