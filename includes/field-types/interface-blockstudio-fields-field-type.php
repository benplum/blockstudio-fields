<?php
/**
 * Field type contract.
 *
 * @package BlockstudioFields
 */

if ( ! defined( 'ABSPATH' ) ) {
	return;
}

interface Blockstudio_Fields_Field_Type {
	/**
	 * Returns the Blockstudio field key.
	 */
	public function get_key(): string;

	/**
	 * Returns the field type schema for blockstudio/field_types.
	 *
	 * @return array<string, mixed>
	 */
	public function get_type_definition(): array;

	/**
	 * Returns the editor script handle.
	 */
	public function get_editor_script_handle(): string;

	/**
	 * Returns the editor script path relative to the plugin root.
	 */
	public function get_editor_script_path(): string;

	/**
	 * Returns editor script dependencies.
	 *
	 * @return string[]
	 */
	public function get_editor_script_dependencies(): array;

	/**
	 * Returns the editor style handle.
	 */
	public function get_editor_style_handle(): string;

	/**
	 * Returns the editor style path relative to the plugin root.
	 */
	public function get_editor_style_path(): string;

	/**
	 * Returns editor style dependencies.
	 *
	 * @return string[]
	 */
	public function get_editor_style_dependencies(): array;
}
