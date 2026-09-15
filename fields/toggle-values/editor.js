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

  const asString = ( value, fallback = '' ) => {
    if ( value === null || typeof value === 'undefined' ) {
      return fallback;
    }

    return String( value );
  };

  const normalizeToggleValue = ( rawValue, onValue, offValue ) => {
    if ( rawValue === null || typeof rawValue === 'undefined' || rawValue === '' ) {
      return '';
    }

    if ( rawValue === true ) {
      return onValue;
    }

    if ( rawValue === false ) {
      return offValue;
    }

    return String( rawValue );
  };

  const boot = () => {
    if ( ! canInit() ) {
      return false;
    }

    const { createElement: el, useEffect, useRef } = window.wp.element;
    const { ToggleControl } = window.wp.components;

    window.blockstudio.registerFieldType( 'blockstudio-fields/toggle-values', {
      component: function ToggleValuesField( props ) {
        const onChange =
          typeof props?.onChange === 'function' ? props.onChange : null;
        const onValue = asString( props?.onValue, '1' );
        const offValue = asString( props?.offValue, '0' );
        const currentValue = normalizeToggleValue( props?.value, onValue, offValue );
        const defaultValue = normalizeToggleValue(
          props?.defaultValue,
          onValue,
          offValue
        );
        const initialValue = defaultValue !== '' ? defaultValue : offValue;
        const didInitDefault = useRef( false );
        const defaultInitAttempts = useRef( 0 );

        useEffect( () => {
          if ( didInitDefault.current || ! onChange ) {
            return;
          }

          if ( currentValue !== '' ) {
            didInitDefault.current = true;
            return;
          }

          if ( defaultInitAttempts.current >= 5 ) {
            didInitDefault.current = true;
            return;
          }

          defaultInitAttempts.current += 1;

          if ( currentValue === '' ) {
            onChange( initialValue );
          }
        }, [ currentValue, initialValue, onChange ] );

        return el( ToggleControl, {
          checked: currentValue === onValue,
          onChange: ( nextChecked ) =>
            onChange?.( nextChecked ? onValue : offValue ),
          help: props?.description || undefined,
        } );
      },
      normalizer: function ( context ) {
        const item = context?.item || {};
        const values = item?.values && typeof item.values === 'object' ? item.values : {};

        return {
          ...context.allProps,
          onValue: item?.onValue ?? values?.on,
          offValue: item?.offValue ?? values?.off,
          defaultValue: item?.default,
          description: item?.description,
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
