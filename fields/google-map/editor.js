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

  const DEFAULT_ZOOM = 12;
  const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 };

  let googleMapsLoadPromise = null;

  const toFiniteNumber = ( value ) => {
    if ( value === null || typeof value === 'undefined' || value === '' ) {
      return null;
    }

    const parsed = Number( value );
    return Number.isFinite( parsed ) ? parsed : null;
  };

  const hasValue = ( value ) => {
    if ( value === null || typeof value === 'undefined' || value === '' ) {
      return false;
    }

    if ( typeof value === 'object' ) {
      return Object.keys( value ).length > 0;
    }

    return true;
  };

  const normalizeLocation = ( value ) => {
    if ( ! value || typeof value !== 'object' || Array.isArray( value ) ) {
      return {};
    }

    const normalized = { ...value };

    const lat = toFiniteNumber( value.lat );
    const lng = toFiniteNumber( value.lng );
    const zoom = toFiniteNumber( value.zoom );

    if ( lat !== null ) {
      normalized.lat = lat;
    }

    if ( lng !== null ) {
      normalized.lng = lng;
    }

    if ( zoom !== null ) {
      normalized.zoom = zoom;
    }

    return normalized;
  };

  const getConfig = () => {
    const fromWindow = window.blockstudioFieldsGoogleMap || {};

    return {
      apiKey:
        fromWindow.apiKey ||
        window.blockstudioFieldsGoogleMapApiKey ||
        '',
      defaultZoom:
        toFiniteNumber( fromWindow.defaultZoom ) || DEFAULT_ZOOM,
      language: typeof fromWindow.language === 'string' ? fromWindow.language : '',
      region: typeof fromWindow.region === 'string' ? fromWindow.region : '',
    };
  };

  const loadGoogleMaps = ( config ) => {
    if ( window.google && window.google.maps ) {
      return Promise.resolve( window.google.maps );
    }

    if ( ! config.apiKey ) {
      return Promise.reject( new Error( 'Missing Google Maps API key.' ) );
    }

    if ( googleMapsLoadPromise ) {
      return googleMapsLoadPromise;
    }

    googleMapsLoadPromise = new Promise( ( resolve, reject ) => {
      const callbackName = '__blockstudioFieldsGoogleMapInit';
      const scriptId = 'blockstudio-fields-google-map-api';

      if ( window[ callbackName ] ) {
        resolve( window.google.maps );
        return;
      }

      window[ callbackName ] = () => {
        resolve( window.google.maps );
        delete window[ callbackName ];
      };

      const script = document.createElement( 'script' );
      const params = new URLSearchParams( {
        key: config.apiKey,
        libraries: 'places',
        callback: callbackName,
      } );

      if ( config.language ) {
        params.set( 'language', config.language );
      }

      if ( config.region ) {
        params.set( 'region', config.region );
      }

      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?${ params.toString() }`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        reject( new Error( 'Failed to load Google Maps API.' ) );
      };

      const existing = document.getElementById( scriptId );
      if ( ! existing ) {
        document.head.appendChild( script );
      }
    } );

    return googleMapsLoadPromise;
  };

  const mapGoogleAddressComponents = ( components ) => {
    const payload = {
      street_number: '',
      street_name: '',
      city: '',
      state: '',
      state_short: '',
      post_code: '',
      country: '',
      country_short: '',
    };

    if ( ! Array.isArray( components ) ) {
      return payload;
    }

    components.forEach( ( item ) => {
      if ( ! item || ! Array.isArray( item.types ) ) {
        return;
      }

      if ( item.types.includes( 'street_number' ) ) {
        payload.street_number = item.long_name || '';
      }

      if ( item.types.includes( 'route' ) ) {
        payload.street_name = item.long_name || '';
      }

      if ( item.types.includes( 'locality' ) ) {
        payload.city = item.long_name || '';
      }

      if ( item.types.includes( 'postal_town' ) && ! payload.city ) {
        payload.city = item.long_name || '';
      }

      if ( item.types.includes( 'administrative_area_level_1' ) ) {
        payload.state = item.long_name || '';
        payload.state_short = item.short_name || '';
      }

      if ( item.types.includes( 'postal_code' ) ) {
        payload.post_code = item.long_name || '';
      }

      if ( item.types.includes( 'country' ) ) {
        payload.country = item.long_name || '';
        payload.country_short = item.short_name || '';
      }
    } );

    return payload;
  };

  const boot = () => {
    if ( ! canInit() ) {
      return false;
    }

    const { createElement: el, useEffect, useMemo, useRef, useState } = window.wp.element;
    const { Button, Notice, Spinner, TextControl } = window.wp.components;

    window.blockstudio.registerFieldType( 'blockstudio-fields/google-map', {
      component: function GoogleMapField( props ) {
        const onChange = typeof props?.onChange === 'function' ? props.onChange : null;
        const defaultValue = normalizeLocation( props?.defaultValue );
        const currentValue = normalizeLocation( props?.value );
        const didInitDefault = useRef( false );
        const defaultInitAttempts = useRef( 0 );

        const config = useMemo( () => getConfig(), [] );

        const [ mapReady, setMapReady ] = useState( false );
        const [ mapError, setMapError ] = useState( '' );
        const [ isLoading, setIsLoading ] = useState( true );

        const mapRef = useRef( null );
        const markerRef = useRef( null );
        const geocoderRef = useRef( null );
        const mapNodeRef = useRef( null );
        const inputNodeRef = useRef( null );

        useEffect( () => {
          if ( didInitDefault.current || ! onChange ) {
            return;
          }

          if ( hasValue( currentValue ) || ! hasValue( defaultValue ) ) {
            didInitDefault.current = true;
            return;
          }

          if ( defaultInitAttempts.current >= 5 ) {
            didInitDefault.current = true;
            return;
          }

          defaultInitAttempts.current += 1;
          onChange( defaultValue );
        }, [ currentValue, defaultValue, onChange ] );

        const setLocationValue = ( nextValue ) => {
          onChange?.( {
            ...currentValue,
            ...nextValue,
          } );
        };

        const applyPlaceToValue = ( place, zoomOverride ) => {
          if ( ! place || !place.geometry || !place.geometry.location ) {
            return;
          }

          const location = place.geometry.location;
          const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
          const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
          const zoom = toFiniteNumber( zoomOverride ) || mapRef.current?.getZoom() || config.defaultZoom;

          const addressComponents = mapGoogleAddressComponents( place.address_components );
          const streetAddress = [ addressComponents.street_number, addressComponents.street_name ]
            .filter( Boolean )
            .join( ' ' )
            .trim();

          setLocationValue( {
            address: place.formatted_address || currentValue.address || '',
            lat,
            lng,
            zoom,
            place_id: place.place_id || currentValue.place_id || '',
            name: place.name || currentValue.name || '',
            ...addressComponents,
            street_address: streetAddress,
          } );
        };

        const reverseGeocode = ( lat, lng ) => {
          if ( ! geocoderRef.current ) {
            return;
          }

          geocoderRef.current.geocode( { location: { lat, lng } }, ( results, status ) => {
            if ( status !== 'OK' || !Array.isArray( results ) || results.length === 0 ) {
              setLocationValue( { lat, lng } );
              return;
            }

            applyPlaceToValue( results[ 0 ] );
          } );
        };

        useEffect( () => {
          let isCancelled = false;

          const setup = async () => {
            setIsLoading( true );
            setMapError( '' );

            try {
              await loadGoogleMaps( config );
            } catch ( err ) {
              if ( isCancelled ) {
                return;
              }

              setMapError( err instanceof Error ? err.message : 'Unable to load Google Maps.' );
              setIsLoading( false );
              return;
            }

            if ( isCancelled || ! mapNodeRef.current ) {
              return;
            }

            const lat = toFiniteNumber( currentValue.lat ) ?? DEFAULT_CENTER.lat;
            const lng = toFiniteNumber( currentValue.lng ) ?? DEFAULT_CENTER.lng;
            const zoom = toFiniteNumber( currentValue.zoom ) ?? config.defaultZoom;

            mapRef.current = new window.google.maps.Map( mapNodeRef.current, {
              center: { lat, lng },
              zoom,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
            } );

            geocoderRef.current = new window.google.maps.Geocoder();

            markerRef.current = new window.google.maps.Marker( {
              position: { lat, lng },
              map: mapRef.current,
              draggable: true,
            } );

            markerRef.current.addListener( 'dragend', ( event ) => {
              const markerLat = event.latLng.lat();
              const markerLng = event.latLng.lng();
              reverseGeocode( markerLat, markerLng );
            } );

            mapRef.current.addListener( 'click', ( event ) => {
              const clickLat = event.latLng.lat();
              const clickLng = event.latLng.lng();

              markerRef.current.setPosition( { lat: clickLat, lng: clickLng } );
              reverseGeocode( clickLat, clickLng );
            } );

            if ( inputNodeRef.current ) {
              const autocomplete = new window.google.maps.places.Autocomplete( inputNodeRef.current, {
                fields: [ 'address_components', 'formatted_address', 'geometry', 'name', 'place_id' ],
              } );

              autocomplete.addListener( 'place_changed', () => {
                const place = autocomplete.getPlace();

                if ( ! place || ! place.geometry || ! place.geometry.location ) {
                  return;
                }

                const location = place.geometry.location;
                const nextLat = location.lat();
                const nextLng = location.lng();

                mapRef.current.panTo( { lat: nextLat, lng: nextLng } );
                mapRef.current.setZoom( 15 );
                markerRef.current.setPosition( { lat: nextLat, lng: nextLng } );

                applyPlaceToValue( place, 15 );
              } );
            }

            setMapReady( true );
            setIsLoading( false );
          };

          setup();

          return () => {
            isCancelled = true;

            if ( markerRef.current ) {
              markerRef.current.setMap( null );
            }

            markerRef.current = null;
            mapRef.current = null;
            geocoderRef.current = null;
          };
        }, [] );

        useEffect( () => {
          if ( ! mapReady || ! mapRef.current || ! markerRef.current ) {
            return;
          }

          const lat = toFiniteNumber( currentValue.lat );
          const lng = toFiniteNumber( currentValue.lng );
          const zoom = toFiniteNumber( currentValue.zoom );

          if ( lat !== null && lng !== null ) {
            const nextPosition = { lat, lng };
            markerRef.current.setPosition( nextPosition );
            mapRef.current.panTo( nextPosition );
          }

          if ( zoom !== null ) {
            mapRef.current.setZoom( zoom );
          }
        }, [ mapReady, currentValue.lat, currentValue.lng, currentValue.zoom ] );

        const updateLat = ( rawLat ) => {
          const lat = toFiniteNumber( rawLat );
          if ( lat === null ) {
            return;
          }

          const lng = toFiniteNumber( currentValue.lng ) ?? DEFAULT_CENTER.lng;
          reverseGeocode( lat, lng );
        };

        const updateLng = ( rawLng ) => {
          const lng = toFiniteNumber( rawLng );
          if ( lng === null ) {
            return;
          }

          const lat = toFiniteNumber( currentValue.lat ) ?? DEFAULT_CENTER.lat;
          reverseGeocode( lat, lng );
        };

        return el(
          'div',
          { className: 'blockstudio-google-map-field' },
          el( TextControl, {
            label: props?.addressLabel || 'Address',
            value: currentValue.address || '',
            placeholder: props?.addressPlaceholder || 'Search an address',
            onChange: ( address ) => {
              setLocationValue( { address } );
            },
            ref: inputNodeRef,
          } ),
          isLoading ? el( Spinner ) : null,
          mapError
            ? el(
                Notice,
                { status: 'warning', isDismissible: false },
                mapError
              )
            : null,
          el( 'div', {
            ref: mapNodeRef,
            style: {
              width: '100%',
              height: '260px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginTop: '8px',
              marginBottom: '12px',
              background: '#f6f7f7',
            },
          } ),
          el( 'div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' } },
            el( TextControl, {
              className: 'screen-reader-text',
              label: props?.latLabel || 'Latitude',
              value: typeof currentValue.lat === 'number' ? String( currentValue.lat ) : '',
              onChange: updateLat,
            } ),
            el( TextControl, {
              className: 'screen-reader-text',
              label: props?.lngLabel || 'Longitude',
              value: typeof currentValue.lng === 'number' ? String( currentValue.lng ) : '',
              onChange: updateLng,
            } ),
            el( TextControl, {
              className: 'screen-reader-text',
              label: props?.zoomLabel || 'Zoom',
              value: typeof currentValue.zoom === 'number' ? String( currentValue.zoom ) : String( config.defaultZoom ),
              onChange: ( rawZoom ) => {
                const zoom = toFiniteNumber( rawZoom );
                if ( zoom === null ) {
                  return;
                }

                setLocationValue( { zoom } );
              },
            } )
          ),
          el( Button, {
            variant: 'link',
            onClick: () => {
              onChange?.( null );
            },
            text: props?.clearLabel || 'Clear',
          } )
        );
      },
      normalizer: function ( context ) {
        return {
          ...context.allProps,
          defaultValue: context.item?.default,
          addressLabel: context.item?.addressLabel,
          addressPlaceholder: context.item?.addressPlaceholder,
          latLabel: context.item?.latLabel,
          lngLabel: context.item?.lngLabel,
          zoomLabel: context.item?.zoomLabel,
          clearLabel: context.item?.clearLabel,
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
