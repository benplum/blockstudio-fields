<?php
/**
 * GitHub Updater class.
 *
 * @package BlockstudioFields
 */

if ( ! defined( 'ABSPATH' ) ) {
	return;
}

/**
 * Checks GitHub tags for plugin updates using PW_GitHub_Updater.
 */
final class Blockstudio_Fields_Updater extends PW_GitHub_Updater {

	public $username = 'benplum';
	public $repository = 'blockstudio-fields';
	public $requires = '6.7';
	public $tested = '6.7';

	public function __construct( string $plugin_file ) {
		$this->parent = (object) array( 'file' => $plugin_file );

		parent::__construct();
	}

}
