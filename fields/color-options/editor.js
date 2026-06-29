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
    const { Button, ButtonGroup } = window.wp.components;

    const toOptionValue = ( value ) => {
      return String( value || '' )
        .trim()
        .toLowerCase();
    };

    const getColorValue = ( rawOption, optionValue ) => {
      if ( rawOption && typeof rawOption === 'object' ) {
        if ( typeof rawOption.color === 'string' && rawOption.color.trim() !== '' ) {
          return rawOption.color;
        }

        if ( typeof rawOption.value === 'string' && rawOption.value.trim() !== '' ) {
          return rawOption.value;
        }
      }

      return `var(--color-${ optionValue })`;
    };

    const normalizeColorOptions = ( options ) => {
      if ( Array.isArray( options ) ) {
        return options
          .map( ( option ) => {
            if ( ! option || typeof option !== 'object' ) {
              return null;
            }

            const optionValue = toOptionValue(
              option.value || option.key
            );
            if ( optionValue === '' ) {
              return null;
            }

            return {
              value: optionValue,
              label: String( option.label || option.name || optionValue ),
              color: getColorValue( option, optionValue ),
            };
          } )
          .filter( Boolean );
      }

      if ( options && typeof options === 'object' ) {
        return Object.entries( options )
          .map( ( [ key, value ] ) => {
            const optionValue = toOptionValue( key );
            if ( optionValue === '' ) {
              return null;
            }

            if ( value && typeof value === 'object' ) {
              return {
                value: optionValue,
                label: String( value.label || value.name || optionValue ),
                color: getColorValue( value, optionValue ),
              };
            }

            return {
              value: optionValue,
              label: String( value || optionValue ),
              color: getColorValue( null, optionValue ),
            };
          } )
          .filter( Boolean );
      }

      return [];
    };

    window.blockstudio.registerFieldType( 'colorOptions', {
      component: function ColorOptionsField( props ) {
        const defaultValue =
          typeof props?.defaultValue === 'string' ? props.defaultValue : '';
        const hasDefaultValue = typeof props?.defaultValue === 'string';
        const value = typeof props?.value === 'string' ? props.value : '';
        const onChange =
          typeof props?.onChange === 'function' ? props.onChange : null;
        const options = normalizeColorOptions( props?.colors || props?.options );
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

        if ( options.length === 0 ) {
          return null;
        }

        return el(
          'div',
          { className: 'blockstudio-color-options' },
          el(
            ButtonGroup,
            { className: 'blockstudio-color-options__buttons' },
            options.map( ( option ) =>
              el(
                Button,
                {
                  key: option.value,
                  isPressed: value === option.value,
                  className: `blockstudio-color-options__button color-${ option.value }`,
                  onClick: () => onChange?.( option.value ),
                  style: {
                    '--blockstudio-color-options-swatch': option.color,
                  },
                },
                el(
                  'span',
                  { className: 'blockstudio-color-options__label' },
                  option.label
                ),
                el( 'span', {
                  className: 'blockstudio-color-options__swatch',
                  'aria-hidden': true,
                } )
              )
            )
          ),
          el( Button, {
            className: 'blockstudio-color-options__clear',
            variant: 'link',
            text: props?.clearLabel || 'Clear',
            onClick: () => onChange?.( hasDefaultValue ? defaultValue : '' ),
          } )
        );
      },
      normalizer: function ( context ) {
        return {
          ...context.allProps,
          colors: context.item?.colors,
          options: context.item?.options,
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