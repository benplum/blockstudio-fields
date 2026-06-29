<?php
/**
 * Text options field type.
 *
 * @package BlockstudioFields
 */

if ( ! defined( 'ABSPATH' ) ) {
	return null;
}

final class Blockstudio_Fields_Field_Type_Text_Options implements Blockstudio_Fields_Field_Type {
	public function get_key(): string {
		return 'textOptions';
	}

	public function get_type_definition(): array {
		return array(
			'attribute' => 'string',
			'default'   => '',
		);
	}

	public function get_editor_script_handle(): string {
		return 'blockstudio-fields-text-options-editor';
	}

	public function get_editor_script_path(): string {
		return 'fields/text-options/editor.js';
	}

	public function get_editor_script_dependencies(): array {
		return array( 'blockstudio-blocks', 'wp-components', 'wp-element', 'wp-i18n' );
	}

	public function get_editor_style_handle(): string {
		return 'blockstudio-fields-text-options-editor';
	}

	public function get_editor_style_path(): string {
		return 'fields/text-options/editor.css';
	}

	public function get_editor_style_dependencies(): array {
		return array( 'wp-components' );
	}
}

return new Blockstudio_Fields_Field_Type_Text_Options();
