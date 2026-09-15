<?php
/**
 * Google Map field type.
 *
 * @package BlockstudioFields
 */

if ( ! defined( 'ABSPATH' ) ) {
	return null;
}

final class Blockstudio_Fields_Field_Type_Google_Map implements Blockstudio_Fields_Field_Type {
	public function get_key(): string {
		return 'blockstudio-fields/google-map';
	}

	public function get_type_definition(): array {
		return array(
			'attribute'     => 'object',
			'default'       => null,
			'editor_script' => $this->get_editor_script_handle(),
		);
	}

	public function get_editor_script_handle(): string {
		return 'blockstudio-fields-google-map-editor';
	}

	public function get_editor_script_path(): string {
		return 'fields/google-map/editor.js';
	}

	public function get_editor_script_dependencies(): array {
		return array( 'blockstudio-blocks', 'wp-components', 'wp-element', 'wp-i18n' );
	}

	public function get_editor_style_handle(): string {
		return 'blockstudio-fields-google-map-editor';
	}

	public function get_editor_style_path(): string {
		return '';
	}

	public function get_editor_style_dependencies(): array {
		return array();
	}
}

return new Blockstudio_Fields_Field_Type_Google_Map();
