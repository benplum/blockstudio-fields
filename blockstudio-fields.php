<?php
/**
 * Plugin Name: Blockstudio Fields
 * Description: External field type registrations for Blockstudio.
 * Plugin URI: https://github.com/benplum/blockstudio-fields
 * Version: 1.3.0
 * Author: Ben Plum
 * Requires at least: 6.7
 * Requires PHP: 8.2
 * Requires Plugins: blockstudio
 *
 * @package BlockstudioFields
 */

if ( ! defined( 'ABSPATH' ) ) {
	return;
}

require_once plugin_dir_path( __FILE__ ) . 'includes/class-blockstudio-fields-plugin.php';

new Blockstudio_Fields_Plugin( __FILE__ );
