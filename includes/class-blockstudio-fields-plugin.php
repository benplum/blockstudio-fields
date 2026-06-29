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
	private const VERSION = '0.1.6';

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

		$this->field_types = $this->load_field_types();

		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ), 20 );
		add_filter( 'blockstudio/field_types', array( $this, 'register_field_types' ) );
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
		if ( ! wp_script_is( 'blockstudio-blocks', 'registered' ) ) {
			return;
		}

		foreach ( $this->field_types as $field_type ) {
			$script_path = $field_type->get_editor_script_path();
			$style_path  = $field_type->get_editor_style_path();

			if ( '' !== $script_path && file_exists( $this->plugin_path . $script_path ) ) {
				wp_enqueue_script(
					$field_type->get_editor_script_handle(),
					$this->plugin_url . $script_path,
					$field_type->get_editor_script_dependencies(),
					self::VERSION,
					true
				);
			}

			if ( '' !== $style_path && file_exists( $this->plugin_path . $style_path ) ) {
				wp_enqueue_style(
					$field_type->get_editor_style_handle(),
					$this->plugin_url . $style_path,
					$field_type->get_editor_style_dependencies(),
					self::VERSION
				);
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
