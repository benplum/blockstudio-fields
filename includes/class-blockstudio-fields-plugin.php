<?php
/**
 * Plugin runtime.
 *
 * @package BlockstudioFields
 */

if ( ! defined( 'ABSPATH' ) ) {
	return;
}

final class Blockstudio_Fields_Plugin {
	private const VERSION = '1.1.0';

	/**
	 * @var Blockstudio_Fields_Field_Type[]
	 */
	private array $field_types = array();

	/**
	 * Plugin root path.
	 */
	private string $plugin_path;

	/**
	 * Plugin root URL.
	 */
	private string $plugin_url;

	public function __construct( string $plugin_file ) {
		$this->plugin_path = trailingslashit( plugin_dir_path( $plugin_file ) );
		$this->plugin_url  = trailingslashit( plugin_dir_url( $plugin_file ) );

		require_once $this->plugin_path . 'includes/field-types/interface-blockstudio-fields-field-type.php';
		require_once $this->plugin_path . 'includes/vendor/pw-updater.php';
		require_once $this->plugin_path . 'includes/class-blockstudio-fields-updater.php';

		new Blockstudio_Fields_Updater( $plugin_file );

		$this->field_types = $this->load_field_types();

		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ), 1 );
		add_filter( 'blockstudio/field_types', array( $this, 'register_field_types' ) );
		add_filter( 'blockstudio/blocks/render', array( $this, 'apply_set_classes_to_rendered_block' ), 20, 4 );
	}

	/**
	 * Applies class set templates from Blockstudio field definitions to rendered blocks.
	 *
	 * Blockstudio applies set templates for extensions in PHP, but custom block field sets
	 * can be missing at render time. This keeps template class output consistent.
	 *
	 * @param string $rendered_block The rendered block HTML.
	 * @param mixed  $filter_data    Block data object passed by Blockstudio.
	 * @param bool   $is_editor      Whether in editor mode.
	 * @param bool   $is_preview     Whether in preview mode.
	 * @return string
	 */
	public function apply_set_classes_to_rendered_block( $rendered_block, $filter_data, bool $is_editor, bool $is_preview ): string {
		unset( $is_editor, $is_preview );

		if ( ! is_string( $rendered_block ) || '' === trim( $rendered_block ) ) {
			return is_string( $rendered_block ) ? $rendered_block : '';
		}

		if ( ! class_exists( 'WP_HTML_Tag_Processor' ) || ! is_object( $filter_data ) ) {
			return $rendered_block;
		}

		$definitions = $filter_data->blockstudio['attributes'] ?? array();
		$values      = $filter_data->blockstudio['data']['attributes'] ?? array();

		if ( ! is_array( $definitions ) || ! is_array( $values ) || array() === $definitions ) {
			return $rendered_block;
		}

		$class_tokens = array();

		foreach ( $definitions as $definition ) {
			if ( ! is_array( $definition ) || empty( $definition['set'] ) || ! is_array( $definition['set'] ) ) {
				continue;
			}

			$field_id = isset( $definition['id'] ) && is_string( $definition['id'] ) ? $definition['id'] : '';
			if ( '' !== $field_id && array_key_exists( $field_id, $values ) ) {
				$field_value = $values[ $field_id ];
				if ( '' === $field_value || false === $field_value || ( is_array( $field_value ) && array() === $field_value ) ) {
					continue;
				}
			}

			foreach ( $definition['set'] as $set ) {
				if ( ! is_array( $set ) || 'class' !== ( $set['attribute'] ?? '' ) ) {
					continue;
				}

				$template = isset( $set['value'] ) ? (string) $set['value'] : '';
				if ( '' === $template ) {
					continue;
				}

				$resolved = $this->parse_template( $template, array( 'attributes' => $values ) );
				if ( '' === $resolved ) {
					continue;
				}

				foreach ( preg_split( '/\s+/', trim( $resolved ) ) ?: array() as $token ) {
					$token = sanitize_html_class( $token );
					if ( '' !== $token ) {
						$class_tokens[] = $token;
					}
				}
			}
		}

		$class_tokens = array_values( array_unique( $class_tokens ) );
		if ( array() === $class_tokens ) {
			return $rendered_block;
		}

		$processor = new WP_HTML_Tag_Processor( $rendered_block );
		if ( ! $processor->next_tag() ) {
			return $rendered_block;
		}

		$current_class = (string) ( $processor->get_attribute( 'class' ) ?? '' );
		$current_parts = array_filter( preg_split( '/\s+/', trim( $current_class ) ) ?: array() );
		$merged_parts  = array_values( array_unique( array_merge( $current_parts, $class_tokens ) ) );

		if ( array() !== $merged_parts ) {
			$processor->set_attribute( 'class', implode( ' ', $merged_parts ) );
		}

		return $processor->get_updated_html();
	}

	/**
	 * Replaces {path.to.value} placeholders with nested values.
	 *
	 * @param string $template Template string.
	 * @param array  $values   Values map.
	 * @return string
	 */
	private function parse_template( string $template, array $values ): string {
		$parsed = preg_replace_callback(
			'/\{([^}]+)\}/',
			function ( array $matches ) use ( $values ): string {
				$path     = trim( (string) ( $matches[1] ?? '' ) );
				$resolved = $this->array_get( $values, $path );

				if ( null === $resolved || is_array( $resolved ) || is_object( $resolved ) ) {
					return '';
				}

				return (string) $resolved;
			},
			$template
		);

		return is_string( $parsed ) ? trim( preg_replace( '/\s+/', ' ', $parsed ) ?? '' ) : '';
	}

	/**
	 * Gets nested array/object values using dot notation.
	 *
	 * @param mixed  $target Target value.
	 * @param string $path   Dot path.
	 * @return mixed|null
	 */
	private function array_get( $target, string $path ) {
		if ( '' === $path ) {
			return $target;
		}

		$segments = explode( '.', $path );

		foreach ( $segments as $segment ) {
			if ( is_array( $target ) && array_key_exists( $segment, $target ) ) {
				$target = $target[ $segment ];
				continue;
			}

			if ( is_object( $target ) && isset( $target->{$segment} ) ) {
				$target = $target->{$segment};
				continue;
			}

			return null;
		}

		return $target;
	}

	/**
	 * Adds plugin field types into Blockstudio's registry.
	 *
	 * @param array<string, array<string, mixed>> $types Existing field type definitions.
	 * @return array<string, array<string, mixed>>
	 */
	public function register_field_types( array $types ): array {
		foreach ( $this->field_types as $field_type ) {
			$types[ $field_type->get_key() ] = $field_type->get_type_definition();
		}

		return $types;
	}

	/**
	 * Enqueues JS/CSS for all discovered field types in the editor.
	 */
	public function enqueue_editor_assets(): void {
		foreach ( $this->field_types as $field_type ) {
			$script_path = $field_type->get_editor_script_path();
			$style_path  = $field_type->get_editor_style_path();

			if ( '' !== $script_path && file_exists( $this->plugin_path . $script_path ) ) {
				$script_handle = $field_type->get_editor_script_handle();

				wp_register_script(
					$script_handle,
					$this->plugin_url . $script_path,
					$field_type->get_editor_script_dependencies(),
					self::VERSION,
					true
				);

				if ( 'blockstudio-fields-google-map-editor' === $script_handle ) {
					$api_key = '';

					if ( defined( 'GOOGLE_API_KEY' ) ) {
						$api_key = (string) GOOGLE_API_KEY;
					}

					$api_key = (string) apply_filters( 'blockstudio_fields/google_map/api_key', $api_key );

					$config = array(
						'apiKey'      => $api_key,
						'defaultZoom' => (int) apply_filters( 'blockstudio_fields/google_map/default_zoom', 12 ),
						'language'    => (string) apply_filters( 'blockstudio_fields/google_map/language', '' ),
						'region'      => (string) apply_filters( 'blockstudio_fields/google_map/region', '' ),
					);

					wp_add_inline_script(
						$script_handle,
						'window.blockstudioFieldsGoogleMap = ' . wp_json_encode( $config ) . ';',
						'before'
					);
				}

				if ( wp_script_is( 'blockstudio-blocks', 'registered' ) ) {
					wp_enqueue_script( $script_handle );
				}
			}

			if ( '' !== $style_path && file_exists( $this->plugin_path . $style_path ) ) {
				$style_handle = $field_type->get_editor_style_handle();

				wp_register_style(
					$style_handle,
					$this->plugin_url . $style_path,
					$field_type->get_editor_style_dependencies(),
					self::VERSION
				);

				if ( wp_script_is( 'blockstudio-blocks', 'registered' ) ) {
					wp_enqueue_style( $style_handle );
				}
			}
		}
	}

	/**
	 * Loads field type objects from the fields directory.
	 *
	 * @return Blockstudio_Fields_Field_Type[]
	 */
	private function load_field_types(): array {
		$field_types = array();
		$files       = glob( $this->plugin_path . 'fields/*/field.php' );

		if ( ! is_array( $files ) ) {
			return $field_types;
		}

		foreach ( $files as $file ) {
			$field = require $file;

			if ( $field instanceof Blockstudio_Fields_Field_Type ) {
				$field_types[] = $field;
			}
		}

		return $field_types;
	}
}
