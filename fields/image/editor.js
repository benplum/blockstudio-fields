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
      window.wp.media
    );
  };

  const toFiniteNumber = ( value ) => {
    if ( value === null || typeof value === 'undefined' || value === '' ) {
      return null;
    }

    const parsed = Number( value );
    return Number.isFinite( parsed ) ? parsed : null;
  };

  const normalizeConstraint = ( value ) => {
    const parsed = toFiniteNumber( value );

    if ( parsed === null || parsed < 0 ) {
      return null;
    }

    return parsed;
  };

  const hasValue = ( value ) => {
    if ( value === null || typeof value === 'undefined' || value === '' ) {
      return false;
    }

    if ( Array.isArray( value ) ) {
      return value.length > 0;
    }

    if ( typeof value === 'object' ) {
      return Object.keys( value ).length > 0;
    }

    return true;
  };

  const normalizeMediaObject = ( media ) => {
    if ( ! media || typeof media !== 'object' ) {
      return null;
    }

    const width =
      toFiniteNumber( media.width ) ??
      toFiniteNumber( media?.media_details?.width ) ??
      toFiniteNumber( media?.sizes?.full?.width );
    const height =
      toFiniteNumber( media.height ) ??
      toFiniteNumber( media?.media_details?.height ) ??
      toFiniteNumber( media?.sizes?.full?.height );

    return {
      id: toFiniteNumber( media.id ) ?? null,
      url: String( media.url || media.source_url || '' ),
      alt: String( media.alt || media.alt_text || '' ),
      title: String( media.title || media.filename || '' ),
      width,
      height,
    };
  };

  const normalizeStoredId = ( value ) => {
    if ( typeof value === 'number' ) {
      return value;
    }

    if ( value && typeof value === 'object' ) {
      return toFiniteNumber( value.id );
    }

    return toFiniteNumber( value );
  };

  const validateDimensions = ( image, constraints ) => {
    const messages = [];
    const width = image?.width;
    const height = image?.height;

    const {
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
    } = constraints;

    if (
      ( minWidth !== null || maxWidth !== null || minHeight !== null || maxHeight !== null ) &&
      ( width === null || height === null )
    ) {
      messages.push( 'Selected image has no readable dimensions.' );
      return messages;
    }

    if ( minWidth !== null && width < minWidth ) {
      messages.push( `Minimum width is ${ minWidth }px.` );
    }

    if ( maxWidth !== null && width > maxWidth ) {
      messages.push( `Maximum width is ${ maxWidth }px.` );
    }

    if ( minHeight !== null && height < minHeight ) {
      messages.push( `Minimum height is ${ minHeight }px.` );
    }

    if ( maxHeight !== null && height > maxHeight ) {
      messages.push( `Maximum height is ${ maxHeight }px.` );
    }

    return messages;
  };

  const getPreviewUrl = ( value, resolvedMedia ) => {
    const valueThumbnailUrl = value?.sizes?.thumbnail?.url;
    if ( typeof valueThumbnailUrl === 'string' && valueThumbnailUrl ) {
      return valueThumbnailUrl;
    }

    const mediaThumbnailUrl =
      resolvedMedia?.media_details?.sizes?.thumbnail?.source_url;
    if ( typeof mediaThumbnailUrl === 'string' && mediaThumbnailUrl ) {
      return mediaThumbnailUrl;
    }

    if ( value && typeof value === 'object' && typeof value.url === 'string' ) {
      return value.url;
    }

    if ( typeof value === 'string' ) {
      return value;
    }

    if ( resolvedMedia && typeof resolvedMedia.source_url === 'string' ) {
      return resolvedMedia.source_url;
    }

    return '';
  };

  const getPreviewSize = ( value, resolvedMedia ) => {
    const thumbWidth =
      toFiniteNumber( value?.sizes?.thumbnail?.width ) ??
      toFiniteNumber( resolvedMedia?.media_details?.sizes?.thumbnail?.width );
    const thumbHeight =
      toFiniteNumber( value?.sizes?.thumbnail?.height ) ??
      toFiniteNumber( resolvedMedia?.media_details?.sizes?.thumbnail?.height );

    if ( thumbWidth !== null && thumbHeight !== null ) {
      return `${ thumbWidth }x${ thumbHeight }`;
    }

    const width =
      toFiniteNumber( value?.width ) ?? toFiniteNumber( resolvedMedia?.media_details?.width );
    const height =
      toFiniteNumber( value?.height ) ?? toFiniteNumber( resolvedMedia?.media_details?.height );

    if ( width === null || height === null ) {
      return '';
    }

    return `${ width }x${ height }`;
  };

  const getPreviewName = ( value, resolvedMedia ) => {
    const valueName =
      value?.filename ||
      value?.name ||
      value?.title;

    if ( typeof valueName === 'string' && valueName ) {
      return valueName;
    }

    const mediaName =
      resolvedMedia?.filename ||
      resolvedMedia?.media_details?.file?.split( '/' )?.pop() ||
      resolvedMedia?.title?.rendered ||
      resolvedMedia?.title;

    if ( typeof mediaName === 'string' && mediaName ) {
      return mediaName;
    }

    return '';
  };

  const toStoredValue = ( mediaObject ) => {
    if ( ! mediaObject ) {
      return null;
    }

    return toFiniteNumber( mediaObject.id );
  };

  const createErrorNotice = ( message ) => {
    const dispatch = window?.wp?.data?.dispatch;

    if ( ! dispatch ) {
      return;
    }

    const notices = dispatch( 'core/notices' );

    if ( notices && typeof notices.createErrorNotice === 'function' ) {
      notices.createErrorNotice( message, { type: 'snackbar' } );
    }
  };

  const boot = () => {
    if ( ! canInit() ) {
      return false;
    }

    const { createElement: el, useEffect, useMemo, useRef, useState } = window.wp.element;
    const { Button, Notice } = window.wp.components;
    const { useSelect } = window.wp.data;

    window.blockstudio.registerFieldType( 'blockstudio-fields/image', {
      component: function ImageField( props ) {
        const onChange =
          typeof props?.onChange === 'function' ? props.onChange : null;
        const value = props?.value;

        const constraints = useMemo(
          () => ( {
            minWidth: normalizeConstraint( props?.minWidth ),
            maxWidth: normalizeConstraint( props?.maxWidth ),
            minHeight: normalizeConstraint( props?.minHeight ),
            maxHeight: normalizeConstraint( props?.maxHeight ),
          } ),
          [ props?.minWidth, props?.maxWidth, props?.minHeight, props?.maxHeight ]
        );

        const currentId = useMemo( () => {
          if ( typeof value === 'number' ) {
            return value;
          }

          if ( value && typeof value === 'object' && toFiniteNumber( value.id ) ) {
            return toFiniteNumber( value.id );
          }

          return null;
        }, [ value ] );

        const resolvedMedia = useSelect(
          ( select ) => {
            if ( ! currentId ) {
              return null;
            }

            return select( 'core' ).getMedia( currentId );
          },
          [ currentId ]
        );

        const previewUrl = getPreviewUrl( value, resolvedMedia );
        const previewName = getPreviewName( value, resolvedMedia );
        const previewSize = getPreviewSize( value, resolvedMedia );

        const didInitDefault = useRef( false );
        const defaultInitAttempts = useRef( 0 );
        const frameRef = useRef( null );
        const [ validationError, setValidationError ] = useState( '' );

        useEffect( () => {
          if ( didInitDefault.current || ! onChange ) {
            return;
          }

          if ( hasValue( value ) || ! hasValue( props?.defaultValue ) ) {
            didInitDefault.current = true;
            return;
          }

          if ( defaultInitAttempts.current >= 5 ) {
            didInitDefault.current = true;
            return;
          }

          defaultInitAttempts.current += 1;
          onChange( normalizeStoredId( props.defaultValue ) );
        }, [ value, props?.defaultValue, onChange ] );

        useEffect( () => {
          return () => {
            if ( frameRef.current && typeof frameRef.current.remove === 'function' ) {
              frameRef.current.remove();
            }

            frameRef.current = null;
          };
        }, [] );

        const onSelectMedia = ( media ) => {
          const mediaObject = normalizeMediaObject( media );

          if ( ! mediaObject ) {
            return;
          }

          const messages = validateDimensions( mediaObject, constraints );

          if ( messages.length > 0 ) {
            const errorMessage = `Image does not match constraints: ${ messages.join( ' ' ) }`;
            setValidationError( errorMessage );
            createErrorNotice( errorMessage );
            return;
          }

          setValidationError( '' );
          onChange?.( toStoredValue( mediaObject ) );
        };

        const openFrame = () => {
          const mediaApi = window?.wp?.media;

          if ( ! mediaApi || typeof mediaApi !== 'function' ) {
            return;
          }

          if ( frameRef.current && typeof frameRef.current.remove === 'function' ) {
            frameRef.current.remove();
            frameRef.current = null;
          }

          const frame = mediaApi( {
            title: props?.title || 'Select image',
            library: { type: 'image' },
            multiple: false,
            button: {
              text: previewUrl
                ? props?.replaceButtonLabel || 'Replace image'
                : props?.buttonLabel || 'Select image',
            },
          } );

          const getFrameState = () => {
            if ( ! frame || typeof frame.state !== 'function' ) {
              return null;
            }

            return frame.state() || null;
          };

          const getLibrary = () => {
            const state = getFrameState();

            if ( ! state || typeof state.get !== 'function' ) {
              return null;
            }

            return state.get( 'library' ) || null;
          };

          const pruneModel = ( model ) => {
            const library = getLibrary();

            if ( ! library || typeof library.remove !== 'function' ) {
              return;
            }

            const data = typeof model?.toJSON === 'function' ? model.toJSON() : model;
            const mediaObject = normalizeMediaObject( data );

            if ( ! mediaObject ) {
              return;
            }

            const messages = validateDimensions( mediaObject, constraints );

            if ( messages.length > 0 ) {
              library.remove( model );
            }
          };

          const pruneLibrary = () => {
            const library = getLibrary();

            if ( ! library || typeof library.each !== 'function' ) {
              return;
            }

            library.each( pruneModel );
          };

          frame.on( 'open', () => {
            const library = getLibrary();

            pruneLibrary();

            if ( library ) {
              library.on( 'add', pruneModel );
              library.on( 'reset', pruneLibrary );
            }

            if ( currentId ) {
              const state = getFrameState();
              const selection =
                state && typeof state.get === 'function'
                  ? state.get( 'selection' )
                  : null;
              const attachment = mediaApi.attachment( currentId );

              if ( selection && attachment ) {
                selection.reset( [ attachment ] );
              }
            }
          } );

          frame.on( 'close', () => {
            const library = getLibrary();

            if ( library ) {
              library.off( 'add', pruneModel );
              library.off( 'reset', pruneLibrary );
            }
          } );

          frame.on( 'select', () => {
            const state = getFrameState();
            const selection =
              state && typeof state.get === 'function'
                ? state.get( 'selection' )
                : null;
            const selected = selection && typeof selection.first === 'function'
              ? selection.first()
              : null;
            const selectedData = selected && typeof selected.toJSON === 'function'
              ? selected.toJSON()
              : null;

            if ( ! selectedData ) {
              return;
            }

            onSelectMedia( selectedData );
          } );

          frameRef.current = frame;
          frame.open();
        };

        return el(
          'div',
          { className: 'blockstudio-image-field' },
          validationError
            ? el( Notice, { status: 'error', isDismissible: false }, validationError )
            : null,
          previewUrl
            ? el(
                'div',
                {
                  className: 'blockstudio-image-field__preview',
                  style: {
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  },
                },
                el( 'img', {
                  src: previewUrl,
                  alt: '',
                  style: {
                    display: 'block',
                    flexShrink: 0,
                    width: '80px',
                    height: '80px',
                    objectFit: 'cover'
                  },
                } ),
                el(
                  'div',
                  {
                    className: 'blockstudio-image-field__details',
                    style: {
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    },
                  },
                  previewName
                    ? el(
                        'div',
                        {
                          className: 'blockstudio-image-field__name',
                          style: {
                            color: '#1e1e1e',
                            fontSize: '13px',
                            fontWeight: '500',
                            lineHeight: 1.3,
                            wordBreak: 'break-word',
                          },
                        },
                        previewName
                      )
                    : null,
                  // previewSize
                  //   ? el(
                  //       'div',
                  //       {
                  //         className: 'blockstudio-image-field__meta',
                  //         style: {
                  //           color: '#646970',
                  //           fontSize: '12px',
                  //         },
                  //       },
                  //       `${ previewSize } px`
                  //     )
                  //   : null
                )
              )
            : null,
          el( Button, {
            variant: 'secondary',
            onClick: openFrame,
            text: previewUrl
              ? props?.replaceButtonLabel || 'Replace Image'
              : props?.buttonLabel || 'Open Media Library',
          } ),
          hasValue( value )
            ? el( Button, {
                variant: 'link',
                isDestructive: true,
                style: { marginLeft: '8px' },
                text: props?.removeButtonLabel || 'Remove',
                onClick: () => {
                  setValidationError( '' );
                  onChange?.( null );
                },
              } )
            : null
        );
      },
      normalizer: function ( context ) {
        return {
          ...context.allProps,
          minWidth: context.item?.minWidth,
          maxWidth: context.item?.maxWidth,
          minHeight: context.item?.minHeight,
          maxHeight: context.item?.maxHeight,
          defaultValue: context.item?.default,
          title: context.item?.title,
          buttonLabel: context.item?.textMediaButton,
          replaceButtonLabel: context.item?.textReplaceButton,
          removeButtonLabel: context.item?.textRemoveButton,
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
