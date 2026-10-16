import { extendTheme, HTMLChakraProps, ThemingProps } from '@chakra-ui/react';
import { CardComponent } from './additions/card/card';
import { buttonStyles } from './components/button';
import { badgeStyles } from './components/badge';
import { inputStyles } from './components/input';
import { progressStyles } from './components/progress';
import { sliderStyles } from './components/slider';
import { textareaStyles } from './components/textarea';
import { switchStyles } from './components/switch';
import { linkStyles } from './components/link';
import { breakpoints } from './foundations/breakpoints';
import { globalStyles } from './styles';

export default extendTheme(
	{ breakpoints }, // Breakpoints
	globalStyles,
	badgeStyles, // badge styles
	buttonStyles, // button styles
	linkStyles, // link styles
	progressStyles, // progress styles
	sliderStyles, // slider styles
	inputStyles, // input styles
	textareaStyles, // textarea styles
	switchStyles, // switch styles
	CardComponent, // card component
	{
		config: {
			initialColorMode: 'light',
			useSystemColorMode: false,
		},
		// Use standard Chakra z-indices to avoid conflicts
		zIndices: {
			modal: 1400,
			popover: 1500,
			tooltip: 1600,
			toast: 1700,
			dropdown: 1000,
		},
		components: {
			Modal: {
				baseStyle: {
					overlay: {
						bg: 'blackAlpha.600',
						backdropFilter: 'blur(10px)',
					},
					dialog: {
						bg: 'white',
						_dark: {
							bg: 'navy.800',
						},
					},
				},
			},
		},
	}
);

export interface CustomCardProps extends HTMLChakraProps<'div'>, ThemingProps {}
