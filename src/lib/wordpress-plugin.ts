// WordPress connector plugin source, shared by the API docs page and the
// /api/wordpress-plugin zip download.
export const WORDPRESS_PLUGIN_SLUG = "marketing-agent-connector"

export function wordpressPluginPhp(baseUrl: string) {
  // Escape for a single-quoted PHP string.
  const phpUrl = baseUrl.replace(/[\\']/g, "\\$&")
  return `<?php
/**
 * Plugin Name: Marketing Agent Connector
 * Description: Sends form submissions to Marketing Agent as contacts.
 * Version:     1.2.0
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'MARKETING_AGENT_DEFAULT_BASE_URL', '${phpUrl}' );

// Settings come from Settings > Marketing Agent.
// MARKETING_AGENT_API_KEY in wp-config.php overrides the saved key.
function marketing_agent_option( $name ) {
	if ( $name === 'api_key' && defined( 'MARKETING_AGENT_API_KEY' ) ) return MARKETING_AGENT_API_KEY;
	$value = (string) get_option( 'marketing_agent_' . $name, '' );
	if ( $name === 'base_url' && $value === '' ) return MARKETING_AGENT_DEFAULT_BASE_URL;
	return $value;
}

// Full API URL, e.g. marketing_agent_endpoint( 'add-contact' ).
function marketing_agent_endpoint( $path ) {
	return untrailingslashit( marketing_agent_option( 'base_url' ) ) . '/api/v1/' . $path;
}

function marketing_agent_send( $data ) {
	$key = marketing_agent_option( 'api_key' );
	if ( $key === '' ) {
		error_log( 'Marketing Agent: no API key. Add it in Settings > Marketing Agent.' );
		return;
	}

	$first = trim( (string) ( $data['firstName'] ?? '' ) );
	$last  = trim( (string) ( $data['lastName'] ?? '' ) );
	// Split a single "full name" field into first and last name.
	if ( $last === '' && strpos( $first, ' ' ) !== false ) {
		list( $first, $last ) = explode( ' ', $first, 2 );
	}
	$email = sanitize_email( $data['email'] ?? '' );
	if ( $first === '' || ! is_email( $email ) ) return;

	$body = array_filter( array(
		'firstName' => $first,
		'lastName'  => $last !== '' ? $last : '-', // API needs a last name
		'email'     => $email,
		'phone'     => trim( (string) ( $data['phone'] ?? '' ) ),
		'message'   => trim( (string) ( $data['message'] ?? '' ) ),
	), fn( $v ) => $v !== '' );

	$res = wp_remote_post( marketing_agent_endpoint( 'add-contact' ), array(
		'timeout' => 5,
		'headers' => array(
			'Authorization' => 'Bearer ' . $key,
			'Content-Type'  => 'application/json',
		),
		'body'    => wp_json_encode( $body ),
	) );

	if ( is_wp_error( $res ) ) {
		error_log( 'Marketing Agent: ' . $res->get_error_message() );
		return;
	}
	$code = wp_remote_retrieve_response_code( $res );
	// 409 means the contact already exists. That is OK.
	if ( $code >= 300 && $code !== 409 ) {
		error_log( "Marketing Agent: HTTP $code " . wp_remote_retrieve_body( $res ) );
	}
}

// Settings page: Settings > Marketing Agent
add_action( 'admin_init', function () {
	register_setting( 'marketing_agent', 'marketing_agent_base_url', array( 'sanitize_callback' => 'esc_url_raw' ) );
	register_setting( 'marketing_agent', 'marketing_agent_api_key', array( 'sanitize_callback' => 'sanitize_text_field' ) );
} );

add_action( 'admin_menu', function () {
	add_options_page( 'Marketing Agent', 'Marketing Agent', 'manage_options', 'marketing-agent', 'marketing_agent_settings_page' );
} );

add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), function ( $links ) {
	array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=marketing-agent' ) ) . '">Settings</a>' );
	return $links;
} );

function marketing_agent_status_notice( $key ) {
	if ( $key === '' ) {
		echo '<div class="notice notice-warning"><p>Add your API key to start sending contacts.</p></div>';
		return;
	}
	$res = wp_remote_get( marketing_agent_endpoint( 'hello' ), array(
		'timeout' => 5,
		'headers' => array( 'Authorization' => 'Bearer ' . $key ),
	) );
	$code = is_wp_error( $res ) ? 0 : wp_remote_retrieve_response_code( $res );
	if ( $code === 200 ) {
		echo '<div class="notice notice-success"><p>Connected. Form submissions are sent to Marketing Agent.</p></div>';
		return;
	}
	$why = is_wp_error( $res ) ? $res->get_error_message() : ( $code === 401 ? 'API key is wrong' : 'HTTP ' . $code );
	echo '<div class="notice notice-error"><p>Not connected: ' . esc_html( $why ) . '</p></div>';
}

function marketing_agent_settings_page() {
	$key = marketing_agent_option( 'api_key' );
	?>
	<div class="wrap">
		<h1>Marketing Agent</h1>
		<?php marketing_agent_status_notice( $key ); ?>
		<form method="post" action="options.php">
			<?php settings_fields( 'marketing_agent' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="ma-url">Base URL</label></th>
					<td>
						<input id="ma-url" name="marketing_agent_base_url" type="url" class="regular-text" placeholder="https://app.example.com" value="<?php echo esc_attr( marketing_agent_option( 'base_url' ) ); ?>" />
						<p class="description">The address of your Marketing Agent app, without <code>/api</code>.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="ma-key">API key</label></th>
					<td>
						<?php if ( defined( 'MARKETING_AGENT_API_KEY' ) ) : ?>
							<p>Set in <code>wp-config.php</code>.</p>
						<?php else : ?>
							<input id="ma-key" name="marketing_agent_api_key" type="password" class="regular-text" autocomplete="off" value="<?php echo esc_attr( $key ); ?>" />
							<p class="description">Create a key on the API Keys page in Marketing Agent.</p>
						<?php endif; ?>
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}

// Contact Form 7
// Runs before CF7 sends its email, so contacts still arrive if site email is broken.
add_action( 'wpcf7_before_send_mail', function ( $form, &$abort, $submission ) {
	if ( ! $submission ) return;
	$d = $submission->get_posted_data();
	marketing_agent_send( array(
		'firstName' => $d['first-name'] ?? $d['your-name'] ?? '',
		'lastName'  => $d['last-name'] ?? '',
		'email'     => $d['your-email'] ?? $d['email'] ?? '',
		'phone'     => $d['phone'] ?? $d['your-phone'] ?? '',
		'message'   => $d['your-message'] ?? $d['message'] ?? '',
	) );
}, 10, 3 );

// WPForms
add_action( 'wpforms_process_complete', function ( $fields ) {
	$data = array();
	foreach ( $fields as $f ) {
		switch ( $f['type'] ) {
			case 'name':
				$data['firstName'] = ! empty( $f['first'] ) ? $f['first'] : $f['value'];
				$data['lastName']  = $f['last'] ?? '';
				break;
			case 'email':    $data['email']   ??= $f['value']; break;
			case 'phone':    $data['phone']   ??= $f['value']; break;
			case 'textarea': $data['message'] ??= $f['value']; break;
		}
	}
	marketing_agent_send( $data );
} );

// Elementor Pro Forms
add_action( 'elementor_pro/forms/new_record', function ( $record ) {
	$f = array();
	foreach ( $record->get( 'fields' ) as $id => $field ) {
		$f[ $id ] = $field['value'];
	}
	marketing_agent_send( array(
		'firstName' => $f['first_name'] ?? $f['name'] ?? '',
		'lastName'  => $f['last_name'] ?? '',
		'email'     => $f['email'] ?? '',
		'phone'     => $f['phone'] ?? '',
		'message'   => $f['message'] ?? '',
	) );
} );

// Gravity Forms
add_action( 'gform_after_submission', function ( $entry, $form ) {
	$data = array();
	foreach ( $form['fields'] as $field ) {
		$id = (string) $field->id;
		switch ( $field->type ) {
			case 'name':
				$data['firstName'] = rgar( $entry, $id . '.3' ) ?: rgar( $entry, $id );
				$data['lastName']  = rgar( $entry, $id . '.6' );
				break;
			case 'email':    $data['email']   ??= rgar( $entry, $id ); break;
			case 'phone':    $data['phone']   ??= rgar( $entry, $id ); break;
			case 'textarea': $data['message'] ??= rgar( $entry, $id ); break;
		}
	}
	marketing_agent_send( $data );
}, 10, 2 );`
}
