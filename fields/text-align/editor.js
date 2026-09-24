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
      window.wp.components &&
      window.wp.data
    );
  };

  const boot = () => {
    if ( ! canInit() ) {
      return false;
    }

    const { createElement: el, useEffect, useRef } = window.wp.element;
    const { Button, ButtonGroup, TabPanel } = window.wp.components;
    const { useDispatch, useSelect } = window.wp.data;

    // "desktop" isn't a tier this field stores itself — it reads/writes the
    // block's own native `textAlign` attribute (the same one the toolbar's
    // alignment control uses) so there's a single source of truth instead
    // of a shadow copy that can drift. "tablet"/"mobile" are this field's
    // own overrides.
    // Same dashicons WordPress's own Customizer responsive-preview switcher
    // uses for these three device tiers.
    const TABS = [
      { name: 'desktop', title: 'Desktop', icon: 'desktop' },
      { name: 'tablet', title: 'Tablet', icon: 'tablet' },
      { name: 'mobile', title: 'Mobile', icon: 'smartphone' },
    ];

    const STANDARD_ALIGN_OPTIONS = [
      { value: 'left', label: 'Align text left', icon: 'editor-alignleft' },
      { value: 'center', label: 'Align text center', icon: 'editor-aligncenter' },
      { value: 'right', label: 'Align text right', icon: 'editor-alignright' },
      { value: 'justify', label: 'Align text justify', icon: 'editor-justify' },
    ];

    const toAlignValue = ( value ) => {
      return String( value || '' )
        .trim()
        .toLowerCase();
    };

    const normalizeAlignOptions = ( options ) => {
      if ( ! Array.isArray( options ) || options.length === 0 ) {
        return STANDARD_ALIGN_OPTIONS;
      }

      return options
        .map( ( option ) => {
          if ( ! option || typeof option !== 'object' ) {
            return null;
          }

          const optionValue = toAlignValue( option.value || option.key );
          if ( optionValue === '' ) {
            return null;
          }

          const standard = STANDARD_ALIGN_OPTIONS.find(
            ( standardOption ) => standardOption.value === optionValue
          );

          return {
            value: optionValue,
            label: String( option.label || option.name || standard?.label || optionValue ),
            icon: standard?.icon,
          };
        } )
        .filter( Boolean );
    };

    const toTextAlignValue = ( value ) => {
      if ( value && typeof value === 'object' && ! Array.isArray( value ) ) {
        return value;
      }

      return {};
    };

    window.blockstudio.registerFieldType( 'blockstudio-fields/text-align', {
      component: function TextAlignField( props ) {
        const options = normalizeAlignOptions( props?.options );
        if ( options.length === 0 ) {
          return null;
        }

        const clientId = props?.clientId || null;
        const clearLabel = props?.clearLabel || 'Clear';

        // Desktop: the block's own native attribute, not ours.
        const nativeTextAlign = useSelect(
          ( select ) => {
            if ( ! clientId ) {
              return '';
            }

            const blockAttributes = select( 'core/block-editor' ).getBlockAttributes( clientId );
            return typeof blockAttributes?.textAlign === 'string' ? blockAttributes.textAlign : '';
          },
          [ clientId ]
        );
        const { updateBlockAttributes } = useDispatch( 'core/block-editor' );
        const setNativeTextAlign = ( nextValue ) => {
          if ( ! clientId ) {
            return;
          }

          updateBlockAttributes( clientId, { textAlign: nextValue } );
        };

        // Tablet / mobile: this field's own attribute.
        const onChange =
          typeof props?.onChange === 'function' ? props.onChange : null;
        const hasObjectValue =
          props?.value && typeof props.value === 'object' && ! Array.isArray( props.value );
        const currentValue = toTextAlignValue( hasObjectValue ? props.value : props?.value );
        const defaultValue =
          props?.defaultValue &&
          typeof props.defaultValue === 'object' &&
          ! Array.isArray( props.defaultValue )
            ? props.defaultValue
            : null;
        const hasDefaultValue = null !== defaultValue;
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

        const getTierValue = ( tierKey ) => {
          const raw = currentValue[ tierKey ];
          return typeof raw === 'string' ? raw : '';
        };

        const getTierDefault = ( tierKey ) => {
          if ( ! hasDefaultValue ) {
            return '';
          }

          const raw = defaultValue[ tierKey ];
          return typeof raw === 'string' ? raw : '';
        };

        const setTierValue = ( tierKey, nextValue ) => {
          onChange?.( { ...currentValue, [ tierKey ]: nextValue } );
        };

        const renderOptions = ( activeValue, onPick ) => {
          return el(
            ButtonGroup,
            { className: 'blockstudio-text-align__buttons' },
            options.map( ( option ) =>
              el( Button, {
                key: option.value,
                icon: option.icon,
                label: option.label,
                showTooltip: true,
                isPressed: activeValue === option.value,
                className: `blockstudio-text-align__button option-${ option.value }`,
                onClick: () => onPick( option.value ),
              } )
            )
          );
        };

        return el(
          TabPanel,
          {
            className: 'blockstudio-text-align',
            tabs: TABS,
          },
          ( tab ) => {
            const isDesktop = tab.name === 'desktop';
            const activeValue = isDesktop
              ? nativeTextAlign
              : getTierValue( tab.name );
            const onPick = isDesktop
              ? setNativeTextAlign
              : ( nextValue ) => setTierValue( tab.name, nextValue );
            const onClear = isDesktop
              ? () => setNativeTextAlign( '' )
              : () => setTierValue( tab.name, getTierDefault( tab.name ) );

            return el(
              'div',
              { className: 'blockstudio-text-align__row' },
              renderOptions( activeValue, onPick ),
              el( Button, {
                className: 'blockstudio-text-align__clear',
                variant: 'link',
                text: clearLabel,
                onClick: onClear,
              } )
            );
          }
        );
      },
      normalizer: function ( context ) {
        return {
          ...context.allProps,
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
