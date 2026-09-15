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

		const { createElement: el, useEffect, useRef } = window.wp.element;
		const {
			__experimentalUnitControl: UnitControl,
			SelectControl,
		} = window.wp.components;

		const DEFAULT_UNITS = [
			{ value: 'px', label: 'px' },
			{ value: 'rem', label: 'rem' },
			{ value: 'em', label: 'em' },
			{ value: '%', label: '%' },
		];

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

		window.blockstudio.registerFieldType( 'blockstudio-fields/dimension-single', {
			component: function DimensionSingleField( props ) {
				const defaultValue =
					typeof props?.defaultValue === 'string' ? props.defaultValue : '';
				const value = typeof props?.value === 'string' ? props.value : '';
				const onChange =
					typeof props?.onChange === 'function' ? props.onChange : null;
				const spacingScale = getSpacingScale( props?.spacingScale );
				const didInitDefault = useRef( false );
				const defaultInitAttempts = useRef( 0 );

				useEffect( () => {
					if ( didInitDefault.current || ! onChange ) {
						return;
					}

					if ( defaultValue === '' || value !== '' ) {
						didInitDefault.current = true;
						return;
					}

					if ( defaultInitAttempts.current >= 5 ) {
						didInitDefault.current = true;
						return;
					}

					defaultInitAttempts.current += 1;

					if ( value === '' ) {
						onChange?.( defaultValue );
					}
				}, [ value, defaultValue, onChange ] );

				if ( spacingScale.length > 0 ) {
					return el( SelectControl, {
						label: '',
						value,
						options: spacingScale,
						__next40pxDefaultSize: true,
						onChange: ( nextValue ) => onChange?.( nextValue || '' ),
					} );
				}

				if ( typeof UnitControl !== 'function' ) {
					return el( 'input', {
						type: 'text',
						value,
						onChange: ( event ) => onChange?.( event.target.value || '' ),
					} );
				}

				const units =
					Array.isArray( props?.units ) && props.units.length > 0
						? props.units
						: DEFAULT_UNITS;

				return el( UnitControl, {
					label: false,
					value,
					units,
					onChange: ( nextValue ) => onChange?.( nextValue || '' ),
				} );
			},
			normalizer: function ( context ) {
				return {
					...context.allProps,
					spacingScale: context.item?.spacingScale,
					units: context.item?.units,
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
