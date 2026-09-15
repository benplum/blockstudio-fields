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

    const normalizeTextOptions = ( options ) => {
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
              };
            }

            return {
              value: optionValue,
              label: String( value || optionValue ),
            };
          } )
          .filter( Boolean );
      }

      return [];
    };

    window.blockstudio.registerFieldType( 'blockstudio-fields/text-options', {
      component: function TextOptionsField( props ) {
        const defaultValue =
          typeof props?.defaultValue === 'string' ? props.defaultValue : '';
        const hasDefaultValue = typeof props?.defaultValue === 'string';
        const value = typeof props?.value === 'string' ? props.value : '';
        const onChange =
          typeof props?.onChange === 'function' ? props.onChange : null;
        const options = normalizeTextOptions( props?.options || props?.values );
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
          { className: 'blockstudio-text-options' },
          el(
            ButtonGroup,
            { className: 'blockstudio-text-options__buttons' },
            options.map( ( option ) =>
              el(
                Button,
                {
                  key: option.value,
                  isPressed: value === option.value,
                  className: `blockstudio-text-options__button option-${ option.value }`,
                  onClick: () => onChange?.( option.value ),
                },
                el(
                  'span',
                  { className: 'blockstudio-text-options__label' },
                  option.label
                )
              )
            )
          ),
          el( Button, {
            className: 'blockstudio-text-options__clear',
            variant: 'link',
            text: props?.clearLabel || 'Clear',
            onClick: () => onChange?.( hasDefaultValue ? defaultValue : '' ),
          } )
        );
      },
      normalizer: function ( context ) {
        return {
          ...context.allProps,
          options: context.item?.options,
          values: context.item?.values,
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