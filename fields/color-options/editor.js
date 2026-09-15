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

    const { createElement: el, useEffect, useRef, useState } = window.wp.element;
    const { Button, ButtonGroup, TextControl } = window.wp.components;

    const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

    const isHexColor = ( value ) => {
      return typeof value === 'string' && HEX_PATTERN.test( value.trim() );
    };

    // Loose typing normalization only - lets someone type "f60" or "ff6600"
    // without the "#" and have it treated as a hex value as they go, rather
    // than rejecting the input outright while they're still mid-edit.
    const normalizeHexInput = ( value ) => {
      const trimmed = String( value || '' ).trim();

      if ( trimmed === '' || trimmed.startsWith( '#' ) ) {
        return trimmed;
      }

      if ( /^[0-9a-f]{3,8}$/i.test( trimmed ) ) {
        return `#${ trimmed }`;
      }

      return trimmed;
    };

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

    window.blockstudio.registerFieldType( 'blockstudio-fields/color-options', {
      component: function ColorOptionsField( props ) {
        const defaultValue =
          typeof props?.defaultValue === 'string' ? props.defaultValue : '';
        const hasDefaultValue = typeof props?.defaultValue === 'string';
        const value = typeof props?.value === 'string' ? props.value : '';
        const onChange =
          typeof props?.onChange === 'function' ? props.onChange : null;
        const options = normalizeColorOptions( props?.colors || props?.options );
        const allowCustom = !! props?.allowCustom;
        const didInitDefault = useRef( false );
        const defaultInitAttempts = useRef( 0 );

        const matchedOption = options.find( ( option ) => option.value === value );
        const isCustomValue = allowCustom && value !== '' && ! matchedOption;

        // Seeds which tab starts open when a field already holds a custom
        // hex (e.g. on reload). Deliberately a one-time initializer, not a
        // synced effect - switching back to the Palette tab keeps the
        // custom value untouched, and re-deriving this from isCustomValue
        // on every render would immediately flip it back to Custom.
        const [ customOpen, setCustomOpen ] = useState( isCustomValue );

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

        if ( options.length === 0 && ! allowCustom ) {
          return null;
        }

        // Tabs only make sense when there's actually a choice between two
        // views - a preset-less field just shows the hex input directly,
        // and allowCustom:false keeps the original swatches-only layout.
        const showTabs = allowCustom && options.length > 0;

        const onSelectPalette = () => {
          setCustomOpen( false );
        };

        const onSelectCustom = () => {
          setCustomOpen( true );

          if ( ! isHexColor( value ) ) {
            onChange?.( '#000000' );
          }
        };

        const onClear = () => {
          setCustomOpen( false );
          onChange?.( hasDefaultValue ? defaultValue : '' );
        };

        const paletteLabel = props?.paletteLabel || 'Palette';
        const customLabel = props?.customLabel || 'Custom';
        const showPaletteView = options.length > 0 && ( ! allowCustom || ! customOpen );
        const showCustomView = allowCustom && ( customOpen || options.length === 0 );

        return el(
          'div',
          { className: 'blockstudio-color-options' },
          showTabs &&
            el(
              'div',
              { className: 'blockstudio-color-options__tabs', role: 'tablist' },
              el( Button, {
                role: 'tab',
                'aria-selected': ! customOpen,
                className:
                  'blockstudio-color-options__tab' +
                  ( ! customOpen ? ' is-active' : '' ),
                text: paletteLabel,
                onClick: onSelectPalette,
              } ),
              el( Button, {
                role: 'tab',
                'aria-selected': customOpen,
                className:
                  'blockstudio-color-options__tab' +
                  ( customOpen ? ' is-active' : '' ),
                text: customLabel,
                onClick: onSelectCustom,
              } )
            ),
          showPaletteView &&
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
          showCustomView &&
            el(
              'div',
              { className: 'blockstudio-color-options__custom-row' },
              el( 'span', {
                className: 'blockstudio-color-options__custom-preview',
                'aria-hidden': true,
                // An invalid/incomplete hex (mid-typing) leaves the custom
                // property effectively unset for CSS purposes, so the
                // checkerboard in editor.css shows through until it's valid.
                style: { '--blockstudio-color-options-preview': value },
              } ),
              el( TextControl, {
                className: 'blockstudio-color-options__custom-input',
                label: customLabel + ' color',
                hideLabelFromVision: true,
                value: value,
                placeholder: '#000000',
                onChange: ( next ) => onChange?.( normalizeHexInput( next ) ),
              } )
            ),
          el( Button, {
            className: 'blockstudio-color-options__clear',
            variant: 'link',
            text: props?.clearLabel || 'Clear',
            onClick: onClear,
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
          allowCustom: context.item?.allowCustom,
          customLabel: context.item?.customLabel,
          paletteLabel: context.item?.paletteLabel,
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