<?php
/**
 * Dimension single field type.
 *
 * @package BlockstudioFields
 */

if ( ! defined( 'ABSPATH' ) ) {
	return null;
}

final class Blockstudio_Fields_Field_Type_Dimension_Single implements Blockstudio_Fields_Field_Type {
	public function get_key(): string {
		return 'blockstudio-fields/dimension-single';
	}

	public function get_type_definition(): array {
		return array(
			'attribute'     => 'string',
			'default'       => '',
			'editor_script' => $this->get_editor_script_handle(),
			'editor_style'  => $this->get_editor_style_handle(),
		);
	}

	public function get_editor_script_handle(): string {
		return 'blockstudio-fields-dimension-single-editor';
	}

	public function get_editor_script_path(): string {
		return 'fields/dimension-single/editor.js';
	}

	public function get_editor_script_dependencies(): array {
		return array( 'blockstudio-blocks', 'wp-components', 'wp-element', 'wp-i18n' );
	}

	public function get_editor_style_handle(): string {
		return 'blockstudio-fields-dimension-single-editor';
	}

	public function get_editor_style_path(): string {
		return 'fields/dimension-single/editor.css';
	}

	public function get_editor_style_dependencies(): array {
		return array( 'wp-components' );
	}
}

return new Blockstudio_Fields_Field_Type_Dimension_Single();
