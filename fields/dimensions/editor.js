( function () {
	if ( typeof window === 'undefined' ) {
		return;
	}

	const canInit = () => {
		return !!(
			window.blockstudio &&
			typeof window.blockstudio.registerFieldType === 'function' &&
			window.wp &&
			window.wp.element &&
			window.wp.components
		);
	};

	const boot = () => {
		if ( ! canInit() ) {
			return false;
		}

		const { createElement: el, useEffect, useMemo, useRef, useState } = window.wp.element;
		const { Button, ButtonGroup, RangeControl, ToggleControl } =
			window.wp.components;

		const DEFAULT_SIDES = [ 'top', 'right', 'bottom', 'left' ];

		const svgIcon = ( paths ) => {
			return el(
				'svg',
				{
					xmlns: 'http://www.w3.org/2000/svg',
					viewBox: '0 0 24 24',
					width: 24,
					height: 24,
					'aria-hidden': true,
					focusable: false,
				},
				...paths
			);
		};

		const SIDES_BASE_PATH =
			'm7.5 6h9v-1.5h-9zm0 13.5h9v-1.5h-9zm-3-3h1.5v-9h-1.5zm13.5-9v9h1.5v-9z';

		const iconSidesAll = svgIcon( [ el( 'path', { d: SIDES_BASE_PATH } ) ] );

		const iconSidesAxial = svgIcon( [
			el( 'path', {
				d: 'M8.2 5.3h8V3.8h-8v1.5zm0 14.5h8v-1.5h-8v1.5zm3.5-6.5h1v-1h-1v1zm1-6.5h-1v.5h1v-.5zm-1 4.5h1v-1h-1v1zm0-2h1v-1h-1v1zm0 7.5h1v-.5h-1v.5zm1-2.5h-1v1h1v-1zm-8.5 1.5h1.5v-8H4.2v8zm14.5-8v8h1.5v-8h-1.5zm-5 4.5v-1h-1v1h1zm-6.5 0h.5v-1h-.5v1zm3.5-1v1h1v-1h-1zm6 1h.5v-1h-.5v1zm-8-1v1h1v-1h-1zm6 0v1h1v-1h-1z',
				fillRule: 'evenodd',
				clipRule: 'evenodd',
			} ),
		] );

		const iconSidesTop = svgIcon( [
			el( 'path', { d: SIDES_BASE_PATH, opacity: 0.25 } ),
			el( 'path', { d: 'm16.5 6h-9v-1.5h9z' } ),
		] );

		const iconSidesRight = svgIcon( [
			el( 'path', { d: SIDES_BASE_PATH, opacity: 0.25 } ),
			el( 'path', { d: 'm18 16.5v-9h1.5v9z' } ),
		] );

		const iconSidesBottom = svgIcon( [
			el( 'path', { d: SIDES_BASE_PATH, opacity: 0.25 } ),
			el( 'path', { d: 'm16.5 19.5h-9v-1.5h9z' } ),
		] );

		const iconSidesLeft = svgIcon( [
			el( 'path', { d: SIDES_BASE_PATH, opacity: 0.25 } ),
			el( 'path', { d: 'm4.5 16.5v-9h1.5v9z' } ),
		] );

		const iconSidesHorizontal = svgIcon( [
			el( 'path', { d: SIDES_BASE_PATH, opacity: 0.25 } ),
			el( 'path', { d: 'm4.5 7.5v9h1.5v-9z' } ),
			el( 'path', { d: 'm18 7.5v9h1.5v-9z' } ),
		] );

		const iconSidesVertical = svgIcon( [
			el( 'path', { d: SIDES_BASE_PATH, opacity: 0.25 } ),
			el( 'path', { d: 'm7.5 6h9v-1.5h-9z' } ),
			el( 'path', { d: 'm7.5 19.5h9v-1.5h-9z' } ),
		] );

		const MODE_ICONS = {
			single: iconSidesAll,
			axial: iconSidesAxial,
			custom: iconSidesAll,
		};

		const SIDE_ICONS = {
			top: iconSidesTop,
			right: iconSidesRight,
			bottom: iconSidesBottom,
			left: iconSidesLeft,
			horizontal: iconSidesHorizontal,
			vertical: iconSidesVertical,
		};

		const getSpacingScale = ( spacingScale ) => {
			if ( ! Array.isArray( spacingScale ) ) {
				return [];
			}

			return spacingScale.filter(
				( option ) =>
					typeof option?.value === 'string' &&
					typeof option?.label === 'string'
			);
		};

		const toDimensionsValue = ( value ) => {
			if ( value && typeof value === 'object' && ! Array.isArray( value ) ) {
				return value;
			}

			return {};
		};

		const hasVertical = ( sides ) => {
			return (
				sides.includes( 'vertical' ) ||
				( sides.includes( 'top' ) && sides.includes( 'bottom' ) )
			);
		};

		const hasHorizontal = ( sides ) => {
			return (
				sides.includes( 'horizontal' ) ||
				( sides.includes( 'left' ) && sides.includes( 'right' ) )
			);
		};

		const isSingleAxis = ( sides ) => hasVertical( sides ) !== hasHorizontal( sides );

		const getInitialMode = ( sides ) => {
			if ( hasVertical( sides ) || hasHorizontal( sides ) ) {
				return 'axial';
			}

			if ( sides.length <= 1 ) {
				return 'single';
			}

			return 'custom';
		};

		const getSideValue = ( value, side ) => {
			if ( side === 'vertical' ) {
				return value.top && value.top === value.bottom ? value.top : '';
			}

			if ( side === 'horizontal' ) {
				return value.left && value.left === value.right ? value.left : '';
			}

			return value[ side ] || '';
		};

		const setSideValue = ( value, side, nextValue ) => {
			if ( side === 'vertical' ) {
				return {
					...value,
					top: nextValue,
					bottom: nextValue,
				};
			}

			if ( side === 'horizontal' ) {
				return {
					...value,
					left: nextValue,
					right: nextValue,
				};
			}

			return {
				...value,
				[ side ]: nextValue,
			};
		};

		const getInitialUiState = ( sides, value ) => {
			const fallbackMode = getInitialMode( sides );
			const normalizedValue = toDimensionsValue( value );
			const top = normalizedValue.top || '';
			const right = normalizedValue.right || '';
			const bottom = normalizedValue.bottom || '';
			const left = normalizedValue.left || '';

			if ( isSingleAxis( sides ) ) {
				if ( hasVertical( sides ) ) {
					const linked = top === bottom;
					return {
						mode: linked ? 'axial' : 'custom',
						linked,
						linkedMode: 'axial',
					};
				}

				if ( hasHorizontal( sides ) ) {
					const linked = left === right;
					return {
						mode: linked ? 'axial' : 'custom',
						linked,
						linkedMode: 'axial',
					};
				}
			}

			if ( hasVertical( sides ) && hasHorizontal( sides ) ) {
				const allEqual = top === right && right === bottom && bottom === left;
				const axialEqual = top === bottom && left === right;

				if ( allEqual ) {
					return {
						mode: 'single',
						linked: true,
						linkedMode: 'single',
					};
				}

				if ( axialEqual ) {
					return {
						mode: 'axial',
						linked: true,
						linkedMode: 'axial',
					};
				}

				return {
					mode: 'custom',
					linked: false,
					linkedMode: 'axial',
				};
			}

			return {
				mode: fallbackMode,
				linked: fallbackMode !== 'custom',
				linkedMode: fallbackMode === 'custom' ? 'axial' : fallbackMode,
			};
		};

		window.blockstudio.registerFieldType( 'blockstudio-fields/dimensions', {
			component: function DimensionsField( props ) {
				const spacingScale = getSpacingScale( props?.spacingScale );
				if ( spacingScale.length === 0 ) {
					return null;
				}

				const onChange =
					typeof props?.onChange === 'function' ? props.onChange : null;
				const sides =
					Array.isArray( props?.sides ) && props.sides.length > 0
						? props.sides
						: DEFAULT_SIDES;
				const defaultValue =
					props?.defaultValue &&
					typeof props.defaultValue === 'object' &&
					! Array.isArray( props.defaultValue )
						? props.defaultValue
						: null;
				const hasDefaultValue = null !== defaultValue;
				const hasObjectValue =
					props?.value && typeof props.value === 'object' && ! Array.isArray( props.value );
				const effectiveValue = hasObjectValue ? props.value : props?.value;
				const initialUiState = getInitialUiState( sides, effectiveValue );
				const [ mode, setMode ] = useState( initialUiState.mode );
				const [ linked, setLinked ] = useState( initialUiState.linked );
				const [ linkedMode, setLinkedMode ] = useState( initialUiState.linkedMode );
				const didInitDefault = useRef( false );
				const defaultInitAttempts = useRef( 0 );

				useEffect( () => {
					if ( didInitDefault.current || ! onChange ) {
						return;
					}

					if ( ! hasDefaultValue || hasObjectValue ) {
						didInitDefault.current = true;
						return;
					}

					if ( defaultInitAttempts.current >= 5 ) {
						didInitDefault.current = true;
						return;
					}

					defaultInitAttempts.current += 1;

					if ( ! hasObjectValue ) {
						onChange?.( defaultValue );
					}
				}, [ hasObjectValue, hasDefaultValue, defaultValue, onChange ] );

				const availableModes = useMemo( () => {
					const modes = [ 'single' ];

					if ( hasVertical( sides ) || hasHorizontal( sides ) ) {
						modes.push( 'axial' );
					}

					if ( sides.length > 1 ) {
						modes.push( 'custom' );
					}

					return modes;
				}, [ sides ] );

				const currentValue = toDimensionsValue( effectiveValue );
				const indexMarks = spacingScale.map( ( option, index ) => ( {
					value: index,
					label: option.label,
				} ) );

				const getSlugByIndex = ( index ) => spacingScale[ index ]?.value || '';
				const getIndexBySlug = ( slug ) => {
					const index = spacingScale.findIndex(
						( option ) => option.value === slug
					);
					return index >= 0 ? index : 0;
				};

				const setModeWithLinkedState = ( nextMode ) => {
					if ( nextMode !== 'custom' ) {
						setLinkedMode( nextMode );
						setLinked( true );
					} else {
						setLinked( false );
					}

					setMode( nextMode );
				};

				const toggleLinked = ( nextLinked ) => {
					setLinked( nextLinked );

					if ( nextLinked ) {
						setMode( linkedMode === 'custom' ? 'axial' : linkedMode );
					} else {
						setMode( 'custom' );
					}
				};

				const axisSides = [
					...( hasVertical( sides ) ? [ 'vertical' ] : [] ),
					...( hasHorizontal( sides ) ? [ 'horizontal' ] : [] ),
				];

				const customSides = sides.filter( ( side ) =>
					[ 'top', 'right', 'bottom', 'left', 'horizontal', 'vertical' ].includes(
						side
					)
				);

				const controlsByMode = {
					single: [ 'top' ],
					axial: axisSides.length > 0 ? axisSides : [ 'top' ],
					custom: customSides.length > 0 ? customSides : DEFAULT_SIDES,
				};

				const selectedSides = controlsByMode[ mode ] || controlsByMode.single;
				const showModeSelector = ! isSingleAxis( sides ) && availableModes.length > 1;

				return el(
					'div',
					{ className: 'blockstudio-dimensions' },
					el(
						'div',
						{ className: 'blockstudio-dimensions__header' },
						showModeSelector
							? el(
								ButtonGroup,
								{ className: 'blockstudio-dimensions__modes' },
								availableModes.map( ( availableMode ) =>
									el( Button, {
										key: availableMode,
										variant:
											mode === availableMode ? 'primary' : 'secondary',
										icon: MODE_ICONS[ availableMode ],
										onClick: () => setModeWithLinkedState( availableMode ),
										children: null,
									} )
								)
							)
							: null,
						! showModeSelector
							? el(
								'div',
								{ className: 'blockstudio-dimensions__linked' },
								el( ToggleControl, {
									label: 'Linked',
									checked: linked,
									onChange: ( nextLinked ) =>
										toggleLinked( Boolean( nextLinked ) ),
								} )
							)
							: null
					),
					el(
						'div',
						{ className: 'blockstudio-dimensions__controls' },
						selectedSides.map( ( side ) => {
							const currentSlug =
								mode === 'single'
									? getSideValue( currentValue, 'top' )
									: getSideValue( currentValue, side );

							return el(
								'div',
								{ key: side, className: 'blockstudio-dimensions__control' },
								el( Button, {
									className: 'blockstudio-dimensions__side-icon',
									variant: 'tertiary',
									icon: SIDE_ICONS[ side ],
									disabled: true,
									children: null,
								} ),
								el(
									'div',
									{ className: 'blockstudio-dimensions__slider' },
									el( RangeControl, {
										value: getIndexBySlug( currentSlug ),
										min: 0,
										max: Math.max( 0, spacingScale.length - 1 ),
										step: 1,
										marks: indexMarks,
										withInputField: false,
										__next40pxDefaultSize: true,
										onChange: ( nextIndex ) => {
											if ( typeof nextIndex !== 'number' ) {
												return;
											}

											const nextSlug = getSlugByIndex( nextIndex );

											if ( mode === 'single' ) {
												onChange?.( {
													top: nextSlug,
													right: nextSlug,
													bottom: nextSlug,
													left: nextSlug,
												} );
												return;
											}

											onChange?.(
												setSideValue( currentValue, side, nextSlug )
											);
										},
										label: undefined,
										help: false,
										className: 'components-base-control',
									} )
								),
								el(
									'span',
									{ className: 'blockstudio-dimensions__slug' },
									spacingScale.find(
										( option ) => option.value === currentSlug
									)?.label || 'Default'
								)
							);
						} )
					),
					el( Button, {
						className: 'blockstudio-dimensions__clear',
						variant: 'link',
						text: props?.clearLabel || 'Clear',
						onClick: () => onChange?.( hasDefaultValue ? defaultValue : null ),
					} )
				);
			},
			normalizer: function ( context ) {
				return {
					...context.allProps,
					spacingScale: context.item?.spacingScale,
					sides: context.item?.sides,
					clearLabel: context.item?.clearLabel,
					defaultValue: context.item?.default,
				};
			},
		} );

		return true;
	};

	if ( boot() ) {
		return;
	}

	let attempts = 0;
	const maxAttempts = 40;
	const interval = window.setInterval( () => {
		attempts += 1;

		if ( boot() || attempts >= maxAttempts ) {
			window.clearInterval( interval );
		}
	}, 50 );
} )();
