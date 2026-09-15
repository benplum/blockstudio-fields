<?php
/**
 * Image field type.
 *
 * @package BlockstudioFields
 */

if ( ! defined( 'ABSPATH' ) ) {
	return null;
}

final class Blockstudio_Fields_Field_Type_Image implements Blockstudio_Fields_Field_Type {
	public function get_key(): string {
		return 'blockstudio-fields/image';
	}

	public function get_type_definition(): array {
		return array(
			'attribute'     => 'number',
			'default'       => null,
			'editor_script' => $this->get_editor_script_handle(),
		);
	}

	public function get_editor_script_handle(): string {
		return 'blockstudio-fields-image-editor';
	}

	public function get_editor_script_path(): string {
		return 'fields/image/editor.js';
	}

	public function get_editor_script_dependencies(): array {
		return array(
			'blockstudio-blocks',
			'media-views',
			'wp-components',
			'wp-data',
			'wp-element',
			'wp-i18n',
		);
	}

	public function get_editor_style_handle(): string {
		return 'blockstudio-fields-image-editor';
	}

	public function get_editor_style_path(): string {
		return '';
	}

	public function get_editor_style_dependencies(): array {
		return array();
	}
}

return new Blockstudio_Fields_Field_Type_Image();
