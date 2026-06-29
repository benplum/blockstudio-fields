<?php
/**
 * Dimensions field type.
 *
 * @package BlockstudioFields
 */

if ( ! defined( 'ABSPATH' ) ) {
	return null;
}

final class Blockstudio_Fields_Field_Type_Dimensions implements Blockstudio_Fields_Field_Type {
	public function get_key(): string {
		return 'dimensions';
	}

	public function get_type_definition(): array {
		return array(
			'attribute' => 'object',
			'default'   => null,
		);
	}

	public function get_editor_script_handle(): string {
		return 'blockstudio-fields-dimensions-editor';
	}

	public function get_editor_script_path(): string {
		return 'fields/dimensions/editor.js';
	}

	public function get_editor_script_dependencies(): array {
		return array( 'blockstudio-blocks', 'wp-components', 'wp-element', 'wp-i18n' );
	}

	public function get_editor_style_handle(): string {
		return 'blockstudio-fields-dimensions-editor';
	}

	public function get_editor_style_path(): string {
		return 'fields/dimensions/editor.css';
	}

	public function get_editor_style_dependencies(): array {
		return array( 'wp-components' );
	}
}

return new Blockstudio_Fields_Field_Type_Dimensions();
